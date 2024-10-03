import React, { useState } from 'react';
import { auth } from '../config/firebase';

const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles)); // Convert FileList to array
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setError('You must be logged in to upload files.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file); // Append each file
    });

    try {
      const response = await fetch(`http://localhost:8080/upload?email=${user.email}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error uploading files');
      }

      const data = await response.json();
      setSuccess(data.message);
      setError(null);
    } catch (error) {
      setError('Error uploading files: ' + error);
      setSuccess(null);
    }
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>{success}</div>}
    </div>
  );
};

export default FileUpload;
