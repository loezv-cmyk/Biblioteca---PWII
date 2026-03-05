const API_URL = "http://localhost:3000";

function getToken() {
  return localStorage.getItem("token");
}

function renderBooks(books) {
  const tbody = document.getElementById("booksTable");
  tbody.innerHTML = "";

  if (books.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center">No se encontraron libros</td></tr>`;
    return;
  }

  books.forEach((book) => {
    const tr = document.createElement("tr");
    tr.className = "book-row";
    tr.dataset.id           = book.id;
    tr.dataset.title        = book.title;
    tr.dataset.author       = book.author;
    tr.dataset.availability = book.stock;

    tr.innerHTML = `
      <td>${book.title}</td>
      <td>${book.author}</td>
      <td>${book.genre ?? "—"}</td>
      <td>${book.stock}</td>
    `;

    tr.addEventListener("click", () => openModal(book));
    tbody.appendChild(tr);
  });
}

function openModal(book) {
  document.getElementById("modalTitle").textContent        = book.title;
  document.getElementById("modalAuthor").textContent       = book.author;
  document.getElementById("modalGenre").textContent        = book.genre ?? "—";
  document.getElementById("modalAvailability").textContent = book.stock;

  const loanBtn = document.getElementById("loanBtn");
  if (book.stock > 0) {
    loanBtn.textContent           = "Pedir préstamo";
    loanBtn.style.backgroundColor = "#E26650";
  } else {
    loanBtn.textContent           = "Entrar a lista de espera";
    loanBtn.style.backgroundColor = "#FFB65C";
  }

  document.getElementById("bookModal").style.display = "flex";
}

const closeModal = document.getElementById("closeModal");
if (closeModal) {
  closeModal.addEventListener("click", () => {
    document.getElementById("bookModal").style.display = "none";
  });
}

window.addEventListener("click", (e) => {
  const modal = document.getElementById("bookModal");
  if (e.target === modal) modal.style.display = "none";
});

async function loadBooks(search = "") {
  const tbody = document.getElementById("booksTable");
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center">Cargando...</td></tr>`;

  try {
    const res = await fetch(`${API_URL}/books`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!res.ok) throw new Error("Error al obtener libros");

    let books = await res.json();

    if (search.trim()) {
      const q = search.toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    renderBooks(books);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;text-align:center">${err.message}</td></tr>`;
  }
}

const searchInput  = document.getElementById("searchInput");
const searchButton = document.querySelector(".btn-primary");

if (searchButton) {
  searchButton.addEventListener("click", () => loadBooks(searchInput.value));
}
if (searchInput) {
  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") loadBooks(searchInput.value);
  });
}

loadBooks();