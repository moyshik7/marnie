import React, { useState, useEffect } from "react";
import {
    Sparkles,
    Plus,
    Play,
    Pause,
    Trash2,
    RefreshCw,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    Layers,
    Search,
    Sliders,
    BookOpen,
    Send,
    FileText,
    ArrowLeft,
    Copy,
    Check,
} from "lucide-react";
import {
    listResearches,
    startDeepResearch,
    cancelDeepResearch,
    deleteDeepResearch,
    getResearch,
} from "../services/api";

export default function DeepResearchView({
    activeModel,
    availableModels = [],
    onClose,
    onResearchCountChange,
}) {
    const [researches, setResearches] = useState([]);
    const [selectedResearchId, setSelectedResearchId] = useState(null);
    const [selectedResearch, setSelectedResearch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedReport, setCopiedReport] = useState(false);

    // Form inputs for new research
    const [topic, setTopic] = useState("");
    const [model, setModel] = useState(
        activeModel || (availableModels.length > 0 ? availableModels[0] : "qwen3.5:9b")
    );
    const [minRevisions, setMinRevisions] = useState(1);
    const [maxRevisions, setMaxRevisions] = useState(3);
    const [maxResults, setMaxResults] = useState(5);
    const [submitting, setSubmitting] = useState(false);

    // Filter tab
    const [activeTab, setActiveTab] = useState("all"); // 'all' | 'in_progress' | 'completed'

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

    // Sync selected research details
    useEffect(() => {
        if (!selectedResearchId) {
            setSelectedResearch(null);
            return;
        }
        const found = researches.find((r) => r.id === selectedResearchId);
        if (found) {
            setSelectedResearch(found);
        } else {
            getResearch(selectedResearchId)
                .then((data) => setSelectedResearch(data))
                .catch(() => {});
        }
    }, [selectedResearchId, researches]);

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

            const created = await startDeepResearch({
                topic: topic.trim(),
                model: chosenModel,
                minRevisions: parseInt(minRevisions, 10) || 1,
                maxRevisions: parseInt(maxRevisions, 10) || 3,
                maxResults: parseInt(maxResults, 10) || 5,
            });

            setTopic("");
            setIsCreating(false);
            if (created?.id) {
                setSelectedResearchId(created.id);
            }
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
        if (!confirm("Are you sure you want to delete this research run?")) return;
        try {
            await deleteDeepResearch(id);
            if (selectedResearchId === id) {
                setSelectedResearchId(null);
                setSelectedResearch(null);
            }
            await fetchResearches();
        } catch (err) {
            alert(`Failed to delete research: ${err.message}`);
        }
    };

    const handleCopyReport = () => {
        if (!selectedResearch?.report) return;
        navigator.clipboard.writeText(selectedResearch.report);
        setCopiedReport(true);
        setTimeout(() => setCopiedReport(false), 2000);
    };

    const filteredResearches = researches.filter((r) => {
        if (activeTab === "in_progress") return r.status === "in_progress";
        if (activeTab === "completed") return r.status === "completed";
        return true;
    });

    const inProgressCount = researches.filter((r) => r.status === "in_progress").length;
    const completedCount = researches.filter((r) => r.status === "completed").length;

    return (
        <div
            style={{
                display: "flex",
                width: "100%",
                height: "100%",
                backgroundColor: "var(--bg-primary)",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {/* Left Column: Research Sessions List & Filters */}
            <div
                style={{
                    width: "360px",
                    minWidth: "320px",
                    maxWidth: "380px",
                    height: "100%",
                    borderRight: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    backgroundColor: "var(--bg-secondary)",
                    flexShrink: 0,
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: "1.25rem 1.5rem 1rem 1.5rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <div
                            style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "rgba(217, 119, 6, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--accent-gold)",
                            }}
                        >
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h2
                                style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "1.15rem",
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                    letterSpacing: "-0.01em",
                                    lineHeight: 1.2,
                                }}
                            >
                                Deep Research
                            </h2>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                Autonomous, iterative synthesis dossiers
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                            onClick={() => {
                                setIsCreating(true);
                                setSelectedResearchId(null);
                            }}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.45rem 0.8rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--accent-terracotta)",
                                color: "#ffffff",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "background-color 0.15s ease",
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
                            <Plus size={14} />
                            <span>New Research</span>
                        </button>
                    </div>
                </div>

                {/* Filter Tabs Bar */}
                <div
                    style={{
                        padding: "0.65rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-secondary)",
                    }}
                >
                    {[
                        { id: "all", label: "All Runs", count: researches.length },
                        {
                            id: "in_progress",
                            label: "In Progress",
                            count: inProgressCount,
                            highlight: inProgressCount > 0,
                        },
                        { id: "completed", label: "Completed", count: completedCount },
                    ].map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.35rem 0.65rem",
                                    borderRadius: "var(--radius-full)",
                                    fontSize: "0.75rem",
                                    fontWeight: isActive ? 600 : 500,
                                    backgroundColor: isActive
                                        ? "var(--bg-card)"
                                        : "transparent",
                                    color: isActive
                                        ? "var(--text-primary)"
                                        : "var(--text-muted)",
                                    border: isActive
                                        ? "1px solid var(--border-subtle)"
                                        : "1px solid transparent",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                }}
                            >
                                <span>{tab.label}</span>
                                {tab.highlight ? (
                                    <span
                                        className="blinking-green-dot"
                                        style={{ width: "6px", height: "6px" }}
                                    />
                                ) : (
                                    <span
                                        style={{
                                            fontSize: "0.68rem",
                                            padding: "0.1rem 0.35rem",
                                            borderRadius: "9999px",
                                            backgroundColor: "var(--bg-tertiary)",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Researches List */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "0.75rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                    }}
                >
                    {loading ? (
                        <div
                            style={{
                                padding: "2rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                            }}
                        >
                            Loading research dossiers...
                        </div>
                    ) : filteredResearches.length === 0 ? (
                        <div
                            style={{
                                padding: "3rem 1.5rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "0.75rem",
                            }}
                        >
                            <BookOpen size={32} style={{ opacity: 0.4 }} />
                            <div style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                                No research sessions found
                            </div>
                            <div style={{ fontSize: "0.78rem", maxWidth: "260px" }}>
                                Start a comprehensive deep research run with autonomous multi-angle search and iterative synthesis.
                            </div>
                            <button
                                onClick={() => setIsCreating(true)}
                                style={{
                                    marginTop: "0.5rem",
                                    padding: "0.5rem 1rem",
                                    borderRadius: "var(--radius-sm)",
                                    backgroundColor: "var(--accent-terracotta)",
                                    color: "#ffffff",
                                    fontSize: "0.82rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                }}
                            >
                                Start Deep Research
                            </button>
                        </div>
                    ) : (
                        filteredResearches.map((r) => {
                            const isSelected = selectedResearchId === r.id;
                            const isRunning = r.status === "in_progress";
                            const isDone = r.status === "completed";
                            const isFailed = r.status === "failed";
                            const isCancelled = r.status === "cancelled";

                            return (
                                <div
                                    key={r.id}
                                    onClick={() => {
                                        setSelectedResearchId(r.id);
                                        setIsCreating(false);
                                    }}
                                    style={{
                                        padding: "0.85rem 1rem",
                                        borderRadius: "var(--radius-md)",
                                        backgroundColor: isSelected
                                            ? "var(--bg-card)"
                                            : "var(--bg-card)",
                                        border: isSelected
                                            ? "2px solid var(--accent-terracotta)"
                                            : "1px solid var(--border-subtle)",
                                        boxShadow: isSelected
                                            ? "var(--shadow-md)"
                                            : "var(--shadow-sm)",
                                        cursor: "pointer",
                                        transition: "all 0.15s ease",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.45rem",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor =
                                                "var(--bg-card-hover)";
                                            e.currentTarget.style.borderColor =
                                                "var(--border-strong)";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor =
                                                "var(--bg-card)";
                                            e.currentTarget.style.borderColor =
                                                "var(--border-subtle)";
                                        }
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            gap: "0.5rem",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "0.88rem",
                                                fontWeight: 600,
                                                color: "var(--text-primary)",
                                                lineHeight: 1.3,
                                                wordBreak: "break-word",
                                            }}
                                        >
                                            {r.topic}
                                        </div>

                                        {isRunning && (
                                            <span
                                                className="blinking-green-dot"
                                                title="Researching live..."
                                                style={{ flexShrink: 0, marginTop: "4px" }}
                                            />
                                        )}
                                    </div>

                                    {/* Status Badge & Meta */}
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            fontSize: "0.72rem",
                                            color: "var(--text-muted)",
                                            marginTop: "0.2rem",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                            {isRunning && (
                                                <span
                                                    style={{
                                                        padding: "0.15rem 0.45rem",
                                                        borderRadius: "4px",
                                                        backgroundColor: "rgba(34, 197, 94, 0.15)",
                                                        color: "#16a34a",
                                                        fontWeight: 600,
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "0.25rem",
                                                    }}
                                                >
                                                    <RefreshCw size={10} className="animate-spin" />
                                                    In Progress
                                                </span>
                                            )}
                                            {isDone && (
                                                <span
                                                    style={{
                                                        padding: "0.15rem 0.45rem",
                                                        borderRadius: "4px",
                                                        backgroundColor: "rgba(34, 197, 94, 0.1)",
                                                        color: "#22c55e",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Ready
                                                </span>
                                            )}
                                            {isFailed && (
                                                <span
                                                    style={{
                                                        padding: "0.15rem 0.45rem",
                                                        borderRadius: "4px",
                                                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                                                        color: "#ef4444",
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Failed
                                                </span>
                                            )}
                                            {isCancelled && (
                                                <span
                                                    style={{
                                                        padding: "0.15rem 0.45rem",
                                                        borderRadius: "4px",
                                                        backgroundColor: "var(--bg-tertiary)",
                                                        color: "var(--text-muted)",
                                                    }}
                                                >
                                                    Cancelled
                                                </span>
                                            )}

                                            <span>{r.model || "Model"}</span>
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <span>
                                                {r.sources?.length || 0} sources
                                            </span>
                                            <button
                                                onClick={(e) => handleDelete(r.id, e)}
                                                title="Delete research"
                                                style={{
                                                    color: "var(--text-muted)",
                                                    padding: "2px",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.currentTarget.style.color = "#ef4444")
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.currentTarget.style.color = "var(--text-muted)")
                                                }
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Column: New Research Form OR Selected Research View */}
            <div
                style={{
                    flex: 1,
                    height: "100%",
                    overflowY: "auto",
                    backgroundColor: "var(--bg-primary)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {isCreating ? (
                    /* NEW RESEARCH CONFIGURATION FORM */
                    <div
                        style={{
                            maxWidth: "760px",
                            margin: "0 auto",
                            width: "100%",
                            padding: "2.5rem 2rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1.75rem",
                        }}
                    >
                        <div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    color: "var(--accent-gold)",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                    marginBottom: "0.35rem",
                                }}
                            >
                                <Sparkles size={14} />
                                <span>Autonomous Multi-Turn Intelligence</span>
                            </div>
                            <h1
                                style={{
                                    fontFamily: "var(--font-display)",
                                    fontSize: "1.75rem",
                                    fontWeight: 700,
                                    color: "var(--text-primary)",
                                    letterSpacing: "-0.02em",
                                }}
                            >
                                Launch Deep Research Run
                            </h1>
                            <p
                                style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.88rem",
                                    marginTop: "0.3rem",
                                    lineHeight: 1.5,
                                }}
                            >
                                Configure your topic, iterative revision thresholds, and source discovery volume. Marnie will independently execute multi-angle web searches, peer-review drafts, and compile an exhaustive dossier.
                            </p>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                            {/* Topic Prompt Textarea */}
                            <div>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: "0.85rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        marginBottom: "0.45rem",
                                    }}
                                >
                                    Research Topic or Hypothesis
                                </label>
                                <textarea
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. State-of-the-art in small reasoning models (Qwen 2.5, DeepSeek R1), comparison of architectural techniques, test-time compute, and hardware efficiency..."
                                    rows={4}
                                    autoFocus
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border-strong)",
                                        backgroundColor: "var(--bg-card)",
                                        color: "var(--text-primary)",
                                        fontSize: "0.95rem",
                                        lineHeight: 1.5,
                                        outline: "none",
                                        resize: "vertical",
                                    }}
                                    required
                                />
                            </div>

                            {/* Configuration Grid */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                    gap: "1rem",
                                    padding: "1.25rem",
                                    backgroundColor: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border-subtle)",
                                }}
                            >
                                {/* LLM Model */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.35rem",
                                        }}
                                    >
                                        Synthesis Model
                                    </label>
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.85rem",
                                            outline: "none",
                                        }}
                                    >
                                        {(availableModels.length > 0
                                            ? availableModels
                                            : [model || activeModel || "qwen3.5:9b"]
                                        ).map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Min Revisions */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.35rem",
                                        }}
                                    >
                                        Minimum Revisions
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={5}
                                        value={minRevisions}
                                        onChange={(e) => setMinRevisions(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.85rem",
                                            outline: "none",
                                        }}
                                    />
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                        Guaranteed review passes
                                    </div>
                                </div>

                                {/* Max Revisions */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.35rem",
                                        }}
                                    >
                                        Maximum Revisions
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={maxRevisions}
                                        onChange={(e) => setMaxRevisions(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.85rem",
                                            outline: "none",
                                        }}
                                    />
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                        Upper bound on iterative polish
                                    </div>
                                </div>

                                {/* Search Results to Gather */}
                                <div>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            marginBottom: "0.35rem",
                                        }}
                                    >
                                        Search Results per Query
                                    </label>
                                    <input
                                        type="number"
                                        min={3}
                                        max={15}
                                        value={maxResults}
                                        onChange={(e) => setMaxResults(e.target.value)}
                                        style={{
                                            width: "100%",
                                            padding: "0.55rem 0.75rem",
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-strong)",
                                            backgroundColor: "var(--bg-card)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.85rem",
                                            outline: "none",
                                        }}
                                    />
                                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                                        Web source breadth
                                    </div>
                                </div>
                            </div>

                            {/* Submit & Cancel Buttons */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
                                <button
                                    type="submit"
                                    disabled={submitting || !topic.trim()}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                        padding: "0.65rem 1.4rem",
                                        borderRadius: "var(--radius-sm)",
                                        backgroundColor: "var(--accent-terracotta)",
                                        color: "#ffffff",
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                        cursor: submitting || !topic.trim() ? "not-allowed" : "pointer",
                                        opacity: submitting || !topic.trim() ? 0.65 : 1,
                                    }}
                                >
                                    <Play size={15} fill="currentColor" />
                                    <span>{submitting ? "Initiating..." : "Start Deep Research"}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    style={{
                                        padding: "0.65rem 1rem",
                                        borderRadius: "var(--radius-sm)",
                                        backgroundColor: "transparent",
                                        color: "var(--text-secondary)",
                                        fontSize: "0.85rem",
                                        cursor: "pointer",
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                ) : selectedResearch ? (
                    /* SELECTED RESEARCH REPORT & LIVE LOGS VIEW */
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            height: "100%",
                        }}
                    >
                        {/* Top Action Bar */}
                        <div
                            style={{
                                padding: "1.25rem 2rem 1rem 2rem",
                                borderBottom: "1px solid var(--border-subtle)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                backgroundColor: "var(--bg-secondary)",
                            }}
                        >
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                                    <span
                                        style={{
                                            fontSize: "0.72rem",
                                            fontWeight: 600,
                                            padding: "0.15rem 0.5rem",
                                            borderRadius: "4px",
                                            backgroundColor:
                                                selectedResearch.status === "in_progress"
                                                    ? "rgba(34, 197, 94, 0.15)"
                                                    : selectedResearch.status === "completed"
                                                      ? "rgba(34, 197, 94, 0.1)"
                                                      : "var(--bg-tertiary)",
                                            color:
                                                selectedResearch.status === "in_progress"
                                                    ? "#16a34a"
                                                    : selectedResearch.status === "completed"
                                                      ? "#22c55e"
                                                      : "var(--text-muted)",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {selectedResearch.status === "in_progress"
                                            ? "Running Live"
                                            : selectedResearch.status}
                                    </span>
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                        Model: <strong>{selectedResearch.model}</strong>
                                    </span>
                                </div>
                                <h1
                                    style={{
                                        fontFamily: "var(--font-display)",
                                        fontSize: "1.35rem",
                                        fontWeight: 700,
                                        color: "var(--text-primary)",
                                        letterSpacing: "-0.01em",
                                    }}
                                >
                                    {selectedResearch.topic}
                                </h1>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {selectedResearch.status === "in_progress" && (
                                    <button
                                        onClick={(e) => handleCancel(selectedResearch.id, e)}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            padding: "0.45rem 0.85rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: "rgba(239, 68, 68, 0.12)",
                                            color: "#ef4444",
                                            fontSize: "0.8rem",
                                            fontWeight: 600,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <Pause size={13} />
                                        <span>Stop Run</span>
                                    </button>
                                )}

                                {selectedResearch.report && (
                                    <button
                                        onClick={handleCopyReport}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            padding: "0.45rem 0.85rem",
                                            borderRadius: "var(--radius-sm)",
                                            backgroundColor: "var(--bg-card)",
                                            border: "1px solid var(--border-subtle)",
                                            color: "var(--text-primary)",
                                            fontSize: "0.8rem",
                                            fontWeight: 500,
                                            cursor: "pointer",
                                        }}
                                    >
                                        {copiedReport ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                                        <span>{copiedReport ? "Copied" : "Copy Dossier"}</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content Split: Live Timeline Logs & Compiled Report */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: "auto",
                                padding: "2rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2rem",
                                maxWidth: "960px",
                                margin: "0 auto",
                                width: "100%",
                            }}
                        >
                            {/* Ongoing Status Progress Box */}
                            {selectedResearch.status === "in_progress" && (
                                <div
                                    style={{
                                        padding: "1.25rem",
                                        borderRadius: "var(--radius-md)",
                                        backgroundColor: "rgba(34, 197, 94, 0.06)",
                                        border: "1px solid rgba(34, 197, 94, 0.25)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.85rem",
                                    }}
                                >
                                    <div className="blinking-green-dot" style={{ width: "12px", height: "12px" }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                                            Research in progress...
                                        </div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                            Querying web targets, extracting multi-source empirical data, and synthesizing iterative drafts.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Execution Timeline / Live Logs */}
                            {selectedResearch.logs && selectedResearch.logs.length > 0 && (
                                <div
                                    style={{
                                        borderRadius: "var(--radius-md)",
                                        border: "1px solid var(--border-subtle)",
                                        backgroundColor: "var(--bg-secondary)",
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "0.6rem 1rem",
                                            borderBottom: "1px solid var(--border-subtle)",
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                            color: "var(--text-secondary)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.04em",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.45rem",
                                        }}
                                    >
                                        <Layers size={14} />
                                        <span>Autonomous Activity Log</span>
                                    </div>
                                    <div
                                        style={{
                                            padding: "0.75rem 1rem",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "0.4rem",
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.78rem",
                                            maxHeight: "220px",
                                            overflowY: "auto",
                                        }}
                                    >
                                        {selectedResearch.logs.map((log, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    gap: "0.65rem",
                                                    color: "var(--text-muted)",
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                <span style={{ opacity: 0.6, flexShrink: 0, fontSize: "0.72rem" }}>
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </span>
                                                <span style={{ color: "var(--text-primary)" }}>
                                                    {log.message}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sources Gathered */}
                            {selectedResearch.sources && selectedResearch.sources.length > 0 && (
                                <div>
                                    <div
                                        style={{
                                            fontSize: "0.85rem",
                                            fontWeight: 700,
                                            color: "var(--text-primary)",
                                            marginBottom: "0.75rem",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.45rem",
                                        }}
                                    >
                                        <Search size={15} />
                                        <span>Discovered Sources ({selectedResearch.sources.length})</span>
                                    </div>
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                            gap: "0.75rem",
                                        }}
                                    >
                                        {selectedResearch.sources.map((s, idx) => (
                                            <a
                                                key={idx}
                                                href={s.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    padding: "0.75rem",
                                                    borderRadius: "var(--radius-sm)",
                                                    backgroundColor: "var(--bg-card)",
                                                    border: "1px solid var(--border-subtle)",
                                                    textDecoration: "none",
                                                    color: "inherit",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "0.3rem",
                                                    transition: "border-color 0.15s ease",
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.currentTarget.style.borderColor = "var(--border-strong)")
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.currentTarget.style.borderColor = "var(--border-subtle)")
                                                }
                                            >
                                                <div
                                                    style={{
                                                        fontSize: "0.82rem",
                                                        fontWeight: 600,
                                                        color: "var(--accent-terracotta)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                    }}
                                                >
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {s.title || "Web Source"}
                                                    </span>
                                                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "0.72rem",
                                                        color: "var(--text-muted)",
                                                        lineHeight: 1.4,
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {s.snippet}
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Full Research Dossier / Report */}
                            {selectedResearch.report ? (
                                <div
                                    style={{
                                        padding: "1.75rem 2rem",
                                        borderRadius: "var(--radius-md)",
                                        backgroundColor: "var(--bg-card)",
                                        border: "1px solid var(--border-subtle)",
                                        boxShadow: "var(--shadow-sm)",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                            color: "var(--text-muted)",
                                            textTransform: "uppercase",
                                            letterSpacing: "0.05em",
                                            marginBottom: "1rem",
                                            borderBottom: "1px solid var(--border-subtle)",
                                            paddingBottom: "0.5rem",
                                        }}
                                    >
                                        Final Research Synthesis
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.95rem",
                                            lineHeight: 1.7,
                                            color: "var(--text-primary)",
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                        }}
                                    >
                                        {selectedResearch.report}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        padding: "3rem",
                                        textAlign: "center",
                                        color: "var(--text-muted)",
                                        fontSize: "0.88rem",
                                    }}
                                >
                                    {selectedResearch.status === "in_progress"
                                        ? "Compiling iterative report..."
                                        : "No report generated."}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* EMPTY SELECTION STATE */
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            padding: "2rem",
                            textAlign: "center",
                            color: "var(--text-muted)",
                        }}
                    >
                        <div
                            style={{
                                width: "52px",
                                height: "52px",
                                borderRadius: "50%",
                                backgroundColor: "rgba(217, 119, 6, 0.1)",
                                color: "var(--accent-gold)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                marginBottom: "1rem",
                            }}
                        >
                            <Sparkles size={26} />
                        </div>
                        <h2
                            style={{
                                fontFamily: "var(--font-display)",
                                fontSize: "1.35rem",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                marginBottom: "0.5rem",
                            }}
                        >
                            Deep Research Center
                        </h2>
                        <p
                            style={{
                                fontSize: "0.88rem",
                                maxWidth: "420px",
                                lineHeight: 1.6,
                                marginBottom: "1.5rem",
                            }}
                        >
                            Select an existing research dossier from the left panel or launch a new multi-source deep research session.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            style={{
                                padding: "0.6rem 1.25rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--accent-terracotta)",
                                color: "#ffffff",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                            }}
                        >
                            Start New Research
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
