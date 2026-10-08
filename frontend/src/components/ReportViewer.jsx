import React, { useState, useEffect, useRef } from "react";
import {
    ArrowLeft,
    Clock,
    Tag,
    Share2,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    FileText,
    Link as LinkIcon,
    AlertCircle,
    Sun,
    Moon,
} from "lucide-react";
import katex from "katex";
import mermaid from "mermaid";
import { getReportBySlug } from "../services/api";

try {
    mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "var(--font-sans)",
    });
} catch {}

function renderKaTeX(formula, isBlock = false) {
    try {
        const html = katex.renderToString(formula, {
            displayMode: isBlock,
            throwOnError: false,
        });
        return (
            <span
                dangerouslySetInnerHTML={{ __html: html }}
                style={
                    isBlock
                        ? {
                              display: "block",
                              margin: "0.85rem 0",
                              textAlign: "center",
                              overflowX: "auto",
                          }
                        : {}
                }
            />
        );
    } catch {
        return <code>{formula}</code>;
    }
}

function MermaidReportBlock({ chart }) {
    const [svg, setSvg] = useState("");
    const [error, setError] = useState(null);
    const [viewRaw, setViewRaw] = useState(false);
    const [copied, setCopied] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        const renderChart = async () => {
            try {
                const uniqueId = `report-mermaid-${Math.random().toString(36).substring(2, 9)}`;
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
                    <span style={{ fontWeight: 600, color: "#ef4444" }}>Diagram Render Notice</span>
                    <button
                        onClick={handleCopy}
                        style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                        }}
                    >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? "Copied" : "Copy Source"}
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
                margin: "1.25rem 0",
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
                    Interactive Diagram
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                        onClick={() => setViewRaw(!viewRaw)}
                        style={{
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            background: "none",
                            border: "none",
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
                            background: "none",
                            border: "none",
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
                        padding: "1.25rem",
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

/**
 * Lightweight regex code syntax highlighter
 */
function highlightCode(code, lang = "") {
    if (!code) return "";
    let safe = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Comments
    safe = safe.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span style="color: #6a737d; font-style: italic;">$1</span>');
    // Strings
    safe = safe.replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: #032f62;">$1</span>');
    // Numbers
    safe = safe.replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color: #005cc5;">$1</span>');
    // Keywords
    const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|async|await|try|catch|new|def|self|print)\b/g;
    safe = safe.replace(keywords, '<span style="color: #d73a49; font-weight: 600;">$1</span>');

    return safe;
}

function CodeBlock({ code, lang }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            style={{
                position: "relative",
                margin: "1.1rem 0",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                overflow: "hidden",
                backgroundColor: "#161513",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.35rem 0.75rem",
                    backgroundColor: "#1f1d19",
                    borderBottom: "1px solid #2b2823",
                    fontSize: "0.72rem",
                    color: "#999082",
                    fontFamily: "var(--font-mono)",
                }}
            >
                <span>{lang || "CODE"}</span>
                <button
                    onClick={handleCopy}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "#ece7df",
                        fontSize: "0.72rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    {copied ? <Check size={12} color="#22c55e" /> : <Copy size={12} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                </button>
            </div>
            <pre style={{ margin: 0, padding: "0.85rem", overflowX: "auto", color: "#ece7df", fontFamily: "var(--font-mono)", fontSize: "0.84rem", lineHeight: 1.55 }}>
                <code dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
            </pre>
        </div>
    );
}

function renderReportMarkdown(content) {
    if (!content) return null;

    // Filter em dashes
    const rawParts = content.split(/(```[\s\S]*?```)/g);
    const normalizedParts = rawParts.map((p) => {
        if (p.startsWith("```") && p.endsWith("```")) return p;
        return p.replace(/[\u2014\u2013]/g, " - ");
    });
    const cleanContent = normalizedParts.join("");

    // Split code blocks and block math
    const parts = cleanContent.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);

    return parts.map((part, index) => {
        // 1. Code blocks
        if (part.startsWith("```") && part.endsWith("```")) {
            const firstLineBreak = part.indexOf("\n");
            const lang = firstLineBreak !== -1 ? part.slice(3, firstLineBreak).trim() : "";
            const code = firstLineBreak !== -1 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);

            if (lang.toLowerCase() === "mermaid") {
                return <MermaidReportBlock key={index} chart={code} />;
            }
            return <CodeBlock key={index} code={code} lang={lang} />;
        }

        // 2. Block math
        if (part.startsWith("$$") && part.endsWith("$$")) {
            const formula = part.slice(2, -2).trim();
            return <div key={index}>{renderKaTeX(formula, true)}</div>;
        }

        // 3. Process lines
        const lines = part.split("\n");
        return (
            <React.Fragment key={index}>
                {lines.map((line, lIdx) => {
                    if (!line.trim()) return <br key={lIdx} />;

                    if (line.startsWith("### ")) {
                        return <h3 key={lIdx} style={{ marginTop: "1.4rem", marginBottom: "0.5rem" }}>{renderInlineText(line.slice(4))}</h3>;
                    }
                    if (line.startsWith("## ")) {
                        return <h2 key={lIdx} style={{ marginTop: "1.8rem", marginBottom: "0.65rem", paddingBottom: "0.3rem", borderBottom: "1px solid var(--border-subtle)" }}>{renderInlineText(line.slice(3))}</h2>;
                    }
                    if (line.startsWith("# ")) {
                        return <h1 key={lIdx} style={{ marginTop: "2rem", marginBottom: "0.85rem" }}>{renderInlineText(line.slice(2))}</h1>;
                    }
                    if (line.startsWith("> ")) {
                        return (
                            <blockquote
                                key={lIdx}
                                style={{
                                    borderLeft: "3px solid var(--accent-terracotta)",
                                    paddingLeft: "0.85rem",
                                    margin: "0.85rem 0",
                                    color: "var(--text-secondary)",
                                    fontStyle: "italic",
                                }}
                            >
                                {renderInlineText(line.slice(2))}
                            </blockquote>
                        );
                    }
                    if (line.startsWith("- ") || line.startsWith("* ")) {
                        return (
                            <li key={lIdx} style={{ marginLeft: "1.4rem", marginBottom: "0.25rem" }}>
                                {renderInlineText(line.slice(2))}
                            </li>
                        );
                    }
                    return (
                        <p key={lIdx} style={{ marginBottom: "0.85rem", lineHeight: 1.7, color: "var(--text-primary)" }}>
                            {renderInlineText(line)}
                        </p>
                    );
                })}
            </React.Fragment>
        );
    });
}

function renderInlineText(str) {
    const tokens = str.split(/(`[^`]+`|\$\$(?:[^\$]+)\$\$|\$(?:[^\$\n]+)\$|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
    return tokens.map((tok, i) => {
        if (tok.startsWith("`") && tok.endsWith("`")) {
            return (
                <code
                    key={i}
                    style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.88em",
                        backgroundColor: "var(--bg-tertiary)",
                        padding: "0.15em 0.35em",
                        borderRadius: "4px",
                    }}
                >
                    {tok.slice(1, -1)}
                </code>
            );
        }
        if (tok.startsWith("$$") && tok.endsWith("$$")) {
            return <span key={i}>{renderKaTeX(tok.slice(2, -2), true)}</span>;
        }
        if (tok.startsWith("$") && tok.endsWith("$") && tok.length > 2) {
            return <span key={i}>{renderKaTeX(tok.slice(1, -1), false)}</span>;
        }
        if (tok.startsWith("**") && tok.endsWith("**")) {
            return <strong key={i}>{renderInlineText(tok.slice(2, -2))}</strong>;
        }
        if (tok.startsWith("*") && tok.endsWith("*")) {
            return <em key={i}>{renderInlineText(tok.slice(1, -1))}</em>;
        }
        const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
            return (
                <a
                    key={i}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--accent-terracotta)", textDecoration: "underline" }}
                >
                    {linkMatch[1]}
                </a>
            );
        }
        return tok;
    });
}

export default function ReportViewer({ slug, theme, onToggleTheme }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sourcesExpanded, setSourcesExpanded] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    useEffect(() => {
        if (!slug) return;
        setLoading(true);
        setError(null);
        getReportBySlug(slug)
            .then((data) => {
                setReport(data);
                document.title = `${data.title || "Research Report"} — Marnie`;
            })
            .catch((err) => {
                setError(err.message || "Report not found");
            })
            .finally(() => {
                setLoading(false);
            });
    }, [slug]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-sans)",
                    padding: "1rem",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                        Loading Dossier
                    </div>
                    <div style={{ fontSize: "0.82rem" }}>Parsing report markdown and assets...</div>
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-sans)",
                    padding: "2rem",
                }}
            >
                <div
                    style={{
                        maxWidth: "480px",
                        backgroundColor: "var(--bg-card)",
                        padding: "2rem",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                        textAlign: "center",
                    }}
                >
                    <AlertCircle size={32} color="#ef4444" style={{ margin: "0 auto 1rem auto" }} />
                    <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                        Report Not Found
                    </h2>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                        The requested markdown file <code>{slug}</code> could not be located in <code>workspace/research/</code>.
                    </p>
                    <a
                        href="/"
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            padding: "0.5rem 1rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--accent-terracotta)",
                            color: "#fff",
                            textDecoration: "none",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                        }}
                    >
                        <ArrowLeft size={14} />
                        <span>Return to Workspace</span>
                    </a>
                </div>
            </div>
        );
    }

    const formattedTime = report.time ? new Date(report.time).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }) : "";

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
            }}
        >
            {/* Top Navigation Bar */}
            <header
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 30,
                    backgroundColor: "var(--bg-card)",
                    borderBottom: "1px solid var(--border-subtle)",
                    backdropFilter: "blur(8px)",
                    padding: "0.65rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <a
                        href="/"
                        title="Back to Marnie"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            color: "var(--text-secondary)",
                            textDecoration: "none",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            padding: "0.3rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-secondary)",
                        }}
                    >
                        <ArrowLeft size={14} />
                        <span>Marnie</span>
                    </a>
                    <span style={{ color: "var(--border-strong)" }}>|</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        {report.slug}
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                        onClick={handleShare}
                        title="Copy report URL"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.35rem 0.75rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                        }}
                    >
                        {copiedUrl ? <Check size={13} color="#22c55e" /> : <Share2 size={13} />}
                        <span>{copiedUrl ? "Copied Link" : "Share"}</span>
                    </button>
                    {onToggleTheme && (
                        <button
                            onClick={onToggleTheme}
                            title="Toggle theme"
                            style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--bg-secondary)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                            }}
                        >
                            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                    )}
                </div>
            </header>

            {/* Main Article Container */}
            <main
                style={{
                    flex: 1,
                    maxWidth: "840px",
                    width: "100%",
                    margin: "0 auto",
                    padding: "2rem 1.25rem 4rem 1.25rem",
                }}
            >
                {/* Article Header Card */}
                <div
                    style={{
                        marginBottom: "2rem",
                        paddingBottom: "1.5rem",
                        borderBottom: "1px solid var(--border-subtle)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        <Clock size={13} />
                        <span>{formattedTime}</span>
                    </div>

                    <h1
                        style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "clamp(1.5rem, 4vw, 2.1rem)",
                            fontWeight: 800,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.25,
                            color: "var(--text-primary)",
                            marginBottom: "1rem",
                        }}
                    >
                        {report.title}
                    </h1>

                    {report.prompt && (
                        <div
                            style={{
                                padding: "0.6rem 0.85rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--bg-secondary)",
                                border: "1px solid var(--border-subtle)",
                                fontSize: "0.82rem",
                                color: "var(--text-secondary)",
                                marginBottom: "1rem",
                            }}
                        >
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Prompt: </span>
                            {report.prompt}
                        </div>
                    )}

                    {/* Keywords pills */}
                    {report.keywords && report.keywords.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {report.keywords.map((kw, i) => (
                                <span
                                    key={i}
                                    style={{
                                        fontSize: "0.72rem",
                                        padding: "0.15rem 0.5rem",
                                        borderRadius: "9999px",
                                        backgroundColor: "var(--bg-card)",
                                        border: "1px solid var(--border-subtle)",
                                        color: "var(--text-muted)",
                                    }}
                                >
                                    #{kw}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Article Content */}
                <article className="markdown-body" style={{ fontSize: "1rem", lineHeight: 1.8 }}>
                    {renderReportMarkdown(report.content)}
                </article>

                {/* Collapsible Sources Section at Bottom */}
                {report.sources && report.sources.length > 0 && (
                    <section
                        style={{
                            marginTop: "3.5rem",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                            backgroundColor: "var(--bg-card)",
                            overflow: "hidden",
                        }}
                    >
                        <div
                            onClick={() => setSourcesExpanded(!sourcesExpanded)}
                            style={{
                                padding: "0.85rem 1.25rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                cursor: "pointer",
                                userSelect: "none",
                                backgroundColor: "var(--bg-secondary)",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.86rem" }}>
                                <LinkIcon size={14} style={{ color: "var(--accent-terracotta)" }} />
                                <span>References & Cited Web Sources ({report.sources.length})</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                                <span>{sourcesExpanded ? "Collapse" : "Expand"}</span>
                                {sourcesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </div>
                        </div>

                        {sourcesExpanded && (
                            <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                {report.sources.map((url, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                            fontSize: "0.82rem",
                                            wordBreak: "break-all",
                                        }}
                                    >
                                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", minWidth: "20px" }}>
                                            [{i + 1}]
                                        </span>
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                color: "var(--accent-terracotta)",
                                                textDecoration: "none",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "0.3rem",
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                                        >
                                            <span>{url}</span>
                                            <ExternalLink size={11} style={{ flexShrink: 0 }} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </main>
        </div>
    );
}
