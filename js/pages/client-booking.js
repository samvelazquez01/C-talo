/**
 * Página de Reserva del Cliente (Ultrarrápida, Mobile-First)
 * Rutas: /b/:negocioSlug o /b/:negocioSlug/:barberoSlug
 */

import { CONFIG } from '../config.js';
import { DataService } from '../firebase-client.js';
import { calcularDisponibilidad } from '../shared/availability.js';
import {
  getFechaHoyLocal,
  getMinutosHoyLocal,
  formatearFechaLegible,
  sumarMinutosAHora
} from '../utils/date-utils.js';
import { descargarArchivoICS } from '../utils/ics-generator.js';
import { renderizarQR, descargarQR } from '../utils/qr-generator.js';
import { showToast } from '../state.js';
import { getAppBaseUrl } from '../db.js';

export async function renderClientBooking(container, params = {}) {
  const { negocioSlug, barberoSlug } = params;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div class="brand-icon" style="font-size: 2.5rem; margin-bottom: 12px; animation: spin 1s linear infinite;">⏳</div>
      <p style="font-weight: 700; color: var(--text-secondary);">Cargando agenda de la barbería...</p>
    </div>
  `;

  // 1. Cargar Negocio
  const negocio = await DataService.getNegocioBySlug(negocioSlug);
  if (!negocio) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px 20px; max-width: 500px; margin: 40px auto;">
        <span style="font-size: 3rem;">💈</span>
        <h2 style="margin: 16px 0 8px;">Barbería no encontrada</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">El enlace /b/${negocioSlug} no corresponde a ninguna barbería activa.</p>
        <a href="./index.html" class="btn btn-primary">Ir al Inicio</a>
      </div>
    `;
    return;
  }

  // 2. Cargar Barberos y Servicios
  const barberos = (await DataService.getBarberosByNegocio(negocio.id)).filter(b => b.activo);
  const servicios = (await DataService.getServiciosByNegocio(negocio.id)).filter(s => s.activo);

  if (barberos.length === 0 || servicios.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px 20px; max-width: 500px; margin: 40px auto;">
        <h2>Barbería en preparación</h2>
        <p style="color: var(--text-secondary);">Esta barbería aún no ha publicado servicios o barberos disponibles.</p>
      </div>
    `;
    return;
  }

  // Preseleccionar barbero si viene en la URL
  let barberoSeleccionado = null;
  if (barberoSlug) {
    barberoSeleccionado = barberos.find(b => b.slug === barberoSlug) || barberos[0];
  } else if (barberos.length === 1) {
    barberoSeleccionado = barberos[0];
  }

  // Estado del flujo de reserva
  let serviciosSeleccionados = [servicios[0].id]; // Primer servicio por defecto
  const hoyLocal = getFechaHoyLocal(negocio.zonaHoraria);
  let fechaSeleccionada = hoyLocal;
  let slotSeleccionado = null;
  let slotsDisponibles = [];
  let cargandoSlots = false;
  let citaConfirmada = null;

  // Generar lista de próximos 14 días para el selector
  const diasDisponibles = generarProximosDias(hoyLocal, 14);

  async function actualizarSlots() {
    if (!barberoSeleccionado) return;
    cargandoSlots = true;
    render();

    // 1. Obtener documento de disponibilidad optimizado del día
    const dispoDoc = await DataService.getDisponibilidadDoc(barberoSeleccionado.id, fechaSeleccionada);
    const ocupadosDelDia = dispoDoc?.ocupados || [];

    // 2. Duración combinada de todos los servicios elegidos
    const serviciosObjetos = servicios.filter(s => serviciosSeleccionados.includes(s.id));
    const duracionTotal = serviciosObjetos.reduce((acc, s) => acc + s.duracionMin, 0);

    // 3. dMin = duración del servicio activo más corto del barbero
    const dMin = Math.min(...servicios.map(s => s.duracionMin), 15);

    // 4. Calcular slots con el módulo compartido de disponibilidad
    const esHoy = (fechaSeleccionada === hoyLocal);
    const ahoraMinutos = esHoy ? getMinutosHoyLocal(negocio.zonaHoraria) : null;

    slotsDisponibles = calcularDisponibilidad({
      fecha: fechaSeleccionada,
      duracionServicio: duracionTotal,
      dMin,
      horarioSemanal: barberoSeleccionado.horarioSemanal,
      citasExistentes: ocupadosDelDia.map(o => ({
        horaInicioLocal: o.inicio,
        horaFinLocal: o.fin,
        estado: 'confirmada'
      })),
      bloqueos: barberoSeleccionado.bloqueos || [],
      vacaciones: barberoSeleccionado.vacaciones || [],
      reglas: barberoSeleccionado.reglas || {},
      ahoraMinutos,
      esHoy
    });

    cargandoSlots = false;
    render();
  }

  function render() {
    if (citaConfirmada) {
      renderPantallaConfirmacion();
      return;
    }

    const serviciosObjetos = servicios.filter(s => serviciosSeleccionados.includes(s.id));
    const totalPrecio = serviciosObjetos.reduce((acc, s) => {
      // Precio personalizado del barbero si existe
      const custom = barberoSeleccionado?.preciosPersonalizados?.[s.id];
      return acc + (custom !== undefined ? custom : s.precio);
    }, 0);
    const totalMinutos = serviciosObjetos.reduce((acc, s) => acc + s.duracionMin, 0);

    // Grupos de horas: Mañana (< 13:00) y Tarde (>= 13:00)
    const slotsManana = slotsDisponibles.filter(s => s.minutos < 780);
    const slotsTarde = slotsDisponibles.filter(s => s.minutos >= 780);

    container.innerHTML = `
      <div style="max-width: 580px; margin: 0 auto; padding-bottom: 90px;">
        <!-- HEADER DEL NEGOCIO -->
        <header class="booking-header">
          <img src="${negocio.logoUrl || '/assets/icons/icon.svg'}" alt="${negocio.nombre}" class="booking-logo">
          <h1 class="booking-biz-name">${negocio.nombre}</h1>
          <p class="booking-biz-desc">${negocio.descripcion || 'Reserva tu turno en línea'}</p>
          <div style="margin-top: 10px; display: flex; justify-content: center; gap: 8px;">
            <button id="btn-share-link" class="btn btn-secondary btn-sm" title="Compartir enlace">🔗 Copiar enlace</button>
            <button id="btn-show-qr" class="btn btn-secondary btn-sm" title="Ver código QR">📱 Descargar QR</button>
          </div>
        </header>

        <!-- PASO 1: SELECCIÓN DE SERVICIOS -->
        <section style="margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="background: var(--accent-gold); color: #0b0f17; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">1</span>
            Elige tu(s) servicio(s)
          </h3>
          <div class="services-grid">
            ${servicios.map(s => {
              const isSelected = serviciosSeleccionados.includes(s.id);
              const precioBarbero = barberoSeleccionado?.preciosPersonalizados?.[s.id] ?? s.precio;
              return `
                <div class="service-card-select ${isSelected ? 'selected' : ''}" data-service-id="${s.id}">
                  <div class="service-select-info">
                    <h4>${s.nombre}</h4>
                    ${s.descripcion ? `<p class="service-select-desc">${s.descripcion}</p>` : ''}
                    <div class="service-select-meta">
                      <span class="service-price">${negocio.simboloMoneda || '$'}${precioBarbero}</span>
                      <span class="service-duration">⏱ ${s.duracionMin} min</span>
                    </div>
                  </div>
                  <div class="service-check">${isSelected ? '✓' : ''}</div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- PASO 2: SELECCIÓN DE BARBERO (SI HAY MÁS DE 1 O ENTRÓ POR NEGOCIO) -->
        ${barberos.length > 1 ? `
          <section style="margin-bottom: 24px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
              <span style="background: var(--accent-gold); color: #0b0f17; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">2</span>
              Elige tu Barbero
            </h3>
            <div class="barbers-grid">
              ${barberos.map(b => {
                const isSelected = barberoSeleccionado?.id === b.id;
                return `
                  <div class="barber-card-select ${isSelected ? 'selected' : ''}" data-barber-id="${b.id}">
                    <img src="${b.fotoUrl || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80'}" class="barber-avatar" alt="${b.nombre}">
                    <div>
                      <h4 style="font-weight: 700;">${b.nombre}</h4>
                      <p style="font-size: 0.82rem; color: var(--text-secondary);">${b.especialidad || 'Barbero profesional'}</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}

        <!-- PASO 3: SELECCIÓN DE DÍA -->
        <section style="margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="background: var(--accent-gold); color: #0b0f17; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">${barberos.length > 1 ? '3' : '2'}</span>
            Selecciona el Día
          </h3>
          <div class="days-slider">
            ${diasDisponibles.map(d => {
              const isSelected = (d.fechaStr === fechaSeleccionada);
              return `
                <div class="day-pill ${isSelected ? 'selected' : ''}" data-fecha="${d.fechaStr}">
                  <span class="day-pill-name">${d.diaNombre}</span>
                  <span class="day-pill-num">${d.diaNumero}</span>
                  <span class="day-pill-month">${d.mesCorto}</span>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- PASO 4: SELECCIÓN DE HORA -->
        <section style="margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="background: var(--accent-gold); color: #0b0f17; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">${barberos.length > 1 ? '4' : '3'}</span>
            Horas Disponibles (${formatearFechaLegible(fechaSeleccionada)})
          </h3>

          ${cargandoSlots ? `
            <div style="text-align: center; padding: 24px;">
              <span style="font-size: 1.5rem;">⏳</span>
              <p style="color: var(--text-muted); font-size: 0.9rem;">Calculando disponibilidad sin solapes...</p>
            </div>
          ` : slotsDisponibles.length === 0 ? `
            <div class="card" style="text-align: center; padding: 24px; background: var(--bg-surface-elevated);">
              <p style="font-weight: 700; color: var(--text-secondary);">No hay turnos disponibles para este día</p>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Por favor, elige otra fecha en el calendario superior.</p>
            </div>
          ` : `
            ${slotsManana.length > 0 ? `
              <div class="time-slots-group-title">🌅 Mañana</div>
              <div class="slots-grid">
                ${slotsManana.map(s => renderSlotBtn(s, slotSeleccionado)).join('')}
              </div>
            ` : ''}

            ${slotsTarde.length > 0 ? `
              <div class="time-slots-group-title">🌇 Tarde</div>
              <div class="slots-grid">
                ${slotsTarde.map(s => renderSlotBtn(s, slotSeleccionado)).join('')}
              </div>
            ` : ''}
          `}
        </section>

        <!-- PASO 5: DATOS DE CONTACTO Y CONFIRMACIÓN -->
        ${slotSeleccionado ? `
          <section class="card animate-fade-in" style="border: 2px solid var(--accent-gold);">
            <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 14px;">Completa tus datos para confirmar</h3>
            
            <form id="booking-client-form">
              <div class="form-group">
                <label class="form-label">Tu Nombre y Apellido *</label>
                <input type="text" id="client-name" class="form-input" placeholder="Ej: Santiago Giménez" required>
              </div>

              <div class="form-group">
                <label class="form-label">Tu Teléfono Móvil *</label>
                <input type="tel" id="client-phone" class="form-input" placeholder="Ej: +598 99 123 456" required>
                <small style="color: var(--text-muted); font-size: 0.8rem; display: block; margin-top: 4px;">Te enviaremos los datos de tu reserva a este número.</small>
              </div>

              <button type="submit" id="btn-submit-booking" class="btn btn-primary btn-lg btn-full" style="margin-top: 10px;">
                Confirmar Reserva (${slotSeleccionado.hora} hs) ✂️
              </button>
            </form>
          </section>
        ` : ''}

        <!-- BARRA INFERIOR FLOTANTE CON RESUMEN -->
        <div class="booking-bottom-bar">
          <div class="booking-summary-text">
            <h5>${serviciosObjetos.length} servicio(s) · ${totalMinutos} min</h5>
            <div class="booking-total-price">${negocio.simboloMoneda || '$'}${totalPrecio}</div>
          </div>
          <div>
            ${slotSeleccionado ? `
              <span class="badge badge-gold">Turno: ${slotSeleccionado.hora} hs</span>
            ` : `
              <span style="font-size: 0.85rem; color: var(--text-muted);">Elige hora para continuar</span>
            `}
          </div>
        </div>
      </div>
    `;

    bindBookingEvents();
  }

  function renderSlotBtn(s, selected) {
    const isSelected = selected?.hora === s.hora;
    return `
      <button type="button" class="slot-btn ${isSelected ? 'selected' : ''}" data-slot-hora="${s.hora}">
        ${s.esRecomendada ? `<span class="slot-badge-recom">Recom.</span>` : ''}
        ${s.hora}
      </button>
    `;
  }

  function bindBookingEvents() {
    // Selección de servicios
    container.querySelectorAll('.service-card-select').forEach(card => {
      card.addEventListener('click', () => {
        const servId = card.dataset.serviceId;
        if (serviciosSeleccionados.includes(servId)) {
          if (serviciosSeleccionados.length > 1) {
            serviciosSeleccionados = serviciosSeleccionados.filter(id => id !== servId);
          } else {
            showToast('Debes seleccionar al menos un servicio', 'warning');
            return;
          }
        } else {
          serviciosSeleccionados.push(servId);
        }
        slotSeleccionado = null;
        actualizarSlots();
      });
    });

    // Selección de barbero
    container.querySelectorAll('.barber-card-select').forEach(card => {
      card.addEventListener('click', () => {
        const bId = card.dataset.barberId;
        barberoSeleccionado = barberos.find(b => b.id === bId);
        slotSeleccionado = null;
        actualizarSlots();
      });
    });

    // Selección de día
    container.querySelectorAll('.day-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        fechaSeleccionada = pill.dataset.fecha;
        slotSeleccionado = null;
        actualizarSlots();
      });
    });

    // Selección de slot de hora
    container.querySelectorAll('.slot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hora = btn.dataset.slotHora;
        slotSeleccionado = slotsDisponibles.find(s => s.hora === hora);
        render();
        // Scroll suave al formulario
        setTimeout(() => {
          document.getElementById('booking-client-form')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    });

    // Botones de compartir enlace y descargar QR
    document.getElementById('btn-share-link')?.addEventListener('click', () => {
      const url = window.location.href;
      navigator.clipboard?.writeText(url).then(() => {
        showToast('Enlace copiado al portapapeles', 'success');
      }).catch(() => {
        prompt('Copia este enlace:', url);
      });
    });

    document.getElementById('btn-show-qr')?.addEventListener('click', () => {
      mostrarModalQR(window.location.href, `${negocio.slug}-qr.png`);
    });

    // Formulario de confirmación de reserva
    document.getElementById('booking-client-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('btn-submit-booking');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Verificando y reservando...';

      const nombre = document.getElementById('client-name').value.trim();
      const telefono = document.getElementById('client-phone').value.trim();

      const serviciosObjetos = servicios.filter(s => serviciosSeleccionados.includes(s.id));
      const duracionTotal = serviciosObjetos.reduce((acc, s) => acc + s.duracionMin, 0);

      const payload = {
        negocioId: negocio.id,
        barberoId: barberoSeleccionado.id,
        clienteNombre: nombre,
        clienteTelefono: telefono,
        servicios: serviciosObjetos.map(s => ({
          id: s.id,
          nombre: s.nombre,
          duracionMin: s.duracionMin,
          precio: barberoSeleccionado?.preciosPersonalizados?.[s.id] ?? s.precio
        })),
        duracionTotalMin: duracionTotal,
        fechaLocal: fechaSeleccionada,
        horaInicioLocal: slotSeleccionado.hora,
        horaFinLocal: sumarMinutosAHora(slotSeleccionado.hora, duracionTotal)
      };

      try {
        const respuesta = await enviarReservaAlWorker(payload);
        citaConfirmada = respuesta;
        render();
      } catch (err) {
        showToast(err.message || 'Error al procesar la reserva', 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = `Confirmar Reserva (${slotSeleccionado.hora} hs) ✂️`;
        // Si fue conflicto, refrescar disponibilidad
        actualizarSlots();
      }
    });
  }

  async function enviarReservaAlWorker(payload) {
    // Si estamos en modo de demostración (mock) o Cloudflare Worker local
    if (DataService.isMockMode() || CONFIG.workerUrl.includes('reemplazar')) {
      // Simular transacción atómica en mock database
      const dispo = await DataService.getDisponibilidadDoc(payload.barberoId, payload.fechaLocal);
      const ocupados = dispo?.ocupados || [];
      const colision = ocupados.some(o => {
        return (payload.horaInicioLocal < o.fin && payload.horaFinLocal > o.inicio);
      });

      if (colision) {
        throw new Error('Esa hora acaba de ocuparse por otro cliente. Por favor elige otro horario.');
      }

      // Crear cita
      const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const nuevaCita = await DataService.crearCitaManual(negocio.id, {
        ...payload,
        tokenCliente: token,
        estado: 'confirmada',
        origen: 'web',
        inicioUTC: new Date().toISOString(),
        finUTC: new Date().toISOString()
      });

      return {
        ...nuevaCita,
        negocioNombre: negocio.nombre,
        negocioDireccion: negocio.direccion,
        barberoNombre: barberoSeleccionado.nombre
      };
    }

    // Llamada oficial al Cloudflare Worker (POST /api/reservar)
    const resp = await fetch(`${CONFIG.workerUrl}/api/reservar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      if (resp.status === 409) {
        throw new Error('Esa hora acaba de ocuparse por otro cliente. Se actualizaron los turnos libres.');
      }
      throw new Error(data.error || 'Error al reservar cita en el servidor.');
    }

    return {
      ...data.cita,
      negocioNombre: negocio.nombre,
      negocioDireccion: negocio.direccion,
      barberoNombre: barberoSeleccionado.nombre
    };
  }

  function renderPantallaConfirmacion() {
    const c = citaConfirmada;
    const urlGestion = `${getAppBaseUrl()}cliente.html?b=${c.negocioSlug || ''}&cita=${c.tokenCliente}`;

    container.innerHTML = `
      <div class="card confirmation-card animate-fade-in" style="max-width: 540px; margin: 30px auto;">
        <div class="confirmation-icon">✓</div>
        <h2 class="confirmation-title">¡Cita Confirmada con Éxito!</h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Te esperamos en <strong>${c.negocioNombre}</strong>. Guarda este comprobante.
        </p>

        <div class="booking-details-box">
          <div class="detail-row">
            <span class="detail-label">Barbero:</span>
            <span class="detail-val">${c.barberoNombre}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-val">${formatearFechaLegible(c.fechaLocal)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Hora:</span>
            <span class="detail-val" style="color: var(--accent-gold); font-size: 1.15rem;">${c.horaInicioLocal} hs</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Servicio(s):</span>
            <span class="detail-val">${c.servicios.map(s => s.nombre).join(', ')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Cliente:</span>
            <span class="detail-val">${c.clienteNombre}</span>
          </div>
          ${c.negocioDireccion ? `
            <div class="detail-row">
              <span class="detail-label">Dirección:</span>
              <span class="detail-val">${c.negocioDireccion}</span>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          <button id="btn-add-calendar" class="btn btn-primary btn-lg btn-full">
            📅 Agregar a mi Calendario (.ics)
          </button>
          
          <button id="btn-copy-booking" class="btn btn-secondary btn-full">
            📋 Copiar información de la cita
          </button>
        </div>

        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--border-subtle); text-align: left;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px;">¿Necesitas cancelar o reprogramar?</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">
            No requieres cuenta ni contraseñas. Puedes gestionar tu cita en cualquier momento usando tu enlace único privado:
          </p>
          <div style="display: flex; gap: 8px;">
            <input type="text" readonly value="${urlGestion}" class="form-input" style="font-size: 0.85rem;">
            <button id="btn-copy-token-link" class="btn btn-secondary btn-sm">Copiar</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-add-calendar')?.addEventListener('click', () => {
      descargarArchivoICS({
        titulo: `Cita en ${c.negocioNombre} (${c.servicios.map(s => s.nombre).join(', ')})`,
        descripcion: `Cita con ${c.barberoNombre}. Servicios: ${c.servicios.map(s => s.nombre).join(', ')}. Enlace gestión: ${urlGestion}`,
        ubicacion: c.negocioDireccion || '',
        inicioUTC: c.inicioUTC,
        finUTC: c.finUTC,
        nombreArchivo: `cita-${c.fechaLocal}.ics`
      });
      showToast('Archivo de calendario (.ics) descargado', 'success');
    });

    document.getElementById('btn-copy-booking')?.addEventListener('click', () => {
      const texto = `✂️ Cita en ${c.negocioNombre}\n📅 Fecha: ${formatearFechaLegible(c.fechaLocal)} a las ${c.horaInicioLocal} hs\n💈 Barbero: ${c.barberoNombre}\n💇 Servicios: ${c.servicios.map(s => s.nombre).join(', ')}\n📍 Ubicación: ${c.negocioDireccion || 'Consultar local'}\n🔗 Gestionar o cancelar: ${urlGestion}`;
      navigator.clipboard?.writeText(texto).then(() => {
        showToast('Resumen de cita copiado', 'success');
      });
    });

    document.getElementById('btn-copy-token-link')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(urlGestion).then(() => {
        showToast('Enlace de gestión copiado', 'success');
      });
    });
  }

  function mostrarModalQR(url, nombreArchivo) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal" style="text-align: center;">
        <div class="modal-header">
          <h3 class="modal-title">Código QR de Reserva</h3>
          <button id="btn-close-qr-modal" style="font-size: 1.5rem; color: var(--text-muted);">&times;</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 16px;">
            Los clientes pueden escanear este código con su teléfono para reservar directamente.
          </p>
          <canvas id="qr-canvas" style="border-radius: var(--radius-md); box-shadow: var(--shadow-md); margin: 0 auto; display: block;"></canvas>
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button id="btn-download-qr-file" class="btn btn-primary">Descargar Código QR (PNG)</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const canvas = modal.querySelector('#qr-canvas');
    renderizarQR(canvas, url, { size: 240 });

    modal.querySelector('#btn-close-qr-modal')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#btn-download-qr-file')?.addEventListener('click', () => {
      descargarQR(canvas, nombreArchivo);
      showToast('Código QR descargado', 'success');
    });
  }

  function generarProximosDias(fechaHoy, cantidad) {
    const dias = [];
    const [y, m, d] = fechaHoy.split('-').map(Number);
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (let i = 0; i < cantidad; i++) {
      const dt = new Date(y, m - 1, d + i);
      const pad = (n) => String(n).padStart(2, '0');
      const fechaStr = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

      dias.push({
        fechaStr,
        diaNombre: i === 0 ? 'Hoy' : i === 1 ? 'Mañ' : nombresDias[dt.getDay()],
        diaNumero: dt.getDate(),
        mesCorto: nombresMeses[dt.getMonth()]
      });
    }
    return dias;
  }

  // Carga inicial de slots
  actualizarSlots();
}
