import React from 'react';
import { User } from 'lucide-react';

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
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const initials = getInitials(name);
  const [color1, color2] = getGradientColors(name);

  // If profile picture is available, show it
  if (profilePicture) {
    const isAbsolute = /^https?:\/\//i.test(profilePicture);
    const imageSrc = isAbsolute
      ? profilePicture
      : `${process.env.REACT_APP_API_URL || ''}${profilePicture}`;
    return (
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden shadow-lg ${className}`}
        style={{
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}
      >
        <img 
          src={imageSrc} 
          alt={`${name}'s profile`}
          className="w-full h-full object-cover"
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
      }}
    >
      <span className={textSizes[size]}>{initials}</span>
    </div>
  );
};

export default AppleProfileImage;