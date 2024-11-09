import React, { useState, useEffect } from 'react';
import { auth } from '../config/firebase';

const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [tableId, setTableId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isSessionLoading, setIsSessionLoading] = useState<boolean>(true);
  const [insights, setInsights] = useState<any | null>(null);

  useEffect(() => {
    const storedTableId = localStorage.getItem('tableId');
    if (storedTableId) {
      setTableId(storedTableId);
      setIsSessionLoading(false);
    } else {
      startSession();
    }
  }, []);

  const startSession = async () => {
    setIsSessionLoading(true);
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      setError('User not logged in');
      setIsSessionLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/start-session?email=${user.email}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setTableId(data.tableId);
      localStorage.setItem('tableId', data.tableId);
      setSuccess('Session started successfully');
    } catch (error) {
      console.error('Error starting session:', error);
      setError(`Error starting session: ${(error as Error).message}`);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
      setError(null);
      setSuccess(null);
      setProgress(0);
      setInsights(null);
    }
  };

  const uploadFile = async (file: File, index: number) => {
    const user = auth.currentUser;
    if (!user || !tableId) throw new Error('User not logged in or session not started');

    const formData = new FormData();
    const renamedFile = new File([file], `${user.email}-data-upload-${index + 1}.json`, { type: file.type });
    formData.append('files', renamedFile);

    const response = await fetch(`http://localhost:8080/upload?tableId=${tableId}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error uploading file ${index + 1}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const finishSession = async () => {
    if (!tableId) throw new Error('Session not started');

    const response = await fetch(`http://localhost:8080/finish-session?tableId=${tableId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Error finishing session: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    if (!tableId) {
      setError('Session not started. Please try again.');
      return;
    }

    setError(null);
    setSuccess(null);
    setProgress(0);
    setInsights(null);

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i], i);
        setProgress(((i + 1) / files.length) * 100);
        setSuccess(`Uploaded ${i + 1} of ${files.length} files`);
      }

      const result = await finishSession();
      setInsights(result.insights);
      setSuccess('All files uploaded successfully. Insights retrieved.');
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Error: ${(error as Error).message}`);
    } finally {
      setTableId(null);
      localStorage.removeItem('tableId');
    }
  };

  if (isSessionLoading) {
    return <p>Initializing session...</p>;
  }

  return (
    <div>
      {!tableId ? (
        <button onClick={startSession}>Start New Session</button>
      ) : (
        <>
          <input type="file" multiple onChange={handleFileChange} />
          <button onClick={handleUpload}>Upload</button>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          {success && <div style={{ color: 'green' }}>{success}</div>}
          {progress > 0 && <progress value={progress} max="100" />}
          {insights && (
            <div>
              <h3>Insights:</h3>
              <pre>{JSON.stringify(insights, null, 2)}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FileUpload;