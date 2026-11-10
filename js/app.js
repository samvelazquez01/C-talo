/**
 * Punto de Entrada Principal de AgendaBarber
 */

import { initFirebase, DataService } from './firebase-client.js';
import { AppState, ThemeManager, showToast } from './state.js';
import { router } from './router.js';

async function bootstrap() {
  // 1. Inicializar tema (claro / oscuro)
  ThemeManager.init();

  // 2. Cargar datos de semilla iniciales
  let seedData = null;
  try {
    const res = await fetch('/data/seed-data.json');
    if (res.ok) {
      seedData = await res.json();
    }
  } catch (e) {
    console.warn('No se pudo cargar seed-data.json vía HTTP, intentando fallback embebido:', e);
  }

  // 3. Inicializar Firebase / Almacén Local
  await initFirebase(seedData);

  // 4. Cargar negocio inicial en memoria
  try {
    const negocio = await DataService.getNegocioBySlug('la-barberia');
    if (negocio) {
      const barberos = await DataService.getBarberosByNegocio(negocio.id);
      const servicios = await DataService.getServiciosByNegocio(negocio.id);
      AppState.set({
        negocioActual: negocio,
        barberos,
        barberoSeleccionado: barberos[0] || null,
        servicios
      });
    }
  } catch (err) {
    console.warn('Error inicializando estado de negocio:', err);
  }

  // 5. Vincular botones de la barra de navegación
  setupNavbar();

  // 6. Registrar Service Worker para soporte PWA e instalación en dispositivos móviles
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('PWA Service Worker registrado con éxito:', reg.scope);
    }).catch((err) => {
      console.warn('Error registrando Service Worker:', err);
    });
  }

  // 7. Enrutar a la vista correspondiente
  router.handleRoute();
}

function setupNavbar() {
  // Toggle de Tema
  const btnTheme = document.getElementById('btn-toggle-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const nuevo = ThemeManager.toggle();
      btnTheme.innerText = nuevo === 'dark' ? '🌙' : '☀️';
      showToast(`Tema ${nuevo === 'dark' ? 'oscuro' : 'claro'} activado`, 'info', 1500);
    });
    btnTheme.innerText = ThemeManager.getCurrent() === 'dark' ? '🌙' : '☀️';
  }

  // Enlaces de navegación SPA
  document.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const path = link.getAttribute('data-route');
      router.navigate(path);
    });
  });
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', bootstrap);
