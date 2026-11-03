import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog: Esc / backdrop to close, focus moves in and is
 * trapped while open, and returns to the trigger on close.
 * `tone`: "primary" | "warn" | "danger" — colours the icon badge.
 */
export default function Dialog({ open, onClose, title, icon: Icon, tone = "primary", children, actions, wide = false }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const items = [...panel.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    // Focus the primary action so Enter confirms and Tab stays inside.
    const t = setTimeout(() => (panel.current?.querySelector("[data-autofocus]") ?? panel.current)?.focus(), 20);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="dlg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`dlg${wide ? " dlg--wide" : ""}`} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" tabIndex={-1} ref={panel}>
        <button className="dlg-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        {Icon && <span className={`dlg-icon dlg-icon--${tone}`}><Icon size={26} strokeWidth={2} /></span>}
        <h2 id="dlg-title">{title}</h2>
        <div className="dlg-body">{children}</div>
        {actions && <div className="dlg-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}
