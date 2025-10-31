import React, { useState, useEffect } from 'react';

const VideoManagement = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage] = useState(10);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [videoStats, setVideoStats] = useState({});

  useEffect(() => {
    fetchVideos();
    fetchVideoStats();
  }, []);

  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching videos with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', process.env.REACT_APP_API_URL);
      
      const response = await fetch(`/api/admin/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Videos API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Videos data received:', data);
        const rawVideos = data.videos || data || [];
        // Attach thumbnail URL derived from API for admin viewing
        const videosWithThumb = rawVideos.map(v => ({
          ...v,
          thumbnail: `${process.env.REACT_APP_API_URL}/api/videos/${v._id}/thumbnail?token=${encodeURIComponent(token || '')}`
        }));
        setVideos(videosWithThumb);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error('Videos API error:', response.status, errorText);
        setError(`Failed to fetch videos: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Error fetching videos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideoStats(data);
      }
    } catch (error) {
      console.error('Error fetching video stats:', error);
    }
  };

  const deleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setVideos(videos.filter(video => video._id !== videoId));
        fetchVideoStats();
      } else {
        setError('Failed to delete video');
      }
    } catch (error) {
      setError('Error deleting video: ' + error.message);
    }
  };

  const bulkDeleteVideos = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedVideos.length} videos?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const promises = selectedVideos.map(videoId =>
        fetch(`/api/admin/videos/${videoId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );
      
      await Promise.all(promises);
      setVideos(videos.filter(video => !selectedVideos.includes(video._id)));
      setSelectedVideos([]);
      fetchVideoStats();
    } catch (error) {
      setError('Error deleting videos: ' + error.message);
    }
  };

  // Filter and search videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'public' && video.isPublic) ||
                         (filterStatus === 'private' && !video.isPublic);
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const indexOfLastVideo = currentPage * videosPerPage;
  const indexOfFirstVideo = indexOfLastVideo - videosPerPage;
  const currentVideos = filteredVideos.slice(indexOfFirstVideo, indexOfLastVideo);
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Video Management</h2>
          <p className="text-gray-600">Manage videos and content</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">❌</span>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Video Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Videos</p>
              <p className="text-xl font-bold text-gray-900">{videoStats.videos || 0}</p>
            </div>
            <span className="text-2xl">🎥</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Public Videos</p>
              <p className="text-xl font-bold text-green-600">{videos.filter(v => v.isPublic).length}</p>
            </div>
            <span className="text-2xl">🌐</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Private Videos</p>
              <p className="text-xl font-bold text-orange-600">{videos.filter(v => !v.isPublic).length}</p>
            </div>
            <span className="text-2xl">🔒</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-xl font-bold text-blue-600">
                {formatFileSize(videos.reduce((acc, v) => acc + (v.fileSize || 0), 0))}
              </p>
            </div>
            <span className="text-2xl">💾</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Videos</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedVideos.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
            <span className="text-sm text-blue-700">
              {selectedVideos.length} video(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={bulkDeleteVideos}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setSelectedVideos([])}
                className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Videos Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVideos(currentVideos.map(video => video._id));
                      } else {
                        setSelectedVideos([]);
                      }
                    }}
                    checked={selectedVideos.length === currentVideos.length && currentVideos.length > 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentVideos.map((video) => (
                <tr key={video._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedVideos.includes(video._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVideos([...selectedVideos, video._id]);
                        } else {
                          setSelectedVideos(selectedVideos.filter(id => id !== video._id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-16">
                        {video.thumbnail ? (
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="h-12 w-16 object-cover rounded"
                          />
                        ) : (
                          <div className="h-12 w-16 bg-gray-300 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-500">🎥</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {video.title || 'Untitled'}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {video.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{video.user?.name || 'Unknown'}</div>
                    <div className="text-sm text-gray-500">{video.user?.email || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      video.isPublic 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {video.isPublic ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {video.duration ? formatDuration(video.duration) : 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {video.fileSize ? formatFileSize(video.fileSize) : 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(video.url, '_blank')}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={!video.url}
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteVideo(video._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstVideo + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastVideo, filteredVideos.length)}</span> of{' '}
                  <span className="font-medium">{filteredVideos.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {currentVideos.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
          <p className="text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No videos have been uploaded yet'}
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoManagement;