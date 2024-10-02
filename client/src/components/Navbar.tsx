import React from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase'; 

export const Navbar = () => {
  const [user] = useAuthState(auth); 
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user) {
      // Log out the user
      auth.signOut().then(() => {
        // Redirect to home after logout
        navigate('/');
      }).catch((error) => {
        console.error("Error logging out:", error);
      });
    } else {
      navigate('/login'); 
    }
  };

  return (
    <nav className="bg-gray-800 p-4 shadow-md"> 
      <div className="container mx-auto flex items-center justify-between"> 
        <Link to="/" className="text-white font-bold text-xl"> 
          mStat
        </Link>
        <button 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleProfileClick}
        >
          {user ? 'Logout' : 'Login'} 
        </button>
      </div>
    </nav>
  );
};