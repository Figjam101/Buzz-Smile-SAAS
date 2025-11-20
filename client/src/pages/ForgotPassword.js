import React, { useState } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const base = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/auth/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'If the email exists, a reset link was sent');
      } else {
        setError(data.message || 'Failed to request password reset');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Network error requesting password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-start py-0 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-0 text-center text-3xl font-bold text-gray-900">Forgot your password?</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Enter your email to request a reset link.</p>
      </div>
      <div className="mt-0 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card p-8 relative z-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
              <input id="email" type="email" required autoFocus value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border-2 rounded-md p-3 bg-white text-black placeholder-gray-500" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base font-medium disabled:opacity-50">{loading ? 'Sending...' : 'Send reset link'}</button>
          </form>
          {message && <p className="mt-4 text-green-600">{message}</p>}
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;