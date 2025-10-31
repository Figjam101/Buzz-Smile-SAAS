import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { StatsProvider } from './contexts/StatsContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingSpinner from './components/LoadingSpinner';
import { manageFocusForSPA, addSkipLink } from './utils/accessibility';

// Lazy load components for better performance
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const ShareVideo = React.lazy(() => import('./pages/ShareVideo'));
const BuzzAnimationDemo = React.lazy(() => import('./components/BuzzAnimationDemo'));
const GoogleDriveConnected = React.lazy(() => import('./pages/GoogleDriveConnected'));
const DebugAPI = React.lazy(() => import('./pages/DebugAPI'));

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

function App() {
  useEffect(() => {
    // Add skip link for accessibility
    addSkipLink('main-content');
  }, []);

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
            <main id="main-content" role="main">
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/share/:videoId" element={<ShareVideo />} />
                  <Route path="/buzz-demo" element={<BuzzAnimationDemo />} />
                  <Route path="/debug-api" element={<DebugAPI />} />
                  <Route 
                    path="/integrations/google-drive/connected" 
                    element={
                      <ProtectedRoute>
                        <GoogleDriveConnected />
                      </ProtectedRoute>
                    }
                  />
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
          </div>
        </Router>
      </StatsProvider>
    </AuthProvider>
  );
}

export default App;