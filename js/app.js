
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

function updateMetrics() {
  $("comparisons").textContent = comparisons;
  $("swaps").textContent = swaps;
  $("passNumber").textContent = currentPass;
}

function setStatus(status, description) {
  $("algorithmStatus").textContent = status;
  $("stepDescription").textContent = description;
}

function delayTime() {
  const speeds = {
    1: 1100,
    2: 750,
    3: 450,
    4: 220,
    5: 80
  };

  return speeds[Number($("speedRange").value)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitIfPaused() {
  while (isPaused && !stopRequested) {
    await sleep(100);
  }
}

async function bubbleSort() {
  if (isSorting || products.length === 0) return;

  isSorting = true;
  isPaused = false;
  stopRequested = false;

  comparisons = 0;
  swaps = 0;
  currentPass = 0;
  sortedIds = new Set();
  currentPair = [];

  $("sortButton").disabled = true;
  $("resetButton").disabled = true;
  $("pauseButton").disabled = false;
  $("pauseButton").textContent = "Pausar";

  updateMetrics();

  const direction = $("orderSelect").value;

  const shouldSwap = (a, b) =>
    direction === "asc"
      ? a.price > b.price
      : a.price < b.price;

  let n = products.length;
  let finished = false;

  setStatus(
    "En ejecución",
    "Comenzando Bubble Sort: se compararán productos vecinos según sus precios."
  );

  await sleep(350);

  while (n > 1 && !finished && !stopRequested) {
    currentPass++;
    finished = true;

    for (let j = 0; j < n - 1; j++) {
      await waitIfPaused();

      if (stopRequested) break;

      const left = products[j];
      const right = products[j + 1];

      currentPair = [left.id, right.id];
      comparisons++;

      setStatus(
        "Comparando",
        `Pasada ${currentPass}: ${formatPrice(left.price)} (${left.name}) se compara con ${formatPrice(right.price)} (${right.name}).`
      );

      updateMetrics();
      renderProducts();

      await sleep(delayTime());
      await waitIfPaused();

      if (stopRequested) break;

      if (shouldSwap(left, right)) {
        setStatus(
          "Intercambiando",
          `${formatPrice(left.price)} es ${direction === "asc" ? "mayor" : "menor"} que ${formatPrice(right.price)}. Se intercambian sus posiciones.`
        );

        const leftCard = grid.querySelector(
          `[data-product-id="${left.id}"]`
        );

        const rightCard = grid.querySelector(
          `[data-product-id="${right.id}"]`
        );

        if (leftCard) leftCard.classList.add("swapping");
        if (rightCard) rightCard.classList.add("swapping");

        await sleep(Math.max(180, delayTime() / 2));

        [products[j], products[j + 1]] =
          [products[j + 1], products[j]];

        swaps++;
        finished = false;

        updateMetrics();
        renderProducts();

      } else {
        setStatus(
          "Sin intercambio",
          `${formatPrice(left.price)} ya está en el orden correcto respecto a ${formatPrice(right.price)}. No es necesario intercambiarlos.`
        );

        await sleep(Math.max(140, delayTime() / 2));
      }
    }

    if (!stopRequested) {
      sortedIds.add(products[n - 1].id);
      n--;
      currentPair = [];
      renderProducts();
    }
  }

  if (!stopRequested) {
    products.forEach(product => sortedIds.add(product.id));
    currentPair = [];

    renderProducts();

    setStatus(
      "¡Ordenamiento terminado!",
      `La lista quedó ordenada ${direction === "asc" ? "de menor a mayor" : "de mayor a menor"} precio. Se realizaron ${comparisons} comparaciones y ${swaps} intercambios.`
    );

  } else {
    currentPair = [];

    setStatus(
      "Proceso detenido",
      "El ordenamiento se detuvo. Puedes restablecer la lista para comenzar de nuevo."
    );

    renderProducts();
  }

  isSorting = false;
  isPaused = false;

  $("sortButton").disabled = false;
  $("resetButton").disabled = false;
  $("pauseButton").disabled = true;
  $("pauseButton").textContent = "Pausar";
}

function resetAll() {
  if (isSorting) {
    stopRequested = true;
    isPaused = false;
  }

  products = originalProducts.map(product => ({ ...product }));

  comparisons = 0;
  swaps = 0;
  currentPass = 0;
  currentPair = [];
  sortedIds = new Set();

  $("orderSelect").value = "asc";

  updateMetrics();
  renderProducts();

  setStatus(
    "Listo para comenzar",
    "Presiona “Ordenar con Bubble Sort”. El algoritmo comparará los precios de productos vecinos y los intercambiará cuando estén en el orden incorrecto."
  );
}

$("sortButton").addEventListener("click", bubbleSort);
$("resetButton").addEventListener("click", resetAll);

$("pauseButton").addEventListener("click", () => {
  if (!isSorting) return;

  isPaused = !isPaused;

  $("pauseButton").textContent =
    isPaused ? "Continuar" : "Pausar";

  if (isPaused) {
    setStatus(
      "En pausa",
      "El algoritmo está pausado. Presiona “Continuar” para seguir con las comparaciones."
    );
  } else {
    setStatus(
      "En ejecución",
      "El algoritmo continúa con el ordenamiento."
    );
  }
});

$("speedRange").addEventListener("input", event => {
  const labels = {
    1: "Muy lenta",
    2: "Lenta",
    3: "Normal",
    4: "Rápida",
    5: "Muy rápida"
  };

  $("speedText").textContent = labels[event.target.value];
});

function applySearch() {
  searchTerm = $("searchInput").value.trim().toLowerCase();
  renderProducts();
}

$("searchButton").addEventListener("click", applySearch);
$("searchInput").addEventListener("input", applySearch);

document.querySelectorAll("[data-category]").forEach(link => {
  link.addEventListener("click", () => {
    activeCategory = link.dataset.category;
    renderProducts();
  });
});

document
  .querySelector('.categories a[href="#catalogo"]:not([data-category])')
  .addEventListener("click", () => {
    activeCategory = "Todos";
    renderProducts();
  });

updateMetrics();
loadProducts();
