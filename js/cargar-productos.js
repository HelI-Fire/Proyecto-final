
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const products = [
  { id: 3, name: "Smartwatch deportivo", category: "Tecnología", price: 899 },
  { id: 4, name: "Teclado mecánico", category: "Accesorios", price: 749 },
  { id: 5, name: "Bocina Bluetooth", category: "Audio", price: 429 },
  { id: 6, name: "Cafetera compacta", category: "Hogar", price: 680 },
  { id: 7, name: "Mouse inalámbrico", category: "Accesorios", price: 199 },
  { id: 8, name: "Tablet de 10 pulgadas", category: "Tecnología", price: 2899 },
  { id: 9, name: "Lámpara de escritorio", category: "Hogar", price: 299 },
  { id: 10, name: "Monitor de 24 pulgadas", category: "Tecnología", price: 2199 },
  { id: 11, name: "Termo de acero", category: "Hogar", price: 249 },
  { id: 12, name: "Control para videojuegos", category: "Tecnología", price: 999 }
];

const form = document.getElementById("loginForm");
const status = document.getElementById("status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    status.textContent = "Iniciando sesión...";

    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (credential.user.uid !== "ZHttQaLELRQ7lHU7rdhok0v4YtS2") {
      await signOut(auth);
      throw new Error("Esta cuenta no tiene autorización para cargar productos.");
    }

    status.textContent = "Consultando productos existentes...";

    const ids = products.map(product => product.id);
    const productsQuery = query(
      collection(db, "productos"),
      where("id", "in", ids)
    );

    const snapshot = await getDocs(productsQuery);
    const existingIds = new Set(snapshot.docs.map(doc => doc.data().id));

    let added = 0;
    let skipped = 0;

    for (const product of products) {
      if (existingIds.has(product.id)) {
        skipped++;
        continue;
      }

      await addDoc(collection(db, "productos"), product);
      added++;
    }

    status.textContent = `Proceso terminado. Agregados: ${added}. Ya existentes: ${skipped}.`;

    await signOut(auth);
  } catch (error) {
    status.textContent = "Error: " + error.message;
    console.error(error);
  }
});
