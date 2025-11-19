import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Monitor, 
  Database, 
  FileText, 
  Users, 
  Server, 
  Settings as SettingsIcon,
  Power,
  RotateCcw,
  Video,
  Cloud
} from 'lucide-react';
import SystemMonitoring from '../components/admin/SystemMonitoring';
import BackupManager from '../components/admin/BackupManager';
import LogsViewer from '../components/admin/LogsViewer';
import UserManagement from '../components/admin/UserManagement';
import VideoManagement from '../components/admin/VideoManagement';
import Settings from '../components/admin/Settings';
import AdminTests from '../components/admin/AdminTests';
import VideosReadyToEdit from '../components/admin/VideosReadyToEdit';
import GoogleDriveDashboard from '../components/GoogleDriveDashboard';
import '../styles/glass.css';

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemHealth, setSystemHealth] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const validTabs = ['overview','monitoring','backups','logs','users','videos','ready-to-edit','drive','server-settings','settings','tests'];
    if (requestedTab && validTabs.includes(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [location.search, location.state]);

  const fetchSystemHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const envBase = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
      const apiBase = envBase || (origin.includes('localhost:3000') ? origin.replace(':3000', ':5002') : origin);
      const response = await fetch(`${apiBase}/api/monitoring/health`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-bypass-cache': '1'
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
    { id: 'ready-to-edit', name: 'Videos Ready to Edit', icon: Video },
    { id: 'drive', name: 'Google Drive', icon: Cloud },
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
      case 'ready-to-edit':
        return <VideosReadyToEdit />;
      case 'drive':
        return <GoogleDriveDashboard />;
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
    <div className="min-h-screen bg-slate-900">
      <div
        className="relative pl-8 pr-8 pb-5"
        style={{ paddingTop: 'var(--dashboard-header-bottom, 0px)' }}
      >
        <div className="relative z-10">{renderTabContent()}</div>
      </div>
    </div>
  );
};

const OverviewTab = ({ systemHealth }) => {
  const navigate = useNavigate();
  
  const quickActions = [
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage users, roles, and credits',
      icon: '👥',
      color: 'text-blue-300',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'videos',
      title: 'Video Management',
      description: 'View and manage all videos',
      icon: '🎥',
      color: 'text-green-300',
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'ready-to-edit',
      title: 'Videos Ready to Edit',
      description: 'Videos awaiting processing',
      icon: '✂️',
      color: 'text-purple-300',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'monitoring',
      title: 'System Monitoring',
      description: 'Real-time system metrics',
      icon: '📊',
      color: 'text-orange-300',
      buttonColor: 'bg-orange-600 hover:bg-orange-700'
    },
    {
      id: 'backups',
      title: 'Backup Manager',
      description: 'Create and manage backups',
      icon: '💾',
      color: 'text-red-300',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    {
      id: 'drive',
      title: 'Google Drive',
      description: 'Drive storage and backups',
      icon: '☁️',
      color: 'text-yellow-300',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    }
  ];

  return (
    <div className="px-0">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-4 mb-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h2>
            <p className="text-blue-100">Manage your entire video platform from one place</p>
          </div>
          <div className="text-4xl">🛠️</div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
        <div className="bg-white/5 rounded-xl shadow-sm border border-white/10 p-3 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">🩺</div>
          <p className="text-xs font-medium text-white/80 mb-1">System Health</p>
          <p className="text-2xl font-bold text-white">{systemHealth?.status || 'Unknown'}</p>
          <p className="text-xs text-green-300 mt-1">All systems operational</p>
        </div>
        <div className="bg-white/5 rounded-xl shadow-sm border border-white/10 p-3 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-xs font-medium text-white/80 mb-1">Total Users</p>
          <p className="text-2xl font-bold text-green-300">{systemHealth?.users || 0}</p>
          <p className="text-xs text-green-300 mt-1">Active accounts</p>
        </div>
        <div className="bg-white/5 rounded-xl shadow-sm border border-white/10 p-3 text-center hover:shadow-md transition-shadow">
          <div className="text-3xl mb-2">🎥</div>
          <p className="text-xs font-medium text-white/80 mb-1">Total Videos</p>
          <p className="text-2xl font-bold text-blue-400">{systemHealth?.videos || 0}</p>
          <p className="text-xs text-blue-400 mt-1">Videos processed</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/5 rounded-xl shadow-sm border border-white/10 p-3 mb-3">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <div key={action.id} className={`border border-white/10 rounded-lg p-3 bg-white/5 ${action.color}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-2xl">{action.icon}</div>
                <button
                  onClick={() => navigate(`/admin?tab=${action.id}`)}
                  className={`px-3 py-1 rounded-full text-xs font-medium text-white ${action.buttonColor} transition-colors`}
                >
                  Open
                </button>
              </div>
              <h4 className="font-semibold text-white mb-1">{action.title}</h4>
              <p className="text-sm text-white/80">{action.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 rounded-xl shadow-sm border border-white/10 p-3">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-xl">📥</span>
              <div>
                <p className="text-sm font-medium text-white">User Registrations</p>
                <p className="text-xs text-white/70">Last 24 hours</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-white">{systemHealth?.recentUsers || 0}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⬆️</span>
              <div>
                <p className="text-sm font-medium text-white">Video Uploads</p>
                <p className="text-xs text-white/70">Last 24 hours</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-white">{systemHealth?.recentVideos || 0}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-sm font-medium text-white">System Performance</p>
                <p className="text-xs text-white/70">Current status</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-green-300">Excellent</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;