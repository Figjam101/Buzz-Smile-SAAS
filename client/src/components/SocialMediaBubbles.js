import React, { useState } from 'react';
import styled from 'styled-components';
import SocialMediaPopup from './SocialMediaPopup';

const SocialMediaBubbles = ({ socialMedia = {}, onUpdateSocialMedia, userLogo }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  // Function to get profile picture URL based on platform and URL
  const getProfilePicture = (platform, url) => {
    if (!url) return null;
    
    try {
      // Extract username/handle from URL
      let username = '';
      
      switch (platform) {
        case 'instagram':
          username = url.match(/instagram\.com\/([^\/\?]+)/)?.[1] || '';
          return username ? `https://unavatar.io/instagram/${username}` : null;
        case 'twitter':
          username = url.match(/(?:twitter\.com|x\.com)\/([^\/\?]+)/)?.[1] || '';
          return username ? `https://unavatar.io/twitter/${username}` : null;
        case 'youtube':
          // Extract channel name or ID from URL
          const channelMatch = url.match(/youtube\.com\/(?:c\/|channel\/|@)([^\/\?]+)/);
          username = channelMatch?.[1] || '';
          return username ? `https://unavatar.io/youtube/${username}` : null;
        case 'facebook':
          // Extract Facebook page/profile name from URL
          const fbMatch = url.match(/facebook\.com\/([^\/\?]+)/);
          username = fbMatch?.[1] || '';
          // For Facebook, try multiple approaches
          if (username && username !== 'people') {
            // First try: Use a CORS-friendly proxy service
            return `https://images.weserv.nl/?url=graph.facebook.com/${username}/picture?type=large&w=40&h=40&fit=cover&mask=circle`;
          }
          return null;
        case 'tiktok':
          username = url.match(/tiktok\.com\/@([^\/\?]+)/)?.[1] || '';
          return username ? `https://unavatar.io/tiktok/${username}` : null;
        default:
          return null;
      }
    } catch (error) {
      console.error('Error parsing profile URL:', error);
      return null;
    }
  };

  // Function to handle clicking on social media bubbles
  const handleBubbleClick = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const platforms = [
    {
      name: 'Facebook',
      key: 'facebook',
      color: '#1877F2',
      url: socialMedia.facebook,
      logo: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      )
    },
    {
      name: 'Instagram',
      key: 'instagram',
      color: '#E4405F',
      url: socialMedia.instagram,
      logo: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      )
    },
    {
      name: 'Twitter',
      key: 'twitter',
      color: '#1DA1F2',
      url: socialMedia.twitter,
      logo: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      )
    },
    {
      name: 'TikTok',
      key: 'tiktok',
      color: '#000000',
      url: socialMedia.tiktok,
      logo: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      )
    },
    {
      name: 'YouTube',
      key: 'youtube',
      color: '#FF0000',
      url: socialMedia.youtube,
      logo: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    }
  ];

  const handleSaveSocialMedia = async (newSocialMedia) => {
    if (onUpdateSocialMedia) {
      await onUpdateSocialMedia(newSocialMedia);
    }
  };

  const handleOpenPopup = () => {
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
  };

  return (
    <Container>
      <Title>Platform Connections</Title>
      <BubblesContainer>
        {platforms.map((platform) => {
          const profilePicUrl = getProfilePicture(platform.key, platform.url);
          const isConnected = !!platform.url;
          
          return (
            <BubbleWrapper key={platform.key}>
              <ProfileCircle
                connected={isConnected}
                color={platform.color}
                title={`${platform.name} - ${platform.url ? 'Connected' : 'Not Connected'}`}
                onClick={() => handleBubbleClick(platform.url)}
                style={{ cursor: platform.url ? 'pointer' : 'default' }}
              >
                {isConnected && profilePicUrl ? (
                  <ProfileImage 
                    src={profilePicUrl}
                    alt={`${platform.name} profile`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : isConnected && userLogo ? (
                  <ProfileImage 
                    src={userLogo}
                    alt="Business logo"
                  />
                ) : null}
                <PlaceholderIcon style={{ display: (isConnected && (profilePicUrl || userLogo)) ? 'none' : 'flex' }}>
                  {isConnected ? platform.name.charAt(0) : '?'}
                </PlaceholderIcon>
                
                {/* Red cross overlay for disconnected accounts */}
                {!isConnected && (
                  <DisconnectedOverlay>
                    <RedCross>✕</RedCross>
                  </DisconnectedOverlay>
                )}
              </ProfileCircle>
              <PlatformLogo color={platform.color}>
                {platform.logo}
              </PlatformLogo>
            </BubbleWrapper>
          );
        })}
      </BubblesContainer>
      <ReadMoreText onClick={handleOpenPopup}>
        Connect your account here
      </ReadMoreText>
      
      <SocialMediaPopup
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onSave={handleSaveSocialMedia}
        initialData={socialMedia}
      />
    </Container>
  );
};

const Container = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
`;

const Title = styled.h3`
  color: #374151;
  font-size: 1.1rem;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const BubblesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: center;
  justify-content: flex-start;
  margin: 0 auto;

  @media (max-width: 768px) {
    justify-content: center;
    gap: 1rem;
  }
`;

const BubbleWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const ProfileCircle = styled.div.withConfig({
  shouldForwardProp: (prop) => !['connected', 'color'].includes(prop),
})`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid ${props => props.connected ? props.color : '#E5E7EB'};
  background: ${props => props.connected ? '#FFFFFF' : '#F9FAFB'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: relative;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: ${props => props.color};
  }
`;

const ProfileImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
`;

const PlaceholderIcon = styled.div`
  font-size: 1.2rem;
  color: #9CA3AF;
  font-weight: 600;
`;

const PlatformLogo = styled.div`
  position: absolute;
  top: -5px;
  right: -10px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  color: ${props => props.color};
  border: 2px solid white;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const ReadMoreText = styled.div`
  font-size: 0.75rem;
  color: #6B7280;
  text-align: center;
  margin-top: 1rem;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: #4F46E5;
    text-decoration: underline;
  }
`;

const DisconnectedOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(239, 68, 68, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const RedCross = styled.div`
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
`;

export default SocialMediaBubbles;