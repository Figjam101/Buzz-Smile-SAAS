import React from 'react';

export default function GlassCard({ children, className = '' }) {
  return (
    <div
      className={
        `rounded-2xl border border-white/15 bg-white/10 dark:bg-gray-900/40 ` +
        `backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.12)] ` +
        `transition-all duration-300 hover:bg-white/12 ${className}`
      }
    >
      {children}
    </div>
  );
}