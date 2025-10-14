import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function GoogleDriveConnected() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
  }, [refreshUser]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '2rem', maxWidth: 520, textAlign: 'center' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Google Drive Connected</h2>
        <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
          Your Google Drive account is now linked to your profile.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: 'linear-gradient(45deg, #667eea, #764ba2)',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default GoogleDriveConnected;