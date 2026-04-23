// ============================================
// session.js
// Helper que maneja: token, usuario, fetch autenticado y logout.
// Se incluye en TODAS las páginas protegidas.
// ============================================

const API_URL = "http://localhost:3000";

// ---- Obtener sesión actual ----
function getToken() {
  return localStorage.getItem("token");
}

function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

// ---- Construir ruta relativa a la raíz de /Biblioteca/ ----
// Esto arregla que desde /Biblioteca/admin/X.html, al redirigir a "login.html"
// no trate de ir a /Biblioteca/admin/login.html (que no existe).
function buildRootPath(fileName) {
  // Si la URL actual contiene "/admin/" o "/usuario/", subimos un nivel
  const path = window.location.pathname;
  if (path.includes("/admin/") || path.includes("/usuario/")) {
    return "../" + fileName;
  }
  return fileName;
}

// ---- Cerrar sesión ----
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = buildRootPath("index.html");
}

// ---- Proteger una página: si no hay token, mandar al login ----
function requireAuth() {
  if (!getToken()) {
    window.location.href = buildRootPath("login.html");
    return false;
  }
  return true;
}

// ---- Proteger una página SOLO de admin ----
function requireAdmin() {
  if (!requireAuth()) return false;
  const user = getUser();
  if (!user || user.role !== "ADMIN") {
    alert("No tienes permisos de administrador.");
    window.location.href = buildRootPath("inicio.html");
    return false;
  }
  return true;
}

// ---- Fetch con token incluido automáticamente ----
async function apiFetch(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || "GET",
    headers,
  };

  if (options.body) {
    config.body = typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);
  }

  const res = await fetch(`${API_URL}${path}`, config);

  // Si el token expiró o es inválido, mandar al login
  if (res.status === 401) {
    logout();
    throw new Error("Sesión expirada. Inicia sesión de nuevo.");
  }

  // Intenta parsear JSON (aunque sea error)
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no todos los responses tienen JSON
  }

  if (!res.ok) {
    const msg = data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ---- Mostrar nombre del usuario en pantalla ----
function pintarNombreUsuario() {
  const user = getUser();
  const el = document.getElementById("userName");
  if (el && user) el.textContent = user.name;
}

// ---- Enganchar botón de logout ----
function engancharLogout() {
  const btn = document.getElementById("btnLogout");
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  pintarNombreUsuario();
  engancharLogout();
});