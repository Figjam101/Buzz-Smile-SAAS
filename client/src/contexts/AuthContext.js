import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();
const MOCK_API = String(process.env.REACT_APP_MOCK_API).toLowerCase() === 'true';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [oauthLoading, setOauthLoading] = useState(false);

  // Configure axios defaults
  useEffect(() => {
    // Set base URL for all axios requests from env or same-origin
    const envBaseRaw = process.env.REACT_APP_API_URL || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const baseCandidate = (envBaseRaw || origin).replace(/\/$/, '');
    const devAdjusted = (!envBaseRaw && /localhost:3000$/.test(origin))
      ? origin.replace(':3000', ':5002')
      : baseCandidate;
    axios.defaults.baseURL = devAdjusted;
    // Optional: surface configuration in console for quick diagnostics
    if (process.env.NODE_ENV !== 'production') {
      console.log('[AuthContext] axios baseURL set to:', axios.defaults.baseURL);
    }
    
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);
  
  // Listen for OAuth success messages
  useEffect(() => {
    const allowedOrigins = new Set([
      typeof window !== 'undefined' ? window.location.origin : '',
      'https://buzz-smile-saas.vercel.app'
    ].filter(Boolean));

    const handleOAuthMessage = (event) => {
      // Accept messages from same-origin and our production frontend
      if (!allowedOrigins.has(event.origin)) return;

      if (event.data.type === 'OAUTH_SUCCESS' && event.data.token) {
        localStorage.setItem('token', event.data.token);
        setToken(event.data.token);
        setOauthLoading(false);
        window.location.reload(); // Refresh to update auth state
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      // In mock mode, skip network calls and treat as logged out
      if (MOCK_API) {
        // Auto-login as admin for preview if no token/user set
        if (!token) {
          const mockToken = 'mock-token';
          const mockUser = { name: 'Preview Admin', email: 'admin@preview.local', role: 'admin' };
          localStorage.setItem('token', mockToken);
          setToken(mockToken);
          setUser(mockUser);
        }
        setLoading(false);
        return;
      }
      if (token) {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { 
              Authorization: `Bearer ${token}`,
              'x-bypass-cache': '1'
            },
            // In dev, avoid sending credentials unless needed
            withCredentials: false
          });
          setUser(response.data.user);
        } catch (error) {
          // Handle common unauthorized cases quietly to avoid noisy logs in dev
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
          } else {
            console.warn('Auth check failed:', error?.message || error);
          }
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    if (MOCK_API) {
      const mockUser = { name: 'Preview Admin', email, role: 'admin' };
      const mockToken = 'mock-token';
      localStorage.setItem('token', mockToken);
      setToken(mockToken);
      setUser(mockUser);
      toast.success('Logged in (mock mode)');
      return { success: true };
    }
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success('Welcome back!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (name, email, password, businessName) => {
    if (MOCK_API) {
      // Simulate successful registration without server
      const mockUser = { name, email, businessName };
      const mockToken = 'mock-token';
      localStorage.setItem('token', mockToken);
      setToken(mockToken);
      setUser(mockUser);
      toast.success('Account created (mock mode)');
      return { success: true };
    }
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
        businessName
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      
      toast.success('Account created successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    if (MOCK_API) {
      // Update local user state without server
      if (profileData && typeof profileData === 'object') {
        setUser({ ...(user || {}), ...profileData });
        toast.success('Profile updated (mock mode)');
        return { success: true };
      }
    }
    try {
      // If profileData is already the updated user object, just update the state
      if (profileData && typeof profileData === 'object' && profileData.email) {
        setUser(profileData);
        return { success: true };
      }
      
      // Otherwise, make API call
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const refreshUser = async () => {
    if (MOCK_API) {
      return { success: true };
    }
    try {
      if (token) {
        const response = await axios.get('/api/auth/me', {
          headers: { 'x-bypass-cache': '1' }
        });
        setUser(response.data.user);
        return { success: true };
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return { success: false };
    }
  };

  // OAuth login handlers
  const handleOAuthLogin = (provider) => {
    setOauthLoading(true);
    const apiBase = axios.defaults.baseURL || '';
    const popup = window.open(
      `${apiBase}/auth/${provider}`,
      `${provider}-login`,
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        setOauthLoading(false);
      }
    }, 1000);
  };

  const value = {
    user,
    token,
    loading,
    oauthLoading,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    handleOAuthLogin,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};