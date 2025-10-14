import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
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
import SystemMonitoring from '../components/admin/SystemMonitoring';
import BackupManager from '../components/admin/BackupManager';
import LogsViewer from '../components/admin/LogsViewer';
import UserManagement from '../components/admin/UserManagement';
import VideoManagement from '../components/admin/VideoManagement';
import Settings from '../components/admin/Settings';

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
    { id: 'settings', name: 'General Settings', icon: SettingsIcon }
  ];

  const handleServerReset = async () => {
    if (!serverResetEnabled) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/reset`, {
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
      default:
        return <OverviewTab systemHealth={systemHealth} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Sidebar - Hidden on mobile and tablet */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } hidden lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Home className="w-5 h-5" />
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
                <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
                <button
                  onClick={() => handleMaintenanceToggle(!maintenanceMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    maintenanceMode ? 'bg-red-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Server Reset Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Server Reset</span>
                <button
                  onClick={() => setServerResetEnabled(!serverResetEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    serverResetEnabled ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      serverResetEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Reset Button */}
              {serverResetEnabled && (
                <button
                  onClick={handleServerReset}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-medium">Reset Server</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Sidebar Overlay - Only for large screens */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 hidden lg:block"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <div className="lg:ml-64">
        <div className="px-4 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tabs.find(tab => tab.id === activeTab)?.name || 'Admin Dashboard'}
                </h1>
                <p className="text-gray-600 mt-1">Manage your Buzz Smile SaaS platform</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 shadow-sm border">
                  <div className={`w-2 h-2 rounded-full ${systemHealth?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {systemHealth?.status || 'Unknown'}
                  </span>
                </div>
                <button
                  onClick={fetchSystemHealth}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewTab = ({ systemHealth }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching admin stats with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Admin stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Admin stats data received:', data);
        setStats(data);
      } else {
        const errorText = await response.text();
        console.error('Admin stats API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">System Overview</h2>
        <p className="text-gray-600">Monitor your platform's key metrics and performance</p>
      </div>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="group bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Users</p>
              <p className="text-4xl font-bold mb-2">{stats?.users || 0}</p>
              <div className="flex items-center text-blue-200 text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Active Platform
              </div>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">👥</div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Total Videos</p>
              <p className="text-4xl font-bold mb-2">{stats?.videos || 0}</p>
              <div className="flex items-center text-emerald-200 text-xs">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
                Content Library
              </div>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">🎥</div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-purple-500 via-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">System Uptime</p>
              <p className="text-4xl font-bold mb-2">{systemHealth?.uptime || '563,421'}</p>
              <div className="flex items-center text-purple-200 text-xs">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Running Smooth
              </div>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">⏱️</div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Admin Users</p>
              <p className="text-4xl font-bold mb-2">{stats?.admins || 1}</p>
              <div className="flex items-center text-orange-200 text-xs">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                Access Control
              </div>
            </div>
            <div className="text-5xl opacity-80 group-hover:scale-110 transition-transform duration-300">🛡️</div>
          </div>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">System Resources</h3>
              <p className="text-gray-600 text-sm">Real-time performance metrics</p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>CPU Usage</span>
                <span className="text-blue-600">{systemHealth?.cpu?.usage || 45}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${systemHealth?.cpu?.usage || 45}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Memory Usage</span>
                <span className="text-green-600">{systemHealth?.memory?.usage || 62}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${systemHealth?.memory?.usage || 62}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Disk Usage</span>
                <span className="text-purple-600">{systemHealth?.disk?.usage || 38}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-violet-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${systemHealth?.disk?.usage || 38}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-200/50 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
              <span className="text-white text-xl">📈</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              <p className="text-gray-600 text-sm">Latest system events</p>
            </div>
          </div>
          <div className="space-y-4">
            {stats?.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 p-3 rounded-xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-200">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )) || (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-gray-500 font-medium">No recent activity</p>
                <p className="text-gray-400 text-sm mt-1">System events will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;