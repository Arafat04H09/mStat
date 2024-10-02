import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import InsightsPage from "./pages/InsightsPage";
import LogInPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import DashBoardPage from "./pages/DashBoardPage";
import './index.css';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./config/firebase";
import { Navbar } from "./components/Navbar";

const App = () => {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path = "/" element = {<HomePage />}/>
          <Route path = "/insights" element = {<InsightsPage/>}/>
          <Route path = "/signup" element = {<SignUpPage/>}/>
          {user ? ( 
            <Route path="/dashboard" element={<DashBoardPage />} />
          ) : (
            <Route path="/login" element={<LogInPage />} />
          )}
        </Routes>
      </div>
    </Router>
  );
};

export default App;