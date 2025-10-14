import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import uploadDebugger from '../utils/uploadDebugger';

const VideoUpload = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    // Start debugging session
    uploadDebugger.startUpload(file);
    
    // Check prerequisites
    const prerequisites = uploadDebugger.checkPrerequisites();
    if (!prerequisites.token) {
      const errorMsg = 'No authentication token found. Please log in again.';
      setError(errorMsg);
      uploadDebugger.logError(new Error(errorMsg), 'authentication');
      return;
    }

    // Reset states
    setError('');
    setSuccess('');
    setUploadProgress(0);

    // Validate file
    const validation = uploadDebugger.validateFile(file);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      uploadDebugger.log('warning', 'File validation warnings', validation.warnings);
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
          uploadDebugger.logProgress(e.loaded, e.total);
        }
      });

      // Handle response
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          const responseTime = Date.now() - startTime;
          uploadDebugger.logNetworkResponse(xhr.status, xhr.statusText, xhr.responseText, responseTime);
          
          if (xhr.status === 201) {
            // Parse success response to get the actual message
            let successMessage = 'Video uploaded successfully!';
            try {
              const successResponse = JSON.parse(xhr.responseText);
              successMessage = successResponse.message || successMessage;
            } catch (e) {
              // Use default message if parsing fails
            }
            
            setSuccess(successMessage);
            setUploadProgress(100);
            
            // Reset form
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            
            // Notify parent component
            if (onUploadSuccess) {
              onUploadSuccess();
            }
            
            uploadDebugger.log('success', 'Upload completed successfully');
            resolve();
          } else {
            let errorMessage = 'Upload failed';
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.message || errorMessage;
              uploadDebugger.log('error', 'Server returned error response', errorResponse);
            } catch (e) {
              uploadDebugger.log('error', 'Failed to parse error response', { responseText: xhr.responseText });
            }
            setError(errorMessage);
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener('error', () => {
          const errorMsg = 'Upload failed. Please check your connection and try again.';
          setError(errorMsg);
          uploadDebugger.logError(new Error(errorMsg), 'network');
          reject(new Error('Upload failed'));
        });

        xhr.addEventListener('timeout', () => {
          const errorMsg = 'Upload timed out. Please try again.';
          setError(errorMsg);
          uploadDebugger.logError(new Error(errorMsg), 'timeout');
          reject(new Error('Upload timed out'));
        });
      });

      // Send request with corrected server URL
      xhr.timeout = 300000; // 5 minutes timeout
      const serverUrl = 'http://localhost:5000'; // Fixed: Use correct server port
      const uploadUrl = `${serverUrl}/api/videos/upload`;
      
      uploadDebugger.logNetworkRequest('POST', uploadUrl, {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }, formData);
      
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);

      await uploadPromise;

    } catch (error) {
      console.error('Upload error:', error);
      uploadDebugger.logError(error, 'general');
      
      // Only show error if it's not a success case
      if (!error.message.includes('Upload failed') && !error.message.includes('timed out')) {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setUploading(false);
      // Generate debug report
      uploadDebugger.generateReport();
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <UploadContainer>
      <Title>Upload Your Video</Title>
      <Subtitle>
        Upload your raw video and let our AI-powered editing transform it for social media
      </Subtitle>

      <UploadArea
        dragActive={dragActive}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <UploadingState>
            <UploadIcon>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 8L32 16H28V28H20V16H16L24 8Z"
                  fill="#4F46E5"
                />
                <path
                  d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32"
                  stroke="#4F46E5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </UploadIcon>
            <UploadText>Uploading video...</UploadText>
            <ProgressBar>
              <ProgressFill progress={uploadProgress} />
            </ProgressBar>
            <ProgressText>{uploadProgress}%</ProgressText>
          </UploadingState>
        ) : (
          <UploadPrompt>
            <UploadIcon>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path
                  d="M24 8L32 16H28V28H20V16H16L24 8Z"
                  fill="#4F46E5"
                />
                <path
                  d="M8 32V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V32"
                  stroke="#4F46E5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </UploadIcon>
            <UploadText>
              <strong>Click to upload</strong> or drag and drop
            </UploadText>
            <UploadSubtext>
              MP4, MOV, AVI up to 1GB
            </UploadSubtext>
          </UploadPrompt>
        )}
      </UploadArea>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <UploadInfo>
        <InfoTitle>What happens next?</InfoTitle>
        <InfoList>
          <InfoItem>🎬 Your video will be uploaded to our servers</InfoItem>
          <InfoItem>⚡ Processing will begin automatically</InfoItem>
          <InfoItem>📱 Video will be optimized for social media</InfoItem>
          <InfoItem>📥 Download your edited video when ready</InfoItem>
        </InfoList>
      </UploadInfo>
    </UploadContainer>
  );
};

// Styled Components
const UploadContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h2`
  color: #1F2937;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const Subtitle = styled.p`
  color: #6B7280;
  text-align: center;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const UploadArea = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'dragActive',
})`
  border: 2px dashed ${props => props.dragActive ? '#4F46E5' : '#D1D5DB'};
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.dragActive ? '#F0F9FF' : '#FAFAFA'};
  margin-bottom: 1rem;

  &:hover {
    border-color: #4F46E5;
    background: #F0F9FF;
  }
`;

const UploadPrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const UploadIcon = styled.div`
  margin-bottom: 0.5rem;
`;

const UploadText = styled.p`
  color: #374151;
  font-size: 1.1rem;
  margin: 0;
`;

const UploadSubtext = styled.p`
  color: #6B7280;
  font-size: 0.9rem;
  margin: 0;
`;

const UploadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  max-width: 300px;
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

const ProgressText = styled.p`
  color: #374151;
  font-weight: 600;
  margin: 0;
`;

const ErrorMessage = styled.div`
  background: #FEE2E2;
  color: #DC2626;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
`;

const SuccessMessage = styled.div`
  background: #D1FAE5;
  color: #065F46;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
`;

const UploadInfo = styled.div`
  background: #F9FAFB;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
`;

const InfoTitle = styled.h3`
  color: #374151;
  font-size: 1.1rem;
  margin-bottom: 1rem;
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const InfoItem = styled.li`
  color: #6B7280;
  margin-bottom: 0.5rem;
  padding-left: 0.5rem;
`;

export default VideoUpload;