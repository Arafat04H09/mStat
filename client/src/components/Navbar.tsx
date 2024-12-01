import { Link, useNavigate } from "react-router-dom";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase'; 
import logo from '../assets/logo.png';

export const Navbar = () => {
  const [user] = useAuthState(auth); 
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user) {
      auth.signOut().then(() => {
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
          <img src={logo} alt="mStat" className="w-10 h-10" />
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