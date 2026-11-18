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