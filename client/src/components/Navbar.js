import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import AppleProfileImage from './AppleProfileImage';
import ProfilePictureUploader from './ProfilePictureUploader';
import '../styles/buzz-animations.css';
import '../styles/glass.css';
import { 
  Menu, 
  X, 
  User, 
  LayoutDashboard,
  LogOut,
  Shield,
  Settings,
  Image as ImageIcon,
  Crown,
  CheckCircle, AlertCircle
} from 'lucide-react';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { stats, formatFileSize } = useStats();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [uploadIndicator, setUploadIndicator] = useState(null); // { kind: 'success'|'error' }
  useEffect(() => {
    const handler = (e) => {
      const kind = e?.detail?.kind;
      if (kind === 'success' || kind === 'error') {
        setUploadIndicator({ kind });
        // Auto-hide after 8 seconds
        const t = setTimeout(() => setUploadIndicator(null), 8000);
        return () => clearTimeout(t);
      }
    };
    window.addEventListener('upload-notification', handler);
    return () => window.removeEventListener('upload-notification', handler);
  }, []);
  

  

  const isActive = (path) => location.pathname === path;
  

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const headerRef = useRef(null);

  useEffect(() => {
    const updateHeaderBottom = () => {
      try {
        const el = headerRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const bottom = Math.max(0, Math.round(rect.bottom));
          document.documentElement.style.setProperty('--dashboard-header-bottom', `${bottom}px`);
        }
      } catch (_) {}
    };
    updateHeaderBottom();
    window.addEventListener('resize', updateHeaderBottom);
    return () => window.removeEventListener('resize', updateHeaderBottom);
  }, []);

  return (
    <>
      <nav ref={headerRef} id="dashboard-header" className={`backdrop-blur-md bg-white/5 border border-white/10 edge-bottom-3d fixed top-0 left-0 right-0 w-full z-[9999]`}>
        <div className={`max-w-7xl mx-auto ${location.pathname === '/dashboard' ? 'pl-56 sm:pl-64' : (location.pathname === '/admin' ? 'lg:pl-52' : 'pl-0')} pr-6 sm:pr-6 lg:pr-6`}>
          <div className="flex justify-between h-14">
            {/* Logo and brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white font-['Inter'] buzz-gentle tracking-tighter">Buzz</span>
                  <span className="text-3xl sm:text-4xl font-extrabold text-blue-600 font-['Inter']">Smile</span>
                </div>
              </Link>
            </div>

            {/* Desktop - Navigation menu and user menu in top bar */}
            <div className="hidden md:flex items-center space-x-8">
              {isAuthenticated && !isActive('/dashboard') && (
                <nav className="flex items-center space-x-6">
                  <Link
                    to="/dashboard"
                    className={`btn-primary btn-elevated flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                      isActive('/dashboard') ? '' : ''
                    }`}
                   >
                    <LayoutDashboard className="w-5 h-5" />
                    <span>Dashboard</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className={`btn-primary btn-elevated flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        isActive('/admin') ? '' : ''
                      }`}
                      >
                      <Shield className="w-5 h-5" />
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
                  {uploadIndicator && (
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white shadow flex items-center justify-center"
                      aria-label={uploadIndicator.kind === 'success' ? 'Upload succeeded' : 'Upload failed'}
                    >
                      {uploadIndicator.kind === 'success' ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  )}
                  
                  {/* Avatar dropdown anchored under the profile image */}
                  <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                    <div className={`min-w-[180px] glass-card rounded-xl shadow-lg p-2`}>
                      <Link
                        to="/profile"
                        className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-800"
                        title="Profile"
                      >
                        <span className="flex items-center space-x-2"><User className="h-4 w-4" /><span>Profile</span></span>
                        <span className="text-xs text-gray-500">View</span>
                      </Link>
                      <button
                        onClick={() => setShowUploader(true)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-800"
                        title="Update Photo"
                      >
                        <span className="flex items-center space-x-2"><ImageIcon className="h-4 w-4" /><span>Update Photo</span></span>
                        <span className="text-xs text-gray-500">Change</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-red-600"
                        title="Logout"
                      >
                        <span className="flex items-center space-x-2"><LogOut className="h-4 w-4" /><span>Logout</span></span>
                        <span className="text-xs">Exit</span>
                      </button>
                    </div>
                  </div>

                  {/* Inline uploader popover */}
                  <ProfilePictureUploader isOpen={showUploader} onClose={() => setShowUploader(false)} />
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                   <Link
                     to="/login"
                     className="btn-secondary px-5 py-2.5 text-sm font-medium rounded-full"
                   >
                     Login
                   </Link>
                   <Link
                     to="/register"
                     className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-full"
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
          <div className={`md:hidden glass-card shiny-outline`}>
            {isAuthenticated ? (
              <div className="flex flex-col">
                {/* User Profile Section (centered) */}
                <div className="pt-4 px-4 pb-3 border-b border-gray-100 text-center">
                  <div className="flex justify-center">
                    <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                  </div>
                  <p className="mt-2 font-medium text-gray-900 text-sm truncate">{user?.name || 'User'}</p>
                  {user?.role === 'admin' && (
                    <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-900 border border-gray-200">
                      <Shield className="w-3 h-3 mr-1" />
                      Administrator
                    </span>
                  )}
                  {String(stats?.plan || '').toLowerCase() === 'god' && (
                    <button className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
                      <Crown className="w-3 h-3 mr-1" />
                      GOD MODE
                    </button>
                  )}
                  <button
                    onClick={() => setShowUploader(true)}
                    className="mt-2 w-full text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Update your profile picture
                  </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 p-3">
                  <nav className="space-y-1">
                    <Link
                      to="/dashboard"
                      onClick={closeMobileMenu}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                        isActive('/dashboard')
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
                      <span>Dashboard</span>
                    </Link>

                    {/* Admin link removed */}
                    
                    {user?.role === 'admin' && (
                      <Link
                        to="/admin"
                        onClick={closeMobileMenu}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Shield className="w-4 h-4 flex-shrink-0" />
                        <span>Admin</span>
                      </Link>
                    )}
                    
                    <button
                      onClick={() => {
                        // Navigate to dashboard with settings section
                        window.location.href = '/dashboard#settings';
                        closeMobileMenu();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4 flex-shrink-0" />
                      <span>Settings</span>
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LogOut className="w-4 h-4 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </nav>
                </div>

                {/* Stats Summary */}
                <div className="p-3 border-t border-gray-100">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Videos</span>
                      <span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Storage</span>
                      <span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span>
                    </div>
                    <button className="w-full mt-2 px-3 py-2 btn-primary text-xs font-medium flex items-center justify-center space-x-2">
                      <span>Upgrade Plan</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="block px-5 py-2 rounded-full text-sm font-medium btn-secondary text-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="block px-6 py-2.5 rounded-full text-sm font-semibold btn-primary text-center"
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
              <div className="pt-4 px-4 pb-3 border-b border-gray-100 text-center">
                <div className="flex justify-center">
                  <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                </div>
                <p className="mt-2 font-medium text-gray-900 text-sm truncate">{user?.name || 'User'}</p>
                {user?.role === 'admin' && (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-900 border border-gray-200">
                    <Shield className="w-3 h-3 mr-1" />
                    Administrator
                  </span>
                )}
                {String(stats?.plan || '').toLowerCase() === 'god' && (
                  <button className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow">
                    <Crown className="w-3 h-3 mr-1" />
                    GOD MODE
                  </button>
                )}
                <button
                  onClick={() => setShowUploader(true)}
                  className="mt-2 w-full text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Update your profile picture
                </button>
              </div>

              {/* Navigation */}
              <div className="flex-1 p-3">
                <nav className="space-y-1">
                  <Link
                    to="/my-files"
                    onClick={closeMobileMenu}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <ImageIcon className="w-4 h-4 flex-shrink-0" />
                    <span>My Files</span>
                  </Link>

                  {/* Admin dashboard link removed */}
                  
                  <button
                    onClick={() => {
                      // Navigate to dashboard settings section
                      window.location.href = '/dashboard#settings';
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    <span>Settings</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-colors text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    <span>Logout</span>
                  </button>
                </nav>
              </div>

              {/* Stats Summary */}
              <div className="p-3 border-t border-gray-100">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Videos</span>
                    <span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span>
                  </div>
                  <button className="w-full mt-2 px-3 py-2 btn-primary text-xs font-medium flex items-center justify-center space-x-2">
                    <span>Upgrade Plan</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Desktop Sidebar: delegated to Dashboard page. Remove duplicate sidebar here. */}
    </>
  );
};

export default Navbar;