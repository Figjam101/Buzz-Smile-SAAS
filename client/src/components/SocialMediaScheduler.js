import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Share2, Instagram, Facebook, Twitter, Youtube, Plus, Settings, CheckCircle, AlertCircle, Trash2, X, Video } from 'lucide-react';
import toast from 'react-hot-toast';

const SocialMediaScheduler = ({ video, onClose, onSchedule }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [caption, setCaption] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500', maxLength: 2200 },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600', maxLength: 63206 },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black', maxLength: 280 },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600', maxLength: 5000 },
  ];

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('/api/social/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const accounts = await response.json();
        setConnectedAccounts(accounts);
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    }
  };

  const handlePlatformToggle = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSchedulePost = async () => {
    if (!scheduledDate || !scheduledTime || selectedPlatforms.length === 0) {
      toast.error('Please select date, time, and at least one platform');
      return;
    }

    const scheduleData = {
      videoId: video.id,
      platforms: selectedPlatforms,
      scheduledAt: new Date(`${scheduledDate}T${scheduledTime}`),
      caption,
      video: {
        title: video.title,
        url: video.url,
        thumbnail: video.thumbnail
      }
    };

    try {
      const response = await fetch('/api/social/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        toast.success('Post scheduled successfully!');
        onSchedule && onSchedule(scheduleData);
        onClose();
      } else {
        toast.error('Failed to schedule post');
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
      toast.error('Error scheduling post');
    }
  };

  const getMaxCaptionLength = () => {
    if (selectedPlatforms.length === 0) return 2200;
    return Math.min(...selectedPlatforms.map(id => 
      platforms.find(p => p.id === id)?.maxLength || 2200
    ));
  };

  const isAccountConnected = (platformId) => {
    return connectedAccounts.some(account => account.platform === platformId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Schedule Social Media Post</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Video Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                {video?.thumbnail ? (
                  <img src={video.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Video className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{video?.title || 'Untitled Video'}</h3>
                <p className="text-sm text-gray-600">Ready to schedule</p>
              </div>
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Select Platforms</h3>
              <button
                onClick={() => setShowAccountSettings(true)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Settings className="w-4 h-4" />
                <span>Manage Accounts</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                const isConnected = isAccountConnected(platform.id);
                const isSelected = selectedPlatforms.includes(platform.id);
                
                return (
                  <button
                    key={platform.id}
                    onClick={() => isConnected && handlePlatformToggle(platform.id)}
                    disabled={!isConnected}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isConnected
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${isConnected ? 'text-gray-900' : 'text-gray-400'}`}>
                          {platform.name}
                        </p>
                        <div className="flex items-center space-x-1">
                          {isConnected ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="text-xs text-green-600">Connected</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400">Not connected</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption
              <span className="text-gray-500 ml-1">
                ({caption.length}/{getMaxCaptionLength()})
              </span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={getMaxCaptionLength()}
              placeholder="Write your post caption..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          {/* Schedule Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSchedulePost}
              disabled={!scheduledDate || !scheduledTime || selectedPlatforms.length === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Schedule Post
            </button>
          </div>
        </div>
      </div>

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <AccountSettingsModal
          onClose={() => setShowAccountSettings(false)}
          onAccountsUpdated={fetchConnectedAccounts}
        />
      )}
    </div>
  );
};

const AccountSettingsModal = ({ onClose, onAccountsUpdated }) => {
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
    { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'bg-black' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  ];

  useEffect(() => {
    fetchConnectedAccounts();
  }, []);

  const fetchConnectedAccounts = async () => {
    try {
      const response = await fetch('/api/social/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const accounts = await response.json();
        setConnectedAccounts(accounts);
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    }
  };

  const handleConnectAccount = async (platformId) => {
    try {
      const response = await fetch(`/api/social/connect/${platformId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const { authUrl } = await response.json();
        window.open(authUrl, '_blank', 'width=600,height=600');
        // Listen for auth completion
        window.addEventListener('message', (event) => {
          if (event.data.type === 'SOCIAL_AUTH_SUCCESS') {
            fetchConnectedAccounts();
            onAccountsUpdated();
            toast.success(`${platformId} account connected successfully!`);
          }
        });
      }
    } catch (error) {
      console.error('Error connecting account:', error);
      toast.error('Failed to connect account');
    }
  };

  const handleDisconnectAccount = async (accountId) => {
    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchConnectedAccounts();
        onAccountsUpdated();
        toast.success('Account disconnected successfully!');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      toast.error('Failed to disconnect account');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Social Media Accounts</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const connectedAccount = connectedAccounts.find(acc => acc.platform === platform.id);
            
            return (
              <div key={platform.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{platform.name}</p>
                    {connectedAccount ? (
                      <p className="text-sm text-green-600">@{connectedAccount.username}</p>
                    ) : (
                      <p className="text-sm text-gray-500">Not connected</p>
                    )}
                  </div>
                </div>
                
                {connectedAccount ? (
                  <button
                    onClick={() => handleDisconnectAccount(connectedAccount.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectAccount(platform.id)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SocialMediaScheduler;