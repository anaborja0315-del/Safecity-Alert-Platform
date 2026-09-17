
const API_URL = 'http://localhost:3000/api';
const CARTAGENA_COORDS = [10.4236, -75.5378];
const DEFAULT_ZOOM = 13;


let map;
let markers = [];
let selectedCoords = null;
let token = localStorage.getItem('safecity_token');
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
    selectedCoords = [e.latlng.lat, e.latlng.lng];
    document.getElementById('coords').value = 
      `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
    showNotification('Location selected! Fill the form to submit.');
  });
}


async function loadAlerts() {
  try {
    
    const response = await fetch(`${API_URL}/alertas`);
    const alerts = await response.json();
    
    
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    
    alerts.forEach(alert => {
      const marker = L.marker([alert.latitud, alert.longitud])
        .bindPopup(createPopupContent(alert))
        .addTo(map);
      markers.push(marker);
    });

    
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

    
setTimeout(() => {
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('status-btn')) {
      e.preventDefault();
      e.stopPropagation();
      
      const alertId = e.target.dataset.alertId;
      const selectId = `status-select-${alertId}`;
      const newStatus = document.getElementById(selectId).value;
      
      try {
        const response = await fetch(`${API_URL}/alertas/${alertId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ estado: newStatus })
        });

        if (response.ok) {
          showNotification('Status updated successfully!');
          loadAlerts(); 
        } else {
          const data = await response.json();
          showNotification(data.error || 'Failed to update status', 'error');
        }
      } catch (error) {
        showNotification('Connection error', 'error');
      }
    }
  });
}, 100);

    
    document.getElementById('totalAlerts').textContent = alerts.length;
  } catch (error) {
    console.error('Error loading alerts:', error);
    showNotification('Error loading alerts', 'error');
  }
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
      Status: <strong>${alert.estado || 'active'}</strong>
    </p>
    ${statusSection}
    ${deleteButton}
  `;
}


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
  updateUIAfterLogout();
  showNotification('Logged out successfully');
}


function updateUIAfterLogin() {
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('registerBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'inline-block';
  document.getElementById('userInfo').style.display = 'inline-block';
  
  const userName = currentUser?.nombre || currentUser?.email || 'User';
  const adminBadge = currentUser?.rol === 'admin' ? ' 👨‍💼' : '';
  
  document.getElementById('userName').textContent = userName + adminBadge;
}

function updateUIAfterLogout() {
  document.getElementById('loginBtn').style.display = 'inline-block';
  document.getElementById('registerBtn').style.display = 'inline-block';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('userInfo').style.display = 'none';
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
      selectedCoords = null;
      loadAlerts();
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

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadAlerts();
  
document.getElementById('myLocationBtn').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition((position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    
    document.getElementById('coords').value = `${lat}, ${lng}`;
    
    map.setView([lat, lng], 15);
    

    showNotification('Location obtained!');
  }, (error) => {
    showNotification('Could not get location. Allow location access.', 'error');
  });
});

 
  if (token && currentUser) {
    updateUIAfterLogin();
  }

  
  document.getElementById('loginBtn').addEventListener('click', () => openModal('loginModal'));
  document.getElementById('registerBtn').addEventListener('click', () => openModal('registerModal'));
  document.getElementById('logoutBtn').addEventListener('click', logout);

  
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

});

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


loadStats();


document.getElementById('toggleSidebar').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('closed');
});


document.getElementById('alertForm').addEventListener('submit', () => {
  document.getElementById('sidebar').classList.add('closed');
});


document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const sectionId = btn.dataset.section;
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    document.querySelectorAll('.sidebar-section').forEach(section => {
      section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
  });
});

async function loadUserAlerts() {
  try {
    const response = await fetch(`${API_URL}/alertas`);
    const alerts = await response.json();
    
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

function loadAccountInfo() {
  if (currentUser) {
    document.getElementById('userEmail').textContent = currentUser.email || '-';
    document.getElementById('userName').textContent = currentUser.nombre || '-';
    document.getElementById('userRole').textContent = currentUser.rol || 'user';
  }
}


document.querySelector('[data-section="view-alerts"]').addEventListener('click', loadUserAlerts);
document.querySelector('[data-section="account"]').addEventListener('click', loadAccountInfo);
