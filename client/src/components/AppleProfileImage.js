import React, { useState } from 'react';
import axios from 'axios';

const AppleProfileImage = ({ 
  size = 'md', 
  name = 'User', 
  profilePicture = null,
  className = '' 
}) => {
  // Generate consistent colors based on the user's name
  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Generate a consistent color based on the name
  const getGradientColors = (name) => {
    const colors = [
      ['#FF6B6B', '#FF8E8E'], // Red
      ['#4ECDC4', '#44A08D'], // Teal
      ['#45B7D1', '#96C93D'], // Blue-Green
      ['#FFA07A', '#FA8072'], // Salmon
      ['#98D8C8', '#F7DC6F'], // Mint-Yellow
      ['#BB6BD9', '#C44569'], // Purple-Pink
      ['#F093FB', '#F5576C'], // Pink-Red
      ['#4FACFE', '#00F2FE'], // Blue-Cyan
      ['#43E97B', '#38F9D7'], // Green-Cyan
      ['#FFECD2', '#FCB69F'], // Peach
    ];
    
    // Simple hash function to get consistent color index
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  // Removed unused iconSizes

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const initials = getInitials(name);
  const [color1, color2] = getGradientColors(name);

  // If profile picture is available, show it
  const [imageError, setImageError] = useState(false);
  if (profilePicture && !imageError) {
    const isAbsolute = /^https?:\/\//i.test(profilePicture);
    // Resolve base URL robustly: prefer env, then axios base, then sensible local default
    const envBaseRaw = process.env.REACT_APP_API_URL || '';
    const envBaseTrimmed = envBaseRaw.replace(/\/$/, '');
    const envBase = /\/api$/.test(envBaseTrimmed)
      ? envBaseTrimmed.replace(/\/api$/, '')
      : envBaseTrimmed;
    let apiBase = envBase || axios.defaults.baseURL || '';
    if (!apiBase && typeof window !== 'undefined') {
      const origin = window.location.origin;
      // Default to backend on port 5001 in local dev; else same-origin
      apiBase = origin.includes('localhost:3000') ? 'http://localhost:5001' : origin;
    }
    const imageSrc = isAbsolute
      ? profilePicture
      : `${apiBase.replace(/\/$/, '')}${profilePicture}`;
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-lg ${className}`}
        style={{
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        <img 
          src={imageSrc} 
          alt={`${name}'s profile`}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Otherwise show initials with gradient background
  return (
    <div 
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white shadow-lg ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color1}, ${color2})`,
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
      }}
    >
      <span className={textSizes[size]}>{initials}</span>
    </div>
  );
};

export default AppleProfileImage;