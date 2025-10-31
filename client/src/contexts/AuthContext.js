import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

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
    // Set base URL for all axios requests
    const envBaseRaw = process.env.REACT_APP_API_URL || '';
    // Normalize base: remove trailing slash and trailing '/api' to avoid double '/api'
    const envBaseTrimmed = envBaseRaw.replace(/\/$/, '');
    const envBase = /\/api$/.test(envBaseTrimmed)
      ? envBaseTrimmed.replace(/\/api$/, '')
      : envBaseTrimmed;
    let baseURL = envBase;
    if (!baseURL && typeof window !== 'undefined') {
      const origin = window.location.origin;
      // In local dev, default to backend on 5000; in prod, use same-origin
      baseURL = origin.includes('localhost:3000') ? 'http://localhost:5000' : '';
    }
    axios.defaults.baseURL = baseURL || '';
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
    const handleOAuthMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      
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
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
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
    try {
      if (token) {
        const response = await axios.get('/api/auth/me');
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