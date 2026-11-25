
import { db } from "./firebase.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

const productDesigns = {
  1: { emoji: "🎧", bg: "#e8edff" },
  2: { emoji: "🎒", bg: "#fff0e6" },
  3: { emoji: "⌚", bg: "#e8f6ef" },
  4: { emoji: "⌨️", bg: "#f1eaff" },
  5: { emoji: "🔊", bg: "#e5f6fb" },
  6: { emoji: "☕", bg: "#fff0e9" },
  7: { emoji: "🖱️", bg: "#eef2f7" },
  8: { emoji: "📱", bg: "#e8edff" },
  9: { emoji: "💡", bg: "#fff6d9" },
  10: { emoji: "🖥️", bg: "#e8f3ff" },
  11: { emoji: "🥤", bg: "#e7f5ee" },
  12: { emoji: "🎮", bg: "#f0eaff" }
};

let products = [];
let originalProducts = [];

let comparisons = 0;
let swaps = 0;
let currentPass = 0;
let isSorting = false;
let isPaused = false;
let stopRequested = false;
let currentPair = [];
let sortedIds = new Set();
let activeCategory = "Todos";
let searchTerm = "";

const $ = (id) => document.getElementById(id);
const grid = $("productGrid");

function formatPrice(price) {
  return Number(price).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  });
}

async function loadProducts() {
  try {
    setStatus(
      "Conectando...",
      "Consultando los productos registrados en Firebase."
    );

    $("sortButton").disabled = true;
    $("resetButton").disabled = true;

    const snapshot = await getDocs(collection(db, "productos"));

    products = snapshot.docs
      .map(document => {
        const data = document.data();

        const id = Number(data.id);
        const name = String(data.name ?? "").trim();
        const category = String(data.category ?? "").trim();
        const price = Number(data.price);

        if (
          !Number.isFinite(id) ||
          !name ||
          !category ||
          !Number.isFinite(price)
        ) {
          console.warn(
            "Producto omitido por datos incompletos:",
            document.id,
            data
          );

          return null;
        }

        const design = productDesigns[id] || {
          emoji: "🛍️",
          bg: "#e8edff"
        };

        return {
          id,
          name,
          category,
          price,
          emoji: design.emoji,
          bg: design.bg
        };
      })
      .filter(product => product !== null);

    products.sort((a, b) => a.id - b.id);

    originalProducts = products.map(product => ({ ...product }));

    renderProducts();
    updateMetrics();

    $("sortButton").disabled = products.length === 0;
    $("resetButton").disabled = products.length === 0;

    setStatus(
      "Productos cargados",
      `Se cargaron ${products.length} productos correctamente desde Firebase.`
    );

    console.log("Productos cargados desde Firestore:", products);

  } catch (error) {
    console.error("Error al cargar productos:", error);

    setStatus(
      "Error de conexión",
      "No fue posible cargar los productos desde Firebase. Revisa la consola."
    );

    $("productCount").textContent = "Error al cargar";
  }
}

function visibleProducts() {
  return products.filter(product => {
    const matchesCategory =
      activeCategory === "Todos" ||
      product.category === activeCategory;

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const list = visibleProducts();

  $("productCount").textContent =
    `${list.length} ${list.length === 1 ? "producto" : "productos"}`;

  $("emptyMessage").hidden = list.length !== 0;
  grid.innerHTML = "";

  list.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id;

    if (currentPair.includes(product.id)) {
      card.classList.add("comparing");
    }

    if (sortedIds.has(product.id)) {
      card.classList.add("sorted");
    }

    const visual = document.createElement("div");
    visual.className = "product-visual";
    visual.style.setProperty("--product-bg", product.bg);

    const category = document.createElement("span");
    category.className = "product-category";
    category.textContent = product.category;

    const emoji = document.createElement("span");
    emoji.className = "product-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = product.emoji;

    visual.appendChild(category);
    visual.appendChild(emoji);

    if (sortedIds.has(product.id)) {
      const position = document.createElement("span");
      position.className = "position-tag";
      position.textContent = "Ordenado";
      visual.appendChild(position);
    }

    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("h3");
    name.textContent = product.name;

    const price = document.createElement("strong");
    price.className = "product-price";
    price.textContent = formatPrice(product.price);

    const installments = document.createElement("span");
    installments.className = "product-installments";
    installments.textContent = "Precio de ejemplo · IVA incluido";

    info.appendChild(name);
info.appendChild(price);
info.appendChild(installments);

const addButton = document.createElement("button");
addButton.className = "add-cart-button";
addButton.type = "button";
addButton.textContent = "🛒 Agregar al carrito";
addButton.dataset.addToCart = product.id;

info.appendChild(addButton);

card.appendChild(visual);
card.appendChild(info);

    grid.appendChild(card);
  });
}