const API_ADMIN_BASE = '/api/admin';
const API_ROUTES_BASE = '/api/routes';

function getCurrentUser() {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

function setStatus(message, isError) {
  const el = document.getElementById('admin-status');
  if (!el) return;
  el.textContent = message || '';
  el.style.color = isError ? '#b91c1c' : '';
}

function ensureAdmin() {
  const token = getToken();
  const user = getCurrentUser();
  if (!token || !user || user.role !== 'ADMIN') {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!ensureAdmin()) return;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = 'login.html';
    });
  }

  const createForm = document.getElementById('route-create-form');
  if (createForm) {
    createForm.addEventListener('submit', onCreateRoute);
  }

  const importForm = document.getElementById('route-import-form');
  if (importForm) {
    importForm.addEventListener('submit', onImportRoute);
  }

  const usersContainer = document.getElementById('users-container');
  const reviewsContainer = document.getElementById('reviews-container');
  const routesContainer = document.getElementById('routes-container');

  if (usersContainer) {
    usersContainer.addEventListener('click', onUserAction);
  }

  if (reviewsContainer) {
    reviewsContainer.addEventListener('click', onReviewAction);
  }

  if (routesContainer) {
    routesContainer.addEventListener('click', onRouteAction);
  }

  loadAll();
});

async function loadAll() {
  setStatus('Cargando panel...', false);
  await Promise.all([loadUsers(), loadReviews(), loadRoutes()]);
  setStatus('', false);
}

async function loadUsers() {
  const container = document.getElementById('users-container');
  if (!container) return;

  container.textContent = 'Cargando usuarios...';

  try {
    const response = await fetch(`${API_ADMIN_BASE}/users`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const users = result.data || [];

    if (users.length === 0) {
      container.textContent = 'No hay usuarios.';
      return;
    }

    const table = document.createElement('table');
    table.className = 'admin-table';

    const header = document.createElement('tr');
    ['Nombre', 'Email', 'Rol', 'Alta', 'Acciones'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      header.appendChild(th);
    });
    table.appendChild(header);

    users.forEach((user) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = user.name;
      const emailCell = document.createElement('td');
      emailCell.textContent = user.email;
      const roleCell = document.createElement('td');
      roleCell.textContent = user.role;
      const dateCell = document.createElement('td');
      dateCell.textContent = new Date(user.createdAt).toLocaleDateString('es-ES');

      const actionsCell = document.createElement('td');
      actionsCell.className = 'space-y-3';

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'admin-button ghost';
      toggleBtn.dataset.action = 'toggle-role';
      toggleBtn.dataset.id = String(user.id);
      toggleBtn.dataset.role = user.role;
      toggleBtn.textContent = user.role === 'ADMIN' ? 'Hacer usuario' : 'Hacer admin';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'admin-button danger';
      deleteBtn.dataset.action = 'delete-user';
      deleteBtn.dataset.id = String(user.id);
      deleteBtn.textContent = 'Eliminar';

      actionsCell.appendChild(toggleBtn);
      actionsCell.appendChild(deleteBtn);

      row.appendChild(nameCell);
      row.appendChild(emailCell);
      row.appendChild(roleCell);
      row.appendChild(dateCell);
      row.appendChild(actionsCell);

      table.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(table);
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    container.textContent = 'No se han podido cargar los usuarios.';
  }
}

async function onUserAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const userId = button.dataset.id;
  if (!action || !userId) return;

  if (action === 'toggle-role') {
    const currentRole = button.dataset.role;
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';

    try {
      const response = await fetch(`${API_ADMIN_BASE}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      await loadUsers();
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      setStatus(error.message || 'No se pudo actualizar el rol.', true);
    }
  }

  if (action === 'delete-user') {
    const confirmed = window.confirm('¿Eliminar este usuario? Se perderán sus datos asociados.');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_ADMIN_BASE}/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      await loadUsers();
      await loadReviews();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      setStatus(error.message || 'No se pudo eliminar el usuario.', true);
    }
  }
}

async function loadReviews() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  container.textContent = 'Cargando reviews...';

  try {
    const response = await fetch(`${API_ADMIN_BASE}/reviews`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const reviews = result.data || [];

    if (reviews.length === 0) {
      container.textContent = 'No hay reviews.';
      return;
    }

    const table = document.createElement('table');
    table.className = 'admin-table';

    const header = document.createElement('tr');
    ['Ruta', 'Usuario', 'Rating', 'Comentario', 'Fecha', 'Acciones'].forEach((text) => {
      const th = document.createElement('th');
      th.textContent = text;
      header.appendChild(th);
    });
    table.appendChild(header);

    reviews.forEach((review) => {
      const row = document.createElement('tr');

      const routeCell = document.createElement('td');
      routeCell.textContent = review.route?.title || 'Ruta';
      const userCell = document.createElement('td');
      userCell.textContent = review.user?.name || review.user?.email || 'Usuario';
      const ratingCell = document.createElement('td');
      ratingCell.textContent = String(review.rating);
      const commentCell = document.createElement('td');
      commentCell.textContent = review.comment || '(sin comentario)';
      const dateCell = document.createElement('td');
      dateCell.textContent = new Date(review.createdAt).toLocaleDateString('es-ES');

      const actionsCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'admin-button danger';
      deleteBtn.dataset.action = 'delete-review';
      deleteBtn.dataset.id = String(review.id);
      deleteBtn.textContent = 'Eliminar';
      actionsCell.appendChild(deleteBtn);

      row.appendChild(routeCell);
      row.appendChild(userCell);
      row.appendChild(ratingCell);
      row.appendChild(commentCell);
      row.appendChild(dateCell);
      row.appendChild(actionsCell);

      table.appendChild(row);
    });

    container.innerHTML = '';
    container.appendChild(table);
  } catch (error) {
    console.error('Error al cargar reviews:', error);
    container.textContent = 'No se han podido cargar las reviews.';
  }
}

async function onReviewAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const reviewId = button.dataset.id;
  if (action !== 'delete-review' || !reviewId) return;

  const confirmed = window.confirm('¿Eliminar esta review?');
  if (!confirmed) return;

  try {
    const response = await fetch(`${API_ADMIN_BASE}/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error HTTP ${response.status}`);
    }

    await loadReviews();
  } catch (error) {
    console.error('Error al eliminar review:', error);
    setStatus(error.message || 'No se pudo eliminar la review.', true);
  }
}

async function loadRoutes() {
  const container = document.getElementById('routes-container');
  if (!container) return;

  container.textContent = 'Cargando rutas...';

  try {
    const response = await fetch(`${API_ADMIN_BASE}/routes`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const routes = result.data || [];

    if (routes.length === 0) {
      container.textContent = 'No hay rutas.';
      return;
    }

    container.innerHTML = '';

    routes.forEach((route) => {
      const card = document.createElement('div');
      card.className = 'admin-card admin-grid admin-grid-3';
      card.dataset.id = String(route.id);

      card.innerHTML = `
        <input class="admin-input" name="title" value="${escapeValue(route.title)}" />
        <select class="admin-input" name="difficulty">
          <option value="EASY" ${route.difficulty === 'EASY' ? 'selected' : ''}>EASY</option>
          <option value="MODERATE" ${route.difficulty === 'MODERATE' ? 'selected' : ''}>MODERATE</option>
          <option value="HARD" ${route.difficulty === 'HARD' ? 'selected' : ''}>HARD</option>
        </select>
        <input class="admin-input" name="description" value="${escapeValue(route.description || '')}" />
        <input class="admin-input" type="number" step="0.1" name="distanceKm" value="${route.distanceKm ?? ''}" />
        <input class="admin-input" type="number" step="1" name="ascentM" value="${route.ascentM ?? ''}" />
        <input class="admin-input" type="number" step="0.000001" name="startLat" value="${route.startLat ?? ''}" />
        <input class="admin-input" type="number" step="0.000001" name="startLng" value="${route.startLng ?? ''}" />
        <input class="admin-input" type="number" step="0.000001" name="endLat" value="${route.endLat ?? ''}" />
        <input class="admin-input" type="number" step="0.000001" name="endLng" value="${route.endLng ?? ''}" />
        <div class="flex items-center gap-3">
          <button class="admin-button" data-action="save-route" data-id="${route.id}" type="button">Guardar</button>
          <button class="admin-button danger" data-action="delete-route" data-id="${route.id}" type="button">Eliminar</button>
          <span class="text-xs text-slate-600">${route.source}</span>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar rutas:', error);
    container.textContent = 'No se han podido cargar las rutas.';
  }
}

async function onRouteAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const routeId = button.dataset.id;
  if (!action || !routeId) return;

  if (action === 'save-route') {
    const card = button.closest('[data-id]');
    if (!card) return;

    const payload = readRoutePayload(card);

    try {
      const response = await fetch(`${API_ADMIN_BASE}/routes/${routeId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      await loadRoutes();
    } catch (error) {
      console.error('Error al actualizar ruta:', error);
      setStatus(error.message || 'No se pudo actualizar la ruta.', true);
    }
  }

  if (action === 'delete-route') {
    const confirmed = window.confirm('¿Eliminar esta ruta? Se perderá su contenido asociado.');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_ADMIN_BASE}/routes/${routeId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error HTTP ${response.status}`);
      }

      await loadRoutes();
      await loadReviews();
    } catch (error) {
      console.error('Error al eliminar ruta:', error);
      setStatus(error.message || 'No se pudo eliminar la ruta.', true);
    }
  }
}

function readRoutePayload(card) {
  const getValue = (name) => card.querySelector(`[name="${name}"]`)?.value;

  return {
    title: getValue('title')?.trim(),
    difficulty: getValue('difficulty'),
    description: getValue('description')?.trim(),
    distanceKm: normalizeNumber(getValue('distanceKm')),
    ascentM: normalizeNumber(getValue('ascentM')),
    startLat: normalizeNumber(getValue('startLat')),
    startLng: normalizeNumber(getValue('startLng')),
    endLat: normalizeNumber(getValue('endLat')),
    endLng: normalizeNumber(getValue('endLng')),
  };
}

async function onCreateRoute(event) {
  event.preventDefault();
  const form = event.target;
  const message = document.getElementById('route-create-message');

  const payload = Object.fromEntries(new FormData(form).entries());
  payload.distanceKm = normalizeNumber(payload.distanceKm);
  payload.ascentM = normalizeNumber(payload.ascentM);
  payload.startLat = normalizeNumber(payload.startLat);
  payload.startLng = normalizeNumber(payload.startLng);
  payload.endLat = normalizeNumber(payload.endLat);
  payload.endLng = normalizeNumber(payload.endLng);

  if (message) message.textContent = 'Creando ruta...';

  try {
    const response = await fetch(`${API_ADMIN_BASE}/routes`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error HTTP ${response.status}`);
    }

    form.reset();
    if (message) message.textContent = 'Ruta creada.';
    await loadRoutes();
  } catch (error) {
    console.error('Error al crear ruta:', error);
    if (message) message.textContent = error.message || 'No se pudo crear la ruta.';
  }
}

async function onImportRoute(event) {
  event.preventDefault();
  const form = event.target;
  const message = document.getElementById('route-import-message');

  const payload = Object.fromEntries(new FormData(form).entries());

  if (message) message.textContent = 'Importando ruta...';

  try {
    const response = await fetch(`${API_ROUTES_BASE}/import/ors`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error HTTP ${response.status}`);
    }

    form.reset();
    if (message) message.textContent = 'Ruta importada.';
    await loadRoutes();
  } catch (error) {
    console.error('Error al importar ruta:', error);
    if (message) message.textContent = error.message || 'No se pudo importar la ruta.';
  }
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function escapeValue(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
