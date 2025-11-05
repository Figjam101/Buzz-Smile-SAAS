import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FileVideo, Play, AlertCircle, Trash2, Download, Edit3, Check, X, Share2, Wand2 } from 'lucide-react';
import './VideoThumbnail.css';

const VideoThumbnail = ({ 
  video, 
  onPlay, 
  onDownload, 
  onDelete, 
  onEdit,
  onSchedule,
  onProcess,
  isEditing,
  editingFilename,
  setEditingFilename,
  onSaveEdit,
  onCancelEdit,
  className = '' 
}) => {
  const [thumbnailSrc, setThumbnailSrc] = useState(null);
  const [showFallback, setShowFallback] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isInView, setIsInView] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useClientThumbnail, setUseClientThumbnail] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const observerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const containerRef = useRef(null);

  const generateClientThumbnail = useCallback(async () => {
    if (!video || !videoRef.current || !canvasRef.current) return;

    try {
      const videoElement = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas dimensions
      canvas.width = 320;
      canvas.height = 180;

      // Load video and seek to 1 second
      videoElement.currentTime = 1;
      
      await new Promise((resolve, reject) => {
        const handleSeeked = () => {
          try {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setThumbnailSrc(thumbnailDataUrl);
            setIsGenerating(false);
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            videoElement.removeEventListener('seeked', handleSeeked);
          }
        };

        const handleError = (err) => {
          videoElement.removeEventListener('error', handleError);
          reject(err);
        };

        videoElement.addEventListener('seeked', handleSeeked);
        videoElement.addEventListener('error', handleError);
      });
    } catch (err) {
      console.error('Error generating client-side thumbnail:', err);
      setShowFallback(true);
      setIsGenerating(false);
    }
  }, [video]);

  const thumbnailRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    
    if (node) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(node);
    }
  }, []);

  useEffect(() => {
    if (!video || !isInView) return;

    const generateThumbnail = async () => {
      try {
        setIsGenerating(true);
        
        // Try server-side thumbnail first
        try {
          const thumbnailUrl = `${process.env.REACT_APP_API_URL}/api/videos/${video._id}/thumbnail`;
          const response = await fetch(thumbnailUrl, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (response.ok) {
            const blob = await response.blob();
            const thumbnailDataUrl = URL.createObjectURL(blob);
            setThumbnailSrc(thumbnailDataUrl);
            setIsGenerating(false);
            setUseClientThumbnail(false);
            return;
          }
        } catch (serverError) {
          console.log('Server thumbnail not available, generating client-side...');
        }

        // Fallback to client-side generation
        setUseClientThumbnail(true);
        generateClientThumbnail();
      } catch (err) {
        console.error('Error generating thumbnail:', err);
        setError(err.message);
        setShowFallback(true);
        setIsGenerating(false);
      }
    };

    generateThumbnail();
  }, [video, isInView, generateClientThumbnail]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>;
      case 'ready':
      case 'completed':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'failed':
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  if (!video) return null;

  return (
    <div className={`group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 ${className}`}>
      {/* Video Thumbnail Section */}
      <div 
        ref={thumbnailRef}
        className="relative w-full h-48 cursor-pointer overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onPlay && onPlay(video)}
      >
        {/* Thumbnail Display */}
        {isGenerating ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={`Thumbnail for ${video.title || video.filename}`}
            className="w-full h-full object-cover"
            onError={() => setShowFallback(true)}
          />
        ) : showFallback ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <FileVideo className="w-12 h-12 text-gray-400" />
          </div>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <FileVideo className="w-12 h-12 text-gray-400" />
          </div>
        )}

        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center`}>
          <Play className={`w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
        </div>

        {/* Action Buttons - Top Right */}
        <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onProcess && video.status === 'ready' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onProcess(video);
              }}
              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
              title="Process now"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          )}
          {onSchedule && video.status === 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(video);
              }}
              className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors"
              title="Schedule social media post"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(video);
              }}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
              title="Download video"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(video._id);
              }}
              className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              title="Delete video"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Indicator - Bottom Left */}
        <div className="absolute bottom-2 left-2">
          {getStatusIcon(video.status)}
        </div>
      </div>

      {/* Video Info Section */}
      <div className="p-4">
        {/* Title Section */}
        {isEditing ? (
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={editingFilename}
              onChange={(e) => setEditingFilename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="flex-1 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={onSaveEdit}
              className="p-1 text-green-600 hover:text-green-700"
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1 text-red-600 hover:text-red-700"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900 truncate flex-1 leading-tight">
              {video.title || video.filename || 'Untitled Video'}
            </h3>
            {onEdit && (
              <button
                onClick={() => onEdit(video)}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Edit title"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Video Details */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatDuration(video.duration)}</span>
          <span>{formatFileSize(video.fileSize || video.size)}</span>
        </div>

        {/* Status */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-gray-500 capitalize">
            {video.status || 'unknown'}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(video.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Hidden elements for thumbnail generation (only when client-side fallback is needed) */}
      {useClientThumbnail && (
        <video
          ref={videoRef}
          className="hidden"
          crossOrigin="anonymous"
          preload="metadata"
          src={`${process.env.REACT_APP_API_URL}/api/videos/${video._id}/stream?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
        />
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default VideoThumbnail;