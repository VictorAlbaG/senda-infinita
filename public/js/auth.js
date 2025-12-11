const API_AUTH_BASE = '/api/auth';

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Esto actualiza el nav si el header ya estaba puesto (por ejemplo, en páginas sin layout dinámico),
  // y si aún no, no pasa nada porque los elementos serán null.
  updateAuthUi();

  // Cuando layout.js termine de inyectar el header, volvemos a actualizar la UI
  // y enganchamos el listener del botón de logout.
  document.addEventListener('header-loaded', () => {
    updateAuthUi();
    attachLogoutHandler();
  });

  // Si por lo que sea el header ya estaba en el DOM al cargar, también enganchamos aquí
  attachLogoutHandler();

  const token = localStorage.getItem('token');

  // Si ya estás logueado, no tiene sentido ver login o registro
  if (token && loginForm) {
    window.location.href = 'index.html';
    return;
  }
  if (token && registerForm) {
    window.location.href = 'index.html';
    return;
  }

  if (loginForm) {
    setupLoginForm(loginForm);
  }

  if (registerForm) {
    setupRegisterForm(registerForm);
  }
});

function attachLogoutHandler() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  // Evitamos enganchar varias veces el mismo listener
  if (logoutBtn.dataset.bound === 'true') return;

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearAuthData();
    // Tras cerrar sesión, lo más sencillo es enviar al usuario a la home
    window.location.href = 'index.html';
  });

  logoutBtn.dataset.bound = 'true';
}


/* ----------------------------- Helpers -------------------------------------- */

function saveAuthData(token, user) {
  if (token) {
    localStorage.setItem('token', token);
  }
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

function clearAuthData() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
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

function updateAuthUi() {
  const user = getCurrentUser();
  const token = localStorage.getItem('token');

  const loginLink = document.getElementById('login-link');
  const registerLink = document.getElementById('register-link');
  const profileLink = document.getElementById('profile-link');
  const logoutBtn = document.getElementById('logout-btn');
  const userGreeting = document.getElementById('user-greeting');

  const isLoggedIn = !!token && !!user;

  if (loginLink) {
    loginLink.style.display = isLoggedIn ? 'none' : 'inline';
  }

  if (registerLink) {
    registerLink.style.display = isLoggedIn ? 'none' : 'inline';
  }

  if (profileLink) {
    profileLink.style.display = isLoggedIn ? 'inline' : 'none';
  }

  if (logoutBtn) {
    logoutBtn.style.display = isLoggedIn ? 'inline' : 'none';
  }

  if (userGreeting) {
    if (isLoggedIn) {
      userGreeting.textContent = `Hola, ${user.name || user.email}`;
    } else {
      userGreeting.textContent = '';
    }
  }
}

/* ----------------------------- Login ---------------------------------------- */

function setupLoginForm(form) {
  const messageEl = document.getElementById('login-message');
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage(messageEl, 'Introduce tu correo y contraseña.', true);
      return;
    }

    setMessage(messageEl, 'Iniciando sesión...', false);

    try {
      const response = await fetch(`${API_AUTH_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg =
          errorData.message ||
          (response.status === 401
            ? 'Credenciales incorrectas.'
            : `Error HTTP ${response.status}`);
        throw new Error(msg);
      }

      const data = await response.json();

      saveAuthData(data.token, data.user);

      setMessage(messageEl, 'Sesión iniciada correctamente. Redirigiendo...', false);

      // Redirigir a la home
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    } catch (error) {
      console.error('Error en login:', error);
      setMessage(messageEl, error.message || 'Error al iniciar sesión.', true);
      clearPasswordInput(passwordInput);
    }
  });
}

/* ----------------------------- Registro ------------------------------------- */

function setupRegisterForm(form) {
  const messageEl = document.getElementById('register-message');
  const nameInput = document.getElementById('register-name');
  const emailInput = document.getElementById('register-email');
  const passwordInput = document.getElementById('register-password');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!name || !email || !password) {
      setMessage(messageEl, 'Rellena todos los campos.', true);
      return;
    }

    setMessage(messageEl, 'Creando cuenta...', false);

    try {
      const response = await fetch(`${API_AUTH_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData.message || `Error HTTP ${response.status}`;
        throw new Error(msg);
      }

      const data = await response.json();

      saveAuthData(data.token, data.user);

      setMessage(messageEl, 'Cuenta creada correctamente. Redirigiendo...', false);

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    } catch (error) {
      console.error('Error en registro:', error);
      setMessage(
        messageEl,
        error.message || 'Ha ocurrido un error al crear la cuenta.',
        true
      );
      clearPasswordInput(passwordInput);
    }
  });
}

/* ----------------------------- Utilidades UI -------------------------------- */

function setMessage(element, message, isError) {
  if (!element) return;
  element.textContent = message || '';
  element.style.color = isError ? 'red' : 'inherit';
}

function clearPasswordInput(input) {
  if (input) {
    input.value = '';
  }
}

document.addEventListener('header-loaded', updateAuthUi);
