import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const StatsContext = createContext();

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};

export const StatsProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [stats, setStats] = useState({
    videoCount: 0,
    maxVideos: 10,
    plan: 'Free',
    storageUsed: 0,
    storageLimit: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated) {
      setStats({
        videoCount: 0,
        maxVideos: 10,
        plan: 'Free',
        storageUsed: 0,
        storageLimit: 0
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch both videos and user stats
      const [videosResponse, userResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/api/videos`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/api/users/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      // Handle both array response and object with videos property
      let videosData = [];
      if (Array.isArray(videosResponse.data)) {
        videosData = videosResponse.data;
      } else if (videosResponse.data && Array.isArray(videosResponse.data.videos)) {
        videosData = videosResponse.data.videos;
      } else {
        videosData = [];
      }
      
      // Calculate total storage used from video file sizes
      const totalStorageUsed = videosData.reduce((total, video) => {
        return total + (video.fileSize || 0);
      }, 0);

      // Get user stats from API response (supports { stats: {...} } and flat objects)
      const userStats = (userResponse.data && userResponse.data.stats) || userResponse.data || {};
      const isGodModeAdmin = user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god');

      const rawPlan = userStats.subscription?.plan || userStats.plan;
      let displayPlan = rawPlan || 'Free';
      if (user?.role === 'admin') {
        displayPlan = (rawPlan === 'god' || user?.subscription?.plan === 'god' || user?.plan === 'god') ? 'God' : 'Administrator';
      }

      setStats(prev => ({
        ...prev,
        videoCount: videosData.length,
        maxVideos: isGodModeAdmin ? 999999 : (userStats.subscription?.monthlyLimit || userStats.maxVideos || 10),
        plan: displayPlan,
        storageUsed: totalStorageUsed,
        storageLimit: (Number.isFinite(userStats.storageLimit) ? userStats.storageLimit : (userStats.storageLimit === Infinity ? Number.POSITIVE_INFINITY : 2 * 1024 * 1024 * 1024))
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const updateStats = (newStats) => {
    setStats(prev => ({ ...prev, ...newStats }));
  };

  const formatFileSize = (bytes) => {
    if (!Number.isFinite(bytes)) return '∞';
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, fetchStats]);

  const value = {
    stats,
    loading,
    fetchStats,
    updateStats,
    formatFileSize
  };

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
};