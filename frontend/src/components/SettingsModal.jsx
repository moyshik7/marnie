import React, { useState, useEffect, useRef } from "react";
import { X, Check, AlertCircle, Bell, Cpu, Database, RefreshCw, BotIcon, Globe, Brain, Edit3, FileText, Eye, EyeOff, Key, Sparkles, Server } from "lucide-react";
import { getSettings, updateSettings, testOllamaConnection, testDeepSeekConnection, testDiscordAlert, getCustomApiBase, setCustomApiBase, listModels, getBrainMemory, saveBrainMemory, consolidateBrainMemory } from "../services/api";

export default function SettingsModal({ isOpen, onClose, onSettingsUpdated, currentModel, onModelChanged }) {
    const [activeTab, setActiveTab] = useState("ollama");
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Provider selection state
    const [selectedProvider, setSelectedProvider] = useState("ollama");

    // Form states
    const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
    const [defaultModel, setDefaultModel] = useState("llama3.2");
    const [deepseekApiKey, setDeepseekApiKey] = useState("");
    const [showDeepseekKey, setShowDeepseekKey] = useState(false);
    const [deepseekBaseUrl, setDeepseekBaseUrl] = useState("https://api.deepseek.com");
    const [deepseekModel, setDeepseekModel] = useState("deepseek-chat");

    const [availableModels, setAvailableModels] = useState([]);
    const [discordWebhook, setDiscordWebhook] = useState("");
    const [searxngUrl, setSearxngUrl] = useState("http://localhost:8080");
    const [searchProvider, setSearchProvider] = useState("duckduckgo");
    const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
    const [agentModeEnabled, setAgentModeEnabled] = useState(true);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [apiBaseUrl, setApiBaseUrl] = useState("");
    const [brainEnabled, setBrainEnabled] = useState(true);
    const [brainContent, setBrainContent] = useState("");
    const [brainLastUpdated, setBrainLastUpdated] = useState(null);
    const [brainConsolidating, setBrainConsolidating] = useState(false);
    const [brainConsolidateMsg, setBrainConsolidateMsg] = useState(null);
    const [brainEditing, setBrainEditing] = useState(false);
    const [savingBrain, setSavingBrain] = useState(false);

    // Test states
    const [ollamaTesting, setOllamaTesting] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState(null);
    const [deepseekTesting, setDeepseekTesting] = useState(false);
    const [deepseekStatus, setDeepseekStatus] = useState(null);
    const [discordTesting, setDiscordTesting] = useState(false);
    const [discordStatus, setDiscordStatus] = useState(null);

    // Real-time auto-saving status
    const [autoSaveStatus, setAutoSaveStatus] = useState("idle"); // "idle" | "saving" | "saved" | "error"
    const autoSaveTimerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            loadCurrentSettings();
            setApiBaseUrl(getCustomApiBase());
        }
    }, [isOpen]);

    const loadCurrentSettings = async () => {
        try {
            setLoading(true);
            const data = await getSettings();
            const s = data.settings || {};
            const prov = s.default_provider || "ollama";
            setSelectedProvider(prov);
            if (s.ollama_base_url) setOllamaUrl(s.ollama_base_url);
            if (s.default_model) setDefaultModel(s.default_model);
            if (s.deepseek_api_key) setDeepseekApiKey(s.deepseek_api_key);
            if (s.deepseek_base_url) setDeepseekBaseUrl(s.deepseek_base_url);
            if (s.deepseek_model) setDeepseekModel(s.deepseek_model);
            if (s.discord_webhook_url) setDiscordWebhook(s.discord_webhook_url);
            if (s.searxng_url) setSearxngUrl(s.searxng_url);
            if (s.search_provider) setSearchProvider(s.search_provider);
            if (s.deep_research_enabled) setDeepResearchEnabled(s.deep_research_enabled === "true");
            if (s.agent_mode_enabled) setAgentModeEnabled(s.agent_mode_enabled === "true");
            if (s.brain_enabled !== undefined) setBrainEnabled(s.brain_enabled !== "false");
            if (s.system_prompt) setSystemPrompt(s.system_prompt);

            // fetch models for active provider
            const models = await listModels(prov);
            if (models.length) setAvailableModels(models);

            // fetch persistent brain memory
            try {
                const b = await getBrainMemory();
                if (b) {
                    setBrainContent(b.content || "");
                    setBrainLastUpdated(b.lastUpdated || null);
                    if (b.enabled !== undefined) setBrainEnabled(b.enabled);
                }
            } catch (bErr) {
                console.warn("Failed to fetch brain memory:", bErr.message);
            }
        } catch (err) {
            console.warn("Failed to fetch settings:", err.message);
        } finally {
            setLoading(false);
        }
    };

    // Real-time persistence helper
    const performSave = async (overrides = {}) => {
        setAutoSaveStatus("saving");
        try {
            const providerToSave = overrides.selectedProvider ?? selectedProvider;
            const ollamaUrlToSave = overrides.ollamaUrl ?? ollamaUrl;
            const defaultModelToSave = overrides.defaultModel ?? defaultModel;
            const deepseekKeyToSave = overrides.deepseekApiKey ?? deepseekApiKey;
            const deepseekUrlToSave = overrides.deepseekBaseUrl ?? deepseekBaseUrl;
            const deepseekModelToSave = overrides.deepseekModel ?? deepseekModel;
            const discordWebhookToSave = overrides.discordWebhook ?? discordWebhook;
            const searxngUrlToSave = overrides.searxngUrl ?? searxngUrl;
            const searchProviderToSave = overrides.searchProvider ?? searchProvider;
            const deepResearchEnabledToSave = overrides.deepResearchEnabled ?? deepResearchEnabled;
            const agentModeEnabledToSave = overrides.agentModeEnabled ?? agentModeEnabled;
            const brainEnabledToSave = overrides.brainEnabled ?? brainEnabled;
            const systemPromptToSave = overrides.systemPrompt ?? systemPrompt;

            const payload = {
                default_provider: providerToSave,
                ollama_base_url: ollamaUrlToSave,
                default_model: defaultModelToSave,
                deepseek_api_key: deepseekKeyToSave,
                deepseek_base_url: deepseekUrlToSave,
                deepseek_model: deepseekModelToSave,
                discord_webhook_url: discordWebhookToSave,
                searxng_url: searxngUrlToSave,
                search_provider: searchProviderToSave,
                deep_research_enabled: String(deepResearchEnabledToSave),
                agent_mode_enabled: String(agentModeEnabledToSave),
                brain_enabled: String(brainEnabledToSave),
                system_prompt: systemPromptToSave,
            };

            await updateSettings(payload);
            setAutoSaveStatus("saved");
            setTimeout(() => setAutoSaveStatus("idle"), 2500);

            if (onSettingsUpdated) {
                onSettingsUpdated(payload);
            }

            const activeModelToReport = providerToSave === "deepseek" ? deepseekModelToSave : defaultModelToSave;
            if (onModelChanged && activeModelToReport) {
                onModelChanged(activeModelToReport);
            }
        } catch (err) {
            console.warn("Real-time auto-save error:", err);
            setAutoSaveStatus("error");
        }
    };

    const triggerAutoSave = (overrides = {}, delay = 500) => {
        setAutoSaveStatus("saving");
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = setTimeout(() => {
            performSave(overrides);
        }, delay);
    };

    const handleProviderChange = async (newProvider) => {
        setSelectedProvider(newProvider);
        performSave({ selectedProvider: newProvider });

        try {
            const models = await listModels(newProvider);
            if (models && models.length > 0) {
                setAvailableModels(models);
                if (newProvider === "deepseek") {
                    if (!models.includes(deepseekModel)) {
                        setDeepseekModel(models[0]);
                        performSave({ selectedProvider: newProvider, deepseekModel: models[0] });
                    }
                } else {
                    if (!models.includes(defaultModel)) {
                        setDefaultModel(models[0]);
                        performSave({ selectedProvider: newProvider, defaultModel: models[0] });
                    }
                }
            }
        } catch (err) {
            console.warn("Failed to load models for provider:", newProvider, err);
        }
    };

    const handleConsolidateBrain = async () => {
        setBrainConsolidating(true);
        setBrainConsolidateMsg(null);
        try {
            const res = await consolidateBrainMemory(null, selectedProvider === "deepseek" ? deepseekModel : defaultModel);
            if (res.updated) {
                setBrainContent(res.content);
                setBrainLastUpdated(new Date().toISOString());
                setBrainConsolidateMsg({
                    ok: true,
                    message: "Brain memory successfully consolidated and saved to workspace/BRAIN.md!",
                });
            } else {
                setBrainConsolidateMsg({
                    ok: false,
                    message: res.error || "Memory consolidation did not make changes.",
                });
            }
        } catch (err) {
            setBrainConsolidateMsg({
                ok: false,
                message: err.message || "Failed to consolidate memory",
            });
        } finally {
            setBrainConsolidating(false);
        }
    };

    const handleSaveBrainDirect = async () => {
        setSavingBrain(true);
        try {
            await saveBrainMemory(brainContent);
            setBrainEditing(false);
            setBrainLastUpdated(new Date().toISOString());
        } catch (err) {
            alert("Failed to save BRAIN.md: " + err.message);
        } finally {
            setSavingBrain(false);
        }
    };

    const handleTestOllama = async () => {
        setOllamaTesting(true);
        setOllamaStatus(null);
        try {
            const res = await testOllamaConnection(ollamaUrl);
            setOllamaStatus({
                ok: true,
                message: res.message || `Connected! Found ${res.models?.length || 0} models.`,
            });
            if (res.models && res.models.length > 0 && selectedProvider === "ollama") {
                setAvailableModels(res.models);
                if (!res.models.includes(defaultModel)) {
                    setDefaultModel(res.models[0]);
                    performSave({ defaultModel: res.models[0] });
                }
            }
        } catch (err) {
            setOllamaStatus({
                ok: false,
                message: err.message || "Connection failed",
            });
        } finally {
            setOllamaTesting(false);
        }
    };

    const handleTestDeepSeek = async () => {
        setDeepseekTesting(true);
        setDeepseekStatus(null);
        try {
            const res = await testDeepSeekConnection({ apiKey: deepseekApiKey, baseUrl: deepseekBaseUrl });
            setDeepseekStatus({
                ok: true,
                message: res.message || `Connected to DeepSeek! Key verified.`,
            });
            if (res.models && res.models.length > 0 && selectedProvider === "deepseek") {
                setAvailableModels(res.models);
                if (!res.models.includes(deepseekModel)) {
                    setDeepseekModel(res.models[0]);
                    performSave({ deepseekModel: res.models[0] });
                }
            }
        } catch (err) {
            setDeepseekStatus({
                ok: false,
                message: err.message || "DeepSeek connection failed",
            });
        } finally {
            setDeepseekTesting(false);
        }
    };

    const handleTestDiscord = async () => {
        setDiscordTesting(true);
        setDiscordStatus(null);
        try {
            await testDiscordAlert(discordWebhook);
            setDiscordStatus({
                ok: true,
                message: "Notification sent successfully to Discord channel!",
            });
        } catch (err) {
            setDiscordStatus({
                ok: false,
                message: err.message || "Failed to send alert",
            });
        } finally {
            setDiscordTesting(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await performSave();
            // Save custom API base if changed
            setCustomApiBase(apiBaseUrl);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (err) {
            alert(`Error saving settings: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(28, 25, 23, 0.45)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                animation: "fadeIn 0.15s ease-out",
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: "740px",
                    maxWidth: "92vw",
                    maxHeight: "85vh",
                    backgroundColor: "var(--bg-primary)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "1.25rem 1.5rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: "var(--bg-secondary)",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "1.35rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            Settings & Integrations
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "0.4rem",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div
                    style={{
                        display: "flex",
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                        padding: "0 1rem",
                        gap: "0.5rem",
                    }}
                >
                    {[
                        { id: "ollama", label: "Models", icon: Cpu },
                        { id: "discord", label: "Integrations", icon: Bell },
                        { id: "websearch", label: "Web Search", icon: Globe },
                        { id: "storage", label: "Memory", icon: Database },
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.75rem 0.9rem",
                                    fontSize: "0.85rem",
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? "var(--accent-terracotta)" : "var(--text-secondary)",
                                    borderBottom: isActive ? "2px solid var(--accent-terracotta)" : "2px solid transparent",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <Icon size={15} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Body */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "1.5rem",
                    }}
                >
                    {/* TAB 1: MODELS & PROVIDERS */}
                    {activeTab === "ollama" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.5rem",
                            }}
                        >
                            {/* Top Provider Dropdown */}
                            <div
                                style={{
                                    backgroundColor: "var(--bg-secondary)",
                                    border: "1px solid var(--border-strong)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "1rem",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.45rem",
                                            fontSize: "0.85rem",
                                            fontWeight: 600,
                                            color: "var(--text-primary)",
                                        }}
                                    >
                                        <Cpu size={16} color="var(--accent-terracotta)" />
                                        <span>Active AI Provider / Endpoint</span>
                                    </label>
                                    <span
                                        style={{
                                            fontSize: "0.72rem",
                                            padding: "0.2rem 0.55rem",
                                            borderRadius: "999px",
                                            backgroundColor: selectedProvider === "deepseek" ? "rgba(59, 130, 246, 0.12)" : "rgba(34, 197, 94, 0.12)",
                                            color: selectedProvider === "deepseek" ? "#2563EB" : "#16A34A",
                                            fontWeight: 600,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                        }}
                                    >
                                        <span
                                            style={{
                                                width: "6px",
                                                height: "6px",
                                                borderRadius: "50%",
                                                backgroundColor: selectedProvider === "deepseek" ? "#2563EB" : "#16A34A",
                                                display: "inline-block",
                                            }}
                                        />
                                        Active: {selectedProvider === "deepseek" ? "DeepSeek API (Cloud)" : "Ollama (Local)"}
                                    </span>
                                </div>

                                <select
                                    value={selectedProvider}
                                    onChange={(e) => handleProviderChange(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "0.65rem 0.85rem",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: "var(--bg-card)",
                                        color: "var(--text-primary)",
                                        fontSize: "0.9rem",
                                        fontWeight: 500,
                                        outline: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    <option value="ollama">Ollama (Local / Self-hosted)</option>
                                    <option value="deepseek">DeepSeek API (Cloud)</option>
                                    <option value="openai" disabled>OpenAI API (Coming Soon)</option>
                                    <option value="claude" disabled>Anthropic Claude API (Coming Soon)</option>
                                    <option value="gemini" disabled>Google Gemini API (Coming Soon)</option>
                                    <option value="llamacpp" disabled>llama.cpp HTTP Server (Coming Soon)</option>
                                </select>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.45rem",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    When selected, the entire workspace (chat, streaming responses, deep research, and memory synthesis) will use this service.
                                </div>
                            </div>

                            {/* Section 1: Ollama Configuration */}
                            <div
                                style={{
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "1rem",
                                    backgroundColor: selectedProvider === "ollama" ? "var(--bg-card)" : "transparent",
                                    opacity: selectedProvider === "ollama" ? 1 : 0.75,
                                    transition: "opacity 0.15s ease",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "0.75rem",
                                    }}
                                >
                                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                        Ollama Configuration
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 500,
                                            padding: "0.15rem 0.5rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: "var(--bg-secondary)",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        Local
                                    </span>
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 500,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.35rem",
                                        }}
                                    >
                                        Ollama Base URL
                                    </label>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <input
                                            type="text"
                                            value={ollamaUrl}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setOllamaUrl(val);
                                                triggerAutoSave({ ollamaUrl: val });
                                            }}
                                            placeholder="http://localhost:11434"
                                            style={{
                                                flex: 1,
                                                padding: "0.6rem 0.75rem",
                                                borderRadius: "var(--radius-sm)",
                                                border: "1px solid var(--border-strong)",
                                                backgroundColor: "var(--bg-card)",
                                                color: "var(--text-primary)",
                                                fontSize: "0.88rem",
                                                outline: "none",
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleTestOllama}
                                            disabled={ollamaTesting}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.4rem",
                                                padding: "0.6rem 0.9rem",
                                                backgroundColor: "var(--bg-card)",
                                                border: "1px solid var(--border-strong)",
                                                borderRadius: "var(--radius-sm)",
                                                fontSize: "0.82rem",
                                                fontWeight: 500,
                                                color: "var(--text-primary)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            <RefreshCw size={14} className={ollamaTesting ? "typing-dot" : ""} />
                                            <span>{ollamaTesting ? "Testing..." : "Test Connection"}</span>
                                        </button>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-muted)",
                                            marginTop: "0.35rem",
                                        }}
                                    >
                                        Base URL for locally running Ollama instance or remote server.
                                    </div>

                                    {ollamaStatus && (
                                        <div
                                            style={{
                                                marginTop: "0.65rem",
                                                padding: "0.5rem 0.75rem",
                                                borderRadius: "var(--radius-sm)",
                                                backgroundColor: ollamaStatus.ok ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)",
                                                color: ollamaStatus.ok ? "#15803D" : "#DC2626",
                                                fontSize: "0.8rem",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.4rem",
                                            }}
                                        >
                                            {ollamaStatus.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                                            <span>{ollamaStatus.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: DeepSeek API Configuration (Below Ollama) */}
                            <div
                                style={{
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "1rem",
                                    backgroundColor: selectedProvider === "deepseek" ? "var(--bg-card)" : "transparent",
                                    opacity: selectedProvider === "deepseek" ? 1 : 0.75,
                                    transition: "opacity 0.15s ease",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: "0.75rem",
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                            DeepSeek API Configuration
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "0.68rem",
                                                fontWeight: 600,
                                                padding: "0.15rem 0.45rem",
                                                borderRadius: "999px",
                                                backgroundColor: "rgba(59, 130, 246, 0.12)",
                                                color: "#2563EB",
                                            }}
                                        >
                                            DeepSeek-V3 & R1
                                        </span>
                                    </div>
                                    <span
                                        style={{
                                            fontSize: "0.7rem",
                                            fontWeight: 500,
                                            padding: "0.15rem 0.5rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: "var(--bg-secondary)",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        Cloud
                                    </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                                    {/* DeepSeek API Key */}
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.8rem",
                                                fontWeight: 500,
                                                color: "var(--text-secondary)",
                                                marginBottom: "0.35rem",
                                            }}
                                        >
                                            DeepSeek API Key
                                        </label>
                                        <div style={{ display: "flex", gap: "0.5rem" }}>
                                            <div style={{ position: "relative", flex: 1 }}>
                                                <input
                                                    type={showDeepseekKey ? "text" : "password"}
                                                    value={deepseekApiKey}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setDeepseekApiKey(val);
                                                        triggerAutoSave({ deepseekApiKey: val });
                                                    }}
                                                    placeholder="sk-..."
                                                    style={{
                                                        width: "100%",
                                                        padding: "0.6rem 2.4rem 0.6rem 0.75rem",
                                                        borderRadius: "var(--radius-sm)",
                                                        border: "1px solid var(--border-strong)",
                                                        backgroundColor: "var(--bg-card)",
                                                        color: "var(--text-primary)",
                                                        fontSize: "0.88rem",
                                                        outline: "none",
                                                        fontFamily: showDeepseekKey ? "monospace" : "inherit",
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDeepseekKey((prev) => !prev)}
                                                    title={showDeepseekKey ? "Hide API Key" : "Show API Key"}
                                                    style={{
                                                        position: "absolute",
                                                        right: "0.6rem",
                                                        top: "50%",
                                                        transform: "translateY(-50%)",
                                                        background: "none",
                                                        border: "none",
                                                        color: "var(--text-muted)",
                                                        cursor: "pointer",
                                                        padding: "0.2rem",
                                                        display: "flex",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    {showDeepseekKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleTestDeepSeek}
                                                disabled={deepseekTesting || !deepseekApiKey.trim()}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.4rem",
                                                    padding: "0.6rem 0.9rem",
                                                    backgroundColor: "var(--bg-card)",
                                                    border: "1px solid var(--border-strong)",
                                                    borderRadius: "var(--radius-sm)",
                                                    fontSize: "0.82rem",
                                                    fontWeight: 500,
                                                    color: "var(--text-primary)",
                                                    cursor: !deepseekApiKey.trim() ? "not-allowed" : "pointer",
                                                    opacity: !deepseekApiKey.trim() ? 0.6 : 1,
                                                }}
                                            >
                                                <RefreshCw size={14} className={deepseekTesting ? "typing-dot" : ""} />
                                                <span>{deepseekTesting ? "Verifying..." : "Verify Key"}</span>
                                            </button>
                                        </div>
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                color: "var(--text-muted)",
                                                marginTop: "0.35rem",
                                            }}
                                        >
                                            Required for DeepSeek API requests. Saved securely in local database.
                                        </div>
                                    </div>

                                    {/* DeepSeek Custom Endpoint */}
                                    <div>
                                        <label
                                            style={{
                                                display: "block",
                                                fontSize: "0.8rem",
                                                fontWeight: 500,
                                                color: "var(--text-secondary)",
                                                marginBottom: "0.35rem",
                                            }}
                                        >
                                            Custom DeepSeek Endpoint URL (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={deepseekBaseUrl}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setDeepseekBaseUrl(val);
                                                triggerAutoSave({ deepseekBaseUrl: val });
                                            }}
                                            placeholder="https://api.deepseek.com"
                                            style={{
                                                width: "100%",
                                                padding: "0.6rem 0.75rem",
                                                borderRadius: "var(--radius-sm)",
                                                border: "1px solid var(--border-strong)",
                                                backgroundColor: "var(--bg-card)",
                                                color: "var(--text-primary)",
                                                fontSize: "0.88rem",
                                                outline: "none",
                                            }}
                                        />
                                        <div
                                            style={{
                                                fontSize: "0.75rem",
                                                color: "var(--text-muted)",
                                                marginTop: "0.35rem",
                                            }}
                                        >
                                            Default: <code>https://api.deepseek.com</code>. Supports OpenAI-compatible reverse proxies or gateways.
                                        </div>
                                    </div>

                                    {deepseekStatus && (
                                        <div
                                            style={{
                                                marginTop: "0.25rem",
                                                padding: "0.5rem 0.75rem",
                                                borderRadius: "var(--radius-sm)",
                                                backgroundColor: deepseekStatus.ok ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)",
                                                color: deepseekStatus.ok ? "#15803D" : "#DC2626",
                                                fontSize: "0.8rem",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.4rem",
                                            }}
                                        >
                                            {deepseekStatus.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                                            <span>{deepseekStatus.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Default Model Selection */}
                            <div
                                style={{
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "1rem",
                                    backgroundColor: "var(--bg-card)",
                                }}
                            >
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        marginBottom: "0.35rem",
                                    }}
                                >
                                    Default Model ({selectedProvider === "deepseek" ? "DeepSeek" : "Ollama"})
                                </label>

                                {selectedProvider === "deepseek" ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                        <select
                                            value={deepseekModel}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setDeepseekModel(val);
                                                performSave({ deepseekModel: val });
                                            }}
                                            style={{
                                                width: "100%",
                                                padding: "0.6rem 0.75rem",
                                                borderRadius: "var(--radius-sm)",
                                                border: "1px solid var(--border-strong)",
                                                backgroundColor: "var(--bg-secondary)",
                                                color: "var(--text-primary)",
                                                fontSize: "0.88rem",
                                                outline: "none",
                                            }}
                                        >
                                            <option value="deepseek-chat">deepseek-chat (DeepSeek-V3 671B General / Fast)</option>
                                            <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek-R1 Full Chain-of-Thought)</option>
                                            {availableModels.filter((m) => m !== "deepseek-chat" && m !== "deepseek-reasoner").map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : availableModels.length > 0 ? (
                                    <select
                                        value={defaultModel}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDefaultModel(val);
                                            performSave({ defaultModel: val });
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "0.6rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-secondary)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.88rem",
                                            outline: "none",
                                        }}
                                    >
                                        {availableModels.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={defaultModel}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setDefaultModel(val);
                                            triggerAutoSave({ defaultModel: val });
                                        }}
                                        placeholder="llama3.2"
                                        style={{
                                            width: "100%",
                                            padding: "0.6rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-secondary)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.88rem",
                                            outline: "none",
                                        }}
                                    />
                                )}

                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.45rem",
                                    }}
                                >
                                    Default model invoked for conversations, deep research, and workspace task execution.
                                </div>
                            </div>

                            {/* Section 4: Upcoming Integrations (Extensible architecture) */}
                            <div
                                style={{
                                    border: "1px dashed var(--border-strong)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "0.85rem 1rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                                        More Integrations Under Development
                                    </span>
                                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                                        Anthropic Claude, Google Gemini, OpenAI, and llama.cpp HTTP server will be available as selectable endpoints soon.
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                                    {["Claude", "Gemini", "OpenAI", "llama.cpp"].map((name) => (
                                        <span
                                            key={name}
                                            style={{
                                                fontSize: "0.68rem",
                                                padding: "0.15rem 0.45rem",
                                                borderRadius: "var(--radius-sm)",
                                                border: "1px solid var(--border-subtle)",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: DISCORD */}
                    {activeTab === "discord" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.25rem",
                            }}
                        >
                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.82rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        marginBottom: "0.35rem",
                                    }}
                                >
                                    Discord Webhook URL
                                </label>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input
                                        type="text"
                                        value={discordWebhook}
                                        onChange={(e) => setDiscordWebhook(e.target.value)}
                                        placeholder="https://discord.com/api/webhooks/..."
                                        style={{
                                            flex: 1,
                                            padding: "0.6rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            fontSize: "0.88rem",
                                            outline: "none",
                                        }}
                                    />
                                    <button
                                        onClick={handleTestDiscord}
                                        disabled={discordTesting || !discordWebhook.trim()}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                            padding: "0.6rem 0.9rem",
                                            backgroundColor: "var(--bg-card)",
                                            border: "1px solid var(--border-strong)",
                                            borderRadius: "var(--radius-sm)",
                                            fontSize: "0.82rem",
                                            fontWeight: 500,
                                            color: "var(--text-primary)",
                                            opacity: !discordWebhook.trim() ? 0.6 : 1,
                                        }}
                                    >
                                        <Bell size={14} className={discordTesting ? "typing-dot" : ""} />
                                        <span>{discordTesting ? "Sending..." : "Test Webhook"}</span>
                                    </button>
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.35rem",
                                    }}
                                >
                                    Channel webhook for real-time task notifications, Scheduled Job alerts, and error reports.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: WEB SEARCH */}
                    {activeTab === "websearch" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.25rem",
                            }}
                        >
                            <div
                                style={{
                                    padding: "0.85rem 1rem",
                                    backgroundColor: "rgba(200, 91, 56, 0.08)",
                                    border: "1px solid rgba(200, 91, 56, 0.25)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.82rem",
                                    color: "var(--text-primary)",
                                    lineHeight: 1.5,
                                }}
                            >
                                <strong>Web Search Provider:</strong> Choose how Marnie retrieves real-time web results. You can switch between DuckDuckGo (instant, no setup required) and a private self-hosted SearXNG
                                instance.
                            </div>

                            {/* Search Provider Selector */}
                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.82rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        marginBottom: "0.5rem",
                                    }}
                                >
                                    Active Search Engine
                                </label>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "0.75rem",
                                    }}
                                >
                                    <div
                                        onClick={() => setSearchProvider("duckduckgo")}
                                        style={{
                                            padding: "0.85rem 1rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: searchProvider === "duckduckgo" ? "2px solid var(--accent-terracotta)" : "1px solid var(--border-subtle)",
                                            backgroundColor: searchProvider === "duckduckgo" ? "rgba(200, 91, 56, 0.06)" : "var(--bg-card)",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                                            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>DuckDuckGo</span>
                                            <span
                                                style={{
                                                    fontSize: "0.68rem",
                                                    padding: "0.15rem 0.45rem",
                                                    borderRadius: "4px",
                                                    backgroundColor: "rgba(34, 197, 94, 0.15)",
                                                    color: "#22c55e",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Default / Ready
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>Fast, privacy-friendly search without needing any local daemon or API key.</div>
                                    </div>

                                    <div
                                        onClick={() => setSearchProvider("searxng")}
                                        style={{
                                            padding: "0.85rem 1rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: searchProvider === "searxng" ? "2px solid var(--accent-terracotta)" : "1px solid var(--border-subtle)",
                                            backgroundColor: searchProvider === "searxng" ? "rgba(200, 91, 56, 0.06)" : "var(--bg-card)",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                                            <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>SearXNG</span>
                                            <span
                                                style={{
                                                    fontSize: "0.68rem",
                                                    padding: "0.15rem 0.45rem",
                                                    borderRadius: "4px",
                                                    backgroundColor: "var(--bg-tertiary)",
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                Self-Hosted
                                            </span>
                                        </div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>Self-hosted metasearch instance aggregating 70+ search engines.</div>
                                    </div>
                                </div>
                            </div>

                            {/* SearXNG URL input (shown if searxng is selected or as secondary config) */}
                            <div>
                                <label
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: "0.82rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        marginBottom: "0.35rem",
                                    }}
                                >
                                    <span>SearXNG Search Endpoint</span>
                                    {searchProvider !== "searxng" && (
                                        <span
                                            style={{
                                                fontSize: "0.7rem",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            (Optional unless SearXNG is active)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={searxngUrl}
                                    onChange={(e) => setSearxngUrl(e.target.value)}
                                    placeholder="http://localhost:8080"
                                    style={{
                                        width: "100%",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: "var(--bg-card)",
                                        fontSize: "0.88rem",
                                        color: "var(--text-primary)",
                                        outline: "none",
                                    }}
                                />
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.35rem",
                                    }}
                                >
                                    URL of your local or remote SearXNG instance (e.g. <code>http://localhost:8080</code>).
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: STORAGE / MEMORY */}
                    {activeTab === "storage" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.25rem",
                            }}
                        >
                            {/* Brain Persistent Memory Card */}
                            <div
                                style={{
                                    padding: "1.25rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.85rem",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.6rem",
                                        }}
                                    >
                                        <Brain size={20} color="var(--accent-terracotta)" />
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: "0.95rem",
                                                    fontWeight: 600,
                                                    color: "var(--text-primary)",
                                                }}
                                            >
                                                Brain (Persistent User Memory)
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.78rem",
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                Stored in <code>workspace/BRAIN.md</code> &middot; Auto-consolidated every 5 messages
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            position: "relative",
                                        }}
                                    >
                                        <input type="checkbox" checked={brainEnabled} onChange={(e) => setBrainEnabled(e.target.checked)} style={{ display: "none" }} />
                                        <div
                                            style={{
                                                width: "38px",
                                                height: "20px",
                                                backgroundColor: brainEnabled ? "var(--accent-terracotta)" : "var(--border-strong)",
                                                borderRadius: "10px",
                                                position: "relative",
                                                transition: "background-color 0.2s ease",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: "16px",
                                                    height: "16px",
                                                    backgroundColor: "#FFFFFF",
                                                    borderRadius: "50%",
                                                    position: "absolute",
                                                    top: "2px",
                                                    left: brainEnabled ? "20px" : "2px",
                                                    transition: "left 0.2s ease",
                                                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                                                }}
                                            />
                                        </div>
                                    </label>
                                </div>

                                <div
                                    style={{
                                        fontSize: "0.84rem",
                                        color: "var(--text-secondary)",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    Marnie learns and remembers your preferences, project context, and instructions over time. After every 5 conversation messages, a background LLM call automatically synthesizes your
                                    current memory with recent interactions. This context is injected into all chat and agentic workflows.
                                </div>

                                {brainLastUpdated && (
                                    <div
                                        style={{
                                            fontSize: "0.76rem",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        Last consolidated: {new Date(brainLastUpdated).toLocaleString()}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.6rem",
                                        marginTop: "0.25rem",
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={handleConsolidateBrain}
                                        disabled={brainConsolidating || !brainEnabled}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                            padding: "0.45rem 0.85rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: "var(--bg-card)",
                                            border: "1px solid var(--border-strong)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.82rem",
                                            fontWeight: 500,
                                            cursor: brainConsolidating || !brainEnabled ? "not-allowed" : "pointer",
                                            opacity: brainConsolidating || !brainEnabled ? 0.6 : 1,
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <RefreshCw
                                            size={13}
                                            style={{
                                                animation: brainConsolidating ? "spin 1s linear infinite" : "none",
                                            }}
                                        />
                                        <span>{brainConsolidating ? "Consolidating..." : "Consolidate Memory Now"}</span>
                                    </button>
                                </div>

                                {brainConsolidateMsg && (
                                    <div
                                        style={{
                                            padding: "0.6rem 0.85rem",
                                            borderRadius: "4px",
                                            fontSize: "0.8rem",
                                            backgroundColor: brainConsolidateMsg.ok ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                            border: `1px solid ${brainConsolidateMsg.ok ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                                            color: brainConsolidateMsg.ok ? "#16a34a" : "#dc2626",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                        }}
                                    >
                                        {brainConsolidateMsg.ok ? <Check size={14} /> : <AlertCircle size={14} />}
                                        <span>{brainConsolidateMsg.message}</span>
                                    </div>
                                )}

                                {/* Expandable BRAIN.md Editor */}
                                {brainEditing && (
                                    <div
                                        style={{
                                            marginTop: "0.5rem",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <textarea
                                            value={brainContent}
                                            onChange={(e) => setBrainContent(e.target.value)}
                                            rows={10}
                                            placeholder="Persistent memory Markdown..."
                                            style={{
                                                width: "100%",
                                                fontFamily: "var(--font-mono)",
                                                fontSize: "0.82rem",
                                                lineHeight: 1.5,
                                                padding: "0.75rem",
                                                borderRadius: "4px",
                                                border: "1px solid var(--border-strong)",
                                                backgroundColor: "var(--bg-card)",
                                                color: "var(--text-primary)",
                                                resize: "vertical",
                                            }}
                                        />
                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                            <button
                                                type="button"
                                                onClick={handleSaveBrainDirect}
                                                disabled={savingBrain}
                                                style={{
                                                    padding: "0.45rem 1rem",
                                                    borderRadius: "var(--radius-sm)",
                                                    backgroundColor: "var(--accent-terracotta)",
                                                    color: "#FFFFFF",
                                                    border: "none",
                                                    fontSize: "0.82rem",
                                                    fontWeight: 500,
                                                    cursor: savingBrain ? "not-allowed" : "pointer",
                                                }}
                                            >
                                                {savingBrain ? "Saving..." : "Save BRAIN.md"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    style={{
                        padding: "1rem 1.5rem",
                        borderTop: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {autoSaveStatus === "saving" && (
                            <span
                                style={{
                                    fontSize: "0.82rem",
                                    color: "var(--accent-terracotta)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    fontWeight: 500,
                                }}
                            >
                                <RefreshCw size={13} className="typing-dot" /> Auto-saving changes in real time...
                            </span>
                        )}
                        {(autoSaveStatus === "saved" || saveSuccess) && (
                            <span
                                style={{
                                    fontSize: "0.82rem",
                                    color: "#16A34A",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    fontWeight: 500,
                                }}
                            >
                                <Check size={14} /> Changes saved in real time
                            </span>
                        )}
                        {autoSaveStatus === "idle" && !saveSuccess && (
                            <span
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--text-muted)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                }}
                            >
                                <Check size={13} color="#16A34A" /> Real-time auto-save active
                            </span>
                        )}
                        {autoSaveStatus === "error" && (
                            <span
                                style={{
                                    fontSize: "0.82rem",
                                    color: "#DC2626",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    fontWeight: 500,
                                }}
                            >
                                <AlertCircle size={14} /> Auto-save error
                            </span>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "0.65rem" }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: "0.55rem 1rem",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border-strong)",
                                backgroundColor: "var(--bg-card)",
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                                padding: "0.55rem 1.25rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--accent-terracotta)",
                                color: "#FFFFFF",
                                fontSize: "0.85rem",
                                fontWeight: 500,
                                boxShadow: "var(--shadow-sm)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-terracotta-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent-terracotta)")}
                        >
                            {loading ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
