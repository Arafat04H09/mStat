import React from 'react';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import FileUpload from '../components/FileUpload';


function InsightsPage() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();

  if (!user) {
    navigate("/login");
  }

  return (
    <div>
      <FileUpload />
    </div>
  )
}

export default InsightsPage
