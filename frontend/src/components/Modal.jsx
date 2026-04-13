export default function Modal({
  open,
  title,
  children,
  footer,
  contentClassName = "",
}) {
  if (!open) return null;
  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className={`modal-content ${contentClassName}`.trim()}>
        {title && (
          <div className="modal-header">
            <h3 id="modal-title" className="modal-header-title">
              {title}
            </h3>
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
