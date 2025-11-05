import React from 'react';

export default function ProgressBar({ value = 0, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">{label}</div>}
      <div className="h-2 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all"
          style={{ width: `${pct}%` }}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <div className="mt-1 text-xs text-gray-500">{pct}%</div>
    </div>
  );
}