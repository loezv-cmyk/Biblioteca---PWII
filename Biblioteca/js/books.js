// ============================================
// books.js - Consulta de libros + préstamo/lista de espera
// Usa apiFetch() de session.js para todas las peticiones.
// ============================================

let allBooks = [];         // cache de libros para filtrar localmente
let currentBook = null;    // libro actualmente abierto en el modal

// ----------- RENDER TABLA -----------
function renderBooks(books) {
  const tbody = document.getElementById("booksTable");
  tbody.innerHTML = "";

  if (!books.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="status-msg">No se encontraron libros</td></tr>`;
    return;
  }

  books.forEach((book) => {
    const tr = document.createElement("tr");
    tr.className = "book-row";
    tr.innerHTML = `
      <td>${escapeHtml(book.title)}</td>
      <td>${escapeHtml(book.author)}</td>
      <td>${escapeHtml(book.genre ?? "—")}</td>
      <td>${book.stock}</td>
    `;
    tr.addEventListener("click", () => openModal(book));
    tbody.appendChild(tr);
  });
}

// Helper: escapa HTML para evitar inyección
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ----------- MODAL -----------
function openModal(book) {
  currentBook = book;

  document.getElementById("modalTitle").textContent        = book.title;
  document.getElementById("modalAuthor").textContent       = book.author;
  document.getElementById("modalGenre").textContent        = book.genre ?? "—";
  document.getElementById("modalIsbn").textContent         = book.isbn ?? "—";
  document.getElementById("modalAvailability").textContent = book.stock;
  document.getElementById("loanFeedback").textContent      = "";

  const loanBtn = document.getElementById("loanBtn");
  loanBtn.disabled = false;

  if (book.stock > 0) {
    loanBtn.textContent           = "Pedir préstamo";
    loanBtn.style.backgroundColor = "#E26650";
    loanBtn.dataset.action        = "loan";
  } else {
    loanBtn.textContent           = "Entrar a lista de espera";
    loanBtn.style.backgroundColor = "#FFB65C";
    loanBtn.dataset.action        = "hold";
  }

  document.getElementById("bookModal").style.display = "flex";
}

function closeModalFn() {
  document.getElementById("bookModal").style.display = "none";
  currentBook = null;
}

document.getElementById("closeModal")?.addEventListener("click", closeModalFn);
window.addEventListener("click", (e) => {
  if (e.target.id === "bookModal") closeModalFn();
});

// ----------- BOTÓN PEDIR PRÉSTAMO / LISTA DE ESPERA -----------
document.getElementById("loanBtn").addEventListener("click", async () => {
  if (!currentBook) return;

  const user = getUser();
  const feedback = document.getElementById("loanFeedback");
  const btn = document.getElementById("loanBtn");
  const action = btn.dataset.action;

  btn.disabled = true;
  feedback.style.color = "#555";
  feedback.textContent = "Procesando...";

  try {
    if (action === "loan") {
      // Crear préstamo
      await apiFetch("/loans", {
        method: "POST",
        body: {
          userId: user.id,
          items: [{ bookId: currentBook.id, qty: 1 }],
        },
      });
      feedback.style.color = "green";
      feedback.textContent = "¡Préstamo solicitado con éxito!";
    } else {
      // Entrar a lista de espera
      await apiFetch("/holds", {
        method: "POST",
        body: {
          userId: user.id,
          bookId: currentBook.id,
        },
      });
      feedback.style.color = "green";
      feedback.textContent = "Agregado a la lista de espera.";
    }

    // Recargar la tabla para ver el nuevo stock
    await loadBooks();
    setTimeout(closeModalFn, 1500);

  } catch (err) {
    feedback.style.color = "#c0392b";
    feedback.textContent = err.message;
    btn.disabled = false;
  }
});

// ----------- CARGAR LIBROS DESDE BACKEND -----------
async function loadBooks() {
  const tbody = document.getElementById("booksTable");
  tbody.innerHTML = `<tr><td colspan="4" class="status-msg">Cargando...</td></tr>`;

  try {
    const books = await apiFetch("/books");
    allBooks = books;
    applySearch();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="status-msg error">${err.message}</td></tr>`;
  }
}

// ----------- BÚSQUEDA (filtro local) -----------
function applySearch() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();

  if (!q) {
    renderBooks(allBooks);
    return;
  }

  const filtered = allBooks.filter((b) =>
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q) ||
    (b.genre ?? "").toLowerCase().includes(q)
  );
  renderBooks(filtered);
}

document.getElementById("searchBtn").addEventListener("click", applySearch);
document.getElementById("searchInput").addEventListener("keyup", (e) => {
  if (e.key === "Enter") applySearch();
});

// Arranca: carga inicial
loadBooks();