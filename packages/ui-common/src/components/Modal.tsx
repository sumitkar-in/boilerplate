import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '860px',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ui-modal"
        style={{ width: 'min(100%, calc(100vw - 32px))', maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="ui-modal__header">
            <span>{title}</span>
            <button
              type="button"
              onClick={onClose}
              className="ui-modal__close"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && (
          <div className="ui-modal__footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
