// ============================================
// nav.js — Componente de navegación reutilizable
// Pinta sidebar + header + footer en cada página.
// Se usa con: <div id="app-nav" data-page="libros"></div>
// ============================================

const NAV_ITEMS = [
  // Items para todos los usuarios logueados
  { key: "inicio",    icon: "🏠", label: "Inicio",           href: "inicio.html",       roles: ["USER", "ADMIN"] },
  { key: "libros",    icon: "📚", label: "Libros",           href: "libros.html",       roles: ["USER", "ADMIN"] },
  { key: "prestamos", icon: "📋", label: "Mis Préstamos",    href: "prestamos.html",    roles: ["USER", "ADMIN"] },
  { key: "espera",    icon: "⏳", label: "Listas de Espera", href: "espera.html",       roles: ["USER", "ADMIN"] },
  { key: "multas",    icon: "💰", label: "Multas",           href: "multas.html",       roles: ["USER", "ADMIN"] },

  // Separador visual
  { key: "sep-admin", type: "separator", label: "Administración", roles: ["ADMIN"] },

  // Items solo para admin
  { key: "admin-libros",    icon: "🛠️",  label: "Gestión de Libros",  href: "admin/consultar-libros.html",   roles: ["ADMIN"] },
  { key: "admin-nuevo",     icon: "➕",  label: "Agregar Libro",      href: "admin/agregar-libro.html",       roles: ["ADMIN"] },
  { key: "admin-prestamos", icon: "📖",  label: "Gestión de Préstamos", href: "admin/consultar-prestamos.html", roles: ["ADMIN"] },
  { key: "admin-autorizar", icon: "✅",  label: "Autorizar Préstamo", href: "admin/autorizar-prestamo.html", roles: ["ADMIN"] },
  { key: "admin-reportes",  icon: "📊",  label: "Reportes",           href: "admin/reportes.html",           roles: ["ADMIN"] },
];

// ============================================
// Pinta el layout completo (sidebar + header)
// ============================================
function renderNav() {
  const container = document.getElementById("app-nav");
  if (!container) return;

  const user = getUser();
  if (!user) return; // sin sesión; requireAuth ya habrá redirigido

  const currentPage = container.dataset.page || "";
  const isAdmin     = user.role === "ADMIN";
  // Las páginas admin están en /admin/ por eso necesitamos subir un nivel al poner los links
  const inAdminFolder = window.location.pathname.includes("/admin/");
  const pathPrefix    = inAdminFolder ? "../" : "";

  // Filtrar items según rol
  const items = NAV_ITEMS.filter(it => it.roles.includes(user.role));

  // Construir HTML del sidebar
  let sidebarItems = "";
  items.forEach(it => {
    if (it.type === "separator") {
      sidebarItems += `<div class="nav-separator">${it.label}</div>`;
    } else {
      const isActive = it.key === currentPage ? "active" : "";
      sidebarItems += `
        <a href="${pathPrefix}${it.href}" class="nav-item ${isActive}">
          <span class="nav-icon">${it.icon}</span>
          <span class="nav-label">${it.label}</span>
        </a>
      `;
    }
  });

  container.innerHTML = `
    <!-- SIDEBAR PERSISTENTE -->
    <aside class="app-sidebar" id="appSidebar">
      <div class="sidebar-brand">
        <div class="brand-title">Biblioteca</div>
        <div class="brand-subtitle">"Alfonso Reyes"</div>
      </div>

      <nav class="sidebar-nav">
        ${sidebarItems}
      </nav>

      <div class="sidebar-footer">
        <div class="user-chip">
          <div class="user-avatar">${getInitials(user.name)}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtmlNav(user.name)}</div>
            <div class="user-role">${isAdmin ? "Administrador" : "Miembro"}</div>
          </div>
        </div>
        <button class="btn-logout" id="btnLogout">Cerrar sesión</button>
      </div>
    </aside>

    <!-- TOPBAR (solo en móvil y para mostrar título de página) -->
    <header class="app-topbar">
      <button class="topbar-toggle" id="topbarToggle" aria-label="Abrir menú">☰</button>
      <div class="topbar-title" id="topbarTitle"></div>
    </header>

    <!-- Overlay móvil -->
    <div class="app-sidebar-overlay" id="sidebarOverlay"></div>
  `;

  // Engancha comportamientos
  document.getElementById("btnLogout").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });

  const sidebar = document.getElementById("appSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  document.getElementById("topbarToggle").addEventListener("click", () => {
    sidebar.classList.toggle("open");
    overlay.classList.toggle("open");
  });
  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("open");
  });

  // Título de la página en el topbar
  const currentItem = items.find(i => i.key === currentPage);
  if (currentItem) {
    document.getElementById("topbarTitle").textContent = currentItem.label;
  }
}

// Helpers
function getInitials(name) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}
function escapeHtmlNav(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

// Renderizar automáticamente cuando cargue la página
document.addEventListener("DOMContentLoaded", renderNav);

// ============================================
// Auto-cargar sistema de notificaciones
// Se inyecta CSS + JS sólo si hay usuario logueado.
// Así no hay que editar cada HTML manualmente.
// ============================================
(function loadNotifications() {
  if (typeof getUser !== "function" || !getUser()) return;

  // Detectar prefijo (para subcarpetas /admin/ y /usuario/)
  const inSubfolder = window.location.pathname.includes("/admin/")
                   || window.location.pathname.includes("/usuario/");
  const prefix = inSubfolder ? "../" : "";

  // CSS (evitar duplicados)
  if (!document.querySelector('link[data-notif="1"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${prefix}css/notifications.css`;
    link.dataset.notif = "1";
    document.head.appendChild(link);
  }

  // JS (evitar duplicados)
  if (!document.querySelector('script[data-notif="1"]')) {
    const script = document.createElement("script");
    script.src = `${prefix}js/notifications.js`;
    script.dataset.notif = "1";
    script.defer = true;
    document.body.appendChild(script);
  }
})();