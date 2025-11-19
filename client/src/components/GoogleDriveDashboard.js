import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const GoogleDriveDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <DashboardContainer>
        <LoadingSpinner>
          <div>Loading your Google Drive statistics...</div>
        </LoadingSpinner>
      </DashboardContainer>
    );
  }

  if (error) {
    return (
      <DashboardContainer>
        <ErrorMessage>
          <h3>⚠️ Error Loading Statistics</h3>
          <p>{error}</p>
          <RetryButton onClick={fetchDashboardStats}>
            🔄 Retry
          </RetryButton>
        </ErrorMessage>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <Title>☁️ Google Drive Dashboard</Title>
        <Subtitle>Monitor your video backups and storage usage</Subtitle>
      </Header>

      {/* User Info Section */}
      <Section>
        <SectionTitle>👤 Account Information</SectionTitle>
        <InfoGrid>
          <InfoCard>
            <InfoLabel>Email</InfoLabel>
            <InfoValue>{stats?.user?.email}</InfoValue>
          </InfoCard>
          <InfoCard>
            <InfoLabel>Plan</InfoLabel>
            <InfoValue className={stats?.user?.plan === 'god' ? 'god-plan' : ''}>
              {stats?.user?.plan?.toUpperCase()}
              {stats?.user?.plan === 'god' && ' ⚡'}
            </InfoValue>
          </InfoCard>
          <InfoCard>
            <InfoLabel>Videos Processed</InfoLabel>
            <InfoValue>
              {stats?.user?.videosProcessed}/{stats?.user?.monthlyLimit}
              {stats?.user?.plan === 'god' && ' (Unlimited)'}
            </InfoValue>
          </InfoCard>
        </InfoGrid>
      </Section>

      {/* Video Statistics */}
      <Section>
        <SectionTitle>🎬 Video Statistics</SectionTitle>
        <StatsGrid>
          <StatCard>
            <StatIcon>📹</StatIcon>
            <StatNumber>{stats?.videos?.total || 0}</StatNumber>
            <StatLabel>Total Videos</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>📤</StatIcon>
            <StatNumber>{stats?.videos?.rawBackups || 0}</StatNumber>
            <StatLabel>Raw Videos Backed Up</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>✨</StatIcon>
            <StatNumber>{stats?.videos?.processedBackups || 0}</StatNumber>
            <StatLabel>Processed Videos Backed Up</StatLabel>
          </StatCard>
          <StatCard>
            <StatIcon>💾</StatIcon>
            <StatNumber>{formatBytes(stats?.videos?.storageUsed)}</StatNumber>
            <StatLabel>Storage Used</StatLabel>
          </StatCard>
        </StatsGrid>
      </Section>

      {/* Google Drive Connection Status */}
      <Section>
        <SectionTitle>🔗 Google Drive Connection</SectionTitle>
        <ConnectionStatus connected={stats?.googleDrive?.connected}>
          <ConnectionIcon>
            {stats?.googleDrive?.connected ? '✅' : '❌'}
          </ConnectionIcon>
          <ConnectionText>
            {stats?.googleDrive?.connected ? 'Connected' : 'Not Connected'}
          </ConnectionText>
          {stats?.googleDrive?.folderId && (
            <FolderId>Folder ID: {stats.googleDrive.folderId}</FolderId>
          )}
        </ConnectionStatus>
      </Section>

      {/* Recent Videos */}
      {stats?.videos?.recent && stats.videos.recent.length > 0 && (
        <Section>
          <SectionTitle>🕒 Recent Videos</SectionTitle>
          <VideoList>
            {stats.videos.recent.map((video, index) => (
              <VideoItem key={video._id || index}>
                <VideoInfo>
                  <VideoName>{video.originalFileName}</VideoName>
                  <VideoDate>{formatDate(video.createdAt)}</VideoDate>
                </VideoInfo>
                <VideoStatus>
                  <StatusBadge status={video.status}>
                    {video.status}
                  </StatusBadge>
                  <BackupStatus>
                    {video.googleDriveRawFileId && <BackupIcon title="Raw backup available">📤</BackupIcon>}
                    {video.googleDriveProcessedFileId && <BackupIcon title="Processed backup available">✨</BackupIcon>}
                  </BackupStatus>
                </VideoStatus>
              </VideoItem>
            ))}
          </VideoList>
        </Section>
      )}

      <RefreshButton onClick={fetchDashboardStats}>
        🔄 Refresh Statistics
      </RefreshButton>
    </DashboardContainer>
  );
};

// Styled Components
const DashboardContainer = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #fff;
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: rgba(255,255,255,0.7);
  font-size: 1rem;
`;

const Section = styled.div`
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(255,255,255,0.1);
`;

const SectionTitle = styled.h2`
  color: #fff;
  font-size: 1.3rem;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const InfoCard = styled.div`
  background: rgba(255,255,255,0.05);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
`;

const InfoLabel = styled.div`
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
`;

const InfoValue = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 1.1rem;
  
  &.god-plan {
    background: linear-gradient(45deg, #FFD700, #FFA500);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 700;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatCard = styled.div`
  background: rgba(255,255,255,0.05);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const StatIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const StatNumber = styled.div`
  color: #fff;
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
`;

const ConnectionStatus = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'connected',
})`
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255,255,255,0.05);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
`;

const ConnectionIcon = styled.div`
  font-size: 1.5rem;
`;

const ConnectionText = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 1.1rem;
`;

const FolderId = styled.div`
  color: rgba(255,255,255,0.8);
  font-size: 0.9rem;
  font-family: monospace;
  background: rgba(255,255,255,0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
`;

const VideoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const VideoItem = styled.div`
  background: rgba(255,255,255,0.05);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const VideoInfo = styled.div`
  flex: 1;
`;

const VideoName = styled.div`
  color: #fff;
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const VideoDate = styled.div`
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
`;

const VideoStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  text-transform: capitalize;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return 'background: rgba(16,185,129,0.15); color: #86efac;';
      case 'processing':
        return 'background: rgba(245,158,11,0.15); color: #fde68a;';
      case 'failed':
        return 'background: rgba(239,68,68,0.15); color: #fca5a5;';
      default:
        return 'background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);';
    }
  }}
`;

const BackupStatus = styled.div`
  display: flex;
  gap: 0.25rem;
`;

const BackupIcon = styled.span`
  font-size: 1.2rem;
  cursor: help;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: rgba(255,255,255,0.7);
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  background: rgba(239,68,68,0.1);
  border-radius: 12px;
  border: 1px solid rgba(239,68,68,0.3);
  
  h3 {
    color: #fca5a5;
    margin-bottom: 0.5rem;
  }
  
  p {
    color: #f87171;
    margin-bottom: 1rem;
  }
`;

const RetryButton = styled.button`
  background: #EF4444;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: #DC2626;
  }
`;

const RefreshButton = styled.button`
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 25px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;
  width: 100%;
  margin-top: 1rem;

  &:hover {
    background: #4338CA;
  }
`;

export default GoogleDriveDashboard;