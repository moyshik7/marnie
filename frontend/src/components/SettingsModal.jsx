import React, { useState, useEffect } from "react";
import {
    X,
    Check,
    AlertCircle,
    Server,
    Bell,
    Cpu,
    Database,
    Sparkles,
    Globe,
    Bot,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import {
    getSettings,
    updateSettings,
    testOllamaConnection,
    testDiscordAlert,
    getCustomApiBase,
    setCustomApiBase,
    listModels,
} from "../services/api";

export default function SettingsModal({
    isOpen,
    onClose,
    onSettingsUpdated,
    currentModel,
    onModelChanged,
}) {
    const [activeTab, setActiveTab] = useState("ollama");
    const [loading, setLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Form states
    const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
    const [defaultModel, setDefaultModel] = useState("llama3.2");
    const [availableModels, setAvailableModels] = useState([]);
    const [discordWebhook, setDiscordWebhook] = useState("");
    const [searxngUrl, setSearxngUrl] = useState("http://localhost:8080");
    const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
    const [agentModeEnabled, setAgentModeEnabled] = useState(true);
    const [systemPrompt, setSystemPrompt] = useState("");
    const [apiBaseUrl, setApiBaseUrl] = useState("");

    // Test states
    const [ollamaTesting, setOllamaTesting] = useState(false);
    const [ollamaStatus, setOllamaStatus] = useState(null);
    const [discordTesting, setDiscordTesting] = useState(false);
    const [discordStatus, setDiscordStatus] = useState(null);

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
            if (s.ollama_base_url) setOllamaUrl(s.ollama_base_url);
            if (s.default_model) setDefaultModel(s.default_model);
            if (s.discord_webhook_url) setDiscordWebhook(s.discord_webhook_url);
            if (s.searxng_url) setSearxngUrl(s.searxng_url);
            if (s.deep_research_enabled)
                setDeepResearchEnabled(s.deep_research_enabled === "true");
            if (s.agent_mode_enabled)
                setAgentModeEnabled(s.agent_mode_enabled === "true");
            if (s.system_prompt) setSystemPrompt(s.system_prompt);

            // fetch models
            const models = await listModels();
            if (models.length) setAvailableModels(models);
        } catch (err) {
            console.warn("Failed to fetch settings:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTestOllama = async () => {
        setOllamaTesting(true);
        setOllamaStatus(null);
        try {
            const res = await testOllamaConnection(ollamaUrl);
            setOllamaStatus({
                ok: true,
                message:
                    res.message ||
                    `Connected! Found ${res.models?.length || 0} models.`,
            });
            if (res.models && res.models.length > 0) {
                setAvailableModels(res.models);
                if (!res.models.includes(defaultModel)) {
                    setDefaultModel(res.models[0]);
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
            await updateSettings({
                ollama_base_url: ollamaUrl,
                default_model: defaultModel,
                discord_webhook_url: discordWebhook,
                searxng_url: searxngUrl,
                deep_research_enabled: String(deepResearchEnabled),
                agent_mode_enabled: String(agentModeEnabled),
                system_prompt: systemPrompt,
            });

            // Save custom API base if changed
            setCustomApiBase(apiBaseUrl);

            if (onModelChanged && defaultModel) {
                onModelChanged(defaultModel);
            }

            if (onSettingsUpdated) {
                onSettingsUpdated({
                    ollama_base_url: ollamaUrl,
                    default_model: defaultModel,
                    discord_webhook_url: discordWebhook,
                    searxng_url: searxngUrl,
                    deep_research_enabled: deepResearchEnabled,
                    agent_mode_enabled: agentModeEnabled,
                });
            }

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
                            Workspace Settings & Integrations
                        </h2>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                marginTop: "0.15rem",
                            }}
                        >
                            Configure Ollama endpoints, Discord alerts, tools,
                            and future agent extensions.
                        </p>
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
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.color =
                                "var(--text-primary)")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--text-muted)")
                        }
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
                        { id: "ollama", label: "AI", icon: Cpu },
                        { id: "discord", label: "Discord Webhook", icon: Bell },
                        {
                            id: "future",
                            label: "Research & Agents (Future)",
                            icon: Sparkles,
                        },
                        {
                            id: "storage",
                            label: "Memory & SQLite",
                            icon: Database,
                        },
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
                                    color: isActive
                                        ? "var(--accent-terracotta)"
                                        : "var(--text-secondary)",
                                    borderBottom: isActive
                                        ? "2px solid var(--accent-terracotta)"
                                        : "2px solid transparent",
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
                    {/* TAB 1: OLLAMA */}
                    {activeTab === "ollama" && (
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
                                    Ollama Base Route URL
                                </label>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <input
                                        type="text"
                                        value={ollamaUrl}
                                        onChange={(e) =>
                                            setOllamaUrl(e.target.value)
                                        }
                                        placeholder="http://localhost:11434"
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
                                        }}
                                    >
                                        <RefreshCw
                                            size={14}
                                            className={
                                                ollamaTesting
                                                    ? "typing-dot"
                                                    : ""
                                            }
                                        />
                                        <span>
                                            {ollamaTesting
                                                ? "Testing..."
                                                : "Test Connection"}
                                        </span>
                                    </button>
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.35rem",
                                    }}
                                >
                                    Base URL for the locally running Ollama
                                    instance or remote server.
                                </div>

                                {ollamaStatus && (
                                    <div
                                        style={{
                                            marginTop: "0.65rem",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: ollamaStatus.ok
                                                ? "rgba(74, 222, 128, 0.12)"
                                                : "rgba(239, 68, 68, 0.12)",
                                            color: ollamaStatus.ok
                                                ? "#15803D"
                                                : "#DC2626",
                                            fontSize: "0.8rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                        }}
                                    >
                                        {ollamaStatus.ok ? (
                                            <Check size={14} />
                                        ) : (
                                            <AlertCircle size={14} />
                                        )}
                                        <span>{ollamaStatus.message}</span>
                                    </div>
                                )}
                            </div>

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
                                    Default Model
                                </label>
                                {availableModels.length > 0 ? (
                                    <select
                                        value={defaultModel}
                                        onChange={(e) =>
                                            setDefaultModel(e.target.value)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "0.6rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
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
                                        onChange={(e) =>
                                            setDefaultModel(e.target.value)
                                        }
                                        placeholder="llama3.2"
                                        style={{
                                            width: "100%",
                                            padding: "0.6rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            fontSize: "0.88rem",
                                            outline: "none",
                                        }}
                                    />
                                )}
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.35rem",
                                    }}
                                >
                                    Model invoked for chat reasoning and tool
                                    selection.
                                </div>
                            </div>

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
                                    Workspace System Prompt
                                </label>
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) =>
                                        setSystemPrompt(e.target.value)
                                    }
                                    rows={4}
                                    style={{
                                        width: "100%",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: "var(--bg-card)",
                                        fontSize: "0.85rem",
                                        outline: "none",
                                        resize: "vertical",
                                        lineHeight: 1.5,
                                    }}
                                    placeholder="System instructions for the AI workspace assistant..."
                                />
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
                                        onChange={(e) =>
                                            setDiscordWebhook(e.target.value)
                                        }
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
                                        disabled={
                                            discordTesting ||
                                            !discordWebhook.trim()
                                        }
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
                                            opacity: !discordWebhook.trim()
                                                ? 0.6
                                                : 1,
                                        }}
                                    >
                                        <Bell
                                            size={14}
                                            className={
                                                discordTesting
                                                    ? "typing-dot"
                                                    : ""
                                            }
                                        />
                                        <span>
                                            {discordTesting
                                                ? "Sending..."
                                                : "Test Webhook"}
                                        </span>
                                    </button>
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.35rem",
                                    }}
                                >
                                    Channel webhook for real-time task
                                    notifications, Scheduled Job alerts, and
                                    error reports.
                                </div>

                                {discordStatus && (
                                    <div
                                        style={{
                                            marginTop: "0.65rem",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: discordStatus.ok
                                                ? "rgba(74, 222, 128, 0.12)"
                                                : "rgba(239, 68, 68, 0.12)",
                                            color: discordStatus.ok
                                                ? "#15803D"
                                                : "#DC2626",
                                            fontSize: "0.8rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.4rem",
                                        }}
                                    >
                                        {discordStatus.ok ? (
                                            <Check size={14} />
                                        ) : (
                                            <AlertCircle size={14} />
                                        )}
                                        <span>{discordStatus.message}</span>
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    padding: "1rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border-subtle)",
                                    fontSize: "0.82rem",
                                    color: "var(--text-secondary)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.5rem",
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                    }}
                                >
                                    How Discord alerts work:
                                </div>
                                <div>
                                    • Scheduled Jobs configured with{" "}
                                    <code>discord</code> action type will
                                    automatically dispatch embeds to this
                                    channel.
                                </div>
                                <div>
                                    • The <code>/api/alerts/notify</code>{" "}
                                    endpoint sends styled embeds with color
                                    levels: Info (Blue), Success (Green),
                                    Warning (Yellow), Error (Red).
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: FUTURE FEATURES */}
                    {activeTab === "future" && (
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
                                }}
                            >
                                <strong>Future Roadmap & Extensibility:</strong>{" "}
                                These toggles and endpoints prepare the
                                workspace for SearXNG private search, recursive
                                Deep Research pipelines, and Multi-Agent
                                Orchestration.
                            </div>

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
                                    <span
                                        style={{
                                            fontSize: "0.7rem",
                                            padding: "0.15rem 0.4rem",
                                            borderRadius: "4px",
                                            backgroundColor:
                                                "var(--bg-tertiary)",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        Future Todo
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={searxngUrl}
                                    onChange={(e) =>
                                        setSearxngUrl(e.target.value)
                                    }
                                    placeholder="http://localhost:8080"
                                    style={{
                                        width: "100%",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: "var(--bg-card)",
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
                                    Self-hosted SearXNG metasearch instance for
                                    private, untracked web exploration.
                                </div>
                            </div>

                            {/* Deep Research Toggle */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.85rem 1rem",
                                    backgroundColor: "var(--bg-card)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "0.88rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Deep Research Mode
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "0.68rem",
                                                padding: "0.1rem 0.4rem",
                                                borderRadius: "4px",
                                                backgroundColor:
                                                    "rgba(217, 119, 6, 0.15)",
                                                color: "var(--accent-gold)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            ROADMAP
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.76rem",
                                            color: "var(--text-muted)",
                                            marginTop: "0.2rem",
                                        }}
                                    >
                                        Multi-step query expansion, web
                                        crawling, iterative synthesis, and
                                        citation generation.
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={deepResearchEnabled}
                                    onChange={(e) =>
                                        setDeepResearchEnabled(e.target.checked)
                                    }
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: "var(--accent-terracotta)",
                                    }}
                                />
                            </div>

                            {/* Agent Mode Toggle */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.85rem 1rem",
                                    backgroundColor: "var(--bg-card)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "0.88rem",
                                                fontWeight: 600,
                                            }}
                                        >
                                            Agent Mode (Sub-Agent Spawner)
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "0.68rem",
                                                padding: "0.1rem 0.4rem",
                                                borderRadius: "4px",
                                                backgroundColor:
                                                    "rgba(200, 91, 56, 0.15)",
                                                color: "var(--accent-terracotta)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            ROADMAP
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.76rem",
                                            color: "var(--text-muted)",
                                            marginTop: "0.2rem",
                                        }}
                                    >
                                        Empower the model to break tasks into
                                        sub-goals and invoke concurrent
                                        specialized sub-agents.
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={agentModeEnabled}
                                    onChange={(e) =>
                                        setAgentModeEnabled(e.target.checked)
                                    }
                                    style={{
                                        width: "18px",
                                        height: "18px",
                                        cursor: "pointer",
                                        accentColor: "var(--accent-terracotta)",
                                    }}
                                />
                            </div>

                            {/* Custom API Base */}
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
                                    Custom Backend API Base URL
                                </label>
                                <input
                                    type="text"
                                    value={apiBaseUrl}
                                    onChange={(e) =>
                                        setApiBaseUrl(e.target.value)
                                    }
                                    placeholder="/api (Default: auto-proxy)"
                                    style={{
                                        width: "100%",
                                        padding: "0.6rem 0.75rem",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: "var(--bg-card)",
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
                                    Leave empty to use default local Express
                                    routes, or specify remote host (e.g.{" "}
                                    <code>http://192.168.1.50:3000/api</code>).
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: STORAGE */}
                    {activeTab === "storage" && (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.25rem",
                            }}
                        >
                            <div
                                style={{
                                    padding: "1.1rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "0.65rem",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <Database
                                        size={18}
                                        color="var(--accent-terracotta)"
                                    />
                                    <div
                                        style={{
                                            fontSize: "0.95rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        SQLite Persistent Database
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: "0.84rem",
                                        color: "var(--text-secondary)",
                                        lineHeight: 1.6,
                                    }}
                                >
                                    All conversations, user messages, assistant
                                    tool calls, background tasks, and scheduled
                                    jobs are written to{" "}
                                    <code>./data/marnie.db</code> using{" "}
                                    <code>better-sqlite3</code> with WAL mode
                                    enabled.
                                </div>
                                <div
                                    style={{
                                        padding: "0.5rem 0.75rem",
                                        backgroundColor: "var(--bg-card)",
                                        borderRadius: "4px",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.78rem",
                                    }}
                                >
                                    Schema Tables: <code>conversations</code>,{" "}
                                    <code>messages</code>, <code>tasks</code>,{" "}
                                    <code>cron_jobs</code>,{" "}
                                    <code>settings</code>
                                </div>
                            </div>

                            <div
                                style={{
                                    fontSize: "0.8rem",
                                    color: "var(--text-muted)",
                                }}
                            >
                                Conversations are never lost when restarting the
                                server. You can resume any chat history at any
                                time from the left sidebar.
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
                    <div>
                        {saveSuccess && (
                            <span
                                style={{
                                    fontSize: "0.82rem",
                                    color: "#16A34A",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    fontWeight: 500,
                                }}
                            >
                                <Check size={14} /> Saved successfully!
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
                            onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "var(--accent-terracotta-hover)")
                            }
                            onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "var(--accent-terracotta)")
                            }
                        >
                            {loading ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
