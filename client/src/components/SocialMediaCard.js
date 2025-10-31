import React, { useState, useEffect } from 'react';
import { Calendar, Trash2, Link, Plus } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const SocialMediaCard = ({ onLinkToCalendar }) => {
  const { user, refreshUser } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    platform: 'instagram',
    username: '',
    linked: false
  });

  useEffect(() => {
    // Initialize accounts from user data if available
    if (user && user.socialMedia) {
      const userAccounts = [];
      Object.entries(user.socialMedia).forEach(([platform, username]) => {
        if (username) {
          userAccounts.push({
            platform,
            username,
            linked: user.linkedSocialAccounts?.includes(platform) || false
          });
        }
      });
      setAccounts(userAccounts);
    }
  }, [user]);

  const handleAddAccount = () => {
    if (!newAccount.username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    setAccounts([...accounts, { ...newAccount }]);
    setNewAccount({ platform: 'instagram', username: '', linked: false });
    setShowAddForm(false);
    
    // Save to backend
    saveAccountChanges([...accounts, { ...newAccount }]);
  };

  const handleRemoveAccount = (index) => {
    const updatedAccounts = [...accounts];
    updatedAccounts.splice(index, 1);
    setAccounts(updatedAccounts);
    
    // Save to backend
    saveAccountChanges(updatedAccounts);
  };

  const handleToggleLink = (index) => {
    const updatedAccounts = [...accounts];
    updatedAccounts[index].linked = !updatedAccounts[index].linked;
    setAccounts(updatedAccounts);
    
    // Save to backend
    saveAccountChanges(updatedAccounts);
    
    // Notify parent component for calendar integration
    if (onLinkToCalendar && updatedAccounts[index].linked) {
      onLinkToCalendar(updatedAccounts[index]);
    }
  };

  const saveAccountChanges = async (updatedAccounts) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Convert accounts array to object format for API
      const socialMediaData = {};
      const linkedAccounts = [];
      
      updatedAccounts.forEach(account => {
        socialMediaData[account.platform] = account.username;
        if (account.linked) {
          linkedAccounts.push(account.platform);
        }
      });
      
      await axios.put('/api/users/social-media', 
        { socialMedia: socialMediaData, linkedSocialAccounts: linkedAccounts },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Social media accounts updated');
      refreshUser(); // Refresh user data
    } catch (error) {
      console.error('Error saving social media accounts:', error);
      toast.error('Failed to update social media accounts');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram':
        return '📸';
      case 'tiktok':
        return '🎵';
      case 'youtube':
        return '📹';
      case 'twitter':
        return '🐦';
      case 'facebook':
        return '👍';
      default:
        return '🌐';
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'tiktok':
        return 'bg-black';
      case 'youtube':
        return 'bg-red-600';
      case 'twitter':
        return 'bg-blue-400';
      case 'facebook':
        return 'bg-blue-600';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Social Media Accounts</h2>
      
      {accounts.length === 0 && !showAddForm ? (
        <div className="text-center py-6 text-gray-500">
          <p>No social media accounts added yet</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Add Account
          </button>
        </div>
      ) : (
        <div>
          <div className="space-y-3 mb-4">
            {accounts.map((account, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 ${getPlatformColor(account.platform)}`}>
                    {getPlatformIcon(account.platform)}
                  </span>
                  <div>
                    <p className="font-medium">{account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}</p>
                    <p className="text-sm text-gray-600">@{account.username}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleToggleLink(index)}
                    className={`p-1.5 rounded-md ${account.linked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}
                    title={account.linked ? "Unlink from calendar" : "Link to calendar"}
                  >
                    <Calendar size={16} />
                  </button>
                  <button 
                    onClick={() => handleRemoveAccount(index)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-md"
                    title="Remove account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {showAddForm ? (
            <div className="border border-gray-200 rounded-md p-3 mb-3">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  value={newAccount.platform}
                  onChange={(e) => setNewAccount({...newAccount, platform: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">Twitter</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newAccount.username}
                  onChange={(e) => setNewAccount({...newAccount, username: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="Enter username without @"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAccount}
                  disabled={loading}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center text-blue-500 hover:text-blue-700"
            >
              <Plus size={16} className="mr-1" /> Add another account
            </button>
          )}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={() => window.open('/admin/oauth-test', '_blank')}
          className="text-sm text-blue-500 hover:text-blue-700 flex items-center"
        >
          <Link size={14} className="mr-1" /> Connect with OAuth
        </button>
      </div>
    </div>
  );
};

export default SocialMediaCard;