import { auth, db } from "./firebase.js";

import {
  collection, getDocs, doc, getDoc, setDoc, addDoc,
  serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);

const cartButton = $("cartButton");
const checkoutButton = $("checkoutButton");
const historyButton = $("historyButton");
const historyModal = $("historyModal");
const closeHistoryModal = $("closeHistoryModal");
const historyItems = $("historyItems");
const cartModal = $("cartModal");
const closeCartModal = $("closeCartModal");
const cartItemsContainer = $("cartItems");
const cartCount = $("cartCount");
const cartTotal = $("cartTotal");
const clearCartButton = $("clearCartButton");
const productGrid = $("productGrid");

let currentUser = null;
let cart = [];
let catalogProducts = null;

function formatPrice(price) {
  return Number(price).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  });
}

async function getCatalogProducts() {
  if (!catalogProducts) {
    catalogProducts = getDocs(collection(db, "productos")).then(snapshot => {
      return snapshot.docs.map(document => {
        const data = document.data();

        return {
          id: Number(data.id),
          name: String(data.name ?? "").trim(),
          category: String(data.category ?? "").trim(),
          price: Number(data.price)
        };
      }).filter(product =>
        Number.isFinite(product.id) &&
        product.name &&
        product.category &&
        Number.isFinite(product.price)
      );
    });
  }

  return catalogProducts;
}

function renderCart() {
  cartItemsContainer.innerHTML = "";

  let total = 0;
  let quantityTotal = 0;

  if (cart.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Tu carrito está vacío.";
    cartItemsContainer.appendChild(empty);
  }

  cart.forEach(item => {
    const subtotal = item.price * item.quantity;

    total += subtotal;
    quantityTotal += item.quantity;

    const itemElement = document.createElement("div");
    itemElement.className = "cart-item";

    const info = document.createElement("div");
    info.className = "cart-item-info";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const price = document.createElement("span");
    price.textContent = `${formatPrice(item.price)} × ${item.quantity}`;

    const subtotalText = document.createElement("span");
    subtotalText.textContent = `Subtotal: ${formatPrice(subtotal)}`;

    info.appendChild(name);
    info.appendChild(price);
    info.appendChild(subtotalText);

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";

    const decreaseButton = document.createElement("button");
    decreaseButton.type = "button";
    decreaseButton.textContent = "−";
    decreaseButton.dataset.action = "decrease";
    decreaseButton.dataset.productId = item.productId;
    decreaseButton.setAttribute("aria-label", "Disminuir cantidad");

    const quantity = document.createElement("span");
    quantity.textContent = item.quantity;

    const increaseButton = document.createElement("button");
    increaseButton.type = "button";
    increaseButton.textContent = "+";
    increaseButton.dataset.action = "increase";
    increaseButton.dataset.productId = item.productId;
    increaseButton.setAttribute("aria-label", "Aumentar cantidad");

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.className = "remove-item";
    removeButton.dataset.action = "remove";
    removeButton.dataset.productId = item.productId;
    removeButton.setAttribute("aria-label", "Eliminar producto");

    actions.appendChild(decreaseButton);
    actions.appendChild(quantity);
    actions.appendChild(increaseButton);
    actions.appendChild(removeButton);

    itemElement.appendChild(info);
    itemElement.appendChild(actions);

    cartItemsContainer.appendChild(itemElement);
  });

  cartCount.textContent = quantityTotal;
  cartTotal.textContent = formatPrice(total);
  clearCartButton.disabled = cart.length === 0;
  checkoutButton.disabled=cart.length===0;
}

async function loadPurchaseHistory() {
  if (!currentUser) return;

  historyItems.innerHTML = "<p>Cargando compras...</p>";

  try {
    const purchasesQuery = query(
      collection(db, "pedidos"),
      where("usuarioId", "==", currentUser.uid)
    );

    const snapshot = await getDocs(purchasesQuery);

    historyItems.innerHTML = "";

    if (snapshot.empty) {
      historyItems.innerHTML = "<p>Aún no tienes compras registradas.</p>";
      return;
    }

    snapshot.forEach((purchaseDocument) => {
    const purchase = purchaseDocument.data();

      const purchaseElement = document.createElement("div");
      purchaseElement.className = "cart-item";

      const date = purchase.fecha?.toDate().toLocaleString("es-MX") || "Fecha no disponible";

      const title = document.createElement("strong");
      title.textContent = `Compra del ${date}`;

      const status = document.createElement("p");
      status.textContent = `Estado: ${purchase.estado}`;

      const products = document.createElement("p");
      products.textContent = purchase.items
        .map(item => `${item.name} x${item.quantity}`)
        .join(", ");

      const total = document.createElement("strong");
      total.textContent = `Total: ${formatPrice(purchase.total)}`;

      purchaseElement.appendChild(title);
      purchaseElement.appendChild(status);
      purchaseElement.appendChild(products);
      purchaseElement.appendChild(total);

      historyItems.appendChild(purchaseElement);
    });