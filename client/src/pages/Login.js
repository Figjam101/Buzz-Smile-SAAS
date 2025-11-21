import React, { useState, useRef, useEffect } from 'react';
import GradientBlinds from '../components/GradientBlinds';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, Video } from 'lucide-react';
import { announceToScreenReader } from '../utils/accessibility';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { login } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  // Focus on email field when component mounts
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    
    // Announce validation errors to screen readers
    if (Object.keys(newErrors).length > 0) {
      const errorMessages = Object.values(newErrors).join('. ');
      announceToScreenReader(`Form validation errors: ${errorMessages}`);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    announceToScreenReader('Signing in, please wait...');
    
    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        announceToScreenReader('Login successful. Redirecting to Create Video.');
        navigate('/upload');
      }
    } catch (error) {
      console.error('Login error:', error);
      announceToScreenReader('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };


  // Social login removed for now

  return (
    <div className="relative min-h-screen bg-transparent">
      <div className="fixed inset-0 z-0" style={{ pointerEvents: 'none' }}>
        <div style={{ width: '100%', height: '100svh', position: 'relative' }}>
          <GradientBlinds 
            gradientColors={["#FF9FFC", "#5227FF"]} 
            angle={0} 
            noise={0.3} 
            blindCount={12} 
            blindMinWidth={50} 
            spotlightRadius={0.5} 
            spotlightSoftness={1} 
            spotlightOpacity={1} 
            mouseDampening={0.15} 
            distortAmount={0} 
            shineDirection="left" 
            mixBlendMode="lighten" 
          /> 
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-center min-h-[100svh] px-4">
        <div className="w-full sm:max-w-md">
          <div className="card p-8">
            <div className="flex flex-col items-center text-center">
              <Video className="h-12 w-12 text-primary-600" />
              <h2 className="mt-6 text-3xl font-bold text-white">Welcome back</h2>
              <p className="mt-2 text-sm text-white/80">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-amber-300 hover:text-amber-200 transition-colors">
                  Sign up for free
                </Link>
              </p>
            </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  ref={emailRef}
                  value={formData.email}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    // Allow all key operations including backspace, delete, etc.
                    e.stopPropagation();
                  }}
                  onInput={(e) => {
                    // Ensure input events are properly handled
                    e.stopPropagation();
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '12px 40px 12px 40px',
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    outline: 'none',
                    boxSizing: 'border-box',
                    zIndex: 1
                  }}
                  placeholder="Enter your email"
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    // Allow all key operations including backspace, delete, etc.
                    e.stopPropagation();
                  }}
                  onInput={(e) => {
                    // Ensure input events are properly handled
                    e.stopPropagation();
                  }}
                  style={{
                    width: '100%',
                    height: '48px',
                    padding: '12px 40px 12px 40px',
                    border: '2px solid #ccc',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    color: 'black',
                    outline: 'none',
                    boxSizing: 'border-box',
                    zIndex: 1
                  }}
                  placeholder="Enter your password"
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="mt-1 text-sm text-red-600" role="alert">{errors.password}</p>
              )}
            </div>

            {/* Remember me and Forgot password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-400 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-ceramic py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-spinner h-5 w-5"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Social login removed */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;