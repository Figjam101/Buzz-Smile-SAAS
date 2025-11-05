import React from 'react';

export default function GlassModal({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto mt-24 max-w-2xl px-4">
        <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-xl">
          <div className="px-6 pt-5">
            {title && <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>}
          </div>
          <div className="px-6 py-4 text-gray-700 dark:text-gray-200">{children}</div>
          {footer && <div className="px-6 pb-5 flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}