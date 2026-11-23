const API_URL = 'http://localhost:3000/api';
const CARTAGENA_COORDS = [10.4236, -75.5378];
const DEFAULT_ZOOM = 13;

let map;
let markers = [];
let selectedCoords = null;
let selectedMarker = null;
let selectedLocationTimer = null;
let token = localStorage.getItem('safecity_token');
let currentPage = 1;
let totalPages = 1;
let currentUser = JSON.parse(localStorage.getItem('safecity_user') || 'null');

function initMap() {
  map = L.map('map').setView(CARTAGENA_COORDS, DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  map.on('click', (e) => {
    if (!token) {
      showNotification('Please login to report alerts', 'error');
      return;
    }
    showSelectedLocation(e.latlng.lat, e.latlng.lng);
    showNotification('Location selected! Fill the form to submit.');
  });
}

function clearSelectedLocation() {
  if (selectedMarker) {
    map.removeLayer(selectedMarker);
    selectedMarker = null;
  }
  if (selectedLocationTimer) {
    clearTimeout(selectedLocationTimer);
    selectedLocationTimer = null;
  }
  selectedCoords = null;
  const coordsField = document.getElementById('coords');
  if (coordsField) {
    coordsField.value = '';
  }
}

function showSelectedLocation(lat, lng) {
  if (selectedMarker) {
    map.removeLayer(selectedMarker);
    selectedMarker = null;
  }
  if (selectedLocationTimer) {
    clearTimeout(selectedLocationTimer);
    selectedLocationTimer = null;
  }

  selectedCoords = [lat, lng];

  const coordsField = document.getElementById('coords');
  if (coordsField) {
    coordsField.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  selectedMarker = L.circleMarker([lat, lng], {
    color: 'red',
    radius: 10
  }).addTo(map);

  selectedMarker.on('click', clearSelectedLocation);

  selectedLocationTimer = setTimeout(clearSelectedLocation, 30000);
}

async function loadAlerts(page = 1) {
  try {
    const response = await fetch(`${API_URL}/alertas?page=${page}`);
    const data = await response.json();
    const alertas = data.data;
    totalPages = data.pagination.pages;
    currentPage = data.pagination.page;

    markers.forEach(m => map.removeLayer(m));
    markers = [];

    alertas.forEach(alerta => {
      const marker = L.marker([alerta.latitud, alerta.longitud])
        .bindPopup(createPopupContent(alerta));
      marker.addTo(map);
      markers.push(marker);
    });

    updatePaginationUI();
  } catch (error) {
    console.error('Error loading alerts:', error);
  }
}

function updatePaginationUI() {
  const pagination = document.getElementById('pagination');
  if (pagination) {
    pagination.style.display = (totalPages <= 1) ? 'none' : 'flex';
  }

  const pageInfo = document.getElementById('pageInfo');
  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) prevBtn.disabled = currentPage === 1;

  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

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

  let statusSection = '';
  if (token && esAdmin) {
    statusSection = `
      <div style="margin-top: 12px; border-top: 1px solid #ddd; padding-top: 8px;">
        <label style="font-weight: 600; font-size: 0.9rem;">Change Status (Admin only):</label>
        <select id="status-select-${alert.id}"
                style="width: 100%; padding: 6px; margin: 6px 0; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem;">
          <option value="active" ${alert.estado === 'active' ? 'selected' : ''}>Active</option>
          <option value="resolved" ${alert.estado === 'resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="status-btn" data-alert-id="${alert.id}"
                style="width: 100%; background: #27AE60; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">
          💾 Save Status
        </button>
      </div>
    `;
  }

  return `
    <h3>${alert.titulo}</h3>
    <p>${alert.descripcion || 'No description'}</p>
    <span class="popup-tag">${alert.tipo}</span>
    <p style="margin-top: 8px; font-size: 0.8rem; color: #7F8C8D;">
      Status: <strong>${alert.estado || 'active'}</strong><br>
      Created: <strong>${alert.fecha_creacion ? new Date(alert.fecha_creacion).toLocaleString() : '-'}</strong>
    </p>
    ${statusSection}
    ${deleteButton}
  `;
}

document.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    const id = deleteBtn.dataset.alertId;
    if (!token) {
      showNotification('Please login first', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/alertas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        showNotification('Alert deleted successfully!');
        loadAlerts(currentPage);
        loadStats();
      } else {
        const data = await response.json();
        showNotification(data.error || 'Failed to delete', 'error');
      }
    } catch (error) {
      showNotification('Connection error', 'error');
    }
    return;
  }

  const statusBtn = e.target.closest('.status-btn');
  if (statusBtn) {
    const id = statusBtn.dataset.alertId;
    const select = document.getElementById(`status-select-${id}`);
    const estado = select ? select.value : '';
    if (!token) {
      showNotification('Please login first', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/alertas/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado })
      });
      if (response.ok) {
        showNotification('Status updated successfully!');
        loadAlerts(currentPage);
        loadStats();
      } else {
        const data = await response.json();
        showNotification(data.error || 'Failed to update status', 'error');
      }
    } catch (error) {
      showNotification('Connection error', 'error');
    }
    return;
  }
});


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

async function login(email, password) {
  try {
    const response = await fetch(`${API_URL}/usuarios/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
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

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('safecity_token');
  localStorage.removeItem('safecity_user');
  clearSelectedLocation();
  updateUIAfterLogout();
  showNotification('Logged out successfully');
}


function updateUIAfterLogin() {
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('registerBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('logoutBtnHeader').style.display = 'inline-block';
  document.getElementById('userInfo').style.display = 'inline-block';

  const undoBtn = document.getElementById('undoDeleteBtn');
  if (undoBtn) undoBtn.style.display = 'inline-block';

  const reviewNav = document.getElementById('reviewQueueNavBtn');
  if (reviewNav) {
    reviewNav.style.display = (currentUser?.rol === 'admin') ? 'inline-block' : 'none';
  }

  const userName = currentUser?.nombre || currentUser?.email || 'User';
  const adminBadge = currentUser?.rol === 'admin' ? ' 👨‍💼' : '';

  document.getElementById('userName').textContent = userName + adminBadge;

  if (currentUser?.rol === 'admin') {
    loadPendingCount();
  }
}

function updateUIAfterLogout() {
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('registerBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('logoutBtnHeader').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';

  const undoBtn = document.getElementById('undoDeleteBtn');
  if (undoBtn) undoBtn.style.display = 'none';

  const reviewNav = document.getElementById('reviewQueueNavBtn');
  if (reviewNav) reviewNav.style.display = 'none';
}

async function submitAlert(e) {
  e.preventDefault();

  if (!token) {
    showNotification('Please login first', 'error');
    return;
  }

  if (!selectedCoords) {
    showNotification('Click on the map to set location', 'error');
    return;
  }

  const titulo = document.getElementById('title').value;
  const descripcion = document.getElementById('description').value;
  const categoria_id = document.getElementById('categoryId').value;
  const tipo = document.getElementById('categoryId').selectedOptions[0].text;

  try {
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
      clearSelectedLocation();
      loadAlerts(currentPage);
      loadStats();
      loadPendingCount();
    } else {
      const data = await response.json();
      showNotification(data.error || 'Failed to submit', 'error');
    }
  } catch (error) {
    showNotification('Connection error', 'error');
  }
}


function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type === 'error' ? 'error' : ''}`;

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

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

async function loadUserAlerts() {
  try {
    const response = await fetch(`${API_URL}/alertas`);
    const data = await response.json();
    const alerts = data.data || [];

    const userAlerts = alerts.filter(a => String(a.usuario_id) === String(currentUser?.id));

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

function loadAccountInfo() {
  if (currentUser) {
    document.getElementById('userEmail').textContent = currentUser.email || '-';
    document.getElementById('userName').textContent = currentUser.nombre || '-';
    document.getElementById('userRole').textContent = currentUser.rol || 'user';
  }
}

async function undoDelete() {
  if (!token) {
    showNotification('Please login first', 'error');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/alertas/deshacer`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      showNotification('Alert restored successfully!');
      loadAlerts(currentPage);
      loadStats();
      loadPendingCount();
    } else {
      const data = await response.json();
      showNotification(data.error || 'Nothing to undo', 'error');
    }
  } catch (error) {
    showNotification('Connection error', 'error');
  }
}

async function loadPendingCount() {
  if (!token || currentUser?.rol !== 'admin') return;
  try {
    const response = await fetch(`${API_URL}/alertas/pendientes`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return;
    const data = await response.json();
    const el = document.getElementById('pendingCount');
    if (el) el.textContent = data.total || 0;
  } catch (error) {
    console.error('Error loading pending count:', error);
  }
}

async function reviewNext() {
  if (!token) {
    showNotification('Please login first', 'error');
    return;
  }
  try {
    const response = await fetch(`${API_URL}/alertas/pendientes/siguiente`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      showNotification('Alert reviewed successfully!');
      const info = document.getElementById('reviewedAlert');
      if (info) {
        info.innerHTML = `<strong>${data.titulo}</strong><p>${data.descripcion || ''}</p><p style="font-size:0.8rem;color:#7F8C8D;">Status: ${data.estado || 'active'} | Created: ${data.fecha_creacion ? new Date(data.fecha_creacion).toLocaleString() : '-'}</p>`;
      }
      loadPendingCount();
    } else {
      const data = await response.json();
      showNotification(data.error || 'No pending alerts', 'error');
    }
  } catch (error) {
    showNotification('Connection error', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadAlerts();
  loadStats();

  if (token && currentUser) {
    updateUIAfterLogin();
  }

  document.getElementById('myLocationBtn').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    showSelectedLocation(lat, lng);

    map.setView([lat, lng], 15);
    showNotification('Location obtained!');
  }, () => {
    showNotification('Could not get location. Allow location access.', 'error');
  });
});

  document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
  document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn').addEventListener('click', logout);
  const logoutBtnHeader = document.getElementById('logoutBtnHeader');
  if (logoutBtnHeader) {
    logoutBtnHeader.addEventListener('click', logout);
  }

  document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.dataset.modal);
    });
  });

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
  });

  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    register(name, email, password);
  });

  document.getElementById('alertForm').addEventListener('submit', submitAlert);

  const clearLocationBtn = document.getElementById('clearLocationBtn');
  if (clearLocationBtn) {
    clearLocationBtn.addEventListener('click', clearSelectedLocation);
  }

  const undoDeleteBtn = document.getElementById('undoDeleteBtn');
  if (undoDeleteBtn) {
    undoDeleteBtn.addEventListener('click', undoDelete);
  }

  const reviewNextBtn = document.getElementById('reviewNextBtn');
  if (reviewNextBtn) {
    reviewNextBtn.addEventListener('click', reviewNext);
  }

  const toggleSidebar = document.getElementById('toggleSidebar');
  if (toggleSidebar) {
    toggleSidebar.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('closed');
    });
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionId = btn.dataset.section;

      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.sidebar-section').forEach(section => {
        section.classList.remove('active');
      });

      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.add('active');
        if (sectionId === 'review-queue') {
          section.style.display = 'block';
          loadPendingCount();
        }
      }

      if (sectionId === 'view-alerts') loadUserAlerts();
      if (sectionId === 'account') loadAccountInfo();
    });
  });

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        loadAlerts(currentPage - 1);
      }
    });
  }
  const nextBtn = document.getElementById('nextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        loadAlerts(currentPage + 1);
      }
    });
  }
});
