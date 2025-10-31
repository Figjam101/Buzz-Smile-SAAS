import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfilePictureUploader = ({ isOpen, onClose }) => {
  const { token, refreshUser } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewUrl(null);
      setUploading(false);
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!selected.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error('Image size must be ≤ 5MB');
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please choose an image to upload');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('profilePicture', file);

      const apiBase = process.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiBase}/api/users/profile`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile picture');
      }

      toast.success('Profile picture updated');
      await refreshUser();
      onClose?.();
    } catch (error) {
      console.error('Profile picture upload failed:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-[92%] max-w-sm p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Update profile picture</h3>
        <div className="space-y-4">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover mx-auto" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
              <span className="text-gray-400 text-sm">No image</span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <label className="px-3 py-2 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
              Choose Image
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-full text-gray-700 hover:bg-gray-100"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="px-3 py-2 text-sm rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">Max 5MB, JPG/PNG/WebP</p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePictureUploader;