import React, { useState, useEffect, useRef } from "react";
import {
    X,
    FileText,
    Check,
    Copy,
    Save,
    RotateCw,
    Plus,
    Clock,
    Hash,
} from "lucide-react";
import { getNotes, saveNotes, appendNote } from "../services/api";

export default function NotesModal({
    isOpen,
    onClose,
}) {
    const [content, setContent] = useState("");
    const [savedContent, setSavedContent] = useState("");
    const [metadata, setMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
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

                {/* Content Area - Clean direct editor */}
                <div
                    style={{
                        flex: 1,
                        overflow: "hidden",
                        display: "flex",
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
