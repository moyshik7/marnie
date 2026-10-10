import React, { useState, useEffect, useRef } from "react";
import {
    Database,
    Plus,
    X,
    Trash2,
    Eye,
    FileText,
    Code,
    Clipboard,
    UploadCloud,
    Search,
    Copy,
    Check,
    CheckCircle2,
    AlertCircle,
    FileCode,
} from "lucide-react";
import {
    listCapacityDocuments,
    getCapacityDocument,
    uploadCapacityDocuments,
    deleteCapacityDocument,
    searchCapacityDocuments,
} from "../services/api";

export default function ExpandedCapacityView({ onClose }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);

    // Preview state
    const [previewDoc, setPreviewDoc] = useState(null);
    const [copiedPreview, setCopiedPreview] = useState(false);

    // Copied text paste modal state
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [pasteTitle, setPasteTitle] = useState("");
    const [pasteContent, setPasteContent] = useState("");
    const [pasteCategory, setPasteCategory] = useState("General");

    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await listCapacityDocuments();
            setDocuments(data?.documents || []);
        } catch (err) {
            console.error("Failed to load Expanded Capacity documents:", err);
            showStatus("Failed to load documents", "error");
        } finally {
            setLoading(false);
        }
    };

    const showStatus = (msg, type = "success") => {
        setStatusMessage({ text: msg, type });
        setTimeout(() => setStatusMessage(null), 3500);
    };

    // Process File objects
    const handleFiles = async (filesList) => {
        if (!filesList || filesList.length === 0) return;
        const validExtensions = [".md", ".markdown", ".txt", ".text"];
        const filesToUpload = [];

        for (const file of Array.from(filesList)) {
            const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
            if (!validExtensions.includes(ext)) {
                // Ignore or skip non-text/markdown files
                continue;
            }

            try {
                const text = await file.text();
                filesToUpload.push({
                    name: file.name,
                    content: text,
                    type: ext.replace(/^\./, ""),
                    category: "General",
                });
            } catch (err) {
                console.warn(`Error reading file ${file.name}:`, err);
            }
        }

        if (filesToUpload.length === 0) {
            showStatus("Please upload Markdown (.md) or Text (.txt) files.", "error");
            return;
        }

        setUploading(true);
        try {
            await uploadCapacityDocuments(filesToUpload);
            showStatus(`Successfully uploaded ${filesToUpload.length} file(s) to Expanded Capacity!`);
            await fetchDocuments();
        } catch (err) {
            console.error("Upload error:", err);
            showStatus(`Upload failed: ${err.message}`, "error");
        } finally {
            setUploading(false);
        }
    };

    // Drag and Drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Check if leaving to outside the container
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer?.files?.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    // Handle Delete
    const handleDelete = async (docId, docName, e) => {
        if (e) e.stopPropagation();
        if (!confirm(`Delete "${docName}" from Expanded Capacity?`)) return;

        try {
            await deleteCapacityDocument(docId);
            setDocuments((prev) => prev.filter((d) => d.id !== docId));
            if (previewDoc && previewDoc.id === docId) {
                setPreviewDoc(null);
            }
            showStatus(`Deleted "${docName}".`);
        } catch (err) {
            console.error("Delete error:", err);
            showStatus(`Failed to delete: ${err.message}`, "error");
        }
    };

    // Handle Open Preview (fetch full content if not already present)
    const handleOpenPreview = async (doc) => {
        try {
            if (doc.content) {
                setPreviewDoc(doc);
            } else {
                const res = await getCapacityDocument(doc.id);
                setPreviewDoc(res.document || doc);
            }
        } catch (err) {
            console.error("Failed to load document preview:", err);
            setPreviewDoc(doc);
        }
    };

    // Handle Pasted Text Submission
    const handleSavePastedText = async (e) => {
        e.preventDefault();
        if (!pasteTitle.trim() || !pasteContent.trim()) {
            alert("Please provide both a title and content.");
            return;
        }

        let filename = pasteTitle.trim();
        if (!filename.includes(".")) {
            filename += ".txt";
        }

        setUploading(true);
        try {
            await uploadCapacityDocuments({
                name: filename,
                content: pasteContent,
                type: filename.endsWith(".md") ? "md" : "txt",
                category: pasteCategory.trim() || "General",
            });
            setIsPasteModalOpen(false);
            setPasteTitle("");
            setPasteContent("");
            showStatus(`Added "${filename}" to Expanded Capacity!`);
            await fetchDocuments();
        } catch (err) {
            alert(`Error adding text: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    // Filter documents based on search query
    const filteredDocuments = documents.filter((doc) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            doc.name.toLowerCase().includes(q) ||
            (doc.category && doc.category.toLowerCase().includes(q)) ||
            (doc.snippet && doc.snippet.toLowerCase().includes(q))
        );
    });

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "var(--bg-primary)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {/* Drag & Drop Visual Overlay */}
            {isDragging && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(200, 91, 56, 0.08)",
                        border: "3px dashed var(--accent-terracotta)",
                        zIndex: 999,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "1rem",
                        backdropFilter: "blur(2px)",
                        pointerEvents: "none",
                    }}
                >
                    <UploadCloud size={52} color="var(--accent-terracotta)" />
                    <div
                        style={{
                            fontSize: "1.25rem",
                            fontWeight: 600,
                            color: "var(--accent-terracotta)",
                        }}
                    >
                        Drop Markdown (.md) or Text (.txt) files here
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        Files will be indexed in Expanded Capacity SQLite
                    </div>
                </div>
            )}

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
                        <Database size={20} />
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
                            Expanded Capacity
                        </h1>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                            Add files to reference in your notebook
                        </p>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {/* Status notification toast */}
                    {statusMessage && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.35rem 0.75rem",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                backgroundColor:
                                    statusMessage.type === "error"
                                        ? "rgba(239, 68, 68, 0.12)"
                                        : "rgba(34, 197, 94, 0.12)",
                                color:
                                    statusMessage.type === "error"
                                        ? "#DC2626"
                                        : "#16A34A",
                                border:
                                    statusMessage.type === "error"
                                        ? "1px solid rgba(239, 68, 68, 0.25)"
                                        : "1px solid rgba(34, 197, 94, 0.25)",
                            }}
                        >
                            {statusMessage.type === "error" ? (
                                <AlertCircle size={14} />
                            ) : (
                                <CheckCircle2 size={14} />
                            )}
                            <span>{statusMessage.text}</span>
                        </div>
                    )}

                    {/* Close button to return to chat */}
                    <button
                        onClick={onClose}
                        title="Close Expanded Capacity"
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
                </div>
            </header>

            {/* Main Content Body */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    overflow: "hidden",
                }}
            >
                {/* Left Action Column (Upload buttons, pasted text, stats) */}
                <aside
                    style={{
                        width: "230px",
                        borderRight: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                        padding: "1.5rem 1.1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                        flexShrink: 0,
                    }}
                >
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".md,.markdown,.txt,.text"
                        style={{ display: "none" }}
                        onChange={(e) => {
                            if (e.target.files) handleFiles(e.target.files);
                            e.target.value = "";
                        }}
                    />

                    {/* Upload Files Button (Primary rounded action button matching screenshot) */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "12px",
                            backgroundColor: "var(--bg-card)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-subtle)",
                            cursor: uploading ? "not-allowed" : "pointer",
                            fontWeight: 500,
                            fontSize: "0.88rem",
                            boxShadow: "var(--shadow-sm)",
                            transition: "all 0.15s ease",
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
                        <Plus size={16} color="var(--accent-terracotta)" />
                        <span>{uploading ? "Uploading..." : "Upload files"}</span>
                    </button>

                    {/* Copied Text Button */}
                    <button
                        onClick={() => setIsPasteModalOpen(true)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.65rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "12px",
                            backgroundColor: "var(--bg-card)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-subtle)",
                            cursor: "pointer",
                            fontWeight: 500,
                            fontSize: "0.88rem",
                            boxShadow: "var(--shadow-sm)",
                            transition: "all 0.15s ease",
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
                        <Clipboard size={16} color="var(--accent-terracotta)" />
                        <span>Copied text</span>
                    </button>

                    {/* Search filter in notebook */}
                    <div style={{ marginTop: "0.75rem" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.45rem",
                                padding: "0.45rem 0.65rem",
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "8px",
                            }}
                        >
                            <Search size={14} color="var(--text-muted)" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    fontSize: "0.8rem",
                                    color: "var(--text-primary)",
                                    width: "100%",
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    style={{
                                        border: "none",
                                        background: "none",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        padding: 0,
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Summary stats */}
                    <div
                        style={{
                            marginTop: "auto",
                            padding: "0.85rem",
                            borderRadius: "10px",
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-subtle)",
                            fontSize: "0.78rem",
                            color: "var(--text-secondary)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Total Files</span>
                            <strong style={{ color: "var(--text-primary)" }}>{documents.length}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Indexed Words</span>
                            <strong style={{ color: "var(--text-primary)" }}>
                                {documents.reduce((acc, d) => acc + (d.word_count || 0), 0).toLocaleString()}
                            </strong>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                            Drag and drop .md or .txt files anywhere.
                        </div>
                    </div>
                </aside>

                {/* Center Grid of Cards */}
                <main
                    style={{
                        flex: 1,
                        padding: "2rem",
                        overflowY: "auto",
                        backgroundColor: "var(--bg-primary)",
                    }}
                >
                    {loading ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                color: "var(--text-muted)",
                                fontSize: "0.9rem",
                            }}
                        >
                            Loading Expanded Capacity documents...
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                gap: "1rem",
                                padding: "2rem",
                            }}
                        >
                            <div
                                style={{
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "16px",
                                    backgroundColor: "var(--bg-secondary)",
                                    border: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--text-muted)",
                                }}
                            >
                                <Database size={28} />
                            </div>
                            <div>
                                <h3
                                    style={{
                                        fontSize: "1.1rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        marginBottom: "0.35rem",
                                    }}
                                >
                                    {searchQuery ? "No matching files found" : "No reference files in notebook"}
                                </h3>
                                <p style={{ fontSize: "0.85rem", maxWidth: "400px" }}>
                                    {searchQuery
                                        ? `No documents matched "${searchQuery}". Try another search term.`
                                        : "Drag and drop markdown (.md) or text (.txt) files here, or click '+ Upload files' to start reference indexing."}
                                </p>
                            </div>
                            {!searchQuery && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        padding: "0.6rem 1.2rem",
                                        borderRadius: "10px",
                                        backgroundColor: "var(--accent-terracotta)",
                                        color: "#ffffff",
                                        border: "none",
                                        cursor: "pointer",
                                        fontWeight: 500,
                                        fontSize: "0.85rem",
                                        marginTop: "0.5rem",
                                    }}
                                >
                                    <Plus size={16} />
                                    <span>Upload files</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 160px))",
                                gap: "1rem",
                                alignContent: "flex-start",
                            }}
                        >
                            {filteredDocuments.map((doc) => {
                                const isMarkdown =
                                    doc.type === "md" ||
                                    doc.type === "markdown" ||
                                    doc.name.endsWith(".md") ||
                                    doc.name.endsWith(".markdown");

                                return (
                                    <div
                                        key={doc.id}
                                        onClick={() => handleOpenPreview(doc)}
                                        title={`${doc.name} (Click to preview)`}
                                        style={{
                                            position: "relative",
                                            height: "150px",
                                            borderRadius: "16px",
                                            backgroundColor: "var(--bg-card)",
                                            border: "1px solid var(--border-subtle)",
                                            padding: "1rem",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "space-between",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            boxShadow: "var(--shadow-sm)",
                                            userSelect: "none",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = "var(--border-strong)";
                                            e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                                            e.currentTarget.style.transform = "translateY(-2px)";
                                            e.currentTarget.style.boxShadow = "var(--shadow-md)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = "var(--border-subtle)";
                                            e.currentTarget.style.backgroundColor = "var(--bg-card)";
                                            e.currentTarget.style.transform = "translateY(0)";
                                            e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                                        }}
                                    >
                                        {/* Card Top: Type badge & Delete action */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            {/* Badge icon matching screenshot: red/coral < > for code/markdown, blue for text */}
                                            <div
                                                style={{
                                                    width: "30px",
                                                    height: "30px",
                                                    borderRadius: "8px",
                                                    backgroundColor: isMarkdown ? "#d9483b" : "#2563eb",
                                                    color: "#ffffff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: "0.85rem",
                                                    fontWeight: 700,
                                                    letterSpacing: "-0.05em",
                                                }}
                                            >
                                                {isMarkdown ? (
                                                    <span>&lt;&gt;</span>
                                                ) : (
                                                    <FileText size={15} />
                                                )}
                                            </div>

                                            {/* Delete action button */}
                                            <button
                                                onClick={(e) => handleDelete(doc.id, doc.name, e)}
                                                title="Delete file"
                                                style={{
                                                    background: "none",
                                                    border: "none",
                                                    color: "var(--text-muted)",
                                                    cursor: "pointer",
                                                    padding: "0.2rem",
                                                    borderRadius: "4px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    transition: "color 0.15s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = "#EF4444";
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = "var(--text-muted)";
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        {/* Card Bottom: File Name and metadata */}
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: "0.86rem",
                                                    fontWeight: 600,
                                                    color: "var(--text-primary)",
                                                    lineHeight: 1.25,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    wordBreak: "break-word",
                                                }}
                                            >
                                                {doc.name}
                                            </div>

                                            <div
                                                style={{
                                                    fontSize: "0.7rem",
                                                    color: "var(--text-muted)",
                                                    marginTop: "0.25rem",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                }}
                                            >
                                                <span>{formatBytes(doc.size)}</span>
                                                {doc.word_count > 0 && (
                                                    <span>{doc.word_count} words</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
            </div>

            {/* Read-Only Preview Modal ("can be previewed or deleted (not edited)") */}
            {previewDoc && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1.5rem",
                    }}
                    onClick={() => setPreviewDoc(null)}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "760px",
                            maxHeight: "85vh",
                            backgroundColor: "var(--bg-card)",
                            borderRadius: "16px",
                            border: "1px solid var(--border-subtle)",
                            boxShadow: "var(--shadow-lg)",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
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
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "8px",
                                        backgroundColor:
                                            previewDoc.type === "md" || previewDoc.name.endsWith(".md")
                                                ? "#d9483b"
                                                : "#2563eb",
                                        color: "#ffffff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 700,
                                        fontSize: "0.85rem",
                                        flexShrink: 0,
                                    }}
                                >
                                    {previewDoc.type === "md" || previewDoc.name.endsWith(".md") ? (
                                        <span>&lt;&gt;</span>
                                    ) : (
                                        <FileText size={16} />
                                    )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <h2
                                        style={{
                                            fontSize: "1.05rem",
                                            fontWeight: 600,
                                            color: "var(--text-primary)",
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                        }}
                                    >
                                        {previewDoc.name}
                                    </h2>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                        {formatBytes(previewDoc.size)} &bull;{" "}
                                        {previewDoc.word_count ? `${previewDoc.word_count} words` : "Text"} &bull;{" "}
                                        Read-Only Preview
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(previewDoc.content || "");
                                        setCopiedPreview(true);
                                        setTimeout(() => setCopiedPreview(false), 2000);
                                    }}
                                    title="Copy content"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.35rem",
                                        padding: "0.4rem 0.75rem",
                                        borderRadius: "6px",
                                        backgroundColor: "var(--bg-card)",
                                        border: "1px solid var(--border-subtle)",
                                        color: "var(--text-secondary)",
                                        fontSize: "0.78rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    {copiedPreview ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
                                    <span>{copiedPreview ? "Copied" : "Copy"}</span>
                                </button>

                                <button
                                    onClick={() => setPreviewDoc(null)}
                                    title="Close"
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-secondary)",
                                        cursor: "pointer",
                                        padding: "0.3rem",
                                        borderRadius: "4px",
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Read-only Content display */}
                        <div
                            style={{
                                flex: 1,
                                padding: "1.5rem",
                                overflowY: "auto",
                                backgroundColor: "var(--bg-primary)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.85rem",
                                lineHeight: 1.6,
                                color: "var(--text-primary)",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                maxHeight: "60vh",
                            }}
                        >
                            {previewDoc.content || "(Empty file content)"}
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                padding: "0.85rem 1.5rem",
                                borderTop: "1px solid var(--border-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: "var(--bg-secondary)",
                            }}
                        >
                            <button
                                onClick={() => handleDelete(previewDoc.id, previewDoc.name)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    padding: "0.45rem 0.85rem",
                                    borderRadius: "6px",
                                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.25)",
                                    color: "#DC2626",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                }}
                            >
                                <Trash2 size={13} />
                                <span>Delete file</span>
                            </button>

                            <button
                                onClick={() => setPreviewDoc(null)}
                                style={{
                                    padding: "0.45rem 1rem",
                                    borderRadius: "6px",
                                    backgroundColor: "var(--bg-card)",
                                    border: "1px solid var(--border-strong)",
                                    color: "var(--text-primary)",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Copied Text Modal */}
            {isPasteModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "1.5rem",
                    }}
                    onClick={() => setIsPasteModalOpen(false)}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: "580px",
                            backgroundColor: "var(--bg-card)",
                            borderRadius: "16px",
                            border: "1px solid var(--border-subtle)",
                            boxShadow: "var(--shadow-lg)",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                padding: "1.1rem 1.5rem",
                                borderBottom: "1px solid var(--border-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: "var(--bg-secondary)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                <Clipboard size={18} color="var(--accent-terracotta)" />
                                <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                    Add Copied Text to Expanded Capacity
                                </h2>
                            </div>
                            <button
                                onClick={() => setIsPasteModalOpen(false)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-secondary)",
                                    cursor: "pointer",
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePastedText} style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.3rem",
                                        }}
                                    >
                                        Document Title (e.g. notes.txt or spec.md)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Reference Title"
                                        value={pasteTitle}
                                        onChange={(e) => setPasteTitle(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            borderRadius: "8px",
                                            backgroundColor: "var(--bg-primary)",
                                            border: "1px solid var(--border-subtle)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.85rem",
                                            outline: "none",
                                        }}
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.3rem",
                                        }}
                                    >
                                        Content
                                    </label>
                                    <textarea
                                        rows={8}
                                        placeholder="Paste text or markdown content here..."
                                        value={pasteContent}
                                        onChange={(e) => setPasteContent(e.target.value)}
                                        required
                                        style={{
                                            width: "100%",
                                            padding: "0.65rem 0.75rem",
                                            borderRadius: "8px",
                                            backgroundColor: "var(--bg-primary)",
                                            border: "1px solid var(--border-subtle)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.84rem",
                                            fontFamily: "var(--font-mono)",
                                            outline: "none",
                                            resize: "vertical",
                                        }}
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    padding: "0.85rem 1.5rem",
                                    borderTop: "1px solid var(--border-subtle)",
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: "0.5rem",
                                    backgroundColor: "var(--bg-secondary)",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setIsPasteModalOpen(false)}
                                    style={{
                                        padding: "0.45rem 0.85rem",
                                        borderRadius: "6px",
                                        backgroundColor: "var(--bg-card)",
                                        border: "1px solid var(--border-subtle)",
                                        color: "var(--text-secondary)",
                                        fontSize: "0.8rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    style={{
                                        padding: "0.45rem 1rem",
                                        borderRadius: "6px",
                                        backgroundColor: "var(--accent-terracotta)",
                                        border: "none",
                                        color: "#ffffff",
                                        fontSize: "0.8rem",
                                        fontWeight: 500,
                                        cursor: uploading ? "not-allowed" : "pointer",
                                    }}
                                >
                                    {uploading ? "Saving..." : "Save Reference"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
