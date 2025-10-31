import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

function DebugAPI() {
  const { login, user, token, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [meResult, setMeResult] = useState(null);
  const [rawResult, setRawResult] = useState(null);

  const envApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const axiosBaseURL = axios.defaults.baseURL;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'N/A';
  const authHeader = axios.defaults.headers?.common?.Authorization || null;

  const handleLogin = async () => {
    setResult(null);
    try {
      const res = await login(email, password);
      setResult({ success: res.success, message: res.message || 'Login attempted' });
    } catch (error) {
      setResult({ success: false, message: error.response?.data?.message || error.message });
    }
  };

  const handleMe = async () => {
    setMeResult(null);
    try {
      const res = await axios.get('/api/auth/me');
      setMeResult({ success: true, data: res.data });
    } catch (error) {
      setMeResult({ success: false, message: error.response?.data?.message || error.message });
    }
  };

  const handleRawLogin = async () => {
    setRawResult(null);
    try {
      const res = await axios.post(`${envApiUrl}/api/auth/login`, { email, password });
      setRawResult({ success: true, data: res.data });
    } catch (error) {
      setRawResult({ success: false, message: error.response?.data?.message || error.message });
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold' }}>Debug API</h1>
      <p style={{ color: '#555' }}>Inspect frontend API configuration and run test calls.</p>

      <div style={{ marginTop: 16, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: '600' }}>Config</h2>
        <ul>
          <li><strong>Window origin:</strong> {origin}</li>
          <li><strong>REACT_APP_API_URL:</strong> {envApiUrl}</li>
          <li><strong>axios.defaults.baseURL:</strong> {axiosBaseURL || '(not set)'} </li>
          <li><strong>Authorization header:</strong> {authHeader ? 'present' : 'none'}</li>
          <li><strong>Token in context:</strong> {token ? `${token.slice(0, 12)}…` : 'none'}</li>
          <li><strong>User in context:</strong> {user ? user.email : 'none'}</li>
        </ul>
      </div>

      <div style={{ marginTop: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: '600' }}>Test Login</h2>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button onClick={handleLogin} style={{ padding: '8px 12px' }}>Login via Context</button>
          <button onClick={handleRawLogin} style={{ padding: '8px 12px' }}>Login via Full URL</button>
          <button onClick={handleMe} style={{ padding: '8px 12px' }}>Call /api/auth/me</button>
          <button onClick={logout} style={{ padding: '8px 12px' }}>Logout</button>
        </div>
        {result && (
          <div style={{ marginTop: 12 }}>
            <strong>Context login:</strong> {result.success ? 'success' : 'failed'} {result.message ? `- ${result.message}` : ''}
          </div>
        )}
        {rawResult && (
          <div style={{ marginTop: 12 }}>
            <strong>Raw login:</strong> {rawResult.success ? 'success' : 'failed'}
            <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
{JSON.stringify(rawResult.data || { message: rawResult.message }, null, 2)}
            </pre>
          </div>
        )}
        {meResult && (
          <div style={{ marginTop: 12 }}>
            <strong>/api/auth/me:</strong> {meResult.success ? 'success' : 'failed'}
            <pre style={{ background: '#f7f7f7', padding: 12, borderRadius: 6, overflowX: 'auto' }}>
{JSON.stringify(meResult.data || { message: meResult.message }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default DebugAPI;