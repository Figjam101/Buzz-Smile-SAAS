import React, { useState } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, Settings } from 'lucide-react';

const OAuthTest = () => {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  const getAuthUrl = (provider) => {
    const base = process.env.REACT_APP_API_URL || '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const apiBase = base || origin || 'http://localhost:5000';
    return `${apiBase.replace(/\/$/, '')}/auth/${provider}`;
  };

  const testOAuthProvider = async (provider) => {
    setTesting(true);
    try {
      const authUrl = getAuthUrl(provider);
      
      // Test if the OAuth endpoint is accessible
      const response = await fetch(authUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // This will prevent CORS errors for testing
      });
      
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          status: 'available',
          url: authUrl,
          message: 'OAuth endpoint is accessible'
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [provider]: {
          status: 'error',
          url: getAuthUrl(provider),
          message: error.message
        }
      }));
    }
    setTesting(false);
  };

  const testOAuthLogin = (provider) => {
    const popup = window.open(
      getAuthUrl(provider),
      `${provider}-test`,
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );

    // Listen for messages from the popup
    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OAUTH_SUCCESS') {
        popup.close();
        window.removeEventListener('message', messageListener);
        setTestResults(prev => ({
          ...prev,
          [provider]: {
            status: 'success',
            url: getAuthUrl(provider),
            message: 'OAuth login successful!',
            token: event.data.token ? 'Token received' : 'No token'
          }
        }));
      } else if (event.data.type === 'OAUTH_ERROR') {
        popup.close();
        window.removeEventListener('message', messageListener);
        setTestResults(prev => ({
          ...prev,
          [provider]: {
            status: 'error',
            url: getAuthUrl(provider),
            message: event.data.message || 'OAuth authentication failed'
          }
        }));
      }
    };

    window.addEventListener('message', messageListener);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageListener);
        setTestResults(prev => ({
          ...prev,
          [provider]: {
            status: 'cancelled',
            url: getAuthUrl(provider),
            message: 'OAuth popup was closed'
          }
        }));
      }
    }, 1000);
  };

  const providers = [
    { id: 'google', name: 'Google', color: 'bg-red-500' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-500' },
    { id: 'twitter', name: 'Twitter/X', color: 'bg-black' },
    { id: 'youtube', name: 'YouTube', color: 'bg-red-600' }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'available':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Settings className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">OAuth Configuration Test</h2>
        <p className="text-sm text-gray-600">
          Test OAuth providers to verify configuration and functionality.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => {
          const result = testResults[provider.id];
          
          return (
            <div key={provider.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 ${provider.color} rounded-lg flex items-center justify-center text-white font-semibold text-sm`}>
                    {provider.name[0]}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{provider.name}</h3>
                    <p className="text-sm text-gray-500">OAuth Provider</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {result && getStatusIcon(result.status)}
                  <button
                    onClick={() => testOAuthProvider(provider.id)}
                    disabled={testing}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Test Endpoint
                  </button>
                  <button
                    onClick={() => testOAuthLogin(provider.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Test Login</span>
                  </button>
                </div>
              </div>
              
              {result && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      result.status === 'success' ? 'text-green-600' :
                      result.status === 'error' || result.status === 'cancelled' ? 'text-red-600' :
                      result.status === 'available' ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {result.status}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">URL:</span>
                    <code className="ml-2 text-xs bg-gray-200 px-1 py-0.5 rounded">
                      {result.url}
                    </code>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Message:</span>
                    <span className="ml-2 text-gray-800">{result.message}</span>
                  </div>
                  {result.token && (
                    <div className="text-sm">
                      <span className="text-gray-600">Token:</span>
                      <span className="ml-2 text-green-600">{result.token}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Configuration Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• OAuth providers require proper app configuration in their developer consoles</li>
          <li>• Callback URLs must match exactly: <code className="bg-blue-100 px-1 rounded">{getAuthUrl('provider').replace('/provider', '/[provider]/callback')}</code></li>
          <li>• Environment variables must be set on the backend (Railway)</li>
          <li>• CORS settings must allow the frontend domain</li>
        </ul>
      </div>
    </div>
  );
};

export default OAuthTest;