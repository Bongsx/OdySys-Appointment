import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAweN0wKRogH43dfla4RBtMbdSmJ_MaKh0",
  authDomain: "hospital-management-syst-315f8.firebaseapp.com",
  databaseURL:
    "https://hospital-management-syst-315f8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hospital-management-syst-315f8",
  storageBucket: "hospital-management-syst-315f8.appspot.com",
  messagingSenderId: "354772852092",
  appId: "1:354772852092:web:b812beaa4ade62246658f9",
  measurementId: "G-9D4XB73EFT",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
