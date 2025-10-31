import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  Monitor, 
  Database, 
  FileText, 
  Users, 
  Server, 
  Settings as SettingsIcon,
  Home,
  Power,
  RotateCcw,
  Video
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AppleProfileImage from '../components/AppleProfileImage';
import ProfilePictureUploader from '../components/ProfilePictureUploader';
import SystemMonitoring from '../components/admin/SystemMonitoring';
import BackupManager from '../components/admin/BackupManager';
import LogsViewer from '../components/admin/LogsViewer';
import UserManagement from '../components/admin/UserManagement';
import VideoManagement from '../components/admin/VideoManagement';
import Settings from '../components/admin/Settings';
import AdminTests from '../components/admin/AdminTests';

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [serverResetEnabled, setServerResetEnabled] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchSystemHealth();
    }
  }, [user]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedTab = params.get('tab') || (location.state && location.state.tab);
    const validTabs = ['overview','monitoring','backups','logs','users','videos','server-settings','settings','tests'];
    if (requestedTab && validTabs.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search, location.state]);

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/monitoring/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'monitoring', name: 'System Monitoring', icon: Monitor },
    { id: 'backups', name: 'Backup Manager', icon: Database },
    { id: 'logs', name: 'Logs Viewer', icon: FileText },
    { id: 'users', name: 'User Management', icon: Users },
    { id: 'videos', name: 'Video Management', icon: Video },
    { id: 'server-settings', name: 'Server Settings', icon: Server },
    { id: 'settings', name: 'General Settings', icon: SettingsIcon },
    { id: 'tests', name: 'Tests', icon: RotateCcw }
  ];


  const handleServerReset = async () => {
    if (!serverResetEnabled) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Server reset initiated successfully');
        setServerResetEnabled(false);
      } else {
        alert('Failed to reset server');
      }
    } catch (error) {
      console.error('Error resetting server:', error);
      alert('Error resetting server');
    }
  };

  const handleMaintenanceToggle = async (enabled) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ maintenanceMode: enabled })
      });
      
      if (response.ok) {
        setMaintenanceMode(enabled);
      } else {
        alert('Failed to update maintenance mode');
      }
    } catch (error) {
      console.error('Error updating maintenance mode:', error);
      alert('Error updating maintenance mode');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab systemHealth={systemHealth} />;
      case 'monitoring':
        return <SystemMonitoring />;
      case 'backups':
        return <BackupManager />;
      case 'logs':
        return <LogsViewer />;
      case 'users':
        return <UserManagement />;
      case 'videos':
        return <VideoManagement />;
      case 'server-settings':
        return <Settings />;
      case 'settings':
        return <Settings />;
      case 'tests':
        return <AdminTests />;
      default:
        return <OverviewTab systemHealth={systemHealth} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Visible on large screens, hidden on mobile/tablet */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:relative lg:translate-x-0`}>
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>

          {/* Admin User Profile */}
          <div className="px-4 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <AppleProfileImage size="lg" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                <p className="text-sm text-gray-500">Administrator</p>
              </div>
            </div>
            <button
              onClick={() => setShowUploader(true)}
              className="mt-3 w-full text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Update your profile picture
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200">
            <div className="space-y-3">
              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Maintenance Mode</span>
                <button
                  onClick={() => handleMaintenanceToggle(!maintenanceMode)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${maintenanceMode ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                >
                  {maintenanceMode ? 'Disable' : 'Enable'}
                </button>
              </div>

              {/* Server Reset */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Server Reset</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setServerResetEnabled(!serverResetEnabled)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${serverResetEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {serverResetEnabled ? 'Enabled' : 'Disabled'}
                  </button>
                  <button
                    onClick={handleServerReset}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                  >
                    <Power className="w-4 h-4 inline mr-1" /> Restart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {renderTabContent()}
      </main>
        </div>

      {/* Profile Picture Uploader Modal */}
      {showUploader && (
        <ProfilePictureUploader onClose={() => setShowUploader(false)} />
      )}
    </div>
  );
};

const OverviewTab = ({ systemHealth }) => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth?.status || 'Unknown'}</p>
            </div>
            <span className="text-3xl">🩺</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Users</p>
              <p className="text-2xl font-bold text-green-600">{systemHealth?.users || 0}</p>
            </div>
            <span className="text-3xl">👥</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Videos</p>
              <p className="text-2xl font-bold text-blue-600">{systemHealth?.videos || 0}</p>
            </div>
            <span className="text-3xl">🎥</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">User registrations</p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
            <span className="text-xl">📥</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Video uploads</p>
              <p className="text-xs text-gray-500">Last 24 hours</p>
            </div>
            <span className="text-xl">⬆️</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;