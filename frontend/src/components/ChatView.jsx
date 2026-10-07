import React, { useState, useEffect, useRef } from "react";
import {
    Send,
    Square,
    Sparkles,
    Copy,
    Check,
    Globe,
    Brain,
    ChevronDown,
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
} from "lucide-react";
import { sendMessageStream } from "../services/api";
import ThemeToggle from "./ThemeToggle";

function parseMessageContent(rawContent) {
    if (!rawContent || typeof rawContent !== "string")
        return { thinking: "", answer: "" };
    const thinkMatch = rawContent.match(/^<think>([\s\S]*?)<\/think>\s*/i);
    if (thinkMatch) {
        return {
            thinking: thinkMatch[1].trim(),
            answer: rawContent.slice(thinkMatch[0].length).trim(),
        };
    }
    return { thinking: "", answer: rawContent };
}

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
}) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [streamingThinking, setStreamingThinking] = useState("");
    const [copiedIndex, setCopiedIndex] = useState(null);

    // Feature toggles
    const [webSearchActive, setWebSearchActive] = useState(false);
    const [deepResearchActive, setDeepResearchActive] = useState(false);
    const [agentModeActive, setAgentModeActive] = useState(true);

    const abortControllerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);
    const [isListening, setIsListening] = useState(false);
    const [speechModalInfo, setSpeechModalInfo] = useState(null);
    const [copiedSetting, setCopiedSetting] = useState(false);

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

    const handleSend = async (customPrompt) => {
        const textToSend = (
            typeof customPrompt === "string" ? customPrompt : input
        ).trim();
        if (!textToSend || isStreaming) return;

        if (!conversation?.id) return;

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

        // Prepare system instructions incorporating mode flags
        let augmentedSystem = "";
        if (webSearchActive) {
            augmentedSystem +=
                "\n[Mode: SearXNG Web Search enabled for verified web answers]";
        }
        if (deepResearchActive) {
            augmentedSystem +=
                "\n[Mode: Deep Research enabled - provide thorough, comprehensive analysis with detailed reasoning]";
        }
        if (agentModeActive) {
            augmentedSystem +=
                "\n[Mode: Agent Mode enabled - identify goals, break down sub-tasks, and prepare tool executions]";
        }

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            await sendMessageStream({
                conversationId: conversation.id,
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

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
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
        <div
            style={{
                flex: 1,
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "var(--bg-primary)",
                position: "relative",
                overflow: "hidden",
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
                {/* Model selector & chat title */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        minWidth: 0,
                    }}
                >
                    <div style={{ position: "relative" }}>
                        <select
                            value={activeModel || ""}
                            onChange={(e) => {
                                if (onModelChanged && e.target.value) {
                                    onModelChanged(e.target.value);
                                }
                            }}
                            style={{
                                appearance: "none",
                                backgroundColor: "var(--bg-secondary)",
                                border: "1px solid var(--border-strong)",
                                borderRadius: "var(--radius-full)",
                                padding: "0.42rem 2.2rem 0.42rem 0.95rem",
                                fontSize: "0.84rem",
                                fontWeight: 600,
                                color: "var(--text-primary)",
                                outline: "none",
                                cursor: "pointer",
                                boxShadow: "var(--shadow-sm)",
                            }}
                        >
                            {availableModels.length > 0 ? (
                                availableModels.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))
                            ) : (
                                <option value={activeModel || "qwen3.5:9b"}>
                                    {activeModel || "qwen3.5:9b"}
                                </option>
                            )}
                        </select>
                        <ChevronDown
                            size={13}
                            style={{
                                position: "absolute",
                                right: "11px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none",
                                color: "var(--text-muted)",
                            }}
                        />
                    </div>

                    <span
                        style={{
                            fontSize: "0.86rem",
                            color: "var(--text-muted)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {conversation?.title || "New Session"}
                    </span>
                </div>

                {/* Right side: Top Theme Switcher & Action Toggles */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexShrink: 0,
                    }}
                >
                    {/* Top Light/Dark Theme Switcher Toggle */}
                    <ThemeToggle theme={theme} onToggle={onToggleTheme} />

                    {/* Agent Mode Toggle */}
                    <button
                        onClick={() => setAgentModeActive(!agentModeActive)}
                        title="Agent Mode: Sub-Agent Spawning & Execution"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: agentModeActive
                                ? "rgba(200, 91, 56, 0.14)"
                                : "var(--bg-secondary)",
                            border: agentModeActive
                                ? "1px solid var(--accent-terracotta)"
                                : "1px solid var(--border-subtle)",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: agentModeActive
                                ? "var(--accent-terracotta)"
                                : "var(--text-muted)",
                        }}
                    >
                        <Brain size={13} />
                        <span>Agent</span>
                    </button>

                    {/* Deep Research Toggle */}
                    <button
                        onClick={() =>
                            setDeepResearchActive(!deepResearchActive)
                        }
                        title="Deep Research Mode (Future Roadmap)"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: deepResearchActive
                                ? "rgba(217, 119, 6, 0.14)"
                                : "var(--bg-secondary)",
                            border: deepResearchActive
                                ? "1px solid var(--accent-gold)"
                                : "1px solid var(--border-subtle)",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: deepResearchActive
                                ? "var(--accent-gold)"
                                : "var(--text-muted)",
                        }}
                    >
                        <Sparkles size={13} />
                        <span>Research</span>
                    </button>

                    {/* Web Search Toggle */}
                    <button
                        onClick={() => setWebSearchActive(!webSearchActive)}
                        title="SearXNG Private Web Search (Future Roadmap)"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: webSearchActive
                                ? "rgba(59, 130, 246, 0.14)"
                                : "var(--bg-secondary)",
                            border: webSearchActive
                                ? "1px solid #3B82F6"
                                : "1px solid var(--border-subtle)",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: webSearchActive
                                ? "#2563EB"
                                : "var(--text-muted)",
                        }}
                    >
                        <Globe size={13} />
                        <span>SearXNG</span>
                    </button>

                    {/* Quick Tools button */}
                    <button
                        onClick={onOpenTools}
                        title="Open Tools & Tasks Panel"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.65rem",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            color: "var(--text-secondary)",
                        }}
                    >
                        <Wrench size={13} />
                        <span>Tools</span>
                    </button>
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
                    padding: "1.5rem 1rem 8rem 1rem",
                }}
            >
                <div style={{ width: "100%", maxWidth: "800px" }}>
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
                                }}
                            >
                                Start something new
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
                                                        } = parseMessageContent(
                                                            msg.content,
                                                        );
                                                        return (
                                                            <>
                                                                {thinking && (
                                                                    <div className="thinking-box">
                                                                        <div
                                                                            style={{
                                                                                display:
                                                                                    "flex",
                                                                                alignItems:
                                                                                    "center",
                                                                                gap: "0.4rem",
                                                                                fontWeight: 600,
                                                                                marginBottom:
                                                                                    "0.35rem",
                                                                                fontSize:
                                                                                    "0.72rem",
                                                                                textTransform:
                                                                                    "uppercase",
                                                                                letterSpacing:
                                                                                    "0.05em",
                                                                                color: "var(--text-muted)",
                                                                            }}
                                                                        >
                                                                            <Brain
                                                                                size={
                                                                                    12
                                                                                }
                                                                            />
                                                                            <span>
                                                                                Thinking
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            {
                                                                                thinking
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                <div className="markdown-body">
                                                                    {formatMarkdown(
                                                                        answer ||
                                                                            (!thinking
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
                                            <div className="thinking-box">
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.4rem",
                                                        fontWeight: 600,
                                                        marginBottom: "0.35rem",
                                                        fontSize: "0.72rem",
                                                        textTransform:
                                                            "uppercase",
                                                        letterSpacing: "0.05em",
                                                        color: "var(--text-muted)",
                                                    }}
                                                >
                                                    <Brain size={12} />
                                                    <span>Thinking</span>
                                                    <span
                                                        className="typing-dot"
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            width: "4px",
                                                            height: "8px",
                                                            backgroundColor:
                                                                "var(--text-muted)",
                                                            marginLeft: "2px",
                                                        }}
                                                    />
                                                </div>
                                                <div>{streamingThinking}</div>
                                            </div>
                                        )}
                                        {streamingContent && (
                                            <div className="markdown-body">
                                                {formatMarkdown(
                                                    streamingContent,
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
                                        )}
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
                        borderRadius: "var(--radius-lg)",
                        boxShadow: "var(--shadow-md)",
                        padding: "0.75rem 1rem 0.65rem 1.15rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.45rem",
                        transition: "border-color 0.15s ease",
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
                                ? "Ask with SearXNG web search enabled..."
                                : deepResearchActive
                                  ? "Ask for in-depth research and reasoning..."
                                  : "Ask Marnie, run code, or execute workspace tools..."
                        }
                    />

                    {/* Bottom Controls Bar */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            paddingTop: "0.25rem",
                        }}
                    >
                        {/* Feature Pills status */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            <span
                                style={{
                                    color: agentModeActive
                                        ? "var(--accent-terracotta)"
                                        : "inherit",
                                }}
                            >
                                {agentModeActive ? "Agent" : "Chat"}
                            </span>
                            {webSearchActive && (
                                <>
                                    <span>•</span>
                                    <span style={{ color: "#2563EB" }}>
                                        Web Search
                                    </span>
                                </>
                            )}
                            {deepResearchActive && (
                                <>
                                    <span>•</span>
                                    <span
                                        style={{ color: "var(--accent-gold)" }}
                                    >
                                        Deep Research
                                    </span>
                                </>
                            )}
                            {isListening && (
                                <>
                                    <span>•</span>
                                    <span
                                        style={{
                                            color: "#EF4444",
                                            fontWeight: 500,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.25rem",
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
                                </>
                            )}
                        </div>

                        {/* Actions: Voice input & Send / Stop Button */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.45rem",
                            }}
                        >
                            {/* Voice Input (Web Speech API) */}
                            <button
                                type="button"
                                onClick={toggleSpeechRecognition}
                                title={
                                    isListening
                                        ? "Stop listening"
                                        : "Voice input (Speech to text)"
                                }
                                style={{
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "var(--radius-full)",
                                    backgroundColor: isListening
                                        ? "rgba(239, 68, 68, 0.16)"
                                        : "var(--bg-secondary)",
                                    border: isListening
                                        ? "1px solid #EF4444"
                                        : "1px solid var(--border-subtle)",
                                    color: isListening
                                        ? "#EF4444"
                                        : "var(--text-secondary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    transition: "all 0.18s ease",
                                    boxShadow: isListening
                                        ? "0 0 10px rgba(239, 68, 68, 0.35)"
                                        : "none",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isListening) {
                                        e.currentTarget.style.color =
                                            "var(--text-primary)";
                                        e.currentTarget.style.borderColor =
                                            "var(--border-strong)";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isListening) {
                                        e.currentTarget.style.color =
                                            "var(--text-secondary)";
                                        e.currentTarget.style.borderColor =
                                            "var(--border-subtle)";
                                    }
                                }}
                            >
                                {isListening ? (
                                    <MicOff size={15} />
                                ) : (
                                    <Mic size={15} />
                                )}
                            </button>

                            {isStreaming ? (
                                <button
                                    onClick={handleStop}
                                    title="Stop generating"
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "var(--radius-full)",
                                        backgroundColor: "var(--text-primary)",
                                        color: "var(--bg-primary)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
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
                                        borderRadius: "var(--radius-full)",
                                        backgroundColor: input.trim()
                                            ? "var(--accent-terracotta)"
                                            : "var(--border-strong)",
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
                                    <Send size={15} />
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
        </div>
    );
}


function formatMarkdown(content) {
    if (!content) return null;

    // Split content by code blocks ```...```
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
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

        // Process inline markdown (paragraphs, headers, bold, italics, inline code)
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
    const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return tokens.map((tok, i) => {
        if (tok.startsWith("`") && tok.endsWith("`")) {
            return <code key={i}>{tok.slice(1, -1)}</code>;
        }
        if (tok.startsWith("**") && tok.endsWith("**")) {
            return <strong key={i}>{tok.slice(2, -2)}</strong>;
        }
        if (tok.startsWith("*") && tok.endsWith("*")) {
            return <em key={i}>{tok.slice(1, -1)}</em>;
        }
        return tok;
    });
}
