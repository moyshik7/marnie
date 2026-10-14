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
    const raw = getSetting("anthropic_base_url", process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com");
    return raw.replace(/\/+$/, "");
};

const API_KEY = () => getSetting("anthropic_api_key", process.env.ANTHROPIC_API_KEY || "");
const DEFAULT_MODEL = () => getSetting("anthropic_model", process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022");

const FALLBACK_MODELS = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
];

/**
 * List available models from Anthropic.
 * @returns {Promise<string[]>} Array of model names.
 */
async function listModels() {
    const key = API_KEY();
    if (!key) {
        return FALLBACK_MODELS;
    }

    try {
        const res = await axios.get(`${BASE_URL()}/v1/models`, {
            headers: {
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
            },
            timeout: 6000,
        });

        if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
            const list = res.data.data.map((m) => m.id);
            for (const fm of FALLBACK_MODELS) {
                if (!list.includes(fm)) list.push(fm);
            }
            return list;
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
        const trimmed = requestedModel.trim();
        if (trimmed.startsWith("claude-")) return trimmed;
        const models = await listModels();
        if (models.includes(trimmed)) return trimmed;
    }
    const configured = DEFAULT_MODEL();
    return configured || "claude-3-5-sonnet-20241022";
}

/**
 * Convert standard Marnie/OpenAI message format to Anthropic Messages API format.
 * Anthropic requires:
 * - Top-level system string (not inside messages array)
 * - alternating user / assistant roles
 * - tool results formatted as tool_result content block in user message
 */
function formatMessagesForAnthropic(messages) {
    let systemPrompt = "";
    const anthropicMsgs = [];

    for (const msg of messages || []) {
        if (msg.role === "system") {
            if (systemPrompt) systemPrompt += "\n\n";
            systemPrompt += typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
            continue;
        }

        if (msg.role === "tool") {
            anthropicMsgs.push({
                role: "user",
                content: [
                    {
                        type: "tool_result",
                        tool_use_id: msg.tool_call_id || "call_1",
                        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
                    },
                ],
            });
            continue;
        }

        if (msg.role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            const contentBlocks = [];
            if (msg.content) {
                contentBlocks.push({ type: "text", text: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content) });
            }
            for (const tc of msg.tool_calls) {
                let parsedInput = {};
                try {
                    parsedInput = typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function?.arguments || {};
                } catch {}
                contentBlocks.push({
                    type: "tool_use",
                    id: tc.id || "call_" + Math.random().toString(36).substring(2, 9),
                    name: tc.function?.name || tc.name,
                    input: parsedInput,
                });
            }
            anthropicMsgs.push({ role: "assistant", content: contentBlocks });
            continue;
        }

        const role = msg.role === "assistant" ? "assistant" : "user";
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content || "");
        anthropicMsgs.push({ role, content });
    }

    // Merge consecutive messages with the same role (Anthropic requirement)
    const merged = [];
    for (const m of anthropicMsgs) {
        if (merged.length > 0 && merged[merged.length - 1].role === m.role) {
            const prev = merged[merged.length - 1];
            if (typeof prev.content === "string" && typeof m.content === "string") {
                prev.content += "\n\n" + m.content;
            } else {
                const prevBlocks = Array.isArray(prev.content) ? prev.content : [{ type: "text", text: String(prev.content) }];
                const curBlocks = Array.isArray(m.content) ? m.content : [{ type: "text", text: String(m.content) }];
                prev.content = [...prevBlocks, ...curBlocks];
            }
        } else {
            merged.push(m);
        }
    }

    // Ensure messages begins with a user message (Anthropic requirement)
    if (merged.length === 0 || merged[0].role !== "user") {
        merged.unshift({ role: "user", content: "Hello" });
    }

    return { systemPrompt: systemPrompt || undefined, messages: merged };
}

/**
 * Convert standard OpenAI tools to Anthropic tool schema.
 */
function formatToolsForAnthropic(tools) {
    if (!Array.isArray(tools) || tools.length === 0) return undefined;

    return tools.map((t) => {
        const fn = t.function || t;
        return {
            name: fn.name,
            description: fn.description || "",
            input_schema: fn.parameters || { type: "object", properties: {} },
        };
    });
}

/**
 * Non-streaming chat completion with Anthropic Claude.
 */
async function chat({ model, messages, options = {}, tools = [] }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("Anthropic API key is not configured. Please set your Anthropic API key in Settings > Models.");
    }

    const chosenModel = await resolveModel(model);
    const { systemPrompt, messages: formattedMessages } = formatMessagesForAnthropic(messages);
    const anthropicTools = formatToolsForAnthropic(tools);

    const payload = {
        model: chosenModel,
        max_tokens: options.max_tokens || 4096,
        messages: formattedMessages,
        stream: false,
    };

    if (systemPrompt) payload.system = systemPrompt;
    if (anthropicTools && anthropicTools.length > 0) payload.tools = anthropicTools;
    if (options.temperature !== undefined) payload.temperature = options.temperature;

    const res = await axios.post(`${BASE_URL()}/v1/messages`, payload, {
        headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        timeout: options.timeout || 120000,
    });

    let fullText = "";
    const toolCalls = [];

    for (const block of res.data?.content || []) {
        if (block.type === "text") {
            fullText += block.text || "";
        } else if (block.type === "tool_use") {
            toolCalls.push({
                id: block.id,
                type: "function",
                function: {
                    name: block.name,
                    arguments: JSON.stringify(block.input || {}),
                },
            });
        }
    }

    return {
        message: {
            role: "assistant",
            content: fullText,
            tool_calls: toolCalls,
        },
        usage: res.data?.usage,
        eval_count: res.data?.usage?.output_tokens,
        prompt_eval_count: res.data?.usage?.input_tokens,
        model: res.data?.model || chosenModel,
    };
}

/**
 * Streaming chat completion with Anthropic Claude.
 */
async function chatStream({ model, messages, options = {}, tools = [], onChunk, onDone }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("Anthropic API key is not configured. Please set your Anthropic API key in Settings > Models.");
    }

    const chosenModel = await resolveModel(model);
    const { systemPrompt, messages: formattedMessages } = formatMessagesForAnthropic(messages);
    const anthropicTools = formatToolsForAnthropic(tools);

    const payload = {
        model: chosenModel,
        max_tokens: options.max_tokens || 4096,
        messages: formattedMessages,
        stream: true,
    };

    if (systemPrompt) payload.system = systemPrompt;
    if (anthropicTools && anthropicTools.length > 0) payload.tools = anthropicTools;
    if (options.temperature !== undefined) payload.temperature = options.temperature;

    const res = await axios.post(`${BASE_URL()}/v1/messages`, payload, {
        headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        responseType: "stream",
        timeout: options.timeout || 180000,
    });

    return new Promise((resolve, reject) => {
        let buffer = "";
        let currentToolCall = null;
        const aggregatedToolCalls = [];

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

                    if (parsed.type === "content_block_start") {
                        if (parsed.content_block?.type === "tool_use") {
                            currentToolCall = {
                                id: parsed.content_block.id,
                                type: "function",
                                function: {
                                    name: parsed.content_block.name,
                                    arguments: "",
                                },
                            };
                            aggregatedToolCalls.push(currentToolCall);
                        }
                    } else if (parsed.type === "content_block_delta") {
                        if (parsed.delta?.type === "text_delta") {
                            const token = parsed.delta.text || "";
                            if (onChunk) {
                                onChunk({
                                    message: {
                                        content: token,
                                        thinking: "",
                                    },
                                    done: false,
                                });
                            }
                        } else if (parsed.delta?.type === "input_json_delta") {
                            if (currentToolCall) {
                                currentToolCall.function.arguments += parsed.delta.partial_json || "";
                            }
                        }
                    } else if (parsed.type === "content_block_stop") {
                        currentToolCall = null;
                    } else if (parsed.type === "message_stop") {
                        if (onDone) {
                            onDone({
                                done: true,
                                tool_calls: aggregatedToolCalls,
                            });
                        }
                    }
                } catch {}
            }
        });

        res.data.on("end", () => {
            if (onDone) onDone({ done: true, tool_calls: aggregatedToolCalls });
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
 * Test Anthropic connectivity.
 */
async function testConnection(config = {}) {
    const key = (config.apiKey !== undefined ? config.apiKey : API_KEY()).trim();
    const url = (config.baseUrl || BASE_URL()).trim().replace(/\/+$/, "");

    if (!key) {
        throw new Error("Anthropic API key is required to test the connection.");
    }

    try {
        await axios.post(
            `${url}/v1/messages`,
            {
                model: "claude-3-5-haiku-20241022",
                max_tokens: 1,
                messages: [{ role: "user", content: "ping" }],
            },
            {
                headers: {
                    "x-api-key": key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                timeout: 8000,
            },
        );

        return {
            ok: true,
            url,
            models: FALLBACK_MODELS,
            message: "Connected to Anthropic API! Key verified successfully.",
        };
    } catch (err) {
        const status = err.response?.status;
        const apiMessage = err.response?.data?.error?.message;

        if (status === 401) {
            throw new Error("Authentication failed (401 Unauthorized): Invalid Anthropic API key.");
        }
        if (status === 400 && apiMessage && apiMessage.toLowerCase().includes("credit")) {
            // Valid key but out of credits - still verified!
            return {
                ok: true,
                url,
                models: FALLBACK_MODELS,
                message: `Key valid, but Anthropic reported credit balance: ${apiMessage}`,
            };
        }

        throw new Error(apiMessage || `Could not connect to Anthropic at ${url}: ${err.message}`);
    }
}

module.exports = {
    id: "anthropic",
    name: "Anthropic Claude API",
    listModels,
    resolveModel,
    chat,
    chatStream,
    generate,
    testConnection,
};
