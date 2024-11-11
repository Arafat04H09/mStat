import { useEffect, useState } from 'react';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import FileUpload from '../components/FileUpload';

function DashboardPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchInsights();
    }
  }, [user, navigate]);

  const fetchInsights = async () => {
    try {
      const response = await fetch(`http://localhost:8080/get-insights/${user.email}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else if (response.status === 404) {
        setInsights(null);
      } else {
        throw new Error('Failed to fetch insights');
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInsights = () => {
    navigate("/insights", { state: { insights } });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null; 
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
      {insights ? (
        <div>
          <p>You have existing data on file.</p>
          <button onClick={handleViewInsights}>View Insights</button>
          <p>Or upload new data:</p>
          <FileUpload onUploadComplete={fetchInsights} />
        </div>
      ) : (
        <div>
          <p>No insights found. Please upload your data.</p>
          <FileUpload onUploadComplete={fetchInsights} />
        </div>
      )}
    </div>
  );
}

export default DashboardPage;