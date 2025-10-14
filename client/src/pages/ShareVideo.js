import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Download, 
  AlertCircle,
  Video,
  FileVideo,
  Share2,
  Copy,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const ShareVideo = () => {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      const response = await axios.get(`/api/videos/share/${videoId}`);
      setVideo(response.data);
    } catch (error) {
      console.error('Error fetching video:', error);
      setError(error.response?.data?.message || 'Video not found or not public');
    } finally {
      setLoading(false);
    }
  };

  const downloadVideo = async () => {
    try {
      const response = await axios.get(`/api/videos/${videoId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', video.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download video');
    }
  };

  const shareVideo = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title,
          text: `Check out this video: ${video.title}`,
          url: shareUrl
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Failed to copy link');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Video Not Available</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Video className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Buzz Smile</h1>
          <p className="text-gray-600 mt-2">Shared Video</p>
        </div>

        {/* Video Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            {/* Video Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FileVideo className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{video.title}</h2>
                  <p className="text-gray-600">Shared by {video.owner?.name || 'Anonymous'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={downloadVideo}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                
                <button
                  onClick={shareVideo}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Video Preview */}
            <div className="bg-gray-100 rounded-lg p-8 text-center mb-6">
              <FileVideo className="w-24 h-24 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Video Preview</p>
              <p className="text-sm text-gray-500 mt-2">
                Click download to get the full video file
              </p>
            </div>

            {/* Video Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Video Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Filename:</span>
                    <span className="font-mono text-xs">{video.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Size:</span>
                    <span>{formatFileSize(video.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploaded:</span>
                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Share Options</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => copyToClipboard(window.location.href)}
                    className="w-full flex items-center justify-center space-x-2 border border-gray-400 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </button>
                  
                  <a
                    href={`https://twitter.com/intent/tweet?text=Check out this video: ${encodeURIComponent(video.title)}&url=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Share on Twitter</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Powered by <span className="font-semibold text-blue-600">Buzz Smile</span> - 
            Professional Video Editing Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareVideo;