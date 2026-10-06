import React from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={onToggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.2rem 0.35rem',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* Sun Icon on the left */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? 'var(--text-muted)' : '#E08034',
        opacity: isDark ? 0.38 : 1,
        transition: 'all 0.25s ease',
      }}>
        <Sun size={17} strokeWidth={2.2} />
      </div>

      {/* Neumorphic / Pill Inset Track */}
      <div
        style={{
          position: 'relative',
          width: '50px',
          height: '26px',
          borderRadius: '9999px',
          backgroundColor: isDark ? '#141311' : '#E0D9CE',
          boxShadow: isDark
            ? 'inset 0 2px 5px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(0, 0, 0, 0.5)'
            : 'inset 0 2px 5px rgba(0, 0, 0, 0.14), inset 0 1px 2px rgba(0, 0, 0, 0.08)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
          transition: 'all 0.25s ease',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Sliding Thumb Knob */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: isDark ? '#423F38' : '#FFFFFF',
            boxShadow: isDark
              ? '0 2px 6px rgba(0, 0, 0, 0.55), 0 1px 2px rgba(0, 0, 0, 0.4)'
              : '0 2px 6px rgba(0, 0, 0, 0.18), 0 1px 2px rgba(0, 0, 0, 0.12)',
            transform: isDark ? 'translateX(24px)' : 'translateX(0px)',
            transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease, box-shadow 0.2s ease',
          }}
        />
      </div>

      {/* Moon Icon on the right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? '#DA7A57' : 'var(--text-muted)',
        opacity: isDark ? 1 : 0.38,
        transition: 'all 0.25s ease',
      }}>
        <Moon size={16} strokeWidth={2.2} />
      </div>
    </button>
  );
}
