import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const VideoList = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    console.log('VideoList component mounted');
    console.log('Current token in localStorage:', localStorage.getItem('token'));
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      console.log('=== FETCHING VIDEOS ===');
      console.log('API URL:', `${process.env.REACT_APP_API_URL}/api/videos`);
      console.log('Token available:', !!localStorage.getItem('token'));
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/videos`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const data = await response.json();
      console.log('=== API RESPONSE ===');
      console.log('Full response data:', data);
      console.log('Videos array:', data.videos);
      console.log('Number of videos:', data.videos?.length || 0);
      console.log('Pagination info:', data.pagination);
      
      // Log each video for debugging
      if (data.videos && data.videos.length > 0) {
        console.log('=== INDIVIDUAL VIDEOS ===');
        data.videos.forEach((video, index) => {
          console.log(`Video ${index + 1}:`, {
            id: video._id,
            title: video.title,
            status: video.status,
            createdAt: video.createdAt
          });
        });
      }
      
      setVideos(data.videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    console.log('Video clicked:', video.title || video.originalFilename);
    console.log('Current showPreviewModal state:', showPreviewModal);
    console.log('Setting selectedVideo to:', video);
    setSelectedVideo(video);
    console.log('Setting showPreviewModal to true');
    setShowPreviewModal(true);
    setVideoBlobUrl(null); // Reset blob URL
    loadVideoBlob(video);
    console.log('After state updates - showPreviewModal should be true');
  };

  const loadVideoBlob = async (video) => {
    if (!video || (video.status !== 'ready' && video.status !== 'completed')) {
      console.log('Video not ready for preview:', video);
      return;
    }

    console.log('Starting video blob load for:', video._id);
    setVideoLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token available:', !!token);
      
      const streamUrl = `/api/videos/${video._id}/stream`;
      console.log('Fetching video from:', streamUrl);
      
      const response = await fetch(streamUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      const blob = await response.blob();
      console.log('Blob created:', blob.size, 'bytes, type:', blob.type);
      
      const blobUrl = URL.createObjectURL(blob);
      console.log('Blob URL created:', blobUrl);
      
      setVideoBlobUrl(blobUrl);
    } catch (error) {
      console.error('Error loading video blob:', error);
      console.error('Error stack:', error.stack);
    } finally {
      setVideoLoading(false);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setSelectedVideo(null);
    // Clean up blob URL to prevent memory leaks
    if (videoBlobUrl) {
      URL.revokeObjectURL(videoBlobUrl);
      setVideoBlobUrl(null);
    }
  };

  const handleDownload = async (videoId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/videos/${videoId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download video');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `processed_video_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download video');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'processing':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading videos...</LoadingSpinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
        <RetryButton onClick={fetchVideos}>Retry</RetryButton>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Your Videos</Title>
        <VideoCount>{videos.length} video{videos.length !== 1 ? 's' : ''}</VideoCount>
      </Header>

      {videos.length === 0 ? (
        <EmptyState>
          <EmptyIcon>🎬</EmptyIcon>
          <EmptyTitle>No videos yet</EmptyTitle>
          <EmptyDescription>
            Upload your first video to get started with AI-powered editing
          </EmptyDescription>
        </EmptyState>
      ) : (
        <VideoGrid>
          {videos.map((video) => (
            <VideoCard key={video._id} onClick={() => handleVideoClick(video)}>
              <VideoThumbnail>
                {video.thumbnailUrl ? (
                  <ThumbnailImage src={video.thumbnailUrl} alt={video.title || video.originalFilename} />
                ) : (
                  <ThumbnailPlaceholder>
                    <PlayIcon>▶️</PlayIcon>
                    <ThumbnailText>Click to Preview</ThumbnailText>
                  </ThumbnailPlaceholder>
                )}
                <ThumbnailOverlay>
                  <PlayButton>▶️</PlayButton>
                </ThumbnailOverlay>
              </VideoThumbnail>

              <VideoHeader>
                <VideoTitle>{video.title || video.originalFilename}</VideoTitle>
                <StatusBadge status={video.status}>
                  <StatusIcon>{getStatusIcon(video.status)}</StatusIcon>
                  <StatusText color={getStatusColor(video.status)}>
                    {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                  </StatusText>
                </StatusBadge>
              </VideoHeader>

              <VideoInfo>
                <InfoRow>
                  <InfoLabel>Uploaded:</InfoLabel>
                  <InfoValue>
                    {new Date(video.createdAt).toLocaleDateString()}
                  </InfoValue>
                </InfoRow>
                
                {video.metadata?.fileSize && (
                  <InfoRow>
                    <InfoLabel>Size:</InfoLabel>
                    <InfoValue>{formatFileSize(video.metadata.fileSize)}</InfoValue>
                  </InfoRow>
                )}
                
                {video.metadata?.duration && (
                  <InfoRow>
                    <InfoLabel>Duration:</InfoLabel>
                    <InfoValue>{formatDuration(video.metadata.duration)}</InfoValue>
                  </InfoRow>
                )}
                
                {video.metadata?.resolution && (
                  <InfoRow>
                    <InfoLabel>Resolution:</InfoLabel>
                    <InfoValue>{video.metadata.resolution}</InfoValue>
                  </InfoRow>
                )}
              </VideoInfo>

              {video.status === 'processing' && (
                <ProgressContainer>
                  <ProgressLabel>Processing: {video.processingProgress}%</ProgressLabel>
                  <ProgressBar>
                    <ProgressFill progress={video.processingProgress} />
                  </ProgressBar>
                </ProgressContainer>
              )}

              {video.editingOptions && Object.keys(video.editingOptions).length > 0 && (
                <EditingOptions>
                  <OptionsTitle>Applied Effects:</OptionsTitle>
                  <OptionsList>
                    {video.editingOptions.addText && <OptionTag>📝 Text Overlay</OptionTag>}
                    {video.editingOptions.fadeIn && <OptionTag>🌅 Fade In</OptionTag>}
                    {video.editingOptions.slowMotion && <OptionTag>🐌 Slow Motion</OptionTag>}
                    {video.editingOptions.compress && <OptionTag>📦 Compressed</OptionTag>}
                    {video.editingOptions.autoEnhance && <OptionTag>Auto Enhance</OptionTag>}
                    {video.editingOptions.removeBackground && <OptionTag>Background Removal</OptionTag>}
                    {video.editingOptions.addSubtitles && <OptionTag>Subtitles</OptionTag>}
                    {video.editingOptions.stabilization && <OptionTag>Stabilization</OptionTag>}
                  </OptionsList>
                </EditingOptions>
              )}

              <VideoActions>
                {video.status === 'completed' && (
                  <ActionButton 
                    primary 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(video._id);
                    }}
                  >
                    📥 Download
                  </ActionButton>
                )}
                
                {video.status === 'failed' && (
                  <ActionButton onClick={(e) => {
                    e.stopPropagation();
                    alert('Retry functionality coming soon!');
                  }}>
                    🔄 Retry
                  </ActionButton>
                )}
                
                {video.downloadUrl && video.downloadExpiresAt && new Date(video.downloadExpiresAt) > new Date() && (
                  <ExpiryNote>
                    Download expires: {new Date(video.downloadExpiresAt).toLocaleDateString()}
                  </ExpiryNote>
                )}
              </VideoActions>
            </VideoCard>
          ))}
        </VideoGrid>
      )}

      {/* Video Preview Modal */}
      {(() => {
        console.log('Modal render check - showPreviewModal:', showPreviewModal, 'selectedVideo:', selectedVideo);
        return showPreviewModal && selectedVideo;
      })() && (
        <ModalOverlay onClick={closePreviewModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedVideo.title || selectedVideo.originalFilename}</ModalTitle>
              <CloseButton onClick={closePreviewModal}>✕</CloseButton>
            </ModalHeader>
            
            <ModalBody>
              <PreviewContainer>
                {selectedVideo.thumbnailUrl ? (
                  <PreviewImage src={selectedVideo.thumbnailUrl} alt={selectedVideo.title || selectedVideo.originalFilename} />
                ) : selectedVideo.status === 'ready' || selectedVideo.status === 'completed' ? (
                  <>
                    {videoLoading ? (
                      <PreviewPlaceholder>
                        <PlaceholderIcon>⏳</PlaceholderIcon>
                        <PlaceholderText>Loading video...</PlaceholderText>
                      </PreviewPlaceholder>
                    ) : videoBlobUrl ? (
                      <PreviewVideo 
                        controls 
                        src={videoBlobUrl}
                        onError={(e) => {
                          console.error('Error playing preview video:', e.target.error);
                          console.error('Error code:', e.target.error?.code);
                          console.error('Error message:', e.target.error?.message);
                          console.error('Blob URL:', videoBlobUrl);
                          console.error('Video element:', e.target);
                          console.error('Video readyState:', e.target.readyState);
                          console.error('Video networkState:', e.target.networkState);
                          
                          // Show fallback
                          e.target.style.display = 'none';
                          const fallback = e.target.nextSibling;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                        onLoadStart={() => {
                          console.log('Video load started for:', selectedVideo._id);
                          console.log('Using blob URL:', videoBlobUrl);
                        }}
                        onCanPlay={() => {
                          console.log('Video can play');
                        }}
                        onLoadedData={() => {
                          console.log('Video data loaded');
                        }}
                        onLoadedMetadata={() => {
                          console.log('Video metadata loaded');
                        }}
                      />
                    ) : (
                      <PreviewPlaceholder>
                        <PlaceholderIcon>⚠️</PlaceholderIcon>
                        <PlaceholderText>Failed to load video</PlaceholderText>
                      </PreviewPlaceholder>
                    )}
                  </>
                ) : (
                  <PreviewPlaceholder>
                    <PlaceholderIcon>🎬</PlaceholderIcon>
                    <PlaceholderText>
                      {selectedVideo.status === 'processing' ? 'Video is being processed...' : 
                       selectedVideo.status === 'failed' ? 'Video processing failed' :
                       'Video preview not available'}
                    </PlaceholderText>
                  </PreviewPlaceholder>
                )}
                <PreviewPlaceholder style={{ display: 'none' }}>
                  <PlaceholderIcon>⚠️</PlaceholderIcon>
                  <PlaceholderText>Unable to load video preview</PlaceholderText>
                </PreviewPlaceholder>
              </PreviewContainer>
              
              <VideoDetails>
                <DetailRow>
                  <DetailLabel>Status:</DetailLabel>
                  <StatusBadge status={selectedVideo.status}>
                    <StatusIcon>{getStatusIcon(selectedVideo.status)}</StatusIcon>
                    <StatusText color={getStatusColor(selectedVideo.status)}>
                      {selectedVideo.status.charAt(0).toUpperCase() + selectedVideo.status.slice(1)}
                    </StatusText>
                  </StatusBadge>
                </DetailRow>
                
                <DetailRow>
                  <DetailLabel>Uploaded:</DetailLabel>
                  <DetailValue>{new Date(selectedVideo.createdAt).toLocaleDateString()}</DetailValue>
                </DetailRow>
                
                {selectedVideo.metadata?.fileSize && (
                  <DetailRow>
                    <DetailLabel>File Size:</DetailLabel>
                    <DetailValue>{formatFileSize(selectedVideo.metadata.fileSize)}</DetailValue>
                  </DetailRow>
                )}
                
                {selectedVideo.metadata?.duration && (
                  <DetailRow>
                    <DetailLabel>Duration:</DetailLabel>
                    <DetailValue>{formatDuration(selectedVideo.metadata.duration)}</DetailValue>
                  </DetailRow>
                )}
                
                {selectedVideo.metadata?.resolution && (
                  <DetailRow>
                    <DetailLabel>Resolution:</DetailLabel>
                    <DetailValue>{selectedVideo.metadata.resolution}</DetailValue>
                  </DetailRow>
                )}
              </VideoDetails>
            </ModalBody>
            
            <ModalFooter>
              {selectedVideo.status === 'completed' && (
                <ModalActionButton 
                  primary 
                  onClick={() => handleDownload(selectedVideo._id)}
                >
                  📥 Download Video
                </ModalActionButton>
              )}
              <ModalActionButton onClick={closePreviewModal}>
                Close
              </ModalActionButton>
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1200px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #1F2937;
  font-size: 1.8rem;
  margin: 0;
`;

const VideoCount = styled.span`
  color: #6B7280;
  font-size: 0.9rem;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6B7280;
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  background: #FEE2E2;
  color: #DC2626;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1rem;
`;

const RetryButton = styled.button`
  background: #4F46E5;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: #4338CA;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  background: #F9FAFB;
  border-radius: 12px;
  border: 2px dashed #D1D5DB;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const EmptyTitle = styled.h3`
  color: #374151;
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
`;

const EmptyDescription = styled.p`
  color: #6B7280;
  line-height: 1.6;
`;

const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
`;

const VideoCard = styled.div`
  background: white;
  border: 1px solid #E5E7EB;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const VideoThumbnail = styled.div`
  position: relative;
  width: 100%;
  height: 200px;
  margin-bottom: 1rem;
  border-radius: 8px;
  overflow: hidden;
  background: #F3F4F6;
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const PlayIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 0.5rem;
`;

const ThumbnailText = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
`;

const ThumbnailOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;

  ${VideoCard}:hover & {
    opacity: 1;
  }
`;

const PlayButton = styled.div`
  font-size: 3rem;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const VideoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const VideoTitle = styled.h3`
  color: #1F2937;
  font-size: 1.1rem;
  margin: 0;
  flex: 1;
  margin-right: 1rem;
  word-break: break-word;
`;

const StatusBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  border-radius: 20px;
  background: ${props => props.status === 'completed' ? '#D1FAE5' : 
                      props.status === 'processing' ? '#FEF3C7' : 
                      props.status === 'failed' ? '#FEE2E2' : '#F3F4F6'};
  font-size: 0.8rem;
`;

const StatusIcon = styled.span`
  font-size: 0.9rem;
`;

const StatusText = styled.span`
  color: ${props => props.color};
  font-weight: 500;
`;

const VideoInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const InfoLabel = styled.span`
  color: #6B7280;
  font-size: 0.9rem;
`;

const InfoValue = styled.span`
  color: #374151;
  font-size: 0.9rem;
  font-weight: 500;
`;

const ProgressContainer = styled.div`
  margin-bottom: 1rem;
`;

const ProgressLabel = styled.div`
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: #E5E7EB;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #4F46E5;
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
`;

const EditingOptions = styled.div`
  margin-bottom: 1rem;
`;

const OptionsTitle = styled.div`
  color: #374151;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const OptionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const OptionTag = styled.span`
  background: #EEF2FF;
  color: #4F46E5;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
`;

const VideoActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  background: ${props => props.primary ? '#4F46E5' : '#6B7280'};
  color: white;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.primary ? '#4338CA' : '#4B5563'};
    transform: translateY(-1px);
  }
`;

const ExpiryNote = styled.div`
  color: #F59E0B;
  font-size: 0.8rem;
  text-align: center;
  margin-top: 0.5rem;
`;

// Modal Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #E5E7EB;
`;

const ModalTitle = styled.h2`
  color: #1F2937;
  font-size: 1.5rem;
  margin: 0;
  flex: 1;
  margin-right: 1rem;
  word-break: break-word;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6B7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: #F3F4F6;
    color: #374151;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const PreviewContainer = styled.div`
  width: 100%;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  background: #F3F4F6;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PreviewVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PreviewPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6B7280;
`;

const PlaceholderIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const PlaceholderText = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
`;

const VideoDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #F3F4F6;

  &:last-child {
    border-bottom: none;
  }
`;

const DetailLabel = styled.span`
  color: #6B7280;
  font-size: 0.9rem;
  font-weight: 500;
`;

const DetailValue = styled.span`
  color: #374151;
  font-size: 0.9rem;
  font-weight: 600;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #E5E7EB;
`;

const ModalActionButton = styled.button`
  background: ${props => props.primary ? '#4F46E5' : '#F3F4F6'};
  color: ${props => props.primary ? 'white' : '#374151'};
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.primary ? '#4338CA' : '#E5E7EB'};
    transform: translateY(-1px);
  }
`;

export default VideoList;