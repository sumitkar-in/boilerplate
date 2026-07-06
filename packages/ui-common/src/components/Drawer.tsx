import React, { useEffect } from 'react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  width = '380px',
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
    <div className="ui-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`ui-drawer ui-drawer--${position}`}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-drawer__header">
          <span>{title || ''}</span>
          <button
            type="button"
            onClick={onClose}
            className="ui-drawer__close"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>
        <div className="ui-drawer__body">{children}</div>
      </div>
    </div>
  );
};
