"use strict";

const axios = require("axios");
const db = require("../../../db/index");

const getSetting = (key, fallback) => {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
        return row && row.value ? row.value : fallback;
    } catch {
        return fallback;
    }
};

const BASE_URL = () => {
    const raw = getSetting("deepseek_base_url", process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com");
    return raw.replace(/\/+$/, "");
};

const API_KEY = () => getSetting("deepseek_api_key", process.env.DEEPSEEK_API_KEY || "");
const DEFAULT_MODEL = () => getSetting("deepseek_model", process.env.DEEPSEEK_MODEL || "deepseek-chat");

const FALLBACK_MODELS = ["deepseek-chat", "deepseek-reasoner"];

/**
 * List available models from DeepSeek.
 * @returns {Promise<string[]>} Array of model names.
 */
async function listModels() {
    const key = API_KEY();
    if (!key) {
        return FALLBACK_MODELS;
    }

    try {
        const res = await axios.get(`${BASE_URL()}/models`, {
            headers: {
                Authorization: `Bearer ${key}`,
            },
            timeout: 7000,
        });

        if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            const list = res.data.data.map((m) => m.id);
            // Ensure standard models are included if API only returned partial
            for (const fm of FALLBACK_MODELS) {
                if (!list.includes(fm)) list.push(fm);
            }
            return list;
        }
        return FALLBACK_MODELS;
    } catch (err) {
        console.warn("[deepseek] Could not fetch models from API, using fallback list:", err.message);
        return FALLBACK_MODELS;
    }
}

/**
 * Resolve which model to use.
 */
async function resolveModel(requestedModel) {
    if (requestedModel && typeof requestedModel === "string" && requestedModel.trim()) {
        const trimmed = requestedModel.trim();
        // If user already specified an active deepseek model or valid name
        if (trimmed.startsWith("deepseek-") || trimmed === "deepseek-chat" || trimmed === "deepseek-reasoner") {
            return trimmed;
        }
        const models = await listModels();
        if (models.includes(trimmed)) return trimmed;
    }
    const configured = DEFAULT_MODEL();
    return configured || "deepseek-chat";
}

/**
 * Clean and format messages to ensure compliance with DeepSeek OpenAI format.
 */
function formatMessages(messages) {
    if (!Array.isArray(messages)) return [];

    return messages.map((msg) => {
        const role = msg.role;
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content || "");

        // DeepSeek expects tool messages to have a tool_call_id
        if (role === "tool") {
            return {
                role: "tool",
                content,
                tool_call_id: msg.tool_call_id || "call_" + Math.random().toString(36).substring(2, 9),
            };
        }

        const formatted = { role, content };

        // Include tool_calls if assistant previously called tools
        if (role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            formatted.tool_calls = msg.tool_calls;
        }

        return formatted;
    });
}

/**
 * Non-streaming chat completion with DeepSeek.
 */
async function chat({ model, messages, options = {}, tools = [] }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("DeepSeek API key is not configured. Please set your DeepSeek API key in Settings > Models.");
    }

    const chosenModel = await resolveModel(model);
    const isReasoner = chosenModel === "deepseek-reasoner" || chosenModel.includes("reasoner");

    const payload = {
        model: chosenModel,
        messages: formatMessages(messages),
        stream: false,
    };

    // deepseek-reasoner does not support temperature or top_p in DeepSeek API
    if (!isReasoner) {
        if (options.temperature !== undefined) payload.temperature = options.temperature;
        if (options.top_p !== undefined) payload.top_p = options.top_p;
    }

    // deepseek-reasoner does not support tools in official API
    if (!isReasoner && tools && tools.length > 0) {
        payload.tools = tools;
    }

    const res = await axios.post(`${BASE_URL()}/chat/completions`, payload, {
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        timeout: options.timeout || 120000,
    });

    const choice = res.data?.choices?.[0];
    const choiceMsg = choice?.message || {};

    return {
        message: {
            role: "assistant",
            content: choiceMsg.content || "",
            thinking: choiceMsg.reasoning_content || "",
            tool_calls: choiceMsg.tool_calls || [],
        },
        usage: res.data?.usage,
        eval_count: res.data?.usage?.completion_tokens,
        prompt_eval_count: res.data?.usage?.prompt_tokens,
        model: res.data?.model || chosenModel,
    };
}

/**
 * Streaming chat completion with DeepSeek.
 */
async function chatStream({ model, messages, options = {}, tools = [], onChunk, onDone }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("DeepSeek API key is not configured. Please set your DeepSeek API key in Settings > Models.");
    }

    const chosenModel = await resolveModel(model);
    const isReasoner = chosenModel === "deepseek-reasoner" || chosenModel.includes("reasoner");

    const payload = {
        model: chosenModel,
        messages: formatMessages(messages),
        stream: true,
    };

    if (!isReasoner) {
        if (options.temperature !== undefined) payload.temperature = options.temperature;
        if (options.top_p !== undefined) payload.top_p = options.top_p;
    }

    if (!isReasoner && tools && tools.length > 0) {
        payload.tools = tools;
    }

    const res = await axios.post(`${BASE_URL()}/chat/completions`, payload, {
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
        },
        responseType: "stream",
        timeout: options.timeout || 180000,
    });

    return new Promise((resolve, reject) => {
        let buffer = "";
        let aggregatedToolCalls = [];

        res.data.on("data", (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop(); // keep trailing partial line

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;

                const dataStr = trimmed.replace(/^data:\s*/, "");
                if (dataStr === "[DONE]") {
                    if (onDone) onDone({ done: true });
                    continue;
                }

                try {
                    const parsed = JSON.parse(dataStr);
                    const choice = parsed.choices?.[0];
                    if (!choice) continue;

                    const delta = choice.delta || {};
                    const token = delta.content || "";
                    const thinking = delta.reasoning_content || "";

                    // Stream tool_calls aggregation
                    if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
                        for (const tc of delta.tool_calls) {
                            const index = tc.index !== undefined ? tc.index : 0;
                            if (!aggregatedToolCalls[index]) {
                                aggregatedToolCalls[index] = {
                                    id: tc.id || "",
                                    type: tc.type || "function",
                                    function: {
                                        name: tc.function?.name || "",
                                        arguments: tc.function?.arguments || "",
                                    },
                                };
                            } else {
                                if (tc.id) aggregatedToolCalls[index].id = tc.id;
                                if (tc.function?.name) aggregatedToolCalls[index].function.name += tc.function.name;
                                if (tc.function?.arguments) aggregatedToolCalls[index].function.arguments += tc.function.arguments;
                            }
                        }
                    }

                    if (onChunk) {
                        onChunk({
                            message: {
                                content: token,
                                thinking: thinking,
                                tool_calls: delta.tool_calls ? aggregatedToolCalls.filter(Boolean) : undefined,
                            },
                            done: choice.finish_reason !== null && choice.finish_reason !== undefined,
                        });
                    }

                    if (choice.finish_reason && choice.finish_reason !== "null") {
                        if (onDone) {
                            onDone({
                                done: true,
                                tool_calls: aggregatedToolCalls.filter(Boolean),
                            });
                        }
                    }
                } catch {
                    // ignore JSON parse errors on malformed lines
                }
            }
        });

        res.data.on("end", () => {
            if (onDone) onDone({ done: true, tool_calls: aggregatedToolCalls.filter(Boolean) });
            resolve();
        });

        res.data.on("error", (err) => {
            reject(err);
        });
    });
}

/**
 * Raw generate / completion.
 */
async function generate({ model, prompt, options = {} }) {
    const res = await chat({
        model,
        messages: [{ role: "user", content: prompt }],
        options,
    });
    return {
        response: res.message?.content || "",
        done: true,
        model: res.model,
    };
}

/**
 * Test DeepSeek API connectivity and key validity.
 * @param {object} [config]
 * @param {string} [config.apiKey]
 * @param {string} [config.baseUrl]
 */
async function testConnection(config = {}) {
    const key = (config.apiKey !== undefined ? config.apiKey : API_KEY()).trim();
    const url = (config.baseUrl || BASE_URL()).trim().replace(/\/+$/, "");

    if (!key) {
        throw new Error("DeepSeek API key is required to test the connection.");
    }

    try {
        const res = await axios.get(`${url}/models`, {
            headers: {
                Authorization: `Bearer ${key}`,
            },
            timeout: 8000,
        });

        const models = Array.isArray(res.data?.data) ? res.data.data.map((m) => m.id) : FALLBACK_MODELS;
        return {
            ok: true,
            url,
            models,
            message: `Connected to DeepSeek API! Validated key successfully. Found ${models.length} model(s).`,
        };
    } catch (err) {
        const status = err.response?.status;
        const apiMessage = err.response?.data?.error?.message;

        if (status === 401) {
            throw new Error(`Authentication failed (401 Unauthorized): Invalid DeepSeek API key.`);
        }
        if (status === 404) {
            // Some proxies don't implement /models; fallback to testing a minimal 1-token completion
            try {
                await axios.post(
                    `${url}/chat/completions`,
                    {
                        model: "deepseek-chat",
                        messages: [{ role: "user", content: "hi" }],
                        max_tokens: 1,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${key}`,
                            "Content-Type": "application/json",
                        },
                        timeout: 8000,
                    },
                );
                return {
                    ok: true,
                    url,
                    models: FALLBACK_MODELS,
                    message: "Connected to DeepSeek API! Key verified via completion endpoint.",
                };
            } catch (postErr) {
                throw new Error(postErr.response?.data?.error?.message || postErr.message);
            }
        }

        throw new Error(apiMessage || `Could not connect to DeepSeek API at ${url}: ${err.message}`);
    }
}

module.exports = {
    id: "deepseek",
    name: "DeepSeek API",
    listModels,
    resolveModel,
    chat,
    chatStream,
    generate,
    testConnection,
};
