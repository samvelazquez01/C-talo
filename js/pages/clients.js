/**
 * Historial de Clientes y Ficha Técnica
 * Visitas, cancelaciones, no asistidos y notas personalizadas de cortes/preferencias.
 */

import { AppState, showToast } from '../state.js';
import { DataService } from '../firebase-client.js';

export async function renderClients(container) {
  const negocio = AppState.negocioActual || { id: 'barberia-vip' };
  let clientes = await DataService.getClientesHistorial(negocio.id);
  let busqueda = '';

  function render() {
    const filtrados = clientes.filter(c =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.telefono.includes(busqueda)
    );

    container.innerHTML = `
      <div style="max-width: 760px; margin: 0 auto; padding-bottom: 50px;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.6rem; font-weight: 800;">👥 Clientes y Ficha Técnica</h2>
          <p style="color: var(--text-secondary); font-size: 0.9rem;">Historial de visitas, asistencias y preferencias de corte</p>
        </div>

        <div style="margin-bottom: 20px;">
          <input type="text" id="input-buscar-cliente" class="form-input" placeholder="🔍 Buscar por nombre o teléfono..." value="${busqueda}">
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${filtrados.length === 0 ? `
            <div class="card" style="text-align: center; padding: 28px; color: var(--text-muted);">
              No se encontraron clientes registrados con ese criterio.
            </div>
          ` : filtrados.map(c => `
            <div class="card" style="padding: 18px 20px; margin: 0;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div>
                  <h4 style="font-size: 1.15rem; font-weight: 700;">${c.nombre}</h4>
                  <a href="tel:${c.telefono}" style="color: var(--accent-blue); font-size: 0.9rem; font-weight: 600;">
                    📞 ${c.telefono}
                  </a>
                </div>
                <div style="display: flex; gap: 6px;">
                  <span class="badge badge-green" title="Total Visitas">✂️ ${c.totalVisitas || 0} visitas</span>
                  ${c.cancelaciones > 0 ? `<span class="badge badge-amber" title="Cancelaciones">🚫 ${c.cancelaciones} canc.</span>` : ''}
                  ${c.noPresentados > 0 ? `<span class="badge badge-red" title="No se presentó">✕ ${c.noPresentados} faltas</span>` : ''}
                </div>
              </div>

              <div style="background: var(--bg-surface-elevated); padding: 10px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-gold); text-transform: uppercase;">
                    📝 Notas & Preferencias de Corte:
                  </span>
                  <button class="btn btn-ghost btn-sm btn-editar-nota" data-tel="${c.telefono}" style="font-size: 0.78rem;">
                    Editar Notas
                  </button>
                </div>
                <p style="font-size: 0.88rem; color: var(--text-primary); font-style: italic;">
                  "${c.notas || 'Sin notas registradas aún.'}"
                </p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    document.getElementById('input-buscar-cliente')?.addEventListener('input', (e) => {
      busqueda = e.target.value.trim();
      render();
      document.getElementById('input-buscar-cliente')?.focus();
    });

    container.querySelectorAll('.btn-editar-nota').forEach(b => {
      b.addEventListener('click', () => {
        const tel = b.dataset.tel;
        const cli = clientes.find(c => c.telefono === tel);
        if (cli) abrirModalNota(cli);
      });
    });
  }

  function abrirModalNota(cliente) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Notas de ${cliente.nombre}</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Preferencias, detalles de degradado, máquina, estilo:</label>
            <textarea id="edit-cli-notas" class="form-textarea" rows="4">${cliente.notas || ''}</textarea>
          </div>
          <button id="btn-save-nota" class="btn btn-primary btn-full">Guardar Notas</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector('#btn-save-nota')?.addEventListener('click', async () => {
      const notas = modal.querySelector('#edit-cli-notas').value.trim();
      cliente.notas = notas;
      await DataService.guardarClienteHistorial(negocio.id, cliente);
      showToast('Notas del cliente actualizadas', 'success');
      cerrar();
      render();
    });
  }

  render();
}
