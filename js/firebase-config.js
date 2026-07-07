import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBD3doz4lLJH752HuSIioOS2yj6tD75yNY",
  authDomain: "control-asistencia-958aa.firebaseapp.com",
  projectId: "control-asistencia-958aa",
  storageBucket: "control-asistencia-958aa.firebasestorage.app",
  messagingSenderId: "580978630565",
  appId: "1:580978630565:web:6206ccbb29a0e86200124c",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
