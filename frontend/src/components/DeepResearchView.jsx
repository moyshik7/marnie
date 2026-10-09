import React, { useState, useEffect } from "react";
import {
    Microscope,
    Plus,
    Play,
    Pause,
    Trash2,
    RefreshCw,
    ExternalLink,
    Clock,
    Check,
    Copy,
    ChevronDown,
    ChevronUp,
    MessageSquare,
    X,
    Search,
    BookOpen,
    Layers,
    FileText,
    Sliders,
} from "lucide-react";
import {
    listResearches,
    startDeepResearch,
    cancelDeepResearch,
    deleteDeepResearch,
    clearAllResearches,
    getResearch,
} from "../services/api";

function slugify(text) {
    if (!text || typeof text !== "string") return `report-${Date.now()}`;
    const base = text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return base ? base.slice(0, 80) : `report-${Date.now()}`;
}

function formatDuration(duration) {
    if (!duration) return "8:53";
    if (typeof duration === "string") return duration;
    const mins = Math.floor(duration / 60);
    const secs = Math.floor(duration % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function DeepResearchView({
    activeModel,
    availableModels = [],
    onClose,
    onDiscuss,
    onResearchCountChange,
}) {
    const [researches, setResearches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPastResearchExpanded, setIsPastResearchExpanded] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [copiedId, setCopiedId] = useState(null);

    // Form inputs for new research
    const [topic, setTopic] = useState("");
    const [model, setModel] = useState(
        activeModel || (availableModels.length > 0 ? availableModels[0] : "qwen3.5:9b")
    );
    const [minRevisions, setMinRevisions] = useState(1);
    const [maxRevisions, setMaxRevisions] = useState(3);
    const [maxResults, setMaxResults] = useState(5);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (availableModels && availableModels.length > 0) {
            if (!model || model === "llama3.2" || !availableModels.includes(model)) {
                const preferred =
                    activeModel && availableModels.includes(activeModel)
                        ? activeModel
                        : availableModels[0];
                setModel(preferred);
            }
        } else if (activeModel && activeModel !== "llama3.2") {
            setModel(activeModel);
        }
    }, [availableModels, activeModel]);

    // Initial load and periodic polling
    useEffect(() => {
        fetchResearches();
        const interval = setInterval(fetchResearches, 3500);
        return () => clearInterval(interval);
    }, []);

    const fetchResearches = async () => {
        try {
            const data = await listResearches();
            const list = data?.researches || [];
            setResearches(list);
            const hasOngoing = list.some((r) => r.status === "in_progress");
            if (onResearchCountChange) {
                onResearchCountChange(hasOngoing);
            }
        } catch (err) {
            console.warn("Failed to fetch researches:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e?.preventDefault();
        if (!topic.trim() || submitting) return;

        setSubmitting(true);
        try {
            const chosenModel =
                model ||
                activeModel ||
                (availableModels.length > 0 ? availableModels[0] : "qwen3.5:9b");

            await startDeepResearch({
                topic: topic.trim(),
                model: chosenModel,
                minRevisions: parseInt(minRevisions, 10) || 1,
                maxRevisions: parseInt(maxRevisions, 10) || 3,
                maxResults: parseInt(maxResults, 10) || 5,
            });

            setTopic("");
            await fetchResearches();
        } catch (err) {
            alert(`Error launching research: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id, e) => {
        e?.stopPropagation();
        try {
            await cancelDeepResearch(id);
            await fetchResearches();
        } catch (err) {
            alert(`Failed to cancel research: ${err.message}`);
        }
    };

    const handleDelete = async (id, e) => {
        e?.stopPropagation();
        if (!confirm("Are you sure you want to delete this research?")) return;
        try {
            // Optimistically remove from state immediately
            setResearches((prev) => prev.filter((r) => r.id !== id));
            await deleteDeepResearch(id);
            await fetchResearches();
        } catch (err) {
            alert(`Failed to delete research: ${err.message}`);
            await fetchResearches();
        }
    };

    const handleClearAll = async () => {
        if (!confirm("Are you sure you want to clear all past research history?")) return;
        try {
            await clearAllResearches();
            await fetchResearches();
        } catch (err) {
            alert(`Failed to clear past research: ${err.message}`);
        }
    };

    const handleVisualReport = (r) => {
        const targetSlug =
            r.slug ||
            (r.error && r.error.endsWith(".md") ? r.error : null) ||
            `${slugify(r.topic)}.md`;
        window.open(`/report/${targetSlug}`, "_blank");
    };

    const handleDiscuss = (r) => {
        if (onDiscuss) {
            onDiscuss(r.topic, r.report);
        } else if (onClose) {
            onClose();
        }
    };

    const handleCopy = (r, e) => {
        e?.stopPropagation();
        const textToCopy = r.report || r.summary || r.topic;
        navigator.clipboard.writeText(textToCopy);
        setCopiedId(r.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const ongoingResearch = researches.find((r) => r.status === "in_progress");

    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "var(--bg-primary)",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                padding: "2rem",
            }}
        >
            <div style={{ maxWidth: "980px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "8px",
                                backgroundColor: "rgba(217, 119, 6, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--accent-gold)",
                            }}
                        >
                            <Microscope size={20} />
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
                                Deep Research
                            </h1>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                                Autonomous multi-angle exploration, iterative review, and structured dossiers
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.45rem 0.85rem",
                            borderRadius: "6px",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-secondary)",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                        }}
                    >
                        <Sliders size={13} />
                        <span>Parameters</span>
                    </button>
                </div>

                {/* Launch Query Card */}
                <div
                    style={{
                        borderRadius: "12px",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-card)",
                        padding: "1.25rem 1.5rem",
                        boxShadow: "var(--shadow-sm)",
                    }}
                >
                    <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div style={{ position: "relative" }}>
                            <textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="What would you like to research deeply? e.g. 10 high-potential low-investment business ventures in Bangladesh for 2026..."
                                rows={3}
                                style={{
                                    width: "100%",
                                    padding: "0.85rem 1rem",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-strong)",
                                    backgroundColor: "var(--bg-secondary)",
                                    color: "var(--text-primary)",
                                    fontSize: "0.95rem",
                                    lineHeight: 1.5,
                                    outline: "none",
                                    resize: "vertical",
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        handleCreate(e);
                                    }
                                }}
                            />
                        </div>

                        {/* Collapsible Advanced Parameters */}
                        {showConfig && (
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                    gap: "1rem",
                                    padding: "1rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRadius: "8px",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                                        Model
                                    </label>
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.45rem 0.65rem",
                                            borderRadius: "6px",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.82rem",
                                            outline: "none",
                                        }}
                                    >
                                        {(availableModels.length > 0 ? availableModels : [model || activeModel || "qwen3.5:9b"]).map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                                        Min Revisions
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={minRevisions}
                                        onChange={(e) => setMinRevisions(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.45rem 0.65rem",
                                            borderRadius: "6px",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.82rem",
                                            outline: "none",
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                                        Max Revisions
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={maxRevisions}
                                        onChange={(e) => setMaxRevisions(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.45rem 0.65rem",
                                            borderRadius: "6px",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.82rem",
                                            outline: "none",
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                                        Sources per Query
                                    </label>
                                    <input
                                        type="number"
                                        min={3}
                                        max={15}
                                        value={maxResults}
                                        onChange={(e) => setMaxResults(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.45rem 0.65rem",
                                            borderRadius: "6px",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.82rem",
                                            outline: "none",
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                            <button
                                type="submit"
                                disabled={submitting || !topic.trim()}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.6rem 1.3rem",
                                    borderRadius: "8px",
                                    backgroundColor: "var(--accent-terracotta)",
                                    color: "#ffffff",
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    cursor: submitting || !topic.trim() ? "not-allowed" : "pointer",
                                    opacity: submitting || !topic.trim() ? 0.65 : 1,
                                    transition: "opacity 0.15s ease",
                                }}
                            >
                                <Play size={14} fill="currentColor" />
                                <span>{submitting ? "Initiating..." : "Start Deep Research"}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Ongoing Live Research Status Banner */}
                {ongoingResearch && (
                    <div
                        style={{
                            borderRadius: "12px",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            backgroundColor: "rgba(34, 197, 94, 0.05)",
                            padding: "1.25rem 1.5rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.85rem",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                                <span className="blinking-green-dot" style={{ width: "10px", height: "10px" }} />
                                <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                                    Research in Progress: {ongoingResearch.topic}
                                </span>
                            </div>
                            <button
                                onClick={(e) => handleCancel(ongoingResearch.id, e)}
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.35rem 0.75rem",
                                    borderRadius: "6px",
                                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                                    color: "#ef4444",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    border: "none",
                                }}
                            >
                                <Pause size={12} />
                                <span>Stop Run</span>
                            </button>
                        </div>

                        {ongoingResearch.logs && ongoingResearch.logs.length > 0 && (
                            <div
                                style={{
                                    fontSize: "0.78rem",
                                    color: "var(--text-muted)",
                                    fontFamily: "monospace",
                                    backgroundColor: "var(--bg-secondary)",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "6px",
                                    maxHeight: "120px",
                                    overflowY: "auto",
                                }}
                            >
                                {ongoingResearch.logs.slice(-3).map((l, i) => (
                                    <div key={i} style={{ lineHeight: 1.5 }}>
                                        <span style={{ opacity: 0.6 }}>[{new Date(l.timestamp).toLocaleTimeString()}]</span> {l.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* PAST RESEARCH SECTION (Exact Design Matching Image 0) */}
                <div
                    style={{
                        borderRadius: "12px",
                        border: "1px solid #2e2e34",
                        backgroundColor: "#1c1c1f",
                        padding: "1.25rem 1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                    }}
                >
                    {/* Header Row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff", margin: 0 }}>
                                    Past research
                                </h2>
                                <span style={{ fontSize: "0.82rem", color: "#8e8e93" }}>
                                    {researches.length} {researches.length === 1 ? "research" : "researches"}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#8e8e93", marginTop: "0.25rem" }}>
                                All past research found in:{" "}
                                <span style={{ textDecoration: "underline", color: "#a1a1aa", cursor: "pointer" }}>
                                    Library, Research
                                </span>
                            </div>
                        </div>

                        {/* Top Right Controls */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {researches.length > 0 && (
                                <button
                                    onClick={handleClearAll}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.3rem",
                                        padding: "0.35rem 0.75rem",
                                        borderRadius: "6px",
                                        backgroundColor: "#26262a",
                                        border: "1px solid #383840",
                                        color: "#a1a1aa",
                                        fontSize: "0.75rem",
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "#a1a1aa")}
                                >
                                    <X size={12} />
                                    <span>Clear all</span>
                                </button>
                            )}

                            {/* Status Dot */}
                            <span
                                style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: ongoingResearch ? "#22c55e" : "#22c55e",
                                    display: "inline-block",
                                }}
                                className={ongoingResearch ? "blinking-green-dot" : ""}
                            />

                            {/* Chevron Expand/Collapse */}
                            <button
                                onClick={() => setIsPastResearchExpanded(!isPastResearchExpanded)}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "#a1a1aa",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "2px",
                                }}
                            >
                                {isPastResearchExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Past Research Items List */}
                    {isPastResearchExpanded && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                            {loading ? (
                                <div style={{ padding: "2rem", textAlign: "center", color: "#8e8e93", fontSize: "0.85rem" }}>
                                    Loading past research dossiers...
                                </div>
                            ) : researches.length === 0 ? (
                                <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "#8e8e93", fontSize: "0.85rem" }}>
                                    No past research found. Launch your first deep research run above.
                                </div>
                            ) : (
                                researches.map((r) => {
                                    const sourceCount = r.sources?.length || (r.urls_analyzed || 2);
                                    const displayDuration = r.duration || "8:53";

                                    return (
                                        <div
                                            key={r.id}
                                            style={{
                                                borderRadius: "10px",
                                                border: "1px solid #2e2e34",
                                                backgroundColor: "#161619",
                                                padding: "1rem 1.25rem",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "0.85rem",
                                                transition: "border-color 0.15s ease",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#44444e")}
                                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2e2e34")}
                                        >
                                            {/* Line 1: Topic Prompt & Meta Badges */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: "1rem",
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                {/* Left: Query prompt */}
                                                <div
                                                    style={{
                                                        color: "#ffffff",
                                                        fontWeight: 500,
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                        flex: 1,
                                                    }}
                                                    title={r.topic}
                                                >
                                                    {r.topic}
                                                </div>

                                                {/* Right: standard  8:53  -- 2 sources */}
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "0.6rem",
                                                        color: "#8e8e93",
                                                        fontSize: "0.78rem",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <span style={{ color: "#22c55e", fontWeight: 600 }}>standard</span>
                                                    <span>{displayDuration}</span>
                                                    <span style={{ color: "#55555e" }}>--</span>
                                                    <span>{sourceCount} sources</span>
                                                </div>
                                            </div>

                                            {/* Line 2: Thumbnail, Visual Report, Discuss, Copy, Delete */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                }}
                                            >
                                                {/* Left Cluster */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                    {/* Thumbnail preview image */}
                                                    <div
                                                        style={{
                                                            width: "56px",
                                                            height: "38px",
                                                            borderRadius: "6px",
                                                            overflow: "hidden",
                                                            backgroundColor: "#202025",
                                                            flexShrink: 0,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                    >
                                                        {r.image ? (
                                                            <img
                                                                src={r.image}
                                                                alt="preview"
                                                                style={{
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "cover",
                                                                }}
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display = "none";
                                                                }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    background: "linear-gradient(135deg, #1e293b, #0f172a)",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                }}
                                                            >
                                                                <FileText size={16} style={{ color: "#22c55e", opacity: 0.8 }} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* [Visual Report] Button (Green outline, opens new page/window) */}
                                                    <button
                                                        onClick={() => handleVisualReport(r)}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "0.45rem",
                                                            padding: "0.45rem 0.95rem",
                                                            borderRadius: "6px",
                                                            border: "1px solid #22c55e",
                                                            backgroundColor: "rgba(34, 197, 94, 0.05)",
                                                            color: "#22c55e",
                                                            fontSize: "0.82rem",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            transition: "background-color 0.15s ease",
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.12)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.05)")}
                                                    >
                                                        <ExternalLink size={14} />
                                                        <span>Visual Report</span>
                                                    </button>

                                                    {/* [Discuss] Button */}
                                                    <button
                                                        onClick={() => handleDiscuss(r)}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "0.45rem",
                                                            padding: "0.45rem 0.95rem",
                                                            borderRadius: "6px",
                                                            border: "1px solid #3e3e46",
                                                            backgroundColor: "transparent",
                                                            color: "#d1d5db",
                                                            fontSize: "0.82rem",
                                                            fontWeight: 500,
                                                            cursor: "pointer",
                                                            transition: "background-color 0.15s ease",
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                    >
                                                        <MessageSquare size={14} />
                                                        <span>Discuss</span>
                                                    </button>
                                                </div>

                                                {/* Right Cluster */}
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                                                    {/* Copy */}
                                                    <button
                                                        onClick={(e) => handleCopy(r, e)}
                                                        title="Copy research content"
                                                        style={{
                                                            background: "none",
                                                            border: "none",
                                                            color: "#8e8e93",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            padding: "4px",
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.color = "#8e8e93")}
                                                    >
                                                        {copiedId === r.id ? <Check size={15} color="#22c55e" /> : <Copy size={15} />}
                                                    </button>

                                                    {/* Cancel research if still in progress */}
                                                    {r.status === "in_progress" && (
                                                        <button
                                                            onClick={(e) => handleCancel(r.id, e)}
                                                            title="Stop research"
                                                            style={{
                                                                background: "none",
                                                                border: "none",
                                                                color: "#ef4444",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                padding: "4px",
                                                            }}
                                                        >
                                                            <X size={15} />
                                                        </button>
                                                    )}

                                                    {/* Delete button */}
                                                    <button
                                                        onClick={(e) => handleDelete(r.id, e)}
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "0.35rem",
                                                            background: "none",
                                                            border: "none",
                                                            color: "#8e8e93",
                                                            fontSize: "0.8rem",
                                                            cursor: "pointer",
                                                            padding: "4px",
                                                        }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.color = "#8e8e93")}
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
