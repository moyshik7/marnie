import React, { useState, useEffect, useRef } from "react";
import {
    X,
    Code,
    Eye,
    Copy,
    Check,
    ExternalLink,
    Save,
    RotateCw,
    FileText,
    FileCode,
    Monitor,
    Tablet,
    Smartphone,
    Folder,
    ChevronDown,
    AlertCircle,
    Download,
} from "lucide-react";
import {
    getWorkspaceFile,
    saveWorkspaceFile,
    listWorkspaceFiles,
    getWorkspaceRawUrl,
} from "../services/api";

export default function ArtifactPanel({
    isOpen,
    filePath,
    onClose,
    onFileSelected,
}) {
    const [currentPath, setCurrentPath] = useState(filePath || "");
    const [content, setContent] = useState("");
    const [savedContent, setSavedContent] = useState("");
    const [fileMeta, setFileMeta] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Active view: 'preview' or 'code'
    const [activeTab, setActiveTab] = useState("preview");

    // Responsive preview viewport: 'desktop' | 'tablet' | 'mobile'
    const [viewport, setViewport] = useState("desktop");

    // Copy status
    const [copied, setCopied] = useState(false);
    const [saveToast, setSaveToast] = useState(false);

    // Workspace files list for dropdown
    const [workspaceFiles, setWorkspaceFiles] = useState([]);
    const [showFilePicker, setShowFilePicker] = useState(false);

    // Editor scroll sync
    const textareaRef = useRef(null);
    const lineNumbersRef = useRef(null);
    const iframeRef = useRef(null);

    const isDirty = content !== savedContent;

    // Whenever filePath prop changes and is not empty, switch to it
    useEffect(() => {
        if (filePath && filePath !== currentPath) {
            setCurrentPath(filePath);
        }
    }, [filePath]);

    // Load file whenever currentPath or isOpen changes
    useEffect(() => {
        if (isOpen && currentPath) {
            loadFile(currentPath);
        }
        if (isOpen) {
            fetchFilesList();
        }
    }, [isOpen, currentPath]);

    const fetchFilesList = async () => {
        try {
            const data = await listWorkspaceFiles();
            if (data && Array.isArray(data.files)) {
                // Keep only files
                const filesOnly = data.files.filter((f) => !f.isDirectory);
                setWorkspaceFiles(filesOnly);
                if (!currentPath && filesOnly.length > 0) {
                    const brainFile = filesOnly.find((f) => f.name === "BRAIN.md" || f.path === "BRAIN.md");
                    const target = brainFile ? brainFile.path : filesOnly[0].path;
                    setCurrentPath(target);
                    loadFile(target);
                }
            }
        } catch (err) {
            console.warn("Failed to list workspace files:", err);
        }
    };

    const loadFile = async (path) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getWorkspaceFile(path);
            setContent(data.content || "");
            setSavedContent(data.content || "");
            setFileMeta(data);

            // Default to preview for html, svg, markdown; otherwise code
            const ext = (data.extension || "").toLowerCase();
            const previewable = [".html", ".htm", ".svg", ".md"].includes(ext);
            setActiveTab(previewable ? "preview" : "code");
        } catch (err) {
            setError(err.message || "Failed to load file");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentPath || saving) return;
        setSaving(true);
        try {
            await saveWorkspaceFile(currentPath, content);
            setSavedContent(content);
            setSaveToast(true);
            setTimeout(() => setSaveToast(false), 2500);

            // Refresh iframe preview if in preview mode
            if (iframeRef.current && activeTab === "preview") {
                // If using srcDoc, it will reactively re-render
            }
        } catch (err) {
            alert(`Error saving file: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenInBrowser = () => {
        if (!currentPath) return;
        const rawUrl = getWorkspaceRawUrl(currentPath);
        window.open(rawUrl, "_blank");
    };

    const handleDownload = () => {
        if (!content) return;
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileMeta?.name || currentPath.split("/").pop() || "file";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Keyboard shortcut for saving (Ctrl+S / Cmd+S)
    useEffect(() => {
        const onKeyDown = (e) => {
            if (!isOpen) return;
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, currentPath, content, saving]);

    // Handle Tab key in textarea
    const handleTextareaKeyDown = (e) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const target = e.target;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const spaces = "  ";

            const newContent =
                content.substring(0, start) + spaces + content.substring(end);
            setContent(newContent);

            requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd =
                    start + spaces.length;
            });
        }
    };

    const handleScrollSync = (e) => {
        if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = e.target.scrollTop;
        }
    };

    if (!isOpen) return null;

    const ext = (fileMeta?.extension || currentPath.slice(currentPath.lastIndexOf(".")) || "").toLowerCase();
    const isHtml = ext === ".html" || ext === ".htm";
    const isSvg = ext === ".svg";
    const isMarkdown = ext === ".md";
    const isJson = ext === ".json";
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);

    // Compute line numbers
    const lines = content.split("\n");
    const lineCount = lines.length;

    // Viewport width styling
    const viewportWidths = {
        desktop: "100%",
        tablet: "768px",
        mobile: "375px",
    };

    return (
        <aside
            style={{
                width: "50%",
                minWidth: "460px",
                maxWidth: "850px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-card)",
                zIndex: 30,
                position: "relative",
                boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.08)",
                transition: "width 0.2s ease",
            }}
        >
            {/* Top Header / Action Bar */}
            <header
                style={{
                    padding: "0.6rem 1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-secondary)",
                    gap: "0.75rem",
                    flexShrink: 0,
                }}
            >
                {/* File picker & Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, position: "relative" }}>
                    <div
                        style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "rgba(217, 119, 6, 0.12)",
                            color: "var(--accent-terracotta)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        {isHtml || isSvg ? <FileCode size={15} /> : <FileText size={15} />}
                    </div>

                    {/* File Dropdown trigger */}
                    <div style={{ minWidth: 0 }}>
                        <button
                            onClick={() => setShowFilePicker(!showFilePicker)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                background: "none",
                                border: "none",
                                padding: "0.2rem 0.4rem",
                                borderRadius: "4px",
                                cursor: "pointer",
                                textAlign: "left",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                            <span
                                style={{
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    maxWidth: "180px",
                                }}
                            >
                                {fileMeta?.name || currentPath.split("/").pop() || "Workspace File"}
                            </span>
                            {isDirty && (
                                <span
                                    title="Unsaved changes"
                                    style={{
                                        width: "7px",
                                        height: "7px",
                                        borderRadius: "50%",
                                        backgroundColor: "#f59e0b",
                                        display: "inline-block",
                                    }}
                                />
                            )}
                            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
                        </button>

                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", paddingLeft: "0.4rem" }}>
                            workspace/{currentPath}
                        </div>
                    </div>

                    {/* Workspace Files dropdown menu */}
                    {showFilePicker && (
                        <div
                            style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                marginTop: "6px",
                                width: "260px",
                                maxHeight: "300px",
                                overflowY: "auto",
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-sm)",
                                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                                zIndex: 100,
                                padding: "0.35rem 0",
                            }}
                        >
                            <div
                                style={{
                                    padding: "0.35rem 0.75rem",
                                    fontSize: "0.7rem",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    color: "var(--text-muted)",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                }}
                            >
                                <Folder size={12} />
                                <span>Workspace Files</span>
                            </div>
                            {workspaceFiles.length === 0 ? (
                                <div style={{ padding: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center" }}>
                                    No files in workspace
                                </div>
                            ) : (
                                workspaceFiles.map((f) => (
                                    <div
                                        key={f.path}
                                        onClick={() => {
                                            setShowFilePicker(false);
                                            setCurrentPath(f.path);
                                            if (onFileSelected) onFileSelected(f.path);
                                        }}
                                        style={{
                                            padding: "0.45rem 0.75rem",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            fontSize: "0.8rem",
                                            color: f.path === currentPath ? "var(--accent-terracotta)" : "var(--text-primary)",
                                            backgroundColor: f.path === currentPath ? "var(--bg-secondary)" : "transparent",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card-hover)")}
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                f.path === currentPath ? "var(--bg-secondary)" : "transparent")
                                        }
                                    >
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {f.path}
                                        </span>
                                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                            {f.size ? `${(f.size / 1024).toFixed(1)}k` : ""}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Center: Segmented Control Tabs (Preview / Code) */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        backgroundColor: "var(--bg-primary)",
                        padding: "2px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                    }}
                >
                    <button
                        onClick={() => setActiveTab("code")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.3rem 0.65rem",
                            fontSize: "0.76rem",
                            fontWeight: 500,
                            borderRadius: "4px",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: activeTab === "code" ? "var(--bg-card)" : "transparent",
                            color: activeTab === "code" ? "var(--text-primary)" : "var(--text-muted)",
                            boxShadow: activeTab === "code" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <Code size={13} />
                        <span>Code / Edit</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("preview")}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            padding: "0.3rem 0.65rem",
                            fontSize: "0.76rem",
                            fontWeight: 500,
                            borderRadius: "4px",
                            border: "none",
                            cursor: "pointer",
                            backgroundColor: activeTab === "preview" ? "var(--bg-card)" : "transparent",
                            color: activeTab === "preview" ? "var(--text-primary)" : "var(--text-muted)",
                            boxShadow: activeTab === "preview" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                            transition: "all 0.15s ease",
                        }}
                    >
                        <Eye size={13} />
                        <span>Preview</span>
                    </button>
                </div>

                {/* Right Actions: Copy, Browser Open, Save, Close */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                    {/* Copy Code Button */}
                    <button
                        onClick={handleCopy}
                        title="Copy code to clipboard"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.35rem 0.55rem",
                            fontSize: "0.74rem",
                            borderRadius: "4px",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor: "var(--bg-card)",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                        {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                    </button>

                    {/* Open in Browser Tab */}
                    <button
                        onClick={handleOpenInBrowser}
                        title="Open file directly in new browser tab"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.35rem 0.55rem",
                            fontSize: "0.74rem",
                            borderRadius: "4px",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor: "var(--bg-card)",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    >
                        <ExternalLink size={13} />
                        <span>Browser</span>
                    </button>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={saving || !isDirty}
                        title={isDirty ? "Save changes (Ctrl+S)" : "All changes saved"}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.35rem 0.55rem",
                            fontSize: "0.74rem",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: isDirty ? "var(--accent-terracotta)" : "var(--bg-secondary)",
                            color: isDirty ? "#fff" : "var(--text-muted)",
                            cursor: isDirty ? "pointer" : "default",
                            opacity: isDirty ? 1 : 0.6,
                        }}
                    >
                        <Save size={13} />
                        <span>{saving ? "Saving..." : saveToast ? "Saved!" : "Save"}</span>
                    </button>

                    {/* Close Panel */}
                    <button
                        onClick={onClose}
                        title="Close panel"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            borderRadius: "4px",
                            border: "none",
                            backgroundColor: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            marginLeft: "0.2rem",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                            e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.color = "var(--text-muted)";
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            </header>

            {/* Error banner if any */}
            {error && (
                <div
                    style={{
                        padding: "0.6rem 1rem",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderBottom: "1px solid rgba(239, 68, 68, 0.25)",
                        color: "#ef4444",
                        fontSize: "0.78rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                    }}
                >
                    <AlertCircle size={15} />
                    <span>{error}</span>
                </div>
            )}

            {/* Body: Preview Panel OR Edit Panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
                {loading ? (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            gap: "0.5rem",
                            fontSize: "0.85rem",
                        }}
                    >
                        <RotateCw size={22} className="spin-animate" />
                        <span>Loading file...</span>
                    </div>
                ) : activeTab === "preview" ? (
                    /* ── PREVIEW PANEL ── */
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
                        {/* Subheader controls for HTML & Web previews */}
                        {isHtml && (
                            <div
                                style={{
                                    padding: "0.4rem 0.75rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    backgroundColor: "var(--bg-secondary)",
                                    fontSize: "0.74rem",
                                    color: "var(--text-muted)",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                        Interactive Web Preview
                                    </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                                    <button
                                        onClick={() => setViewport("desktop")}
                                        title="Desktop view"
                                        style={{
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "3px",
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor: viewport === "desktop" ? "var(--bg-card)" : "transparent",
                                            color: viewport === "desktop" ? "var(--accent-terracotta)" : "var(--text-muted)",
                                        }}
                                    >
                                        <Monitor size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewport("tablet")}
                                        title="Tablet view (768px)"
                                        style={{
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "3px",
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor: viewport === "tablet" ? "var(--bg-card)" : "transparent",
                                            color: viewport === "tablet" ? "var(--accent-terracotta)" : "var(--text-muted)",
                                        }}
                                    >
                                        <Tablet size={14} />
                                    </button>
                                    <button
                                        onClick={() => setViewport("mobile")}
                                        title="Mobile view (375px)"
                                        style={{
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "3px",
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor: viewport === "mobile" ? "var(--bg-card)" : "transparent",
                                            color: viewport === "mobile" ? "var(--accent-terracotta)" : "var(--text-muted)",
                                        }}
                                    >
                                        <Smartphone size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (iframeRef.current) {
                                                iframeRef.current.src = iframeRef.current.src;
                                            }
                                        }}
                                        title="Reload preview"
                                        style={{
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "3px",
                                            border: "none",
                                            cursor: "pointer",
                                            backgroundColor: "transparent",
                                            color: "var(--text-muted)",
                                        }}
                                    >
                                        <RotateCw size={13} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Preview Display Area */}
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "stretch",
                                overflow: "auto",
                                padding: isHtml ? "0.5rem" : "1rem",
                                backgroundColor: isHtml ? "var(--bg-secondary)" : "var(--bg-primary)",
                            }}
                        >
                            {isHtml ? (
                                <div
                                    style={{
                                        width: viewportWidths[viewport] || "100%",
                                        height: "100%",
                                        borderRadius: viewport !== "desktop" ? "8px" : "4px",
                                        overflow: "hidden",
                                        boxShadow: viewport !== "desktop" ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
                                        backgroundColor: "#ffffff",
                                        transition: "width 0.2s ease",
                                    }}
                                >
                                    <iframe
                                        ref={iframeRef}
                                        title="Preview"
                                        srcDoc={isDirty ? content : undefined}
                                        src={!isDirty ? getWorkspaceRawUrl(currentPath) : undefined}
                                        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
                                        style={{
                                            width: "100%",
                                            height: "100%",
                                            border: "none",
                                            backgroundColor: "#ffffff",
                                        }}
                                    />
                                </div>
                            ) : isSvg ? (
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "var(--bg-card)",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-subtle)",
                                        overflow: "auto",
                                        padding: "1rem",
                                    }}
                                    dangerouslySetInnerHTML={{ __html: content }}
                                />
                            ) : isMarkdown ? (
                                <div
                                    style={{
                                        width: "100%",
                                        maxWidth: "800px",
                                        margin: "0 auto",
                                        backgroundColor: "var(--bg-card)",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-subtle)",
                                        padding: "1.5rem",
                                        overflowY: "auto",
                                    }}
                                >
                                    <div className="markdown-body" style={{ fontSize: "0.88rem", lineHeight: 1.6 }}>
                                        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)" }}>{content}</pre>
                                    </div>
                                </div>
                            ) : isJson ? (
                                <div
                                    style={{
                                        width: "100%",
                                        backgroundColor: "var(--bg-card)",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-subtle)",
                                        padding: "1rem",
                                        overflow: "auto",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.82rem",
                                    }}
                                >
                                    <pre style={{ margin: 0 }}>
                                        <code>
                                            {(() => {
                                                try {
                                                    return JSON.stringify(JSON.parse(content), null, 2);
                                                } catch {
                                                    return content;
                                                }
                                            })()}
                                        </code>
                                    </pre>
                                </div>
                            ) : isImage ? (
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "auto",
                                    }}
                                >
                                    <img
                                        src={getWorkspaceRawUrl(currentPath)}
                                        alt={currentPath}
                                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                                    />
                                </div>
                            ) : (
                                /* Plain code preview fallback */
                                <div
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        backgroundColor: "var(--bg-card)",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-subtle)",
                                        padding: "1rem",
                                        overflow: "auto",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.82rem",
                                    }}
                                >
                                    <pre style={{ margin: 0 }}>
                                        <code>{content}</code>
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ── IN-APP EDIT PANEL ── */
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
                        {/* Editor Container with Line Numbers */}
                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                overflow: "hidden",
                                position: "relative",
                                backgroundColor: "var(--bg-card)",
                            }}
                        >
                            {/* Gutter / Line numbers */}
                            <div
                                ref={lineNumbersRef}
                                style={{
                                    width: "48px",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRight: "1px solid var(--border-subtle)",
                                    padding: "0.75rem 0.5rem",
                                    textAlign: "right",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.8rem",
                                    lineHeight: "1.5rem",
                                    color: "var(--text-muted)",
                                    userSelect: "none",
                                    overflowY: "hidden",
                                    flexShrink: 0,
                                }}
                            >
                                {Array.from({ length: lineCount }, (_, i) => (
                                    <div key={i + 1}>{i + 1}</div>
                                ))}
                            </div>

                            {/* Textarea Code Editor */}
                            <textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={handleTextareaKeyDown}
                                onScroll={handleScrollSync}
                                spellCheck={false}
                                placeholder="Write or edit code here..."
                                style={{
                                    flex: 1,
                                    height: "100%",
                                    border: "none",
                                    outline: "none",
                                    resize: "none",
                                    padding: "0.75rem 1rem",
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.82rem",
                                    lineHeight: "1.5rem",
                                    color: "var(--text-primary)",
                                    backgroundColor: "transparent",
                                    whiteSpace: "pre",
                                    overflowWrap: "normal",
                                    overflowX: "auto",
                                    tabSize: 2,
                                }}
                            />
                        </div>

                        {/* Editor Footer Status Bar */}
                        <footer
                            style={{
                                padding: "0.35rem 0.75rem",
                                borderTop: "1px solid var(--border-subtle)",
                                backgroundColor: "var(--bg-secondary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span>{lineCount} lines</span>
                                <span>{content.length} chars</span>
                                <span>{ext || "plaintext"}</span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span style={{ opacity: 0.8 }}>Ctrl+S to save • Tab to indent</span>
                                {isDirty ? (
                                    <span style={{ color: "#f59e0b", fontWeight: 500 }}>Unsaved changes</span>
                                ) : (
                                    <span style={{ color: "#16a34a", fontWeight: 500 }}>All changes saved</span>
                                )}
                            </div>
                        </footer>
                    </div>
                )}
            </div>
        </aside>
    );
}
