import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import AppleProfileImage from './AppleProfileImage';
import ProfilePictureUploader from './ProfilePictureUploader';
import { Menu, X, User, LayoutDashboard, LogOut, Shield, Settings, Image as ImageIcon, Share2, HardDrive } from 'lucide-react';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { stats, formatFileSize } = useStats();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  
  const isHome = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/create-video';
  const isFiles = location.pathname === '/my-files';
  const isDashboardPage = isDashboard || isFiles;
  const isAdmin = location.pathname === '/admin';
  const padClass = isDashboardPage ? 'md:pl-56 lg:pl-64' : (isAdmin ? 'lg:pl-52' : 'pl-0');
  const navRef = useRef(null);
  const [menuTop, setMenuTop] = useState(64);

  useEffect(() => {
    let ticking = false;
    const run = () => {
      ticking = false;
      try {
        const el = navRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const bottom = Math.max(0, Math.round(rect.bottom));
          document.documentElement.style.setProperty('--header-bottom', `${bottom}px`);
          document.documentElement.style.setProperty('--dashboard-header-bottom', `${bottom}px`);
          setMenuTop(bottom);
        }
      } catch (_) {}
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(run);
      }
    };
    if (isHome) {
      window.addEventListener('scroll', onScroll, { passive: true });
      run();
    } else {
      try {
        const el = navRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const bottom = Math.max(0, Math.round(rect.bottom));
          document.documentElement.style.setProperty('--header-bottom', `${bottom}px`);
          document.documentElement.style.setProperty('--dashboard-header-bottom', `${bottom}px`);
          setMenuTop(bottom);
        }
      } catch (_) {}
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [isHome]);

  useEffect(() => {
    if (isHome) {
      try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { window.scrollTo(0, 0); }
    }
  }, [isHome]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onResize = () => {
      try {
        const el = navRef.current;
        if (el) {
          const rect = el.getBoundingClientRect();
          const bottom = Math.max(0, Math.round(rect.bottom));
          document.documentElement.style.setProperty('--header-bottom', `${bottom}px`);
          document.documentElement.style.setProperty('--dashboard-header-bottom', `${bottom}px`);
          setMenuTop(bottom);
        }
      } catch (_) {}
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isActive = (path) => location.pathname === path;
  const planLabel = user?.role === 'admin'
    ? (String(stats?.plan || '').toLowerCase() === 'god' ? 'God' : 'Administrator')
    : (stats?.plan || 'Free');


  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <> 
    <nav
      ref={navRef}
      id={isDashboardPage ? 'dashboard-header' : undefined}
      className={
        (isDashboard || isFiles)
          ? 'fixed top-0 left-0 right-0 w-full h-16 z-[100000] backdrop-blur-md bg-transparent ring-0'
          : (isAdmin
            ? 'fixed top-0 left-0 right-0 w-full h-16 z-[100000] backdrop-blur-md bg-transparent ring-0'
            : 'fixed top-0 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl h-16 z-50 rounded-full transform transition-transform duration-300 will-change-transform translate-y-0')
      }
    >
      
      <div className={`${(isDashboard || isAdmin || isFiles) ? 'relative z-10 w-full pl-8 pr-8' : `relative z-10 w-full max-w-7xl mx-auto ${padClass} px-4 sm:px-6 lg:px-6`}`}> 
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-['Inter'] buzz-gentle tracking-tighter">Buzz</span>
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white font-['Inter']">Smile</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && !isDashboardPage && (
              <nav className="flex items-center space-x-6">
                <Link
                  to="/create-video"
                  className="btn-primary btn-elevated inline-flex items-center justify-center space-x-2 text-sm sm:text-base px-5 sm:px-6 py-2 rounded-full"
                >
                  <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Dashboard</span>
                </Link>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="btn-primary btn-elevated inline-flex items-center justify-center space-x-2 text-sm sm:text-base px-5 sm:px-6 py-2 rounded-full"
                  >
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Admin</span>
                  </Link>
                )}
              </nav>
            )}

            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-1 transition-transform duration-200 hover:scale-105">
                  <AppleProfileImage size="md" className="p-2" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                </button>

                <div className="absolute right-0 top-full mt-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                  <div className="min-w-[180px] bg-white rounded-xl shadow-lg p-2">
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

                <ProfilePictureUploader isOpen={showUploader} onClose={() => setShowUploader(false)} />
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="btn btn-contrast text-sm px-5 py-2 rounded-full"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn btn-elevated btn-contrast text-sm px-5 sm:px-6 py-2 rounded-full"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {!isDashboardPage && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`${isMobileMenuOpen ? 'text-white' : 'text-gray-700 hover:text-blue-600'} p-2 rounded-md transition-colors`}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          )}

          {isDashboardPage && isAuthenticated && (
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`${isMobileMenuOpen ? 'text-white' : 'text-white hover:text-white'} p-2 rounded-md transition-colors`}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[99990] bg-black/40" onClick={closeMobileMenu}></div>
      )}

      {isMobileMenuOpen && !isDashboardPage && (
        <div className="md:hidden bg-white rounded-xl shadow-xl fixed left-4 right-4 z-[100000] min-h-56" style={{ top: menuTop + 64 }}>
          {isAuthenticated ? (
            <div className="flex flex-col pt-16">
              <div className="p-6 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-base truncate">{user?.name || 'User'}</p>
                    <p className="text-sm text-gray-500">{planLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploader(true)}
                  className="mt-3 w-full text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Update your profile picture
                </button>
              </div>

              <div className="flex-1 p-4">
                <nav className="space-y-2">
                  <Link
                    to="/dashboard?section=create"
                    onClick={closeMobileMenu}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"
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
                    onClick={() => { window.location.href = '/dashboard#settings'; closeMobileMenu(); }}
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

              <div className="p-4 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Videos</span>
                    <span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span>
                  </div>
                  <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow hover:bg-blue-700">
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
                className="block px-6 py-2.5 rounded-full text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 text-center shadow"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="block px-8 py-3 rounded-full text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 text-center shadow"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}

      {isMobileMenuOpen && isDashboardPage && (
        <div className="md:hidden fixed left-4 right-4 z-[100000] rounded-xl backdrop-blur-md bg-white/5 border border-white/10 shadow-xl min-h-56" style={{ top: menuTop + 64 }}>
          <div className="flex flex-col pt-16">
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white text-base truncate">{user?.name || 'User'}</p>
                  <p className="text-sm text-white/70">{planLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploader(true)}
                className="mt-3 w-full text-sm font-medium text-blue-300 hover:text-blue-200"
              >
                Update your profile picture
              </button>
            </div>

            <div className="flex-1 p-4">
              <nav className="space-y-2">
                <Link
                  to="/my-files"
                  onClick={closeMobileMenu}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <HardDrive className="w-5 h-5 flex-shrink-0" />
                  <span>My Files</span>
                </Link>

                <button
                  onClick={() => { window.location.href = '/dashboard#social'; closeMobileMenu(); }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <Share2 className="w-5 h-5 flex-shrink-0" />
                  <span>Social Media Calendar</span>
                </button>

                <button
                  onClick={() => { window.location.href = '/dashboard#settings'; closeMobileMenu(); }}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>Settings</span>
                </button>

                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={closeMobileMenu}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"
                  >
                    <Shield className="w-5 h-5 flex-shrink-0" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-red-300 hover:bg-red-50/10 border border-white/10"
                >
                  <LogOut className="w-5 h-5 flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </nav>
            </div>

            <div className="p-4 border-t border-white/10">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">Videos</span>
                  <span className="font-medium text-white">{stats.videoCount}/{stats.maxVideos}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white">Storage</span>
                  <span className="font-medium text-white">{formatFileSize(stats.storageUsed)}</span>
                </div>
                <button className="w-full mt-3 px-3 py-2 bg-blue-600 text-white rounded-full text-sm font-medium shadow hover:bg-blue-700">
                  <span>Upgrade Plan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
    {isMobileMenuOpen && typeof document !== 'undefined' && createPortal(
      <>
        <div className="fixed inset-0 z-[99990] bg-black/40" onClick={closeMobileMenu}></div>
        {!isDashboardPage ? (
          <div className="md:hidden bg-white rounded-xl shadow-xl fixed left-4 right-4 z-[100000] min-h-56" style={{ top: menuTop + 64 }}>
            {isAuthenticated ? (
              <div className="flex flex-col pt-16">
                <div className="p-6 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-base truncate">{user?.name || 'User'}</p>
                      <p className="text-sm text-gray-500">{planLabel}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowUploader(true)} className="mt-3 w-full text-sm font-medium text-blue-600 hover:text-blue-700">Update your profile picture</button>
                </div>
                <div className="flex-1 p-4">
                  <nav className="space-y-2">
                    <Link to="/create-video" onClick={closeMobileMenu} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"><LayoutDashboard className="w-5 h-5 flex-shrink-0" /><span>Dashboard</span></Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" onClick={closeMobileMenu} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"><Shield className="w-5 h-5 flex-shrink-0" /><span>Admin</span></Link>
                    )}
                    <button onClick={() => { window.location.href = '/dashboard#settings'; closeMobileMenu(); }} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"><Settings className="w-5 h-5 flex-shrink-0" /><span>Settings</span></button>
                    <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-gray-700 hover:bg-gray-50"><LogOut className="w-5 h-5 flex-shrink-0" /><span>Logout</span></button>
                  </nav>
                </div>
                <div className="p-4 border-t border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Videos</span><span className="font-medium text-gray-900">{stats.videoCount}/{stats.maxVideos}</span></div>
                    <div className="flex items-center justify-between text-sm"><span className="text-gray-600">Storage</span><span className="font-medium text-gray-900">{formatFileSize(stats.storageUsed)}</span></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2"><Link to="/login" onClick={closeMobileMenu} className="block px-6 py-2.5 rounded-full text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 text-center shadow">Login</Link><Link to="/register" onClick={closeMobileMenu} className="block px-8 py-3 rounded-full text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 text-center shadow">Get Started</Link></div>
            )}
          </div>
        ) : (
          <div className="md:hidden fixed left-4 right-4 z-[100000] rounded-xl backdrop-blur-md bg-white/5 border border-white/10 shadow-xl min-h-56" style={{ top: menuTop + 64 }}>
            <div className="flex flex-col pt-16">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center space-x-3"><AppleProfileImage size="md" name={user?.name || 'User'} profilePicture={user?.profilePicture} /><div className="min-w-0 flex-1"><p className="font-medium text-white text-base truncate">{user?.name || 'User'}</p><p className="text-sm text-white/70">{planLabel}</p></div></div>
                <button onClick={() => setShowUploader(true)} className="mt-3 w-full text-sm font-medium text-blue-300 hover:text-blue-200">Update your profile picture</button>
              </div>
              <div className="flex-1 p-4"><nav className="space-y-2"><Link to="/my-files" onClick={closeMobileMenu} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"><HardDrive className="w-5 h-5 flex-shrink-0" /><span>My Files</span></Link><button onClick={() => { window.location.href = '/dashboard#social'; closeMobileMenu(); }} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"><Share2 className="w-5 h-5 flex-shrink-0" /><span>Social Media Calendar</span></button><button onClick={() => { window.location.href = '/dashboard#settings'; closeMobileMenu(); }} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"><Settings className="w-5 h-5 flex-shrink-0" /><span>Settings</span></button>{user?.role === 'admin' && (<Link to="/admin" onClick={closeMobileMenu} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-white bg-white/5 hover:bg-white/10 border border-white/10"><Shield className="w-5 h-5 flex-shrink-0" /><span>Admin Dashboard</span></Link>)}<button onClick={handleLogout} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-base text-red-300 hover:bg-red-50/10 border border-white/10"><LogOut className="w-5 h-5 flex-shrink-0" /><span>Logout</span></button></nav></div>
              <div className="p-4 border-t border-white/10"><div className="space-y-3"><div className="flex items-center justify-between text-sm"><span className="text-white">Videos</span><span className="font-medium text-white">{stats.videoCount}/{stats.maxVideos}</span></div><div className="flex items-center justify-between text-sm"><span className="text-white">Storage</span><span className="font-medium text-white">{formatFileSize(stats.storageUsed)}</span></div></div></div>
            </div>
          </div>
        )}
      </>, document.body)}
    </>
  );
};

export default Header;