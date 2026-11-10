/**
 * Modo Pantalla del Local (Kiosk Mode)
 * Pantalla completa de alta visibilidad para tablet en mostrador o monitor en sala de espera.
 * Mantiene la pantalla encendida (Keep-Awake con Screen WakeLock API) y reloj gigante.
 */

import { AppState } from '../state.js';
import { DataService } from '../firebase-client.js';
import { getFechaHoyLocal, formatearFechaLegible } from '../utils/date-utils.js';
import { router } from '../router.js';

export function renderKioskMode(container) {
  let wakeLock = null;
  let timerReloj = null;
  let unsubscribeCitas = null;

  const negocio = AppState.negocioActual || { id: 'barberia-vip', nombre: 'Barbería VIP', zonaHoraria: 'America/Montevideo' };
  const barbero = AppState.barberoSeleccionado || AppState.barberos[0];
  const hoyStr = getFechaHoyLocal(negocio.zonaHoraria);

  let citas = [];

  // Activar Screen WakeLock para evitar que la pantalla se apague
  async function activarKeepAwake() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log('Screen WakeLock activo (pantalla encendida)');
      }
    } catch (err) {
      console.warn('WakeLock no disponible o bloqueado:', err);
    }
  }

  function render() {
    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const horaActual = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;

    // Separar cita en proceso o próxima cita
    const citasActivas = citas.filter(c => c.estado !== 'cancelada' && c.estado !== 'terminada');
    const citaActual = citasActivas[0] || null;
    const proximasEnCola = citasActivas.slice(1, 6);

    container.innerHTML = `
      <div class="kiosk-container">
        <!-- HEADER KIOSK -->
        <div class="kiosk-header">
          <div>
            <h1 style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em;">
              💈 ${negocio.nombre}
            </h1>
            <p style="color: #94a3b8; font-size: 1.1rem; font-weight: 600;">
              ${formatearFechaLegible(hoyStr)} · Barbero: ${barbero?.nombre || 'General'}
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 24px;">
            <div class="kiosk-clock" id="kiosk-live-clock">${horaActual}</div>
            <button id="btn-exit-kiosk" class="btn btn-secondary btn-sm" style="background: #1e293b; color: #fff;">
              ✕ Salir de Pantalla
            </button>
          </div>
        </div>

        <!-- CUERPO PRINCIPAL KIOSK -->
        <div class="kiosk-grid">
          <!-- CAJA CITA ACTUAL / EN SILLÓN -->
          <div class="kiosk-current-box">
            <div class="kiosk-current-title">
              ${citaActual?.estado === 'en_proceso' ? '✂️ EN ATENCIÓN AHORA' : '🔥 PRÓXIMO EN SILLÓN'}
            </div>
            
            ${citaActual ? `
              <div style="font-size: 2.5rem; font-weight: 900; color: var(--accent-gold); margin-bottom: 8px;">
                ${citaActual.horaInicioLocal} hs
              </div>
              <div class="kiosk-current-client">
                ${citaActual.clienteNombre}
              </div>
              <div class="kiosk-current-service">
                ${citaActual.servicios.map(s => s.nombre).join(' + ')}
              </div>
              <div style="margin-top: 24px;">
                <span class="badge ${citaActual.estado === 'en_proceso' ? 'badge-amber' : 'badge-green'}" style="font-size: 1.2rem; padding: 8px 20px;">
                  ${citaActual.estado === 'en_proceso' ? 'En proceso' : 'Turno confirmado'}
                </span>
              </div>
            ` : `
              <div style="text-align: center; color: #64748b;">
                <span style="font-size: 4rem;">☕</span>
                <h3 style="font-size: 1.8rem; margin-top: 12px; color: #94a3b8;">Sillón Disponible</h3>
                <p style="font-size: 1.1rem; margin-top: 4px;">Esperando al próximo cliente</p>
              </div>
            `}
          </div>

          <!-- LISTA DE PRÓXIMOS TURNOS -->
          <div class="kiosk-queue-box">
            <h3 style="font-size: 1.3rem; font-weight: 800; color: #f8fafc; border-bottom: 1px solid #334155; padding-bottom: 12px;">
              ⏳ Próximos Turnos de Hoy
            </h3>

            ${proximasEnCola.length === 0 ? `
              <p style="color: #64748b; font-size: 1.1rem; padding: 20px 0;">No hay más citas en fila para este horario.</p>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${proximasEnCola.map((c, idx) => `
                  <div style="display: flex; align-items: center; justify-content: space-between; background: #131d2e; border: 1px solid #1e293b; border-radius: 14px; padding: 14px 18px;">
                    <div>
                      <div style="font-size: 1.3rem; font-weight: 800; color: #f8fafc;">
                        ${c.clienteNombre}
                      </div>
                      <div style="font-size: 0.95rem; color: #94a3b8;">
                        ${c.servicios.map(s => s.nombre).join(', ')}
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 1.4rem; font-weight: 900; color: var(--accent-gold);">
                        ${c.horaInicioLocal}
                      </div>
                      <div style="font-size: 0.8rem; color: #64748b;">${c.duracionTotalMin} min</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-exit-kiosk')?.addEventListener('click', () => {
      if (wakeLock) wakeLock.release();
      router.navigate('/admin');
    });
  }

  activarKeepAwake();

  // Reloj digital en vivo por segundo
  timerReloj = setInterval(() => {
    const el = document.getElementById('kiosk-live-clock');
    if (el) {
      const ahora = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      el.innerText = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;
    }
  }, 1000);

  // Listener de citas del día
  unsubscribeCitas = DataService.subscribeCitasFecha(
    negocio.id,
    barbero.id,
    hoyStr,
    (lista) => {
      citas = lista;
      render();
    }
  );
}
