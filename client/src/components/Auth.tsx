import { useState } from "react";
import { auth, googleProvider } from "../config/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut } from "@firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true); 
  const [error, setError] = useState<string | null>(null); 
  const navigate = useNavigate();
  const [user] = useAuthState(auth);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
    } else if (name === "password") {
      setPassword(value);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setError(null);

    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate("/dashboard");
    } catch (error: any) {
      setError(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4">
          {isLoginMode ? "Login" : "Sign Up"}
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>} {/* Display error messages */}
        <form onSubmit={handleSignIn}>
          <input
            className="w-full px-4 py-2 mb-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Email..."
            type="email"
            name="email"
            value={email}
            onChange={handleInputChange}
            required
          />
          <input
            className="w-full px-4 py-2 mb-2 border rounded focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Password..."
            type="password"
            name="password"
            value={password}
            onChange={handleInputChange}
            required
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
          >
            {isLoginMode ? "Login" : "Sign Up"}
          </button>
        </form>
        <button
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mt-2 focus:outline-none focus:shadow-outline"
          onClick={signInWithGoogle}
        >
          Sign In with Google
        </button>
        <p className="mt-4 text-sm text-gray-600">
          {isLoginMode ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            className="text-blue-500 cursor-pointer hover:underline"
            onClick={() => {
                setIsLoginMode(!isLoginMode); // Toggle the mode first
              
                if (!isLoginMode) { // Now check if in signup mode
                  navigate('/signup'); 
                }
              }}
          >
            {isLoginMode ? "Sign up" : "Log in"}
          </span>
        </p>
        {user && (
          <button
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
            onClick={logOut}
          >
            Logout
          </button>
        )}
      </div>
    </div>
  );
};
