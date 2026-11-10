/**
 * Gestión de Servicios de la Barbería
 * CRUD completo: Crear, editar, eliminar, tiempos de descanso post-servicio y estado activo.
 */

import { AppState, showToast } from '../state.js';
import { DataService } from '../firebase-client.js';

export async function renderServices(container) {
  const negocio = AppState.negocioActual || { id: 'barberia-vip', simboloMoneda: '$' };
  let servicios = await DataService.getServiciosByNegocio(negocio.id);

  function render() {
    container.innerHTML = `
      <div style="max-width: 720px; margin: 0 auto; padding-bottom: 50px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800;">💇 Catálogo de Servicios</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Configura la oferta, duraciones y tiempos de descanso</p>
          </div>
          <button id="btn-crear-servicio" class="btn btn-primary">+ Nuevo Servicio</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${servicios.map(s => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; gap: 16px; margin: 0;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <h4 style="font-size: 1.15rem; font-weight: 700;">${s.nombre}</h4>
                  <span class="badge ${s.activo ? 'badge-green' : 'badge-muted'}">
                    ${s.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                ${s.descripcion ? `<p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">${s.descripcion}</p>` : ''}
                <div style="display: flex; gap: 14px; font-size: 0.9rem; font-weight: 600;">
                  <span style="color: var(--accent-gold); font-size: 1.05rem;">${negocio.simboloMoneda || '$'}${s.precio}</span>
                  <span style="color: var(--text-muted);">⏱ ${s.duracionMin} min de servicio</span>
                  ${s.descansoPostMin ? `<span style="color: var(--accent-blue);">🧹 +${s.descansoPostMin} min descanso</span>` : ''}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm btn-editar-serv" data-id="${s.id}">Editar</button>
                <button class="btn btn-ghost btn-sm btn-eliminar-serv" data-id="${s.id}" style="color: var(--accent-red);">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('btn-crear-servicio')?.addEventListener('click', () => {
      abrirModalServicio();
    });

    container.querySelectorAll('.btn-editar-serv').forEach(b => {
      b.addEventListener('click', () => {
        const serv = servicios.find(s => s.id === b.dataset.id);
        if (serv) abrirModalServicio(serv);
      });
    });

    container.querySelectorAll('.btn-eliminar-serv').forEach(b => {
      b.addEventListener('click', async () => {
        const servId = b.dataset.id;
        if (confirm('¿Eliminar este servicio del catálogo?')) {
          await DataService.eliminarServicio(negocio.id, servId);
          servicios = servicios.filter(s => s.id !== servId);
          AppState.set({ servicios });
          showToast('Servicio eliminado', 'info');
          render();
        }
      });
    });
  }

  function abrirModalServicio(serv = null) {
    const isEdit = Boolean(serv);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-serv">
            <div class="form-group">
              <label class="form-label">Nombre del Servicio *</label>
              <input type="text" id="serv-nombre" class="form-input" required value="${serv?.nombre || ''}" placeholder="Ej: Corte Degradado + Lavado">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Duración (Cualquier valor en min) *</label>
                <input type="number" id="serv-dur" class="form-input" required min="5" step="5" value="${serv?.duracionMin || 30}">
              </div>
              <div class="form-group">
                <label class="form-label">Precio (${negocio.simboloMoneda || '$'}) *</label>
                <input type="number" id="serv-precio" class="form-input" required min="0" step="10" value="${serv?.precio || 500}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Descanso / Limpieza posterior (Minutos opcionales)</label>
              <input type="number" id="serv-descanso" class="form-input" min="0" step="5" value="${serv?.descansoPostMin || 0}" placeholder="0 min">
              <small style="color: var(--text-muted); font-size: 0.8rem; display: block; margin-top: 4px;">
                Tiempo adicional para desinfectar sillón, herramientas o tomar un respiro.
              </small>
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <textarea id="serv-desc" class="form-textarea" rows="2" placeholder="Detalles de lo que incluye el servicio...">${serv?.descripcion || ''}</textarea>
            </div>
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="serv-activo" ${serv?.activo !== false ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                <span style="font-weight: 600;">Servicio activo y visible para reservas de clientes</span>
              </label>
            </div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top: 10px;">
              ${isEdit ? 'Guardar Cambios' : 'Crear Servicio'}
            </button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector('#form-serv')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        id: serv?.id || `serv-${Date.now()}`,
        nombre: modal.querySelector('#serv-nombre').value.trim(),
        duracionMin: Number(modal.querySelector('#serv-dur').value) || 30,
        precio: Number(modal.querySelector('#serv-precio').value) || 0,
        descansoPostMin: Number(modal.querySelector('#serv-descanso').value) || 0,
        descripcion: modal.querySelector('#serv-desc').value.trim(),
        activo: modal.querySelector('#serv-activo').checked
      };

      await DataService.guardarServicio(negocio.id, payload);
      if (isEdit) {
        const idx = servicios.findIndex(s => s.id === payload.id);
        if (idx >= 0) servicios[idx] = payload;
      } else {
        servicios.push(payload);
      }

      AppState.set({ servicios });
      showToast('Servicio guardado con éxito', 'success');
      cerrar();
      render();
    });
  }

  render();
}
