/**
 * Página de Onboarding Guiado en 4 Pasos
 * Datos del negocio -> Barberos -> Servicios -> Horarios
 */

import { AppState, showToast } from '../state.js';
import { DataService } from '../firebase-client.js';
import { router } from '../router.js';
import { comprimirImagen } from '../utils/image-compressor.js';

export function renderOnboarding(container) {
  let step = 1;

  // Estado temporal del wizard
  const wizardData = {
    negocio: {
      nombre: '',
      slug: '',
      telefono: '',
      direccion: '',
      descripcion: '',
      logoUrl: '',
      zonaHoraria: 'America/Montevideo',
      moneda: 'UYU'
    },
    duenoEsBarbero: true,
    barbero: {
      nombre: '',
      slug: '',
      especialidad: 'Cortes clásicos y barba',
      bio: '',
      telefono: '',
      fotoUrl: ''
    },
    servicios: [
      { id: 'serv-1', nombre: 'Corte normal', duracionMin: 30, descansoPostMin: 5, precio: 500, activo: true },
      { id: 'serv-2', nombre: 'Corte y barba', duracionMin: 50, descansoPostMin: 10, precio: 750, activo: true },
      { id: 'serv-3', nombre: 'Solo barba', duracionMin: 25, descansoPostMin: 5, precio: 350, activo: true },
      { id: 'serv-4', nombre: 'Cerquillo', duracionMin: 15, descansoPostMin: 0, precio: 200, activo: true },
      { id: 'serv-5', nombre: 'Facial completo', duracionMin: 30, descansoPostMin: 5, precio: 450, activo: true }
    ],
    horario: {
      diasLaborales: ['1', '2', '3', '4', '5', '6'],
      turnoMananaInicio: '09:00',
      turnoMananaFin: '13:00',
      turnoTardeInicio: '14:00',
      turnoTardeFin: '19:00',
      anticipacionMinimaMin: 30,
      pasoCuadriculaMin: 15
    }
  };

  function updateView() {
    container.innerHTML = `
      <div class="card" style="max-width: 680px; margin: 30px auto; padding: 28px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--accent-gold);">Bienvenido a AgendaBarber</h2>
          <p style="color: var(--text-secondary); margin-top: 4px;">Configura tu barbería en 4 sencillos pasos</p>
          
          <div class="step-indicator" style="margin-top: 18px;">
            <div class="step-dot ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}"></div>
            <div class="step-dot ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}"></div>
            <div class="step-dot ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}"></div>
            <div class="step-dot ${step === 4 ? 'active' : ''}"></div>
          </div>
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--accent-gold);">
            Paso ${step} de 4: ${
              step === 1 ? 'Datos de tu Negocio' :
              step === 2 ? 'Perfil de Barbero' :
              step === 3 ? 'Servicios y Precios' : 'Horarios y Turnos'
            }
          </span>
        </div>

        <form id="onboarding-form">
          ${renderStepContent()}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--border-subtle);">
            ${step > 1 ? `<button type="button" id="btn-back" class="btn btn-secondary">Atrás</button>` : `<div></div>`}
            <button type="submit" class="btn btn-primary btn-lg">
              ${step === 4 ? 'Finalizar y Abrir Agenda 🚀' : 'Continuar →'}
            </button>
          </div>
        </form>
      </div>
    `;

    bindStepEvents();
  }

  function renderStepContent() {
    if (step === 1) {
      return `
        <div class="form-group">
          <label class="form-label">Nombre del Negocio *</label>
          <input type="text" id="ob-nombre" class="form-input" placeholder="Ej: Barbería Don Vito" value="${wizardData.negocio.nombre}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Enlace Web Público (Slug) *</label>
          <div style="display: flex; align-items: center; background: var(--bg-surface-elevated); border: 1.5px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0 12px;">
            <span style="color: var(--text-muted); font-size: 0.9rem;">/b/</span>
            <input type="text" id="ob-slug" style="border: none; background: transparent; padding: 12px 6px; width: 100%; color: var(--text-primary); outline: none; font-weight: 600;" placeholder="don-vito" value="${wizardData.negocio.slug}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Teléfono de Contacto *</label>
            <input type="tel" id="ob-telefono" class="form-input" placeholder="+598 99 123 456" value="${wizardData.negocio.telefono}" required>
          </div>
          <div class="form-group">
            <label class="form-label">Moneda</label>
            <select id="ob-moneda" class="form-select">
              <option value="UYU" ${wizardData.negocio.moneda === 'UYU' ? 'selected' : ''}>UYU ($ Pesos Uruguayos)</option>
              <option value="USD" ${wizardData.negocio.moneda === 'USD' ? 'selected' : ''}>USD ($ Dólares)</option>
              <option value="ARS" ${wizardData.negocio.moneda === 'ARS' ? 'selected' : ''}>ARS ($ Pesos Argentinos)</option>
              <option value="COP" ${wizardData.negocio.moneda === 'COP' ? 'selected' : ''}>COP ($ Pesos Colombianos)</option>
              <option value="MXN" ${wizardData.negocio.moneda === 'MXN' ? 'selected' : ''}>MXN ($ Pesos Mexicanos)</option>
              <option value="EUR" ${wizardData.negocio.moneda === 'EUR' ? 'selected' : ''}>EUR (€ Euros)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dirección del Local</label>
          <input type="text" id="ob-direccion" class="form-input" placeholder="Av. Principal 1234" value="${wizardData.negocio.direccion}">
        </div>

        <div class="form-group">
          <label class="form-label">Descripción o Lema Corto</label>
          <textarea id="ob-descripcion" class="form-textarea" rows="2" placeholder="Especialistas en barba, tijera y estilo clásico.">${wizardData.negocio.descripcion}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Logo del Local (Opcional - Se comprime automáticamente a ~400px)</label>
          <input type="file" id="ob-logo-file" accept="image/*" class="form-input">
          ${wizardData.negocio.logoUrl ? `<div style="margin-top: 10px;"><img src="${wizardData.negocio.logoUrl}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);"></div>` : ''}
        </div>
      `;
    }

    if (step === 2) {
      return `
        <div style="background-color: var(--accent-gold-light); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: var(--radius-md); padding: 14px; margin-bottom: 20px;">
          <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="ob-dueno-barbero" ${wizardData.duenoEsBarbero ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
            <span style="font-weight: 700; font-size: 0.95rem;">Yo soy el barbero principal (atiendo citas)</span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">Nombre del Barbero *</label>
          <input type="text" id="ob-barbero-nombre" class="form-input" placeholder="Ej: Carlos Pérez" value="${wizardData.barbero.nombre || wizardData.negocio.nombre}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Enlace Personal del Barbero (Slug) *</label>
          <div style="display: flex; align-items: center; background: var(--bg-surface-elevated); border: 1.5px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0 12px;">
            <span style="color: var(--text-muted); font-size: 0.9rem;">/b/${wizardData.negocio.slug}/</span>
            <input type="text" id="ob-barbero-slug" style="border: none; background: transparent; padding: 12px 6px; width: 100%; color: var(--text-primary); outline: none; font-weight: 600;" placeholder="carlos" value="${wizardData.barbero.slug}" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Especialidad</label>
          <input type="text" id="ob-barbero-especialidad" class="form-input" placeholder="Ej: Fade, Barba a toalla caliente" value="${wizardData.barbero.especialidad}">
        </div>

        <div class="form-group">
          <label class="form-label">Foto de Perfil del Barbero</label>
          <input type="file" id="ob-barbero-foto-file" accept="image/*" class="form-input">
          ${wizardData.barbero.fotoUrl ? `<div style="margin-top: 10px;"><img src="${wizardData.barbero.fotoUrl}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid var(--accent-gold);"></div>` : ''}
        </div>
      `;
    }

    if (step === 3) {
      return `
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
          Hemos precargado los servicios más habituales. Puedes editar sus precios, duraciones o desactivar los que no hagas:
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${wizardData.servicios.map((s, idx) => `
            <div style="display: flex; align-items: center; gap: 10px; background: var(--bg-surface-elevated); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); flex-wrap: wrap;">
              <input type="checkbox" class="ob-serv-check" data-idx="${idx}" ${s.activo ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-gold);">
              <div style="flex: 1; min-width: 140px;">
                <input type="text" class="ob-serv-nombre form-input" data-idx="${idx}" value="${s.nombre}" style="padding: 6px 10px; font-weight: 700;">
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">Dur:</span>
                <input type="number" class="ob-serv-dur form-input" data-idx="${idx}" value="${s.duracionMin}" min="5" step="5" style="width: 75px; padding: 6px 8px;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">min</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">$</span>
                <input type="number" class="ob-serv-precio form-input" data-idx="${idx}" value="${s.precio}" min="0" step="10" style="width: 85px; padding: 6px 8px;">
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (step === 4) {
      return `
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
          Configura tus turnos habituales (puedes ajustarlos al detalle luego en tu panel):
        </p>

        <div class="card" style="padding: 16px; background-color: var(--bg-surface-elevated);">
          <h4 style="font-size: 1rem; margin-bottom: 12px;">Turno de Mañana</h4>
          <div class="form-row">
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Apertura</label>
              <input type="time" id="ob-tm-inicio" class="form-input" value="${wizardData.horario.turnoMananaInicio}">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Fin Turno Mañana</label>
              <input type="time" id="ob-tm-fin" class="form-input" value="${wizardData.horario.turnoMananaFin}">
            </div>
          </div>
        </div>

        <div class="card" style="padding: 16px; background-color: var(--bg-surface-elevated);">
          <h4 style="font-size: 1rem; margin-bottom: 12px;">Turno de Tarde</h4>
          <div class="form-row">
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Reanudación</label>
              <input type="time" id="ob-tt-inicio" class="form-input" value="${wizardData.horario.turnoTardeInicio}">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Cierre</label>
              <input type="time" id="ob-tt-fin" class="form-input" value="${wizardData.horario.turnoTardeFin}">
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Anticipación Mínima para Reservar</label>
            <select id="ob-anticipacion" class="form-select">
              <option value="15">15 minutos</option>
              <option value="30" selected>30 minutos (Recomendado)</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Paso de la Cuadrícula</label>
            <select id="ob-cuadricula" class="form-select">
              <option value="10">Cada 10 minutos</option>
              <option value="15" selected>Cada 15 minutos (Estándar)</option>
              <option value="30">Cada 30 minutos</option>
            </select>
          </div>
        </div>
      `;
    }
  }

  function bindStepEvents() {
    const form = document.getElementById('onboarding-form');
    const btnBack = document.getElementById('btn-back');

    if (btnBack) {
      btnBack.addEventListener('click', () => {
        step = Math.max(1, step - 1);
        updateView();
      });
    }

    if (step === 1) {
      const inputNombre = document.getElementById('ob-nombre');
      const inputSlug = document.getElementById('ob-slug');
      const logoFile = document.getElementById('ob-logo-file');

      inputNombre?.addEventListener('input', (e) => {
        if (!wizardData.negocio.slug || wizardData.negocio.slug === generarSlug(wizardData.negocio.nombre)) {
          const autoSlug = generarSlug(e.target.value);
          inputSlug.value = autoSlug;
          wizardData.negocio.slug = autoSlug;
        }
        wizardData.negocio.nombre = e.target.value;
      });

      logoFile?.addEventListener('change', async (e) => {
        if (e.target.files?.[0]) {
          try {
            const comp = await comprimirImagen(e.target.files[0], 400);
            wizardData.negocio.logoUrl = comp.dataUrl;
            showToast('Logo optimizado correctamente (~400px)', 'success');
          } catch (err) {
            showToast('Error al procesar la imagen: ' + err.message, 'error');
          }
        }
      });
    }

    if (step === 2) {
      const inputBarberoNombre = document.getElementById('ob-barbero-nombre');
      const inputBarberoSlug = document.getElementById('ob-barbero-slug');
      const fotoFile = document.getElementById('ob-barbero-foto-file');

      inputBarberoNombre?.addEventListener('input', (e) => {
        if (!wizardData.barbero.slug) {
          const autoSlug = generarSlug(e.target.value);
          inputBarberoSlug.value = autoSlug;
          wizardData.barbero.slug = autoSlug;
        }
        wizardData.barbero.nombre = e.target.value;
      });

      fotoFile?.addEventListener('change', async (e) => {
        if (e.target.files?.[0]) {
          try {
            const comp = await comprimirImagen(e.target.files[0], 400);
            wizardData.barbero.fotoUrl = comp.dataUrl;
            showToast('Foto de barbero optimizada (~400px)', 'success');
          } catch (err) {
            showToast('Error al procesar foto: ' + err.message, 'error');
          }
        }
      });
    }

    if (step === 3) {
      document.querySelectorAll('.ob-serv-check').forEach((cb) => {
        cb.addEventListener('change', (e) => {
          const idx = Number(e.target.dataset.idx);
          wizardData.servicios[idx].activo = e.target.checked;
        });
      });
      document.querySelectorAll('.ob-serv-nombre').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const idx = Number(e.target.dataset.idx);
          wizardData.servicios[idx].nombre = e.target.value;
        });
      });
      document.querySelectorAll('.ob-serv-dur').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const idx = Number(e.target.dataset.idx);
          wizardData.servicios[idx].duracionMin = Number(e.target.value) || 15;
        });
      });
      document.querySelectorAll('.ob-serv-precio').forEach((inp) => {
        inp.addEventListener('input', (e) => {
          const idx = Number(e.target.dataset.idx);
          wizardData.servicios[idx].precio = Number(e.target.value) || 0;
        });
      });
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (step === 1) {
        wizardData.negocio.nombre = document.getElementById('ob-nombre').value.trim();
        wizardData.negocio.slug = generarSlug(document.getElementById('ob-slug').value.trim());
        wizardData.negocio.telefono = document.getElementById('ob-telefono').value.trim();
        wizardData.negocio.direccion = document.getElementById('ob-direccion').value.trim();
        wizardData.negocio.descripcion = document.getElementById('ob-descripcion').value.trim();
        wizardData.negocio.moneda = document.getElementById('ob-moneda').value;

        if (!wizardData.barbero.nombre) {
          wizardData.barbero.nombre = wizardData.negocio.nombre;
          wizardData.barbero.slug = generarSlug(wizardData.negocio.nombre).split('-')[0] || 'barbero';
        }

        step = 2;
        updateView();
        return;
      }

      if (step === 2) {
        wizardData.barbero.nombre = document.getElementById('ob-barbero-nombre').value.trim();
        wizardData.barbero.slug = generarSlug(document.getElementById('ob-barbero-slug').value.trim());
        wizardData.barbero.especialidad = document.getElementById('ob-barbero-especialidad').value.trim();
        step = 3;
        updateView();
        return;
      }

      if (step === 3) {
        step = 4;
        updateView();
        return;
      }

      if (step === 4) {
        // Recopilar horarios y guardar todo
        wizardData.horario.turnoMananaInicio = document.getElementById('ob-tm-inicio').value;
        wizardData.horario.turnoMananaFin = document.getElementById('ob-tm-fin').value;
        wizardData.horario.turnoTardeInicio = document.getElementById('ob-tt-inicio').value;
        wizardData.horario.turnoTardeFin = document.getElementById('ob-tt-fin').value;
        wizardData.horario.anticipacionMinimaMin = Number(document.getElementById('ob-anticipacion').value);
        wizardData.horario.pasoCuadriculaMin = Number(document.getElementById('ob-cuadricula').value);

        await finalizarOnboarding(wizardData);
      }
    });
  }

  async function finalizarOnboarding(data) {
    showToast('Guardando configuración de tu barbería...', 'info');

    const negocioId = `biz-${data.negocio.slug}`;
    const barberoId = `barbero-${data.barbero.slug}`;

    const turnosEstandar = [
      { inicio: data.horario.turnoMananaInicio, fin: data.horario.turnoMananaFin },
      { inicio: data.horario.turnoTardeInicio, fin: data.horario.turnoTardeFin }
    ];

    const horarioSemanal = {
      '1': turnosEstandar,
      '2': turnosEstandar,
      '3': turnosEstandar,
      '4': turnosEstandar,
      '5': turnosEstandar,
      '6': [{ inicio: data.horario.turnoMananaInicio, fin: '17:00' }],
      '0': []
    };

    const docNegocio = {
      id: negocioId,
      slug: data.negocio.slug,
      nombre: data.negocio.nombre,
      descripcion: data.negocio.descripcion,
      logoUrl: data.negocio.logoUrl || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
      direccion: data.negocio.direccion,
      telefono: data.negocio.telefono,
      duenoUid: 'dueno-uid-1',
      barberosUids: ['dueno-uid-1'],
      zonaHoraria: data.negocio.zonaHoraria,
      moneda: data.negocio.moneda,
      creadoEn: new Date().toISOString()
    };

    const docBarbero = {
      id: barberoId,
      uid: 'dueno-uid-1',
      slug: data.barbero.slug,
      nombre: data.barbero.nombre,
      especialidad: data.barbero.especialidad,
      fotoUrl: data.barbero.fotoUrl || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80',
      telefono: data.negocio.telefono,
      activo: true,
      serviciosActivos: data.servicios.filter(s => s.activo).map(s => s.id),
      preciosPersonalizados: {},
      horarioSemanal,
      bloqueos: [],
      vacaciones: [],
      reglas: {
        pasoCuadriculaMin: data.horario.pasoCuadriculaMin,
        anticipacionMinimaMin: data.horario.anticipacionMinimaMin,
        maxDiasAdelante: 30,
        compactarAgenda: false,
        confirmacionAutomatica: true,
        minutosRecordatorio: 15,
        horaResumenDiario: '08:30'
      },
      telegram: {
        conectado: false,
        chatId: null
      }
    };

    try {
      await DataService.guardarNuevoNegocio(docNegocio, docBarbero, data.servicios);
      AppState.set({
        negocioActual: docNegocio,
        barberoSeleccionado: docBarbero,
        barberos: [docBarbero],
        servicios: data.servicios
      });
      showToast('¡Barbería configurada con éxito!', 'success');
      router.navigate('/admin');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar: ' + err.message, 'error');
    }
  }

  function generarSlug(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  updateView();
}
