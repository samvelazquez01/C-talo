/**
 * Página de Consulta y Cancelación de Cita por Token Único (/cita/:token)
 * Permite al cliente ver el estado de su cita o cancelarla sin cuenta.
 */

import { DataService } from '../firebase-client.js';
import { formatearFechaLegible } from '../utils/date-utils.js';
import { descargarArchivoICS } from '../utils/ics-generator.js';
import { showToast } from '../state.js';

export async function renderClientView(container, params = {}) {
  const { token } = params;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <p style="font-weight: 700; color: var(--text-secondary);">Buscando los datos de tu reserva...</p>
    </div>
  `;

  if (!token) {
    renderError('Enlace inválido o incompleto.');
    return;
  }

  const cita = await DataService.getCitaByToken(token);
  if (!cita) {
    renderError('No se encontró ninguna cita asociada a este enlace. Puede haber sido eliminada.');
    return;
  }

  const negocio = await DataService.getNegocioBySlug(cita.negocioId?.replace('biz-', '') || 'la-barberia');

  function render() {
    const estadoLabels = {
      confirmada: { label: 'Confirmada', color: 'badge-green', icon: '✓' },
      llego: { label: 'En el Local', color: 'badge-gold', icon: '📍' },
      en_proceso: { label: 'En Proceso', color: 'badge-amber', icon: '✂️' },
      terminada: { label: 'Completada', color: 'badge-muted', icon: '✨' },
      no_se_presento: { label: 'No Asistió', color: 'badge-red', icon: '✕' },
      cancelada: { label: 'Cancelada', color: 'badge-red', icon: '✕' }
    };

    const est = estadoLabels[cita.estado] || { label: cita.estado, color: 'badge-muted', icon: 'ℹ' };

    container.innerHTML = `
      <div class="card animate-fade-in" style="max-width: 520px; margin: 30px auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 2.2rem;">💈</span>
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-top: 8px;">Detalles de tu Cita</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">${negocio?.nombre || 'Barbería'}</p>
          <div style="margin-top: 10px;">
            <span class="badge ${est.color}" style="font-size: 0.88rem; padding: 6px 14px;">
              ${est.icon} ${est.label}
            </span>
          </div>
        </div>

        ${cita.estado === 'cancelada' && cita.motivoCancelacion ? `
          <div class="card" style="background-color: var(--accent-red-bg); border-color: rgba(239, 68, 68, 0.4); padding: 14px; margin-bottom: 20px;">
            <h5 style="color: var(--accent-red); font-weight: 800; margin-bottom: 4px;">Motivo de Cancelación:</h5>
            <p style="color: var(--text-primary); font-size: 0.9rem;">${cita.motivoCancelacion}</p>
          </div>
        ` : ''}

        <div class="booking-details-box">
          <div class="detail-row">
            <span class="detail-label">Cliente:</span>
            <span class="detail-val">${cita.clienteNombre}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-val">${formatearFechaLegible(cita.fechaLocal)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Horario:</span>
            <span class="detail-val" style="color: var(--accent-gold); font-size: 1.1rem;">${cita.horaInicioLocal} a ${cita.horaFinLocal} hs</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Servicio(s):</span>
            <span class="detail-val">${cita.servicios?.map(s => s.nombre).join(', ') || 'Corte'}</span>
          </div>
          ${negocio?.direccion ? `
            <div class="detail-row">
              <span class="detail-label">Dirección:</span>
              <span class="detail-val">${negocio.direccion}</span>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          ${cita.estado === 'confirmada' ? `
            <button id="btn-view-ics" class="btn btn-secondary btn-full">
              📅 Guardar en Calendario (.ics)
            </button>
            <button id="btn-cancel-cita" class="btn btn-outline btn-full" style="color: var(--accent-red); border-color: rgba(239, 68, 68, 0.4);">
              Cancelar mi Cita
            </button>
          ` : `
            <a href="./cliente.html?b=${negocio?.slug || 'la-barberia'}" class="btn btn-primary btn-full">
              Reservar un Nuevo Turno ✂️
            </a>
          `}
        </div>
      </div>
    `;

    document.getElementById('btn-view-ics')?.addEventListener('click', () => {
      descargarArchivoICS({
        titulo: `Cita en ${negocio?.nombre || 'Barbería'}`,
        descripcion: `Servicios: ${cita.servicios?.map(s => s.nombre).join(', ')}`,
        ubicacion: negocio?.direccion || '',
        inicioUTC: cita.inicioUTC || new Date().toISOString(),
        finUTC: cita.finUTC || new Date().toISOString()
      });
      showToast('Calendario descargado', 'success');
    });

    document.getElementById('btn-cancel-cita')?.addEventListener('click', async () => {
      if (confirm('¿Seguro que deseas cancelar tu cita? El turno quedará libre inmediatamente para otro cliente.')) {
        await DataService.actualizarEstadoCita(cita.negocioId, cita.id, 'cancelada', 'Cancelada por el cliente desde su enlace web');
        cita.estado = 'cancelada';
        cita.motivoCancelacion = 'Cancelada por el cliente desde su enlace web';
        showToast('Tu cita ha sido cancelada con éxito', 'info');
        render();
      }
    });
  }

  function renderError(msg) {
    container.innerHTML = `
      <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 32px 20px;">
        <span style="font-size: 2.5rem;">⚠️</span>
        <h3 style="margin: 14px 0 8px;">Cita no encontrada</h3>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">${msg}</p>
        <a href="./index.html" class="btn btn-primary">Volver al Inicio</a>
      </div>
    `;
  }

  render();
}
