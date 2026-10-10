import React, { useState } from "react";
import {
    Plus,
    MessageSquare,
    Trash2,
    Edit3,
    Check,
    X,
    Settings,
    Wrench,
    Sun,
    Moon,
    Microscope,
    Bot,
    ChevronLeft,
    ChevronRight,
    FileCode,
    FileText,
    Database,
} from "lucide-react";

export default function Sidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onDeleteConversation,
    onRenameConversation,
    onOpenSettings,
    onOpenTools,
    onOpenNotes,
    onOpenExpandedCapacity,
    onOpenDeepResearch,
    onOpenArtifacts,
    isArtifactOpen = false,
    activeSection = "chat",
    isResearchOngoing = false,
    theme,
    onToggleTheme,
    backendConnected,
    activeModel,
    isCollapsed = false,
    onToggleCollapse,
}) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");

    const startEditing = (conv, e) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditTitle(conv.title);
    };

    const saveEditing = (convId, e) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            onRenameConversation(convId, editTitle.trim());
        }
        setEditingId(null);
    };

    const cancelEditing = (e) => {
        e.stopPropagation();
        setEditingId(null);
    };

    return (
        <aside
            style={{
                width: isCollapsed ? "64px" : "280px",
                height: "100vh",
                backgroundColor: "var(--bg-secondary)",
                borderRight: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                userSelect: "none",
                transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease",
                overflow: "hidden",
            }}
        >
            {/* Top Branding */}
            <div
                style={{
                    padding: isCollapsed ? "1.25rem 0.5rem 1rem 0.5rem" : "1.25rem 1.1rem 1rem 1.1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                }}
            >
                <button
                    onClick={onToggleCollapse}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        background: "none",
                        border: "none",
                        padding: "0.2rem",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        outline: "none",
                        textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.85";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                    }}
                >
                    <img
                        src="/logo.png"
                        alt="Marnie"
                        style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "var(--radius-sm)",
                            objectFit: "contain",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                            flexShrink: 0,
                            cursor: "pointer",
                        }}
                    />
                    {!isCollapsed && (
                        <div>
                            <div
                                style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "1.25rem",
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    color: "var(--text-primary)",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                Marnie
                            </div>
                        </div>
                    )}
                </button>

                {/* Backend status dot */}
                {!isCollapsed && (
                    <div
                        title={
                            backendConnected
                                ? "Backend Connected"
                                : "Connecting to Backend..."
                        }
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            backgroundColor: backendConnected
                                ? "rgba(74, 222, 128, 0.12)"
                                : "rgba(239, 68, 68, 0.12)",
                            fontSize: "0.72rem",
                            color: backendConnected ? "#16A34A" : "#DC2626",
                            fontWeight: 500,
                        }}
                    >
                        <span
                            style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                backgroundColor: backendConnected
                                    ? "#16A34A"
                                    : "#DC2626",
                                display: "inline-block",
                            }}
                        />
                        {backendConnected ? "Live" : "Offline"}
                    </div>
                )}
            </div>

            {/* New Chat Button */}
            <div style={{ padding: isCollapsed ? "0 0.5rem 0.75rem 0.5rem" : "0 1rem 0.75rem 1rem" }}>
                <button
                    onClick={onNewConversation}
                    title={isCollapsed ? "New Chat" : undefined}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        padding: isCollapsed ? "0.65rem 0" : "0.7rem 1rem",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        fontWeight: 500,
                        fontSize: "0.9rem",
                        boxShadow: "var(--shadow-sm)",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                            "var(--accent-terracotta)";
                        e.currentTarget.style.backgroundColor =
                            "var(--bg-card-hover)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                            "var(--border-subtle)";
                        e.currentTarget.style.backgroundColor =
                            "var(--bg-card)";
                    }}
                >
                    <Plus size={16} color="var(--accent-terracotta)" />
                    {!isCollapsed && <span>New Chat</span>}
                </button>
            </div>

            {/* Conversation List */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    padding: isCollapsed ? "0.5rem 0.35rem" : "0.5rem 0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                }}
            >
                {!isCollapsed && (
                    <div
                        style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            padding: "0.4rem 0.5rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                        }}
                    >
                        Conversations
                    </div>
                )}

                {conversations.length === 0 ? (
                    !isCollapsed && (
                        <div
                            style={{
                                padding: "1.5rem 0.5rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                            }}
                        >
                            No previous chats.
                            <div
                                style={{
                                    marginTop: "0.25rem",
                                    fontSize: "0.75rem",
                                }}
                            >
                                Start a new session above.
                            </div>
                        </div>
                    )
                ) : (
                    conversations.map((conv) => {
                        const isActive = conv.id === activeConversationId;
                        const isEditing = editingId === conv.id;

                        return (
                            <div
                                key={conv.id}
                                onClick={() => onSelectConversation(conv.id)}
                                title={isCollapsed ? conv.title : undefined}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: isCollapsed ? "center" : "space-between",
                                    padding: isCollapsed ? "0.6rem 0" : "0.55rem 0.65rem",
                                    borderRadius: "var(--radius-sm)",
                                    backgroundColor: isActive
                                        ? "var(--bg-card)"
                                        : "transparent",
                                    border: isActive
                                        ? "1px solid var(--border-strong)"
                                        : "1px solid transparent",
                                    color: isActive
                                        ? "var(--text-primary)"
                                        : "var(--text-secondary)",
                                    cursor: "pointer",
                                    fontSize: "0.86rem",
                                    fontWeight: isActive ? 500 : 400,
                                    transition: "all 0.15s ease",
                                    position: "relative",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive)
                                        e.currentTarget.style.backgroundColor =
                                            "var(--bg-tertiary)";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive)
                                        e.currentTarget.style.backgroundColor =
                                            "transparent";
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        flex: isCollapsed ? 0 : 1,
                                        minWidth: 0,
                                        justifyContent: isCollapsed ? "center" : "flex-start",
                                    }}
                                >
                                    <MessageSquare
                                        size={15}
                                        color={
                                            isActive
                                                ? "var(--accent-terracotta)"
                                                : "var(--text-muted)"
                                        }
                                        style={{ flexShrink: 0 }}
                                    />

                                    {!isCollapsed && (
                                        isEditing ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) =>
                                                    setEditTitle(e.target.value)
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter")
                                                        saveEditing(conv.id, e);
                                                    if (e.key === "Escape")
                                                        cancelEditing(e);
                                                }}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    flex: 1,
                                                    background: "var(--bg-primary)",
                                                    border: "1px solid var(--accent-terracotta)",
                                                    borderRadius: "4px",
                                                    padding: "0.15rem 0.35rem",
                                                    fontSize: "0.84rem",
                                                    outline: "none",
                                                }}
                                            />
                                        ) : (
                                            <span
                                                style={{
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {conv.title || "Untitled Chat"}
                                            </span>
                                        )
                                    )}
                                </div>

                                {!isCollapsed && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.2rem",
                                            opacity: isActive ? 1 : 0.6,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={(e) =>
                                                        saveEditing(conv.id, e)
                                                    }
                                                    title="Save"
                                                    style={{
                                                        padding: "0.2rem",
                                                        color: "var(--accent-terracotta)",
                                                    }}
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={cancelEditing}
                                                    title="Cancel"
                                                    style={{
                                                        padding: "0.2rem",
                                                        color: "var(--text-muted)",
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={(e) =>
                                                        startEditing(conv, e)
                                                    }
                                                    title="Rename"
                                                    style={{
                                                        padding: "0.2rem",
                                                        color: "var(--text-muted)",
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
                                                    <Edit3 size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (
                                                            confirm(
                                                                `Delete "${conv.title}"?`,
                                                            )
                                                        ) {
                                                            onDeleteConversation(
                                                                conv.id,
                                                            );
                                                        }
                                                    }}
                                                    title="Delete"
                                                    style={{
                                                        padding: "0.2rem",
                                                        color: "var(--text-muted)",
                                                    }}
                                                    onMouseEnter={(e) =>
                                                        (e.currentTarget.style.color =
                                                            "#EF4444")
                                                    }
                                                    onMouseLeave={(e) =>
                                                        (e.currentTarget.style.color =
                                                            "var(--text-muted)")
                                                    }
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Bottom Utilities & Settings */}
            <div
                style={{
                    padding: isCollapsed ? "0.5rem 0.35rem" : "0.75rem",
                    borderTop: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                    alignItems: isCollapsed ? "center" : "stretch",
                }}
            >
                {/* Workspace Files trigger */}
                <button
                    onClick={onOpenArtifacts}
                    title={isCollapsed ? "Workspace Files & Preview" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        gap: "0.65rem",
                        padding: isCollapsed ? "0.55rem 0" : "0.55rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        color: isArtifactOpen ? "var(--accent-terracotta)" : "var(--text-secondary)",
                        backgroundColor: isArtifactOpen ? "var(--bg-card)" : "transparent",
                        fontSize: "0.85rem",
                        width: "100%",
                        textAlign: isCollapsed ? "center" : "left",
                        border: isArtifactOpen ? "1px solid var(--border-subtle)" : "1px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        if (!isArtifactOpen) {
                            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isArtifactOpen) {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                        }
                    }}
                >
                    <FileCode size={16} style={{ flexShrink: 0 }} />
                    {!isCollapsed && <span>Workspace Files</span>}
                </button>

                {/* Tools drawer trigger */}
                <button
                    onClick={onOpenTools}
                    title={isCollapsed ? "Tools & Tasks" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        gap: "0.65rem",
                        padding: isCollapsed ? "0.55rem 0" : "0.55rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                        width: "100%",
                        textAlign: isCollapsed ? "center" : "left",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                            "var(--bg-tertiary)";
                        e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                >
                    <Wrench size={16} style={{ flexShrink: 0 }} />
                    {!isCollapsed && <span>Tools & Tasks</span>}
                </button>

                {/* AI Notes (workspace/NOTES.md) trigger - above Deep Research */}
                <button
                    onClick={onOpenNotes}
                    title={isCollapsed ? "Notes & Tasks (workspace/NOTES.md)" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        padding: isCollapsed ? "0.55rem 0" : "0.55rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        backgroundColor: "transparent",
                        border: "1px solid transparent",
                        fontSize: "0.85rem",
                        width: "100%",
                        textAlign: isCollapsed ? "center" : "left",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                        e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                >
                    <FileText size={16} style={{ flexShrink: 0 }} />
                    {!isCollapsed && <span>Notes</span>}
                </button>

                {/* Expanded Capacity local RAG trigger - above Deep Research */}
                <button
                    onClick={onOpenExpandedCapacity}
                    title={isCollapsed ? "Expanded Capacity" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        padding: isCollapsed ? "0.55rem 0" : "0.55rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        backgroundColor: activeSection === "capacity"
                            ? "var(--bg-card)"
                            : "transparent",
                        border: activeSection === "capacity"
                            ? "1px solid var(--border-subtle)"
                            : "1px solid transparent",
                        fontSize: "0.85rem",
                        width: "100%",
                        textAlign: isCollapsed ? "center" : "left",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        if (activeSection !== "capacity") {
                            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeSection !== "capacity") {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                        }
                    }}
                >
                    <Database size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                    {!isCollapsed && (
                        <span style={{ fontWeight: activeSection === "capacity" ? 600 : 400 }}>
                            Expanded Capacity
                        </span>
                    )}
                </button>

                {/* Deep Research view trigger - matching grayish color */}
                <button
                    onClick={onOpenDeepResearch}
                    title={isCollapsed ? "Deep Research" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        padding: isCollapsed ? "0.55rem 0" : "0.55rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        backgroundColor: activeSection === "research"
                            ? "var(--bg-card)"
                            : "transparent",
                        border: activeSection === "research"
                            ? "1px solid var(--border-subtle)"
                            : "1px solid transparent",
                        fontSize: "0.85rem",
                        width: "100%",
                        textAlign: isCollapsed ? "center" : "left",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        if (activeSection !== "research") {
                            e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
                            e.currentTarget.style.color = "var(--text-primary)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (activeSection !== "research") {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                        }
                    }}
                >
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        gap: "0.65rem",
                        width: isCollapsed ? "100%" : "auto"
                    }}>
                        <Microscope size={16} style={{ color: "var(--text-secondary)", flexShrink: 0 }} />
                        {!isCollapsed && (
                            <span style={{ fontWeight: activeSection === "research" ? 600 : 400 }}>
                                Deep Research
                            </span>
                        )}
                    </div>

                    {!isCollapsed && isResearchOngoing && (
                        <div
                            title="Research in progress"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                            }}
                        >
                            <span className="blinking-green-dot" />
                        </div>
                    )}
                </button>

                {/* Settings modal trigger */}
                <button
                    onClick={onOpenSettings}
                    title={isCollapsed ? "Settings" : undefined}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: isCollapsed ? "center" : "flex-start",
                        gap: "0.65rem",
                        padding: isCollapsed ? "0.55rem 0" : "0.55rem 0.65rem",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                        width: "100%",
                        textAlign: isCollapsed ? "center" : "left",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                            "var(--bg-tertiary)";
                        e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                >
                    <Settings size={16} style={{ flexShrink: 0 }} />
                    {!isCollapsed && <span>Settings</span>}
                </button>

                {/* Theme and footer info */}
                {!isCollapsed && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "0.4rem 0.65rem 0.1rem 0.65rem",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                            }}
                        >
                            Marnie Workspace
                        </span>
                    </div>
                )}
            </div>
        </aside>
    );
}
