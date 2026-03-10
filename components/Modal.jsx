'use client';

import { useEffect } from 'react';

export default function Modal({ open, onClose, title, large, small, children }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = large ? 'modal-large' : small ? 'modal-small' : '';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-content ${sizeClass}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
