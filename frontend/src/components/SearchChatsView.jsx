import React, { useState, useEffect, useRef } from "react";
import {
    Search,
    X,
    MessageSquare,
    Clock,
    User,
    Bot,
    ArrowRight,
    Copy,
    Check,
    GitFork,
    Sparkles,
    Filter,
    Calendar,
    ChevronRight,
} from "lucide-react";
import { searchChats, forkConversation } from "../services/api";

function formatTimestamp(timestamp) {
    if (!timestamp) return "";
    const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function HighlightText({ text = "", highlight = "" }) {
    if (!highlight || !highlight.trim() || !text) {
        return <span>{text}</span>;
    }

    const cleanHighlight = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${cleanHighlight})`, "gi");
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark
                        key={i}
                        style={{
                            backgroundColor: "rgba(200, 91, 56, 0.22)",
                            color: "var(--accent-terracotta)",
                            fontWeight: 600,
                            borderRadius: "3px",
                            padding: "0 2px",
                        }}
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
}

export default function SearchChatsView({
    onClose,
    onSelectConversation,
    availableModels = [],
}) {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'user' | 'assistant'
    const [modelFilter, setModelFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState({ conversations: [], messages: [], totalResults: 0 });
    const [copiedId, setCopiedId] = useState(null);
    const searchInputRef = useRef(null);

    // Auto-focus search input on mount
    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    // Debounce query typing
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 180);
        return () => clearTimeout(handler);
    }, [query]);

    // Fetch search results when debounced query or filters change
    useEffect(() => {
        performSearch(debouncedQuery, roleFilter, modelFilter);
    }, [debouncedQuery, roleFilter, modelFilter]);

    const performSearch = async (q, role, model) => {
        setLoading(true);
        try {
            const roleParam = role === "all" ? "" : role;
            const data = await searchChats(q, { role: roleParam, model });
            setResults({
                conversations: data.conversations || [],
                messages: data.messages || [],
                totalResults: data.totalResults || 0,
            });
        } catch (err) {
            console.warn("Search chats error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (id, text, e) => {
        e?.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFork = async (convId, e) => {
        e?.stopPropagation();
        try {
            const forked = await forkConversation(convId);
            if (forked?.id) {
                onSelectConversation(forked.id);
            }
        } catch (err) {
            alert(`Failed to fork chat: ${err.message}`);
        }
    };

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "var(--bg-primary)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Top Header */}
            <header
                style={{
                    padding: "1.25rem 2rem 1.1rem 2rem",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "var(--bg-secondary)",
                    flexShrink: 0,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <div
                        style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "10px",
                            backgroundColor: "rgba(200, 91, 56, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--accent-terracotta)",
                        }}
                    >
                        <Search size={20} />
                    </div>
                    <div>
                        <h1
                            style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "1.35rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                letterSpacing: "-0.01em",
                                lineHeight: 1.2,
                            }}
                        >
                            Search in chats
                        </h1>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                            Search across all conversations, messages, code, and prompts
                        </p>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    title="Close search and return to chat"
                    style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                        e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-card)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                >
                    <X size={18} />
                </button>
            </header>

            {/* Search Controls Card */}
            <div
                style={{
                    padding: "1.5rem 2rem 1rem 2rem",
                    backgroundColor: "var(--bg-primary)",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                    maxWidth: "960px",
                    margin: "0 auto",
                    width: "100%",
                }}
            >
                {/* Search Bar Input */}
                <div
                    style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-strong)",
                        borderRadius: "12px",
                        boxShadow: "var(--shadow-sm)",
                        padding: "0.35rem 0.85rem",
                        transition: "border-color 0.15s ease",
                    }}
                >
                    <Search
                        size={18}
                        color="var(--accent-terracotta)"
                        style={{ marginRight: "0.65rem", flexShrink: 0 }}
                    />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search chats, topics, questions, code..."
                        style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: "0.95rem",
                            color: "var(--text-primary)",
                            padding: "0.5rem 0",
                        }}
                    />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery("");
                                searchInputRef.current?.focus();
                            }}
                            title="Clear search"
                            style={{
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "0.3rem",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter Chips & Model Selector */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                    }}
                >
                    {/* Role Filter Chips */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span
                            style={{
                                fontSize: "0.78rem",
                                color: "var(--text-muted)",
                                marginRight: "0.25rem",
                            }}
                        >
                            Filter by:
                        </span>
                        {[
                            { id: "all", label: "All" },
                            { id: "user", label: "User Prompts" },
                            { id: "assistant", label: "AI Responses" },
                        ].map((chip) => {
                            const isSelected = roleFilter === chip.id;
                            return (
                                <button
                                    key={chip.id}
                                    onClick={() => setRoleFilter(chip.id)}
                                    style={{
                                        padding: "0.3rem 0.75rem",
                                        borderRadius: "20px",
                                        fontSize: "0.78rem",
                                        fontWeight: 500,
                                        cursor: "pointer",
                                        border: isSelected
                                            ? "1px solid var(--accent-terracotta)"
                                            : "1px solid var(--border-subtle)",
                                        backgroundColor: isSelected
                                            ? "var(--accent-light)"
                                            : "var(--bg-card)",
                                        color: isSelected
                                            ? "var(--accent-terracotta)"
                                            : "var(--text-secondary)",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Model Dropdown Filter */}
                    {availableModels.length > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Model:</span>
                            <select
                                value={modelFilter}
                                onChange={(e) => setModelFilter(e.target.value)}
                                style={{
                                    padding: "0.3rem 0.65rem",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-subtle)",
                                    backgroundColor: "var(--bg-card)",
                                    color: "var(--text-primary)",
                                    fontSize: "0.78rem",
                                    outline: "none",
                                    cursor: "pointer",
                                }}
                            >
                                <option value="">All Models</option>
                                {availableModels.map((m) => (
                                    <option key={m} value={m}>
                                        {m}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Body */}
            <main
                style={{
                    flex: 1,
                    padding: "1.5rem 2rem 2.5rem 2rem",
                    overflowY: "auto",
                    maxWidth: "960px",
                    margin: "0 auto",
                    width: "100%",
                }}
            >
                {loading ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "3rem",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                        }}
                    >
                        Searching conversations...
                    </div>
                ) : debouncedQuery ? (
                    /* Search Mode with Query */
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {/* Results Count Banner */}
                        <div
                            style={{
                                fontSize: "0.82rem",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                        >
                            <span>
                                Found <strong>{results.totalResults}</strong> result(s) for "{debouncedQuery}"
                            </span>
                        </div>

                        {/* Matching Conversations by Title */}
                        {results.conversations.length > 0 && (
                            <section>
                                <div
                                    style={{
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        color: "var(--text-muted)",
                                        marginBottom: "0.75rem",
                                    }}
                                >
                                    Matching Conversations ({results.conversations.length})
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                    {results.conversations.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => onSelectConversation(c.id)}
                                            style={{
                                                padding: "0.85rem 1.1rem",
                                                borderRadius: "12px",
                                                backgroundColor: "var(--bg-card)",
                                                border: "1px solid var(--border-subtle)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                                boxShadow: "var(--shadow-sm)",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = "var(--accent-terracotta)";
                                                e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = "var(--border-subtle)";
                                                e.currentTarget.style.backgroundColor = "var(--bg-card)";
                                            }}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "8px",
                                                        backgroundColor: "rgba(200, 91, 56, 0.1)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "var(--accent-terracotta)",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <MessageSquare size={16} />
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontSize: "0.92rem",
                                                            fontWeight: 600,
                                                            color: "var(--text-primary)",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                    >
                                                        <HighlightText text={c.title} highlight={debouncedQuery} />
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "0.75rem",
                                                            color: "var(--text-muted)",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "0.6rem",
                                                            marginTop: "0.15rem",
                                                        }}
                                                    >
                                                        <span>{c.model}</span>
                                                        <span>&bull;</span>
                                                        <span>{c.message_count || 0} messages</span>
                                                        <span>&bull;</span>
                                                        <span>{formatTimestamp(c.updated_at || c.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectConversation(c.id);
                                                    }}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.35rem",
                                                        padding: "0.4rem 0.8rem",
                                                        borderRadius: "6px",
                                                        backgroundColor: "var(--accent-light)",
                                                        color: "var(--accent-terracotta)",
                                                        border: "none",
                                                        fontSize: "0.8rem",
                                                        fontWeight: 500,
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <span>Open Chat</span>
                                                    <ArrowRight size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Matching Messages */}
                        {results.messages.length > 0 && (
                            <section>
                                <div
                                    style={{
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        color: "var(--text-muted)",
                                        marginBottom: "0.75rem",
                                    }}
                                >
                                    Matching Messages ({results.messages.length})
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                                    {results.messages.map((m) => {
                                        const isUser = m.role === "user";
                                        return (
                                            <div
                                                key={m.id}
                                                onClick={() => onSelectConversation(m.conversationId)}
                                                style={{
                                                    padding: "1rem 1.25rem",
                                                    borderRadius: "12px",
                                                    backgroundColor: "var(--bg-card)",
                                                    border: "1px solid var(--border-subtle)",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "0.6rem",
                                                    cursor: "pointer",
                                                    transition: "all 0.15s ease",
                                                    boxShadow: "var(--shadow-sm)",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.borderColor = "var(--border-strong)";
                                                    e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                                                    e.currentTarget.style.backgroundColor = "var(--bg-card)";
                                                }}
                                            >
                                                {/* Message Meta Header */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.78rem",
                                                    }}
                                                >
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                                        <span
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: "0.25rem",
                                                                padding: "0.15rem 0.5rem",
                                                                borderRadius: "4px",
                                                                fontSize: "0.72rem",
                                                                fontWeight: 600,
                                                                backgroundColor: isUser
                                                                    ? "rgba(200, 91, 56, 0.12)"
                                                                    : "rgba(59, 130, 246, 0.12)",
                                                                color: isUser
                                                                    ? "var(--accent-terracotta)"
                                                                    : "#2563EB",
                                                            }}
                                                        >
                                                            {isUser ? <User size={11} /> : <Bot size={11} />}
                                                            {isUser ? "You" : "Marnie"}
                                                        </span>

                                                        <span
                                                            style={{
                                                                color: "var(--text-primary)",
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {m.conversationTitle || "Untitled Chat"}
                                                        </span>

                                                        {m.conversationModel && (
                                                            <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                                                                ({m.conversationModel})
                                                            </span>
                                                        )}
                                                    </div>

                                                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                                        {formatTimestamp(m.createdAt)}
                                                    </span>
                                                </div>

                                                {/* Excerpt Body with Highlight */}
                                                <div
                                                    style={{
                                                        fontSize: "0.86rem",
                                                        lineHeight: 1.55,
                                                        color: "var(--text-secondary)",
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    <HighlightText text={m.excerpt || m.content} highlight={debouncedQuery} />
                                                </div>

                                                {/* Bottom Actions */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "flex-end",
                                                        gap: "0.5rem",
                                                        marginTop: "0.2rem",
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={(e) => handleCopy(m.id, m.content, e)}
                                                        title="Copy message"
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "0.3rem",
                                                            background: "none",
                                                            border: "none",
                                                            color: "var(--text-muted)",
                                                            fontSize: "0.75rem",
                                                            cursor: "pointer",
                                                            padding: "0.25rem 0.5rem",
                                                            borderRadius: "4px",
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                                                    >
                                                        {copiedId === m.id ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
                                                        <span>{copiedId === m.id ? "Copied" : "Copy"}</span>
                                                    </button>

                                                    <button
                                                        onClick={() => onSelectConversation(m.conversationId)}
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "0.3rem",
                                                            padding: "0.25rem 0.65rem",
                                                            borderRadius: "6px",
                                                            backgroundColor: "var(--bg-secondary)",
                                                            border: "1px solid var(--border-subtle)",
                                                            color: "var(--text-primary)",
                                                            fontSize: "0.75rem",
                                                            fontWeight: 500,
                                                            cursor: "pointer",
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-terracotta)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                                                    >
                                                        <span>Open Chat</span>
                                                        <ChevronRight size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Empty results state */}
                        {results.conversations.length === 0 && results.messages.length === 0 && (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "3.5rem 1rem",
                                    color: "var(--text-muted)",
                                }}
                            >
                                <Search size={36} color="var(--border-strong)" style={{ marginBottom: "0.75rem" }} />
                                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                    No matches found
                                </h3>
                                <p style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
                                    No messages or conversation titles matched "{debouncedQuery}". Try a different keyword or filter.
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Default state: Query is empty - Show Recent Chats */
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                        <div
                            style={{
                                fontSize: "0.76rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "var(--text-muted)",
                            }}
                        >
                            Recent Conversations
                        </div>

                        {results.conversations.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    padding: "3rem 1rem",
                                    color: "var(--text-muted)",
                                    fontSize: "0.88rem",
                                }}
                            >
                                No conversations yet. Start a new chat to begin!
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {results.conversations.map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => onSelectConversation(c.id)}
                                        style={{
                                            padding: "1rem 1.25rem",
                                            borderRadius: "12px",
                                            backgroundColor: "var(--bg-card)",
                                            border: "1px solid var(--border-subtle)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            boxShadow: "var(--shadow-sm)",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = "var(--accent-terracotta)";
                                            e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = "var(--border-subtle)";
                                            e.currentTarget.style.backgroundColor = "var(--bg-card)";
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0, flex: 1 }}>
                                            <div
                                                style={{
                                                    width: "36px",
                                                    height: "36px",
                                                    borderRadius: "10px",
                                                    backgroundColor: "var(--bg-secondary)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "var(--accent-terracotta)",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                <MessageSquare size={17} />
                                            </div>

                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontSize: "0.94rem",
                                                        fontWeight: 600,
                                                        color: "var(--text-primary)",
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                    }}
                                                >
                                                    {c.title || "Untitled Conversation"}
                                                </div>

                                                {c.last_message && (
                                                    <div
                                                        style={{
                                                            fontSize: "0.78rem",
                                                            color: "var(--text-secondary)",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            marginTop: "0.2rem",
                                                        }}
                                                    >
                                                        {c.last_role === "user" ? "You: " : "Marnie: "}
                                                        {c.last_message.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<!--[\s\S]*?-->/gi, "").trim()}
                                                    </div>
                                                )}

                                                <div
                                                    style={{
                                                        fontSize: "0.72rem",
                                                        color: "var(--text-muted)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.5rem",
                                                        marginTop: "0.25rem",
                                                    }}
                                                >
                                                    <span>{c.model}</span>
                                                    <span>&bull;</span>
                                                    <span>{c.message_count || 0} messages</span>
                                                    <span>&bull;</span>
                                                    <span>Active {formatTimestamp(c.updated_at || c.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "1rem" }}>
                                            <button
                                                onClick={(e) => handleFork(c.id, e)}
                                                title="Fork this conversation"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "var(--text-muted)",
                                                    cursor: "pointer",
                                                    padding: "0.4rem",
                                                    borderRadius: "6px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                                            >
                                                <GitFork size={15} />
                                            </button>

                                            <button
                                                onClick={() => onSelectConversation(c.id)}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.3rem",
                                                    padding: "0.4rem 0.8rem",
                                                    borderRadius: "6px",
                                                    backgroundColor: "var(--bg-secondary)",
                                                    border: "1px solid var(--border-subtle)",
                                                    color: "var(--text-primary)",
                                                    fontSize: "0.78rem",
                                                    fontWeight: 500,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                <span>Open</span>
                                                <ArrowRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
