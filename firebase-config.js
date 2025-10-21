// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAbtd_UifgYk71Wlp7eeXxjFssEkf1T10o",
    authDomain: "gov-jornal-desastres.firebaseapp.com",
    projectId: "gov-jornal-desastres",
    storageBucket: "gov-jornal-desastres.firebasestorage.app",
    messagingSenderId: "179260328185",
    appId: "1:179260328185:web:6d023088efbeec312d3a28",
    measurementId: "G-HJE33Q1YZ7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { app, analytics, auth, database, storage };
