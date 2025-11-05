import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      try {
        localStorage.setItem('token', token);

        // If opened as a popup, notify parent and close
        if (window.opener && typeof window.opener.postMessage === 'function') {
          // Notify parent window using the expected event type
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', token }, '*');
          window.close();
          return;
        }

        // Otherwise perform a full page navigation so AuthProvider
        // re-initializes with the new token from localStorage.
        // Using window.location ensures a hard reload instead of SPA navigation.
        window.location.href = '/dashboard';
      } catch (e) {
        // If storage fails, just redirect to login
        navigate('/login', { replace: true });
      }
    } else {
      // No token provided; redirect to login
      navigate('/login', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div style={{ padding: 24 }}>
      <h2>Completing sign-in…</h2>
      <p>You’ll be redirected shortly.</p>
    </div>
  );
}