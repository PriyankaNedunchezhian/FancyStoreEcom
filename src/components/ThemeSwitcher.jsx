import { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import './ThemeSwitcher.css';

export default function ThemeSwitcher({ variant = 'navbar' }) {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();
  const current = themes.find((item) => item.id === theme) || themes[0];

  useEffect(() => {
    if (!open) return undefined;

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (variant === 'panel') {
    return (
      <div className="theme-panel">
        <div className="theme-panel-head">
          <h2>Appearance</h2>
          <p>Choose a theme for the admin console.</p>
        </div>
        <div className="theme-panel-grid" role="listbox" aria-label="Themes">
          {themes.map((item) => {
            const selected = item.id === theme;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`theme-option${selected ? ' selected' : ''}`}
                onClick={() => setTheme(item.id)}
              >
                <span className="theme-swatches" aria-hidden="true">
                  {item.preview.map((color) => (
                    <span
                      key={color}
                      className="theme-swatch"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="theme-option-copy">
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="theme-switcher" ref={rootRef}>
      <button
        type="button"
        className="icon-btn theme-trigger"
        aria-label={`Theme: ${current.label}`}
        title={`Theme: ${current.label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2v14a7 7 0 010-14z" />
        </svg>
      </button>

      {open ? (
        <div className="theme-menu" id={listId} role="listbox" aria-label="Themes">
          {themes.map((item) => {
            const selected = item.id === theme;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`theme-menu-item${selected ? ' selected' : ''}`}
                onClick={() => {
                  setTheme(item.id);
                  setOpen(false);
                }}
              >
                <span className="theme-swatches compact" aria-hidden="true">
                  {item.preview.map((color) => (
                    <span
                      key={color}
                      className="theme-swatch"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
