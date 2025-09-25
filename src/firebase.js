import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCu_utqnP4sTuBMI7nXDNz6n464eJQ0iUM",
  authDomain: "villavicencio-survivor.firebaseapp.com",
  databaseURL: "https://villavicencio-survivor-default-rtdb.firebaseio.com",
  projectId: "villavicencio-survivor",
  storageBucket: "villavicencio-survivor.firebasestorage.app",
  messagingSenderId: "305013959175",
  appId: "1:305013959175:web:4fe785561f3ed05ac8d8a2",
  measurementId: "G-85N9PJK7FM"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };