const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // Si no estás logueado, te mandamos al login
    window.location.href = 'login.html';
    return;
  }

  // Ya se ha ejecutado updateAuthUi() desde auth.js
  loadProfileBasic();
  loadFavorites();
  loadMyReviews();
});

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    Authorization: `Bearer ${token}`,
  };
}

/* --------------------------- Info básica usuario ---------------------------- */

async function loadProfileBasic() {
  try {
    const response = await fetch(`${API_BASE}/me`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    const user = data.user || {};

    const el = document.getElementById('profile-basic');
    el.textContent = `Nombre: ${user.name || '-'} · Email: ${
      user.email || '-'
    } · Rol: ${user.role || 'USER'}`;
  } catch (error) {
    console.error('Error al cargar datos de perfil:', error);
    const el = document.getElementById('profile-basic');
    el.textContent = 'No se han podido cargar tus datos de perfil.';
  }
}

/* ---------------------------- Favoritos ------------------------------------- */

async function loadFavorites() {
  try {
    const response = await fetch(`${API_BASE}/me/favorites`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const favorites = result.data || [];

    const container = document.getElementById('profile-favorites');
    container.innerHTML = '';

    if (favorites.length === 0) {
      container.textContent = 'No tienes rutas favoritas todavía.';
      return;
    }

    const list = document.createElement('ul');

    favorites.forEach((fav) => {
      const li = document.createElement('li');
      const route = fav.route;
      const link = document.createElement('a');
      link.href = `detalle.html?slug=${encodeURIComponent(route.slug)}`;
      link.textContent = route.title;

      li.appendChild(link);
      list.appendChild(li);
    });

    container.appendChild(list);
  } catch (error) {
    console.error('Error al cargar favoritos:', error);
    const container = document.getElementById('profile-favorites');
    container.textContent = 'No se han podido cargar tus favoritos.';
  }
}

/* ----------------------------- Reviews + Diario ----------------------------- */

async function loadMyReviews() {
  try {
    const response = await fetch(`${API_BASE}/me/reviews`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const result = await response.json();
    const reviews = result.data || [];

    renderMyReviews(reviews);
    renderDiaryCalendar(reviews);
  } catch (error) {
    console.error('Error al cargar mis reviews:', error);
    const container = document.getElementById('profile-reviews');
    container.textContent = 'No se han podido cargar tus reviews.';
  }
}

function renderMyReviews(reviews) {
  const container = document.getElementById('profile-reviews');
  container.innerHTML = '';

  if (reviews.length === 0) {
    container.textContent = 'Todavía no has dejado ninguna review.';
    return;
  }

  const list = document.createElement('ul');

  reviews.forEach((r) => {
    const li = document.createElement('li');
    const route = r.route || {};
    const dateStr = new Date(r.createdAt).toLocaleString('es-ES');

    const link = document.createElement('a');
    link.href = `detalle.html?slug=${encodeURIComponent(route.slug)}`;
    link.textContent = route.title || '(ruta desconocida)';

    const text = document.createElement('span');
    text.textContent = ` · ⭐ ${r.rating}/5 · ${dateStr}`;

    li.appendChild(link);
    li.appendChild(text);
    list.appendChild(li);
  });

  container.appendChild(list);
}

/* --------------------- Calendario (diario de actividad) --------------------- */

function renderDiaryCalendar(reviews) {
  const container = document.getElementById('calendar-container');
  container.innerHTML = '';

  if (reviews.length === 0) {
    container.textContent =
      'Cuando empieces a dejar reviews, verás aquí un calendario con tus días de actividad.';
    return;
  }

  // Agrupar reviews por día (YYYY-MM-DD)
  const activityByDay = {};
  reviews.forEach((r) => {
    const date = new Date(r.createdAt);
    const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    activityByDay[dayKey] = (activityByDay[dayKey] || 0) + 1;
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  const monthName = now.toLocaleString('es-ES', { month: 'long' });

  const title = document.createElement('h3');
  title.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
  container.appendChild(title);

  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  weekDays.forEach((d) => {
    const th = document.createElement('th');
    th.textContent = d;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  // Primer día del mes (0 = domingo, 1 = lunes, etc.)
  const firstDay = new Date(year, month, 1);
  let startIndex = firstDay.getDay(); // 0 (domingo) - 6 (sábado)

  // Queremos que la semana empiece en lunes
  // Convertimos: domingo=6, lunes=0, martes=1, ...
  startIndex = (startIndex - 1 + 7) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let currentRow = document.createElement('tr');

  // Celdas vacías antes del primer día
  for (let i = 0; i < startIndex; i++) {
    currentRow.appendChild(document.createElement('td'));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    if (currentRow.children.length === 7) {
      table.appendChild(currentRow);
      currentRow = document.createElement('tr');
    }

    const td = document.createElement('td');
    td.textContent = String(day);

    const dateKey = toDateKey(year, month, day);
    const count = activityByDay[dateKey];

    if (count) {
      // Marcamos los días
      td.style.backgroundColor = '#cce5ff';
      td.title = `${count} review(s) este día`;
    }

    currentRow.appendChild(td);
  }

  // Rellenar resto de la fila final con celdas vacías
  while (currentRow.children.length < 7) {
    currentRow.appendChild(document.createElement('td'));
  }

  table.appendChild(currentRow);

  container.appendChild(table);

  const legend = document.createElement('p');
  legend.textContent =
    'Los días en azul indican que has dejado al menos una review en esa fecha.';
  container.appendChild(legend);
}

function toDateKey(year, month, day) {
  // month es 0-11
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}
