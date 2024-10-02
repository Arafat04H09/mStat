import { useState } from "react";
import { auth, googleProvider } from "../config/firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "@firebase/auth";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      setEmail(value);
    } else if (name === "password") {
      setPassword(value);
    }
  };

  const goToSignUp = () => {
    navigate('/signup');
  };


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
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


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
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
            Login
          </button>
        </form>
        <button
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mt-2 focus:outline-none focus:shadow-outline"
          onClick={signInWithGoogle}
        >
          Sign In with Google
        </button>
        <p className="mt-4 text-sm text-gray-600">
          Don't have an account?{" "}
          <button className="text-blue-500 hover:underline" onClick= {goToSignUp}>Sign up </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;