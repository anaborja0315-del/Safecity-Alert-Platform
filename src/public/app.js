// ===== CONFIGURACIÓN =====
const API_URL = 'http://localhost:3000/api';
const CARTAGENA_COORDS = [10.4236, -75.5378];
const DEFAULT_ZOOM = 13;

// ===== ESTADO GLOBAL =====
let map;
let markers = [];
let selectedCoords = null;
let token = localStorage.getItem('safecity_token');
let currentUser = JSON.parse(localStorage.getItem('safecity_user') || 'null');

// ===== INICIALIZAR EL MAPA =====
function initMap() {
  // Crear el mapa centrado en Cartagena
  map = L.map('map').setView(CARTAGENA_COORDS, DEFAULT_ZOOM);
  
  // Agregar la capa de OpenStreetMap (las imágenes del mapa)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Permitir al usuario hacer clic en el mapa para seleccionar ubicación
  map.on('click', (e) => {
    if (!token) {
      showNotification('Please login to report alerts', 'error');
      return;
    }
    selectedCoords = [e.latlng.lat, e.latlng.lng];
    document.getElementById('coords').value = 
      `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    showNotification('Location selected! Fill the form to submit.');
  });
}

// ===== CARGAR ALERTAS DESDE LA API =====
async function loadAlerts() {
  try {
    // Hacer petición GET a la API
    const response = await fetch(`${API_URL}/alertas`);
    const alerts = await response.json();
    
    // Limpiar marcadores anteriores del mapa
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Agregar un marcador por cada alerta
    alerts.forEach(alert => {
      const marker = L.marker([alert.latitud, alert.longitud])
        .bindPopup(createPopupContent(alert))
        .addTo(map);
      markers.push(marker);
    });

    // Agregar event listeners a los botones DELETE (usando delegación)
    setTimeout(() => {
      document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
          e.preventDefault();
          e.stopPropagation();
          const alertId = e.target.dataset.alertId;
          
          if (confirm('Are you sure you want to delete this alert?')) {
            try {
              const response = await fetch(`${API_URL}/alertas/${alertId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.ok) {
                showNotification('Alert deleted successfully');
                loadAlerts();
              } else {
                const data = await response.json();
                showNotification(data.error || 'Failed to delete', 'error');
              }
            } catch (error) {
              showNotification('Connection error', 'error');
            }
          }
        }
      });
    }, 100);

    // Actualizar contador de estadísticas
    document.getElementById('totalAlerts').textContent = alerts.length;
  } catch (error) {
    console.error('Error loading alerts:', error);
    showNotification('Error loading alerts', 'error');
  }
}

// ===== CREAR CONTENIDO DEL POPUP =====
// Crear contenido del popup con botón DELETE si es admin o dueño
function createPopupContent(alert) {
  const esAdmin = currentUser?.rol === 'admin';
  const esDueño = currentUser?.id === alert.usuario_id;
  const puedeEliminar = (esAdmin || esDueño) && token;

  let deleteButton = '';
  if (puedeEliminar) {
    deleteButton = `
      <button class="delete-btn" data-alert-id="${alert.id}" 
              style="background: #E74C3C; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px; font-weight: 600; font-size: 0.9rem;">
        🗑️ Delete Alert
      </button>
    `;
  }

  return `
    <h3>${alert.titulo}</h3>
    <p>${alert.descripcion || 'No description'}</p>
    <span class="popup-tag">${alert.tipo}</span>
    <p style="margin-top: 8px; font-size: 0.8rem; color: #7F8C8D;">
      Status: ${alert.estado || 'active'}
    </p>
    ${deleteButton}
  `;
}

// ===== FUNCIONES DE AUTENTICACIÓN =====

// Registrar nuevo usuario
async function register(name, email, password) {
  try {
    const response = await fetch(`${API_URL}/usuarios/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: name, email, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      showNotification('Registration successful! Please login.');
      closeModal('registerModal');
      openModal('loginModal');
    } else {
      showNotification(data.error || 'Registration failed', 'error');
    }
  } catch (error) {
    showNotification('Connection error', 'error');
  }
}

// Iniciar sesión y obtener token JWT
async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      // Guardar token y usuario en localStorage del navegador
      token = data.token;
      currentUser = data.usuario || { email };
      localStorage.setItem('safecity_token', token);
      localStorage.setItem('safecity_user', JSON.stringify(currentUser));
      
      updateUIAfterLogin();
      closeModal('loginModal');
      showNotification(`Welcome, ${currentUser.nombre || email}!`);
    } else {
      showNotification(data.error || 'Login failed', 'error');
    }
  } catch (error) {
    showNotification('Connection error', 'error');
  }
}

// Cerrar sesión y limpiar token
function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('safecity_token');
  localStorage.removeItem('safecity_user');
  updateUIAfterLogout();
  showNotification('Logged out successfully');
}

// ===== ACTUALIZAR INTERFAZ =====

// Mostrar elementos cuando hay sesión activa
function updateUIAfterLogin() {
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('registerBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('userInfo').style.display = 'inline-block';
  
  const userName = currentUser?.nombre || currentUser?.email || 'User';
  const adminBadge = currentUser?.rol === 'admin' ? ' 👨‍💼' : '';
  
  document.getElementById('userName').textContent = userName + adminBadge;
}

// Mostrar elementos cuando no hay sesión
function updateUIAfterLogout() {
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('registerBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';
}

// ===== ENVIAR NUEVA ALERTA =====
async function submitAlert(e) {
  e.preventDefault();

  // Validar que esté autenticado
  if (!token) {
    showNotification('Please login first', 'error');
    return;
  }

  // Validar que haya seleccionado coordenadas en el mapa
  if (!selectedCoords) {
    showNotification('Click on the map to set location', 'error');
    return;
  }

  // Obtener datos del formulario
  const titulo = document.getElementById('title').value;
  const descripcion = document.getElementById('description').value;
  const categoria_id = document.getElementById('categoryId').value;
  const tipo = document.getElementById('categoryId').selectedOptions[0].text;

  try {
    // Enviar petición POST con el token JWT
    const response = await fetch(`${API_URL}/alertas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        titulo,
        descripcion,
        tipo,
        latitud: selectedCoords[0],
        longitud: selectedCoords[1],
        categoria_id: parseInt(categoria_id)
      })
    });

    if (response.ok) {
      showNotification('Alert submitted successfully!');
      document.getElementById('alertForm').reset();
      selectedCoords = null;
      // Recargar las alertas para que aparezca la nueva
      loadAlerts();
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to submit', 'error');
    }
  } catch (error) {
    showNotification('Connection error', 'error');
  }
}

// ===== HELPERS DE MODAL =====

// Abrir un modal por su ID
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

// Cerrar un modal por su ID
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ===== NOTIFICACIONES EN PANTALLA =====
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type === 'error' ? 'error' : ''}`;
  
  // Ocultar la notificación después de 3 segundos
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// ===== EVENT LISTENERS (cuando el DOM esté listo) =====
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar el mapa y cargar alertas
  initMap();
  loadAlerts();

  // Restaurar sesión si ya había un token guardado
  if (token && currentUser) {
    updateUIAfterLogin();
  }

  // Botones de autenticación
  document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
  document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Botones de cerrar modal
  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.modal);
    });
  });

  // Formulario de login
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
  });

  // Formulario de registro
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    register(name, email, password);
  });

  // Formulario para crear alerta
  document.getElementById('alertForm').addEventListener('submit', submitAlert);

});
// ===== CARGAR ESTADÍSTICAS =====
async function loadStats() {
  try {

    const response = await fetch(`${API_URL}/alertas/stats`);
    const stats = await response.json();

    document.getElementById('totalAlerts').textContent = stats.totalAlertas || 0;
    document.getElementById('activeAlerts').textContent = stats.alertasActivas || 0;
    document.getElementById('resolvedAlerts').textContent = stats.alertasResueltas || 0;

  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Cargar estadísticas al iniciar
loadStats();

// ===== TOGGLE SIDEBAR =====
document.getElementById('toggleSidebar').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('closed');
});

// Cerrar sidebar al hacer clic en "Submit Alert"
document.getElementById('alertForm').addEventListener('submit', () => {
  document.getElementById('sidebar').classList.add('closed');
});

// ===== NAVEGACIÓN DE SECCIONES =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const sectionId = btn.dataset.section;
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Remover clase active de todas las secciones
    document.querySelectorAll('.sidebar-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Activar la sección seleccionada
    document.getElementById(sectionId).classList.add('active');
  });
});

// ===== CARGAR ALERTAS DEL USUARIO =====
async function loadUserAlerts() {
  try {
    const response = await fetch(`${API_URL}/alertas`);
    const alerts = await response.json();
    
    // Filtrar solo alertas del usuario actual
    const userAlerts = alerts.filter(a => a.usuario_id === currentUser?.id);
    
    const alertsList = document.getElementById('userAlertsList');
    
    if (userAlerts.length === 0) {
      alertsList.innerHTML = '<p style="text-align: center; color: #7F8C8D;">No alerts yet</p>';
      return;
    }
    
    alertsList.innerHTML = userAlerts.map(alert => `
      <div class="alert-item">
        <div class="alert-item-title">${alert.titulo}</div>
        <div class="alert-item-status">
          Status: ${alert.estado || 'active'} | Type: ${alert.tipo}
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error loading user alerts:', error);
  }
}

// ===== CARGAR INFO DE CUENTA =====
function loadAccountInfo() {
  if (currentUser) {
    document.getElementById('userEmail').textContent = currentUser.email || '-';
    document.getElementById('userName').textContent = currentUser.nombre || '-';
    document.getElementById('userRole').textContent = currentUser.rol || 'user';
  }
}

// Cargar datos cuando se abre la sección
document.querySelector('[data-section="view-alerts"]').addEventListener('click', loadUserAlerts);
document.querySelector('[data-section="account"]').addEventListener('click', loadAccountInfo);
