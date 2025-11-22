import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';
import ProfilePictureUploader from '../components/ProfilePictureUploader';
import OnboardingModal from '../components/OnboardingModal';
import SocialMediaPopup from '../components/SocialMediaPopup';
import SocialMediaScheduler from '../components/SocialMediaScheduler';
import SocialMediaCalendar from '../components/SocialMediaCalendar';
import ProcessingStatusModal from './ProcessingStatusModal';
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
  BarChart3,
  Crown,
  HardDrive,
  
} from 'lucide-react';
import '../styles/glass.css';
import DashboardStructure from '../components/DashboardStructure';
import UploadBubbles from '../components/UploadBubbles';
// UploadNotificationIndicator moved back into header; below-header indicator removed

const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const { stats, fetchStats, formatFileSize } = useStats();
  const location = useLocation();
  const videosSectionRef = useRef(null);
  const [flowStep, setFlowStep] = useState(0);
  const [flowActive, setFlowActive] = useState(true);
  // Aggregate upload notifications so multiple uploads project to one toast
  const [, setUploadNotif] = useState(null);
  const uploadNotifRef = useRef(null);
  const updateUploadToast = useCallback((delta = { success: 0, error: 0, totalAdd: 0 }, finalMessage) => {
    let agg = uploadNotifRef.current;
    if (!agg || !agg.toastId) {
      // Initialize aggregator
      agg = {
        total: delta.totalAdd || 0,
        success: 0,
        error: 0,
        toastId: toast.loading(`Uploading 0/${delta.totalAdd || 0}...`, { duration: Infinity })
      };
      uploadNotifRef.current = agg;
      setUploadNotif(agg);
    } else if (delta.totalAdd) {
      agg.total += delta.totalAdd;
    }

    agg.success += delta.success || 0;
    agg.error += delta.error || 0;

    // Emit lightweight global notification events for header indicator
    try {
      if (typeof window !== 'undefined') {
        if (delta.success && delta.success > 0) {
          window.dispatchEvent(new CustomEvent('upload-notification', { detail: { kind: 'success' } }));
        }
        if (delta.error && delta.error > 0) {
          window.dispatchEvent(new CustomEvent('upload-notification', { detail: { kind: 'error' } }));
        }
      }
    } catch {}
    const done = agg.success + agg.error;
    const allDone = agg.total > 0 && done >= agg.total;
    const text = finalMessage || (allDone
      ? `Uploaded ${agg.success}/${agg.total}${agg.error ? ` • ${agg.error} failed` : ''}`
      : `Uploading ${done}/${agg.total}...`);

    if (allDone) {
      if (agg.error) {
        toast.error(text, { id: agg.toastId, duration: 6000 });
      } else {
        toast.success(text, { id: agg.toastId, duration: 6000 });
      }
    } else {
      // Update the existing loading toast by re-calling loading with same id
      toast.loading(text, { id: agg.toastId, duration: Infinity });
    }

    if (allDone) {
      setUploadNotif(null);
      uploadNotifRef.current = null;
    } else {
      setUploadNotif({ ...agg });
    }
  }, []);
  

  // Robust scroll helper for My Files
  const scrollToVideosSection = useCallback(() => {
    const getOffset = () => {
      try {
        const header = document.getElementById('dashboard-header');
        const h = header ? header.offsetHeight : 64;
        return h + 8;
      } catch (_) {
        return 72;
      }
    };

    const attemptScroll = () => {
      const el = videosSectionRef.current || document.getElementById('videos-section');
      if (!el) return false;

      const offset = getOffset();
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      try {
        window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
      } catch (_) {
        window.scrollTo(0, Math.max(y, 0));
      }
      if (typeof el.focus === 'function') {
        try { el.focus({ preventScroll: true }); } catch (_) {}
      }
      return true;
    };

    if (attemptScroll()) return;
    const retries = [100, 250, 500];
    for (const ms of retries) {
      setTimeout(() => attemptScroll(), ms);
    }
  }, []);
  
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
  const [uploadStepComplete, setUploadStepComplete] = useState(false);
  const [lastUploadedItem, setLastUploadedItem] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const [showUploader, setShowUploader] = useState(false);
  const handleVideoProcessingRef = useRef(null);

  // Processing modal & status polling
  const [processingModalOpen, setProcessingModalOpen] = useState(false);
  const [processingVideo] = useState(null); // { id, title }
  const [processingStatus] = useState(null); // { status, progress, errorMessage }

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
  

  // Robust API base resolution
  const rawBase = (process.env.REACT_APP_API_URL || axios.defaults.baseURL || '');
  const trimmed = (rawBase || '').replace(/\/$/, '');
  const baseNoApi = /\/api$/.test(trimmed) ? trimmed.replace(/\/api$/, '') : trimmed;
  const origin = (typeof window !== 'undefined') ? window.location.origin : '';
  const devOverride = origin.includes('localhost:3000') ? 'http://localhost:5000' : origin;
  const API_BASE = baseNoApi || devOverride;
  const api = useCallback((p) => `${API_BASE}${p}`,[API_BASE]);

  const loadVideoBlob = useCallback(async (video) => {
    setVideoLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Use the stream endpoint for video preview
      const response = await axios.get(api(`/api/videos/${video._id}/stream`), {
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
  }, [api]);

  

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

  const onDrop = useCallback(async (acceptedFiles) => {
    const isVideo = (f) => (f.type || '').startsWith('video/') || /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(f.name || '');
    const isImage = (f) => (f.type || '').startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(f.name || '');
    const mediaFiles = acceptedFiles.filter(f => isVideo(f) || isImage(f));
    const rejected = acceptedFiles.filter(f => !(isVideo(f) || isImage(f)));
    if (rejected.length > 0) {
      toast.error(`Only videos or images are supported. Skipped ${rejected.length} unsupported file${rejected.length > 1 ? 's' : ''}.`);
    }
    if (mediaFiles.length === 0) {
      return;
    }

    // Immediately mark upload step as complete when we start sending to server
    setUploadStepComplete(true);

    // Add to pending (for bubbles/visuals) and immediately start upload
    // Initialize or extend the aggregated upload toast
    updateUploadToast({ totalAdd: mediaFiles.length });
    for (const file of mediaFiles) {
      const pendingId = Date.now() + Math.random();
      // Add to pending immediately so bubbles render regardless of server response
      setPendingVideoFiles(prevFiles => ([...prevFiles, { file, id: pendingId }]));
      const proc = handleVideoProcessingRef.current;
      if (!proc) break;
      // Fire upload without awaiting to allow concurrent uploads
      Promise.resolve(proc({ file, id: pendingId, title: file.name }))
        .catch(() => {
          // Keep the bubble even if upload fails; thumbnail generation is client-side
          // Optional: could mark a failed state here in future without removing bubble
          updateUploadToast({ error: 1 });
        });
    }
  }, [updateUploadToast]);

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

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif']
    },
    multiple: true,
    // Keep dropzone interactive to allow adding more files during ongoing uploads
    disabled: false
  });

  useEffect(() => {
    if (location.pathname === '/my-files' || location.hash === '#files') {
      scrollToVideosSection();
    }
    if (location.pathname === '/dashboard' || location.pathname === '/create-video') {
      const params = new URLSearchParams(location.search || '');
      const section = params.get('section');
      if (location.hash === '#social' || section === 'social') {
        setActiveSection('social');
      } else if (location.hash === '#settings' || section === 'settings') {
        setActiveSection('settings');
      } else {
        setActiveSection('dashboard');
        setFlowActive(true);
        setFlowStep(0);
      }
    }
  }, [location.pathname, location.hash, location.search, scrollToVideosSection]);

  // Horizontal flow controls for the new slider in DashboardStructure
  const finishFlow = useCallback(() => {
    setFlowActive(false);
    try {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    } catch (_) {}
    scrollToVideosSection();
  }, [scrollToVideosSection]);

  // Lightweight pop sound played on Next step from Upload slide
  const playPopSound = useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (_) {}
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
      osc.onended = () => {
        try { gain.disconnect(); osc.disconnect(); ctx.close(); } catch (_) {}
      };
    } catch (_) {}
  }, []);

  const nextFlowStep = useCallback(async () => {
    setFlowActive(true);
    // If on Step 2 (index 1), ask for confirmation and trigger server move
    if (flowStep === 1) {
      try {
        const token = localStorage.getItem('token');
        const listRes = await axios.get(api('/api/videos'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        let list = [];
        if (Array.isArray(listRes.data)) {
          list = listRes.data;
        } else if (listRes.data && Array.isArray(listRes.data.videos)) {
          list = listRes.data.videos;
        } else if (listRes.data && listRes.data.data && Array.isArray(listRes.data.data)) {
          list = listRes.data.data;
        }
        setVideos(list);
        let target = null;
        if (lastUploadedItem?.name) {
          target = list.find(v => (v.title || v.filename) === lastUploadedItem.name && (v.status === 'ready' || v.status === 'completed')) || null;
        }
        if (!target) {
          const ready = list.filter(v => v.status === 'ready');
          ready.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          target = ready[0] || null;
        }
        if (!target) {
          toast.error('No ready video found to process');
          return;
        }
        await axios.post(api(`/api/videos/${target._id}/process`), { editingOptions: {} }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Video queued for editing');
      } catch (error) {
        const msg = error?.response?.data?.message || 'Failed to queue video for editing';
        toast.error(msg);
        return; // Do not advance if server action failed
      }
    }
    setFlowStep((s) => {
      if (s >= 3) {
        // Already at last slide: finish the flow and bounce to videos
        setTimeout(() => finishFlow(), 0);
        return s;
      }
      return Math.min(s + 1, 3);
    });
  }, [finishFlow, flowStep, api]);

  const prevFlowStep = useCallback(() => {
    setFlowStep((s) => Math.max(s - 1, 0));
  }, []);

  useEffect(() => {
    // Lock vertical scroll while the horizontal flow is active
    try {
      if (flowActive) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    } catch (_) {}
    return () => {
      try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      } catch (_) {}
    };
  }, [flowActive]);

  // Ensure scrolling is enabled when switching away from the dashboard flow
  useEffect(() => {
    if (activeSection !== 'dashboard') {
      setFlowActive(false);
      try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      } catch (_) {}
    }
  }, [activeSection]);

  // Play a bubble pop sound when entering each step (0–3)
  const lastStepRef = useRef(flowStep);
  useEffect(() => {
    try {
      if (typeof flowStep === 'number' && flowStep !== lastStepRef.current) {
        playPopSound();
        lastStepRef.current = flowStep;
      }
    } catch (_) {}
  }, [flowStep, playPopSound]);

  // Ensure we start at top with the horizontal flow visible
  useEffect(() => {
    if (flowActive) {
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { window.scrollTo(0, 0); }
    }
  }, [flowActive]);

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

  

  const handleVideoProcessing = useCallback(async (videoData) => {
    // Mark step complete immediately at upload start
    setUploadStepComplete(true);
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Handle data from VideoEditingWizard: support multiple files and editingData
      const filesArray = Array.isArray(videoData.orderedFiles)
        ? videoData.orderedFiles.map(f => f.file || f)
        : (videoData.file ? [videoData.file] : []);

      if (!filesArray.length) {
        console.error('No files found in videoData:', videoData);
        toast.error('No file selected for upload');
        return;
      }

      const formData = new FormData();
      filesArray.forEach(f => formData.append('video', f));
      const totalNewSize = filesArray.reduce((sum, f) => sum + (f.size || 0), 0);
      const limit = stats?.storageLimit || 0;
      const used = stats?.storageUsed || 0;
      if (limit > 0 && used + totalNewSize > limit) {
        toast.error(`Upload exceeds your storage limit. Used ${formatFileSize(used)}, adding ${formatFileSize(totalNewSize)} would exceed ${formatFileSize(limit)}.`);
        return;
      }
      const primaryFile = filesArray[0];
      const title = videoData.title || videoData.videoName || primaryFile.name;
      formData.append('title', title);
      formData.append('description', videoData.description || '');
      formData.append('multipleFiles', String(filesArray.length > 1));
      formData.append('fileCount', String(filesArray.length));
      formData.append('fileNames', JSON.stringify(filesArray.map(f => f.name)));

      // Collect editing data preferences to match server expectations
      // Include new platform selection and story mode fields from the wizard
      const editingData = {
        videoName: videoData.videoName || title,
        videoType: videoData.videoType || '',
        targetAudience: videoData.targetAudience || '',
        editingStyle: videoData.editingStyle || '',
        duration: videoData.duration || '',
        specialRequests: videoData.specialRequests || '',
        platforms: Array.isArray(videoData.platforms) ? videoData.platforms : [],
        recommendedDurations: videoData.recommendedDurations || {},
        storyMode: Boolean(videoData.storyMode || videoData.isStory),
        estimatedExtraCredits: typeof videoData.estimatedExtraCredits === 'number'
          ? videoData.estimatedExtraCredits
          : (videoData.storyMode || videoData.isStory ? 1 : 0)
      };
      formData.append('editingData', JSON.stringify(editingData));

      const token = localStorage.getItem('token');
      // Helper to retry upload on transient network changes
      const postWithRetry = async (url, data, config, retries = 2, delayMs = 1000) => {
        try {
          return await axios.post(url, data, config);
        } catch (err) {
          const isNetworkChanged = err?.code === 'ERR_NETWORK_CHANGED' ||
            (typeof err?.message === 'string' && err.message.includes('ERR_NETWORK_CHANGED')) ||
            (typeof err?.toString === 'function' && err.toString().includes('ERR_NETWORK_CHANGED'));
          if (retries > 0 && isNetworkChanged) {
            await new Promise(r => setTimeout(r, delayMs));
            return postWithRetry(url, data, config, retries - 1, delayMs * 2);
          }
          throw err;
        }
      };

      const response = await postWithRetry(api('/api/videos/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      console.log('Upload response:', response.data);
      // Aggregate success into single notification
      updateUploadToast({ success: 1 });
      
      // Do not remove bubbles on success; keep them until at least Step 2
      // Removal is handled by flowStep progression to Step 3 or later

      // Mark step completion and remember the uploaded item for the next container
      setUploadStepComplete(true);
      setLastUploadedItem({
        name: title,
        size: primaryFile?.size || 0
      });

      // Refresh lists to show the newly uploaded video in "ready" state
      fetchVideos();
      fetchStats();
    } catch (error) {
      console.error('Upload error:', error);
      // Aggregate error into single notification and optionally show the last error message
      const msg = error?.response?.data?.message;
      updateUploadToast({ error: 1 }, msg ? `Upload error: ${msg}` : undefined);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [stats, fetchVideos, fetchStats, api, formatFileSize, updateUploadToast]);

  // Keep bubbles visible through Step 2; clear only after moving past it
  useEffect(() => {
    try {
      if (flowStep >= 2 && pendingVideoFiles.length > 0) {
        setPendingVideoFiles([]);
      }
    } catch (_) {}
  }, [flowStep, pendingVideoFiles.length]);

  // Bubbles remain static across Step 1 and Step 2; only slider moves

  useEffect(() => {
    handleVideoProcessingRef.current = handleVideoProcessing;
  }, [handleVideoProcessing]);

  // Explicitly start processing for a video when user clicks Process
  

  // Poll server for processing status every 2 seconds
  

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

  useEffect(() => {
    if (selectedVideo && (selectedVideo.status === 'ready' || selectedVideo.status === 'completed')) {
      loadVideoBlob(selectedVideo);
    }
  }, [selectedVideo, loadVideoBlob]);

  const downloadVideo = async (video) => {
    try {
      const token = localStorage.getItem('token');
      
      // Use the stream endpoint for downloading as well
      const response = await axios.get(api(`/api/videos/${video._id}/stream`), {
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

  

  // Admin backup functions

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
    <div className="min-h-screen bg-transparent">
      <ProfilePictureUploader isOpen={showUploader} onClose={() => setShowUploader(false)} />
      {/* Onboarding Modal: show if user hasn’t connected Facebook and hasn’t dismissed */}
      {(() => {
        try {
          const dismissed = typeof window !== 'undefined' ? localStorage.getItem('onboardingDismissed') === 'true' : false;
          const needsFacebook = !(Array.isArray(user?.linkedSocialAccounts) && user.linkedSocialAccounts.includes('facebook'));
          const show = needsFacebook && !dismissed;
          return <OnboardingModal isOpen={show} onClose={() => { if (typeof window !== 'undefined') localStorage.setItem('onboardingDismissed', 'true'); }} />;
        } catch (_) {
          return null;
        }
      })()}

      
            <main id="dashboard-main" className="md:ml-64 bg-transparent min-h-[calc(100vh-4rem)] overflow-y-auto relative" role="main" aria-label="Dashboard content">
        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="p-0 min-h-screen">
            {/* Single global bubbles overlay (portal) so positions persist across steps */}
            {pendingVideoFiles.length > 0 && (
              <UploadBubbles
                files={pendingVideoFiles}
                className=""
                onDelete={(id) => setPendingVideoFiles(prev => prev.filter(f => (f.id || f?.id) !== id))}
              />
            )}
            {/* Structure prototype wired with real step content */}
              <DashboardStructure
                uploadCompleted={uploadStepComplete}
                onUploadClick={open}
                uploadContent={(
                  <>
                    <div
                      {...getRootProps({ tabIndex: -1 })}
                      className={`relative glass-dropzone rounded-xl p-8 text-center border-2 border-dashed transition-colors focus:outline-none outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        isDragActive
                          ? 'border-blue-300/70 bg-white/20'
                          : 'border-gray-600 hover:border-gray-700'
                      } ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                    <input id="dropzone-input" {...getInputProps()} />
                    <div className="plastic-badge w-16 h-16 mx-auto -mt-4 mb-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-2 ring-blue-300/40 shadow-xl">
                      <Upload className="w-8 h-8 text-white" />
                    </div>
                    {uploading ? (
                      <div className="space-y-2">
                        <p className="text-gray-600">Uploading... {uploadProgress}%</p>
                        <div className="w-full bg-white/30 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : isDragActive ? (
                      <p className="text-blue-700 font-medium">Drop videos and images here...</p>
                    ) : (
                      <div>
                        <p className="text-black mb-1">
                          Drag & Drop Videos and Images Here
                        </p>
                        <p className="text-sm text-white">
                          Supports MP4, AVI, MOV, WMV, FLV, WebM, MKV; plus JPG, JPEG, PNG, GIF, WEBP, HEIC, HEIF
                        </p>
                      </div>
                    )}
                    {/* Removed floating green tick to keep UI clean */}
                  </div>

                  {/* Pending list replaced by floating bubbles UI */}
                  {pendingVideoFiles.length > 0 && null}
                </>
              )}
              processContent={(
                <>
                  {/* Primary instruction to initiate processing */}
                  <div className="mb-4">
                    <p className="text-lg font-semibold text-gray-800">
                      Click <span className="text-blue-600">Process Video</span> when you’re ready for your files to be edited and prepared to schedule.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Please hover or tap a bubble to remove it from the video process, or click Back to add more files.
                    </p>
                  </div>
                </>
              )}
              stepIndex={flowStep}
              onNext={nextFlowStep}
              onPrev={prevFlowStep}
              onFinish={finishFlow}
            />

            {/* Overlay removed; horizontal flow is now embedded in DashboardStructure */}
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Step 1 and Step 2 are now embedded in the structure above */}

              {/* Step 3 removed: Social media connect no longer needed */}

              {/* Videos Grid moved to My Files page */}
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

        {/* Admin Section removed: use dedicated /admin route */}

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
          <div className="p-3 lg:p-4 min-h-screen" style={{ marginTop: 'calc(var(--dashboard-header-bottom, 64px) + 12px)' }}>
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


      {/* Processing Status Modal */}
      <ProcessingStatusModal
        isOpen={processingModalOpen}
        videoTitle={processingVideo?.title}
        status={processingStatus?.status}
        progress={processingStatus?.progress}
        errorMessage={processingStatus?.errorMessage}
        onClose={() => setProcessingModalOpen(false)}
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
