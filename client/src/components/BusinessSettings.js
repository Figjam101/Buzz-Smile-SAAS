import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import ChangePasswordForm from './ChangePasswordForm';

const BusinessSettings = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    businessDescription: '',
    socialMedia: {
      instagram: '',
      tiktok: '',
      youtube: '',
      twitter: '',
      facebook: ''
    },
    preferences: {
      videoQuality: '1080p',
      defaultFormat: 'mp4'
    }
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        businessName: user.businessName || '',
        businessDescription: user.businessDescription || '',
        socialMedia: {
          instagram: user.socialMedia?.instagram || '',
          tiktok: user.socialMedia?.tiktok || '',
          youtube: user.socialMedia?.youtube || '',
          twitter: user.socialMedia?.twitter || '',
          facebook: user.socialMedia?.facebook || ''
        },
        preferences: {
          videoQuality: user.preferences?.videoQuality || '1080p',
          defaultFormat: user.preferences?.defaultFormat || 'mp4'
        }
      });
      
      // Set logo preview if user has a logo
      if (user.logo) {
        setLogoPreview(`${process.env.REACT_APP_API_URL}${user.logo}`);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('socialMedia.')) {
      const platform = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        socialMedia: {
          ...prev.socialMedia,
          [platform]: value
        }
      }));
    } else if (name.startsWith('preferences.')) {
      const preference = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          [preference]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let logoUrl = null;
      
      // Upload logo first if a new one was selected
      if (logoFile) {
        logoUrl = await uploadLogo();
      }

      // Update profile
      const profileData = {
        businessName: formData.businessName,
        businessDescription: formData.businessDescription,
        socialMedia: formData.socialMedia
      };
      
      // Include logo URL if uploaded
      if (logoUrl) {
        profileData.logo = logoUrl;
      }

      const profileResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileData)
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      // Update preferences
      const preferencesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/users/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData.preferences)
      });

      if (!preferencesResponse.ok) {
        const errorData = await preferencesResponse.json();
        throw new Error(errorData.message || 'Failed to update preferences');
      }

      const updatedUser = await profileResponse.json();
      updateUser(updatedUser.user);
      
      // Clear logo file after successful upload
      setLogoFile(null);
      
      setSuccess('Settings updated successfully!');
    } catch (error) {
      console.error('Settings update error:', error);
      setError(error.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSuccess = (message) => {
    setPasswordSuccess(message);
    setPasswordError('');
    // Clear success message after 5 seconds
    setTimeout(() => setPasswordSuccess(''), 5000);
  };

  const handlePasswordError = (message) => {
    setPasswordError(message);
    setPasswordSuccess('');
  };

  const handleLogoChange = (e) => {
    console.log('handleLogoChange triggered', e.target.files);
    const file = e.target.files[0];
    if (file) {
      console.log('File selected:', file.name, file.type, file.size);
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      // Validate file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        setError('Logo file size must be less than 20MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      
      setError('');
    } else {
      console.log('No file selected');
    }
  };

  const handleLogoClick = () => {
    console.log('Logo upload area clicked');
    const fileInput = document.getElementById('logo');
    if (fileInput) {
      fileInput.click();
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;

    const logoFormData = new FormData();
    logoFormData.append('logo', logoFile);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/uploads/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: logoFormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload logo');
      }

      const data = await response.json();
      return data.logoUrl;
    } catch (error) {
      console.error('Logo upload error:', error);
      throw error;
    }
  };

  return (
    <SettingsContainer>
      <Title>Account Settings</Title>
      <Subtitle>Manage your profile information and platform accounts</Subtitle>

      <Form onSubmit={handleSubmit}>
        <Section>
          <SectionTitle>Profile Information</SectionTitle>
          
          <FormGroup>
            <Label>Organization Logo</Label>
            <LogoUploadContainer>
              <LogoUploadInput
                type="file"
                id="logo"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <LogoUploadLabel htmlFor="logo" onClick={handleLogoClick}>
                {logoPreview ? (
                  <LogoPreview>
                    <LogoPreviewImage src={logoPreview} alt="Logo preview" />
                    <LogoUploadText>Click to change logo</LogoUploadText>
                  </LogoPreview>
                ) : (
                  <LogoUploadPlaceholder>
                    <LogoUploadIcon>📷</LogoUploadIcon>
                    <LogoUploadText>Upload Logo</LogoUploadText>
                    <LogoUploadSubtext>PNG, JPG, GIF up to 20MB</LogoUploadSubtext>
                  </LogoUploadPlaceholder>
                )}
              </LogoUploadLabel>
            </LogoUploadContainer>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="businessName">Organization Name</Label>
            <Input
              type="text"
              id="businessName"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Enter your organization name"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="businessDescription">Organization Description</Label>
            <TextArea
              id="businessDescription"
              name="businessDescription"
              value={formData.businessDescription}
              onChange={handleChange}
              placeholder="Describe your organization and content goals"
              rows={4}
            />
          </FormGroup>
        </Section>

        <Section>
          <SectionTitle>Platform Accounts</SectionTitle>
          <SectionDescription>
            Connect your platform accounts to optimize content for each channel
          </SectionDescription>

          <SocialGrid>
            <FormGroup>
              <Label htmlFor="instagram">
                📷 Instagram
              </Label>
              <Input
                type="text"
                id="instagram"
                name="socialMedia.instagram"
                value={formData.socialMedia.instagram}
                onChange={handleChange}
                placeholder="@username"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="tiktok">
                🎵 TikTok
              </Label>
              <Input
                type="text"
                id="tiktok"
                name="socialMedia.tiktok"
                value={formData.socialMedia.tiktok}
                onChange={handleChange}
                placeholder="@username"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="youtube">
                📺 YouTube
              </Label>
              <Input
                type="text"
                id="youtube"
                name="socialMedia.youtube"
                value={formData.socialMedia.youtube}
                onChange={handleChange}
                placeholder="Channel name or @handle"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="twitter">
                🐦 Twitter/X
              </Label>
              <Input
                type="text"
                id="twitter"
                name="socialMedia.twitter"
                value={formData.socialMedia.twitter}
                onChange={handleChange}
                placeholder="@username"
              />
            </FormGroup>

            <FormGroup>
              <Label htmlFor="facebook">
                📘 Facebook
              </Label>
              <Input
                type="text"
                id="facebook"
                name="socialMedia.facebook"
                value={formData.socialMedia.facebook}
                onChange={handleChange}
                placeholder="Page name or username"
              />
            </FormGroup>
          </SocialGrid>
        </Section>

        <Section>
          <SectionTitle>Content Preferences</SectionTitle>
          
          <PreferencesGrid>
            <FormGroup>
              <Label htmlFor="videoQuality">Default Quality</Label>
              <Select
                id="videoQuality"
                name="preferences.videoQuality"
                value={formData.preferences.videoQuality}
                onChange={handleChange}
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
                <option value="4K">4K Ultra HD</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <Label htmlFor="defaultFormat">Default Format</Label>
              <Select
                id="defaultFormat"
                name="preferences.defaultFormat"
                value={formData.preferences.defaultFormat}
                onChange={handleChange}
              >
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
                <option value="avi">AVI</option>
              </Select>
            </FormGroup>
          </PreferencesGrid>
        </Section>

        {/* Top notification message */}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {success && <SuccessMessage>{success}</SuccessMessage>}

        <SubmitButton type="submit" disabled={!!loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </SubmitButton>
      </Form>

      {/* Change Password Section */}
      <Section style={{ marginTop: '2rem' }}>
        <SectionTitle>Change Password</SectionTitle>
        <SectionDescription>
          Update your account password for enhanced security
        </SectionDescription>
        
        {passwordError && <ErrorMessage>{passwordError}</ErrorMessage>}
        {passwordSuccess && <SuccessMessage>{passwordSuccess}</SuccessMessage>}
        
        <ChangePasswordForm 
          onSuccess={handlePasswordSuccess}
          onError={handlePasswordError}
        />
      </Section>
    </SettingsContainer>
  );
};

// Styled Components
const SettingsContainer = styled.div`
  max-width: 800px;
`;

const Title = styled.h2`
  color: #1F2937;
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #6B7280;
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Section = styled.div`
  background: #F9FAFB;
  border-radius: 8px;
  padding: 1.5rem;
`;

const SectionTitle = styled.h3`
  color: #374151;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
`;

const SectionDescription = styled.p`
  color: #6B7280;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  color: #374151;
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4F46E5;
  }

  &::placeholder {
    color: #9CA3AF;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4F46E5;
  }

  &::placeholder {
    color: #9CA3AF;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #4F46E5;
  }
`;

const SocialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
`;

const PreferencesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const SubmitButton = styled.button`
  background: #4F46E5;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: #4338CA;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #FEE2E2;
  color: #DC2626;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
`;

const SuccessMessage = styled.div`
  background: #D1FAE5;
  color: #065F46;
  padding: 0.75rem;
  border-radius: 8px;
  text-align: center;
`;

// Logo Upload Styled Components
const LogoUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
`;

const LogoUploadInput = styled.input`
  display: none;
`;

const LogoUploadLabel = styled.label`
  cursor: pointer;
  display: block;
  width: 150px;
  height: 150px;
  border: 2px dashed #E5E7EB;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    border-color: #4F46E5;
    background-color: #F8FAFC;
  }
`;

const LogoUploadPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  text-align: center;
`;

const LogoUploadIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 0.5rem;
`;

const LogoUploadText = styled.div`
  color: #374151;
  font-weight: 500;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`;

const LogoUploadSubtext = styled.div`
  color: #6B7280;
  font-size: 0.75rem;
`;

const LogoPreview = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #F9FAFB;
`;

const LogoPreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
`;

export default BusinessSettings;