import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDNTzTomuQjEsaNG305xzy6jHoyn443kq4",
  authDomain: "mstat-f227f.firebaseapp.com",
  projectId: "mstat-f227f",
  storageBucket: "mstat-f227f.appspot.com",
  messagingSenderId: "142428204251",
  appId: "1:142428204251:web:ab9009d3246ffaa02e30fe",
  measurementId: "G-3QLGBNSRVG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();