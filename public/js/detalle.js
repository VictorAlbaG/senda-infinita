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

function getCurrentUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setupEventListeners() {
  const favoriteBtn = document.getElementById('favorite-btn');
  favoriteBtn.addEventListener('click', onFavoriteClick);

  const reviewForm = document.getElementById('review-form');
  reviewForm.addEventListener('submit', onReviewSubmit);
  initStarRating();

  const reviewsContainer = document.getElementById('reviews-container');
  if (reviewsContainer) {
    reviewsContainer.addEventListener('click', onReviewAction);
  }

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
    const stars = buildStars(route.avgRating);
    ratingEl.textContent = `Valoración media: ${stars} ${route.avgRating.toFixed(
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
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;

  container.innerHTML = '';

  if (reviews.length === 0) {
    container.textContent = 'Esta ruta todavía no tiene reviews.';
  } else {
    reviews.forEach((review) => {
      const article = document.createElement('article');
      article.className =
        'rounded-xl border border-[#7C7C6B]/40 bg-[#A5B86C]/45 p-4 text-[#1E4C6D] shadow-sm';
      article.dataset.reviewId = String(review.id);
      const header = document.createElement('h3');
      header.className = 'text-sm font-semibold text-[#1E4C6D]';
      const body = document.createElement('p');
      body.className = 'mt-2 text-sm text-[#1E4C6D]/80';
      const meta = document.createElement('p');
      meta.className = 'mt-2 text-xs text-[#1E4C6D]/70';

      header.textContent = `${buildStars(review.rating)} ${review.rating} / 5`;
      body.textContent = review.comment || '(sin comentario)';
      const authorName = review.user?.name || 'Usuario anónimo';
      const dateStr = new Date(review.createdAt).toLocaleString('es-ES');
      meta.textContent = `Por ${authorName} el ${dateStr}`;

      article.appendChild(header);
      article.appendChild(body);
      article.appendChild(meta);

      if (currentUserId && review.user?.id === currentUserId) {
        const actions = document.createElement('div');
        actions.className = 'mt-3 flex flex-wrap items-center gap-3';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className =
          'inline-flex items-center justify-center rounded-lg border border-[#1E4C6D]/60 bg-[#A7D3E6]/70 px-3 py-1.5 text-xs font-medium text-[#1E4C6D] shadow-sm hover:bg-[#A5B86C]/70 focus:outline-none focus:ring-2 focus:ring-[#1E4C6D]/30';
        editBtn.dataset.action = 'edit-review';
        editBtn.textContent = 'Editar';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className =
          'inline-flex items-center justify-center rounded-lg bg-[#1E4C6D] px-3 py-1.5 text-xs font-semibold text-[#A7D3E6] shadow hover:bg-[#8C6E4A] focus:outline-none focus:ring-2 focus:ring-[#1E4C6D]/40';
        deleteBtn.dataset.action = 'delete-review';
        deleteBtn.textContent = 'Eliminar';

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        article.appendChild(actions);

        const editForm = document.createElement('div');
        editForm.className =
          'mt-3 hidden rounded-lg border border-[#7C7C6B]/40 bg-[#A7D3E6]/70 p-3';
        editForm.dataset.role = 'edit-review-form';

        const editTitle = document.createElement('p');
        editTitle.className = 'text-xs font-semibold text-[#1E4C6D]';
        editTitle.textContent = 'Editar tu review';

        const ratingRow = document.createElement('div');
        ratingRow.className = 'mt-2 flex flex-wrap items-center gap-3';

        const starsWrap = document.createElement('div');
        starsWrap.className = 'flex items-center gap-1';

        const ratingValue = document.createElement('span');
        ratingValue.className = 'text-xs text-[#1E4C6D]/70';

        const ratingInput = document.createElement('input');
        ratingInput.type = 'hidden';
        ratingInput.value = String(review.rating);
        ratingInput.dataset.role = 'edit-rating';

        for (let i = 1; i <= 5; i += 1) {
          const starBtn = document.createElement('button');
          starBtn.type = 'button';
          starBtn.className =
            'review-star text-xl text-[#1E4C6D]/40 transition hover:text-[#8C6E4A]';
          starBtn.dataset.value = String(i);
          starBtn.setAttribute('aria-label', `${i} estrellas`);
          starBtn.textContent = '★';
          starsWrap.appendChild(starBtn);
        }

        ratingRow.appendChild(starsWrap);
        ratingRow.appendChild(ratingValue);
        ratingRow.appendChild(ratingInput);

        const commentInput = document.createElement('textarea');
        commentInput.className =
          'mt-3 w-full rounded-lg border border-[#7C7C6B]/60 bg-[#A7D3E6]/70 px-3 py-2 text-sm text-[#1E4C6D] shadow-sm placeholder:text-[#7C7C6B] focus:border-[#6BAA3D] focus:outline-none focus:ring-2 focus:ring-[#6BAA3D]/40';
        commentInput.rows = 3;
        commentInput.placeholder = 'Actualiza tu comentario';
        commentInput.value = review.comment || '';
        commentInput.dataset.role = 'edit-comment';

        const formMessage = document.createElement('p');
        formMessage.className = 'mt-2 text-xs text-[#1E4C6D]/70';
        formMessage.dataset.role = 'edit-message';

        const formActions = document.createElement('div');
        formActions.className = 'mt-3 flex flex-wrap items-center gap-3';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className =
          'inline-flex items-center justify-center rounded-lg bg-[#1E4C6D] px-3 py-1.5 text-xs font-semibold text-[#A7D3E6] shadow hover:bg-[#6BAA3D] focus:outline-none focus:ring-2 focus:ring-[#1E4C6D]/40';
        saveBtn.dataset.action = 'save-review';
        saveBtn.textContent = 'Guardar';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className =
          'inline-flex items-center justify-center rounded-lg border border-[#1E4C6D]/60 bg-[#A7D3E6]/70 px-3 py-1.5 text-xs font-medium text-[#1E4C6D] shadow-sm hover:bg-[#A5B86C]/70 focus:outline-none focus:ring-2 focus:ring-[#1E4C6D]/30';
        cancelBtn.dataset.action = 'cancel-edit-review';
        cancelBtn.textContent = 'Cancelar';

        formActions.appendChild(saveBtn);
        formActions.appendChild(cancelBtn);

        editForm.appendChild(editTitle);
        editForm.appendChild(ratingRow);
        editForm.appendChild(commentInput);
        editForm.appendChild(formMessage);
        editForm.appendChild(formActions);

        article.appendChild(editForm);

        setupInlineStarRating(starsWrap, ratingValue, ratingInput, review.rating);
      }

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

function buildStars(value) {
  const rating = Math.max(0, Math.min(5, Math.round(value)));
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function setupInlineStarRating(container, valueEl, inputEl, initialValue) {
  const buttons = Array.from(container.querySelectorAll('button'));
  let currentValue = initialValue;

  const render = (value) => {
    buttons.forEach((button) => {
      const buttonValue = Number(button.dataset.value);
      const isActive = buttonValue <= value;
      button.classList.toggle('text-[#8C6E4A]', isActive);
      button.classList.toggle('text-[#1E4C6D]/40', !isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (valueEl) {
      valueEl.textContent = value ? `${value} / 5` : 'Sin valoración';
    }
    if (inputEl) {
      inputEl.value = value ? String(value) : '';
    }
  };

  render(currentValue);

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = Number(button.dataset.value);
      currentValue = value;
      render(value);
    });
  });
}

async function onReviewAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const article = button.closest('article');
  const reviewId = article?.dataset.reviewId;
  if (!action || !reviewId) return;

  const token = getToken();
  if (!token) {
    alert('Necesitas iniciar sesión para modificar tu review.');
    return;
  }

  if (action === 'edit-review') {
    const form = article.querySelector('[data-role="edit-review-form"]');
    if (form) {
      form.classList.toggle('hidden');
    }
    return;
  }

  if (action === 'cancel-edit-review') {
    const form = article.querySelector('[data-role="edit-review-form"]');
    if (form) {
      form.classList.add('hidden');
    }
    return;
  }

  if (action === 'save-review') {
    const form = article.querySelector('[data-role="edit-review-form"]');
    if (!form) return;

    const ratingInput = form.querySelector('[data-role="edit-rating"]');
    const commentInput = form.querySelector('[data-role="edit-comment"]');
    const msgEl = form.querySelector('[data-role="edit-message"]');

    const ratingRaw = ratingInput?.value || '';
    const rating = Number(ratingRaw);
    const comment = commentInput?.value.trim() || '';

    if (!ratingRaw || Number.isNaN(rating) || rating < 1 || rating > 5) {
      if (msgEl) {
        msgEl.textContent = 'Selecciona una valoración válida.';
      }
      return;
    }

    if (msgEl) {
      msgEl.textContent = 'Guardando cambios...';
    }

    try {
      const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
        method: 'PATCH',
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

      if (msgEl) {
        msgEl.textContent = 'Review actualizada.';
      }
      loadReviews(reviewsPage);
      loadRouteDetail(routeData.slug);
    } catch (error) {
      console.error('Error al actualizar review:', error);
      if (msgEl) {
        msgEl.textContent = error.message || 'No se pudo actualizar la review.';
      }
    }
    return;
  }

  if (action === 'delete-review') {
    const confirmed = window.confirm('¿Eliminar tu review?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      loadReviews(reviewsPage);
      loadRouteDetail(routeData.slug);
    } catch (error) {
      console.error('Error al eliminar review:', error);
      alert(error.message || 'No se pudo eliminar la review.');
    }
  }
}

let selectedRating = 0;

function initStarRating() {
  const container = document.getElementById('review-rating-stars');
  const input = document.getElementById('review-rating');
  const valueEl = document.getElementById('review-rating-value');
  if (!container || !input) return;

  const buttons = Array.from(container.querySelectorAll('.review-star'));
  const render = (value, isPreview) => {
    buttons.forEach((button) => {
      const buttonValue = Number(button.dataset.value);
      const isActive = buttonValue <= value;
      button.classList.toggle('text-[#8C6E4A]', isActive);
      button.classList.toggle('text-[#1E4C6D]/40', !isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (valueEl) {
      valueEl.textContent = value ? `${value} / 5` : 'Sin valoración';
    }

    if (!isPreview) {
      input.value = value ? String(value) : '';
      selectedRating = value;
    }
  };

  render(0, false);

  buttons.forEach((button) => {
    button.addEventListener('mouseenter', () => {
      render(Number(button.dataset.value), true);
    });

    button.addEventListener('click', () => {
      render(Number(button.dataset.value), false);
    });
  });

  container.addEventListener('mouseleave', () => {
    render(selectedRating, true);
  });
}

function resetStarRating() {
  const container = document.getElementById('review-rating-stars');
  const input = document.getElementById('review-rating');
  const valueEl = document.getElementById('review-rating-value');
  if (!container || !input) return;

  const buttons = Array.from(container.querySelectorAll('.review-star'));
  selectedRating = 0;
  input.value = '';
  buttons.forEach((button) => {
    button.classList.remove('text-[#8C6E4A]');
    button.classList.add('text-[#1E4C6D]/40');
    button.setAttribute('aria-pressed', 'false');
  });
  if (valueEl) {
    valueEl.textContent = 'Sin valoración';
  }
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

  const ratingRaw = ratingInput.value;
  const rating = Number(ratingRaw);
  const comment = commentInput.value.trim();

  if (!ratingRaw || Number.isNaN(rating) || rating < 1 || rating > 5) {
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

    resetStarRating();
    commentInput.value = '';
    msgEl.textContent = 'Review enviada correctamente.';

    // Recargar reviews y ruta (para actualizar avgRating)
    loadReviews(1);
    loadRouteDetail(routeData.slug);
  } catch (error) {
    console.error('Error al enviar review:', error);
    msgEl.textContent = error.message || 'Ha ocurrido un error al enviar la review.';
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
