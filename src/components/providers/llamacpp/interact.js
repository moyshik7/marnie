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
    const raw = getSetting("llamacpp_base_url", process.env.LLAMACPP_BASE_URL || "http://localhost:8080");
    return raw.replace(/\/+$/, "");
};

const DEFAULT_MODEL = () => getSetting("llamacpp_model", process.env.LLAMACPP_MODEL || "default");
const FALLBACK_MODELS = ["default", "local-model"];

/**
 * List available models from llama.cpp server.
 * @returns {Promise<string[]>} Array of model names.
 */
async function listModels() {
    try {
        const res = await axios.get(`${BASE_URL()}/v1/models`, { timeout: 4000 });
        if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            return res.data.data.map((m) => m.id);
        }
        return FALLBACK_MODELS;
    } catch (err) {
        return FALLBACK_MODELS;
    }
}

/**
 * Resolve which model to use.
 */
async function resolveModel(requestedModel) {
    if (requestedModel && typeof requestedModel === "string" && requestedModel.trim()) {
        return requestedModel.trim();
    }
    const configured = DEFAULT_MODEL();
    return configured || "default";
}

/**
 * Non-streaming chat completion with llama.cpp server.
 */
async function chat({ model, messages, options = {}, tools = [] }) {
    const chosenModel = await resolveModel(model);
    const payload = {
        model: chosenModel,
        messages,
        stream: false,
    };

    if (options.temperature !== undefined) payload.temperature = options.temperature;
    if (options.top_p !== undefined) payload.top_p = options.top_p;
    if (tools && tools.length > 0) payload.tools = tools;

    const res = await axios.post(`${BASE_URL()}/v1/chat/completions`, payload, {
        headers: { "Content-Type": "application/json" },
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
 * Streaming chat completion with llama.cpp server.
 */
async function chatStream({ model, messages, options = {}, tools = [], onChunk, onDone }) {
    const chosenModel = await resolveModel(model);
    const payload = {
        model: chosenModel,
        messages,
        stream: true,
    };

    if (options.temperature !== undefined) payload.temperature = options.temperature;
    if (options.top_p !== undefined) payload.top_p = options.top_p;
    if (tools && tools.length > 0) payload.tools = tools;

    const res = await axios.post(`${BASE_URL()}/v1/chat/completions`, payload, {
        headers: { "Content-Type": "application/json" },
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
                } catch {}
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
 * Test llama.cpp server connectivity.
 */
async function testConnection(config = {}) {
    const url = (config.url || BASE_URL()).trim().replace(/\/+$/, "");

    try {
        let models = [];
        try {
            const mRes = await axios.get(`${url}/v1/models`, { timeout: 4000 });
            if (Array.isArray(mRes.data?.data)) {
                models = mRes.data.data.map((m) => m.id);
            }
        } catch {
            // Check /health endpoint
            await axios.get(`${url}/health`, { timeout: 4000 });
        }

        return {
            ok: true,
            url,
            models: models.length > 0 ? models : FALLBACK_MODELS,
            message: `Connected to llama.cpp server! ${models.length > 0 ? `Found ${models.length} model(s).` : "Server is healthy."}`,
        };
    } catch (err) {
        throw new Error(`Could not connect to llama.cpp server at ${url}: ${err.message}`);
    }
}

module.exports = {
    id: "llamacpp",
    name: "llama.cpp Server",
    listModels,
    resolveModel,
    chat,
    chatStream,
    generate,
    testConnection,
};
