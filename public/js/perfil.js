const API_BASE = '/api';

let cachedReviews = [];
let calendarOffset = 0;
let calendarPrevBtn;
let calendarNextBtn;
let calendarMonthLabel;

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // Si no estás logueado, te mandamos al login
    window.location.href = 'login.html';
    return;
  }

  calendarPrevBtn = document.getElementById('calendar-prev');
  calendarNextBtn = document.getElementById('calendar-next');
  calendarMonthLabel = document.getElementById('calendar-month');

  if (calendarPrevBtn && calendarNextBtn) {
    calendarPrevBtn.addEventListener('click', () => {
      calendarOffset -= 1;
      renderDiaryCalendar(cachedReviews);
    });

    calendarNextBtn.addEventListener('click', () => {
      calendarOffset += 1;
      renderDiaryCalendar(cachedReviews);
    });
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
    el.textContent = `Nombre: ${user.name || '-'} Email: ${
      user.email || '-'
    } Rol: ${user.role || 'USER'}`;
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
      container.textContent = 'No tienes rutas favoritas todav­a.';
      return;
    }

    const list = document.createElement('ul');
    list.className = 'grid gap-3 sm:grid-cols-2';

    favorites.forEach((fav) => {
      const li = document.createElement('li');
      li.className =
        'rounded-xl border border-[#7C7C6B]/40 bg-[#A5B86C]/35 p-3 text-[#1E4C6D] shadow-sm';
      const route = fav.route;
      const link = document.createElement('a');
      link.className =
        'font-semibold text-[#1E4C6D] hover:text-[#8C6E4A]';
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

    cachedReviews = reviews;

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
    container.textContent = 'Todaví­a no has dejado ninguna review.';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'space-y-3';

  reviews.forEach((r) => {
    const li = document.createElement('li');
    li.className =
      'rounded-xl border border-[#7C7C6B]/40 bg-[#A5B86C]/35 p-3 text-sm text-[#1E4C6D] shadow-sm';
    const route = r.route || {};
    const dateStr = new Date(r.createdAt).toLocaleString('es-ES');

    const link = document.createElement('a');
    link.className =
      'font-semibold text-[#1E4C6D] hover:text-[#8C6E4A]';
    link.href = `detalle.html?slug=${encodeURIComponent(route.slug)}`;
    link.textContent = route.title || '(ruta desconocida)';

    const text = document.createElement('span');
    text.className = 'text-[#1E4C6D]/80';
    text.textContent = `: ${r.rating}/5 - ${dateStr}`;

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

  // Agrupar reviews por d­a (YYYY-MM-DD)
  const activityByDay = {};
  reviews.forEach((r) => {
    const date = new Date(r.createdAt);
    const dayKey = date.toISOString().slice(0, 10); // YYYY-MM-DD
    activityByDay[dayKey] = (activityByDay[dayKey] || 0) + 1;
  });

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-11
  const monthName = viewDate.toLocaleString('es-ES', { month: 'long' });

  if (calendarMonthLabel) {
    calendarMonthLabel.textContent = `${
      monthName.charAt(0).toUpperCase() + monthName.slice(1)
    } ${year}`;
  }

  const table = document.createElement('table');
  table.className = 'mt-3 w-full border-collapse text-sm';
  const headerRow = document.createElement('tr');
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  weekDays.forEach((d) => {
    const th = document.createElement('th');
    th.className =
      'border border-[#7C7C6B]/50 bg-[#1E4C6D] px-2 py-2 text-center font-semibold text-[#A7D3E6]';
    th.textContent = d;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  // Primer día del mes (0 = domingo, 1 = lunes, etc.)
  const firstDay = new Date(year, month, 1);
  let startIndex = firstDay.getDay(); // 0 (domingo) - 6 (sÿbado)

  // Queremos que la semana empiece en lunes
  // Convertimos: domingo=6, lunes=0, martes=1, ...
  startIndex = (startIndex - 1 + 7) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let currentRow = document.createElement('tr');

  // Celdas vací­as antes del primer dí­a
  for (let i = 0; i < startIndex; i++) {
    const emptyTd = document.createElement('td');
    emptyTd.className =
      'border border-[#7C7C6B]/40 bg-[#A5B86C]/15 px-2 py-2 text-center text-[#1E4C6D]';
    currentRow.appendChild(emptyTd);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    if (currentRow.children.length === 7) {
      table.appendChild(currentRow);
      currentRow = document.createElement('tr');
    }

    const td = document.createElement('td');
    td.className =
      'border border-[#7C7C6B]/40 bg-[#A7D3E6]/80 px-2 py-2 text-center text-[#1E4C6D]';
    td.textContent = String(day);

    const dateKey = toDateKey(year, month, day);
    const count = activityByDay[dateKey];

    if (count) {
      // Marcamos los dí­as
      td.classList.add('bg-[#6BAA3D]/70', 'font-semibold');
      td.title = `${count} review(s) este dí­a`;
    }

    currentRow.appendChild(td);
  }

  // Rellenar resto de la fila final con celdas vací­as
  while (currentRow.children.length < 7) {
    const emptyTd = document.createElement('td');
    emptyTd.className =
      'border border-[#7C7C6B]/40 bg-[#A5B86C]/15 px-2 py-2 text-center text-[#1E4C6D]';
    currentRow.appendChild(emptyTd);
  }

  table.appendChild(currentRow);
  container.appendChild(table);

  const legend = document.createElement('p');
  legend.className = 'mt-3 text-sm text-[#1E4C6D]/70';
  legend.textContent =
    'Los dí­as marcados indican que has dejado al menos una review en esa fecha.';
  container.appendChild(legend);

  if (reviews.length === 0) {
    const emptyNote = document.createElement('p');
    emptyNote.className = 'mt-2 text-sm text-[#1E4C6D]/70';
    emptyNote.textContent =
      'Aún no tienes reviews.';
    container.appendChild(emptyNote);
  }
}

function toDateKey(year, month, day) {
  // month es 0-11
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}
