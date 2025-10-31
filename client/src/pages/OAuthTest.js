import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const OAuthTest = () => {
  const { handleOAuthLogin } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});

  const platforms = [
    { id: 'google', name: 'Google', color: 'bg-red-500' },
    { id: 'facebook', name: 'Facebook', color: 'bg-blue-600' },
    { id: 'instagram', name: 'Instagram', color: 'bg-purple-500' },
    { id: 'twitter', name: 'Twitter', color: 'bg-blue-400' }
  ];

  const runTest = async (platform) => {
    setLoading(prev => ({ ...prev, [platform]: true }));
    setTestResults(prev => ({ ...prev, [platform]: { status: 'running' } }));
    
    try {
      // Set up a promise that will resolve when the OAuth process completes
      const testPromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('OAuth test timed out after 60 seconds'));
        }, 60000);
        
        // Use the handleOAuthLogin function from AuthContext
        handleOAuthLogin(platform, (success, error) => {
          clearTimeout(timeoutId);
          if (success) {
            resolve(success);
          } else {
            reject(error || new Error('OAuth failed'));
          }
        });
      });
      
      await testPromise;
      
      setTestResults(prev => ({
        ...prev,
        [platform]: { 
          status: 'success',
          message: 'Authentication successful!'
        }
      }));
    } catch (error) {
      console.error(`OAuth test error for ${platform}:`, error);
      setTestResults(prev => ({
        ...prev,
        [platform]: { 
          status: 'error',
          message: error.message || 'Authentication failed'
        }
      }));
    } finally {
      setLoading(prev => ({ ...prev, [platform]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">OAuth Test Center</h2>
          <p className="mt-2 text-sm text-gray-600">
            Test your social media OAuth connections
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {platforms.map((platform) => (
                <div 
                  key={platform.id}
                  className="border border-gray-200 rounded-md p-4"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full ${platform.color} flex items-center justify-center text-white mr-3`}>
                        {platform.name.charAt(0)}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">{platform.name}</h3>
                    </div>
                    <button
                      onClick={() => runTest(platform.id)}
                      disabled={loading[platform.id]}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading[platform.id] ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  
                  {testResults[platform.id] && (
                    <div className={`mt-2 p-3 rounded-md ${
                      testResults[platform.id].status === 'success' 
                        ? 'bg-green-50 text-green-700' 
                        : testResults[platform.id].status === 'error'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-blue-50 text-blue-700'
                    }`}>
                      <div className="flex">
                        {testResults[platform.id].status === 'success' ? (
                          <Check className="h-5 w-5 text-green-400 mr-2" />
                        ) : testResults[platform.id].status === 'error' ? (
                          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        ) : (
                          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                        )}
                        <p className="text-sm">
                          {testResults[platform.id].message || 'Testing connection...'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Link 
            to="/dashboard" 
            className="flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OAuthTest;