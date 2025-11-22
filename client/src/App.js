// Force deployment - Updated: 2025-10-31 18:37:00
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { StatsProvider } from './contexts/StatsContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingSpinner from './components/LoadingSpinner';
import Header from './components/Header';
import { manageFocusForSPA } from './utils/accessibility';
import { useAuth } from './contexts/AuthContext';
import { useStats } from './contexts/StatsContext';
import AppleProfileImage from './components/AppleProfileImage';
import ProfilePictureUploader from './components/ProfilePictureUploader';
import { Upload, HardDrive, Shield, Settings, Crown } from 'lucide-react';

// Lazy load components for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const MyFiles = React.lazy(() => import('./pages/MyFiles'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ShareVideo = React.lazy(() => import('./pages/ShareVideo'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
// Removed debug/demo components from production build
const AuthSuccess = React.lazy(() => import('./pages/AuthSuccess'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));

// Component to handle page title and meta updates
const PageTitleHandler = () => {
  const location = useLocation();
  
  useEffect(() => {
    const getPageInfo = (pathname) => {
      switch (pathname) {
        case '/':
          return {
            title: 'Buzz Smile Media - Professional Video Editing & Social Media Content Creation',
            description: 'Transform your videos with professional editing tools. Create stunning social media content, add effects, and share across platforms. Fast, easy, and professional video editing for creators and businesses.',
            canonical: `${window.location.origin}/`
          };
        case '/dashboard':
          return {
            title: 'Dashboard - VideoSaaS',
            description: 'Manage your videos, upload new content, and track your video editing progress.',
            canonical: `${window.location.origin}/dashboard`
          };
        
        case '/admin':
          return {
            title: 'Admin Dashboard - VideoSaaS',
            description: 'Administrative control panel for managing users, system monitoring, and enterprise features.',
            canonical: `${window.location.origin}/admin`
          };
        case '/onboarding':
          return {
            title: 'Welcome Onboarding - VideoSaaS',
            description: 'Personalize your setup, connect accounts, and get ready to post.',
            canonical: `${window.location.origin}/onboarding`
          };
        
        case '/login':
          return {
            title: 'Login - VideoSaaS',
            description: 'Sign in to your VideoSaaS account to access professional video editing tools.',
            canonical: `${window.location.origin}/login`
          };
        case '/register':
          return {
            title: 'Register - VideoSaaS',
            description: 'Create your VideoSaaS account and start editing videos professionally.',
            canonical: `${window.location.origin}/register`
          };
        default:
          if (pathname.startsWith('/share/')) {
            return {
              title: 'Shared Video - VideoSaaS',
              description: 'View and download shared video content from VideoSaaS.',
              canonical: `${window.location.origin}${pathname}`
            };
          }
          return {
            title: 'VideoSaaS - Professional Video Editing Platform',
            description: 'Professional video editing platform with AI-powered tools for content creators.',
            canonical: `${window.location.origin}${pathname}`
          };
      }
    };
    
    const { title, description, canonical } = getPageInfo(location.pathname);
    
    // Update page title
    document.title = title;
    
    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
    
    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonical);
    }
    
    // Manage focus for accessibility
    manageFocusForSPA(title);
  }, [location]);
  
  return null;
};

function AppShell() {
  const location = useLocation();
  const showSidebar = ['/dashboard','/my-files','/onboarding'].includes(location.pathname);
  const isHome = location.pathname === '/';
  useEffect(() => {
    const nonDashboardRoutes = ['/','/login','/register','/forgot-password','/reset-password','/auth/success','/share'];
    const isNonDashboard = nonDashboardRoutes.some((r) => location.pathname === r || location.pathname.startsWith('/share/'));
    try {
      if (isNonDashboard) {
        document.body.classList.add('light-body');
      } else {
        document.body.classList.remove('light-body');
      }
    } catch (_) {}
  }, [location.pathname]);

  return (
    <>
      {!isHome && <Header />}
      {showSidebar && <DashboardSidebar />}
      <main
        id="main-content"
        role="main"
        className={showSidebar ? 'pt-[var(--dashboard-header-bottom,64px)]' : (isHome ? 'pt-0 bg-gray-50 min-h-screen' : 'pt-16 bg-gray-50 min-h-screen')}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/success" element={<AuthSuccess />} />
            <Route path="/share/:videoId" element={<ShareVideo />} />
            {/* Debug/demo routes removed */}
            <Route path="/" element={<Home />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route 
              path="/my-files" 
              element={
                <ProtectedRoute>
                  <MyFiles />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/onboarding" 
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/upload" 
              element={null}
            />
            {/* Admin route removed */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
          </Routes>
        </Suspense>
      </main>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            theme: {
              primary: '#4aed88',
            },
          },
        }}
      />
    </>
  );
}

function DashboardSidebar() {
  const { user } = useAuth();
  const { stats, formatFileSize } = useStats();
  const location = useLocation();
  const [showUploader, setShowUploader] = useState(false);
  const isFiles = location.pathname === '/my-files';
  const isCreate = location.pathname === '/dashboard';
  const isSocial = location.pathname === '/dashboard' && location.hash === '#social';
  const isSettings = location.pathname === '/dashboard' && location.hash === '#settings';

  const renderPlanButton = () => {
    const isGodPlan = user?.subscription?.plan === 'god' || user?.plan === 'god';
    const isGod = user?.role === 'admin' || isGodPlan;
    if (isGod) {
      return (
        <button className="w-full btn-primary text-sm font-medium flex items-center justify-center space-x-2 animate-pulse">
          <Crown className="w-4 h-4" />
          <span>🔥 GOD MODE 🔥</span>
        </button>
      );
    }
    if ((stats?.plan || 'Free') === 'Free') {
      return (
        <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2">
          <Crown className="w-4 h-4" />
          <span>Upgrade Plan</span>
        </button>
      );
    }
    return (
      <button className="w-full px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2">
        <Crown className="w-4 h-4" />
        <span>{stats?.plan}</span>
      </button>
    );
  };

  return (
    <>
      <ProfilePictureUploader isOpen={showUploader} onClose={() => setShowUploader(false)} />
      <div id="dashboard-sidebar" className="hidden md:block fixed left-0 top-[calc(var(--dashboard-header-bottom,64px))] h-[calc(100vh-4rem)] w-56 sm:w-64 z-30 overflow-y-auto edge-right-3d">
        <div className="flex flex-col h-full">
          <div className="p-6 pl-4 mx-3 mt-4 mb-3 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={() => setShowUploader(true)}
                  aria-label="Update your profile picture"
                  className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <AppleProfileImage size="lg" name={user?.name || 'User'} profilePicture={user?.profilePicture} />
                  <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 shadow ring-2 ring-white">
                    <Upload className="w-3 h-3" />
                  </span>
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white text-lg truncate">{user?.name || 'User'}</p>
                {user?.role === 'admin' ? (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                      <Shield className="w-3 h-3 mr-1" />
                      Administrator
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white border border-white/20">
                      <Crown className="w-3 h-3 mr-1" />
                      {stats?.plan}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') localStorage.removeItem('onboardingDismissed');
                  }}
                  className="mt-1 text-xs text-white hover:text-blue-200"
                >
                  Set up your account
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 pl-4 mx-3 my-3 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
            <nav className="grid grid-cols-1 gap-3">
              <Link
                to="/dashboard"
                className="group w-full px-3 py-2.5 rounded-xl text-white flex items-center bg-white/5 hover:bg-white/10 ring-1 ring-white/15 hover:ring-white/30 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isCreate ? 'bg-white/20 border-white/40 shadow-md' : 'bg-white/10 border-white/20 group-hover:bg-white/15 group-hover:border-white/30 shadow-sm group-hover:shadow-md'}`}>
                  <Upload className="w-6 h-6" />
                </div>
                <span className="ml-3 flex-1 text-xs sm:text-sm font-medium text-white leading-snug truncate">Create Video</span>
              </Link>
              <Link
                to="/my-files"
                className="group w-full px-3 py-2.5 rounded-xl text-white flex items-center bg-white/5 hover:bg-white/10 ring-1 ring-white/15 hover:ring-white/30 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isFiles ? 'bg-white/20 border-white/40 shadow-md' : 'bg-white/10 border-white/20 group-hover:bg-white/15 group-hover:border-white/30 shadow-sm group-hover:shadow-md'}`}>
                  <HardDrive className="w-6 h-6" />
                </div>
                <span className="ml-3 flex-1 text-xs sm:text-sm font-medium text-white leading-snug truncate">My Files</span>
              </Link>
              <Link
                to="/dashboard#social"
                className="group w-full px-3 py-2.5 rounded-xl text-white flex items-center bg-white/5 hover:bg-white/10 ring-1 ring-white/15 hover:ring-white/30 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isSocial ? 'bg-white/20 border-white/40 shadow-md' : 'bg-white/10 border-white/20 group-hover:bg-white/15 group-hover:border-white/30 shadow-sm group-hover:shadow-md'}`}>
                  <Settings className="w-6 h-6" />
                </div>
                <span className="ml-3 flex-1 text-xs sm:text-sm font-medium text-white leading-snug truncate">Social Media Calendar</span>
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="group w-full px-3 py-2.5 rounded-xl text-white flex items-center bg-white/5 hover:bg-white/10 ring-1 ring-white/15 hover:ring-white/30 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-white/10 border-white/20 group-hover:bg-white/15 group-hover:border-white/30 shadow-sm group-hover:shadow-md">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="ml-3 flex-1 text-xs sm:text-sm font-medium text-white leading-snug truncate">Admin Dashboard</span>
                </Link>
              )}
              <Link
                to="/dashboard#settings"
                className="group w-full px-3 py-2.5 rounded-xl text-white flex items-center bg-white/5 hover:bg-white/10 ring-1 ring-white/15 hover:ring-white/30 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isSettings ? 'bg-white/20 border-white/40 shadow-md' : 'bg-white/10 border-white/20 group-hover:bg-white/15 group-hover:border-white/30 shadow-sm group-hover:shadow-md'}`}>
                  <Settings className="w-6 h-6" />
                </div>
                <span className="ml-3 flex-1 text-xs sm:text-sm font-medium text-white leading-snug truncate">Settings</span>
              </Link>
            </nav>
          </div>

          <div className="p-4 pl-4 mx-3 my-3 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">Videos</span>
                <span className="font-medium text-white">
                  {user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god') 
                    ? `${stats.videoCount}/∞` 
                    : `${stats.videoCount}/${stats.maxVideos}`
                  }
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">Storage</span>
                <span className="font-medium text-white">
                  {formatFileSize(stats.storageUsed)}
                  {stats.storageLimit > 0 && ` / ${formatFileSize(stats.storageLimit)}`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: user?.role === 'admin' && (user?.subscription?.plan === 'god' || user?.plan === 'god')
                      ? '100%'
                      : `${Math.min((stats.videoCount / stats.maxVideos) * 100, 100)}%`
                  }}
                ></div>
              </div>
              {renderPlanButton()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <StatsProvider>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <div className="App">
            <PageTitleHandler />
            <AppShell />
          </div>
        </Router>
      </StatsProvider>
    </AuthProvider>
  );
}

export default App;
