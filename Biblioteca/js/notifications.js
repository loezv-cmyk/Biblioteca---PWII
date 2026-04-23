// ============================================
// notifications.js — Sistema de notificaciones
// ============================================
// Requiere: session.js (para apiFetch, getUser)
// Se auto-inicializa después de que nav.js pinta el layout.
// ============================================

(function () {
    "use strict";

    const STORAGE_KEY = "notif_read_ids_v1";
    const POLL_INTERVAL = 60_000; // 1 minuto
    const TOAST_DURATION = 5000;

    let notifications = [];
    let lastSeenIds = new Set();
    let panelOpen = false;
    let pollTimer = null;

    // ============================================
    // Storage helpers (qué notificaciones ya leyó el usuario)
    // ============================================
    function getReadIds() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    }

    function saveReadIds(set) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
        } catch {
            /* ignore */
        }
    }

    // ============================================
    // Construcción de notificaciones desde los datos del usuario
    // ============================================
    function buildNotifications(loans, holds, fines) {
        const list = [];
        const now = new Date();

        // --- 1. RESERVAS disponibles (status NOTIFIED = ya te toca) ---
        holds
            .filter((h) => h.status === "NOTIFIED")
            .forEach((h) => {
                list.push({
                    id: `hold-ready-${h.id}`,
                    type: "success",
                    icon: "📚",
                    title: "¡Tu libro está disponible!",
                    text: `"${h.book?.title ?? "Libro"}" ya te espera. Pasa a recogerlo.`,
                    time: h.createdAt,
                    link: "espera.html",
                });
            });

        // --- 2. RESERVAS en primer lugar de la fila (posición 1, aún en espera) ---
        holds
            .filter((h) => h.status === "WAITING" && h.position === 1)
            .forEach((h) => {
                list.push({
                    id: `hold-first-${h.id}`,
                    type: "info",
                    icon: "⏳",
                    title: "Eres el siguiente en la fila",
                    text: `Pronto estará disponible "${h.book?.title ?? "tu libro"}".`,
                    time: h.createdAt,
                    link: "espera.html",
                });
            });

        // --- 3. PRÉSTAMOS vencidos ---
        loans
            .filter((l) => l.status !== "RETURNED" && l.dueDate && new Date(l.dueDate) < now)
            .forEach((l) => {
                const daysLate = Math.floor(
                    (now - new Date(l.dueDate)) / (1000 * 60 * 60 * 24)
                );
                const titulo =
                    l.loanitem?.[0]?.book?.title ??
                    `${l.loanitem?.length ?? 1} libro(s)`;
                list.push({
                    id: `loan-overdue-${l.id}`,
                    type: "danger",
                    icon: "⚠️",
                    title: "Préstamo vencido",
                    text: `"${titulo}" lleva ${daysLate} día${daysLate !== 1 ? "s" : ""} de atraso. Devuélvelo para evitar multas mayores.`,
                    time: l.dueDate,
                    link: "prestamos.html",
                });
            });

        // --- 4. PRÉSTAMOS por vencer (≤3 días) ---
        loans
            .filter((l) => {
                if (l.status === "RETURNED" || !l.dueDate) return false;
                const due = new Date(l.dueDate);
                const diffDays = (due - now) / (1000 * 60 * 60 * 24);
                return diffDays >= 0 && diffDays <= 3;
            })
            .forEach((l) => {
                const due = new Date(l.dueDate);
                const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                const titulo =
                    l.loanitem?.[0]?.book?.title ??
                    `${l.loanitem?.length ?? 1} libro(s)`;
                const cuando =
                    diffDays === 0
                        ? "hoy"
                        : diffDays === 1
                        ? "mañana"
                        : `en ${diffDays} días`;
                list.push({
                    id: `loan-due-${l.id}`,
                    type: "warning",
                    icon: "📖",
                    title: "Préstamo por vencer",
                    text: `Debes devolver "${titulo}" ${cuando}.`,
                    time: l.dueDate,
                    link: "prestamos.html",
                });
            });

        // --- 5. MULTAS pendientes ---
        const pendingFines = fines.filter((f) => f.status === "PENDING");
        if (pendingFines.length > 0) {
            const total = pendingFines.reduce((sum, f) => sum + Number(f.amount), 0);
            list.push({
                id: `fines-pending-${pendingFines.length}`,
                type: "danger",
                icon: "💰",
                title: "Tienes multas pendientes",
                text: `$${total.toFixed(2)} en ${pendingFines.length} multa${pendingFines.length !== 1 ? "s" : ""}. Regulariza tu cuenta.`,
                time: pendingFines[0].createdAt,
                link: "multas.html",
            });
        }

        // Ordenar por fecha descendente (más recientes arriba)
        list.sort((a, b) => new Date(b.time) - new Date(a.time));

        return list;
    }

    // ============================================
    // Fetch de datos del usuario
    // ============================================
    async function fetchUserData() {
        const user = getUser();
        if (!user) return null;

        try {
            const [loans, holds, fines] = await Promise.all([
                apiFetch(`/loans?userId=${user.id}`).catch(() => []),
                apiFetch(`/holds?userId=${user.id}`).catch(() => []),
                apiFetch(`/fines?userId=${user.id}`).catch(() => []),
            ]);
            return { loans, holds, fines };
        } catch (err) {
            console.warn("No se pudieron cargar notificaciones:", err.message);
            return null;
        }
    }

    // ============================================
    // Formato de tiempo relativo (hace X minutos/días)
    // ============================================
    function relativeTime(iso) {
        if (!iso) return "";
        const date = new Date(iso);
        const diff = (new Date() - date) / 1000; // segundos

        if (diff < 60) return "ahora";
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
        if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
        return date.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
        });
    }

    function escapeHtml(str) {
        if (str == null) return "";
        return String(str).replace(/[&<>"']/g, (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;",
            }[c])
        );
    }

    // ============================================
    // Render del panel
    // ============================================
    function renderPanel() {
        const list = document.getElementById("notifList");
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notif-empty">
                    <div class="notif-empty-icon">🔔</div>
                    <div>No tienes notificaciones pendientes</div>
                </div>
            `;
            return;
        }

        const readIds = getReadIds();

        list.innerHTML = notifications
            .map((n) => {
                const unread = !readIds.has(n.id) ? "unread" : "";
                return `
                    <a href="${n.link}" class="notif-item ${unread}" data-id="${n.id}">
                        <div class="notif-icon ${n.type}">${n.icon}</div>
                        <div class="notif-body">
                            <div class="notif-title">${escapeHtml(n.title)}</div>
                            <div class="notif-text">${escapeHtml(n.text)}</div>
                            <div class="notif-time">${relativeTime(n.time)}</div>
                        </div>
                    </a>
                `;
            })
            .join("");

        // Marcar como leída al hacer click
        list.querySelectorAll(".notif-item").forEach((el) => {
            el.addEventListener("click", () => {
                const id = el.dataset.id;
                const read = getReadIds();
                read.add(id);
                saveReadIds(read);
            });
        });
    }

    function updateBadge() {
        const bell = document.getElementById("notifBell");
        const badge = document.getElementById("notifBadge");
        const markBtn = document.getElementById("notifMarkRead");
        if (!bell || !badge) return;

        const readIds = getReadIds();
        const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

        if (unreadCount === 0) {
            badge.classList.add("hidden");
            badge.classList.remove("pulsing");
            if (markBtn) markBtn.disabled = true;
        } else {
            badge.classList.remove("hidden");
            badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
            badge.classList.add("pulsing");
            if (markBtn) markBtn.disabled = false;
        }
    }

    // ============================================
    // Toast para notificaciones nuevas
    // ============================================
    function showToast(notif) {
        let container = document.getElementById("notifToastContainer");
        if (!container) {
            container = document.createElement("div");
            container.id = "notifToastContainer";
            container.className = "notif-toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = `notif-toast ${notif.type}`;
        toast.innerHTML = `
            <div class="notif-icon ${notif.type}">${notif.icon}</div>
            <div class="notif-body">
                <div class="notif-title">${escapeHtml(notif.title)}</div>
                <div class="notif-text">${escapeHtml(notif.text)}</div>
            </div>
            <button class="notif-toast-close" aria-label="Cerrar">×</button>
        `;

        container.appendChild(toast);

        const removeToast = () => {
            toast.classList.add("leaving");
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector(".notif-toast-close").addEventListener("click", removeToast);
        setTimeout(removeToast, TOAST_DURATION);
    }

    // ============================================
    // Campana animada cuando llegan nuevas
    // ============================================
    function ringBell() {
        const bell = document.getElementById("notifBell");
        if (!bell) return;
        bell.classList.remove("has-new");
        // Forzar reflow para reiniciar la animación
        void bell.offsetWidth;
        bell.classList.add("has-new");
        setTimeout(() => bell.classList.remove("has-new"), 3500);
    }

    // ============================================
    // Refresco de datos
    // ============================================
    async function refresh(isFirstLoad = false) {
        const data = await fetchUserData();
        if (!data) return;

        const nuevas = buildNotifications(data.loans, data.holds, data.fines);
        const nuevasIds = new Set(nuevas.map((n) => n.id));

        // Detectar notificaciones que no existían antes
        const realmenteNuevas = nuevas.filter((n) => !lastSeenIds.has(n.id));

        notifications = nuevas;
        lastSeenIds = nuevasIds;

        renderPanel();
        updateBadge();

        // Solo mostrar toast y animar si NO es la primera carga
        // (en la primera carga ya hay un badge, no queremos spamear)
        if (!isFirstLoad && realmenteNuevas.length > 0) {
            ringBell();
            const readIds = getReadIds();
            realmenteNuevas
                .filter((n) => !readIds.has(n.id))
                .slice(0, 3) // máximo 3 toasts a la vez
                .forEach((n) => showToast(n));
        }
    }

    // ============================================
    // Inyección del UI en el topbar
    // ============================================
    function injectUI() {
        const topbar = document.querySelector(".app-topbar");
        if (!topbar) return false;

        // Marcar el topbar para que sea visible también en desktop
        topbar.classList.add("has-notifications");

        // Si ya existe, no duplicar
        if (document.getElementById("notifBell")) return true;

        const actions = document.createElement("div");
        actions.className = "topbar-actions";
        actions.innerHTML = `
            <button class="notif-bell" id="notifBell" aria-label="Notificaciones">
                🔔
                <span class="notif-badge hidden" id="notifBadge">0</span>
            </button>
            <div class="notif-panel" id="notifPanel" role="dialog" aria-label="Notificaciones">
                <div class="notif-panel-header">
                    <span>Notificaciones</span>
                    <button class="notif-mark-read" id="notifMarkRead" disabled>
                        Marcar todas como leídas
                    </button>
                </div>
                <div class="notif-list" id="notifList">
                    <div class="notif-loading">Cargando...</div>
                </div>
            </div>
        `;
        topbar.appendChild(actions);

        // Toggle del panel
        const bell = document.getElementById("notifBell");
        const panel = document.getElementById("notifPanel");

        bell.addEventListener("click", (e) => {
            e.stopPropagation();
            panelOpen = !panelOpen;
            panel.classList.toggle("open", panelOpen);
        });

        // Cerrar al hacer click fuera
        document.addEventListener("click", (e) => {
            if (panelOpen && !panel.contains(e.target) && e.target !== bell) {
                panelOpen = false;
                panel.classList.remove("open");
            }
        });

        // Marcar todas como leídas
        document.getElementById("notifMarkRead").addEventListener("click", () => {
            const read = getReadIds();
            notifications.forEach((n) => read.add(n.id));
            saveReadIds(read);
            renderPanel();
            updateBadge();
        });

        return true;
    }

    // ============================================
    // Inicialización
    // ============================================
    function init() {
        // Esperar a que nav.js haya pintado el topbar
        const ready = injectUI();
        if (!ready) {
            // Si el topbar aún no existe (nav.js se ejecuta asíncrono), reintentar
            setTimeout(init, 100);
            return;
        }

        // Primera carga sin toasts
        refresh(true);

        // Polling periódico
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(() => refresh(false), POLL_INTERVAL);
    }

    // Arrancar cuando el DOM está listo Y el usuario tiene sesión
    function start() {
        if (typeof getUser !== "function" || typeof apiFetch !== "function") {
            // session.js no está cargado en esta página → no hay nada que hacer
            return;
        }
        const user = getUser();
        if (!user) return; // sin sesión, sin notificaciones

        // Esperar un tick para que nav.js corra primero
        setTimeout(init, 150);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();