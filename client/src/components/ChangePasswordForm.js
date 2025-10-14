import React, { useState } from 'react';
import styled from 'styled-components';

const ChangePasswordForm = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      onError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      onError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess('Password changed successfully');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        onError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      onError('An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <FormGroup>
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          type="password"
          id="currentPassword"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange}
          required
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          type="password"
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          required
          minLength={6}
        />
      </FormGroup>

      <FormGroup>
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          minLength={6}
        />
      </FormGroup>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? 'Changing Password...' : 'Change Password'}
      </SubmitButton>
    </Form>
  );
};

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

export default ChangePasswordForm;