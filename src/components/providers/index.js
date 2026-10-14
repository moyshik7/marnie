"use strict";

const db = require("../../db/index");
const ollama = require("./ollama/interact");
const deepseek = require("./deepseek/interact");
const anthropic = require("./anthropic/interact");
const llamacpp = require("./llamacpp/interact");
const openai = require("./openai/interact");
const gemini = require("./gemini/interact");

const PROVIDERS = {
    ollama,
    deepseek,
    anthropic,
    claude: anthropic,
    llamacpp,
    openai,
    gemini,
};

/**
 * Metadata definition for all providers, including active ones and upcoming extendable integrations.
 */
const PROVIDER_METADATA = [
    {
        id: "ollama",
        name: "Ollama (Local / Self-hosted)",
        type: "local",
        description: "Run open-weights models locally on your hardware with Ollama",
        defaultBaseUrl: "http://localhost:11434",
        defaultModel: "llama3.2",
        requiresApiKey: false,
        supportsStreaming: true,
        supportsTools: true,
        status: "active",
    },
    {
        id: "deepseek",
        name: "DeepSeek API (Cloud)",
        type: "cloud",
        description: "DeepSeek-V3 and DeepSeek-R1 reasoning models via official API",
        defaultBaseUrl: "https://api.deepseek.com",
        defaultModel: "deepseek-chat",
        requiresApiKey: true,
        supportsStreaming: true,
        supportsTools: true,
        status: "active",
    },
    {
        id: "anthropic",
        name: "Anthropic Claude API (Cloud)",
        type: "cloud",
        description: "Claude 3.5 Sonnet and Haiku state-of-the-art models via Anthropic API",
        defaultBaseUrl: "https://api.anthropic.com",
        defaultModel: "claude-3-5-sonnet-20241022",
        requiresApiKey: true,
        supportsStreaming: true,
        supportsTools: true,
        status: "active",
    },
    {
        id: "llamacpp",
        name: "llama.cpp HTTP Server (Local)",
        type: "local",
        description: "High-performance local GGUF model execution via llama.cpp server",
        defaultBaseUrl: "http://localhost:8080",
        defaultModel: "default",
        requiresApiKey: false,
        supportsStreaming: true,
        supportsTools: true,
        status: "active",
    },
    {
        id: "openai",
        name: "OpenAI API (Cloud)",
        type: "cloud",
        description: "GPT-4o, GPT-4o-mini, o1, and o3-mini models via OpenAI API",
        defaultBaseUrl: "https://api.openai.com/v1",
        defaultModel: "gpt-4o",
        requiresApiKey: true,
        supportsStreaming: true,
        supportsTools: true,
        status: "active",
    },
    {
        id: "gemini",
        name: "Google Gemini API (Cloud)",
        type: "cloud",
        description: "Gemini 2.5 Flash, 2.0 Flash, and Pro models via Google AI Studio API",
        defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
        defaultModel: "gemini-2.0-flash",
        requiresApiKey: true,
        supportsStreaming: true,
        supportsTools: true,
        status: "active",
    },
];

/**
 * Get active provider name from SQLite settings table.
 * Defaults to "ollama" if not set.
 */
function getActiveProviderName() {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'default_provider'").get();
        if (row && row.value && PROVIDERS[row.value]) {
            return row.value;
        }
    } catch {}
    return "ollama";
}

/**
 * Get provider instance by name.
 */
function getProvider(name) {
    if (name && PROVIDERS[name]) {
        return PROVIDERS[name];
    }
    const active = getActiveProviderName();
    return PROVIDERS[active] || ollama;
}

/**
 * Get the default model configured for a specific provider.
 */
function getDefaultModel(providerName) {
    const prov = providerName || getActiveProviderName();
    try {
        if (prov === "deepseek") {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'deepseek_model'").get();
            return (row && row.value) || "deepseek-chat";
        } else if (prov === "anthropic" || prov === "claude") {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_model'").get();
            return (row && row.value) || "claude-3-5-sonnet-20241022";
        } else if (prov === "openai") {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'openai_model'").get();
            return (row && row.value) || "gpt-4o";
        } else if (prov === "gemini") {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_model'").get();
            return (row && row.value) || "gemini-2.0-flash";
        } else if (prov === "llamacpp") {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'llamacpp_model'").get();
            return (row && row.value) || "default";
        } else {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'default_model'").get();
            return (row && row.value) || process.env.DEFAULT_MODEL || "llama3.2";
        }
    } catch {}
    if (prov === "deepseek") return "deepseek-chat";
    if (prov === "anthropic" || prov === "claude") return "claude-3-5-sonnet-20241022";
    if (prov === "openai") return "gpt-4o";
    if (prov === "gemini") return "gemini-2.0-flash";
    if (prov === "llamacpp") return "default";
    return "llama3.2";
}

/**
 * List supported providers metadata.
 */
function listProviders() {
    return PROVIDER_METADATA;
}

/**
 * List models for a provider or the active provider.
 */
async function listModels(providerName) {
    const target = getProvider(providerName);
    return target.listModels();
}

/**
 * Non-streaming chat completion with active or specified provider.
 */
async function chat({ provider, model, messages, options, tools }) {
    const target = getProvider(provider);
    return target.chat({ model, messages, options, tools });
}

/**
 * Streaming chat completion with active or specified provider.
 */
async function chatStream({ provider, model, messages, options, tools, onChunk, onDone }) {
    const target = getProvider(provider);
    return target.chatStream({ model, messages, options, tools, onChunk, onDone });
}

/**
 * Completion generation with active or specified provider.
 */
async function generate({ provider, model, prompt, options }) {
    const target = getProvider(provider);
    return target.generate({ model, prompt, options });
}

/**
 * Test connectivity for a given provider.
 */
async function testProvider(providerName, config = {}) {
    const target = getProvider(providerName);
    if (!target || typeof target.testConnection !== "function") {
        throw new Error(`Provider "${providerName}" does not support connection testing.`);
    }
    return target.testConnection(config);
}

module.exports = {
    PROVIDERS,
    PROVIDER_METADATA,
    getActiveProviderName,
    getProvider,
    getDefaultModel,
    listProviders,
    listModels,
    chat,
    chatStream,
    generate,
    testProvider,
};
