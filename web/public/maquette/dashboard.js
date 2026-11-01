/**
 * SAMA HOME — Interactions visuelles de la Maquette Tableau de bord
 * Léger, accessible, sans framework externe.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Menu Mobile (Ouverture / Fermeture du panneau latéral)
  const mobileToggleBtn = document.getElementById("mobileToggleBtn");
  const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
  const sidebar = document.getElementById("appSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  function openSidebar() {
    sidebar.classList.add("open");
    backdrop.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    backdrop.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (mobileToggleBtn) mobileToggleBtn.addEventListener("click", openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeSidebar);
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  // 2. Basculeur de Thème (Clair / Sombre)
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const htmlRoot = document.documentElement;

  // Restaurer préférence ou défaut clair
  const currentTheme = localStorage.getItem("sama_preview_theme") || "light";
  if (currentTheme === "dark") {
    htmlRoot.setAttribute("data-theme", "dark");
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const isDark = htmlRoot.getAttribute("data-theme") === "dark";
      if (isDark) {
        htmlRoot.removeAttribute("data-theme");
        localStorage.setItem("sama_preview_theme", "light");
      } else {
        htmlRoot.setAttribute("data-theme", "dark");
        localStorage.setItem("sama_preview_theme", "dark");
      }
    });
  }

  // 3. Filtrage du Rack des Chambres (Tous, Disponibles, Occupés, Entretien)
  const filterTabs = document.querySelectorAll(".filter-tab");
  const roomTiles = document.querySelectorAll(".room-tile");

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      filterTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const filterValue = tab.getAttribute("data-filter");

      roomTiles.forEach((tile) => {
        if (filterValue === "all") {
          tile.style.display = "flex";
        } else if (tile.classList.contains(filterValue)) {
          tile.style.display = "flex";
        } else {
          tile.style.display = "none";
        }
      });
    });
  });

  // 4. Interaction Simulation Check-in Rapide
  const checkinForm = document.getElementById("quickCheckinForm");
  const roomSelect = document.getElementById("checkinRoomSelect");
  const tariffInput = document.getElementById("checkinTariffInput");

  if (roomSelect && tariffInput) {
    roomSelect.addEventListener("change", (e) => {
      const selected = e.target.selectedOptions[0];
      const price = selected?.getAttribute("data-price");
      if (price) {
        tariffInput.value = price + " FCFA";
      }
    });
  }

  if (checkinForm) {
    checkinForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("✅ Check-in enregistré avec succès ! Quittance générée.");
    });
  }
});
