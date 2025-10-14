import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import AppleProfileImage from './AppleProfileImage';
import '../styles/buzz-animations.css';
import { 
  Menu, 
  X, 
  User, 
  LayoutDashboard,
  LogOut,
  Shield,
  Settings
} from 'lucide-react';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { stats, formatFileSize } = useStats();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const planLabel = user?.role === 'admin'
    ? (String(stats?.plan || '').toLowerCase() === 'god' ? 'God' : 'Administrator')
    : (stats?.plan || 'Free');

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Logo and brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-gray-900 font-['Inter'] buzz-gentle tracking-tighter">Buzz</span>
                  <span className="text-2xl font-bold text-blue-600 font-['Inter']">Smile</span>
                </div>
              </Link>
            </div>

            {/* Desktop - Navigation menu and user menu in top bar */}
            <div className="hidden md:flex items-center space-x-8">
              {isAuthenticated && !isActive('/dashboard') && (
                <nav className="flex items-center space-x-6">
                  <Link
                    to="/dashboard"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive('/dashboard')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive('/admin')
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  )}
                </nav>
              )}
              
              {isAuthenticated ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-1 transition-all duration-200 hover:scale-105">
                    <AppleProfileImage size="sm" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                  </button>
                  
                  {/* Horizontal slide-in menu from left side */}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 flex items-center opacity-0 invisible group-hover:opacity-100 group-hover:visible transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 ease-out z-50 mr-2">
                    <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1 space-x-1">
                      <Link
                        to="/profile"
                        className="flex items-center justify-center p-2 text-gray-700 hover:bg-gray-50 transition-colors rounded-full"
                        title="Profile"
                      >
                        <User className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center justify-center p-2 text-gray-700 hover:bg-gray-50 transition-colors rounded-full"
                        title="Logout"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="btn-secondary px-6 py-2.5 text-sm font-medium rounded-full"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary px-8 py-3 text-base font-semibold rounded-full"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu button - Hidden on dashboard page */}
            {!isActive('/dashboard') && (
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-700 hover:text-primary-600 p-2 rounded-md transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            )}

            {/* Dashboard mobile profile - Only show on dashboard page */}
            {isActive('/dashboard') && isAuthenticated && (
              <div className="md:hidden flex items-center">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="text-gray-700 hover:text-primary-600 p-2 rounded-md transition-colors"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu - Hidden on dashboard page */}
        {isMobileMenuOpen && !isActive('/dashboard') && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            {isAuthenticated ? (
              <div className="flex flex-col">
                {/* User Profile Section */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-base truncate">{user?.name || 'User'}</p>
                      <p className="text-sm text-gray-500">{planLabel}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-4">
                  <nav className="space-y-2">
                    <Link
                      to="/dashboard"
                      onClick={closeMobileMenu}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base ${
                        isActive('/dashboard')
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                      <span>Dashboard</span>
                    </Link>

                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={closeMobileMenu}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base ${
                          isActive('/admin')
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Shield className="w-5 h-5 flex-shrink-0" />
                        <span>Admin</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={() => {
                        // Navigate to dashboard with settings section
                        window.location.href = '/dashboard#settings';
                        closeMobileMenu();
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-5 h-5 flex-shrink-0" />
                      <span>Settings</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </nav>
                </div>

                {/* Stats Summary */}
                <div className="p-4 border-t border-gray-100">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Videos</span>
                      <span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Storage</span>
                      <span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span>
                    </div>
                    <button className="w-full mt-3 px-3 py-2 btn-primary text-sm font-medium flex items-center justify-center space-x-2">
                      <span>Upgrade Plan</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="block px-6 py-2.5 rounded-full text-sm font-medium btn-secondary text-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="block px-8 py-3 rounded-full text-base font-semibold btn-primary text-center"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Mobile Menu - Only show on dashboard page */}
        {isMobileMenuOpen && isActive('/dashboard') && (
          <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
            <div className="flex flex-col">
              {/* User Profile Section */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-base truncate">{user?.name || 'User'}</p>
                    <p className="text-sm text-gray-500">{planLabel}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 p-4">
                <nav className="space-y-2">
                  <Link
                    to="/dashboard"
                    onClick={closeMobileMenu}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base bg-blue-50 text-blue-700"
                  >
                    <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                    <span>Dashboard</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={closeMobileMenu}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"
                    >
                      <Shield className="w-5 h-5 flex-shrink-0" />
                      <span>Admin</span>
                    </Link>
                  )}
                  
                  <button
                    onClick={() => {
                      // Navigate to dashboard settings section
                      window.location.href = '/dashboard#settings';
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-5 h-5 flex-shrink-0" />
                    <span>Settings</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </nav>
              </div>

              {/* Stats Summary */}
              <div className="p-4 border-t border-gray-100">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Videos</span>
                    <span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span>
                  </div>
                  <button className="w-full mt-3 px-3 py-2 btn-primary text-sm font-medium flex items-center justify-center space-x-2">
                    <span>Upgrade Plan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Desktop Sidebar - Fixed position for small screens and up - Only on Dashboard */}
      {isAuthenticated && location.pathname === '/dashboard' && (
        <div className="hidden sm:block fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 shadow-lg z-40 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* User Profile Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <AppleProfileImage size="lg" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-lg truncate">{user?.name || 'User'}</p>
                  <p className="text-sm text-gray-500">{planLabel}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-4">
              <nav className="space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center space-x-3 px-6 py-4 text-gray-800 hover:bg-white/20 transition-colors border-b border-white/10"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 px-6 py-4 text-gray-800 hover:bg-white/20 transition-colors border-b border-white/10"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 w-full px-6 py-4 text-gray-800 hover:bg-white/20 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>

            {/* Stats Summary */}
            <div className="p-4 border-t border-gray-100">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Videos</span>
                  <span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Storage</span>
                  <span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span>
                </div>
                <button className="w-full mt-3 px-4 py-2 btn-primary text-sm font-medium flex items-center justify-center space-x-2">
                  <span>Upgrade Plan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;