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

  } catch (error) {
    console.error("Error al cargar el historial:", error);
    historyItems.innerHTML = "<p>No fue posible cargar tus compras.</p>";
  }
}

async function saveCart() {
  if (!currentUser) return;

  try {
    const cartReference = doc(db, "carritos", currentUser.uid);

    await setDoc(cartReference, {
      items: cart,
      updatedAt: serverTimestamp()
    });

    renderCart();

  } catch (error) {
    console.error("Error al guardar el carrito:", error);
    alert("No fue posible guardar el carrito. Inténtalo nuevamente.");
  }
}

async function loadCart(user) {
  try {
    const cartReference = doc(db, "carritos", user.uid);
    const snapshot = await getDoc(cartReference);

    if (currentUser?.uid !== user.uid) return;

    if (snapshot.exists()) {
      const data = snapshot.data();

      cart = Array.isArray(data.items) ? data.items : [];
    } else {
      cart = [];
    }

    renderCart();

  } catch (error) {
    console.error("Error al cargar el carrito:", error);
    alert("No fue posible cargar tu carrito.");
  }
}

productGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-add-to-cart]");

  if (!button) return;

  if (!currentUser) {
    alert("Inicia sesión para agregar productos al carrito.");
    $("loginButton").click();
    return;
  }

  const productId = Number(button.dataset.addToCart);

  try {
    button.disabled = true;

    const products = await getCatalogProducts();

    const product = products.find(item => item.id === productId);

    if (!product) {
      alert("No se encontró este producto.");
      return;
    }

    const existingItem = cart.find(item => item.productId === productId);

    if (existingItem) {
      existingItem.quantity++;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }

    await saveCart();

  } catch (error) {
    console.error("Error al agregar producto:", error);
    alert("No fue posible agregar el producto.");
  } finally {
    button.disabled = false;
  }
});

cartItemsContainer.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const productId = Number(button.dataset.productId);
  const action = button.dataset.action;

  const item = cart.find(product => product.productId === productId);

  if (!item) return;

  if (action === "increase") {
    item.quantity++;
  }

  if (action === "decrease") {
    item.quantity--;

    if (item.quantity <= 0) {
      cart = cart.filter(product => product.productId !== productId);
    }
  }

  if (action === "remove") {
    cart = cart.filter(product => product.productId !== productId);
  }

  await saveCart();
});

historyButton.addEventListener("click", async () => {
  if (!currentUser) {
    $("loginButton").click();
    return;
  }

  historyModal.hidden = false;
  await loadPurchaseHistory();
});

closeHistoryModal.addEventListener("click", () => {
  historyModal.hidden = true;
});

historyModal.addEventListener("click", (event) => {
  if (event.target === historyModal) {
    historyModal.hidden = true;
  }
});

cartButton.addEventListener("click", () => {
  if (!currentUser) {
    $("loginButton").click();
    return;
  }

  cartModal.hidden = false;
  renderCart();
});

closeCartModal.addEventListener("click", () => {
  cartModal.hidden = true;
});

cartModal.addEventListener("click", (event) => {
  if (event.target === cartModal) {
    cartModal.hidden = true;
  }
});

clearCartButton.addEventListener("click", async () => {
  if (!currentUser || cart.length === 0) return;

  if (confirm("¿Estás seguro de que deseas vaciar tu carrito?")) {
    cart = [];
    await saveCart();
  }
});

checkoutButton.addEventListener("click", async () => {
  if (!currentUser || cart.length === 0) return;

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const confirmar = confirm(
    `Resumen de compra\n\nProductos: ${cart.length}\nTotal: ${formatPrice(total)}\n\n¿Deseas confirmar tu compra?`
  );

  if (!confirmar) return;

  checkoutButton.disabled = true;

  try {
    await addDoc(collection(db, "pedidos"), {
      usuarioId: currentUser.uid,
      items: cart,
      total: total,
      estado: "Confirmado",
      fecha: serverTimestamp()
    });

    cart = [];
    await saveCart();

    alert("¡Compra realizada correctamente!");
  } catch (error) {
    console.error("Error al registrar la compra:", error);
    alert("No fue posible completar la compra. Inténtalo nuevamente.");
  } finally {
    renderCart();
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  cart = [];

  if (user) {
    await loadCart(user);
  } else {
    cartModal.hidden = true;
    renderCart();
  }
});

renderCart();
