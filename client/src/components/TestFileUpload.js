import React, { useRef } from 'react';
import styled from 'styled-components';

const TestFileUpload = () => {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    console.log('Test click handler called');
    console.log('fileInputRef.current:', fileInputRef.current);
    
    if (fileInputRef.current) {
      console.log('Clicking file input...');
      fileInputRef.current.click();
    } else {
      console.log('File input ref is null');
    }
  };

  const handleFileChange = (e) => {
    console.log('File selected:', e.target.files);
    if (e.target.files.length > 0) {
      alert(`Selected file: ${e.target.files[0].name}`);
    }
  };

  return (
    <Container>
      <h2>File Upload Test</h2>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <TestButton onClick={handleClick}>
        Click to Test File Dialog
      </TestButton>
      <p>Check browser console for debug logs</p>
    </Container>
  );
};

const Container = styled.div`
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 2px solid #e1e8ff;
  border-radius: 12px;
  text-align: center;
`;

const TestButton = styled.button`
  background: #4F46E5;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  margin: 1rem 0;
  
  &:hover {
    background: #4338CA;
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

export default TestFileUpload;