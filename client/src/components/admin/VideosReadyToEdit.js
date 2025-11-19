import React, { useEffect, useState } from 'react';

const VideosReadyToEdit = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/videos/ready-to-edit`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setUsers(data?.users || []);
      } catch (e) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="px-0 py-4">
      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white mb-3">Videos Ready to Edit</h2>
        {loading && <p className="text-white/70">Loading...</p>}
        {error && <p className="text-red-300">{error}</p>}
        {!loading && !error && (
          users.length === 0 ? (
            <p className="text-white/70">No users currently awaiting editing.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {users.map(u => (
                <li key={u.userId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{u.name || 'Unnamed User'}</p>
                    <p className="text-sm text-white/70">{u.email}</p>
                  </div>
                  <div className="text-sm text-white/80">{u.videoCount} video(s)</div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
};

export default VideosReadyToEdit;