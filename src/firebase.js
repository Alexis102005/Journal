import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyCMrHOzuvCSz7vRM653A_2rjVdEsjJ7XmM",
  authDomain: "mon-journal-f633f.firebaseapp.com",
  projectId: "mon-journal-f633f",
  storageBucket: "mon-journal-f633f.firebasestorage.app",
  messagingSenderId: "968634508272",
  appId: "1:968634508272:web:7d6563ee02493bd2f53335"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)