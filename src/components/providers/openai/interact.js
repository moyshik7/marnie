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
    let raw = getSetting("openai_base_url", process.env.OPENAI_BASE_URL || "https://api.openai.com/v1");
    raw = raw.replace(/\/+$/, "");
    if (!raw.endsWith("/v1")) {
        raw = `${raw}/v1`;
    }
    return raw;
};

const API_KEY = () => getSetting("openai_api_key", process.env.OPENAI_API_KEY || "");
const DEFAULT_MODEL = () => getSetting("openai_model", process.env.OPENAI_MODEL || "gpt-4o");

const FALLBACK_MODELS = [
    "gpt-4o",
    "gpt-4o-mini",
    "o1",
    "o1-mini",
    "o3-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
];

/**
 * List available models from OpenAI.
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
            timeout: 8000,
        });

        if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            const allIds = res.data.data.map((m) => m.id);
            // Prioritize chat / reasoning models
            const relevant = allIds.filter(
                (m) =>
                    m.startsWith("gpt-") ||
                    m.startsWith("o1") ||
                    m.startsWith("o3") ||
                    m.startsWith("chatgpt-"),
            );
            const list = relevant.length > 0 ? relevant : allIds;
            for (const fm of FALLBACK_MODELS) {
                if (!list.includes(fm)) list.unshift(fm);
            }
            return list;
        }
        return FALLBACK_MODELS;
    } catch (err) {
        console.warn("[openai] Could not fetch models from API, using fallback list:", err.message);
        return FALLBACK_MODELS;
    }
}

/**
 * Resolve which model to use.
 */
async function resolveModel(requestedModel) {
    if (requestedModel && typeof requestedModel === "string" && requestedModel.trim()) {
        const trimmed = requestedModel.trim();
        if (
            FALLBACK_MODELS.includes(trimmed) ||
            trimmed.startsWith("gpt-") ||
            trimmed.startsWith("o1") ||
            trimmed.startsWith("o3") ||
            trimmed.startsWith("chatgpt-")
        ) {
            return trimmed;
        }
        const models = await listModels();
        if (models.includes(trimmed)) return trimmed;
    }
    const configured = DEFAULT_MODEL();
    return configured || "gpt-4o";
}

/**
 * Format messages for OpenAI Chat Completions API.
 */
function formatMessages(messages) {
    if (!Array.isArray(messages)) return [];

    return messages.map((m) => {
        const formatted = {
            role: m.role,
            content: m.content || "",
        };

        if (m.name) {
            formatted.name = m.name;
        }

        if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
            formatted.tool_calls = m.tool_calls.map((tc) => ({
                id: tc.id || `call_${Date.now()}`,
                type: "function",
                function: {
                    name: tc.function?.name || tc.name,
                    arguments:
                        typeof tc.function?.arguments === "string"
                            ? tc.function.arguments
                            : JSON.stringify(tc.function?.arguments || tc.arguments || {}),
                },
            }));
        }

        if (m.role === "tool") {
            formatted.tool_call_id = m.tool_call_id || m.toolCallId || "call_unknown";
        }

        return formatted;
    });
}

/**
 * Format tools array for OpenAI schema.
 */
function formatTools(tools) {
    if (!Array.isArray(tools) || tools.length === 0) return undefined;

    return tools
        .map((t) => {
            if (t.type === "function" && t.function) return t;
            const fn = t.function || t;
            if (!fn.name) return null;
            return {
                type: "function",
                function: {
                    name: fn.name,
                    description: fn.description || "",
                    parameters: fn.parameters || { type: "object", properties: {} },
                },
            };
        })
        .filter(Boolean);
}

/**
 * Execute a non-streaming chat completion with OpenAI.
 */
async function chat({ model, messages, options = {}, tools }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("OpenAI API key is missing. Please set your API key in Settings -> Models.");
    }

    const resolved = await resolveModel(model);
    const formattedMessages = formatMessages(messages);
    const formattedTools = formatTools(tools);

    const payload = {
        model: resolved,
        messages: formattedMessages,
        stream: false,
    };

    // Only set temperature if not an reasoning model like o1/o3 that might reject custom temp
    if (!resolved.startsWith("o1") && !resolved.startsWith("o3")) {
        if (typeof options.temperature === "number") {
            payload.temperature = options.temperature;
        }
    }

    if (options.max_tokens) {
        payload.max_tokens = options.max_tokens;
    }

    if (formattedTools && formattedTools.length > 0) {
        payload.tools = formattedTools;
        payload.tool_choice = options.tool_choice || "auto";
    }

    try {
        const res = await axios.post(`${BASE_URL()}/chat/completions`, payload, {
            headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
            },
            timeout: options.timeout || 120000,
        });

        const choice = res.data?.choices?.[0];
        const message = choice?.message || {};

        let toolCalls = undefined;
        if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
            toolCalls = message.tool_calls.map((tc) => {
                let parsedArgs = {};
                try {
                    parsedArgs = typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function?.arguments || {};
                } catch {
                    parsedArgs = { raw: tc.function?.arguments };
                }
                return {
                    id: tc.id,
                    type: "function",
                    function: {
                        name: tc.function?.name,
                        arguments: parsedArgs,
                    },
                };
            });
        }

        return {
            content: message.content || "",
            role: "assistant",
            tool_calls: toolCalls,
            model: res.data?.model || resolved,
            finish_reason: choice?.finish_reason || "stop",
            usage: res.data?.usage,
        };
    } catch (err) {
        if (err.response?.data?.error?.message) {
            throw new Error(`OpenAI API error: ${err.response.data.error.message}`);
        }
        throw new Error(`OpenAI request failed: ${err.message}`);
    }
}

/**
 * Execute a streaming chat completion with OpenAI via SSE.
 */
async function chatStream({ model, messages, options = {}, tools, onChunk, onDone }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("OpenAI API key is missing. Please set your API key in Settings -> Models.");
    }

    const resolved = await resolveModel(model);
    const formattedMessages = formatMessages(messages);
    const formattedTools = formatTools(tools);

    const payload = {
        model: resolved,
        messages: formattedMessages,
        stream: true,
    };

    if (!resolved.startsWith("o1") && !resolved.startsWith("o3")) {
        if (typeof options.temperature === "number") {
            payload.temperature = options.temperature;
        }
    }

    if (options.max_tokens) {
        payload.max_tokens = options.max_tokens;
    }

    if (formattedTools && formattedTools.length > 0) {
        payload.tools = formattedTools;
        payload.tool_choice = options.tool_choice || "auto";
    }

    const response = await axios.post(`${BASE_URL()}/chat/completions`, payload, {
        headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        responseType: "stream",
        timeout: options.timeout || 120000,
    });

    return new Promise((resolve, reject) => {
        let buffer = "";
        let fullContent = "";
        const accumulatedToolCalls = [];

        response.data.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data: ")) continue;

                const dataStr = trimmed.slice(6).trim();
                if (dataStr === "[DONE]") {
                    continue;
                }

                try {
                    const parsed = JSON.parse(dataStr);
                    const choice = parsed.choices?.[0];
                    if (!choice) continue;

                    const delta = choice.delta || {};

                    if (delta.content) {
                        fullContent += delta.content;
                        if (typeof onChunk === "function") {
                            onChunk({
                                content: delta.content,
                                fullContent,
                                done: false,
                            });
                        }
                    }

                    if (Array.isArray(delta.tool_calls)) {
                        for (const tc of delta.tool_calls) {
                            const idx = tc.index ?? 0;
                            if (!accumulatedToolCalls[idx]) {
                                accumulatedToolCalls[idx] = {
                                    id: tc.id || `call_${Date.now()}_${idx}`,
                                    type: "function",
                                    function: {
                                        name: tc.function?.name || "",
                                        arguments: "",
                                    },
                                };
                            } else {
                                if (tc.id) accumulatedToolCalls[idx].id = tc.id;
                                if (tc.function?.name) accumulatedToolCalls[idx].function.name += tc.function.name;
                            }
                            if (tc.function?.arguments) {
                                accumulatedToolCalls[idx].function.arguments += tc.function.arguments;
                            }
                        }
                    }
                } catch {
                    // Ignore non-json lines
                }
            }
        });

        response.data.on("end", () => {
            let finalToolCalls = undefined;
            if (accumulatedToolCalls.length > 0) {
                finalToolCalls = accumulatedToolCalls.map((tc) => {
                    let parsedArgs = {};
                    try {
                        parsedArgs = JSON.parse(tc.function.arguments);
                    } catch {
                        parsedArgs = { raw: tc.function.arguments };
                    }
                    return {
                        id: tc.id,
                        type: "function",
                        function: {
                            name: tc.function.name,
                            arguments: parsedArgs,
                        },
                    };
                });
            }

            const result = {
                content: fullContent,
                role: "assistant",
                tool_calls: finalToolCalls,
                model: resolved,
                done: true,
            };

            if (typeof onDone === "function") {
                onDone(result);
            }
            resolve(result);
        });

        response.data.on("error", (err) => {
            reject(new Error(`OpenAI stream error: ${err.message}`));
        });
    });
}

/**
 * Text generation wrapper around chat completion.
 */
async function generate({ model, prompt, options = {} }) {
    const messages = [{ role: "user", content: prompt }];
    const res = await chat({ model, messages, options });
    return {
        response: res.content,
        model: res.model,
    };
}

/**
 * Test connectivity and API key validity against OpenAI.
 */
async function testConnection(config = {}) {
    const key = config.apiKey || API_KEY();
    if (!key) {
        throw new Error("OpenAI API key is missing. Please configure it in Settings.");
    }
    let url = config.baseUrl || BASE_URL();
    url = url.replace(/\/+$/, "");
    if (!url.endsWith("/v1")) {
        url = `${url}/v1`;
    }

    try {
        const res = await axios.get(`${url}/models`, {
            headers: {
                Authorization: `Bearer ${key}`,
            },
            timeout: 8000,
        });

        const models = Array.isArray(res.data?.data) ? res.data.data.map((m) => m.id) : [];
        const gptModels = models.filter((m) => m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3"));
        return {
            ok: true,
            message: `Connected to OpenAI successfully! Key verified. Found ${models.length} accessible models.`,
            models: gptModels.length > 0 ? gptModels : FALLBACK_MODELS,
        };
    } catch (err) {
        if (err.response?.status === 401) {
            throw new Error("Authentication failed (401 Unauthorized): Invalid OpenAI API key.");
        }
        if (err.response?.status === 429) {
            throw new Error("OpenAI API rate limit or quota exceeded (429 Too Many Requests). Check your OpenAI account billing.");
        }
        if (err.response?.data?.error?.message) {
            throw new Error(`OpenAI API error (${err.response.status}): ${err.response.data.error.message}`);
        }
        throw new Error(`Could not connect to OpenAI at ${url}: ${err.message}`);
    }
}

module.exports = {
    listModels,
    resolveModel,
    chat,
    chatStream,
    generate,
    testConnection,
};
