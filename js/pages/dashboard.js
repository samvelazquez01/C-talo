/**
 * Panel Principal del Barbero (La Pantalla Central)
 * Vista 'Hoy' con PRÓXIMA CITA en tiempo real, countdown, acciones rápidas, huecos libres,
 * pestañas Hoy/Mañana/Semana/Mes, modal cita manual, bloqueo de tiempo y walk-ins.
 */

import { AppState, showToast, reproducirSonidoNuevaCita } from '../state.js';
import { DataService } from '../firebase-client.js';
import {
  getFechaHoyLocal,
  getCuentaRegresiva,
  formatearFechaLegible,
  sumarMinutosAHora,
  getMinutosHoyLocal
} from '../utils/date-utils.js';
import { calcularDisponibilidad } from '../shared/availability.js';
import { router } from '../router.js';

export function renderDashboard(container) {
  let unsubscribeCitas = null;
  let intervalCountdown = null;
  let tabActual = 'hoy'; // 'hoy', 'manana', 'semana', 'mes'
  let citasActuales = [];
  let colaWalkin = [];
  let ultimaCitaIds = new Set();
  let primeraCarga = true;

  const negocio = AppState.negocioActual || {
    id: 'barberia-vip',
    slug: 'la-barberia',
    nombre: 'Barbería VIP Montevideo',
    zonaHoraria: 'America/Montevideo',
    simboloMoneda: '$'
  };

  const barberos = AppState.barberos || [];
  let barberoActual = AppState.barberoSeleccionado || barberos[0];

  function getFechaPorTab(tab) {
    const hoyStr = getFechaHoyLocal(negocio.zonaHoraria);
    if (tab === 'hoy') return hoyStr;
    const [y, m, d] = hoyStr.split('-').map(Number);
    if (tab === 'manana') {
      const dt = new Date(y, m - 1, d + 1);
      const pad = (n) => String(n).padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    }
    return hoyStr;
  }

  let fechaVisible = getFechaPorTab(tabActual);

  async function conectarListenerCitas() {
    if (unsubscribeCitas) {
      unsubscribeCitas();
      unsubscribeCitas = null;
    }

    fechaVisible = getFechaPorTab(tabActual);

    unsubscribeCitas = DataService.subscribeCitasFecha(
      negocio.id,
      barberoActual.id,
      fechaVisible,
      (citas) => {
        // Detección de nueva cita en tiempo real para alertar sonoramente y visualmente
        if (!primeraCarga) {
          const nuevas = citas.filter(c => !ultimaCitaIds.has(c.id));
          if (nuevas.length > 0) {
            reproducirSonidoNuevaCita();
            showToast(`🔔 ¡Nueva cita recibida: ${nuevas[0].clienteNombre} (${nuevas[0].horaInicioLocal} hs)!`, 'success', 5000);
          }
        }
        primeraCarga = false;
        ultimaCitaIds = new Set(citas.map(c => c.id));
        citasActuales = citas;
        render();
      }
    );

    // Cargar cola de clientes sin cita (walk-ins)
    colaWalkin = await DataService.getColaEspera();
  }

  function render() {
    const esHoy = (fechaVisible === getFechaHoyLocal(negocio.zonaHoraria));
    const citasActivas = citasActuales.filter(c => c.estado !== 'cancelada');

    // Identificar Próxima Cita y Cita Después
    let proximaCita = null;
    let citaDespues = null;
    let citasRestantes = [];

    if (esHoy) {
      const ahoraMinutos = getMinutosHoyLocal(negocio.zonaHoraria);
      // Citas que aún no hayan finalizado o estén confirmadas/en proceso
      const candidatas = citasActivas.filter(c => {
        const [hh, mm] = (c.horaFinLocal || c.horaInicioLocal).split(':').map(Number);
        const finMinutos = hh * 60 + mm;
        return c.estado === 'en_proceso' || c.estado === 'llego' || (c.estado === 'confirmada' && finMinutos >= ahoraMinutos - 15);
      });

      if (candidatas.length > 0) {
        proximaCita = candidatas[0];
        if (candidatas.length > 1) {
          citaDespues = candidatas[1];
          citasRestantes = candidatas.slice(2);
        }
      }
    } else {
      if (citasActivas.length > 0) {
        proximaCita = citasActivas[0];
        if (citasActivas.length > 1) {
          citaDespues = citasActivas[1];
          citasRestantes = citasActivas.slice(2);
        }
      }
    }

    container.innerHTML = `
      <div style="padding-bottom: 50px;">
        <!-- BARRA SUPERIOR DE CONTROL -->
        <div class="dashboard-nav">
          <div class="barber-selector">
            <span style="font-size: 1.2rem;">💈</span>
            <select id="select-barbero" class="barber-select-input">
              ${barberos.map(b => `
                <option value="${b.id}" ${b.id === barberoActual.id ? 'selected' : ''}>${b.nombre}</option>
              `).join('')}
            </select>
          </div>

          <!-- BOTONES DE ACCIÓN RÁPIDA -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-nueva-cita-manual" class="btn btn-primary btn-sm">
              + Cita Manual
            </button>
            <button id="btn-bloquear-tiempo" class="btn btn-secondary btn-sm">
              ⛔ Bloquear Tiempo
            </button>
            <button id="btn-kiosk-mode" class="btn btn-secondary btn-sm" title="Modo Pantalla del Local para Tablet">
              📺 Modo Local
            </button>
          </div>
        </div>

        <!-- PESTAÑAS HOY / MAÑANA / SEMANA / MES -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div class="view-tabs">
            <button class="view-tab-btn ${tabActual === 'hoy' ? 'active' : ''}" data-tab="hoy">Hoy</button>
            <button class="view-tab-btn ${tabActual === 'manana' ? 'active' : ''}" data-tab="manana">Mañana</button>
            <button class="view-tab-btn ${tabActual === 'semana' ? 'active' : ''}" data-tab="semana">Semana</button>
            <button class="view-tab-btn ${tabActual === 'mes' ? 'active' : ''}" data-tab="mes">Mes</button>
          </div>
          <span style="font-weight: 700; color: var(--text-secondary); font-size: 0.95rem;">
            📅 ${formatearFechaLegible(fechaVisible)}
          </span>
        </div>

        <!-- SI ESTAMOS EN HOY Y HAY PRÓXIMA CITA: HERO CARD -->
        ${proximaCita ? `
          <div class="hero-next-card pulse-animation">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <span class="hero-tag">🔥 PRÓXIMA CITA</span>
              <span class="hero-countdown" id="live-countdown">
                ⏳ ${getCuentaRegresiva(proximaCita.fechaLocal, proximaCita.horaInicioLocal, negocio.zonaHoraria)}
              </span>
            </div>

            <div class="hero-time">${proximaCita.horaInicioLocal} - ${proximaCita.horaFinLocal} hs</div>
            
            <div class="hero-client">
              <span>${proximaCita.clienteNombre}</span>
              <a href="tel:${proximaCita.clienteTelefono}" class="hero-phone-link" title="Llamar directamente">
                📞 ${proximaCita.clienteTelefono}
              </a>
            </div>

            <div class="hero-service-badge">
              ✂️ ${proximaCita.servicios.map(s => s.nombre).join(' + ')} (${proximaCita.duracionTotalMin} min)
            </div>

            <!-- BOTONES DE ACCIÓN RÁPIDA (UN TOQUE) -->
            <div class="quick-actions-bar">
              <button class="btn-action-status btn-arrived" data-id="${proximaCita.id}" data-action="llego">
                📍 Llegó
              </button>
              <button class="btn-action-status btn-progress" data-id="${proximaCita.id}" data-action="en_proceso">
                ✂️ En Proceso
              </button>
              <button class="btn-action-status btn-done" data-id="${proximaCita.id}" data-action="terminada">
                ✓ Terminada
              </button>
              <button class="btn-action-status btn-noshow" data-id="${proximaCita.id}" data-action="no_se_presento">
                ✕ No Asistió
              </button>
              <button class="btn-action-status" style="border-color: var(--border-strong);" data-id="${proximaCita.id}" data-action="cancelar_modal">
                🚫 Cancelar
              </button>
            </div>
          </div>
        ` : `
          <div class="card" style="text-align: center; padding: 28px; background: var(--bg-surface-elevated); margin-bottom: 24px;">
            <span style="font-size: 2rem;">☕</span>
            <h3 style="font-size: 1.2rem; font-weight: 700; margin-top: 6px;">No tienes citas próximas inmediatas</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 4px;">Aprovecha para descansar o atender clientes sin cita previa.</p>
          </div>
        `}

        <!-- TARJETA DESPUÉS -->
        ${citaDespues ? `
          <div class="after-next-card">
            <span class="after-tag">⏳ DESPUÉS</span>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 2px;">
                  ${citaDespues.horaInicioLocal} hs · ${citaDespues.clienteNombre}
                </h4>
                <p style="color: var(--text-secondary); font-size: 0.88rem;">
                  ${citaDespues.servicios.map(s => s.nombre).join(', ')} · 📞 <a href="tel:${citaDespues.clienteTelefono}" style="color: var(--accent-blue);">${citaDespues.clienteTelefono}</a>
                </p>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="btn btn-secondary btn-sm btn-quick-action" data-id="${citaDespues.id}" data-action="llego">Llegó</button>
                <button class="btn btn-outline btn-sm btn-quick-action" data-id="${citaDespues.id}" data-action="cancelar_modal">Cancelar</button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- LISTA CRONOLÓGICA DEL DÍA CON INDICADORES DE HUECOS LIBRES -->
        <div style="margin-top: 28px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between;">
            <span>📋 Todas las Citas del Día (${citasActuales.length})</span>
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--accent-gold);">
              Ingresos est.: ${negocio.simboloMoneda || '$'}${calcularIngresosDia(citasActuales)}
            </span>
          </h3>

          <div class="timeline-list">
            ${citasActuales.length === 0 ? `
              <div class="card" style="text-align: center; padding: 24px; color: var(--text-muted);">
                No hay citas agendadas para esta fecha.
              </div>
            ` : renderTimelineConHuecos(citasActuales)}
          </div>
        </div>

        <!-- COLA DE CLIENTES SIN CITA (WALK-INS) -->
        <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
              <span>🚶 Clientes en Espera (Sin Cita)</span>
              <span class="badge badge-gold">${colaWalkin.length}</span>
            </h3>
            <button id="btn-add-walkin" class="btn btn-secondary btn-sm">+ Agregar Walk-in</button>
          </div>

          ${colaWalkin.length === 0 ? `
            <p style="font-size: 0.85rem; color: var(--text-muted);">No hay clientes presenciales en espera.</p>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${colaWalkin.map((w, idx) => `
                <div class="card" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; margin: 0;">
                  <div>
                    <h5 style="font-weight: 700; font-size: 0.95rem;">${idx + 1}. ${w.clienteNombre} (${w.clienteTelefono})</h5>
                    <span style="font-size: 0.82rem; color: var(--text-secondary);">${w.servicioNombre} · Llegada: ${w.llegadaHora}</span>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-success btn-sm btn-atender-walkin" data-id="${w.id}">Atender Ahora</button>
                    <button class="btn btn-ghost btn-sm btn-borrar-walkin" data-id="${w.id}">✕</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    bindDashboardEvents();
  }

  function renderTimelineConHuecos(citas) {
    let html = '';
    const sorted = [...citas].sort((a, b) => a.horaInicioLocal.localeCompare(b.horaInicioLocal));

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];

      // Verificar hueco libre respecto a la cita anterior
      if (i > 0) {
        const prev = sorted[i - 1];
        const [ph, pm] = prev.horaFinLocal.split(':').map(Number);
        const [ch, cm] = c.horaInicioLocal.split(':').map(Number);
        const huecoMinutos = (ch * 60 + cm) - (ph * 60 + pm);
        if (huecoMinutos >= 15) {
          html += `
            <div class="gap-indicator">
              <span>☕ Hueco libre: ${huecoMinutos} minutos (${prev.horaFinLocal} a ${c.horaInicioLocal})</span>
            </div>
          `;
        }
      }

      const estadoBadge = {
        confirmada: '<span class="badge badge-green">Confirmada</span>',
        llego: '<span class="badge badge-gold">Llegó</span>',
        en_proceso: '<span class="badge badge-amber">En Proceso</span>',
        terminada: '<span class="badge badge-muted">Terminada</span>',
        no_se_presento: '<span class="badge badge-red">No Asistió</span>',
        cancelada: '<span class="badge badge-red">Cancelada</span>'
      }[c.estado] || `<span class="badge badge-muted">${c.estado}</span>`;

      html += `
        <div class="appointment-item">
          <div class="app-time-col">
            <div class="app-time">${c.horaInicioLocal}</div>
            <div class="app-duration">${c.duracionTotalMin} min</div>
          </div>
          <div class="app-client-col">
            <div class="app-client-name">${c.clienteNombre}</div>
            <div class="app-service-name">${c.servicios.map(s => s.nombre).join(', ')}</div>
            ${c.motivoCancelacion ? `<div style="font-size: 0.78rem; color: var(--accent-red);">Motivo: ${c.motivoCancelacion}</div>` : ''}
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
            ${estadoBadge}
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-ghost btn-sm btn-cambiar-estado" data-id="${c.id}" title="Cambiar Estado">⚙️</button>
            </div>
          </div>
        </div>
      `;
    }
    return html;
  }

  function calcularIngresosDia(citas) {
    return citas
      .filter(c => c.estado !== 'cancelada' && c.estado !== 'no_se_presento')
      .reduce((sum, c) => {
        const val = c.servicios.reduce((sAcc, s) => sAcc + (s.precio || 0), 0);
        return sum + val;
      }, 0);
  }

  function bindDashboardEvents() {
    // Cambio de barbero
    document.getElementById('select-barbero')?.addEventListener('change', (e) => {
      barberoActual = barberos.find(b => b.id === e.target.value);
      AppState.set({ barberoSeleccionado: barberoActual });
      conectarListenerCitas();
    });

    // Cambio de pestaña
    container.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tabActual = btn.dataset.tab;
        conectarListenerCitas();
      });
    });

    // Acciones de estado de cita (Llegó, En proceso, Terminada, No Asistió)
    container.querySelectorAll('.btn-action-status, .btn-quick-action').forEach(btn => {
      btn.addEventListener('click', async () => {
        const citaId = btn.dataset.id;
        const accion = btn.dataset.action;

        if (accion === 'cancelar_modal') {
          abrirModalCancelar(citaId);
          return;
        }

        await DataService.actualizarEstadoCita(negocio.id, citaId, accion);
        showToast(`Estado actualizado: ${accion}`, 'success');
      });
    });

    // Modal para cambiar estado desde la lista completa
    container.querySelectorAll('.btn-cambiar-estado').forEach(btn => {
      btn.addEventListener('click', () => {
        const citaId = btn.dataset.id;
        abrirModalOpcionesCita(citaId);
      });
    });

    // Cita manual
    document.getElementById('btn-nueva-cita-manual')?.addEventListener('click', () => {
      abrirModalCitaManual();
    });

    // Bloquear tiempo
    document.getElementById('btn-bloquear-tiempo')?.addEventListener('click', () => {
      abrirModalBloquearTiempo();
    });

    // Modo Pantalla del Local (Kiosk)
    document.getElementById('btn-kiosk-mode')?.addEventListener('click', () => {
      router.navigate('/admin/pantalla');
    });

    // Agregar Walk-in
    document.getElementById('btn-add-walkin')?.addEventListener('click', () => {
      abrirModalWalkin();
    });

    // Atender Walk-in
    container.querySelectorAll('.btn-atender-walkin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const item = colaWalkin.find(w => w.id === id);
        if (item) {
          // Convertir walk-in en cita actual
          const ahoraMin = getMinutosHoyLocal(negocio.zonaHoraria);
          const pad = (n) => String(n).padStart(2, '0');
          const horaIni = `${pad(Math.floor(ahoraMin / 60))}:${pad(ahoraMin % 60)}`;
          const horaFin = sumarMinutosAHora(horaIni, item.duracionMin);

          await DataService.crearCitaManual(negocio.id, {
            negocioId: negocio.id,
            barberoId: barberoActual.id,
            clienteNombre: item.clienteNombre,
            clienteTelefono: item.clienteTelefono,
            servicios: [{ id: item.servicioId, nombre: item.servicioNombre, duracionMin: item.duracionMin, precio: 500 }],
            duracionTotalMin: item.duracionMin,
            fechaLocal: getFechaHoyLocal(negocio.zonaHoraria),
            horaInicioLocal: horaIni,
            horaFinLocal: horaFin,
            estado: 'en_proceso',
            origen: 'walkin',
            tokenCliente: `tok_walkin_${Date.now()}`
          });

          colaWalkin = colaWalkin.filter(w => w.id !== id);
          await DataService.actualizarColaEspera(colaWalkin);
          showToast(`Atendiendo a ${item.clienteNombre}`, 'success');
          render();
        }
      });
    });

    // Borrar Walk-in
    container.querySelectorAll('.btn-borrar-walkin').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        colaWalkin = colaWalkin.filter(w => w.id !== id);
        await DataService.actualizarColaEspera(colaWalkin);
        render();
      });
    });
  }

  function abrirModalCancelar(citaId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Cancelar Cita</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: 14px; font-size: 0.9rem;">
            Indica el motivo. El cliente podrá ver esta explicación cuando consulte su enlace web:
          </p>
          <div class="form-group">
            <label class="form-label">Motivo de Cancelación</label>
            <textarea id="cancel-reason" class="form-textarea" rows="3" placeholder="Ej: Imprevisto de fuerza mayor en el local. Te pedimos disculpas."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancelar-modal">Volver</button>
          <button id="btn-confirmar-cancelacion" class="btn btn-danger">Confirmar Cancelación</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.querySelector('.btn-cancelar-modal')?.addEventListener('click', cerrar);

    modal.querySelector('#btn-confirmar-cancelacion')?.addEventListener('click', async () => {
      const motivo = modal.querySelector('#cancel-reason').value.trim() || 'Cancelada por el barbero';
      await DataService.actualizarEstadoCita(negocio.id, citaId, 'cancelada', motivo);
      showToast('Cita cancelada correctamente', 'info');
      cerrar();
    });
  }

  function abrirModalOpcionesCita(citaId) {
    const cita = citasActuales.find(c => c.id === citaId);
    if (!cita) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">Gestionar Cita: ${cita.clienteNombre}</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 14px;">
            Horario: ${cita.horaInicioLocal} - ${cita.horaFinLocal} hs · ${cita.servicios.map(s => s.nombre).join(', ')}
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-secondary btn-set-state" data-state="llego">📍 Marcar que Llegó</button>
            <button class="btn btn-secondary btn-set-state" data-state="en_proceso">✂️ Marcar En Proceso</button>
            <button class="btn btn-secondary btn-set-state" data-state="terminada">✨ Marcar Terminada</button>
            <button class="btn btn-secondary btn-set-state" data-state="no_se_presento">✕ Marcar No Asistió</button>
            <button class="btn btn-outline btn-set-cancel" style="color: var(--accent-red);">🚫 Cancelar Cita con Motivo</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    modal.querySelectorAll('.btn-set-state').forEach(b => {
      b.addEventListener('click', async () => {
        await DataService.actualizarEstadoCita(negocio.id, citaId, b.dataset.state);
        showToast('Estado actualizado', 'success');
        cerrar();
      });
    });

    modal.querySelector('.btn-set-cancel')?.addEventListener('click', () => {
      cerrar();
      abrirModalCancelar(citaId);
    });
  }

  function abrirModalCitaManual() {
    const servicios = AppState.servicios || [];
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">+ Crear Cita Manual</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-manual-app">
            <div class="form-group">
              <label class="form-label">Nombre del Cliente *</label>
              <input type="text" id="man-cliente-nombre" class="form-input" required placeholder="Ej: Gonzalo Martínez">
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono *</label>
              <input type="tel" id="man-cliente-tel" class="form-input" required placeholder="Ej: +598 99 555 444">
            </div>
            <div class="form-group">
              <label class="form-label">Servicio *</label>
              <select id="man-servicio" class="form-select">
                ${servicios.map(s => `
                  <option value="${s.id}" data-dur="${s.duracionMin}" data-precio="${s.precio}">
                    ${s.nombre} (${s.duracionMin} min - $${s.precio})
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input type="date" id="man-fecha" class="form-input" value="${fechaVisible}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Hora Inicio *</label>
                <input type="time" id="man-hora" class="form-input" required value="15:00">
              </div>
            </div>
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; cursor: pointer;">
                <input type="checkbox" id="man-forzar" style="accent-color: var(--accent-gold); width: 16px; height: 16px;">
                <span>Forzar horario fuera de turnos o sobre solape (Sobreturno)</span>
              </label>
            </div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top: 10px;">Guardar Cita</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector('#form-manual-app')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = modal.querySelector('#man-cliente-nombre').value.trim();
      const tel = modal.querySelector('#man-cliente-tel').value.trim();
      const servSelect = modal.querySelector('#man-servicio');
      const servOpt = servSelect.selectedOptions[0];
      const dur = Number(servOpt.dataset.dur);
      const precio = Number(servOpt.dataset.precio);
      const fecha = modal.querySelector('#man-fecha').value;
      const hora = modal.querySelector('#man-hora').value;

      const nueva = {
        negocioId: negocio.id,
        barberoId: barberoActual.id,
        clienteNombre: nombre,
        clienteTelefono: tel,
        servicios: [{ id: servSelect.value, nombre: servOpt.text.split('(')[0].trim(), duracionMin: dur, precio }],
        duracionTotalMin: dur,
        fechaLocal: fecha,
        horaInicioLocal: hora,
        horaFinLocal: sumarMinutosAHora(hora, dur),
        estado: 'confirmada',
        origen: 'manual',
        tokenCliente: `tok_man_${Date.now()}`
      };

      await DataService.crearCitaManual(negocio.id, nueva);
      showToast('Cita manual creada con éxito', 'success');
      cerrar();
    });
  }

  function abrirModalBloquearTiempo() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">⛔ Bloquear Tiempo en Calendario</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-bloqueo">
            <div class="form-group">
              <label class="form-label">Fecha a Bloquear</label>
              <input type="date" id="blk-fecha" class="form-input" value="${fechaVisible}" required>
            </div>
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 12px;">
                <input type="checkbox" id="blk-dia-completo" style="width: 16px; height: 16px; accent-color: var(--accent-gold);">
                <span style="font-weight: 600; font-size: 0.9rem;">Bloquear el día completo (No trabajo)</span>
              </label>
            </div>
            <div class="form-row" id="blk-horas-row">
              <div class="form-group">
                <label class="form-label">Desde</label>
                <input type="time" id="blk-inicio" class="form-input" value="14:00">
              </div>
              <div class="form-group">
                <label class="form-label">Hasta</label>
                <input type="time" id="blk-fin" class="form-input" value="16:00">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Motivo (Opcional)</label>
              <input type="text" id="blk-motivo" class="form-input" placeholder="Ej: Trámite médico, Almuerzo extendido">
            </div>
            <button type="submit" class="btn btn-danger btn-full" style="margin-top: 10px;">Aplicar Bloqueo</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    const chkDia = modal.querySelector('#blk-dia-completo');
    const horasRow = modal.querySelector('#blk-horas-row');
    chkDia?.addEventListener('change', (e) => {
      horasRow.style.display = e.target.checked ? 'none' : 'grid';
    });

    modal.querySelector('#form-bloqueo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fecha = modal.querySelector('#blk-fecha').value;
      const esDiaCompleto = chkDia.checked;
      const inicio = esDiaCompleto ? null : modal.querySelector('#blk-inicio').value;
      const fin = esDiaCompleto ? null : modal.querySelector('#blk-fin').value;
      const motivo = modal.querySelector('#blk-motivo').value.trim() || 'Tiempo no disponible';

      if (!barberoActual.bloqueos) barberoActual.bloqueos = [];
      barberoActual.bloqueos.push({
        id: `blk-${Date.now()}`,
        fecha,
        inicio,
        fin,
        motivo
      });

      await DataService.guardarBarbero(negocio.id, barberoActual);
      showToast('Tiempo bloqueado correctamente en la agenda pública', 'info');
      cerrar();
    });
  }

  function abrirModalWalkin() {
    const servicios = AppState.servicios || [];
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">+ Agregar Cliente en Espera (Walk-in)</h3>
          <button class="btn-close-modal" style="font-size: 1.5rem;">&times;</button>
        </div>
        <div class="modal-body">
          <form id="form-walkin">
            <div class="form-group">
              <label class="form-label">Nombre del Cliente *</label>
              <input type="text" id="wk-nombre" class="form-input" required placeholder="Ej: Matías">
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono Móvil (Opcional)</label>
              <input type="tel" id="wk-tel" class="form-input" placeholder="+598 99 ...">
            </div>
            <div class="form-group">
              <label class="form-label">Servicio</label>
              <select id="wk-servicio" class="form-select">
                ${servicios.map(s => `<option value="${s.id}" data-dur="${s.duracionMin}">${s.nombre}</option>`).join('')}
              </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full" style="margin-top: 10px;">Agregar a la Cola</button>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrar = () => modal.remove();
    modal.querySelector('.btn-close-modal')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

    modal.querySelector('#form-walkin')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = modal.querySelector('#wk-nombre').value.trim();
      const tel = modal.querySelector('#wk-tel').value.trim() || 'Presencial';
      const servSelect = modal.querySelector('#wk-servicio');
      const opt = servSelect.selectedOptions[0];
      const dur = Number(opt.dataset.dur);

      const ahora = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const horaStr = `${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

      const nuevoWalkin = await DataService.agregarAColaEspera({
        clienteNombre: nombre,
        clienteTelefono: tel,
        servicioId: servSelect.value,
        servicioNombre: opt.text,
        duracionMin: dur,
        llegadaHora: horaStr
      });

      colaWalkin.push(nuevoWalkin);
      showToast('Cliente añadido a la cola de espera', 'success');
      cerrar();
      render();
    });
  }

  // Intervalo para actualizar el countdown en vivo cada 30 segundos
  intervalCountdown = setInterval(() => {
    const el = document.getElementById('live-countdown');
    const proxima = citasActuales.find(c => c.estado === 'confirmada' || c.estado === 'en_proceso' || c.estado === 'llego');
    if (el && proxima) {
      el.innerText = `⏳ ${getCuentaRegresiva(proxima.fechaLocal, proxima.horaInicioLocal, negocio.zonaHoraria)}`;
    }
  }, 30000);

  // Iniciar listener
  conectarListenerCitas();
}
