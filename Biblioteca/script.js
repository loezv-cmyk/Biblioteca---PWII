const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");

menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
});

const rows = document.querySelectorAll(".book-row");
const modal = document.getElementById("bookModal");
const closeModal = document.getElementById("closeModal");

const modalTitle = document.getElementById("modalTitle");
const modalAuthor = document.getElementById("modalAuthor");
const modalGenre = document.getElementById("modalGenre");
const modalAvailability = document.getElementById("modalAvailability");
const loanBtn = document.getElementById("loanBtn");

rows.forEach(row => {
    row.addEventListener("click", () => {

        const title = row.dataset.title;
        const author = row.dataset.author;
        const genre = row.dataset.genre;
        const availability = parseInt(row.dataset.availability);

        modalTitle.textContent = title;
        modalAuthor.textContent = author;
        modalGenre.textContent = genre;
        modalAvailability.textContent = availability;

        if (availability > 0) {
            loanBtn.textContent = "Pedir préstamo";
            loanBtn.style.backgroundColor = "#E26650";
        } else {
            loanBtn.textContent = "Entrar a lista de espera";
            loanBtn.style.backgroundColor = "#FFB65C";
        }

        modal.style.display = "flex";
    });
});

if (closeModal) {
    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });
}

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});