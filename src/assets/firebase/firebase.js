import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1w0tPJff953vbLjNDVCUBdFKZdw9m9lE",
  authDomain: "odyssey-test-db.firebaseapp.com",
  databaseURL:
    "https://odyssey-test-db-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "odyssey-test-db",
  storageBucket: "odyssey-test-db.firebasestorage.app",
  messagingSenderId: "795570037018",
  appId: "1:795570037018:web:b3bc4ac3fbdf3158e68ca3",
  measurementId: "G-ZK86LXT66J",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
