/**
 * Enrutador SPA para AgendaBarber
 * Soporta navegación por History API y URLs limpias.
 */

import { renderDashboard } from './pages/dashboard.js';
import { renderClientBooking } from './pages/client-booking.js';
import { renderClientView } from './pages/client-view.js';
import { renderOnboarding } from './pages/onboarding.js';
import { renderServices } from './pages/services.js';
import { renderBarbers } from './pages/barbers.js';
import { renderClients } from './pages/clients.js';
import { renderStats } from './pages/stats.js';
import { renderKioskMode } from './pages/kiosk-mode.js';
import { AppState } from './state.js';

class Router {
  constructor() {
    this.routes = [];
    window.addEventListener('popstate', () => this.handleRoute());
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  handleRoute() {
    const path = window.location.pathname;
    const container = document.getElementById('view-container');
    const navbar = document.getElementById('main-navbar');
    if (!container) return;

    // Ocultar navbar en Modo Pantalla (Kiosk)
    if (path === '/admin/pantalla') {
      if (navbar) navbar.style.display = 'none';
    } else {
      if (navbar) navbar.style.display = 'flex';
    }

    // Ruta: /cita/:token
    const matchCita = path.match(/^\/cita\/([^/]+)$/);
    if (matchCita) {
      AppState.set({ vistaActual: 'cita' });
      renderClientView(container, { token: matchCita[1] });
      return;
    }

    // Ruta: /b/:negocio/:barbero
    const matchBarbero = path.match(/^\/b\/([^/]+)\/([^/]+)$/);
    if (matchBarbero) {
      AppState.set({ vistaActual: 'booking' });
      renderClientBooking(container, { negocioSlug: matchBarbero[1], barberoSlug: matchBarbero[2] });
      return;
    }

    // Ruta: /b/:negocio
    const matchNegocio = path.match(/^\/b\/([^/]+)$/);
    if (matchNegocio) {
      AppState.set({ vistaActual: 'booking' });
      renderClientBooking(container, { negocioSlug: matchNegocio[1] });
      return;
    }

    // Rutas de administración
    if (path === '/admin') {
      AppState.set({ vistaActual: 'dashboard' });
      renderDashboard(container);
      return;
    }

    if (path === '/admin/servicios') {
      AppState.set({ vistaActual: 'servicios' });
      renderServices(container);
      return;
    }

    if (path === '/admin/barberos') {
      AppState.set({ vistaActual: 'barberos' });
      renderBarbers(container);
      return;
    }

    if (path === '/admin/clientes') {
      AppState.set({ vistaActual: 'clientes' });
      renderClients(container);
      return;
    }

    if (path === '/admin/estadisticas') {
      AppState.set({ vistaActual: 'estadisticas' });
      renderStats(container);
      return;
    }

    if (path === '/admin/pantalla') {
      AppState.set({ vistaActual: 'pantalla' });
      renderKioskMode(container);
      return;
    }

    if (path === '/registro' || path === '/onboarding') {
      AppState.set({ vistaActual: 'onboarding' });
      renderOnboarding(container);
      return;
    }

    // Página de Inicio / Landing
    renderLanding(container);
  }
}

export const router = new Router();

function renderLanding(container) {
  const negocio = AppState.negocioActual || { slug: 'la-barberia', nombre: 'Barbería VIP' };

  container.innerHTML = `
    <div style="text-align: center; max-width: 650px; margin: 40px auto; padding: 20px;">
      <div style="font-size: 3.5rem; margin-bottom: 12px;">💈</div>
      <h1 style="font-size: 2.4rem; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 12px; line-height: 1.1;">
        AgendaBarber
      </h1>
      <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 28px; line-height: 1.5;">
        La plataforma multi-negocio con <strong>costo cero</strong> para que tus clientes reserven en segundos y tú <strong>nunca olvides una cita</strong>.
      </p>

      <div style="display: flex; flex-direction: column; gap: 14px; max-width: 380px; margin: 0 auto;">
        <button id="btn-go-admin" class="btn btn-primary btn-lg">
          Abrir Panel del Barbero (Hoy) ✂️
        </button>
        <button id="btn-go-booking" class="btn btn-secondary btn-lg">
          Ver Portal de Reserva del Cliente 🔗
        </button>
        <button id="btn-go-onboarding" class="btn btn-outline">
          Registrar Nueva Barbería (+ Onboarding)
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 48px; text-align: left;">
        <div class="card" style="padding: 16px; margin: 0;">
          <h4 style="font-weight: 800; font-size: 1rem; color: var(--accent-gold); margin-bottom: 6px;">⚡ Próxima Cita</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">El barbero ve de un vistazo la cita actual con cuenta regresiva en vivo.</p>
        </div>
        <div class="card" style="padding: 16px; margin: 0;">
          <h4 style="font-weight: 800; font-size: 1rem; color: var(--accent-gold); margin-bottom: 6px;">🎯 Cero Desperdicio</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Algoritmo inteligente que elimina huecos muertos y compacta la agenda.</p>
        </div>
        <div class="card" style="padding: 16px; margin: 0;">
          <h4 style="font-weight: 800; font-size: 1rem; color: var(--accent-gold); margin-bottom: 6px;">💰 Costo Cero</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Firebase Spark + Cloudflare Worker + ImgBB + Telegram Bot sin pagar nada.</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-go-admin')?.addEventListener('click', () => router.navigate('/admin'));
  document.getElementById('btn-go-booking')?.addEventListener('click', () => router.navigate(`/b/${negocio.slug}`));
  document.getElementById('btn-go-onboarding')?.addEventListener('click', () => router.navigate('/onboarding'));
}
