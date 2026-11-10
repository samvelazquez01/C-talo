/**
 * Gestión de Barberos, Horarios Semanales, Reglas de Algoritmo y Vinculación Telegram
 */

import { AppState, showToast } from '../state.js';
import { DataService } from '../firebase-client.js';
import { renderizarQR, descargarQR } from '../utils/qr-generator.js';
import { comprimirImagen } from '../utils/image-compressor.js';
import { getAppBaseUrl } from '../db.js';

export async function renderBarbers(container) {
  const negocio = AppState.negocioActual || { id: 'barberia-vip', slug: 'la-barberia' };
  let barberos = await DataService.getBarberosByNegocio(negocio.id);
  const servicios = await DataService.getServiciosByNegocio(negocio.id);
  let barberoActivo = barberos[0];

  function render() {
    if (!barberoActivo && barberos.length > 0) barberoActivo = barberos[0];
    const urlBarbero = `${getAppBaseUrl()}cliente.html?b=${negocio.slug}&barbero=${barberoActivo?.slug || ''}`;

    container.innerHTML = `
      <div style="max-width: 760px; margin: 0 auto; padding-bottom: 60px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.6rem; font-weight: 800;">💈 Equipo y Horarios de Barberos</h2>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Turnos semanales, reglas del algoritmo y enlaces personales</p>
          </div>
          <button id="btn-crear-barbero" class="btn btn-primary">+ Nuevo Barbero</button>
        </div>

        <!-- SELECTOR DE BARBERO -->
        <div style="display: flex; gap: 10px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 6px;">
          ${barberos.map(b => `
            <button class="btn ${b.id === barberoActivo?.id ? 'btn-primary' : 'btn-secondary'} btn-sm btn-select-barber" data-id="${b.id}">
              ${b.nombre} ${b.activo ? '' : '(Inactivo)'}
            </button>
          `).join('')}
        </div>

        ${barberoActivo ? `
          <!-- CARD ENLACE DIRECTO DEL BARBERO CON QR -->
          <div class="card" style="background: linear-gradient(135deg, var(--bg-surface) 0%, rgba(212, 175, 55, 0.08) 100%); border: 1.5px solid var(--accent-gold); margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              <div>
                <span class="badge badge-gold" style="margin-bottom: 6px;">🔗 Enlace Directo a su Agenda</span>
                <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-primary); word-break: break-all;">
                  ${urlBarbero}
                </div>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">
                  Tus clientes van directo a elegir día y hora con ${barberoActivo.nombre}.
                </p>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="btn-copy-barber-link" class="btn btn-secondary btn-sm">📋 Copiar Enlace</button>
                <button id="btn-qr-barber-link" class="btn btn-primary btn-sm">📱 Ver QR</button>
              </div>
            </div>
          </div>

          <!-- BOTÓN VINCULACIÓN TELEGRAM -->
          <div class="card" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 20px; margin-bottom: 24px; border: 1.5px solid #0284c7; background-color: rgba(2, 132, 199, 0.06);">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.4rem;">✈️</span>
                <h4 style="font-weight: 800; font-size: 1.1rem;">Notificaciones en Telegram</h4>
              </div>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">
                ${barberoActivo.telegram?.conectado
                  ? '✅ Bot de Telegram vinculado. Recibes citas nuevas y recordatorios automáticos.'
                  : 'Recibe alertas instantáneas de nuevas citas y recordatorios 15 min antes en tu Telegram gratis.'}
              </p>
            </div>
            <button id="btn-conectar-telegram" class="btn ${barberoActivo.telegram?.conectado ? 'btn-secondary' : 'btn-primary'} btn-sm">
              ${barberoActivo.telegram?.conectado ? 'Reconectar Telegram' : 'Conectar Telegram 🤖'}
            </button>
          </div>

          <!-- PERFIL DEL BARBERO -->
          <div class="card" style="margin-bottom: 24px;">
            <h3 class="card-title" style="margin-bottom: 16px;">Perfil y Servicios Activos</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nombre del Barbero</label>
                <input type="text" id="b-nombre" class="form-input" value="${barberoActivo.nombre}">
              </div>
              <div class="form-group">
                <label class="form-label">Teléfono Móvil</label>
                <input type="tel" id="b-telefono" class="form-input" value="${barberoActivo.telefono || ''}">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Especialidad</label>
                <input type="text" id="b-especialidad" class="form-input" value="${barberoActivo.especialidad || ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Foto de Perfil (ImgBB - se comprime a ~400px)</label>
                <input type="file" id="b-foto-file" accept="image/*" class="form-input">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Servicios que Realiza este Barbero:</label>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 8px;">
                ${servicios.map(s => {
                  const check = (barberoActivo.serviciosActivos || []).includes(s.id);
                  return `
                    <label style="display: flex; align-items: center; gap: 8px; background: var(--bg-surface-elevated); padding: 10px; border-radius: var(--radius-md); cursor: pointer;">
                      <input type="checkbox" class="cb-barber-serv" data-id="${s.id}" ${check ? 'checked' : ''} style="accent-color: var(--accent-gold);">
                      <span style="font-size: 0.9rem; font-weight: 600;">${s.nombre}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- REGLAS DEL ALGORITMO DE DISPONIBILIDAD -->
          <div class="card" style="margin-bottom: 24px;">
            <h3 class="card-title" style="margin-bottom: 16px;">⚙️ Reglas del Algoritmo (Optimización)</h3>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Paso de la Cuadrícula</label>
                <select id="reg-cuadricula" class="form-select">
                  <option value="5" ${barberoActivo.reglas?.pasoCuadriculaMin === 5 ? 'selected' : ''}>Cada 5 min</option>
                  <option value="10" ${barberoActivo.reglas?.pasoCuadriculaMin === 10 ? 'selected' : ''}>Cada 10 min</option>
                  <option value="15" ${barberoActivo.reglas?.pasoCuadriculaMin === 15 ? 'selected' : ''}>Cada 15 min (Por defecto)</option>
                  <option value="30" ${barberoActivo.reglas?.pasoCuadriculaMin === 30 ? 'selected' : ''}>Cada 30 min</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Anticipación Mínima</label>
                <select id="reg-anticipacion" class="form-select">
                  <option value="15" ${barberoActivo.reglas?.anticipacionMinimaMin === 15 ? 'selected' : ''}>15 minutos</option>
                  <option value="30" ${barberoActivo.reglas?.anticipacionMinimaMin === 30 ? 'selected' : ''}>30 minutos</option>
                  <option value="60" ${barberoActivo.reglas?.anticipacionMinimaMin === 60 ? 'selected' : ''}>1 hora</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Recordatorio Telegram Antes de Cita</label>
                <select id="reg-recordatorio" class="form-select">
                  <option value="5" ${barberoActivo.reglas?.minutosRecordatorio === 5 ? 'selected' : ''}>5 minutos antes</option>
                  <option value="10" ${barberoActivo.reglas?.minutosRecordatorio === 10 ? 'selected' : ''}>10 minutos antes</option>
                  <option value="15" ${barberoActivo.reglas?.minutosRecordatorio === 15 ? 'selected' : ''}>15 minutos antes (Por defecto)</option>
                  <option value="30" ${barberoActivo.reglas?.minutosRecordatorio === 30 ? 'selected' : ''}>30 minutos antes</option>
                  <option value="60" ${barberoActivo.reglas?.minutosRecordatorio === 60 ? 'selected' : ''}>1 hora antes</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Hora Resumen Diario</label>
                <input type="time" id="reg-resumen-hora" class="form-input" value="${barberoActivo.reglas?.horaResumenDiario || '08:30'}">
              </div>
            </div>

            <div style="background-color: var(--accent-gold-light); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: var(--radius-md); padding: 14px; margin-top: 10px;">
              <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <input type="checkbox" id="reg-compactar" ${barberoActivo.reglas?.compactarAgenda ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
                <div>
                  <span style="font-weight: 800; font-size: 0.95rem; color: var(--accent-gold);">Modo 'Compactar Agenda'</span>
                  <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
                    Solo ofrece horas pegadas a una cita ya existente o al inicio/fin del turno, evitando huecos muertos en medio de la jornada.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <!-- BOTÓN GUARDAR -->
          <button id="btn-guardar-barbero" class="btn btn-primary btn-lg btn-full">
            💾 Guardar Configuración de ${barberoActivo.nombre}
          </button>
        ` : ''}
      </div>
    `;

    bindBarberEvents();
  }

  function bindBarberEvents() {
    container.querySelectorAll('.btn-select-barber').forEach(b => {
      b.addEventListener('click', () => {
        barberoActivo = barberos.find(item => item.id === b.dataset.id);
        render();
      });
    });

    // Copiar enlace
    document.getElementById('btn-copy-barber-link')?.addEventListener('click', () => {
      const url = `${getAppBaseUrl()}cliente.html?b=${negocio.slug}&barbero=${barberoActivo.slug}`;
      navigator.clipboard?.writeText(url).then(() => {
        showToast('Enlace personal del barbero copiado', 'success');
      });
    });

    // Ver QR
    document.getElementById('btn-qr-barber-link')?.addEventListener('click', () => {
      const url = `${getAppBaseUrl()}cliente.html?b=${negocio.slug}&barbero=${barberoActivo.slug}`;
      mostrarModalQR(url, `${barberoActivo.slug}-qr.png`);
    });

    // Conectar Telegram
    document.getElementById('btn-conectar-telegram')?.addEventListener('click', () => {
      abrirModalConectarTelegram();
    });

    // Comprimir foto
    document.getElementById('b-foto-file')?.addEventListener('change', async (e) => {
      if (e.target.files?.[0]) {
        try {
          const comp = await comprimirImagen(e.target.files[0], 400);
          barberoActivo.fotoUrl = comp.dataUrl;
          showToast('Foto comprimida a ~400px lista para guardar', 'success');
        } catch (err) {
          showToast('Error con la imagen: ' + err.message, 'error');
        }
      }
    });

    // Guardar cambios
    document.getElementById('btn-guardar-barbero')?.addEventListener('click', async () => {
      barberoActivo.nombre = document.getElementById('b-nombre').value.trim();
      barberoActivo.telefono = document.getElementById('b-telefono').value.trim();
      barberoActivo.especialidad = document.getElementById('b-especialidad').value.trim();

      const servs = [];
      container.querySelectorAll('.cb-barber-serv:checked').forEach(cb => {
        servs.push(cb.dataset.id);
      });
      barberoActivo.serviciosActivos = servs;

      barberoActivo.reglas = {
        ...barberoActivo.reglas,
        pasoCuadriculaMin: Number(document.getElementById('reg-cuadricula').value),
        anticipacionMinimaMin: Number(document.getElementById('reg-anticipacion').value),
        minutosRecordatorio: Number(document.getElementById('reg-recordatorio').value),
        horaResumenDiario: document.getElementById('reg-resumen-hora').value,
        compactarAgenda: document.getElementById('reg-compactar').checked
      };

      await DataService.guardarBarbero(negocio.id, barberoActivo);
      showToast('Configuración del barbero guardada', 'success');
    });
  }

  function abrirModalConectarTelegram() {
    const token = `tg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const botUser = 'AgendaBarberBot'; // Placeholder configurable
    const deepLink = `https://t.me/${botUser}?start=${token}`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title">🤖 Conectar con Telegram</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <span style="font-size: 3rem;">✈️</span>
          <h4 style="font-size: 1.2rem; font-weight: 800; margin: 10px 0 6px;">Vinculación en 1 toque</h4>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 20px;">
            Abre el enlace en tu Telegram y pulsa <strong>INICIAR</strong>. El bot se conectará automáticamente con tu perfil de barbero:
          </p>
          <a href="${deepLink}" target="_blank" class="btn btn-primary btn-full btn-lg" style="margin-bottom: 12px;">
            Abrir Telegram (${botUser})
          </a>
          <button id="btn-simular-tg" class="btn btn-secondary btn-sm btn-full">
            Simular Vinculación Exitosa (Demo)
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector('#btn-simular-tg')?.addEventListener('click', async () => {
      barberoActivo.telegram = {
        conectado: true,
        chatId: `sim_chat_${Date.now()}`
      };
      await DataService.guardarBarbero(negocio.id, barberoActivo);
      showToast('¡Telegram conectado con éxito!', 'success');
      cerrar();
      render();
    });
  }

  function mostrarModalQR(url, nombreArchivo) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title">Código QR del Barbero</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <canvas id="qr-modal-canvas" style="border-radius: var(--radius-md); box-shadow: var(--shadow-md); margin: 0 auto; display: block;"></canvas>
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button id="btn-dl-qr" class="btn btn-primary">Descargar QR en PNG</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const canvas = modal.querySelector('#qr-modal-canvas');
    renderizarQR(canvas, url, { size: 240 });

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
    modal.querySelector('#btn-dl-qr')?.addEventListener('click', () => {
      descargarQR(canvas, nombreArchivo);
      showToast('QR descargado', 'success');
    });
  }

  render();
}
