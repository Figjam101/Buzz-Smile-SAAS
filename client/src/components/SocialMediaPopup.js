import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const SocialMediaPopup = ({ isOpen, onClose, socialMedia, onSave }) => {
  const [formData, setFormData] = useState({
    instagram: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    facebook: ''
  });

  useEffect(() => {
    if (socialMedia) {
      setFormData({
        instagram: socialMedia.instagram || '',
        tiktok: socialMedia.tiktok || '',
        youtube: socialMedia.youtube || '',
        twitter: socialMedia.twitter || '',
        facebook: socialMedia.facebook || ''
      });
    }
  }, [socialMedia]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <PopupContainer onClick={(e) => e.stopPropagation()}>
        <PopupHeader>
          <Title>Update Social Media Links</Title>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </PopupHeader>
        
        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              type="url"
              id="instagram"
              name="instagram"
              value={formData.instagram}
              onChange={handleChange}
              placeholder="https://instagram.com/username"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              type="url"
              id="tiktok"
              name="tiktok"
              value={formData.tiktok}
              onChange={handleChange}
              placeholder="https://tiktok.com/@username"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="youtube">YouTube</Label>
            <Input
              type="url"
              id="youtube"
              name="youtube"
              value={formData.youtube}
              onChange={handleChange}
              placeholder="https://youtube.com/@username"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="twitter">Twitter/X</Label>
            <Input
              type="url"
              id="twitter"
              name="twitter"
              value={formData.twitter}
              onChange={handleChange}
              placeholder="https://twitter.com/username"
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              type="url"
              id="facebook"
              name="facebook"
              value={formData.facebook}
              onChange={handleChange}
              placeholder="https://facebook.com/username"
            />
          </FormGroup>

          <ButtonGroup>
            <CancelButton type="button" onClick={onClose}>
              Cancel
            </CancelButton>
            <SaveButton type="submit">
              Save Changes
            </SaveButton>
          </ButtonGroup>
        </Form>
      </PopupContainer>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const PopupContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const PopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #1F2937;
  font-size: 1.5rem;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 2rem;
  color: #6B7280;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;

  &:hover {
    background: #F3F4F6;
    color: #374151;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
`;

const CancelButton = styled.button`
  background: #F3F4F6;
  color: #374151;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #E5E7EB;
  }
`;

const SaveButton = styled.button`
  background: #4F46E5;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #4338CA;
    transform: translateY(-1px);
  }
`;

export default SocialMediaPopup;