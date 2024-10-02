import React, { useState } from 'react';

const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<FileList | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(event.target.files);
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!files) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch('http://localhost:8080/upload', { 
        method: 'POST',
        body: formData,
      });
      const data = await response.text();
      console.log(data); 
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  return (
    <div>
      <h2>Upload Files</h2>
      <form onSubmit={handleUpload}>
        <input type="file" onChange={handleFileChange} multiple />
        <button type="submit">Upload</button>
      </form>
    </div>
  );
};

export default FileUpload;
