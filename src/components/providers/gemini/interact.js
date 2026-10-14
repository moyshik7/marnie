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
    let raw = getSetting("gemini_base_url", process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta");
    return raw.replace(/\/+$/, "");
};

const API_KEY = () => getSetting("gemini_api_key", process.env.GEMINI_API_KEY || "");
const DEFAULT_MODEL = () => getSetting("gemini_model", process.env.GEMINI_MODEL || "gemini-2.0-flash");

const FALLBACK_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
];

/**
 * List available models from Google Gemini API.
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
                "x-goog-api-key": key,
            },
            timeout: 8000,
        });

        if (Array.isArray(res.data?.models) && res.data.models.length > 0) {
            const list = [];
            for (const m of res.data.models) {
                const methods = m.supportedGenerationMethods || [];
                if (methods.includes("generateContent")) {
                    const cleanName = (m.name || "").replace(/^models\//, "");
                    if (cleanName && !list.includes(cleanName)) {
                        list.push(cleanName);
                    }
                }
            }

            for (const fm of FALLBACK_MODELS) {
                if (!list.includes(fm)) list.unshift(fm);
            }
            return list;
        }
        return FALLBACK_MODELS;
    } catch (err) {
        console.warn("[gemini] Could not fetch models from API, using fallback list:", err.message);
        return FALLBACK_MODELS;
    }
}

/**
 * Clean model name by stripping 'models/' prefix.
 */
function cleanModelName(model) {
    if (!model) return "gemini-2.0-flash";
    return model.replace(/^models\//, "").trim();
}

/**
 * Resolve which model to use.
 */
async function resolveModel(requestedModel) {
    if (requestedModel && typeof requestedModel === "string" && requestedModel.trim()) {
        const clean = cleanModelName(requestedModel);
        if (
            clean.startsWith("gemini-") ||
            FALLBACK_MODELS.includes(clean)
        ) {
            return clean;
        }
        const models = await listModels();
        if (models.includes(clean)) return clean;
    }
    const configured = cleanModelName(DEFAULT_MODEL());
    return configured || "gemini-2.0-flash";
}

/**
 * Convert OpenAI/standard messages to Gemini format.
 * Separates system messages into systemInstruction, and maps roles to 'user' / 'model'.
 */
function formatMessages(messages) {
    if (!Array.isArray(messages)) return { systemInstruction: undefined, contents: [] };

    let systemInstruction = undefined;
    const contents = [];

    for (const msg of messages) {
        if (!msg) continue;
        const role = msg.role;

        if (role === "system") {
            const text = msg.content || "";
            if (text.trim()) {
                if (!systemInstruction) {
                    systemInstruction = { parts: [{ text }] };
                } else {
                    systemInstruction.parts.push({ text });
                }
            }
            continue;
        }

        // Gemini uses 'user' or 'model'
        const geminiRole = role === "assistant" ? "model" : "user";
        const parts = [];

        if (msg.content) {
            parts.push({ text: String(msg.content) });
        }

        // Handle tool calls in assistant messages
        if (role === "assistant" && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
            for (const tc of msg.tool_calls) {
                const fnName = tc.function?.name || tc.name;
                let fnArgs = tc.function?.arguments || tc.arguments || {};
                if (typeof fnArgs === "string") {
                    try {
                        fnArgs = JSON.parse(fnArgs);
                    } catch {
                        fnArgs = { raw: fnArgs };
                    }
                }
                parts.push({
                    functionCall: {
                        name: fnName,
                        args: fnArgs,
                    },
                });
            }
        }

        // Handle tool responses
        if (role === "tool") {
            let parsed = msg.content;
            try {
                parsed = typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content;
            } catch {
                parsed = { output: msg.content };
            }
            parts.push({
                functionResponse: {
                    name: msg.name || "tool_result",
                    response: typeof parsed === "object" && parsed !== null ? parsed : { result: parsed },
                },
            });
        }

        if (parts.length > 0) {
            contents.push({
                role: geminiRole,
                parts,
            });
        }
    }

    return { systemInstruction, contents };
}

/**
 * Convert standard tool schemas to Gemini functionDeclarations format.
 */
function formatTools(tools) {
    if (!Array.isArray(tools) || tools.length === 0) return undefined;

    const functionDeclarations = tools
        .map((t) => {
            const fn = t.function || t;
            if (!fn.name) return null;
            return {
                name: fn.name,
                description: fn.description || "",
                parameters: fn.parameters || { type: "OBJECT", properties: {} },
            };
        })
        .filter(Boolean);

    if (functionDeclarations.length === 0) return undefined;
    return [{ functionDeclarations }];
}

/**
 * Execute a non-streaming chat completion with Gemini API.
 */
async function chat({ model, messages, options = {}, tools }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("Google Gemini API key is missing. Please configure it in Settings -> Models.");
    }

    const resolved = await resolveModel(model);
    const { systemInstruction, contents } = formatMessages(messages);
    const geminiTools = formatTools(tools);

    const payload = {
        contents,
    };

    if (systemInstruction) {
        payload.systemInstruction = systemInstruction;
    }

    if (geminiTools) {
        payload.tools = geminiTools;
    }

    const generationConfig = {};
    if (typeof options.temperature === "number") {
        generationConfig.temperature = options.temperature;
    }
    if (options.max_tokens) {
        generationConfig.maxOutputTokens = options.max_tokens;
    }
    if (Object.keys(generationConfig).length > 0) {
        payload.generationConfig = generationConfig;
    }

    try {
        const res = await axios.post(
            `${BASE_URL()}/models/${resolved}:generateContent`,
            payload,
            {
                headers: {
                    "x-goog-api-key": key,
                    "Content-Type": "application/json",
                },
                timeout: options.timeout || 120000,
            },
        );

        const candidate = res.data?.candidates?.[0];
        const content = candidate?.content;
        let textContent = "";
        let toolCalls = undefined;

        if (content && Array.isArray(content.parts)) {
            for (const part of content.parts) {
                if (part.text) {
                    textContent += part.text;
                }
                if (part.functionCall) {
                    if (!toolCalls) toolCalls = [];
                    toolCalls.push({
                        id: `call_${Date.now()}_${toolCalls.length}`,
                        type: "function",
                        function: {
                            name: part.functionCall.name,
                            arguments: part.functionCall.args || {},
                        },
                    });
                }
            }
        }

        return {
            content: textContent,
            role: "assistant",
            tool_calls: toolCalls,
            model: resolved,
            finish_reason: candidate?.finishReason || "STOP",
            usage: res.data?.usageMetadata,
        };
    } catch (err) {
        if (err.response?.data?.error?.message) {
            throw new Error(`Gemini API error (${err.response.status}): ${err.response.data.error.message}`);
        }
        throw new Error(`Gemini request failed: ${err.message}`);
    }
}

/**
 * Execute a streaming chat completion with Gemini API via SSE.
 */
async function chatStream({ model, messages, options = {}, tools, onChunk, onDone }) {
    const key = API_KEY();
    if (!key) {
        throw new Error("Google Gemini API key is missing. Please configure it in Settings -> Models.");
    }

    const resolved = await resolveModel(model);
    const { systemInstruction, contents } = formatMessages(messages);
    const geminiTools = formatTools(tools);

    const payload = {
        contents,
    };

    if (systemInstruction) {
        payload.systemInstruction = systemInstruction;
    }

    if (geminiTools) {
        payload.tools = geminiTools;
    }

    const generationConfig = {};
    if (typeof options.temperature === "number") {
        generationConfig.temperature = options.temperature;
    }
    if (options.max_tokens) {
        generationConfig.maxOutputTokens = options.max_tokens;
    }
    if (Object.keys(generationConfig).length > 0) {
        payload.generationConfig = generationConfig;
    }

    const response = await axios.post(
        `${BASE_URL()}/models/${resolved}:streamGenerateContent?alt=sse`,
        payload,
        {
            headers: {
                "x-goog-api-key": key,
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            responseType: "stream",
            timeout: options.timeout || 120000,
        },
    );

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
                try {
                    const parsed = JSON.parse(dataStr);
                    const candidate = parsed.candidates?.[0];
                    if (!candidate) continue;

                    const parts = candidate.content?.parts;
                    if (Array.isArray(parts)) {
                        for (const part of parts) {
                            if (part.text) {
                                fullContent += part.text;
                                if (typeof onChunk === "function") {
                                    onChunk({
                                        content: part.text,
                                        fullContent,
                                        done: false,
                                    });
                                }
                            }
                            if (part.functionCall) {
                                accumulatedToolCalls.push({
                                    id: `call_${Date.now()}_${accumulatedToolCalls.length}`,
                                    type: "function",
                                    function: {
                                        name: part.functionCall.name,
                                        arguments: part.functionCall.args || {},
                                    },
                                });
                            }
                        }
                    }
                } catch {
                    // Ignore malformed chunks
                }
            }
        });

        response.data.on("end", () => {
            const result = {
                content: fullContent,
                role: "assistant",
                tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                model: resolved,
                done: true,
            };

            if (typeof onDone === "function") {
                onDone(result);
            }
            resolve(result);
        });

        response.data.on("error", (err) => {
            reject(new Error(`Gemini stream error: ${err.message}`));
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
 * Test connectivity and API key validity against Google Gemini API.
 */
async function testConnection(config = {}) {
    const key = config.apiKey || API_KEY();
    if (!key) {
        throw new Error("Google Gemini API key is missing. Please configure it in Settings.");
    }
    let url = config.baseUrl || BASE_URL();
    url = url.replace(/\/+$/, "");

    try {
        const res = await axios.get(`${url}/models`, {
            headers: {
                "x-goog-api-key": key,
            },
            timeout: 8000,
        });

        const rawModels = Array.isArray(res.data?.models) ? res.data.models : [];
        const models = [];
        for (const m of rawModels) {
            const methods = m.supportedGenerationMethods || [];
            if (methods.includes("generateContent")) {
                const clean = (m.name || "").replace(/^models\//, "");
                if (clean) models.push(clean);
            }
        }

        return {
            ok: true,
            message: `Connected to Google Gemini successfully! Found ${models.length} generation models.`,
            models: models.length > 0 ? models : FALLBACK_MODELS,
        };
    } catch (err) {
        if (err.response?.status === 400 || err.response?.status === 403) {
            throw new Error(`Authentication failed (${err.response.status}): Invalid Gemini API key.`);
        }
        if (err.response?.status === 429) {
            throw new Error("Gemini API rate limit exceeded (429 Too Many Requests).");
        }
        if (err.response?.data?.error?.message) {
            throw new Error(`Gemini API error (${err.response.status}): ${err.response.data.error.message}`);
        }
        throw new Error(`Could not connect to Gemini API at ${url}: ${err.message}`);
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
