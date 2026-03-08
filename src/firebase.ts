import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDoudG-FfkZnOLjHwXgiN-pCDrFnulfbMk",
  authDomain: "badminton-2f85b.firebaseapp.com",
  projectId: "badminton-2f85b",
  storageBucket: "badminton-2f85b.firebasestorage.app",
  messagingSenderId: "763986238269",
  appId: "1:763986238269:web:0503707d52f627ed0b4354"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
