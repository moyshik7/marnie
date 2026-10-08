import React, { useState, useEffect, useRef } from "react";
import {
    ArrowLeft,
    Share2,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    FileText,
    Link as LinkIcon,
    Download,
    Printer,
    Sun,
    Moon,
    List,
    ChevronUp,
} from "lucide-react";
import katex from "katex";
import mermaid from "mermaid";
import { getReportBySlug } from "../services/api";

try {
    mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
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
                              margin: "1.2rem 0",
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
                    margin: "1rem 0",
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    fontSize: "0.82rem",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontWeight: 600, color: "#ef4444" }}>Diagram Notice</span>
                    <button
                        onClick={handleCopy}
                        style={{
                            fontSize: "0.72rem",
                            color: "#9ca3af",
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
                margin: "1.5rem 0",
                borderRadius: "10px",
                border: "1px solid #2d2d34",
                backgroundColor: "#16161a",
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0.85rem",
                    borderBottom: "1px solid #2d2d34",
                    backgroundColor: "#121215",
                    fontSize: "0.74rem",
                    color: "#9ca3af",
                }}
            >
                <span style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Interactive Diagram
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                        onClick={() => setViewRaw(!viewRaw)}
                        style={{
                            color: "#9ca3af",
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
                            color: "#9ca3af",
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
                <pre style={{ margin: 0, padding: "1rem", overflowX: "auto", color: "#e5e7eb", fontSize: "0.85rem" }}>
                    <code>{chart}</code>
                </pre>
            ) : (
                <div
                    ref={containerRef}
                    dangerouslySetInnerHTML={{ __html: svg }}
                    style={{
                        padding: "1.5rem",
                        display: "flex",
                        justifyContent: "center",
                        overflowX: "auto",
                        backgroundColor: "#16161a",
                    }}
                />
            )}
        </div>
    );
}

function highlightCode(code, lang = "") {
    if (!code) return "";
    let safe = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    safe = safe.replace(/(\/\/[^\n]*|#[^\n]*)/g, '<span style="color: #6b7280; font-style: italic;">$1</span>');
    safe = safe.replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color: #6ee7b7;">$1</span>');
    safe = safe.replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color: #93c5fd;">$1</span>');
    const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|async|await|try|catch|new|def|self|print)\b/g;
    safe = safe.replace(keywords, '<span style="color: #f472b6; font-weight: 600;">$1</span>');

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
                margin: "1.25rem 0",
                borderRadius: "8px",
                border: "1px solid #2a2a30",
                overflow: "hidden",
                backgroundColor: "#141418",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.4rem 0.85rem",
                    backgroundColor: "#101014",
                    borderBottom: "1px solid #24242a",
                    fontSize: "0.72rem",
                    color: "#9ca3af",
                    fontFamily: "monospace",
                }}
            >
                <span>{lang || "CODE"}</span>
                <button
                    onClick={handleCopy}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "#d1d5db",
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
            <pre style={{ margin: 0, padding: "1rem", overflowX: "auto", color: "#e5e7eb", fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1.6 }}>
                <code dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
            </pre>
        </div>
    );
}

function slugifyHeading(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
}

function renderInlineText(str) {
    const tokens = str.split(/(`[^`]+`|\$\$(?:[^\$]+)\$\$|\$(?:[^\$\n]+)\$|\*\*[^*]+\*\*|\*[^*]+\*|\[\d+\]|\[[^\]]+\]\([^)]+\))/g);
    return tokens.map((tok, i) => {
        if (!tok) return null;
        if (tok.startsWith("`") && tok.endsWith("`")) {
            return (
                <code
                    key={i}
                    style={{
                        fontFamily: "monospace",
                        fontSize: "0.88em",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        padding: "0.15em 0.4em",
                        borderRadius: "4px",
                        color: "#e2e8f0",
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
            return <strong key={i} style={{ color: "#ffffff", fontWeight: 700 }}>{renderInlineText(tok.slice(2, -2))}</strong>;
        }
        if (tok.startsWith("*") && tok.endsWith("*")) {
            return <em key={i}>{renderInlineText(tok.slice(1, -1))}</em>;
        }
        // Citation link like [1] or [2]
        const citationMatch = tok.match(/^\[(\d+)\]$/);
        if (citationMatch) {
            return (
                <sup
                    key={i}
                    style={{
                        padding: "1px 5px",
                        margin: "0 2px",
                        borderRadius: "4px",
                        backgroundColor: "rgba(234, 88, 12, 0.15)",
                        color: "#fb923c",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "default",
                    }}
                >
                    [{citationMatch[1]}]
                </sup>
            );
        }
        const linkMatch = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
            return (
                <a
                    key={i}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#fb923c", textDecoration: "underline", textUnderlineOffset: "3px" }}
                >
                    {linkMatch[1]}
                </a>
            );
        }
        return tok;
    });
}

export default function ReportViewer({ slug, theme = "dark", onToggleTheme }) {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sourcesExpanded, setSourcesExpanded] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedContent, setCopiedContent] = useState(false);
    const [activeHeading, setActiveHeading] = useState("");
    const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
    const exportRef = useRef(null);

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

    useEffect(() => {
        document.body.style.overflow = "auto";
        document.body.style.height = "auto";
        document.documentElement.style.overflow = "auto";
        document.documentElement.style.height = "auto";
        return () => {
            document.body.style.overflow = "";
            document.body.style.height = "";
            document.documentElement.style.overflow = "";
            document.documentElement.style.height = "";
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (exportRef.current && !exportRef.current.contains(e.target)) {
                setExportOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Extract headings from report content
    const headings = [];
    if (report?.content) {
        const lines = report.content.split("\n");
        for (const line of lines) {
            const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
            if (hMatch) {
                const level = hMatch[1].length;
                const text = hMatch[2].replace(/[\*\_]/g, "").trim();
                const id = slugifyHeading(text);
                headings.push({ level, text, id });
            }
        }
    }

    const scrollToSection = (id) => {
        setActiveHeading(id);
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleCopyMarkdown = () => {
        if (!report) return;
        navigator.clipboard.writeText(report.raw || report.content);
        setCopiedContent(true);
        setExportOpen(false);
        setTimeout(() => setCopiedContent(false), 2000);
    };

    const handleDownload = () => {
        if (!report) return;
        const blob = new Blob([report.raw || report.content], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = report.slug || "research-report.md";
        a.click();
        URL.revokeObjectURL(url);
        setExportOpen(false);
    };

    const handlePrint = () => {
        setExportOpen(false);
        window.print();
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedUrl(true);
        setExportOpen(false);
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
                    backgroundColor: "#0e0e11",
                    color: "#9ca3af",
                    fontFamily: "system-ui, sans-serif",
                }}
            >
                <div style={{ textAlign: "center" }}>
                    <div className="blinking-green-dot" style={{ width: "14px", height: "14px", margin: "0 auto 1rem auto" }} />
                    <div style={{ fontSize: "0.95rem", fontWeight: 500 }}>Loading research report...</div>
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
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0e0e11",
                    color: "#f3f4f6",
                    fontFamily: "system-ui, sans-serif",
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <FileText size={48} style={{ opacity: 0.3, marginBottom: "1rem" }} />
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Report Not Found</h1>
                <p style={{ color: "#9ca3af", maxWidth: "400px", marginBottom: "1.5rem" }}>
                    {error || "The requested markdown research file could not be located in workspace/research/."}
                </p>
                <a
                    href="/"
                    style={{
                        padding: "0.6rem 1.25rem",
                        backgroundColor: "#c2410c",
                        color: "#fff",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                    }}
                >
                    Return to Marnie
                </a>
            </div>
        );
    }

    // Process article content with Drop Cap and Styled Sections
    const renderArticleBody = (content) => {
        if (!content) return null;

        const rawParts = content.split(/(```[\s\S]*?```)/g);
        const normalizedParts = rawParts.map((p) => {
            if (p.startsWith("```") && p.endsWith("```")) return p;
            return p.replace(/[\u2014\u2013]/g, " - ");
        });
        const cleanContent = normalizedParts.join("");

        const blocks = cleanContent.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);
        let hasRenderedDropCap = false;

        return blocks.map((block, bIdx) => {
            if (block.startsWith("```") && block.endsWith("```")) {
                const firstBreak = block.indexOf("\n");
                const lang = firstBreak !== -1 ? block.slice(3, firstBreak).trim() : "";
                const code = firstBreak !== -1 ? block.slice(firstBreak + 1, -3) : block.slice(3, -3);

                if (lang.toLowerCase() === "mermaid") {
                    return <MermaidReportBlock key={bIdx} chart={code} />;
                }
                return <CodeBlock key={bIdx} code={code} lang={lang} />;
            }

            if (block.startsWith("$$") && block.endsWith("$$")) {
                const formula = block.slice(2, -2).trim();
                return <div key={bIdx}>{renderKaTeX(formula, true)}</div>;
            }

            const lines = block.split("\n");
            return (
                <React.Fragment key={bIdx}>
                    {lines.map((line, lIdx) => {
                        const trimmed = line.trim();
                        if (!trimmed) return null;

                        // Headings (H1 to H6)
                        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
                        if (headingMatch) {
                            const level = headingMatch[1].length;
                            const text = headingMatch[2].trim();
                            const id = slugifyHeading(text.replace(/[\*\_]/g, ""));

                            if (level === 1) {
                                return (
                                    <h1
                                        id={id}
                                        key={lIdx}
                                        style={{
                                            fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif",
                                            fontSize: "2.1rem",
                                            fontWeight: 800,
                                            color: "#ffffff",
                                            marginTop: "2.5rem",
                                            marginBottom: "1rem",
                                        }}
                                    >
                                        {renderInlineText(text)}
                                    </h1>
                                );
                            }

                            if (level === 2) {
                                return (
                                    <div key={lIdx} style={{ marginTop: "3rem", marginBottom: "1.5rem" }}>
                                        <h2
                                            id={id}
                                            style={{
                                                fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif",
                                                fontSize: "1.9rem",
                                                fontWeight: 700,
                                                color: "#ffffff",
                                                lineHeight: 1.25,
                                                margin: 0,
                                            }}
                                        >
                                            {renderInlineText(text)}
                                        </h2>
                                        {/* Accent underline under H2 section heading matching Image 1 */}
                                        <div
                                            style={{
                                                height: "2px",
                                                backgroundColor: "#c2410c",
                                                marginTop: "0.55rem",
                                                width: "100%",
                                                opacity: 0.9,
                                            }}
                                        />
                                    </div>
                                );
                            }

                            if (level === 3) {
                                return (
                                    <h3
                                        id={id}
                                        key={lIdx}
                                        style={{
                                            fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif",
                                            fontSize: "1.28rem",
                                            fontWeight: 700,
                                            color: "#f3f4f6",
                                            marginTop: "2rem",
                                            marginBottom: "0.75rem",
                                            lineHeight: 1.35,
                                        }}
                                    >
                                        {renderInlineText(text)}
                                    </h3>
                                );
                            }

                            if (level === 4) {
                                return (
                                    <h4
                                        id={id}
                                        key={lIdx}
                                        style={{
                                            fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif",
                                            fontSize: "1.12rem",
                                            fontWeight: 600,
                                            color: "#e5e7eb",
                                            marginTop: "1.5rem",
                                            marginBottom: "0.6rem",
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {renderInlineText(text)}
                                    </h4>
                                );
                            }

                            if (level === 5) {
                                return (
                                    <h5
                                        id={id}
                                        key={lIdx}
                                        style={{
                                            fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif",
                                            fontSize: "1.02rem",
                                            fontWeight: 600,
                                            color: "#d1d5db",
                                            marginTop: "1.25rem",
                                            marginBottom: "0.5rem",
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {renderInlineText(text)}
                                    </h5>
                                );
                            }

                            return (
                                <h6
                                    id={id}
                                    key={lIdx}
                                    style={{
                                        fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif",
                                        fontSize: "0.95rem",
                                        fontWeight: 600,
                                        color: "#9ca3af",
                                        marginTop: "1rem",
                                        marginBottom: "0.5rem",
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {renderInlineText(text)}
                                </h6>
                            );
                        }

                        if (trimmed.startsWith("> ")) {
                            return (
                                <blockquote
                                    key={lIdx}
                                    style={{
                                        borderLeft: "3px solid #c2410c",
                                        paddingLeft: "1.1rem",
                                        margin: "1.5rem 0",
                                        color: "#9ca3af",
                                        fontStyle: "italic",
                                        fontSize: "1.05rem",
                                        lineHeight: 1.7,
                                    }}
                                >
                                    {renderInlineText(trimmed.slice(2))}
                                </blockquote>
                            );
                        }

                        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                            return (
                                <li
                                    key={lIdx}
                                    style={{
                                        marginLeft: "1.5rem",
                                        marginBottom: "0.45rem",
                                        color: "#d1d5db",
                                        lineHeight: 1.75,
                                    }}
                                >
                                    {renderInlineText(trimmed.slice(2))}
                                </li>
                            );
                        }

                        // Paragraph: Check if this is the very first substantive paragraph for the Drop Cap (Image 1)
                        if (!hasRenderedDropCap && trimmed.length > 20) {
                            hasRenderedDropCap = true;
                            const firstLetter = trimmed[0];
                            const restOfText = trimmed.slice(1);

                            return (
                                <p
                                    key={lIdx}
                                    style={{
                                        marginBottom: "1.5rem",
                                        lineHeight: 1.85,
                                        fontSize: "1.08rem",
                                        color: "#d1d5db",
                                    }}
                                >
                                    {/* Drop Cap styling matching Image 1: coral/amber box with bold white letter */}
                                    <span
                                        style={{
                                            float: "left",
                                            width: "clamp(36px, 8vw, 44px)",
                                            height: "clamp(36px, 8vw, 44px)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: "#c2410c",
                                            color: "#ffffff",
                                            fontFamily: "'Newsreader', 'Georgia', serif",
                                            fontSize: "clamp(1.45rem, 5vw, 1.85rem)",
                                            fontWeight: 700,
                                            borderRadius: "6px",
                                            marginRight: "10px",
                                            marginTop: "3px",
                                            lineHeight: 1,
                                            userSelect: "none",
                                        }}
                                    >
                                        {firstLetter}
                                    </span>
                                    {renderInlineText(restOfText)}
                                </p>
                            );
                        }

                        return (
                            <p
                                key={lIdx}
                                style={{
                                    marginBottom: "1.5rem",
                                    lineHeight: 1.85,
                                    fontSize: "1.08rem",
                                    color: "#d1d5db",
                                }}
                            >
                                {renderInlineText(trimmed)}
                            </p>
                        );
                    })}
                </React.Fragment>
            );
        });
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                backgroundColor: "#0e0e11",
                color: "#e5e7eb",
                fontFamily: "system-ui, -apple-system, sans-serif",
                position: "relative",
            }}
        >
            {/* Top Minimal Bar */}
            <header
                style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 40,
                    backgroundColor: "rgba(14, 14, 17, 0.92)",
                    backdropFilter: "blur(12px)",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                    padding: "0.75rem 2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <a
                    href="/"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "#9ca3af",
                        textDecoration: "none",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#ffffff")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                >
                    <ArrowLeft size={14} />
                    <span>Marnie Research</span>
                </a>

                {/* Right: Export Menu */}
                <div style={{ position: "relative" }} ref={exportRef}>
                    <button
                        onClick={() => setExportOpen(!exportOpen)}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.45rem",
                            padding: "0.45rem 0.9rem",
                            borderRadius: "6px",
                            backgroundColor: "#18181c",
                            border: "1px solid #303036",
                            color: "#e5e7eb",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        <Download size={13} />
                        <span>Export</span>
                        <ChevronDown size={12} style={{ opacity: 0.7 }} />
                    </button>

                    {exportOpen && (
                        <div
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "100%",
                                marginTop: "0.4rem",
                                width: "190px",
                                backgroundColor: "#18181c",
                                border: "1px solid #33333a",
                                borderRadius: "8px",
                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6)",
                                padding: "0.35rem",
                                zIndex: 50,
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.2rem",
                            }}
                        >
                            <button
                                onClick={handleDownload}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "#e5e7eb",
                                    fontSize: "0.8rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                <Download size={13} />
                                <span>Download .md</span>
                            </button>

                            <button
                                onClick={handleCopyMarkdown}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "#e5e7eb",
                                    fontSize: "0.8rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                <Copy size={13} />
                                <span>{copiedContent ? "Copied!" : "Copy Markdown"}</span>
                            </button>

                            <button
                                onClick={handleShare}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "#e5e7eb",
                                    fontSize: "0.8rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                <Share2 size={13} />
                                <span>{copiedUrl ? "Copied Link!" : "Copy Share Link"}</span>
                            </button>

                            <button
                                onClick={handlePrint}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    padding: "0.5rem 0.75rem",
                                    borderRadius: "4px",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    color: "#e5e7eb",
                                    fontSize: "0.8rem",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    width: "100%",
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                            >
                                <Printer size={13} />
                                <span>Print / Save PDF</span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Editorial Hero Header Section */}
            <div style={{ maxWidth: "980px", margin: "0 auto", padding: "3rem 1.5rem 1.5rem 1.5rem", textAlign: "center" }}>
                {/* Large Editorial Headline */}
                <h1
                    style={{
                        fontFamily: "'Newsreader', 'Playfair Display', 'Merriweather', 'Georgia', serif",
                        fontSize: "clamp(1.5rem, 5.5vw, 2.85rem)",
                        fontWeight: 700,
                        color: "#ffffff",
                        letterSpacing: "-0.015em",
                        lineHeight: 1.25,
                        margin: "0 auto 1.5rem auto",
                        maxWidth: "880px",
                    }}
                >
                    {report.title}
                </h1>

                {/* Hero Featured Preview Image */}
                {report.image ? (
                    <div
                        style={{
                            maxWidth: "760px",
                            width: "100%",
                            margin: "0 auto 1.5rem auto",
                            borderRadius: "12px",
                            overflow: "hidden",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
                            backgroundColor: "#16161a",
                        }}
                    >
                        <img
                            src={report.image}
                            alt={report.title}
                            className="report-hero-image"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                    </div>
                ) : (
                    <div
                        style={{
                            maxWidth: "760px",
                            width: "100%",
                            height: "260px",
                            margin: "0 auto 1.5rem auto",
                            borderRadius: "12px",
                            background: "linear-gradient(135deg, #18181b 0%, #1f2937 50%, #111827 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid #2a2a30",
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
                        }}
                    >
                        <FileText size={48} style={{ opacity: 0.25, color: "#fb923c" }} />
                    </div>
                )}

                {/* Metadata Stats Bar (Matching Image 1) */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: "1.25rem",
                        marginTop: "1rem",
                        marginBottom: "2rem",
                        fontSize: "0.82rem",
                        color: "#9ca3af",
                    }}
                >
                    <div>
                        <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                            {report.duration || "533.4s"}
                        </strong>{" "}
                        <span>Duration</span>
                    </div>
                    <div>
                        <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                            {report.rounds || 3}
                        </strong>{" "}
                        <span>Rounds</span>
                    </div>
                    <div>
                        <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                            {report.queries || 7}
                        </strong>{" "}
                        <span>Queries</span>
                    </div>
                    <div>
                        <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                            {report.urls_analyzed || (report.sources ? report.sources.length : 13)}
                        </strong>{" "}
                        <span>URLs Analyzed</span>
                    </div>
                    <div>
                        <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                            {report.model || "qwen3.5:9b"}
                        </strong>{" "}
                        <span>Model</span>
                    </div>
                    <div>
                        <strong style={{ color: "#ffffff", fontWeight: 700 }}>
                            {report.search_engine || "duckduckgo"}
                        </strong>{" "}
                        <span>Search</span>
                    </div>
                </div>
            </div>

            {/* Two-Column Layout (Desktop) / Single-Column (Mobile) */}
            <div className="report-viewer-content-layout">
                {/* Desktop Left Column: Table of Contents / Outline */}
                {headings.length > 0 && (
                    <aside className="report-viewer-outline-desktop">
                        <div
                            style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "#6b7280",
                                marginBottom: "0.5rem",
                                paddingLeft: "0.5rem",
                            }}
                        >
                            Outline
                        </div>
                        {headings.map((h, i) => {
                            const isH2 = h.level === 2;
                            const isH3 = h.level === 3;
                            const isH4 = h.level === 4;
                            const paddingLeft = isH4 ? "1.8rem" : isH3 ? "1.2rem" : "0.5rem";
                            const fontSize = isH4 ? "0.74rem" : isH3 ? "0.78rem" : "0.82rem";
                            return (
                                <button
                                    key={i}
                                    onClick={() => scrollToSection(h.id)}
                                    style={{
                                        textAlign: "left",
                                        background: "none",
                                        border: "none",
                                        color: activeHeading === h.id ? "#fb923c" : "#9ca3af",
                                        fontSize: fontSize,
                                        fontWeight: isH2 ? 600 : 400,
                                        padding: "0.35rem 0.5rem",
                                        paddingLeft: paddingLeft,
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        lineHeight: 1.4,
                                        transition: "all 0.15s ease",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeHeading !== h.id) e.currentTarget.style.color = "#f3f4f6";
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeHeading !== h.id) e.currentTarget.style.color = "#9ca3af";
                                    }}
                                >
                                    {h.text}
                                </button>
                            );
                        })}
                    </aside>
                )}

                {/* Right Column: Main Article Body */}
                <main className="report-viewer-main-article" style={{ fontFamily: "'Newsreader', 'Georgia', 'Merriweather', serif" }}>
                    {/* Mobile Collapsible Outline / Table of Contents */}
                    {headings.length > 0 && (
                        <div className="report-viewer-mobile-outline">
                            <button
                                onClick={() => setMobileOutlineOpen(!mobileOutlineOpen)}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem 1rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    backgroundColor: "#18181e",
                                    border: "none",
                                    color: "#e5e7eb",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <List size={14} style={{ color: "#fb923c" }} />
                                    <span>Table of Contents ({headings.length} sections)</span>
                                </div>
                                {mobileOutlineOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            {mobileOutlineOpen && (
                                <div
                                    style={{
                                        padding: "0.6rem 0.85rem",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "0.3rem",
                                        maxHeight: "240px",
                                        overflowY: "auto",
                                        backgroundColor: "#141418",
                                    }}
                                >
                                    {headings.map((h, i) => {
                                        const isH3 = h.level === 3;
                                        const isH4 = h.level === 4;
                                        const paddingLeft = isH4 ? "1.8rem" : isH3 ? "1.2rem" : "0.5rem";
                                        const fontSize = isH4 ? "0.74rem" : isH3 ? "0.78rem" : "0.82rem";
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    scrollToSection(h.id);
                                                    setMobileOutlineOpen(false);
                                                }}
                                                style={{
                                                    textAlign: "left",
                                                    background: "none",
                                                    border: "none",
                                                    color: activeHeading === h.id ? "#fb923c" : "#9ca3af",
                                                    fontSize: fontSize,
                                                    padding: "0.35rem 0.5rem",
                                                    paddingLeft: paddingLeft,
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                {h.text}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {renderArticleBody(report.content)}

                    {/* Collapsible References & Cited Sources Section at Bottom */}
                    {report.sources && report.sources.length > 0 && (
                        <section
                            style={{
                                marginTop: "4rem",
                                borderRadius: "10px",
                                border: "1px solid #282830",
                                backgroundColor: "#141418",
                                overflow: "hidden",
                                fontFamily: "system-ui, -apple-system, sans-serif",
                            }}
                        >
                            <div
                                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                                style={{
                                    padding: "0.9rem 1.25rem",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    backgroundColor: "#18181e",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontWeight: 700, fontSize: "0.88rem" }}>
                                    <LinkIcon size={14} style={{ color: "#fb923c" }} />
                                    <span>References & Cited Web Sources ({report.sources.length})</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.76rem", color: "#9ca3af" }}>
                                    <span>{sourcesExpanded ? "Collapse" : "Expand"}</span>
                                    {sourcesExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </div>
                            </div>

                            {sourcesExpanded && (
                                <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
                                            <span style={{ color: "#6b7280", fontSize: "0.75rem", minWidth: "22px" }}>
                                                [{i + 1}]
                                            </span>
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: "#fb923c",
                                                    textDecoration: "none",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "0.35rem",
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
        </div>
    );
}
