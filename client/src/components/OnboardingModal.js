import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Facebook, X } from 'lucide-react';
import { initFacebookSDK, loginWithFacebook } from '../utils/facebookSdk';

const OnboardingModal = ({ isOpen, onClose }) => {
  const { user, handleOAuthLogin, refreshUser } = useAuth();
  const [connecting, setConnecting] = useState(false);
  if (!isOpen) return null;

  const isFacebookLinked = Array.isArray(user?.linkedSocialAccounts) && user.linkedSocialAccounts.includes('facebook');

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[92%] max-w-lg">
        <div className="flex items-center justify-between px-5 pt-5">
          <h3 className="text-lg font-semibold text-gray-900">Let’s set up your account</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-sm text-gray-600 mb-4">Follow these steps to finish onboarding and enable social posting.</p>

          <div className="rounded-xl border border-gray-200 p-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Connect Facebook Business</p>
                  <p className="text-xs text-gray-500">Link your Facebook Business account to post videos directly from the calendar.</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs ${isFacebookLinked ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700'}`}>
                {isFacebookLinked ? 'Connected' : 'Not connected'}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              {isFacebookLinked ? (
                <button
                  className="px-4 py-2 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                  onClick={onClose}
                >
                  Done
                </button>
              ) : (
                <button
                  className={`px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 ${connecting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={async () => {
                    if (connecting) return;
                    setConnecting(true);
                    try {
                      await initFacebookSDK();
                      const auth = await loginWithFacebook();
                      if (auth && auth.accessToken) {
                        try {
                          await refreshUser();
                        } catch (_) {}
                        onClose();
                        return;
                      }
                      handleOAuthLogin('facebook');
                    } catch (e) {
                      handleOAuthLogin('facebook');
                    } finally {
                      setConnecting(false);
                    }
                  }}
                >
                  {connecting ? 'Connecting…' : 'Connect Facebook'}
                </button>
              )}
              <button
                className="px-4 py-2 rounded-full text-gray-700 hover:bg-gray-100"
                onClick={onClose}
              >
                Skip for now
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">You can change this later under Settings → Social Accounts.</p>
          </div>

          {/* Future steps could go here */}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;