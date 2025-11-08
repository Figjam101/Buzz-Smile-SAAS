import React from 'react';

const stepsFromProgress = (progress) => {
  if (progress < 33) return 'Preparing';
  if (progress < 66) return 'Editing';
  if (progress < 100) return 'Finalizing';
  return 'Completed';
};

export default function ProcessingStatusModal({ isOpen, videoTitle, status, progress, errorMessage, onClose }) {
  if (!isOpen) return null;

  const stepLabel = stepsFromProgress(progress || 0);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Processing: {videoTitle || 'Video'}</h3>
          <p className="text-sm text-gray-600">Status: {status || 'processing'} • Step: {stepLabel}</p>
        </div>
        <div className="px-5 py-4">
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress || 0, 100)}%` }} />
          </div>
          <ul className="text-sm text-gray-700 space-y-1">
            <li className={`${progress >= 1 ? 'text-blue-700' : 'text-gray-500'}`}>• Preparing</li>
            <li className={`${progress >= 33 ? 'text-blue-700' : 'text-gray-500'}`}>• Editing</li>
            <li className={`${progress >= 66 ? 'text-blue-700' : 'text-gray-500'}`}>• Finalizing</li>
          </ul>
          {errorMessage && (
            <div className="mt-3 p-3 bg-red-50 text-red-700 rounded">Error: {errorMessage}</div>
          )}
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200">Close</button>
        </div>
      </div>
    </div>
  );
}