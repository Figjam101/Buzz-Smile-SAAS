import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const hasUrlToken = Boolean(searchParams.get('token'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        setMessage('Password reset successful. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-start py-0 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-0 text-center text-3xl font-bold text-gray-900">Reset your password</h2>
      </div>
      <div className="mt-0 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8 relative z-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!hasUrlToken && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reset token</label>
                <input type="text" value={token} onChange={(e)=>setToken(e.target.value)} className="w-full border-2 rounded-md p-3 bg-white text-black placeholder-gray-500" placeholder="Paste reset token" required />
              </div>
            )}
            {hasUrlToken && (
              <div className="text-sm text-gray-600">Token detected from reset link.</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
              <input type="password" value={password} autoFocus onChange={(e)=>setPassword(e.target.value)} className="w-full border-2 rounded-md p-3 bg-white text-black placeholder-gray-500" placeholder="New password" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm new password</label>
              <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} className="w-full border-2 rounded-md p-3 bg-white text-black placeholder-gray-500" placeholder="Confirm new password" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base font-medium disabled:opacity-50">{loading ? 'Resetting...' : 'Reset password'}</button>
          </form>
          {message && <p className="mt-4 text-green-600">{message}</p>}
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;