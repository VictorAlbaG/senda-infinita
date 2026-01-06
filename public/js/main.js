const API_BASE = "/api";

const state = {
  page: 1,
  q: "",
  difficulty: "",
};

let routesContainer;
let statusElement;
let paginationSection;
let prevPageBtn;
let nextPageBtn;
let paginationInfo;

document.addEventListener("DOMContentLoaded", () => {
  routesContainer = document.getElementById("routes-container");
  statusElement = document.getElementById("routes-status");
  paginationSection = document.getElementById("pagination");
  prevPageBtn = document.getElementById("prev-page");
  nextPageBtn = document.getElementById("next-page");
  paginationInfo = document.getElementById("pagination-info");

  const filtersForm = document.getElementById("filters-form");
  const searchInput = document.getElementById("search");
  const difficultySelect = document.getElementById("difficulty");

  // Manejar envío del formulario de filtros
  filtersForm.addEventListener("submit", (event) => {
    event.preventDefault(); // Evita recargar la página

    state.q = searchInput.value.trim();
    state.difficulty = difficultySelect.value;
    state.page = 1;

    fetchAndRenderRoutes();
  });

  // Paginación
  prevPageBtn.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      fetchAndRenderRoutes();
    }
  });

  nextPageBtn.addEventListener("click", () => {
    state.page += 1;
    fetchAndRenderRoutes();
  });

  // Cargar rutas iniciales
  fetchAndRenderRoutes();
});

async function fetchAndRenderRoutes() {
  try {
    setStatus("Cargando rutas...", false);
    routesContainer.innerHTML = "";

    const params = new URLSearchParams();

    if (state.q) params.set("q", state.q);
    if (state.difficulty) params.set("difficulty", state.difficulty);
    params.set("page", String(state.page));

    const url = `${API_BASE}/routes?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();

    const routes = result.data || [];
    const pagination = result.pagination || {
      page: 1,
      totalPages: 1,
      total: routes.length,
    };

    if (routes.length === 0) {
      setStatus("No se han encontrado rutas con esos filtros.", false);
      renderPagination(pagination);
      return;
    }

    setStatus("", false);
    renderRoutes(routes);
    renderPagination(pagination);
  } catch (error) {
    console.error("Error al cargar rutas:", error);
    setStatus(
      "Ha ocurrido un error al cargar las rutas. Inténtalo más tarde.",
      true
    );
    routesContainer.innerHTML = "";
    renderPagination({ page: 1, totalPages: 1, total: 0 });
  }
}

function renderRoutes(routes) {
  routesContainer.innerHTML = "";

  routes.forEach((route) => {
    const card = document.createElement("article");
    card.className = "route-card";

    const title = document.createElement("h3");
    title.textContent = route.title;

    const meta = document.createElement("p");
    const distance =
      route.distanceKm != null
        ? `${route.distanceKm.toFixed(1)} km`
        : "Distancia no disponible";
    const ascent =
      route.ascentM != null ? `${route.ascentM} m +` : "Desnivel no disponible";
    const difficulty = route.difficulty || "SIN CLASIFICAR";

    meta.textContent = `${distance} · ${ascent} · Dificultad: ${difficulty}`;

    const description = document.createElement("p");
    description.textContent = route.description || "Sin descripción.";

    const link = document.createElement("a");
    link.href = `detalle.html?slug=${encodeURIComponent(route.slug)}`;
    link.textContent = "Ver detalle";

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(description);
    card.appendChild(link);

    routesContainer.appendChild(card);
  });
}

function renderPagination(pagination) {
  const { page, totalPages, total } = pagination;

  state.page = page;

  if (totalPages <= 1) {
    paginationSection.style.display = "none";
    return;
  }

  paginationSection.style.display = "block";

  prevPageBtn.disabled = page <= 1;
  nextPageBtn.disabled = page >= totalPages;

  paginationInfo.textContent = `Página ${page} de ${totalPages} (total rutas: ${total})`;
}

function setStatus(message, isError) {
  statusElement.textContent = message || "";
  if (!message) {
    statusElement.style.display = "none";
  } else {
    statusElement.style.display = "block";
    statusElement.style.color = isError ? "red" : "inherit";
  }
}
