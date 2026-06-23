import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {

  apiKey: "TU_API_KEY",

  authDomain: "control-asistencia-82fe2.firebaseapp.com",

  projectId: "control-asistencia-82fe2",

  storageBucket: "control-asistencia-82fe2.firebasestorage.app",

  messagingSenderId: "861657394944",

  appId: "1:861657394944:web:9815dee357ee203fb00de5"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

export { app, auth };
