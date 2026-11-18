const initialProducts = [
  { id: 1, name: "Audífonos inalámbricos", category: "Audio", price: 349, emoji: "🎧", bg: "#e8edff" },
  { id: 2, name: "Mochila para laptop", category: "Accesorios", price: 599, emoji: "🎒", bg: "#fff0e6" },
  { id: 3, name: "Smartwatch deportivo", category: "Tecnología", price: 899, emoji: "⌚", bg: "#e8f6ef" },
  { id: 4, name: "Teclado mecánico", category: "Accesorios", price: 749, emoji: "⌨️", bg: "#f1eaff" },
  { id: 5, name: "Bocina Bluetooth", category: "Audio", price: 429, emoji: "🔊", bg: "#e5f6fb" },
  { id: 6, name: "Cafetera compacta", category: "Hogar", price: 680, emoji: "☕", bg: "#fff0e9" },
  { id: 7, name: "Mouse inalámbrico", category: "Accesorios", price: 199, emoji: "🖱️", bg: "#eef2f7" },
  { id: 8, name: "Tablet de 10 pulgadas", category: "Tecnología", price: 2899, emoji: "📱", bg: "#e8edff" },
  { id: 9, name: "Lámpara de escritorio", category: "Hogar", price: 299, emoji: "💡", bg: "#fff6d9" },
  { id: 10, name: "Monitor de 24 pulgadas", category: "Tecnología", price: 2199, emoji: "🖥️", bg: "#e8f3ff" },
  { id: 11, name: "Termo de acero", category: "Hogar", price: 249, emoji: "🥤", bg: "#e7f5ee" },
  { id: 12, name: "Control para videojuegos", category: "Tecnología", price: 999, emoji: "🎮", bg: "#f0eaff" }
];

let products = [...initialProducts];
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
  return price.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

function visibleProducts() {
  return products.filter(product => {
    const matchesCategory = activeCategory === "Todos" || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  }

function renderProducts() {
  const list = visibleProducts();
  $("productCount").textContent = `${list.length} ${list.length === 1 ? "producto" : "productos"}`;
  $("emptyMessage").hidden = list.length !== 0;
  grid.innerHTML = "";

  list.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card";
    if (currentPair.includes(product.id)) {
      card.classList.add(isSorting ? "comparing" : "");
    }
    if (sortedIds.has(product.id)) card.classList.add("sorted");
    card.innerHTML = `
      <div class="product-visual" style="--product-bg:${product.bg}">
        <span class="product-category">${product.category}</span>
        <span class="product-emoji" aria-hidden="true">${product.emoji}</span>
        ${sortedIds.has(product.id) ? '<span class="position-tag">Ordenado</span>' : ""}
      </div>
      <div class="product-info">
        <h3>${product.name}</h3>
        <strong class="product-price">${formatPrice(product.price)}</strong>
        <span class="product-installments">Precio de ejemplo · IVA incluido</span>
      </div>`;
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
  const speeds = { 1: 1100, 2: 750, 3: 450, 4: 220, 5: 80 };
  return speeds[Number($("speedRange").value)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitIfPaused() {
  while (isPaused && !stopRequested) await sleep(100);
}

async function bubbleSort() {
  if (isSorting) return;

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
  const shouldSwap = (a, b) => direction === "asc" ? a.price > b.price : a.price < b.price;
  let n = products.length;
  let finished = false;

  setStatus("En ejecución", "Comenzando Bubble Sort: se compararán productos vecinos según sus precios.");
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
      setStatus("Comparando", `Pasada ${currentPass}: ${formatPrice(left.price)} (${left.name}) se compara con ${formatPrice(right.price)} (${right.name}).`);
      updateMetrics();
      renderProducts();
      await sleep(delayTime());

      await waitIfPaused();
      if (stopRequested) break;

      if (shouldSwap(left, right)) {
        setStatus("Intercambiando", `${formatPrice(left.price)} es ${direction === "asc" ? "mayor" : "menor"} que ${formatPrice(right.price)}. Se intercambian sus posiciones.`);
        const cardList = [...grid.children];
        const visibleIds = visibleProducts().map(p => p.id);
        const leftCard = cardList[visibleIds.indexOf(left.id)];
        const rightCard = cardList[visibleIds.indexOf(right.id)];
        if (leftCard) leftCard.classList.add("swapping");
        if (rightCard) rightCard.classList.add("swapping");
        await sleep(Math.max(180, delayTime() / 2));
        [products[j], products[j + 1]] = [products[j + 1], products[j]];
        swaps++;
        finished = false;
        updateMetrics();
        renderProducts();
      } else {
        setStatus("Sin intercambio", `${formatPrice(left.price)} ya está en el orden correcto respecto a ${formatPrice(right.price)}. No es necesario intercambiarlos.`);
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
    setStatus("¡Ordenamiento terminado!", `La lista quedó ordenada ${direction === "asc" ? "de menor a mayor" : "de mayor a menor"} precio. Se realizaron ${comparisons} comparaciones y ${swaps} intercambios.`);
  } else {
    currentPair = [];
    setStatus("Proceso detenido", "El ordenamiento se detuvo. Puedes restablecer la lista para comenzar de nuevo.");
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
  products = [...initialProducts];
  comparisons = 0;
  swaps = 0;
  currentPass = 0;
  currentPair = [];
  sortedIds = new Set();
  $("orderSelect").value = "asc";
  updateMetrics();
  renderProducts();
  setStatus("Listo para comenzar", "Presiona “Ordenar con Bubble Sort”. El algoritmo comparará los precios de productos vecinos y los intercambiará cuando estén en el orden incorrecto.");
}

$("sortButton").addEventListener("click", bubbleSort);
$("resetButton").addEventListener("click", resetAll);