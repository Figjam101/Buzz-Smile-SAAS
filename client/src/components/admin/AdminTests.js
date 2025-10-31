import React, { useState } from 'react';

const AdminTests = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const base = process.env.REACT_APP_API_URL || '';

  const runTest = async (key, path) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${base}${path}`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      const data = await res.json().catch(() => ({ message: 'Non-JSON response' }));
      setResults(prev => ({ ...prev, [key]: { ok: res.ok, status: res.status, data } }));
    } catch (e) {
      setResults(prev => ({ ...prev, [key]: { ok: false, status: 0, data: { error: e.message } } }));
    } finally {
      setLoading(false);
    }
  };

  const runAll = async () => {
    await runTest('ffmpeg', '/api/health/ffmpeg');
    await runTest('memory', '/api/health/memory');
    await runTest('memoryDiagnostics', '/api/health/memory/diagnostics');
    await runTest('ready', '/api/health/ready');
    await runTest('detailed', '/api/health/detailed');
  };

  const ResultCard = ({ title, result }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        {result ? (
          <span className={`text-xs px-2 py-1 rounded ${result.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{result.ok ? 'OK' : 'FAIL'}</span>
        ) : (
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Not run</span>
        )}
      </div>
      <pre className="text-xs text-gray-800 bg-gray-50 rounded p-2 overflow-auto max-h-48">{result ? JSON.stringify(result.data, null, 2) : '—'}</pre>
      {result && (
        <div className="mt-2 text-xs text-gray-500">HTTP {result.status}</div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">Admin Tests</h3>
        <p className="text-gray-600">Run backend health diagnostics directly from the dashboard.</p>
      </div>
      <div className="flex gap-3 mb-6">
        <button onClick={runAll} disabled={loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">{loading ? 'Running…' : 'Run All'}</button>
        <button onClick={() => runTest('ffmpeg', '/api/health/ffmpeg')} className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900">FFmpeg</button>
        <button onClick={() => runTest('memory', '/api/health/memory')} className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900">Memory</button>
        <button onClick={() => runTest('memoryDiagnostics', '/api/health/memory/diagnostics')} className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900">Memory Diagnostics</button>
        <button onClick={() => runTest('ready', '/api/health/ready')} className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900">Readiness</button>
        <button onClick={() => runTest('detailed', '/api/health/detailed')} className="px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900">Detailed Health</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultCard title="FFmpeg" result={results.ffmpeg} />
        <ResultCard title="Memory" result={results.memory} />
        <ResultCard title="Memory Diagnostics" result={results.memoryDiagnostics} />
        <ResultCard title="Readiness" result={results.ready} />
        <ResultCard title="Detailed Health" result={results.detailed} />
      </div>
    </div>
  );
};

export default AdminTests;