import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import VideoThumbnail from '../components/VideoThumbnail';

export default function MyFiles() {
  const { token, user } = useAuth();
  const { stats } = useStats();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchVideos = async () => {
      try {
        const res = await axios.get('/api/videos', { headers: { Authorization: `Bearer ${token}` } });
        let videosData = [];
        if (Array.isArray(res.data)) {
          videosData = res.data;
        } else if (res.data && Array.isArray(res.data.videos)) {
          videosData = res.data.videos;
        } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
          videosData = res.data.data;
        }
        if (mounted) setVideos(videosData);
      } catch (e) {
        if (mounted) setVideos([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchVideos();
    return () => { mounted = false; };
  }, [token]);

  return (
    <div className="md:ml-56 lg:ml-64" style={{ marginTop: 'calc(var(--dashboard-header-bottom, 64px) + 12px)' }}>
      <div className="px-6 pb-12">
        <h2 className="text-white text-xl font-semibold mb-4">{user?.name ? `${user.name}'s Videos` : 'My Files'}</h2>
        {loading ? (
          <div className="text-white/70">Loading your files...</div>
        ) : !Array.isArray(videos) || videos.length === 0 ? (
          <div className="text-white/70">No videos uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <VideoThumbnail key={v._id || v.id} video={v} stats={stats} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}