import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Square, 
  Sparkles, 
  Copy, 
  Check, 
  Globe, 
  Brain, 
  ChevronDown, 
  Terminal, 
  Code, 
  CheckSquare, 
  Wrench, 
  Flame,
  Sun,
  Moon
} from 'lucide-react';
import { sendMessageStream } from '../services/api';

export default function ChatView({
  conversation,
  activeModel,
  availableModels = [],
  onModelChanged,
  theme,
  onToggleTheme,
  onOpenTools,
  onOpenSettings,
  onRefreshConversations,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Feature toggles
  const [webSearchActive, setWebSearchActive] = useState(false);
  const [deepResearchActive, setDeepResearchActive] = useState(false);
  const [agentModeActive, setAgentModeActive] = useState(true);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Sync conversation messages from backend SQLite
  useEffect(() => {
    if (conversation && conversation.messages) {
      setMessages(conversation.messages);
    } else {
      setMessages([]);
    }
  }, [conversation]);

  // Auto scroll to bottom
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSend = async (customPrompt) => {
    const textToSend = (typeof customPrompt === 'string' ? customPrompt : input).trim();
    if (!textToSend || isStreaming) return;

    if (!conversation?.id) return;

    // Optimistically add user message
    const userMsg = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      created_at: Math.floor(Date.now() / 1000),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    // Prepare system instructions incorporating mode flags
    let augmentedSystem = '';
    if (webSearchActive) {
      augmentedSystem += '\n[Mode: SearXNG Web Search enabled for verified web answers]';
    }
    if (deepResearchActive) {
      augmentedSystem += '\n[Mode: Deep Research enabled - provide thorough, comprehensive analysis with detailed reasoning]';
    }
    if (agentModeActive) {
      augmentedSystem += '\n[Mode: Agent Mode enabled - identify goals, break down sub-tasks, and prepare tool executions]';
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      await sendMessageStream({
        conversationId: conversation.id,
        message: textToSend,
        model: activeModel,
        system: augmentedSystem || undefined,
        signal: abortController.signal,
        onChunk: (_token, fullText) => {
          setStreamingContent(fullText);
        },
        onDone: (finalContent) => {
          setIsStreaming(false);
          setStreamingContent('');
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-asst-${Date.now()}`,
              role: 'assistant',
              content: finalContent,
              created_at: Math.floor(Date.now() / 1000),
            },
          ]);
          if (onRefreshConversations) onRefreshConversations();
        },
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Provider Error: ${err.message}`,
            created_at: Math.floor(Date.now() / 1000),
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      if (streamingContent) {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-stopped-${Date.now()}`,
            role: 'assistant',
            content: streamingContent + ' *(Generation stopped)*',
            created_at: Math.floor(Date.now() / 1000),
          },
        ]);
      }
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top Header Bar */}
      <header style={{
        padding: '0.8rem 1.5rem',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-primary)',
        zIndex: 10,
        gap: '1rem',
      }}>
        {/* Model selector & chat title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={activeModel || ''}
              onChange={(e) => {
                if (onModelChanged && e.target.value) {
                  onModelChanged(e.target.value);
                }
              }}
              style={{
                appearance: 'none',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-full)',
                padding: '0.42rem 2.2rem 0.42rem 0.95rem',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {availableModels.length > 0 ? (
                availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))
              ) : (
                <option value={activeModel || 'qwen3.5:9b'}>
                  {activeModel || 'qwen3.5:9b'}
                </option>
              )}
            </select>
            <ChevronDown 
              size={13} 
              style={{
                position: 'absolute',
                right: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: 'var(--text-muted)',
              }} 
            />
          </div>

          <span style={{
            fontSize: '0.86rem',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {conversation?.title || 'New Session'}
          </span>
        </div>

        {/* Right side: Top Theme Switcher & Action Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          {/* Top Light/Dark Theme Switcher */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Claude Dark Theme'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.38rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              fontSize: '0.78rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              transition: 'all 0.15s ease',
              boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-terracotta)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
            }}
          >
            {theme === 'dark' ? (
              <Sun size={14} color="#E59838" />
            ) : (
              <Moon size={14} color="var(--accent-terracotta)" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Agent Mode Toggle */}
          <button
            onClick={() => setAgentModeActive(!agentModeActive)}
            title="Agent Mode: Sub-Agent Spawning & Execution"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: agentModeActive ? 'rgba(200, 91, 56, 0.14)' : 'var(--bg-secondary)',
              border: agentModeActive ? '1px solid var(--accent-terracotta)' : '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: agentModeActive ? 'var(--accent-terracotta)' : 'var(--text-muted)',
            }}
          >
            <Brain size={13} />
            <span>Agent</span>
          </button>

          {/* Deep Research Toggle */}
          <button
            onClick={() => setDeepResearchActive(!deepResearchActive)}
            title="Deep Research Mode (Future Roadmap)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: deepResearchActive ? 'rgba(217, 119, 6, 0.14)' : 'var(--bg-secondary)',
              border: deepResearchActive ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: deepResearchActive ? 'var(--accent-gold)' : 'var(--text-muted)',
            }}
          >
            <Sparkles size={13} />
            <span>Research</span>
          </button>

          {/* Web Search Toggle */}
          <button
            onClick={() => setWebSearchActive(!webSearchActive)}
            title="SearXNG Private Web Search (Future Roadmap)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: webSearchActive ? 'rgba(59, 130, 246, 0.14)' : 'var(--bg-secondary)',
              border: webSearchActive ? '1px solid #3B82F6' : '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: webSearchActive ? '#2563EB' : 'var(--text-muted)',
            }}
          >
            <Globe size={13} />
            <span>SearXNG</span>
          </button>

          {/* Quick Tools button */}
          <button
            onClick={onOpenTools}
            title="Open Tools & Tasks Panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: 'var(--text-secondary)',
            }}
          >
            <Wrench size={13} />
            <span>Tools</span>
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 1rem 8rem 1rem',
      }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          {/* Welcome Screen when no messages */}
          {messages.length === 0 && !isStreaming ? (
            <div style={{
              padding: '3rem 1rem 1rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease-out',
            }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-terracotta)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                boxShadow: '0 4px 16px rgba(200, 91, 56, 0.3)',
              }}>
                <Sparkles size={28} />
              </div>

              <h1 className="serif-title" style={{
                fontSize: '2.4rem',
                color: 'var(--text-primary)',
                marginBottom: '0.6rem',
              }}>
                {getGreeting()}, Sayuri
              </h1>

              <p style={{
                fontSize: '1.05rem',
                color: 'var(--text-secondary)',
                maxWidth: '540px',
                lineHeight: 1.6,
                marginBottom: '2.5rem',
              }}>
                Marnie is your self-hosted AI workspace powered by <strong>{activeModel || 'Ollama'}</strong>. Execute bash commands, run isolated JavaScript, manage tasks, and dispatch alerts.
              </p>

              {/* Quick Prompt Suggestions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                gap: '0.85rem',
                width: '100%',
              }}>
                {[
                  {
                    title: 'System Terminal',
                    desc: 'Execute bash commands and inspect processes',
                    icon: Terminal,
                    prompt: 'Run a bash command to check the system disk usage and current uptime.',
                  },
                  {
                    title: 'Code Sandbox',
                    desc: 'Execute JavaScript in a fresh child process',
                    icon: Code,
                    prompt: 'Write and run a Node.js script to calculate Fibonacci numbers up to 20.',
                  },
                  {
                    title: 'Persistent Tasks',
                    desc: 'Create SQLite tasks with deadlines and priority',
                    icon: CheckSquare,
                    prompt: 'Add a new high-priority task titled "Set up SearXNG web search engine".',
                  },
                  {
                    title: 'Discord Notification',
                    desc: 'Dispatch styled embed alerts via webhooks',
                    icon: Flame,
                    prompt: 'Send a success notification to the Discord webhook channel.',
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      onClick={() => handleSend(card.prompt)}
                      style={{
                        padding: '1.1rem',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-terracotta)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--accent-terracotta)',
                        marginBottom: '0.4rem',
                      }}>
                        <Icon size={16} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {card.title}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {card.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Message list */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || index}
                    className="animate-fade-in"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                    }}
                  >
                    {isUser ? (
                      /* User message bubble */
                      <div style={{
                        maxWidth: '82%',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '18px 18px 4px 18px',
                        padding: '0.85rem 1.15rem',
                        boxShadow: 'var(--shadow-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.96rem',
                        lineHeight: 1.55,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}>
                        {msg.content}
                      </div>
                    ) : (
                      /* Assistant message layout (Claude-style) */
                      <div style={{
                        width: '100%',
                        display: 'flex',
                        gap: '0.9rem',
                        padding: '0.5rem 0',
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--accent-terracotta)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '0.2rem',
                        }}>
                          <Sparkles size={16} />
                        </div>

                        {/* Content & Actions */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="markdown-body">
                            {formatMarkdown(msg.content)}
                          </div>

                          {/* Message actions footer */}
                          <div style={{
                            marginTop: '0.65rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}>
                            <button
                              onClick={() => handleCopy(msg.content, index)}
                              title="Copy response"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                color: 'var(--text-muted)',
                                fontSize: '0.74rem',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              {copiedIndex === index ? <Check size={13} color="#16A34A" /> : <Copy size={13} />}
                              <span>{copiedIndex === index ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Currently Streaming Message */}
              {isStreaming && (
                <div style={{
                  width: '100%',
                  display: 'flex',
                  gap: '0.9rem',
                  padding: '0.5rem 0',
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--accent-terracotta)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '0.2rem',
                  }}>
                    <Sparkles size={16} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="markdown-body">
                      {formatMarkdown(streamingContent)}
                      <span 
                        style={{
                          display: 'inline-block',
                          width: '7px',
                          height: '14px',
                          backgroundColor: 'var(--accent-terracotta)',
                          marginLeft: '3px',
                          verticalAlign: 'middle',
                        }} 
                        className="typing-dot" 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Bottom Prompt Box (Claude-style) */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0.75rem 1.5rem 1.5rem 1.5rem',
        background: 'linear-gradient(to top, var(--bg-primary) 70%, transparent 100%)',
        display: 'flex',
        justifyContent: 'center',
        zIndex: 20,
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          padding: '0.75rem 1rem 0.65rem 1.15rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          transition: 'border-color 0.15s ease',
        }}>
          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            className="auto-grow"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              webSearchActive ? "Ask with SearXNG web search enabled..." :
              deepResearchActive ? "Ask for in-depth research and reasoning..." :
              `Ask ${activeModel || 'Marnie'}, run code, or execute workspace tools...`
            }
          />

          {/* Bottom Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.25rem',
          }}>
            {/* Feature Pills status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {activeModel || 'Ollama'}
              </span>
              <span>•</span>
              <span style={{ color: agentModeActive ? 'var(--accent-terracotta)' : 'inherit' }}>
                {agentModeActive ? 'Agent Active' : 'Direct Chat'}
              </span>
              {webSearchActive && (
                <>
                  <span>•</span>
                  <span style={{ color: '#2563EB' }}>Web Search</span>
                </>
              )}
              {deepResearchActive && (
                <>
                  <span>•</span>
                  <span style={{ color: 'var(--accent-gold)' }}>Deep Research</span>
                </>
              )}
            </div>

            {/* Send / Stop Button */}
            <div>
              {isStreaming ? (
                <button
                  onClick={handleStop}
                  title="Stop generating"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--text-primary)',
                    color: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  title="Send message"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: input.trim() ? 'var(--accent-terracotta)' : 'var(--border-strong)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: input.trim() ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (input.trim()) e.currentTarget.style.backgroundColor = 'var(--accent-terracotta-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (input.trim()) e.currentTarget.style.backgroundColor = 'var(--accent-terracotta)';
                  }}
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Markdown Formatter Helper ────────────────────────
function formatMarkdown(content) {
  if (!content) return null;

  // Split content by code blocks ```...```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const firstLineBreak = part.indexOf('\n');
      const lang = firstLineBreak !== -1 ? part.slice(3, firstLineBreak).trim() : '';
      const code = firstLineBreak !== -1 ? part.slice(firstLineBreak + 1, -3) : part.slice(3, -3);

      return (
        <div key={index} style={{ position: 'relative', margin: '0.85rem 0' }}>
          {lang && (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '8px',
              fontSize: '0.72rem',
              color: '#888',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
            }}>
              {lang}
            </div>
          )}
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Process inline markdown (paragraphs, headers, bold, italics, inline code)
    const lines = part.split('\n');
    return (
      <React.Fragment key={index}>
        {lines.map((line, lIdx) => {
          if (!line.trim()) return <br key={lIdx} />;

          if (line.startsWith('### ')) {
            return <h3 key={lIdx}>{renderInline(line.slice(4))}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={lIdx}>{renderInline(line.slice(3))}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={lIdx}>{renderInline(line.slice(2))}</h1>;
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={lIdx} style={{ marginLeft: '1.25rem' }}>
                {renderInline(line.slice(2))}
              </li>
            );
          }
          return <p key={lIdx}>{renderInline(line)}</p>;
        })}
      </React.Fragment>
    );
  });
}

function renderInline(str) {
  const tokens = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return <code key={i}>{tok.slice(1, -1)}</code>;
    }
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>;
    }
    if (tok.startsWith('*') && tok.endsWith('*')) {
      return <em key={i}>{tok.slice(1, -1)}</em>;
    }
    return tok;
  });
}
