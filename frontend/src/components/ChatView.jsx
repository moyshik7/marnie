import React, { useState, useEffect, useRef } from "react";
import {
    Send,
    Square,
    Copy,
    Check,
    Globe,
    Brain,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Search,
    Terminal,
    Code,
    CheckSquare,
    Wrench,
    Flame,
    Sun,
    Moon,
    Mic,
    MicOff,
    AlertTriangle,
    X,
    HelpCircle,
    BotMessageSquare,
    ArrowUp,
    ExternalLink,
    FileCode,
    FileText,
    Eye,
    Folder,
    Slash,
    GitFork,
    Type,
    Minimize2,
    Palette,
    Sparkles,
    MessageSquarePlus,
} from "lucide-react";
import katex from "katex";
import mermaid from "mermaid";
import {
    sendMessageStream,
    getSettings,
    getWorkspaceFile,
    getWorkspaceRawUrl,
    listWorkspaceFiles,
    forkConversation,
    compactConversation,
    renameConversation,
    createConversation,
} from "../services/api";
import ThemeToggle from "./ThemeToggle";
import ArtifactPanel from "./ArtifactPanel";

// Initialize mermaid once
try {
    mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "var(--font-sans)",
    });
} catch {}

function MermaidBlock({ chart }) {
    const [svg, setSvg] = useState("");
    const [error, setError] = useState(null);
    const [viewRaw, setViewRaw] = useState(false);
    const [copied, setCopied] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const renderChart = async () => {
            try {
                const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
                const { svg: renderedSvg } = await mermaid.render(uniqueId, chart.trim());
                if (isMounted) {
                    setSvg(renderedSvg);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || "Failed to render Mermaid diagram");
                }
            }
        };
        renderChart();
        return () => {
            isMounted = false;
        };
    }, [chart]);

    const handleCopy = () => {
        navigator.clipboard.writeText(chart);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (error) {
        return (
            <div
                style={{
                    margin: "0.85rem 0",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    fontSize: "0.82rem",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontWeight: 600, color: "#ef4444" }}>Mermaid Render Notice</span>
                    <button
                        onClick={handleCopy}
                        style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                        }}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy Code"}
                    </button>
                </div>
                <pre style={{ margin: 0, overflowX: "auto" }}>
                    <code>{chart}</code>
                </pre>
            </div>
        );
    }

    return (
        <div
            style={{
                margin: "0.85rem 0",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.4rem 0.75rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-secondary)",
                    fontSize: "0.74rem",
                    color: "var(--text-muted)",
                }}
            >
                <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Diagram (Mermaid)
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                        onClick={() => setViewRaw(!viewRaw)}
                        style={{
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                        }}
                    >
                        {viewRaw ? "Preview" : "Code"}
                    </button>
                    <button
                        onClick={handleCopy}
                        style={{
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontSize: "0.72rem",
                        }}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            </div>

            {viewRaw ? (
                <pre style={{ margin: 0, padding: "0.85rem", overflowX: "auto" }}>
                    <code>{chart}</code>
                </pre>
            ) : (
                <div
                    ref={containerRef}
                    dangerouslySetInnerHTML={{ __html: svg }}
                    style={{
                        padding: "1rem",
                        display: "flex",
                        justifyContent: "center",
                        overflowX: "auto",
                        backgroundColor: "var(--bg-card)",
                    }}
                />
            )}
        </div>
    );
}

function parseMessageContent(rawContent) {
    if (!rawContent || typeof rawContent !== "string")
        return { thinking: "", answer: "", toolOutputs: [], artifacts: [] };

    let content = rawContent;
    let thinking = "";

    const thinkMatch = content.match(/^<think>([\s\S]*?)<\/think>\s*/i);
    if (thinkMatch) {
        thinking = thinkMatch[1].trim();
        content = content.slice(thinkMatch[0].length);
    }

    // Parse file artifact markers
    const artifacts = [];
    const artifactRegex = /<!-- file-artifact:([\s\S]*?) -->/gi;
    let aMatch;
    while ((aMatch = artifactRegex.exec(content)) !== null) {
        try {
            const parsed = JSON.parse(aMatch[1]);
            if (parsed.path && !artifacts.some((a) => a.path === parsed.path)) {
                artifacts.push(parsed);
            }
        } catch {}
    }
    content = content.replace(/<!-- file-artifact:[\s\S]*? -->/gi, "");

    const toolOutputs = [];
    const toolOutputRegex = /<!-- tool-output:?(\w*) -->([\s\S]*?)<!-- \/tool-output -->/gi;
    let match;
    while ((match = toolOutputRegex.exec(content)) !== null) {
        const tName = match[1] || "tool";
        toolOutputs.push({
            toolName: tName,
            output: match[2].trim(),
        });
    }

    const cleanAnswer = content
        .replace(/<!-- tool-output:?(\w*) -->[\s\S]*?<!-- \/tool-output -->/gi, "")
        .trim();

    return {
        thinking,
        answer: cleanAnswer,
        toolOutputs,
        artifacts,
    };
}

function ArtifactCard({ artifact, onOpenArtifact }) {
    const [copied, setCopied] = useState(false);
    const fileName = artifact.name || artifact.path.split("/").pop() || "file";
    const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
    const isHtml = ext === ".html" || ext === ".htm";
    const isSvg = ext === ".svg";
    const isActionCreated = artifact.action === "created";

    const handleCopy = async (e) => {
        e.stopPropagation();
        try {
            const data = await getWorkspaceFile(artifact.path);
            if (data && data.content !== undefined) {
                navigator.clipboard.writeText(data.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch (err) {
            console.warn("Failed to copy artifact content:", err);
        }
    };

    const handleOpenBrowser = (e) => {
        e.stopPropagation();
        const rawUrl = getWorkspaceRawUrl(artifact.path);
        window.open(rawUrl, "_blank");
    };

    return (
        <div
            onClick={() => onOpenArtifact(artifact.path)}
            title="Click to open in-app editor and preview panel"
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.9rem",
                margin: "0.6rem 0",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                <div
                    style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        backgroundColor: isHtml ? "rgba(234, 88, 12, 0.12)" : "rgba(59, 130, 246, 0.12)",
                        color: isHtml ? "#ea580c" : "#3b82f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    {isHtml || isSvg ? <FileCode size={16} /> : <FileText size={16} />}
                </div>

                <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                            {fileName}
                        </span>
                        <span
                            style={{
                                fontSize: "0.66rem",
                                fontWeight: 500,
                                padding: "0.08rem 0.35rem",
                                borderRadius: "4px",
                                backgroundColor: isActionCreated ? "rgba(22, 163, 74, 0.12)" : "rgba(217, 119, 6, 0.12)",
                                color: isActionCreated ? "#16a34a" : "var(--accent-terracotta)",
                                textTransform: "capitalize",
                            }}
                        >
                            {isActionCreated ? "Created" : "Edited"}
                        </span>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "1px" }}>
                        workspace/{artifact.path} • Click to open preview & editor
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                {/* Copy code button */}
                <button
                    onClick={handleCopy}
                    title="Copy file code to clipboard"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        padding: "0.28rem 0.5rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-secondary)",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                    {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                </button>

                {/* Open directly in browser */}
                <button
                    onClick={handleOpenBrowser}
                    title="Open directly in browser tab"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        padding: "0.28rem 0.5rem",
                        borderRadius: "4px",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-secondary)",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                >
                    <ExternalLink size={12} />
                    <span>Browser</span>
                </button>

                {/* Open preview / edit panel */}
                <button
                    onClick={() => onOpenArtifact(artifact.path)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.28rem 0.6rem",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: "var(--accent-terracotta)",
                        color: "#ffffff",
                        fontSize: "0.74rem",
                        fontWeight: 500,
                        cursor: "pointer",
                    }}
                >
                    <Eye size={12} />
                    <span>Open Panel</span>
                </button>
            </div>
        </div>
    );
}

function CollapsibleToolOutput({ toolName, output, defaultExpanded = false }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!output) return null;

    const isSearch = toolName === "web_search" || toolName === "duckduckgo_search" || toolName === "searxng_search";
    const label = isSearch ? "Web Search Results" : `Tool: ${toolName}`;

    return (
        <div
            className="tool-output-box"
            style={{
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "0.85rem",
                overflow: "hidden",
                transition: "all 0.15s ease",
            }}
        >
            <div
                onClick={() => setIsExpanded((prev) => !prev)}
                title={isExpanded ? "Collapse tool details" : "Expand tool details"}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: isExpanded
                        ? "0.45rem 0.75rem 0.35rem 0.75rem"
                        : "0.45rem 0.75rem",
                    cursor: "pointer",
                    userSelect: "none",
                    fontWeight: 600,
                    fontSize: "0.74rem",
                    letterSpacing: "0.03em",
                    color: "var(--text-muted)",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                    }}
                >
                    <Wrench size={13} style={{ color: "var(--text-secondary)" }} />
                    <span style={{ textTransform: "uppercase" }}>{label}</span>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.72rem",
                    }}
                >
                    <span style={{ opacity: 0.8 }}>
                        {isExpanded ? "Hide raw results" : "Show raw results"}
                    </span>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>
            </div>

            {isExpanded && (
                <div
                    style={{
                        padding: "0.6rem 0.75rem",
                        borderTop: "1px dashed var(--border-subtle)",
                        fontSize: "0.78rem",
                        lineHeight: 1.6,
                        color: "var(--text-secondary)",
                        maxHeight: "360px",
                        overflowY: "auto",
                    }}
                >
                    <div className="markdown-body">
                        {formatMarkdown(output)}
                    </div>
                </div>
            )}
        </div>
    );
}

function ThinkingBox({ thinking, isStreaming = false, defaultExpanded = true }) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    if (!thinking) return null;

    return (
        <div
            className="thinking-box"
            style={{
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "0.85rem",
                overflow: "hidden",
                transition: "all 0.15s ease",
            }}
        >
            <div
                onClick={() => setIsExpanded((prev) => !prev)}
                title={isExpanded ? "Collapse thought process" : "Expand thought process"}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: isExpanded
                        ? "0.5rem 0.75rem 0.4rem 0.75rem"
                        : "0.5rem 0.75rem",
                    cursor: "pointer",
                    userSelect: "none",
                    fontWeight: 600,
                    fontSize: "0.74rem",
                    letterSpacing: "0.04em",
                    color: "var(--text-muted)",
                    transition: "color 0.15s ease, background-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.backgroundColor = "transparent";
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.45rem",
                    }}
                >
                    <Brain size={13} style={{ color: "var(--accent-terracotta)" }} />
                    <span style={{ textTransform: "uppercase" }}>Thought Process</span>
                    {isStreaming && (
                        <span
                            className="typing-dot"
                            style={{
                                display: "inline-block",
                                width: "4px",
                                height: "8px",
                                backgroundColor: "var(--accent-terracotta)",
                                marginLeft: "2px",
                            }}
                        />
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        fontSize: "0.72rem",
                    }}
                >
                    <span style={{ opacity: 0.8 }}>
                        {isExpanded ? "Collapse" : "Expand"}
                    </span>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </div>
            </div>

            {isExpanded && (
                <div
                    style={{
                        padding: "0.4rem 0.75rem 0.75rem 0.75rem",
                        borderTop: "1px dashed var(--border-subtle)",
                        fontSize: "0.78rem",
                        lineHeight: 1.6,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxHeight: "360px",
                        overflowY: "auto",
                    }}
                >
                    {thinking}
                </div>
            )}
        </div>
    );
}

const SLASH_COMMANDS = [
    {
        name: "/elim5",
        label: "/elim5",
        args: "[question]",
        description: "Explain like I'm five years old (simplified explanations)",
        icon: Sparkles,
        color: "#f59e0b",
        execute: "prompt",
    },
    {
        name: "/btw",
        label: "/btw",
        args: "<question>",
        description: "Ask a side question without breaking or altering conversation context",
        icon: MessageSquarePlus,
        color: "#3b82f6",
        execute: "side_question",
    },
    {
        name: "/fork",
        label: "/fork",
        args: "[new-title]",
        description: "Branches the current conversation into a new independent thread",
        icon: GitFork,
        color: "#8b5cf6",
        execute: "action",
    },
    {
        name: "/title",
        label: "/title",
        args: "<new-title>",
        description: "Sets or updates the active window/conversation title",
        icon: Type,
        color: "#10b981",
        execute: "action",
    },
    {
        name: "/compact",
        label: "/compact",
        args: "",
        description: "Summarizes the conversation so far to free up the context window while preserving critical history",
        icon: Minimize2,
        color: "#ec4899",
        execute: "action",
    },
    {
        name: "/output-style",
        label: "/output-style",
        args: "<standard|concise|bullet-points|technical|creative>",
        description: "Customizes how text responses are rendered",
        icon: Palette,
        color: "#6366f1",
        execute: "style_modal",
    },
];

const OUTPUT_STYLES = [
    {
        id: "standard",
        name: "Standard",
        desc: "Default balanced response style with comprehensive explanations",
        system: "",
    },
    {
        id: "concise",
        name: "Concise",
        desc: "Ultra-brief, direct answers without unnecessary filler or preamble",
        system: "Please provide ultra-concise, direct answers. Avoid filler, greetings, or unnecessary preamble.",
    },
    {
        id: "bullet-points",
        name: "Bullet Points",
        desc: "Structured bullet points, key takeaways, and checklists",
        system: "Format responses strictly using structured bullet points, checklists, and key takeaways.",
    },
    {
        id: "technical",
        name: "Technical Deep-Dive",
        desc: "In-depth technical architecture, source code snippets, and trade-offs",
        system: "Adopt a senior software engineering technical tone. Provide in-depth explanations, performance implications, architectural trade-offs, and complete code snippets.",
    },
    {
        id: "creative",
        name: "Creative & Engaging",
        desc: "Engaging, conversational tone with storytelling and vivid analogies",
        system: "Adopt an engaging, vivid, and conversational tone with illustrative analogies and expressive descriptions.",
    },
];

export default function ChatView({
    conversation,
    activeModel,
    availableModels = [],
    onModelChanged,
    theme,
    onToggleTheme,
    onOpenTools,
    onOpenSettings,
    onRefreshConversations,
    isArtifactOpen = false,
    onToggleArtifact,
    activeArtifactPath = "",
    onSelectArtifactPath,
    onSelectConversation,
    onConversationUpdated,
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [streamingThinking, setStreamingThinking] = useState("");
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Artifact state
    const [internalArtifactOpen, setInternalArtifactOpen] = useState(false);
    const [internalArtifactPath, setInternalArtifactPath] = useState("");

    const artifactOpen = onToggleArtifact !== undefined ? isArtifactOpen : internalArtifactOpen;
    const currentArtifactPath = onSelectArtifactPath !== undefined ? activeArtifactPath : internalArtifactPath;

    const handleOpenArtifact = (path) => {
        const targetPath = path || currentArtifactPath || "";
        if (onSelectArtifactPath) onSelectArtifactPath(targetPath);
        else setInternalArtifactPath(targetPath);

        if (onToggleArtifact) onToggleArtifact(true);
        else setInternalArtifactOpen(true);
    };

    const handleCloseArtifact = () => {
        if (onToggleArtifact) onToggleArtifact(false);
        else setInternalArtifactOpen(false);
    };

    // Feature toggles
    const [webSearchActive, setWebSearchActive] = useState(false);
    const [searchProvider, setSearchProvider] = useState("duckduckgo");
    const [agentModeActive, setAgentModeActive] = useState(true);

    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const modelDropdownRef = useRef(null);

    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const [speechModalInfo, setSpeechModalInfo] = useState(null);
    const [copiedSetting, setCopiedSetting] = useState(false);

    // Slash command & Output style state
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
    const [outputStyle, setOutputStyle] = useState(() => {
        return localStorage.getItem("marnie_output_style") || "standard";
    });
    const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
    const [sideQuestionQuery, setSideQuestionQuery] = useState(null); // when running /btw
    const [isCompacting, setIsCompacting] = useState(false);
    const [isForking, setIsForking] = useState(false);

    // Load search provider from settings
    useEffect(() => {
        let isMounted = true;
        getSettings()
            .then((data) => {
                if (isMounted && data?.settings?.search_provider) {
                    setSearchProvider(data.settings.search_provider);
                }
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, []);

    // Close model dropdown on outside click
    useEffect(() => {
        if (!modelDropdownOpen) return;
        const handleClickOutside = (e) => {
            if (
                modelDropdownRef.current &&
                !modelDropdownRef.current.contains(e.target)
            ) {
                setModelDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [modelDropdownOpen]);

    // Clean up Web Speech recognition on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {}
            }
        };
    }, []);

    const toggleSpeechRecognition = () => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSpeechModalInfo({
                type: "unsupported",
                title: "Speech Recognition Not Supported",
                description:
                    "Your browser does not support the Web Speech API. Please use Google Chrome, Microsoft Edge, or Brave Browser (with speech services enabled).",
            });
            return;
        }

        if (isListening) {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {}
            }
            setIsListening(false);
            return;
        }

        try {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {}
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = navigator.language || "en-US";

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                let currentTranscript = "";
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setInput(currentTranscript);
                if (textareaRef.current) {
                    textareaRef.current.focus();
                }
            };

            recognition.onerror = (event) => {
                console.warn("Speech recognition error:", event.error);
                setIsListening(false);
                try {
                    recognition.abort();
                } catch {}

                if (event.error === "no-speech") {
                    // Normal timeout if user was quiet
                    return;
                }

                const isBrave = Boolean(
                    (window.navigator?.brave &&
                        typeof window.navigator.brave.isBrave === "function") ||
                    navigator.userAgent.includes("Brave"),
                );

                if (event.error === "network") {
                    setSpeechModalInfo({
                        type: "network",
                        title: "Speech Recognition Network Error",
                        isBrave,
                        description:
                            "The browser failed to reach the speech-to-text service.",
                    });
                } else if (
                    event.error === "not-allowed" ||
                    event.error === "service-not-allowed"
                ) {
                    setSpeechModalInfo({
                        type: "permission",
                        title: "Microphone Permission Denied",
                        isBrave,
                        description:
                            "Microphone access is blocked. Please allow microphone permissions for this site in your browser address bar settings.",
                    });
                } else if (event.error === "audio-capture") {
                    setSpeechModalInfo({
                        type: "audio-capture",
                        title: "Microphone Not Found",
                        isBrave,
                        description:
                            "No microphone was detected on your system, or it is currently being used by another application.",
                    });
                } else {
                    setSpeechModalInfo({
                        type: "error",
                        title: "Speech Recognition Error",
                        isBrave,
                        description: `Speech recognition encountered an unexpected error: ${event.error}`,
                    });
                }
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setIsListening(false);
            setSpeechModalInfo({
                type: "start-failed",
                title: "Could Not Start Speech Recognition",
                description:
                    err.message ||
                    "An error occurred while launching speech recognition.",
            });
        }
    };

    // Sync conversation messages from backend SQLite
    useEffect(() => {
        if (conversation && conversation.messages) {
            setMessages(conversation.messages);
        } else {
            setMessages([]);
        }
    }, [conversation]);

    // Auto scroll to bottom
    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    const ensureConversation = async () => {
        if (conversation?.id) return conversation;
        const modelToUse =
            activeModel ||
            (availableModels.length > 0 ? availableModels[0] : "llama3.2");
        const newConv = await createConversation("New conversation", modelToUse);
        if (onSelectConversation) {
            onSelectConversation(newConv.id, newConv);
        }
        if (onRefreshConversations) {
            onRefreshConversations();
        }
        return newConv;
    };

    const handleSend = async (customPrompt, extraSystem = "", targetConversation = null) => {
        const textToSend = (
            typeof customPrompt === "string" ? customPrompt : input
        ).trim();
        if (!textToSend || isStreaming) return;

        let activeConv = targetConversation || conversation;
        if (!activeConv?.id) {
            try {
                activeConv = await ensureConversation();
            } catch (err) {
                console.error("Failed to initialize conversation:", err);
                return;
            }
        }
        if (!activeConv?.id) return;

        // Check if message starts with a slash command (slash commands can only be used at the beginning)
        if (textToSend.startsWith("/")) {
            const spaceIdx = textToSend.indexOf(" ");
            const cmdName = (spaceIdx !== -1 ? textToSend.slice(0, spaceIdx) : textToSend).toLowerCase();
            const cmdArg = (spaceIdx !== -1 ? textToSend.slice(spaceIdx + 1) : "").trim();

            if (cmdName === "/elim5") {
                const elim5Instruction = "Explain like I am five years old, make things easier to understand, avoid jargon, use simple everyday analogies, and break down complex concepts into bite-sized, playful explanations.";
                const question = cmdArg;
                if (!question) {
                    setInput("/elim5 ");
                    return;
                }
                setInput("");
                await handleSend(question, elim5Instruction, activeConv);
                return;
            }

            if (cmdName === "/btw") {
                if (!cmdArg) {
                    setInput("/btw ");
                    return;
                }
                setInput("");
                await handleSideQuestion(cmdArg, activeConv);
                return;
            }

            if (cmdName === "/fork") {
                setInput("");
                await handleForkConversation(cmdArg, activeConv);
                return;
            }

            if (cmdName === "/title") {
                if (!cmdArg) {
                    setInput("/title ");
                    return;
                }
                setInput("");
                await handleSetTitle(cmdArg, activeConv);
                return;
            }

            if (cmdName === "/compact") {
                setInput("");
                await handleCompactConversation(activeConv);
                return;
            }

            if (cmdName === "/output-style") {
                setInput("");
                if (cmdArg) {
                    const matchedStyle = OUTPUT_STYLES.find(
                        (s) => s.id === cmdArg.toLowerCase() || s.name.toLowerCase() === cmdArg.toLowerCase()
                    );
                    if (matchedStyle) {
                        setOutputStyle(matchedStyle.id);
                        localStorage.setItem("marnie_output_style", matchedStyle.id);
                        setMessages((prev) => [
                            ...prev,
                            {
                                id: `style-update-${Date.now()}`,
                                role: "assistant",
                                content: `**Output Style Updated:** Response style set to **${matchedStyle.name}**.\n\n*${matchedStyle.desc}*`,
                                created_at: Math.floor(Date.now() / 1000),
                            },
                        ]);
                        return;
                    }
                }
                setIsStyleModalOpen(true);
                return;
            }
        }

        // Optimistically add user message
        const userMsg = {
            id: `temp-user-${Date.now()}`,
            role: "user",
            content: textToSend,
            created_at: Math.floor(Date.now() / 1000),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsStreaming(true);
        setStreamingContent("");
        setStreamingThinking("");

        // Prepare system instructions incorporating mode flags, active output-style, and custom instructions
        let augmentedSystem = "";
        if (webSearchActive) {
            const providerLabel = searchProvider === "searxng" ? "SearXNG" : "DuckDuckGo";
            augmentedSystem +=
                `\n[Mode: ${providerLabel} Web Search enabled for verified web answers. Keep search terms short and concise (strictly 2 to 5 words). After running the search, you MUST use the search results to formulate a complete and detailed answer to the user's question.]`;
        }
        if (agentModeActive) {
            augmentedSystem +=
                "\n[Mode: Agent Mode enabled - identify goals, break down sub-tasks, execute tools, and formulate complete answers. For web searches, keep queries short (2 to 5 words), and always synthesize search results to answer the user.]";
        }

        // Apply selected output-style if set
        const activeStyleObj = OUTPUT_STYLES.find((s) => s.id === outputStyle);
        if (activeStyleObj && activeStyleObj.system) {
            augmentedSystem += `\n[Output Style Instruction: ${activeStyleObj.system}]`;
        }

        if (extraSystem) {
            augmentedSystem += `\n[User Directive: ${extraSystem}]`;
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            await sendMessageStream({
                conversationId: activeConv.id,
                message: textToSend,
                model: activeModel,
                system: augmentedSystem || undefined,
                signal: abortController.signal,
                onChunk: (_token, fullText, _thinkingToken, fullThinking) => {
                    setStreamingContent(fullText);
                    if (fullThinking) setStreamingThinking(fullThinking);
                },
                onDone: (finalContent, finalThinking) => {
                    setIsStreaming(false);
                    setStreamingContent("");
                    setStreamingThinking("");
                    const combined = finalThinking
                        ? `<think>\n${finalThinking.trim()}\n</think>\n\n${finalContent.trim()}`
                        : finalContent;
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `msg-asst-${Date.now()}`,
                            role: "assistant",
                            content: combined,
                            created_at: Math.floor(Date.now() / 1000),
                        },
                    ]);
                    if (onRefreshConversations) onRefreshConversations();

                    // Auto-open created/edited file in artifact panel
                    const { artifacts } = parseMessageContent(combined);
                    if (artifacts && artifacts.length > 0) {
                        handleOpenArtifact(artifacts[artifacts.length - 1].path);
                    }
                },
            });
        } catch (err) {
            if (err.name !== "AbortError") {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `err-${Date.now()}`,
                        role: "assistant",
                        content: `⚠️ Provider Error: ${err.message}`,
                        created_at: Math.floor(Date.now() / 1000),
                    },
                ]);
            }
        } finally {
            setIsStreaming(false);
            setStreamingContent("");
            setStreamingThinking("");
            abortControllerRef.current = null;
        }
    };

    // Slash command: /btw Ask a side question without altering conversation history
    const handleSideQuestion = async (question, targetConv = null) => {
        let activeConv = targetConv || conversation;
        if (!activeConv?.id) {
            try {
                activeConv = await ensureConversation();
            } catch (err) {
                console.error("Failed to initialize conversation for /btw:", err);
                return;
            }
        }
        if (!activeConv?.id || !question.trim()) return;

        const sideId = `side-${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            {
                id: `user-${sideId}`,
                role: "user",
                content: `[Side Question /btw]: ${question}`,
                created_at: Math.floor(Date.now() / 1000),
            },
        ]);

        setIsStreaming(true);
        setStreamingContent("");
        setStreamingThinking("");

        // Build brief side prompt referencing conversation context without storing it permanently in DB
        const recentContext = messages.slice(-6).map(m => `${m.role.toUpperCase()}: ${(m.content || '').slice(0, 300)}`).join("\n\n");
        const sideSystemPrompt = `You are answering a quick side-question ("/btw") for the user. Here is the background conversation context for reference only:\n\n${recentContext}\n\nProvide a direct, helpful, and concise answer to the side question without altering previous tasks. ZERO EMOJIS POLICY: Absolutely DO NOT use any emojis.`;

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            await sendMessageStream({
                conversationId: activeConv.id,
                message: `[Side Question /btw]: ${question}`,
                model: activeModel,
                system: sideSystemPrompt,
                signal: abortController.signal,
                onChunk: (_token, fullText, _thinkingToken, fullThinking) => {
                    setStreamingContent(fullText);
                    if (fullThinking) setStreamingThinking(fullThinking);
                },
                onDone: (finalContent, finalThinking) => {
                    setIsStreaming(false);
                    setStreamingContent("");
                    setStreamingThinking("");
                    const combined = finalThinking
                        ? `<think>\n${finalThinking.trim()}\n</think>\n\n${finalContent.trim()}`
                        : finalContent;
                    setMessages((prev) => [
                        ...prev,
                        {
                            id: `asst-${sideId}`,
                            role: "assistant",
                            content: `**[Side Note /btw Response]**\n\n${combined}`,
                            created_at: Math.floor(Date.now() / 1000),
                        },
                    ]);
                },
            });
        } catch (err) {
            if (err.name !== "AbortError") {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `err-${sideId}`,
                        role: "assistant",
                        content: `Error executing /btw: ${err.message}`,
                        created_at: Math.floor(Date.now() / 1000),
                    },
                ]);
            }
        } finally {
            setIsStreaming(false);
            setStreamingContent("");
            setStreamingThinking("");
            abortControllerRef.current = null;
        }
    };

    // Slash command: /fork Branches conversation into a new thread
    const handleForkConversation = async (customTitle, targetConv = null) => {
        let activeConv = targetConv || conversation;
        if (!activeConv?.id) {
            try {
                activeConv = await ensureConversation();
            } catch (err) {
                console.error("Failed to initialize conversation for /fork:", err);
                return;
            }
        }
        if (!activeConv?.id || isForking) return;
        setIsForking(true);
        try {
            const forkTitle = customTitle || `Fork of ${activeConv.title || 'Conversation'}`;
            const newConv = await forkConversation(activeConv.id, { title: forkTitle });
            if (newConv && newConv.id) {
                if (onRefreshConversations) await onRefreshConversations();
                if (onSelectConversation) {
                    onSelectConversation(newConv.id, newConv);
                }
            }
        } catch (err) {
            alert(`Failed to fork conversation: ${err.message}`);
        } finally {
            setIsForking(false);
        }
    };

    // Slash command: /title Sets or updates window title
    const handleSetTitle = async (newTitle, targetConv = null) => {
        let activeConv = targetConv || conversation;
        if (!activeConv?.id) {
            try {
                activeConv = await ensureConversation();
            } catch (err) {
                console.error("Failed to initialize conversation for /title:", err);
                return;
            }
        }
        if (!activeConv?.id || !newTitle.trim()) return;
        try {
            const updated = await renameConversation(activeConv.id, newTitle.trim());
            if (onConversationUpdated) {
                onConversationUpdated({ ...activeConv, title: newTitle.trim() });
            } else if (onRefreshConversations) {
                onRefreshConversations();
            }
            setMessages((prev) => [
                ...prev,
                {
                    id: `title-update-${Date.now()}`,
                    role: "assistant",
                    content: `**Window Title Updated:** Conversation title changed to **"${newTitle.trim()}"**.`,
                    created_at: Math.floor(Date.now() / 1000),
                },
            ]);
        } catch (err) {
            alert(`Failed to rename conversation: ${err.message}`);
        }
    };

    // Slash command: /compact Summarizes conversation history
    const handleCompactConversation = async (targetConv = null) => {
        let activeConv = targetConv || conversation;
        if (!activeConv?.id) {
            try {
                activeConv = await ensureConversation();
            } catch (err) {
                console.error("Failed to initialize conversation for /compact:", err);
                return;
            }
        }
        if (!activeConv?.id || isCompacting) return;
        setIsCompacting(true);
        try {
            const res = await compactConversation(activeConv.id);
            if (res?.conversation) {
                if (onConversationUpdated) {
                    onConversationUpdated(res.conversation);
                } else if (onRefreshConversations) {
                    onRefreshConversations();
                }
                if (res.conversation.messages) {
                    setMessages(res.conversation.messages);
                }
            }
        } catch (err) {
            alert(`Failed to compact conversation: ${err.message}`);
        } finally {
            setIsCompacting(false);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsStreaming(false);
            if (streamingContent || streamingThinking) {
                const combined = streamingThinking
                    ? `<think>\n${streamingThinking.trim()}\n</think>\n\n${streamingContent.trim()} *(Generation stopped)*`
                    : streamingContent + " *(Generation stopped)*";
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `msg-stopped-${Date.now()}`,
                        role: "assistant",
                        content: combined,
                        created_at: Math.floor(Date.now() / 1000),
                    },
                ]);
            }
            setStreamingContent("");
            setStreamingThinking("");
        }
    };

    // Filter matching slash commands when typing starts with /
    const isSlashMenuOpen = input.startsWith("/") && !input.includes(" ");
    const slashSearchTerm = input.startsWith("/") ? input.slice(1).toLowerCase() : "";
    const filteredSlashCommands = isSlashMenuOpen
        ? SLASH_COMMANDS.filter((cmd) => cmd.name.slice(1).toLowerCase().startsWith(slashSearchTerm))
        : [];

    const handleSelectSlashCommand = (cmd) => {
        if (cmd.execute === "action" && (cmd.name === "/fork" || cmd.name === "/compact")) {
            if (cmd.name === "/fork") {
                setInput("");
                handleForkConversation();
                return;
            }
            if (cmd.name === "/compact") {
                setInput("");
                handleCompactConversation();
                return;
            }
        }
        if (cmd.name === "/output-style") {
            setInput("");
            setIsStyleModalOpen(true);
            return;
        }
        setInput(`${cmd.name} `);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (isSlashMenuOpen && filteredSlashCommands.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSlashSelectedIndex((prev) => (prev + 1) % filteredSlashCommands.length);
                return;
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                setSlashSelectedIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const selectedCmd = filteredSlashCommands[slashSelectedIndex] || filteredSlashCommands[0];
                if (selectedCmd) {
                    handleSelectSlashCommand(selectedCmd);
                    return;
                }
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setInput("");
                return;
            }
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCopy = (text, idx) => {
        const cleaned = typeof text === "string"
            ? text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").replace(/<!-- tool-output:?(\w*) -->[\s\S]*?<!-- \/tool-output -->/gi, "").trim()
            : text;
        navigator.clipboard.writeText(cleaned);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    // Dynamic greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    return (
        <div style={{ flex: 1, display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
            <div
                style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "var(--bg-primary)",
                    position: "relative",
                    overflow: "hidden",
                    minWidth: 0,
                }}
            >
            {/* Top Header Bar */}
            <header
                style={{
                    padding: "0.8rem 1.5rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "var(--bg-primary)",
                    zIndex: 10,
                    gap: "1rem",
                }}
            >
                {/* Chat title */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        minWidth: 0,
                    }}
                >
                    <span
                        style={{
                            fontSize: "0.92rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {conversation?.title || "New Session"}
                    </span>
                </div>

                {/* Right side: Workspace Files, Theme Switcher & Tools */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        flexShrink: 0,
                    }}
                >
                    {/* Workspace Files & Live Preview button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (artifactOpen) {
                                handleCloseArtifact();
                            } else {
                                handleOpenArtifact(currentArtifactPath || "");
                            }
                        }}
                        title="Workspace Files & Live Preview"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor: artifactOpen ? "var(--bg-secondary)" : "transparent",
                            color: artifactOpen ? "var(--accent-terracotta)" : "var(--text-secondary)",
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!artifactOpen) {
                                e.currentTarget.style.color = "var(--text-primary)";
                                e.currentTarget.style.borderColor = "var(--border-strong)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!artifactOpen) {
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.borderColor = "var(--border-subtle)";
                            }
                        }}
                    >
                        <FileCode size={14} />
                        <span>Workspace Files</span>
                    </button>

                    {/* Brain Memory (workspace/BRAIN.md) button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (artifactOpen && currentArtifactPath === "BRAIN.md") {
                                handleCloseArtifact();
                            } else {
                                handleOpenArtifact("BRAIN.md");
                            }
                        }}
                        title="Brain Memory (workspace/BRAIN.md)"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor:
                                artifactOpen && currentArtifactPath === "BRAIN.md"
                                    ? "var(--bg-secondary)"
                                    : "transparent",
                            color:
                                artifactOpen && currentArtifactPath === "BRAIN.md"
                                    ? "var(--accent-terracotta)"
                                    : "var(--text-secondary)",
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!artifactOpen || currentArtifactPath !== "BRAIN.md") {
                                e.currentTarget.style.color = "var(--text-primary)";
                                e.currentTarget.style.borderColor = "var(--border-strong)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!artifactOpen || currentArtifactPath !== "BRAIN.md") {
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.borderColor = "var(--border-subtle)";
                            }
                        }}
                    >
                        <Brain size={14} />
                        <span>Brain Memory</span>
                    </button>

                    {/* AI Notes (workspace/NOTES.md) button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (artifactOpen && currentArtifactPath === "NOTES.md") {
                                handleCloseArtifact();
                            } else {
                                handleOpenArtifact("NOTES.md");
                            }
                        }}
                        title="AI Notes & Tasks (workspace/NOTES.md)"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor:
                                artifactOpen && currentArtifactPath === "NOTES.md"
                                    ? "var(--bg-secondary)"
                                    : "transparent",
                            color:
                                artifactOpen && currentArtifactPath === "NOTES.md"
                                    ? "var(--accent-terracotta)"
                                    : "var(--text-secondary)",
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!artifactOpen || currentArtifactPath !== "NOTES.md") {
                                e.currentTarget.style.color = "var(--text-primary)";
                                e.currentTarget.style.borderColor = "var(--border-strong)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!artifactOpen || currentArtifactPath !== "NOTES.md") {
                                e.currentTarget.style.color = "var(--text-secondary)";
                                e.currentTarget.style.borderColor = "var(--border-subtle)";
                            }
                        }}
                    >
                        <FileText size={14} />
                        <span>Notes</span>
                    </button>

                    {/* Top Light/Dark Theme Switcher Toggle */}
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                </div>
            </header>

            {/* Messages Scroll Area */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent:
                        messages.length === 0 && !isStreaming
                            ? "center"
                            : "flex-start",
                    padding:
                        messages.length === 0 && !isStreaming
                            ? "1.5rem 1rem 8rem 1rem"
                            : "2.75rem 1rem 10rem 1rem",
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "800px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent:
                            messages.length === 0 && !isStreaming
                                ? "center"
                                : "flex-start",
                        paddingTop:
                            messages.length > 0 || isStreaming
                                ? "1.5rem"
                                : "0",
                    }}
                >
                    {/* Welcome Screen when no messages */}
                    {messages.length === 0 && !isStreaming ? (
                        <div
                            style={{
                                padding: "3rem 1rem 1rem 1rem",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                animation: "fadeIn 0.3s ease-out",
                            }}
                        >
                            <h1
                                style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "2.4rem",
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                    letterSpacing: "-0.025em",
                                    marginBottom: "0.6rem",
                                }}
                            >
                                {getGreeting()}
                            </h1>

                            <p
                                style={{
                                    fontSize: "1.05rem",
                                    color: "var(--text-secondary)",
                                    maxWidth: "540px",
                                    lineHeight: 1.6,
                                    marginBottom: "2.5rem",
                                    fontFamily: "monospace",
                                }}
                            >
                                The world is yours
                            </p>

                            {/* Quick Prompt Suggestions */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit, minmax(230px, 1fr))",
                                    gap: "0.85rem",
                                    width: "100%",
                                }}
                            >
                                {[
                                    {
                                        title: "Persistent Tasks",
                                        desc: "Create SQLite tasks with deadlines and priority",
                                        icon: CheckSquare,
                                        prompt: 'Add a new high-priority task titled "Set up SearXNG web search engine".',
                                    },
                                    {
                                        title: "Deep Research",
                                        desc: "Enable deep research mode for comprehensive analysis",
                                        icon: BotMessageSquare,
                                        prompt: "Conduct a deep research on the latest advancements in AI language models.",
                                    },
                                ].map((card, i) => {
                                    const Icon = card.icon;
                                    return (
                                        <div
                                            key={i}
                                            onClick={() =>
                                                handleSend(card.prompt)
                                            }
                                            style={{
                                                padding: "1.1rem",
                                                backgroundColor:
                                                    "var(--bg-card)",
                                                border: "1px solid var(--border-subtle)",
                                                borderRadius:
                                                    "var(--radius-md)",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                                boxShadow: "var(--shadow-sm)",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor =
                                                    "var(--accent-terracotta)";
                                                e.currentTarget.style.transform =
                                                    "translateY(-2px)";
                                                e.currentTarget.style.boxShadow =
                                                    "var(--shadow-md)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor =
                                                    "var(--border-subtle)";
                                                e.currentTarget.style.transform =
                                                    "none";
                                                e.currentTarget.style.boxShadow =
                                                    "var(--shadow-sm)";
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.5rem",
                                                    color: "var(--accent-terracotta)",
                                                    marginBottom: "0.4rem",
                                                }}
                                            >
                                                <Icon size={16} />
                                                <span
                                                    style={{
                                                        fontSize: "0.88rem",
                                                        fontWeight: 600,
                                                        color: "var(--text-primary)",
                                                    }}
                                                >
                                                    {card.title}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: "0.78rem",
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                {card.desc}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        /* Message list */
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "1.5rem",
                            }}
                        >
                            {messages.map((msg, index) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div
                                        key={msg.id || index}
                                        className="animate-fade-in"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: isUser
                                                ? "flex-end"
                                                : "flex-start",
                                            width: "100%",
                                        }}
                                    >
                                        {isUser ? (
                                            /* User message bubble */
                                            <div
                                                style={{
                                                    maxWidth: "82%",
                                                    backgroundColor:
                                                        "var(--bg-card)",
                                                    border: "1px solid var(--border-strong)",
                                                    borderRadius:
                                                        "18px 18px 4px 18px",
                                                    padding: "0.85rem 1.15rem",
                                                    boxShadow:
                                                        "var(--shadow-sm)",
                                                    color: "var(--text-primary)",
                                                    fontSize: "0.96rem",
                                                    lineHeight: 1.55,
                                                    whiteSpace: "pre-wrap",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {msg.content}
                                            </div>
                                        ) : (
                                            /* Assistant message layout (Claude-style) */
                                            <div
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    gap: "0.9rem",
                                                    padding: "0.5rem 0",
                                                }}
                                            >
                                                {/* Avatar */}
                                                <img
                                                    src="/logo.png"
                                                    alt="Marnie"
                                                    style={{
                                                        width: "28px",
                                                        height: "28px",
                                                        borderRadius:
                                                            "var(--radius-sm)",
                                                        objectFit: "contain",
                                                        flexShrink: 0,
                                                        marginTop: "0.2rem",
                                                    }}
                                                />

                                                {/* Content & Actions */}
                                                <div
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {(() => {
                                                        const {
                                                            thinking,
                                                            answer,
                                                            toolOutputs,
                                                            artifacts,
                                                        } = parseMessageContent(
                                                            msg.content,
                                                        );
                                                        return (
                                                            <>
                                                                {thinking && (
                                                                    <ThinkingBox
                                                                        thinking={thinking}
                                                                        defaultExpanded={true}
                                                                    />
                                                                )}
                                                                {toolOutputs && toolOutputs.length > 0 && (
                                                                    <div style={{ marginBottom: "0.5rem" }}>
                                                                        {toolOutputs.map((to, tIdx) => (
                                                                            <CollapsibleToolOutput
                                                                                key={tIdx}
                                                                                toolName={to.toolName}
                                                                                output={to.output}
                                                                                defaultExpanded={false}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {artifacts && artifacts.length > 0 && (
                                                                    <div style={{ marginBottom: "0.6rem" }}>
                                                                        {artifacts.map((art, aIdx) => (
                                                                            <ArtifactCard
                                                                                key={aIdx}
                                                                                artifact={art}
                                                                                onOpenArtifact={handleOpenArtifact}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                <div className="markdown-body">
                                                                    {formatMarkdown(
                                                                        answer ||
                                                                            (!thinking && (!toolOutputs || toolOutputs.length === 0)
                                                                                ? msg.content
                                                                                : ""),
                                                                    )}
                                                                </div>
                                                            </>
                                                        );
                                                    })()}

                                                    {/* Message actions footer */}
                                                    <div
                                                        style={{
                                                            marginTop:
                                                                "0.65rem",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "0.5rem",
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                handleCopy(
                                                                    msg.content,
                                                                    index,
                                                                )
                                                            }
                                                            title="Copy response"
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "0.3rem",
                                                                padding:
                                                                    "0.25rem 0.5rem",
                                                                borderRadius:
                                                                    "4px",
                                                                color: "var(--text-muted)",
                                                                fontSize:
                                                                    "0.74rem",
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.color =
                                                                    "var(--text-primary)")
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.color =
                                                                    "var(--text-muted)")
                                                            }
                                                        >
                                                            {copiedIndex ===
                                                            index ? (
                                                                <Check
                                                                    size={13}
                                                                    color="#16A34A"
                                                                />
                                                            ) : (
                                                                <Copy
                                                                    size={13}
                                                                />
                                                            )}
                                                            <span>
                                                                {copiedIndex ===
                                                                index
                                                                    ? "Copied"
                                                                    : "Copy"}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Currently Streaming Message */}
                            {isStreaming && (
                                <div
                                    style={{
                                        width: "100%",
                                        display: "flex",
                                        gap: "0.9rem",
                                        padding: "0.5rem 0",
                                    }}
                                >
                                    <img
                                        src="/logo.png"
                                        alt="Marnie"
                                        style={{
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "var(--radius-sm)",
                                            objectFit: "contain",
                                            flexShrink: 0,
                                            marginTop: "0.2rem",
                                        }}
                                    />

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {streamingThinking && (
                                            <ThinkingBox
                                                thinking={streamingThinking}
                                                isStreaming={true}
                                                defaultExpanded={true}
                                            />
                                        )}
                                        {(() => {
                                            if (!streamingContent) return null;
                                            const {
                                                answer,
                                                toolOutputs,
                                                artifacts,
                                            } = parseMessageContent(streamingContent);
                                            return (
                                                <>
                                                    {toolOutputs && toolOutputs.length > 0 && (
                                                        <div style={{ marginBottom: "0.5rem" }}>
                                                            {toolOutputs.map((to, tIdx) => (
                                                                <CollapsibleToolOutput
                                                                    key={tIdx}
                                                                    toolName={to.toolName}
                                                                    output={to.output}
                                                                    defaultExpanded={false}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {artifacts && artifacts.length > 0 && (
                                                        <div style={{ marginBottom: "0.6rem" }}>
                                                            {artifacts.map((art, aIdx) => (
                                                                <ArtifactCard
                                                                    key={aIdx}
                                                                    artifact={art}
                                                                    onOpenArtifact={handleOpenArtifact}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="markdown-body">
                                                        {formatMarkdown(
                                                            answer || (!toolOutputs || toolOutputs.length === 0 ? streamingContent : "")
                                                        )}
                                                        <span
                                                            style={{
                                                                display: "inline-block",
                                                                width: "7px",
                                                                height: "14px",
                                                                backgroundColor:
                                                                    "var(--accent-terracotta)",
                                                                marginLeft: "3px",
                                                                verticalAlign: "middle",
                                                            }}
                                                            className="typing-dot"
                                                        />
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Floating Bottom Prompt Box (Claude-style) */}
            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "0.75rem 1.5rem 1.5rem 1.5rem",
                    background:
                        "linear-gradient(to top, var(--bg-primary) 70%, transparent 100%)",
                    display: "flex",
                    justifyContent: "center",
                    zIndex: 20,
                }}
            >
                <div
                    style={{
                        width: "100%",
                        maxWidth: "800px",
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "16px",
                        boxShadow: "var(--shadow-md)",
                        padding: "0.85rem 1.1rem 0.75rem 1.1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.6rem",
                        minHeight: "96px",
                        justifyContent: "space-between",
                        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                        position: "relative",
                    }}
                >
                    {/* Discord-style Slash Command Popup List */}
                    {isSlashMenuOpen && filteredSlashCommands.length > 0 && (
                        <div
                            style={{
                                position: "absolute",
                                bottom: "calc(100% + 10px)",
                                left: 0,
                                right: 0,
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border-strong)",
                                borderRadius: "var(--radius-md)",
                                boxShadow: "var(--shadow-lg)",
                                padding: "0.45rem",
                                zIndex: 120,
                                maxHeight: "310px",
                                overflowY: "auto",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                                animation: "fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "0.35rem 0.65rem 0.25rem 0.65rem",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.05em",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    marginBottom: "0.25rem",
                                }}
                            >
                                <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                    <Slash size={12} color="var(--accent-terracotta)" />
                                    COMMANDS MATCHING &quot;{input}&quot;
                                </span>
                                <span style={{ fontSize: "0.68rem", fontWeight: 400, opacity: 0.8 }}>
                                    ↑ ↓ to navigate • Enter to select • Esc to dismiss
                                </span>
                            </div>

                            {filteredSlashCommands.map((cmd, idx) => {
                                const isSelected = idx === slashSelectedIndex;
                                const Icon = cmd.icon;
                                return (
                                    <div
                                        key={cmd.name}
                                        onClick={() => handleSelectSlashCommand(cmd)}
                                        onMouseEnter={() => setSlashSelectedIndex(idx)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "0.5rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: isSelected ? "var(--bg-card-hover)" : "transparent",
                                            border: isSelected ? "1px solid var(--border-strong)" : "1px solid transparent",
                                            cursor: "pointer",
                                            transition: "background-color 0.1s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                                            <div
                                                style={{
                                                    width: "28px",
                                                    height: "28px",
                                                    borderRadius: "6px",
                                                    backgroundColor: `${cmd.color}18`,
                                                    color: cmd.color,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <Icon size={15} />
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
                                                    <span
                                                        style={{
                                                            fontSize: "0.86rem",
                                                            fontWeight: 600,
                                                            color: isSelected ? "var(--accent-terracotta)" : "var(--text-primary)",
                                                            fontFamily: "var(--font-mono)",
                                                        }}
                                                    >
                                                        {cmd.name}
                                                    </span>
                                                    {cmd.args && (
                                                        <span
                                                            style={{
                                                                fontSize: "0.72rem",
                                                                color: "var(--text-muted)",
                                                                fontFamily: "var(--font-mono)",
                                                            }}
                                                        >
                                                            {cmd.args}
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "0.76rem",
                                                        color: "var(--text-secondary)",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {cmd.description}
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            style={{
                                                fontSize: "0.7rem",
                                                color: isSelected ? "var(--accent-terracotta)" : "var(--text-muted)",
                                                padding: "0.2rem 0.45rem",
                                                borderRadius: "4px",
                                                backgroundColor: isSelected ? "var(--accent-light)" : "transparent",
                                                fontWeight: 500,
                                                flexShrink: 0,
                                                marginLeft: "0.5rem",
                                            }}
                                        >
                                            Tab ⇥
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Active Output Style indicator pill (if not standard) */}
                    {outputStyle !== "standard" && (
                        <div
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "4px",
                                backgroundColor: "rgba(99, 102, 241, 0.12)",
                                border: "1px solid rgba(99, 102, 241, 0.3)",
                                color: "#6366f1",
                                fontSize: "0.72rem",
                                fontWeight: 500,
                                alignSelf: "flex-start",
                                marginBottom: "-0.2rem",
                            }}
                        >
                            <Palette size={12} />
                            <span>
                                Style: {OUTPUT_STYLES.find((s) => s.id === outputStyle)?.name || outputStyle}
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setOutputStyle("standard");
                                    localStorage.setItem("marnie_output_style", "standard");
                                }}
                                title="Reset to standard style"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#6366f1",
                                    cursor: "pointer",
                                    padding: 0,
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Top Row: Textarea on left, Voice Input button + Model Switcher trigger on right */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            width: "100%",
                        }}
                    >
                        {/* Auto-growing Textarea */}
                        <textarea
                            ref={textareaRef}
                            className="auto-grow"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                webSearchActive
                                    ? `Message Marnie with ${searchProvider === "searxng" ? "SearXNG" : "DuckDuckGo"}...`
                                    : "Message Marnie ..."
                            }
                            rows={1}
                            style={{
                                flex: 1,
                                minHeight: "36px",
                                maxHeight: "160px",
                                resize: "none",
                                background: "transparent",
                                border: "none",
                                outline: "none",
                                color: "var(--text-primary)",
                                fontSize: "0.95rem",
                                lineHeight: 1.5,
                                padding: "2px 0 0 0",
                                fontFamily: "inherit",
                            }}
                        />

                        {/* Right side of typing bar: Direct Voice Input Button + Model Switcher */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                flexShrink: 0,
                            }}
                        >
                            {/* Direct Voice Input Button */}
                            <button
                                type="button"
                                onClick={toggleSpeechRecognition}
                                title={
                                    isListening
                                        ? "Stop speech recognition"
                                        : "Voice input (Speech to text)"
                                }
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "28px",
                                    height: "28px",
                                    borderRadius: "var(--radius-sm)",
                                    backgroundColor: isListening
                                        ? "rgba(239, 68, 68, 0.16)"
                                        : "transparent",
                                    border: isListening
                                        ? "1px solid #EF4444"
                                        : "1px solid transparent",
                                    color: isListening
                                        ? "#EF4444"
                                        : "var(--text-muted)",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isListening) {
                                        e.currentTarget.style.color = "var(--text-primary)";
                                        e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isListening) {
                                        e.currentTarget.style.color = "var(--text-muted)";
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }
                                }}
                            >
                                {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                            </button>

                            {/* Model Switcher inside Chatbox */}
                            <div
                                ref={modelDropdownRef}
                                style={{ position: "relative", flexShrink: 0 }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setModelDropdownOpen((prev) => !prev)}
                                    title="Switch model"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.45rem",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "var(--radius-sm)",
                                        background: "transparent",
                                        color: "var(--text-secondary)",
                                        fontSize: "0.62rem",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color =
                                            "var(--text-primary)";
                                        e.currentTarget.style.backgroundColor =
                                            "var(--bg-secondary)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color =
                                            "var(--text-secondary)";
                                        e.currentTarget.style.backgroundColor =
                                            "transparent";
                                    }}
                                >
                                    {/* 3 vertical bars / equalizer icon matching screenshot */}
                                    <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 14 14"
                                        fill="currentColor"
                                        style={{ opacity: 0.75, flexShrink: 0 }}
                                    >
                                        <rect x="2" y="7" width="2.2" height="7" rx="1.1" />
                                        <rect x="7" y="2" width="2.2" height="12" rx="1.1" />
                                        <rect x="12" y="5" width="2.2" height="9" rx="1.1" />
                                    </svg>
                                    <span
                                        style={{
                                            maxWidth: "140px",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {activeModel || "Select Model"}
                                    </span>
                                    {modelDropdownOpen ? (
                                        <ChevronUp size={12} />
                                    ) : (
                                        <ChevronDown size={12} />
                                    )}
                                </button>

                            {/* Dropdown Menu (Pops up above) */}
                            {modelDropdownOpen && (
                                <div
                                    style={{
                                        position: "absolute",
                                        bottom: "calc(100% + 8px)",
                                        right: 0,
                                        minWidth: "220px",
                                        maxWidth: "280px",
                                        backgroundColor: "var(--bg-card)",
                                        border: "1px solid var(--border-strong)",
                                        borderRadius: "var(--radius-md)",
                                        boxShadow: "var(--shadow-lg)",
                                        padding: "0.4rem",
                                        zIndex: 100,
                                        maxHeight: "260px",
                                        overflowY: "auto",
                                        animation: "fadeIn 0.15s ease",
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "0.35rem 0.6rem 0.25rem 0.6rem",
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                            color: "var(--text-muted)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                        }}
                                    >
                                        Select Model
                                    </div>
                                    {availableModels.length > 0 ? (
                                        availableModels.map((m) => {
                                            const isSelected = m === activeModel;
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => {
                                                        if (onModelChanged)
                                                            onModelChanged(m);
                                                        setModelDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "space-between",
                                                        padding: "0.45rem 0.65rem",
                                                        borderRadius:
                                                            "var(--radius-sm)",
                                                        backgroundColor: isSelected
                                                            ? "var(--accent-light)"
                                                            : "transparent",
                                                        color: isSelected
                                                            ? "var(--accent-terracotta)"
                                                            : "var(--text-primary)",
                                                        fontSize: "0.82rem",
                                                        fontWeight: isSelected
                                                            ? 600
                                                            : 400,
                                                        textAlign: "left",
                                                        cursor: "pointer",
                                                        transition:
                                                            "background-color 0.12s ease",
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!isSelected)
                                                            e.currentTarget.style.backgroundColor =
                                                                "var(--bg-card-hover)";
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!isSelected)
                                                            e.currentTarget.style.backgroundColor =
                                                                "transparent";
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {m}
                                                    </span>
                                                    {isSelected && (
                                                        <Check
                                                            size={14}
                                                            color="var(--accent-terracotta)"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div
                                            style={{
                                                padding: "0.5rem 0.65rem",
                                                fontSize: "0.8rem",
                                                color: "var(--text-muted)",
                                            }}
                                        >
                                            {activeModel || "No models loaded"}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                    {/* Bottom Controls Bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: "0.25rem",
                        }}
                    >
                        {/* Left Action Buttons: Search, Terminal */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.45rem",
                            }}
                        >
                            {/* Search Button (Web Search toggle) */}
                            <button
                                type="button"
                                onClick={() => setWebSearchActive(!webSearchActive)}
                                title={
                                    webSearchActive
                                        ? `${searchProvider === "searxng" ? "SearXNG" : "DuckDuckGo"} Web Search enabled`
                                        : `Enable ${searchProvider === "searxng" ? "SearXNG" : "DuckDuckGo"} Web Search`
                                }
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "8px",
                                    backgroundColor: webSearchActive
                                        ? "rgba(59, 130, 246, 0.18)"
                                        : "var(--bg-secondary)",
                                    border: webSearchActive
                                        ? "1px solid #3B82F6"
                                        : "1px solid var(--border-subtle)",
                                    color: webSearchActive
                                        ? "#3B82F6"
                                        : "var(--text-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    if (!webSearchActive) {
                                        e.currentTarget.style.color =
                                            "var(--text-primary)";
                                        e.currentTarget.style.borderColor =
                                            "var(--border-strong)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!webSearchActive) {
                                        e.currentTarget.style.color =
                                            "var(--text-secondary)";
                                        e.currentTarget.style.borderColor =
                                            "var(--border-subtle)";
                                    }
                                }}
                            >
                                <Search size={14} />
                            </button>

                            {/* Terminal / Tools Button */}
                            <button
                                type="button"
                                onClick={onOpenTools}
                                title="Open Tools & Workspace Terminal"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--bg-secondary)",
                                    border: "1px solid var(--border-subtle)",
                                    color: "var(--text-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color =
                                        "var(--text-primary)";
                                    e.currentTarget.style.borderColor =
                                        "var(--border-strong)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color =
                                        "var(--text-secondary)";
                                    e.currentTarget.style.borderColor =
                                        "var(--border-subtle)";
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                        letterSpacing: "-1px",
                                        lineHeight: 1,
                                    }}
                                >
                                    &gt;_
                                </span>
                            </button>

                            {/* Active speech recognition indicator */}
                            {isListening && (
                                <span
                                    style={{
                                        color: "#EF4444",
                                        fontSize: "0.75rem",
                                        fontWeight: 500,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.25rem",
                                        marginLeft: "0.25rem",
                                    }}
                                >
                                    <span
                                        style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            backgroundColor: "#EF4444",
                                            display: "inline-block",
                                        }}
                                    />
                                    Listening...
                                </span>
                            )}
                        </div>

                        {/* Right Action Controls: Agent / Chat Pill Toggle + Send Button */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                            }}
                        >
                            {/* Segmented Pill Toggle: [ Agent | Chat ] */}
                            <div
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    backgroundColor: "var(--bg-secondary)",
                                    border: "1px solid var(--border-subtle)",
                                    borderRadius: "9999px",
                                    padding: "2px",
                                    gap: "2px",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setAgentModeActive(true)}
                                    title="Agent Mode: Goals, tasks, and tool execution"
                                    style={{
                                        padding: "0.22rem 0.7rem",
                                        borderRadius: "9999px",
                                        fontSize: "0.78rem",
                                        fontWeight: agentModeActive ? 600 : 500,
                                        backgroundColor: agentModeActive
                                            ? "var(--bg-card)"
                                            : "transparent",
                                        color: agentModeActive
                                            ? "var(--text-primary)"
                                            : "var(--text-muted)",
                                        boxShadow: agentModeActive
                                            ? "var(--shadow-sm)"
                                            : "none",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    Agent
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAgentModeActive(false)}
                                    title="Chat Mode: Standard conversational chat"
                                    style={{
                                        padding: "0.22rem 0.7rem",
                                        borderRadius: "9999px",
                                        fontSize: "0.78rem",
                                        fontWeight: !agentModeActive ? 600 : 500,
                                        backgroundColor: !agentModeActive
                                            ? "var(--bg-card)"
                                            : "transparent",
                                        color: !agentModeActive
                                            ? "var(--text-primary)"
                                            : "var(--text-muted)",
                                        boxShadow: !agentModeActive
                                            ? "var(--shadow-sm)"
                                            : "none",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    Chat
                                </button>
                            </div>

                            {/* Send / Stop Button */}
                            {isStreaming ? (
                                <button
                                    onClick={handleStop}
                                    title="Stop generating"
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--text-primary)",
                                        color: "var(--bg-primary)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                    }}
                                >
                                    <Square size={13} fill="currentColor" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleSend()}
                                    disabled={!input.trim()}
                                    title="Send message"
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "8px",
                                        backgroundColor: "var(--accent-terracotta)",
                                        opacity: input.trim() ? 1 : 0.65,
                                        color: "#FFFFFF",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: input.trim()
                                            ? "pointer"
                                            : "default",
                                        transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (input.trim())
                                            e.currentTarget.style.backgroundColor =
                                                "var(--accent-terracotta-hover)";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (input.trim())
                                            e.currentTarget.style.backgroundColor =
                                                "var(--accent-terracotta)";
                                    }}
                                >
                                    <ArrowUp size={16} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Speech Recognition Error & Setup Modal */}
            {speechModalInfo && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.65)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "1.25rem",
                    }}
                    onClick={() => setSpeechModalInfo(null)}
                >
                    <div
                        style={{
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-lg)",
                            width: "100%",
                            maxWidth: "540px",
                            boxShadow: "var(--shadow-xl)",
                            overflow: "hidden",
                            animation:
                                "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: "1.2rem 1.5rem",
                                borderBottom: "1px solid var(--border-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: "var(--bg-primary)",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.65rem",
                                }}
                            >
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "var(--radius-sm)",
                                        backgroundColor:
                                            "rgba(239, 68, 68, 0.12)",
                                        color: "#EF4444",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <AlertTriangle size={18} />
                                </div>
                                <h3
                                    style={{
                                        fontFamily: "var(--font-display)",
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                    }}
                                >
                                    {speechModalInfo.title}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSpeechModalInfo(null)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    padding: "4px",
                                    borderRadius: "4px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.color =
                                        "var(--text-primary)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.color =
                                        "var(--text-muted)")
                                }
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div
                            style={{
                                padding: "1.4rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1rem",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "0.88rem",
                                    color: "var(--text-secondary)",
                                    lineHeight: 1.5,
                                    margin: 0,
                                }}
                            >
                                {speechModalInfo.description}
                            </p>

                            {speechModalInfo.type === "network" && (
                                <div
                                    style={{
                                        backgroundColor: "var(--bg-primary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        padding: "1rem 1.15rem",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.75rem",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.45rem",
                                            fontWeight: 600,
                                            color: "var(--text-primary)",
                                            fontSize: "0.88rem",
                                        }}
                                    >
                                        <span>🦁 Using Brave Browser?</span>
                                    </div>
                                    <p
                                        style={{
                                            fontSize: "0.82rem",
                                            color: "var(--text-secondary)",
                                            lineHeight: 1.45,
                                            margin: 0,
                                        }}
                                    >
                                        Chromium&#39;s built-in Web Speech API
                                        communicates with Google speech
                                        recognition servers. Brave intentionally
                                        blocks Google services by default for
                                        privacy. To enable speech-to-text in
                                        Brave:
                                    </p>
                                    <ol
                                        style={{
                                            margin: 0,
                                            paddingLeft: "1.25rem",
                                            fontSize: "0.82rem",
                                            color: "var(--text-secondary)",
                                            lineHeight: 1.65,
                                        }}
                                    >
                                        <li>
                                            Open a new tab and navigate to:{" "}
                                            <code
                                                style={{
                                                    fontFamily:
                                                        "var(--font-mono)",
                                                    padding: "2px 5px",
                                                    borderRadius: "4px",
                                                    backgroundColor:
                                                        "var(--bg-secondary)",
                                                    border: "1px solid var(--border-subtle)",
                                                    color: "var(--text-primary)",
                                                }}
                                            >
                                                brave://settings/system
                                            </code>
                                        </li>
                                        <li>
                                            Enable the toggle:{" "}
                                            <strong>
                                                &quot;Use Google services for
                                                speech recognition&quot;
                                            </strong>
                                        </li>
                                        <li>Relaunch Brave Browser.</li>
                                    </ol>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "0.5rem",
                                            marginTop: "0.2rem",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    "brave://settings/system",
                                                );
                                                setCopiedSetting(true);
                                                setTimeout(
                                                    () =>
                                                        setCopiedSetting(false),
                                                    2000,
                                                );
                                            }}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.45rem",
                                                padding: "0.45rem 0.85rem",
                                                fontSize: "0.8rem",
                                                fontWeight: 500,
                                                borderRadius:
                                                    "var(--radius-sm)",
                                                backgroundColor:
                                                    "var(--bg-secondary)",
                                                border: "1px solid var(--border-subtle)",
                                                color: "var(--text-primary)",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {copiedSetting ? (
                                                <Check
                                                    size={14}
                                                    color="#10B981"
                                                />
                                            ) : (
                                                <Copy size={14} />
                                            )}
                                            {copiedSetting
                                                ? "Copied settings URL"
                                                : "Copy brave://settings/system"}
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            borderTop:
                                                "1px solid var(--border-subtle)",
                                            paddingTop: "0.65rem",
                                            marginTop: "0.2rem",
                                        }}
                                    >
                                        <p
                                            style={{
                                                fontSize: "0.78rem",
                                                color: "var(--text-muted)",
                                                margin: 0,
                                                lineHeight: 1.4,
                                            }}
                                        >
                                            💡 <strong>Alternative:</strong>{" "}
                                            Speech recognition also works
                                            out-of-the-box in Google Chrome or
                                            Microsoft Edge without changing any
                                            browser flags.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {speechModalInfo.type === "permission" && (
                                <div
                                    style={{
                                        backgroundColor: "var(--bg-primary)",
                                        border: "1px solid var(--border-subtle)",
                                        borderRadius: "var(--radius-md)",
                                        padding: "0.9rem 1.1rem",
                                        fontSize: "0.82rem",
                                        color: "var(--text-secondary)",
                                        lineHeight: 1.5,
                                    }}
                                >
                                    Click the permissions / padlock icon in your
                                    browser address bar next to the URL, set{" "}
                                    <strong>Microphone</strong> to{" "}
                                    <strong>Allow</strong>, and refresh the
                                    page.
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                padding: "0.9rem 1.4rem",
                                borderTop: "1px solid var(--border-subtle)",
                                display: "flex",
                                justifyContent: "flex-end",
                                backgroundColor: "var(--bg-primary)",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setSpeechModalInfo(null)}
                                style={{
                                    padding: "0.5rem 1.25rem",
                                    borderRadius: "var(--radius-sm)",
                                    backgroundColor: "var(--accent-terracotta)",
                                    color: "#FFFFFF",
                                    border: "none",
                                    fontSize: "0.85rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* /output-style Modal */}
            {isStyleModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.65)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                        padding: "1.25rem",
                    }}
                    onClick={() => setIsStyleModalOpen(false)}
                >
                    <div
                        style={{
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-strong)",
                            borderRadius: "var(--radius-lg)",
                            width: "100%",
                            maxWidth: "520px",
                            boxShadow: "var(--shadow-xl)",
                            overflow: "hidden",
                            animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: "1.1rem 1.4rem",
                                borderBottom: "1px solid var(--border-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: "var(--bg-primary)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <div
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        borderRadius: "6px",
                                        backgroundColor: "rgba(99, 102, 241, 0.14)",
                                        color: "#6366f1",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Palette size={16} />
                                </div>
                                <div>
                                    <h3
                                        style={{
                                            fontFamily: "var(--font-display)",
                                            fontSize: "1.05rem",
                                            fontWeight: 600,
                                            color: "var(--text-primary)",
                                            margin: 0,
                                        }}
                                    >
                                        Output Style Customization
                                    </h3>
                                    <span style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>
                                        Customize how AI text responses are formatted and rendered
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsStyleModalOpen(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                    padding: "4px",
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {OUTPUT_STYLES.map((style) => {
                                const isSelected = outputStyle === style.id;
                                return (
                                    <div
                                        key={style.id}
                                        onClick={() => {
                                            setOutputStyle(style.id);
                                            localStorage.setItem("marnie_output_style", style.id);
                                            setIsStyleModalOpen(false);
                                            setMessages((prev) => [
                                                ...prev,
                                                {
                                                    id: `style-update-${Date.now()}`,
                                                    role: "assistant",
                                                    content: `🎨 **Output Style Updated:** Response style set to **${style.name}**.\n\n*${style.desc}*`,
                                                    created_at: Math.floor(Date.now() / 1000),
                                                },
                                            ]);
                                        }}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: isSelected ? "var(--bg-secondary)" : "var(--bg-primary)",
                                            border: isSelected ? "1.5px solid #6366f1" : "1px solid var(--border-subtle)",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                                                {style.name}
                                            </div>
                                            <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                                {style.desc}
                                            </div>
                                        </div>
                                        {isSelected && <Check size={16} color="#6366f1" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Claude-style Artifact Side Panel */}
            <ArtifactPanel
                isOpen={artifactOpen}
                filePath={currentArtifactPath}
                onClose={handleCloseArtifact}
                onFileSelected={(path) => {
                    if (onSelectArtifactPath) onSelectArtifactPath(path);
                    else setInternalArtifactPath(path);
                }}
            />
        </div>
    );
}


function renderKaTeX(formula, isBlock = false) {
    try {
        const html = katex.renderToString(formula, {
            displayMode: isBlock,
            throwOnError: false,
        });
        return (
            <span
                dangerouslySetInnerHTML={{ __html: html }}
                style={isBlock ? { display: "block", margin: "0.75rem 0", textAlign: "center", overflowX: "auto" } : {}}
            />
        );
    } catch {
        return <code>{formula}</code>;
    }
}

function formatMarkdown(content) {
    if (!content) return null;

    // Filter em dashes from non-code portions before rendering
    // (code blocks in ```...``` are kept untouched)
    const rawParts = content.split(/(```[\s\S]*?```)/g);
    const normalizedParts = rawParts.map((p) => {
        if (p.startsWith("```") && p.endsWith("```")) return p;
        return p.replace(/[\u2014\u2013]/g, " - ");
    });
    const cleanContent = normalizedParts.join("");

    // Split content by code blocks ```...``` and display math $$...$$
    const parts = cleanContent.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

    return parts.map((part, index) => {
        // 1. Code blocks
        if (part.startsWith("```") && part.endsWith("```")) {
            const firstLineBreak = part.indexOf("\n");
            const lang =
                firstLineBreak !== -1
                    ? part.slice(3, firstLineBreak).trim()
                    : "";
            const code =
                firstLineBreak !== -1
                    ? part.slice(firstLineBreak + 1, -3)
                    : part.slice(3, -3);

            // Check if lang is mermaid
            if (lang.toLowerCase() === "mermaid") {
                return <MermaidBlock key={index} chart={code} />;
            }

            // If code block is just { "sent": true }, display as plain text Successful
            try {
                const parsed = JSON.parse(code.trim());
                if (
                    parsed &&
                    parsed.sent === true &&
                    Object.keys(parsed).length === 1
                ) {
                    return (
                        <div
                            key={index}
                            style={{
                                margin: "0.4rem 0",
                                color: "var(--text-primary)",
                                fontWeight: 500,
                            }}
                        >
                            Successful
                        </div>
                    );
                }
            } catch {}

            return (
                <div
                    key={index}
                    style={{ position: "relative", margin: "0.85rem 0" }}
                >
                    {lang && (
                        <div
                            style={{
                                position: "absolute",
                                right: "12px",
                                top: "8px",
                                fontSize: "0.72rem",
                                color: "#888",
                                fontFamily: "var(--font-mono)",
                                textTransform: "uppercase",
                            }}
                        >
                            {lang}
                        </div>
                    )}
                    <pre>
                        <code>{code}</code>
                    </pre>
                </div>
            );
        }

        // 2. Block math $$...$$
        if (part.startsWith("$$") && part.endsWith("$$")) {
            const formula = part.slice(2, -2).trim();
            return <div key={index}>{renderKaTeX(formula, true)}</div>;
        }

        // 3. Process inline markdown (paragraphs, headers, bold, italics, inline math $...$)
        const lines = part.split("\n");
        return (
            <React.Fragment key={index}>
                {lines.map((line, lIdx) => {
                    if (!line.trim()) return <br key={lIdx} />;

                    if (line.startsWith("### ")) {
                        return (
                            <h3 key={lIdx}>{renderInline(line.slice(4))}</h3>
                        );
                    }
                    if (line.startsWith("## ")) {
                        return (
                            <h2 key={lIdx}>{renderInline(line.slice(3))}</h2>
                        );
                    }
                    if (line.startsWith("# ")) {
                        return (
                            <h1 key={lIdx}>{renderInline(line.slice(2))}</h1>
                        );
                    }
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                        return (
                            <li key={lIdx} style={{ marginLeft: "1.25rem" }}>
                                {renderInline(line.slice(2))}
                            </li>
                        );
                    }
                    return <p key={lIdx}>{renderInline(line)}</p>;
                })}
            </React.Fragment>
        );
    });
}

function renderInline(str) {
    // Split by inline code (`...`), bold (**...**), italics (*...*), or inline math ($...$)
    const tokens = str.split(/(`[^`]+`|\$\$(?:[^\$]+)\$\$|\$(?:[^\$\n]+)\$|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return tokens.map((tok, i) => {
        if (tok.startsWith("`") && tok.endsWith("`")) {
            return <code key={i}>{tok.slice(1, -1)}</code>;
        }
        if (tok.startsWith("$$") && tok.endsWith("$$")) {
            return <span key={i}>{renderKaTeX(tok.slice(2, -2), true)}</span>;
        }
        if (tok.startsWith("$") && tok.endsWith("$") && tok.length > 2) {
            return <span key={i}>{renderKaTeX(tok.slice(1, -1), false)}</span>;
        }
        if (tok.startsWith("**") && tok.endsWith("**")) {
            return <strong key={i}>{renderInline(tok.slice(2, -2))}</strong>;
        }
        if (tok.startsWith("*") && tok.endsWith("*")) {
            return <em key={i}>{renderInline(tok.slice(1, -1))}</em>;
        }
        return tok;
    });
}
