const API_BASE = '/api';

let routeData = null;
let mapInstance = null;
let reviewsPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  const slug = getSlugFromUrl();

  if (!slug) {
    alert('No se ha especificado ninguna ruta.');
    return;
  }

  setupEventListeners();
  loadRouteDetail(slug);
});

function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

function getToken() {
  return localStorage.getItem('token') || null;
}

function setupEventListeners() {
  const favoriteBtn = document.getElementById('favorite-btn');
  favoriteBtn.addEventListener('click', onFavoriteClick);

  const reviewForm = document.getElementById('review-form');
  reviewForm.addEventListener('submit', onReviewSubmit);

  const reviewsPrevBtn = document.getElementById('reviews-prev');
  const reviewsNextBtn = document.getElementById('reviews-next');
  reviewsPrevBtn.addEventListener('click', () => changeReviewsPage(-1));
  reviewsNextBtn.addEventListener('click', () => changeReviewsPage(1));

  const photoForm = document.getElementById('photo-form');
  photoForm.addEventListener('submit', onPhotoSubmit);
}

async function loadRouteDetail(slug) {
  try {
    const url = `${API_BASE}/routes/${encodeURIComponent(slug)}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    routeData = data;

    renderRouteInfo(data);
    initMap(data);
    loadPhotos();
    loadReviews(1);
    initFavoriteState();
  } catch (error) {
    console.error('Error al cargar detalle de ruta:', error);
    alert('No se ha podido cargar la ruta. Inténtalo más tarde.');
  }
}

/* --------------------------- Render de información --------------------------- */

function renderRouteInfo(route) {
  const titleEl = document.getElementById('route-title');
  const metaEl = document.getElementById('route-meta');
  const descEl = document.getElementById('route-description');
  const ratingEl = document.getElementById('route-rating');

  const difficultyLabels = {
    EASY: "Fácil",
    MODERATE: "Moderada",
    HARD: "Difícil",
  };

  titleEl.textContent = route.title;

  const distance =
    route.distanceKm != null ? `${route.distanceKm.toFixed(1)} km` : 'Distancia no disponible';
  const ascent =
    route.ascentM != null ? `${route.ascentM} m +` : 'Desnivel no disponible';
  const difficulty = route.difficulty || 'SIN CLASIFICAR';

  const diffText = difficultyLabels[difficulty] ?? difficulty;
  metaEl.textContent = `${distance} | ${ascent} | Dificultad: ${diffText}`;

  descEl.textContent = route.description || 'Sin descripción.';

  if (route.reviewsCount && route.reviewsCount > 0 && route.avgRating != null) {
    ratingEl.textContent = `Valoración media: ${route.avgRating.toFixed(
      1
    )} / 5 (${route.reviewsCount} opiniones)`;
  } else {
    ratingEl.textContent = 'Esta ruta aún no tiene opiniones.';
  }
}

/* ------------------------------- Mapa (Leaflet) ----------------------------- */

function initMap(route) {
  const mapStatus = document.getElementById('map-status');

  if (!route.waypoints || route.waypoints.length === 0) {
    mapStatus.textContent = 'No hay datos de trazado para esta ruta.';
    return;
  }

  const coords = route.waypoints.map((w) => [w.lat, w.lng]);

  if (!mapInstance) {
    mapInstance = L.map('map');
  }

  // OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mapInstance);

  const polyline = L.polyline(coords, { weight: 4 });
  polyline.addTo(mapInstance);

  mapInstance.fitBounds(polyline.getBounds());

  mapStatus.textContent = '';
}

/* ----------------------------- Favoritos ------------------------------------ */

async function initFavoriteState() {
  const token = getToken();
  const favoriteBtn = document.getElementById('favorite-btn');
  const favoriteStatus = document.getElementById('favorite-status');

  // Si no hay token, deshabilitamos y mostramos mensaje
  if (!token) {
    favoriteBtn.disabled = true;
    favoriteBtn.textContent = 'Inicia sesión para marcar como favorita';
    favoriteStatus.textContent = '';
    return;
  }

  favoriteBtn.disabled = false;
  favoriteStatus.textContent = '';

  try {
    const response = await fetch(`${API_BASE}/me/favorites`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    const favorites = data.data || [];

    const isFav = favorites.some((fav) => fav.route.id === routeData.id);
    updateFavoriteButton(isFav);
  } catch (error) {
    console.error('Error al comprobar favoritos:', error);
    favoriteStatus.textContent = 'No se ha podido comprobar si la ruta es favorita.';
  }
}

async function onFavoriteClick() {
  const token = getToken();
  const favoriteBtn = document.getElementById('favorite-btn');
  const favoriteStatus = document.getElementById('favorite-status');

  if (!token) {
    alert('Tienes que iniciar sesión para usar favoritos.');
    return;
  }

  favoriteBtn.disabled = true;
  favoriteStatus.textContent = 'Actualizando favorito...';

  try {
    const response = await fetch(`${API_BASE}/routes/${routeData.id}/favorite`, {
      method: 'POST', // POST hace toggle
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();

    updateFavoriteButton(result.isFavorite);
    favoriteStatus.textContent = result.message || '';
  } catch (error) {
    console.error('Error al cambiar favorito:', error);
    favoriteStatus.textContent = 'Ha ocurrido un error al cambiar favorito.';
  } finally {
    favoriteBtn.disabled = false;
  }
}

function updateFavoriteButton(isFavorite) {
  const favoriteBtn = document.getElementById('favorite-btn');

  if (isFavorite) {
    favoriteBtn.textContent = 'Quitar de favoritos';
  } else {
    favoriteBtn.textContent = 'Añadir a favoritos';
  }
}

/* ----------------------------- Reviews -------------------------------------- */

async function loadReviews(page) {
  try {
    const routeId = routeData.id;
    const url = `${API_BASE}/routes/${routeId}/reviews?page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const reviews = result.data || [];
    const pagination = result.pagination || {
      page: 1,
      totalPages: 1,
      total: reviews.length,
    };

    reviewsPage = pagination.page;
    renderReviews(reviews, pagination);
  } catch (error) {
    console.error('Error al cargar reviews:', error);
    const container = document.getElementById('reviews-container');
    container.textContent = 'No se han podido cargar las opiniones.';
  }
}

function renderReviews(reviews, pagination) {
  const container = document.getElementById('reviews-container');
  const info = document.getElementById('reviews-pagination-info');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');

  container.innerHTML = '';

  if (reviews.length === 0) {
    container.textContent = 'Esta ruta todavía no tiene reviews.';
  } else {
    reviews.forEach((review) => {
      const article = document.createElement('article');
      article.className =
        'rounded-xl border border-[#7C7C6B]/40 bg-[#A5B86C]/45 p-4 text-[#1E4C6D] shadow-sm';
      const header = document.createElement('h3');
      header.className = 'text-sm font-semibold text-[#1E4C6D]';
      const body = document.createElement('p');
      body.className = 'mt-2 text-sm text-[#1E4C6D]/80';
      const meta = document.createElement('p');
      meta.className = 'mt-2 text-xs text-[#1E4C6D]/70';

      header.textContent = `⭐ ${review.rating} / 5`;
      body.textContent = review.comment || '(sin comentario)';
      const authorName = review.user?.name || 'Usuario anónimo';
      const dateStr = new Date(review.createdAt).toLocaleString('es-ES');
      meta.textContent = `Por ${authorName} el ${dateStr}`;

      article.appendChild(header);
      article.appendChild(body);
      article.appendChild(meta);

      container.appendChild(article);
    });
  }

  const { page, totalPages, total } = pagination;
  info.textContent = `Página ${page} de ${totalPages} (${total} opiniones)`;

  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

function changeReviewsPage(delta) {
  const newPage = reviewsPage + delta;
  if (newPage < 1) return;
  loadReviews(newPage);
}

async function onReviewSubmit(event) {
  event.preventDefault();

  const token = getToken();
  const msgEl = document.getElementById('review-form-message');

  if (!token) {
    msgEl.textContent = 'Necesitas iniciar sesión para publicar una review.';
    return;
  }

  const ratingInput = document.getElementById('review-rating');
  const commentInput = document.getElementById('review-comment');

  const rating = ratingInput.value;
  const comment = commentInput.value.trim();

  if (!rating) {
    msgEl.textContent = 'Introduce una valoración entre 1 y 5.';
    return;
  }

  msgEl.textContent = 'Enviando review...';

  try {
    const response = await fetch(`${API_BASE}/routes/${routeData.id}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, comment }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error HTTP ${response.status}`);
    }

    ratingInput.value = '';
    commentInput.value = '';
    msgEl.textContent = 'Review enviada correctamente.';

    // Recargar reviews y ruta (para actualizar avgRating)
    loadReviews(1);
    loadRouteDetail(routeData.slug);
  } catch (error) {
    console.error('Error al enviar review:', error);
    msgEl.textContent = 'Ha ocurrido un error al enviar la review.';
  }
}

/* ----------------------------- Fotos ---------------------------------------- */

async function loadPhotos() {
  try {
    const routeId = routeData.id;
    const url = `${API_BASE}/routes/${routeId}/photos`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const photos = result.data || [];

    renderPhotos(photos);
  } catch (error) {
    console.error('Error al cargar fotos:', error);
    const container = document.getElementById('photos-container');
    container.textContent = 'No se han podido cargar las fotos.';
  }
}

function renderPhotos(photos) {
  const container = document.getElementById('photos-container');
  container.innerHTML = '';

  if (photos.length === 0) {
    container.textContent = 'Todavía no hay fotos para esta ruta.';
    return;
  }

  photos.forEach((photo) => {
    const figure = document.createElement('figure');
    figure.className =
      'rounded-xl border border-[#7C7C6B]/40 bg-[#A7D3E6]/70 p-3 shadow-sm';
    const img = document.createElement('img');
    img.className =
      'w-full max-w-[240px] rounded-lg border border-[#7C7C6B]/40';
    const caption = document.createElement('figcaption');
    caption.className = 'mt-2 text-xs text-[#1E4C6D]/70';

    img.src = photo.url;
    img.alt = `Foto de la ruta`;

    const authorName = photo.user?.name || 'Usuario';
    const dateStr = new Date(photo.createdAt).toLocaleString('es-ES');
    caption.textContent = `Por ${authorName} el ${dateStr}`;

    figure.appendChild(img);
    figure.appendChild(caption);
    container.appendChild(figure);
  });
}

async function onPhotoSubmit(event) {
  event.preventDefault();

  const token = getToken();
  const msgEl = document.getElementById('photo-form-message');
  const input = document.getElementById('photo-input');

  if (!token) {
    msgEl.textContent = 'Necesitas iniciar sesión para subir fotos.';
    return;
  }

  if (!input.files || input.files.length === 0) {
    msgEl.textContent = 'Selecciona una imagen antes de subir.';
    return;
  }

  const formData = new FormData();
  formData.append('photo', input.files[0]);

  msgEl.textContent = 'Subiendo foto...';

  try {
    const response = await fetch(`${API_BASE}/routes/${routeData.id}/photos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error HTTP ${response.status}`);
    }

    input.value = '';
    msgEl.textContent = 'Foto subida correctamente.';

    // Recargar fotos
    loadPhotos();
  } catch (error) {
    console.error('Error al subir foto:', error);
    msgEl.textContent = 'Ha ocurrido un error al subir la foto.';
  }
}
