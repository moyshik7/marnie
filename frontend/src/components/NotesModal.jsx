import React, { useState, useEffect, useRef } from "react";
import {
    X,
    FileText,
    Check,
    Copy,
    Save,
    RotateCw,
    Edit3,
    Eye,
    Plus,
    ExternalLink,
    AlertCircle,
    CheckSquare,
    Square,
    Clock,
    Hash,
    ListTodo,
    Trash2,
} from "lucide-react";
import { getNotes, saveNotes, appendNote } from "../services/api";

/**
 * Format inline markdown: bold, italics, inline code, links
 */
function renderInlineMarkdown(text) {
    if (!text) return null;
    // Split by inline code `...`
    const codeParts = text.split(/(`[^`]+`)/g);

    return codeParts.map((part, pIdx) => {
        if (part.startsWith("`") && part.endsWith("`")) {
            return (
                <code
                    key={pIdx}
                    style={{
                        padding: "0.15rem 0.35rem",
                        borderRadius: "3px",
                        backgroundColor: "var(--bg-tertiary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85em",
                        color: "var(--accent-terracotta)",
                    }}
                >
                    {part.slice(1, -1)}
                </code>
            );
        }

        // Handle bold **...**
        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
        return boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith("**") && bPart.endsWith("**")) {
                return <strong key={`${pIdx}-${bIdx}`}>{bPart.slice(2, -2)}</strong>;
            }

            // Handle italic *...*
            const italicParts = bPart.split(/(\*[^*]+\*)/g);
            return italicParts.map((iPart, iIdx) => {
                if (iPart.startsWith("*") && iPart.endsWith("*")) {
                    return <em key={`${pIdx}-${bIdx}-${iIdx}`}>{iPart.slice(1, -1)}</em>;
                }
                return iPart;
            });
        });
    });
}

/**
 * Render Markdown Notes with interactive task checkboxes
 */
function NotesMarkdownViewer({ content, onToggleTask }) {
    if (!content || !content.trim()) {
        return (
            <div style={{ color: "var(--text-muted)", fontStyle: "italic", padding: "1rem" }}>
                No notes found. Switch to Edit tab or use the Quick Add bar below to write your first note.
            </div>
        );
    }

    const lines = content.split("\n");
    const elements = [];
    let inCodeBlock = false;
    let codeBuffer = [];
    let codeLang = "";

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Code block toggle
        if (line.trim().startsWith("```")) {
            if (inCodeBlock) {
                elements.push(
                    <div
                        key={`code-${i}`}
                        style={{
                            margin: "0.75rem 0",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            overflow: "hidden",
                        }}
                    >
                        {codeLang && (
                            <div
                                style={{
                                    padding: "0.3rem 0.75rem",
                                    fontSize: "0.72rem",
                                    fontFamily: "var(--font-mono)",
                                    color: "var(--text-muted)",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    textTransform: "uppercase",
                                }}
                            >
                                {codeLang}
                            </div>
                        )}
                        <pre style={{ margin: 0, padding: "0.75rem", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>
                            <code>{codeBuffer.join("\n")}</code>
                        </pre>
                    </div>
                );
                codeBuffer = [];
                inCodeBlock = false;
                codeLang = "";
            } else {
                inCodeBlock = true;
                codeLang = line.trim().slice(3).trim();
            }
            continue;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            continue;
        }

        const trimmed = line.trim();

        // Empty lines
        if (!trimmed) {
            elements.push(<div key={`empty-${i}`} style={{ height: "0.6rem" }} />);
            continue;
        }

        // Headers
        if (trimmed.startsWith("# ")) {
            elements.push(
                <h1
                    key={`h1-${i}`}
                    style={{
                        fontSize: "1.35rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        margin: "1.2rem 0 0.5rem 0",
                        paddingBottom: "0.35rem",
                        borderBottom: "1px solid var(--border-subtle)",
                    }}
                >
                    {trimmed.slice(2)}
                </h1>
            );
            continue;
        }
        if (trimmed.startsWith("## ")) {
            elements.push(
                <h2
                    key={`h2-${i}`}
                    style={{
                        fontSize: "1.15rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: "1rem 0 0.4rem 0",
                        paddingBottom: "0.25rem",
                        borderBottom: "1px solid var(--border-subtle)",
                    }}
                >
                    {trimmed.slice(3)}
                </h2>
            );
            continue;
        }
        if (trimmed.startsWith("### ")) {
            elements.push(
                <h3
                    key={`h3-${i}`}
                    style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: "0.85rem 0 0.35rem 0",
                    }}
                >
                    {trimmed.slice(4)}
                </h3>
            );
            continue;
        }

        // Horizontal Rule
        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
            elements.push(
                <hr
                    key={`hr-${i}`}
                    style={{
                        border: "none",
                        borderTop: "1px solid var(--border-subtle)",
                        margin: "1rem 0",
                    }}
                />
            );
            continue;
        }

        // Blockquote
        if (trimmed.startsWith("> ")) {
            elements.push(
                <blockquote
                    key={`quote-${i}`}
                    style={{
                        margin: "0.5rem 0",
                        padding: "0.4rem 0.85rem",
                        borderLeft: "3px solid var(--accent-terracotta)",
                        backgroundColor: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                        fontSize: "0.85rem",
                        borderRadius: "0 4px 4px 0",
                    }}
                >
                    {renderInlineMarkdown(trimmed.slice(2))}
                </blockquote>
            );
            continue;
        }

        // Task Items: - [ ] or - [x]
        const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
        if (taskMatch) {
            const indent = taskMatch[1].length;
            const isChecked = taskMatch[2].toLowerCase() === "x";
            const taskText = taskMatch[3];

            elements.push(
                <div
                    key={`task-${i}`}
                    onClick={() => onToggleTask(i, line, isChecked)}
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.55rem",
                        padding: "0.3rem 0.45rem",
                        marginLeft: `${indent * 0.75}rem`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        transition: "background-color 0.1s ease",
                        backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                    }}
                >
                    <div style={{ marginTop: "0.15rem", color: isChecked ? "var(--accent-terracotta)" : "var(--text-muted)" }}>
                        {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>
                    <span
                        style={{
                            fontSize: "0.88rem",
                            lineHeight: 1.5,
                            color: isChecked ? "var(--text-muted)" : "var(--text-primary)",
                            textDecoration: isChecked ? "line-through" : "none",
                            wordBreak: "break-word",
                        }}
                    >
                        {renderInlineMarkdown(taskText)}
                    </span>
                </div>
            );
            continue;
        }

        // Standard bullet items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            elements.push(
                <div
                    key={`bullet-${i}`}
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.5rem",
                        padding: "0.2rem 0",
                        fontSize: "0.88rem",
                        color: "var(--text-primary)",
                    }}
                >
                    <span style={{ color: "var(--accent-terracotta)", fontWeight: "bold" }}>&bull;</span>
                    <span>{renderInlineMarkdown(trimmed.slice(2))}</span>
                </div>
            );
            continue;
        }

        // Standard Paragraph
        elements.push(
            <p
                key={`p-${i}`}
                style={{
                    margin: "0.3rem 0",
                    fontSize: "0.88rem",
                    lineHeight: 1.6,
                    color: "var(--text-primary)",
                }}
            >
                {renderInlineMarkdown(line)}
            </p>
        );
    }

    return <div>{elements}</div>;
}

export default function NotesModal({
    isOpen,
    onClose,
    onOpenInArtifactPanel,
}) {
    const [content, setContent] = useState("");
    const [savedContent, setSavedContent] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("preview"); // 'preview' | 'edit'
    const [copied, setCopied] = useState(false);
    const [saveToast, setSaveToast] = useState(false);
    const [quickNote, setQuickNote] = useState("");
    const [addingQuickNote, setAddingQuickNote] = useState(false);

    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);

    const isDirty = content !== savedContent;

    useEffect(() => {
        if (isOpen) {
            loadNotes();
        }
    }, [isOpen]);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const data = await getNotes();
            setContent(data.content || "");
            setSavedContent(data.content || "");
            setMetadata(data);
        } catch (err) {
            console.warn("Failed to load notes:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (saving) return;
        setSaving(true);
        try {
            const res = await saveNotes(content);
            setSavedContent(content);
            if (res) {
                setMetadata((prev) => ({
                    ...prev,
                    lastModified: res.lastModified || new Date().toISOString(),
                    lines: res.lines || content.split("\n").length,
                }));
            }
            setSaveToast(true);
            setTimeout(() => setSaveToast(false), 2200);
        } catch (err) {
            alert(`Error saving notes: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddQuickNote = async (e) => {
        e.preventDefault();
        const text = quickNote.trim();
        if (!text || addingQuickNote) return;

        // Auto format as markdown task if not already formatted
        const formatted = text.startsWith("- ") ? text : `- [ ] ${text}`;

        setAddingQuickNote(true);
        try {
            const res = await appendNote(formatted);
            if (res && res.content) {
                setContent(res.content);
                setSavedContent(res.content);
                setMetadata((prev) => ({
                    ...prev,
                    lastModified: res.lastModified,
                    lines: res.lines,
                }));
            } else {
                await loadNotes();
            }
            setQuickNote("");
        } catch (err) {
            alert(`Failed to add note: ${err.message}`);
        } finally {
            setAddingQuickNote(false);
        }
    };

    // Toggle checkbox directly on the specific line in markdown
    const handleToggleTask = (lineIndex, originalLine, isChecked) => {
        const lines = content.split("\n");
        if (lines[lineIndex] !== undefined) {
            if (isChecked) {
                lines[lineIndex] = lines[lineIndex].replace(/-\s*\[[xX]\]/, "- [ ]");
            } else {
                lines[lineIndex] = lines[lineIndex].replace(/-\s*\[\s*\]/, "- [x]");
            }
            const newContent = lines.join("\n");
            setContent(newContent);
            saveNotes(newContent)
                .then((res) => {
                    setSavedContent(newContent);
                    if (res) {
                        setMetadata((prev) => ({
                            ...prev,
                            lastModified: res.lastModified,
                        }));
                    }
                })
                .catch((err) => console.warn("Failed to auto-save task toggle:", err));
        }
    };

    // Sync editor scrolling
    const handleScroll = (e) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.target.scrollTop;
        }
    };

    // Keyboard shortcut for Cmd/Ctrl+S
    const handleKeyDown = (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            handleSave();
        }
    };

    if (!isOpen) return null;

    const lineCount = content ? content.split("\n").length : 1;
    const charCount = content ? content.length : 0;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 1100,
                backgroundColor: "rgba(0, 0, 0, 0.55)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem",
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: "var(--bg-primary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-strong)",
                    width: "100%",
                    maxWidth: "880px",
                    height: "88vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 20px 40px -15px rgba(0,0,0,0.4)",
                    overflow: "hidden",
                }}
            >
                {/* Modal Header */}
                <div
                    style={{
                        padding: "0.85rem 1.25rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "6px",
                                backgroundColor: "rgba(224, 90, 71, 0.12)",
                                color: "var(--accent-terracotta)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <FileText size={18} />
                        </div>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                    AI Notes &amp; Tasks
                                </span>
                                <span
                                    style={{
                                        fontSize: "0.72rem",
                                        fontFamily: "var(--font-mono)",
                                        padding: "0.15rem 0.45rem",
                                        borderRadius: "4px",
                                        backgroundColor: "var(--bg-tertiary)",
                                        color: "var(--text-secondary)",
                                        border: "1px solid var(--border-subtle)",
                                    }}
                                >
                                    workspace/NOTES.md
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: "0.76rem",
                                    color: "var(--text-muted)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    marginTop: "0.15rem",
                                }}
                            >
                                <span>Agent accessible via <code>fetch_notes</code> &amp; <code>update_notes</code></span>
                                <span>&bull;</span>
                                <span>Not in default prompt</span>
                            </div>
                        </div>
                    </div>

                    {/* Header Controls */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {/* Tab Switcher */}
                        <div
                            style={{
                                display: "flex",
                                backgroundColor: "var(--bg-card)",
                                borderRadius: "6px",
                                border: "1px solid var(--border-subtle)",
                                padding: "2px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setActiveTab("preview")}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.65rem",
                                    borderRadius: "4px",
                                    border: "none",
                                    backgroundColor: activeTab === "preview" ? "var(--bg-secondary)" : "transparent",
                                    color: activeTab === "preview" ? "var(--accent-terracotta)" : "var(--text-secondary)",
                                    fontSize: "0.78rem",
                                    fontWeight: activeTab === "preview" ? 600 : 400,
                                    cursor: "pointer",
                                }}
                            >
                                <Eye size={13} />
                                <span>Preview</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab("edit")}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.3rem 0.65rem",
                                    borderRadius: "4px",
                                    border: "none",
                                    backgroundColor: activeTab === "edit" ? "var(--bg-secondary)" : "transparent",
                                    color: activeTab === "edit" ? "var(--accent-terracotta)" : "var(--text-secondary)",
                                    fontSize: "0.78rem",
                                    fontWeight: activeTab === "edit" ? 600 : 400,
                                    cursor: "pointer",
                                }}
                            >
                                <Edit3 size={13} />
                                <span>Edit</span>
                            </button>
                        </div>

                        {/* Open in Claude Artifact Split Panel */}
                        {onOpenInArtifactPanel && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenInArtifactPanel("NOTES.md");
                                }}
                                title="Open side-by-side in Artifact Panel"
                                style={{
                                    padding: "0.35rem 0.55rem",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--border-subtle)",
                                    backgroundColor: "var(--bg-card)",
                                    color: "var(--text-secondary)",
                                    fontSize: "0.76rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    cursor: "pointer",
                                }}
                            >
                                <ExternalLink size={13} />
                                <span className="hidden-mobile">Artifact Panel</span>
                            </button>
                        )}

                        {/* Copy Button */}
                        <button
                            type="button"
                            onClick={handleCopy}
                            title="Copy Markdown"
                            style={{
                                padding: "0.35rem 0.55rem",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border-subtle)",
                                backgroundColor: "var(--bg-card)",
                                color: copied ? "#16a34a" : "var(--text-secondary)",
                                fontSize: "0.76rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                cursor: "pointer",
                            }}
                        >
                            {copied ? <Check size={13} /> : <Copy size={13} />}
                            <span>{copied ? "Copied" : "Copy"}</span>
                        </button>

                        {/* Save Button */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || !isDirty}
                            title="Save changes (Ctrl+S)"
                            style={{
                                padding: "0.35rem 0.75rem",
                                borderRadius: "var(--radius-sm)",
                                border: "none",
                                backgroundColor: isDirty ? "var(--accent-terracotta)" : "var(--bg-card)",
                                color: isDirty ? "#FFFFFF" : "var(--text-muted)",
                                fontSize: "0.78rem",
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                cursor: isDirty && !saving ? "pointer" : "default",
                                transition: "all 0.15s ease",
                            }}
                        >
                            <Save size={13} />
                            <span>{saving ? "Saving..." : "Save"}</span>
                        </button>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: "0.35rem",
                                borderRadius: "var(--radius-sm)",
                                border: "none",
                                backgroundColor: "transparent",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Quick Add Bar */}
                <form
                    onSubmit={handleAddQuickNote}
                    style={{
                        padding: "0.6rem 1.25rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        flexShrink: 0,
                    }}
                >
                    <Plus size={15} color="var(--accent-terracotta)" style={{ flexShrink: 0 }} />
                    <input
                        type="text"
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        placeholder="Quickly add a task or directive for the AI (e.g. - [ ] Refactor user auth endpoint)..."
                        style={{
                            flex: 1,
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.4rem 0.65rem",
                            fontSize: "0.82rem",
                            color: "var(--text-primary)",
                            outline: "none",
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!quickNote.trim() || addingQuickNote}
                        style={{
                            padding: "0.4rem 0.85rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: quickNote.trim() ? "var(--accent-terracotta)" : "var(--bg-card)",
                            color: quickNote.trim() ? "#FFFFFF" : "var(--text-muted)",
                            border: "1px solid var(--border-subtle)",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            cursor: quickNote.trim() && !addingQuickNote ? "pointer" : "default",
                        }}
                    >
                        {addingQuickNote ? "Adding..." : "Add to Notes"}
                    </button>
                </form>

                {/* Content Area */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        position: "relative",
                        display: "flex",
                        backgroundColor: "var(--bg-primary)",
                    }}
                >
                    {activeTab === "preview" ? (
                        <div
                            style={{
                                flex: 1,
                                padding: "1.5rem 2rem",
                                overflowY: "auto",
                            }}
                        >
                            <NotesMarkdownViewer content={content} onToggleTask={handleToggleTask} />
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                width: "100%",
                                height: "100%",
                                overflow: "hidden",
                                backgroundColor: "var(--bg-card)",
                            }}
                        >
                            {/* Line Numbers */}
                            <div
                                ref={lineNumbersRef}
                                style={{
                                    width: "48px",
                                    padding: "0.75rem 0.5rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRight: "1px solid var(--border-subtle)",
                                    color: "var(--text-muted)",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.82rem",
                                    lineHeight: "1.5rem",
                                    textAlign: "right",
                                    userSelect: "none",
                                    overflowY: "hidden",
                                }}
                            >
                                {Array.from({ length: lineCount }).map((_, i) => (
                                    <div key={i}>{i + 1}</div>
                                ))}
                            </div>

                            {/* Textarea Editor */}
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onScroll={handleScroll}
                                onKeyDown={handleKeyDown}
                                placeholder="Write markdown notes or task items here..."
                                spellCheck={false}
                                style={{
                                    flex: 1,
                                    padding: "0.75rem 1rem",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    outline: "none",
                                    resize: "none",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.84rem",
                                    lineHeight: "1.5rem",
                                    color: "var(--text-primary)",
                                    whiteSpace: "pre",
                                    overflowY: "auto",
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div
                    style={{
                        padding: "0.55rem 1.25rem",
                        borderTop: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Hash size={13} />
                            {lineCount} lines &middot; {charCount.toLocaleString()} chars
                        </span>
                        {metadata?.lastModified && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                <Clock size={13} />
                                Last saved: {new Date(metadata.lastModified).toLocaleTimeString()}
                            </span>
                        )}
                        {isDirty && (
                            <span style={{ color: "var(--accent-terracotta)", fontWeight: 500 }}>
                                &bull; Unsaved changes
                            </span>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {saveToast && (
                            <span
                                style={{
                                    color: "#16a34a",
                                    fontWeight: 500,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                }}
                            >
                                <Check size={13} /> Saved to workspace/NOTES.md
                            </span>
                        )}
                        <span style={{ color: "var(--text-muted)" }}>
                            Press <code>Ctrl+S</code> / <code>Cmd+S</code> to save
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
