import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';
import VideoEditingWizard from '../components/VideoEditingWizard';
import VideoThumbnail from '../components/VideoThumbnail';
import Navbar from '../components/Navbar';
import AppleProfileImage from '../components/AppleProfileImage';
import ProfilePictureUploader from '../components/ProfilePictureUploader';
import SocialMediaPopup from '../components/SocialMediaPopup';
import SocialMediaScheduler from '../components/SocialMediaScheduler';
import SocialMediaCalendar from '../components/SocialMediaCalendar';
import { 
  Upload, 
  Video, 
  Download, 
  FileVideo,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Loader,
  Home,
  Settings,
  BarChart3,
  Crown,
  HardDrive,
  Shield,
  Share2
} from 'lucide-react';

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const { stats, fetchStats, formatFileSize } = useStats();
  
  console.log('Dashboard Debug - User:', user);
  console.log('Dashboard Debug - Stats:', stats);
  console.log('Dashboard Debug - User Role:', user?.role);
  console.log('Dashboard Debug - User Plan:', user?.plan);
  console.log('Dashboard Debug - Stats Plan:', stats?.plan);

  // Add a manual refresh button for testing
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
        e.preventDefault();
        refreshUser();
        fetchStats();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [refreshUser, fetchStats]);

  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingVideoFiles, setPendingVideoFiles] = useState([]);
  const [showWizard, setShowWizard] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  const [socialMediaPopupOpen, setSocialMediaPopupOpen] = useState(false);
  const [socialMediaData, setSocialMediaData] = useState({
    instagram: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    facebook: ''
  });
  const [showSocialScheduler, setShowSocialScheduler] = useState(false);
  const [schedulerVideo, setSchedulerVideo] = useState(null);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [connectingDrive, setConnectingDrive] = useState(false);

  // Backup state
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [currentBackup, setCurrentBackup] = useState(null);
  const [backupComplete, setBackupComplete] = useState(false);
  const [showBackupListModal, setShowBackupListModal] = useState(false);

  // Video editing state
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editingFilename, setEditingFilename] = useState('');

  // Resolve API base, falling back to same-origin relative path
  const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
  const api = (p) => `${API_BASE}${p}`;

  const handleVideoClick = useCallback((video) => {
    setSelectedVideo(video);
    setShowPreviewModal(true);
    if (video.status === 'ready' || video.status === 'completed') {
      loadVideoBlob(video);
    }
  }, []);

  const loadVideoBlob = async (video) => {
    setVideoLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Use the stream endpoint for video preview
      const response = await axios.get(`/api/videos/${video._id}/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoBlobUrl(url);
    } catch (error) {
      console.error('Error loading video blob:', error);
      toast.error('Failed to load video preview');
    } finally {
      setVideoLoading(false);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setSelectedVideo(null);
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }
    setVideoLoading(false);
  };

  const handleSaveSocialMedia = async (socialData) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/users/social-media`, socialData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSocialMediaData(socialData);
      setSocialMediaPopupOpen(false);
      toast.success('Social media links updated successfully!');
    } catch (error) {
      console.error('Error updating social media:', error);
      toast.error('Failed to update social media links');
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    setPendingVideoFiles(prevFiles => [
      ...prevFiles,
      ...acceptedFiles.map(file => ({ file, id: Date.now() + Math.random() }))
    ]);
  }, []);

  const handleConnectGoogleDrive = async () => {
    try {
      setConnectingDrive(true);
      const { data } = await axios.get('/api/integrations/google-drive/auth');
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to start Google Drive auth');
        setConnectingDrive(false);
      }
    } catch (error) {
      console.error('Google Drive auth error:', error);
      toast.error(error.response?.data?.message || 'Google Drive auth failed');
      setConnectingDrive(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    },
    multiple: true,
    disabled: uploading
  });

  const fetchVideos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching videos with token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/videos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('API Response:', response.data);
      
      let videosData = [];
      if (Array.isArray(response.data)) {
        videosData = response.data;
      } else if (response.data && Array.isArray(response.data.videos)) {
        videosData = response.data.videos;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        videosData = response.data.data;
      }
      
      console.log('Processed videos data:', videosData);
      console.log('Number of videos:', videosData.length);
      
      setVideos(videosData);
    } catch (error) {
      console.error('Error fetching videos:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast.error('Failed to fetch videos');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      console.log('Deleting video with ID:', videoId);
      
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Video deleted successfully');
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error deleting video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleVideoProcessing = async (videoData) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Handle the data structure from VideoEditingWizard
      const file = videoData.file || (videoData.orderedFiles && videoData.orderedFiles[0]?.file) || videoData.orderedFiles?.[0];
      
      if (!file) {
        console.error('No file found in videoData:', videoData);
        toast.error('No file selected for upload');
        return;
      }

      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', videoData.title || videoData.videoName || file.name);
      formData.append('description', videoData.description || '');
      
      if (videoData.trimStart !== undefined) {
        formData.append('trimStart', videoData.trimStart);
      }
      if (videoData.trimEnd !== undefined) {
        formData.append('trimEnd', videoData.trimEnd);
      }
      if (videoData.filters && videoData.filters.length > 0) {
        formData.append('filters', JSON.stringify(videoData.filters));
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/videos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      console.log('Upload response:', response.data);
      toast.success('Video uploaded successfully!');
      
      setPendingVideoFiles(prev => prev.filter(f => f.id !== videoData.id));
      fetchVideos();
      fetchStats();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'ready':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const downloadVideo = async (video) => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the stream endpoint for downloading as well
      const response = await axios.get(`/api/videos/${video._id}/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = video.filename || `video_${video._id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Video download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download video');
    }
  };

  const startEditingFilename = (video) => {
    setEditingVideoId(video._id);
    setEditingFilename(video.title || video.filename);
  };

  const saveFilename = async (videoId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${process.env.REACT_APP_API_URL}/api/videos/${videoId}`, 
        { title: editingFilename },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setVideos(videos.map(v => 
        v._id === videoId ? { ...v, title: editingFilename } : v
      ));
      setEditingVideoId(null);
      setEditingFilename('');
      toast.success('Video title updated');
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('Failed to update title');
    }
  };

  const cancelEditing = () => {
    setEditingVideoId(null);
    setEditingFilename('');
  };

  // Admin backup functions
  const handleViewSystemLogs = () => {
    toast('System logs feature coming soon!', {
      icon: '📋',
      duration: 3000,
    });
  };

  const handleCreateBackup = async () => {
    if (backupLoading) return;
    
    // Reset states and show modal
    setBackupProgress(0);
    setBackupComplete(false);
    setCurrentBackup(null);
    setShowBackupModal(true);
    setBackupLoading(true);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until actual completion
        }
        return prev + Math.random() * 15; // Random progress increments
      });
    }, 500);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        setShowBackupModal(false);
        return;
      }

      const response = await axios.post(api('/api/backup-simple/create'), {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      clearInterval(progressInterval);
      setBackupProgress(100);
      
      // Treat any 200 OK with a backup name as success
      if (response.status === 200 && response.data && response.data.backup) {
        setCurrentBackup({
          name: response.data.backup,
          path: response.data.path,
          size: 'Calculating...', // Will be updated with actual size
          created: new Date().toLocaleString()
        });
        setBackupComplete(true);
        
        // Refresh backup list
        await fetchBackups();
      } else {
        toast.error('Backup creation failed');
        setShowBackupModal(false);
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Backup creation error:', error);
      setShowBackupModal(false);
      
      if (error.response?.status === 403) {
        toast.error('Admin access required for backup operations');
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create backup');
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = () => {
    if (currentBackup) {
      handleDownloadBackupFromList(currentBackup.name);
    }
  };

  const handleCloseBackupModal = () => {
    setShowBackupModal(false);
    setBackupProgress(0);
    setBackupComplete(false);
    setCurrentBackup(null);
  };

  const handleDeleteBackup = async (backupName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(api(`/api/backup/${backupName}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success(`Backup ${backupName} deleted successfully`);
        await fetchBackups(); // Refresh the list
      } else {
        toast.error('Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast.error('Failed to delete backup');
    }
  };

  const handleDownloadBackupFromList = (backupName) => {
    try {
      const token = localStorage.getItem('token');
      const downloadUrl = api(`/api/backup-simple/download/${backupName}`);
      
      // Add authorization header by creating a fetch request
      fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Create blob URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${backupName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success(`Backup downloaded: ${backupName}.zip`);
      })
      .catch(error => {
        console.error('Download error:', error);
        toast.error(`Download failed: ${error.message}`);
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Download failed: ${error.message}`);
    }
  };

  const formatBackupDate = (backup) => {
    try {
      if (backup.created) {
        // Use the created timestamp from the API response
        return new Date(backup.created).toLocaleString();
      } else {
        // Fallback to parsing the backup name format: backup-2025-10-09T11-15-58-077Z
        const timestamp = backup.name.replace('backup-', '').replace(/T/, ' ').replace(/-/g, ':').replace('Z', '');
        return new Date(timestamp).toLocaleString();
      }
    } catch (error) {
      return 'Unknown date';
    }
  };

  const handleViewBackups = async () => {
    try {
      await fetchBackups();
      if (backups.length === 0) {
        toast('No backups found. Create your first backup!', {
          icon: '📦',
          duration: 4000,
        });
      } else {
        // Show backup management modal
        setShowBackupListModal(true);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to fetch backups');
    }
  };

  const fetchBackups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/backup/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setBackups(response.data.backups);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchStats();
  }, [fetchVideos, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <ProfilePictureUploader isOpen={showUploader} onClose={() => setShowUploader(false)} />

      {/* Dashboard Sidebar Navigation */}
      <div className="hidden sm:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-lg z-40 overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <AppleProfileImage size="lg" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 text-lg truncate">{user?.name || 'User'}</p>
                {user?.role === 'admin' ? (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <Shield className="w-3 h-3 mr-1" />
                      Administrator
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Crown className="w-3 h-3 mr-1" />
                      {stats.plan} Plan
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowUploader(true)}
              className="mt-3 w-full text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Update your profile picture
            </button>
          </div>

          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveSection('dashboard')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Dashboard</span>
              </button>
              
              <button
                onClick={() => setActiveSection('stats')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === 'stats'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Analytics</span>
              </button>
              
              <button
                onClick={() => setActiveSection('social')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === 'social'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Share2 className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Social Media</span>
              </button>
              
              {user?.role === 'admin' && (
                <button
                  onClick={() => setActiveSection('admin')}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-50"
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Admin Dashboard</span>
                </button>
              )}
              
              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeSection === 'settings'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Settings</span>
              </button>
            </nav>
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Videos</span>
                <span className="font-medium text-gray-900">
                  {user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god') 
                    ? `${stats.videoCount}/∞` 
                    : `${stats.videoCount}/${stats.maxVideos}`
                  }
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Storage</span>
                <span className="font-medium text-gray-900">
                  {formatFileSize(stats.storageUsed)}
                  {stats.storageLimit > 0 && ` / ${formatFileSize(stats.storageLimit)}`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god')
                      ? '100%' 
                      : `${Math.min((stats.videoCount / stats.maxVideos) * 100, 100)}%`
                  }}
                ></div>
              </div>
              {user?.role === 'admin' ? (
                <button className="w-full px-3 py-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 animate-pulse">
                  <Crown className="w-4 h-4" />
                  <span>🔥 GOD MODE 🔥</span>
                </button>
              ) : stats.plan === 'Free' ? (
                <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2">
                  <Crown className="w-4 h-4" />
                  <span>Upgrade Plan</span>
                </button>
              ) : (
                <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2">
                  <Crown className="w-4 h-4" />
                  <span>{stats.plan} Plan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className="sm:hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)}></div>
            <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* User Profile Section - Mobile */}
                  <div className="flex items-center space-x-3 mb-4">
                    <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{user?.name || 'User'}</p>
                      {user?.role === 'admin' ? (
                        <div className="flex items-center space-x-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Shield className="w-3 h-3 mr-1" />
                            Administrator
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Crown className="w-3 h-3 mr-1" />
                            {stats?.plan || 'Free'} Plan
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowUploader(true)}
                    className="mx-4 mb-4 w-[calc(100%-2rem)] text-left text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Update your profile picture
                  </button>
                </div>
                
                <div className="flex-1 p-4">
                  <nav className="space-y-2">
                    <button
                      onClick={() => {
                        setActiveSection('dashboard');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeSection === 'dashboard'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Home className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">Dashboard</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveSection('stats');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeSection === 'stats'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <BarChart3 className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">Analytics</span>
                    </button>
                    
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setActiveSection('admin');
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          activeSection === 'admin'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Shield className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Admin Dashboard</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setActiveSection('settings');
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeSection === 'settings'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Settings className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">Settings</span>
                    </button>
                  </nav>
                </div>

                {/* Stats Summary - Mobile */}
                <div className="p-4 border-t border-gray-100">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Videos</span>
                      <span className="font-medium text-gray-900">
                        {user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god') 
                          ? `${stats.videoCount}/∞` 
                          : `${stats.videoCount}/${stats.maxVideos}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Storage</span>
                      <span className="font-medium text-gray-900">
                        {formatFileSize(stats.storageUsed)}
                        {stats.storageLimit > 0 && ` / ${formatFileSize(stats.storageLimit)}`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god')
                            ? '100%' 
                            : `${Math.min((stats.videoCount / stats.maxVideos) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    {user?.role === 'admin' ? (
                      <button className="w-full px-3 py-2 bg-gradient-to-r from-yellow-500 to-red-600 text-white rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-red-700 transition-all duration-200 flex items-center justify-center space-x-2 animate-pulse">
                        <Crown className="w-4 h-4" />
                        <span>🔥 GOD MODE 🔥</span>
                      </button>
                    ) : stats.plan === 'Free' ? (
                      <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2">
                        <Crown className="w-4 h-4" />
                        <span>Upgrade Plan</span>
                      </button>
                    ) : (
                      <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2">
                        <Crown className="w-4 h-4" />
                        <span>{stats.plan} Plan</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="sm:ml-64 pt-2" role="main" aria-label="Dashboard content">
        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="p-3 lg:p-4 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-3">
              {/* Upload Section */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Upload Videos</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Video className="w-4 h-4" />
                    <span>{videos.length} videos</span>
                  </div>
                </div>
                
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragActive
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  {uploading ? (
                    <div className="space-y-2">
                      <p className="text-gray-600">Uploading... {uploadProgress}%</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : isDragActive ? (
                    <p className="text-blue-600 font-medium">Drop the videos here...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Drag & drop videos here, or <span className="text-blue-600 font-medium">click to browse</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports MP4, AVI, MOV, WMV, FLV, WebM, MKV
                      </p>
                    </div>
                  )}
                </div>

                {pendingVideoFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="font-medium text-gray-900">Pending Videos ({pendingVideoFiles.length})</h3>
                    <div className="space-y-2">
                      {pendingVideoFiles.map((videoFile) => (
                        <div key={videoFile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileVideo className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">{videoFile.file.name}</span>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(videoFile.file.size)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowWizard(true)}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Process
                            </button>
                            <button
                              onClick={() => setPendingVideoFiles(prev => prev.filter(f => f.id !== videoFile.id))}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Videos Grid */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Your Videos</h2>
                  <span className="text-sm text-gray-600">{videos.length} videos</span>
                </div>

                {videos.length === 0 ? (
                  <div className="text-center py-12">
                    <FileVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
                    <p className="text-gray-600 mb-4">Upload your first video to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {videos.map((video) => (
                      <VideoThumbnail
                        key={video._id}
                        video={video}
                        onPlay={() => handleVideoClick(video)}
                        onDownload={() => downloadVideo(video)}
                        onDelete={() => deleteVideo(video._id)}
                        onEdit={() => startEditingFilename(video)}
                        onSchedule={(video) => {
                          setSchedulerVideo(video);
                          setShowSocialScheduler(true);
                        }}
                        isEditing={editingVideoId === video._id}
                        editingFilename={editingFilename}
                        setEditingFilename={setEditingFilename}
                        onSaveEdit={() => saveFilename(video._id)}
                        onCancelEdit={cancelEditing}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        {activeSection === 'stats' && (
          <div className="p-3 lg:p-4 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Analytics Dashboard</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Videos</p>
                        <p className="text-3xl font-bold">{stats.videoCount || 0}</p>
                      </div>
                      <Video className="w-8 h-8 text-blue-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Storage Used</p>
                        <p className="text-3xl font-bold">{formatFileSize(stats.storageUsed || 0)}</p>
                      </div>
                      <HardDrive className="w-8 h-8 text-green-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Plan</p>
                        <p className="text-3xl font-bold">{stats.plan || 'Free'}</p>
                      </div>
                      <Crown className="w-8 h-8 text-purple-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Video Limit</p>
                        <p className="text-3xl font-bold">
                          {user?.role === 'admin' ? '∞' : stats.maxVideos || 0}
                        </p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-orange-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Section */}
        {activeSection === 'admin' && user?.role === 'admin' && (
          <div className="p-3 lg:p-4 min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                      <p className="text-gray-600">System administration and management</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-600">System Online</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">1</p>
                      <p className="text-xs text-green-600 mt-1">+0% from last month</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Videos</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stats.videoCount || 0}</p>
                      <p className="text-xs text-green-600 mt-1">All time uploads</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                      <Video className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Storage Used</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{formatFileSize(stats.storageUsed || 0)}</p>
                      <p className="text-xs text-gray-500 mt-1">Unlimited available</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                      <HardDrive className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">System Status</p>
                      <p className="text-3xl font-bold text-green-600 mt-1">100%</p>
                      <p className="text-xs text-green-600 mt-1">All systems operational</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Management */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Settings className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">System Management</h3>
                        <p className="text-sm text-gray-600">Core system administration tools</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    <button 
                      onClick={handleViewSystemLogs}
                      className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Loader className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">View System Logs</p>
                          <p className="text-sm text-gray-600">Monitor application activity</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        →
                      </div>
                    </button>

                    <button 
                      onClick={handleCreateBackup}
                      disabled={backupLoading}
                      className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                          {backupLoading ? (
                            <Loader className="w-4 h-4 text-green-600 animate-spin" />
                          ) : (
                            <HardDrive className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {backupLoading ? 'Creating Backup...' : 'Create System Backup'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {backupLoading ? 'Please wait...' : 'Backup entire system to backup folder'}
                          </p>
                        </div>
                      </div>
                      <div className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        →
                      </div>
                    </button>

                    <button 
                      onClick={handleViewBackups}
                      className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">View Backups</p>
                          <p className="text-sm text-gray-600">Manage system backups</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        →
                      </div>
                    </button>
                  </div>
                </div>

                {/* User Management */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                        <p className="text-sm text-gray-600">Manage users and permissions</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    <button className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group" onClick={() => navigate('/admin?tab=users')}>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Shield className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">View All Users</p>
                          <p className="text-sm text-gray-600">Manage user accounts</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        →
                      </div>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                          <Crown className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Admin Privileges</p>
                          <p className="text-sm text-gray-600">Manage admin access</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        →
                      </div>
                    </button>

                    <button className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Security Settings</p>
                          <p className="text-sm text-gray-600">Configure security policies</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        →
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* GOD MODE Banner */}
              <div className="bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <Crown className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">🔥 GOD MODE ACTIVATED 🔥</h3>
                      <p className="text-white text-opacity-90">You have unlimited access to all system features</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white text-opacity-75">Admin Level</p>
                    <p className="text-3xl font-bold">∞</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup Progress Modal */}
        {showBackupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <div className="text-center">
                {!backupComplete ? (
                  <>
                    {/* Progress Animation */}
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <HardDrive className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Creating Full Website Backup</h3>
                     <p className="text-gray-600 mb-6">Please wait while we backup your entire website including database, server files, client files, and configuration...</p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${backupProgress}%` }}
                      ></div>
                    </div>
                    
                    {/* Progress Percentage */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-semibold text-blue-600">{Math.round(backupProgress)}%</span>
                    </div>
                    
                    {/* Progress Steps */}
                     <div className="mt-6 text-left">
                       <div className={`flex items-center mb-2 ${backupProgress > 10 ? 'text-green-600' : 'text-gray-400'}`}>
                         <CheckCircle className="w-4 h-4 mr-2" />
                         <span className="text-sm">Connecting to database...</span>
                       </div>
                       <div className={`flex items-center mb-2 ${backupProgress > 25 ? 'text-green-600' : 'text-gray-400'}`}>
                         <CheckCircle className="w-4 h-4 mr-2" />
                         <span className="text-sm">Exporting database collections...</span>
                       </div>
                       <div className={`flex items-center mb-2 ${backupProgress > 45 ? 'text-green-600' : 'text-gray-400'}`}>
                         <CheckCircle className="w-4 h-4 mr-2" />
                         <span className="text-sm">Backing up server files...</span>
                       </div>
                       <div className={`flex items-center mb-2 ${backupProgress > 65 ? 'text-green-600' : 'text-gray-400'}`}>
                         <CheckCircle className="w-4 h-4 mr-2" />
                         <span className="text-sm">Backing up client files...</span>
                       </div>
                       <div className={`flex items-center mb-2 ${backupProgress > 85 ? 'text-green-600' : 'text-gray-400'}`}>
                         <CheckCircle className="w-4 h-4 mr-2" />
                         <span className="text-sm">Backing up configuration...</span>
                       </div>
                       <div className={`flex items-center ${backupProgress >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                         <CheckCircle className="w-4 h-4 mr-2" />
                         <span className="text-sm">Compressing and finalizing...</span>
                       </div>
                     </div>
                  </>
                ) : (
                  <>
                    {/* Success Animation */}
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <CheckCircle className="w-10 h-10 text-white" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Full Website Backup Complete! 🎉</h3>
                     <p className="text-gray-600 mb-6">Your complete website backup has been created successfully.</p>
                    
                    {/* Backup Details */}
                    {currentBackup && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Backup ID:</span>
                          <span className="text-sm text-gray-900 font-mono">{currentBackup.name}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">Size:</span>
                          <span className="text-sm text-gray-900">{currentBackup.size}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Created:</span>
                          <span className="text-sm text-gray-900">{currentBackup.created}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={handleDownloadBackup}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={handleCloseBackupModal}
                        className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backup List Management Modal */}
        {showBackupListModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">System Backups</h3>
                  <p className="text-gray-600">Manage your website backups</p>
                </div>
                <button
                  onClick={() => setShowBackupListModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <HardDrive className="w-10 h-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Backups Found</h4>
                  <p className="text-gray-600 mb-6">Create your first backup to get started</p>
                  <button
                    onClick={() => {
                      setShowBackupListModal(false);
                      handleCreateBackup();
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create First Backup
                  </button>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-96">
                   <div className="space-y-3">
                     {backups.map((backup, index) => (
                       <div key={index} className="bg-gray-50 rounded-xl p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
                         <div className="flex items-center space-x-4">
                           <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                             <HardDrive className="w-6 h-6 text-blue-600" />
                           </div>
                           <div>
                             <h4 className="font-semibold text-gray-900">{backup.name || backup}</h4>
                             <div className="flex items-center space-x-4 text-sm text-gray-600">
                               <span>Created: {formatBackupDate(backup)}</span>
                               {backup.size && <span>Size: {backup.size}</span>}
                             </div>
                           </div>
                         </div>
                         
                         <div className="flex items-center space-x-2">
                           <button
                             onClick={() => handleDownloadBackupFromList(backup.name || backup)}
                             className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                             title="Download Backup"
                           >
                             <Download className="w-5 h-5" />
                           </button>
                           <button
                             onClick={() => {
                               const backupName = backup.name || backup;
                               if (window.confirm(`Are you sure you want to delete backup "${backupName}"? This action cannot be undone.`)) {
                                 handleDeleteBackup(backupName);
                               }
                             }}
                             className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                             title="Delete Backup"
                           >
                             <X className="w-5 h-5" />
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {backups.length > 0 && `${backups.length} backup${backups.length > 1 ? 's' : ''} available`}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBackupListModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowBackupListModal(false);
                      handleCreateBackup();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>Create New Backup</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Social Media Section */}
        {activeSection === 'social' && (
          <div className="p-3 lg:p-4 min-h-screen">
            <div className="max-w-6xl mx-auto space-y-6">
              <SocialMediaCalendar />
            </div>
          </div>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <div className="p-3 lg:p-4 min-h-screen">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 lg:mb-6">Account Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-medium text-gray-900">Profile Information</h3>
                      <p className="text-sm text-gray-600">Update your account details</p>
                    </div>
                    <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium">
                      Edit
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-medium text-gray-900">Password</h3>
                      <p className="text-sm text-gray-600">Change your password</p>
                    </div>
                    <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium">
                      Change
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="font-medium text-gray-900">Notifications</h3>
                      <p className="text-sm text-gray-600">Manage your notification preferences</p>
                    </div>
                    <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium">
                      Configure
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg lg:rounded-xl border border-gray-200 p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 lg:mb-6">Integrations</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="font-medium text-gray-900">Google Drive</h3>
                      <p className="text-sm text-gray-600">Connect to upload and access your files</p>
                    </div>
                    <button
                      onClick={handleConnectGoogleDrive}
                      disabled={connectingDrive}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {connectingDrive ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Video Editing Wizard */}
      <VideoEditingWizard
        isOpen={showWizard}
        videoFiles={pendingVideoFiles}
        onClose={() => {
          setShowWizard(false);
          setPendingVideoFiles([]);
        }}
        onProcessVideo={handleVideoProcessing}
      />

      {/* Social Media Popup */}
      {socialMediaPopupOpen && (
        <SocialMediaPopup
          isOpen={socialMediaPopupOpen}
          onClose={() => setSocialMediaPopupOpen(false)}
          socialMediaData={socialMediaData}
          onSave={handleSaveSocialMedia}
        />
      )}

      {/* Video Preview Modal */}
      {showPreviewModal && selectedVideo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
          onClick={closePreviewModal}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex-1 mr-4 break-words">
                {selectedVideo.title || selectedVideo.filename}
              </h2>
              <button
                onClick={closePreviewModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="w-full h-96 bg-gray-100 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
                {selectedVideo.status === 'ready' || selectedVideo.status === 'completed' ? (
                  <>
                    {videoLoading ? (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Loader className="w-12 h-12 animate-spin mb-4" />
                        <p className="text-lg font-medium">Loading video...</p>
                      </div>
                    ) : videoBlobUrl ? (
                      <video 
                        controls 
                        src={videoBlobUrl}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('Video playback error:', e);
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <AlertCircle className="w-12 h-12 mb-4" />
                        <p className="text-lg font-medium">Failed to load video</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <FileVideo className="w-12 h-12 mb-4" />
                    <p className="text-lg font-medium">
                      {selectedVideo.status === 'processing' ? 'Video is being processed...' : 
                       selectedVideo.status === 'failed' ? 'Video processing failed' :
                       'Video preview not available'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Status:</span>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedVideo.status)}
                    <span className="font-semibold text-gray-900 capitalize">
                      {selectedVideo.status}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Uploaded:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedVideo.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {selectedVideo.fileSize && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">File Size:</span>
                    <span className="font-semibold text-gray-900">
                      {formatFileSize(selectedVideo.fileSize)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              {selectedVideo.status === 'ready' && (
                <button 
                  onClick={() => downloadVideo(selectedVideo)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video</span>
                </button>
              )}
              <button 
                onClick={closePreviewModal}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Media Scheduler Modal */}
      {showSocialScheduler && schedulerVideo && (
        <SocialMediaScheduler
          video={schedulerVideo}
          onClose={() => {
            setShowSocialScheduler(false);
            setSchedulerVideo(null);
          }}
          onSchedule={(scheduleData) => {
            console.log('Post scheduled:', scheduleData);
            // Refresh calendar or show success message
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;