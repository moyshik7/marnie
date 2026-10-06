import React, { useState } from 'react';
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
  Sparkles,
  Bot
} from 'lucide-react';

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
  onOpenTools,
  theme,
  onToggleTheme,
  backendConnected,
  activeModel,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

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
    <aside style={{
      width: '280px',
      height: '100vh',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      userSelect: 'none',
      transition: 'background-color 0.2s ease',
    }}>
      {/* Top Branding */}
      <div style={{
        padding: '1.25rem 1.1rem 1rem 1.1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <img
            src="/logo.png"
            alt="Marnie"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              objectFit: 'contain',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            }}
          />
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 700,
              lineHeight: 1.1,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Marnie
            </div>
          </div>
        </div>

        {/* Backend status dot */}
        <div 
          title={backendConnected ? 'Backend Connected' : 'Connecting to Backend...'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: backendConnected ? 'rgba(74, 222, 128, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            fontSize: '0.72rem',
            color: backendConnected ? '#16A34A' : '#DC2626',
            fontWeight: 500,
          }}
        >
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: backendConnected ? '#16A34A' : '#DC2626',
            display: 'inline-block',
          }} />
          {backendConnected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* New Chat Button */}
      <div style={{ padding: '0 1rem 0.75rem 1rem' }}>
        <button
          onClick={onNewConversation}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1rem',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 500,
            fontSize: '0.9rem',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-terracotta)';
            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.backgroundColor = 'var(--bg-card)';
          }}
        >
          <Plus size={16} color="var(--accent-terracotta)" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Conversation List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
      }}>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          padding: '0.4rem 0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Conversations
        </div>

        {conversations.length === 0 ? (
          <div style={{
            padding: '1.5rem 0.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
          }}>
            No previous chats.
            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
              Start a new session above.
            </div>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                  border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  fontWeight: isActive ? 500 : 400,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flex: 1,
                  minWidth: 0,
                }}>
                  <MessageSquare size={15} color={isActive ? 'var(--accent-terracotta)' : 'var(--text-muted)'} />
                  
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEditing(conv.id, e);
                        if (e.key === 'Escape') cancelEditing(e);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--accent-terracotta)',
                        borderRadius: '4px',
                        padding: '0.15rem 0.35rem',
                        fontSize: '0.84rem',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {conv.title || 'Untitled Chat'}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    opacity: isActive ? 1 : 0.6,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isEditing ? (
                    <>
                      <button 
                        onClick={(e) => saveEditing(conv.id, e)} 
                        title="Save"
                        style={{ padding: '0.2rem', color: 'var(--accent-terracotta)' }}
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={cancelEditing} 
                        title="Cancel"
                        style={{ padding: '0.2rem', color: 'var(--text-muted)' }}
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startEditing(conv, e)}
                        title="Rename"
                        style={{
                          padding: '0.2rem',
                          color: 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${conv.title}"?`)) {
                            onDeleteConversation(conv.id);
                          }
                        }}
                        title="Delete"
                        style={{
                          padding: '0.2rem',
                          color: 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#EF4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Utilities & Settings */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
      }}>
        {/* Tools drawer trigger */}
        <button
          onClick={onOpenTools}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.55rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Wrench size={16} />
          <span>System Tools & Tasks</span>
        </button>

        {/* Settings modal trigger */}
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.55rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Settings size={16} />
          <span>Settings & Integrations</span>
        </button>

        {/* Theme and footer info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.4rem 0.65rem 0.1rem 0.65rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Marnie AI Workspace
          </span>

          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Ivory' : 'Switch to Warm Dark'}
            style={{
              padding: '0.3rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
