/**
 * Base de Datos Centralizada Reactiva para Live Server
 * Almacena en localStorage y sincroniza en tiempo real.
 */

import { firebaseConfig } from './firebase-config.js';

const STORAGE_KEY = 'agendabarber_db_v3';

export const VERTICALES = {
  barberia: {
    id: 'barberia',
    nombre: 'Barbería',
    icono: '💈',
    personalSingular: 'Barbero',
    personalPlural: 'Barberos',
    servicioSingular: 'Corte',
    servicioPlural: 'Cortes y Servicios',
    sillonOEspacio: 'Sillón',
    colorHex: '#d4af37'
  },
  salon: {
    id: 'salon',
    nombre: 'Salón de Belleza / Peluquería Femenina',
    icono: '💇‍♀️',
    personalSingular: 'Estilista',
    personalPlural: 'Estilistas / Saloneras',
    servicioSingular: 'Tratamiento',
    servicioPlural: 'Peinados y Tratamientos',
    sillonOEspacio: 'Tocador',
    colorHex: '#f43f5e'
  },
  tatuaje: {
    id: 'tatuaje',
    nombre: 'Estudio de Tatuajes & Piercing',
    icono: '🖋️',
    personalSingular: 'Tatuador',
    personalPlural: 'Tatuadores / Artistas',
    servicioSingular: 'Sesión',
    servicioPlural: 'Sesiones y Diseños',
    sillonOEspacio: 'Cabina de Tatuaje',
    colorHex: '#e11d48'
  },
  spa: {
    id: 'spa',
    nombre: 'Spa & Centro de Bienestar',
    icono: '🌿',
    personalSingular: 'Terapeuta',
    personalPlural: 'Terapeutas / Masajistas',
    servicioSingular: 'Terapia',
    servicioPlural: 'Terapias y Masajes',
    sillonOEspacio: 'Cabina Zen',
    colorHex: '#10b981'
  }
};

/**
 * Obtiene la URL base absoluta donde reside la aplicación.
 * Funciona automáticamente en:
 * - GitHub Pages (ej: https://usuario.github.io/repositorio/)
 * - Dominios personalizados (ej: https://citalo.com/)
 * - Servidores locales (ej: http://localhost:3000/)
 */
export function getAppBaseUrl() {
  if (typeof window === 'undefined' || !window.location) return './';
  const loc = window.location;
  const path = loc.pathname || '/';
  const dir = path.substring(0, path.lastIndexOf('/') + 1);
  return `${loc.origin}${dir}`;
}

export const EMPTY_DATABASE = {
  plataforma: {
    nombre: 'CÍTALO',
    eslogan: 'Tu cita a un click',
    logoUrl: './assets/icons/icon.svg',
    whatsappSoporte: ''
  },
  superadmin: {
    usuario: 'admin',
    password: '1234',
    nombre: 'Administrador Principal'
  },
  suscripciones: {
    costoInstalacionRD: 500,
    costoMensualBarberoRD: 200,
    historialCobros: []
  },
  negocios: [],
  barberos: [],
  servicios: [],
  citas: [],
  colaEspera: [],
  clientes: []
};

export const DEMO_DATABASE = {
  negocios: [
    {
      id: "biz-vip",
      slug: "la-barberia",
      nombre: "Barbería VIP",
      descripcion: "Corte clásico, barba a navaja y estilo urbano contemporáneo.",
      logoUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80",
      direccion: "Av. 18 de Julio 1420",
      telefono: "+598 99 123 456",
      zonaHoraria: "America/Montevideo",
      moneda: "UYU",
      simboloMoneda: "$",
      activo: true,
      creadoEn: new Date().toISOString()
    }
  ],
  barberos: [
    {
      id: "barbero-carlos",
      negocioId: "biz-vip",
      slug: "carlos",
      nombre: "Carlos Pérez",
      especialidad: "Degradados & Barba a navaja",
      telefono: "+598 99 111 222",
      activo: true,
      serviciosActivos: ["serv-1", "serv-2"],
      preciosPersonalizados: {},
      horarioSemanal: {
        "1": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }] },
        "2": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }] },
        "3": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }] },
        "4": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }] },
        "5": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "20:00" }] },
        "6": { activo: true, turnos: [{ inicio: "09:00", fin: "17:00" }] },
        "0": { activo: false, turnos: [] }
      },
      bloqueos: [],
      reglas: {
        pasoCuadriculaMin: 15,
        anticipacionMinimaMin: 15,
        maxDiasAdelante: 30,
        compactarAgenda: false
      },
      telegram: { conectado: false, chatId: null }
    }
  ],
  servicios: [
    {
      id: "serv-1",
      negocioId: "biz-vip",
      nombre: "Corte normal",
      descripcion: "Corte con tijera/máquina y peinado.",
      duracionMin: 30,
      descansoPostMin: 5,
      precio: 500,
      activo: true
    },
    {
      id: "serv-2",
      negocioId: "biz-vip",
      nombre: "Corte y barba",
      descripcion: "Corte completo y arreglo de barba a toalla caliente.",
      duracionMin: 50,
      descansoPostMin: 10,
      precio: 750,
      activo: true
    }
  ],
  citas: [],
  colaEspera: [],
  clientes: [
    {
      id: "cli-samuel",
      negocioId: "biz-vip",
      nombre: "Samuel Velásquez",
      telefono: "8095551234",
      totalVisitas: 3,
      primeraVisita: "2026-10-15",
      ultimaVisita: "2026-11-10",
      ultimoBarberoId: "barbero-carlos"
    },
    {
      id: "cli-ignacio",
      negocioId: "biz-vip",
      nombre: "Ignacio Rossi",
      telefono: "+598 99 444 111",
      totalVisitas: 5,
      primeraVisita: "2026-09-01",
      ultimaVisita: "2026-11-08",
      ultimoBarberoId: "barbero-carlos"
    }
  ]
};

class AppDatabase {
  constructor() {
    this.VERTICALES = VERTICALES;
    this.listeners = new Set();
    this.isFirebaseConnected = false;
    this.isSyncingRemote = false;
    this.rtdb = null;
    this.dbRef = null;

    this.init();

    if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
      // 1. Canal de comunicación inter-pestañas de ultra baja latencia
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          this.channel = new BroadcastChannel('citalo_realtime_channel');
          this.channel.onmessage = (e) => {
            if (e.data?.type === 'citalo_db_update') {
              this.notify();
            }
          };
        } catch {}
      }

      // 2. Evento nativo de almacenamiento entre ventanas
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.notify();
        }
      });

      this.initFirebase();
    }
  }

  async initFirebase() {
    try {
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const { getDatabase, ref, set, onValue } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");

      this.app = initializeApp(firebaseConfig);
      this.rtdb = getDatabase(this.app);
      this.dbRef = ref(this.rtdb, 'agendabarber');
      this.setFn = set;

      // Escuchar cambios de la nube en tiempo real
      onValue(this.dbRef, (snapshot) => {
        const remoteVal = snapshot.val();
        if (remoteVal && typeof remoteVal === 'object') {
          this.isSyncingRemote = true;
          const ensureArray = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            return Object.values(val);
          };

          const localActual = this.get();
          const clean = {
            ...localActual,
            negocios: ensureArray(remoteVal.negocios),
            barberos: ensureArray(remoteVal.barberos),
            servicios: ensureArray(remoteVal.servicios),
            citas: ensureArray(remoteVal.citas),
            colaEspera: ensureArray(remoteVal.colaEspera),
            clientes: ensureArray(remoteVal.clientes),
            plataforma: remoteVal.plataforma || localActual.plataforma,
            superadmin: remoteVal.superadmin || localActual.superadmin,
            suscripciones: remoteVal.suscripciones || localActual.suscripciones
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
          window.dispatchEvent(new CustomEvent('agendabarber:db_change', { detail: clean }));
          if (this.channel) {
            try { this.channel.postMessage({ type: 'citalo_db_update', timestamp: Date.now() }); } catch {}
          }
          this.notify();
          this.isSyncingRemote = false;
        } else {
          // Si la nube está vacía pero tenemos datos locales, inicializar la nube
          const local = this.get();
          if (local && (local.negocios.length > 0 || local.barberos.length > 0)) {
            set(this.dbRef, local).catch(() => {});
          }
        }

        this.isFirebaseConnected = true;
        this.actualizarStatusNube('conectado');
      }, (error) => {
        console.warn('Firebase RTDB aviso:', error.message);
        this.isFirebaseConnected = false;
        if (error.message.includes('Permission denied') || error.message.includes('permission_denied')) {
          this.actualizarStatusNube('bloqueado');
        } else {
          this.actualizarStatusNube('desconectado');
        }
      });
    } catch (e) {
      console.warn('Firebase no inicializado:', e);
      this.actualizarStatusNube('offline');
    }
  }

  actualizarStatusNube(estado) {
    this.cloudStatus = estado;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('agendabarber:cloud_status', { detail: { estado } }));
    }
  }

  init() {
    let current = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) current = JSON.parse(raw);
    } catch (e) {
      console.warn('Error leyendo DB:', e);
    }

    if (!current) {
      current = JSON.parse(JSON.stringify(EMPTY_DATABASE));
      this.save(current);
    }
  }

  get() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.plataforma) {
          parsed.plataforma = {
            nombre: 'CÍTALO',
            eslogan: 'Tu cita a un click',
            logoUrl: './assets/icons/icon.svg',
            whatsappSoporte: ''
          };
        }
        if (!parsed.superadmin) {
          parsed.superadmin = { usuario: 'admin', password: '1234', nombre: 'Administrador Principal' };
        }
        if (!parsed.suscripciones) {
          parsed.suscripciones = { costoInstalacionRD: 500, costoMensualBarberoRD: 200, historialCobros: [] };
        }
        if (!parsed.suscripciones.historialCobros) {
          parsed.suscripciones.historialCobros = [];
        }
        return parsed;
      }
    } catch {}
    return JSON.parse(JSON.stringify(EMPTY_DATABASE));
  }

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('agendabarber:db_change', { detail: data }));

      // Transmisión inmediata a todas las demás pestañas del navegador (BroadcastChannel)
      if (this.channel) {
        try {
          this.channel.postMessage({ type: 'citalo_db_update', timestamp: Date.now() });
        } catch {}
      }

      this.notify();

      // Sincronizar en Firebase Realtime Database
      if (this.rtdb && this.dbRef && !this.isSyncingRemote) {
        const doSet = (fn) => {
          fn(this.dbRef, data).catch((err) => {
            console.warn('Firebase RTDB save error (revisa las reglas en consola):', err.message);
            if (err.message && (err.message.includes('Permission denied') || err.message.includes('permission_denied'))) {
              this.actualizarStatusNube('bloqueado');
            }
          });
        };

        if (this.setFn) {
          doSet(this.setFn);
        } else {
          import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then(({ set }) => {
            this.setFn = set;
            doSet(set);
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  // --- CONFIGURACIÓN GLOBAL DE PLATAFORMA (CÍTALO) ---
  getPlataforma() {
    return this.get().plataforma || {
      nombre: 'CÍTALO',
      eslogan: 'Tu cita a un click',
      logoUrl: './assets/icons/icon.svg'
    };
  }

  actualizarPlataforma(data) {
    const db = this.get();
    db.plataforma = {
      ...(db.plataforma || {}),
      ...data
    };
    this.save(db);
    return db.plataforma;
  }

  reiniciarACero() {
    const actual = this.get();
    const limpia = JSON.parse(JSON.stringify(EMPTY_DATABASE));
    if (actual?.superadmin?.password) {
      limpia.superadmin.password = actual.superadmin.password;
    }
    if (actual?.plataforma?.logoUrl) {
      limpia.plataforma.logoUrl = actual.plataforma.logoUrl;
    }
    this.save(limpia);
    return limpia;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    const handler = () => listener(this.get());
    window.addEventListener('agendabarber:db_change', handler);
    return () => {
      this.listeners.delete(listener);
      window.removeEventListener('agendabarber:db_change', handler);
    };
  }

  notify() {
    const data = this.get();
    this.listeners.forEach((fn) => {
      try { fn(data); } catch (e) { console.error('Error en listener DB:', e); }
    });
  }

  getBaseUrl() {
    return getAppBaseUrl();
  }

  // --- MÉTODOS DE NEGOCIO (MULTIVERTICAL) ---
  getNegocios() {
    return this.get().negocios || [];
  }

  getNegocio(idOrSlug) {
    return (this.get().negocios || []).find(n => n.id === idOrSlug || n.slug === idOrSlug) || null;
  }

  crearNegocio(data) {
    const db = this.get();
    const id = `biz-${Date.now()}`;
    const slug = data.slug || (data.nombre ? data.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') : id);
    const tipoNegocio = data.tipoNegocio || 'barberia';
    const vert = VERTICALES[tipoNegocio] || VERTICALES.barberia;

    const nuevo = {
      id,
      slug,
      nombre: data.nombre,
      tipoNegocio,
      telefono: data.telefono || '',
      direccion: data.direccion || '',
      descripcion: data.descripcion || '',
      zonaHoraria: data.zonaHoraria || 'America/Santo_Domingo',
      moneda: data.moneda || 'DOP',
      simboloMoneda: data.moneda === 'USD' ? '$' : 'RD$',
      logoUrl: data.logoUrl || './assets/icons/icon.svg',
      portadaUrl: data.portadaUrl || '',
      activo: data.activo !== false,
      cuenta: {
        usuario: data.usuario || slug,
        password: data.password || '1234'
      },
      suscripcion: {
        costoInstalacionRD: 500,
        pagadoInstalacion: data.pagadoInstalacion !== false,
        fechaInstalacion: data.fechaInstalacion || new Date().toISOString().split('T')[0],
        estado: 'activa'
      },
      creadoEn: new Date().toISOString()
    };
    db.negocios.push(nuevo);

    // Asentar cobro inicial de instalación en el libro contable
    if (nuevo.suscripcion.pagadoInstalacion) {
      if (!db.suscripciones) db.suscripciones = { costoInstalacionRD: 500, costoMensualBarberoRD: 200, historialCobros: [] };
      if (!db.suscripciones.historialCobros) db.suscripciones.historialCobros = [];
      db.suscripciones.historialCobros.unshift({
        id: `cobro-inst-${Date.now()}`,
        fecha: new Date().toISOString(),
        negocioId: nuevo.id,
        negocioNombre: nuevo.nombre,
        tipo: 'instalacion',
        concepto: `Instalación y alta de negocio (${vert.nombre})`,
        personalId: null,
        personalNombre: null,
        monto: 500,
        moneda: 'DOP',
        metodo: data.metodoPago || 'Transferencia / Efectivo'
      });
    }

    this.save(db);
    return nuevo;
  }

  actualizarNegocio(id, data) {
    const db = this.get();
    const idx = db.negocios.findIndex(n => n.id === id);
    if (idx >= 0) {
      db.negocios[idx] = { ...db.negocios[idx], ...data };
      this.save(db);
      return db.negocios[idx];
    }
    return null;
  }

  eliminarNegocio(id) {
    const db = this.get();
    db.negocios = db.negocios.filter(n => n.id !== id);
    db.barberos = db.barberos.filter(b => b.negocioId !== id);
    db.servicios = db.servicios.filter(s => s.negocioId !== id);
    db.citas = db.citas.filter(c => c.negocioId !== id);
    db.colaEspera = db.colaEspera.filter(w => w.negocioId !== id);
    this.save(db);
  }

  // --- MÉTODOS DE BARBERO ---
  getBarberos(negocioId, soloDisponiblesPublico = false) {
    let list = this.get().barberos || [];
    if (negocioId) list = list.filter(b => b.negocioId === negocioId);
    if (soloDisponiblesPublico) {
      const negocios = this.get().negocios || [];
      list = list.filter(b => {
        if (!b.activo) return false;
        const est = b.suscripcion?.estadoPago;
        if (est === 'suspendido' || est === 'vencido' || est === 'cancelado') return false;
        const neg = negocios.find(n => n.id === b.negocioId);
        if (neg && (neg.suscripcion?.estado === 'cancelada' || neg.suscripcion?.estado === 'suspendida' || neg.activo === false)) {
          return false;
        }
        return true;
      });
    }
    return list;
  }

  getBarbero(idOrSlug) {
    return (this.get().barberos || []).find(b => b.id === idOrSlug || b.slug === idOrSlug) || null;
  }

  crearBarbero(negocioId, data) {
    const db = this.get();
    const id = `barbero-${Date.now()}`;
    const slug = data.slug || (data.nombre ? data.nombre.toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '') : `b-${Date.now()}`);
    const horarioDefault = {
      "1": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }], pausaAlmuerzo: { activo: false, inicio: "13:00", fin: "14:00" } },
      "2": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }], pausaAlmuerzo: { activo: false, inicio: "13:00", fin: "14:00" } },
      "3": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }], pausaAlmuerzo: { activo: false, inicio: "13:00", fin: "14:00" } },
      "4": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "19:00" }], pausaAlmuerzo: { activo: false, inicio: "13:00", fin: "14:00" } },
      "5": { activo: true, turnos: [{ inicio: "09:00", fin: "13:00" }, { inicio: "14:00", fin: "20:00" }], pausaAlmuerzo: { activo: false, inicio: "13:00", fin: "14:00" } },
      "6": { activo: true, turnos: [{ inicio: "09:00", fin: "18:00" }], pausaAlmuerzo: { activo: false, inicio: "13:00", fin: "14:00" } },
      "0": { activo: false, turnos: [] }
    };

    const prox = new Date();
    prox.setDate(prox.getDate() + 30);
    const proxStr = prox.toISOString().split('T')[0];

    const nuevo = {
      id,
      negocioId,
      slug,
      nombre: data.nombre,
      telefono: data.telefono || '',
      especialidad: data.especialidad || 'Cortes clásicos y modernos',
      fotoUrl: data.fotoUrl || '',
      activo: data.activo !== false,
      cuenta: {
        usuario: data.usuario || (data.telefono ? data.telefono.replace(/\D/g, '') : slug),
        password: data.password || '1234'
      },
      suscripcion: {
        costoMensualRD: 200,
        estadoPago: data.estadoPago || 'al_dia', // 'al_dia' | 'por_vencer' | 'prorroga' | 'vencido' | 'suspendido'
        ultimoPagoFecha: new Date().toISOString().split('T')[0],
        proximoVencimiento: data.proximoVencimiento || proxStr,
        prorrogaHasta: null,
        diasProrroga: 0
      },
      serviciosActivos: data.serviciosActivos || [],
      preciosPersonalizados: data.preciosPersonalizados || {},
      horarioSemanal: data.horarioSemanal || horarioDefault,
      bloqueos: [],
      reglas: {
        pasoCuadriculaMin: 15,
        anticipacionMinimaMin: 30,
        maxDiasAdelante: 30,
        compactarAgenda: false
      },
      telegram: { conectado: false, chatId: null }
    };
    db.barberos.push(nuevo);
    this.save(db);
    return nuevo;
  }

  // --- CONTROL DE FACTURACIÓN Y SUSCRIPCIONES (ADMINISTRADOR) ---
  verificarEstadosSuscripcion() {
    const db = this.get();
    let modificado = false;
    const hoyStr = new Date().toISOString().split('T')[0];
    const hoy = new Date(hoyStr);

    (db.barberos || []).forEach(b => {
      if (!b.suscripcion) {
        const p = new Date();
        p.setDate(p.getDate() + 30);
        b.suscripcion = {
          costoMensualRD: 200,
          estadoPago: 'al_dia',
          proximoVencimiento: p.toISOString().split('T')[0],
          diasProrroga: 0
        };
        modificado = true;
      }

      const susc = b.suscripcion;
      if (susc.estadoPago !== 'suspendido') {
        const fechaLimiteStr = susc.prorrogaHasta || susc.proximoVencimiento;
        if (fechaLimiteStr) {
          const diffMs = new Date(fechaLimiteStr) - hoy;
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (diffDias < 0) {
            if (susc.estadoPago !== 'vencido') {
              susc.estadoPago = 'vencido';
              modificado = true;
            }
          } else if (diffDias <= 3) {
            if (susc.estadoPago === 'al_dia') {
              susc.estadoPago = 'por_vencer';
              modificado = true;
            }
          }
        }
      }
    });

    if (modificado) {
      this.save(db);
    }
  }

  getStatsPlataforma() {
    this.verificarEstadosSuscripcion();
    const db = this.get();
    const negocios = db.negocios || [];
    const barberos = db.barberos || [];
    const historial = db.suscripciones?.historialCobros || [];

    const totalNegocios = negocios.length;
    const totalPersonal = barberos.length;

    // 1. Recaudación Total Histórica (todo el dinero efectivamente cobrado)
    let recaudacionHistoricaTotalRD = historial.reduce((acc, h) => acc + (Number(h.monto) || 0), 0);
    // Fallback de congruencia si no había historial registrado aún
    const personalAlDia = barberos.filter(b => (
      b.suscripcion?.estadoPago === 'al_dia' ||
      b.suscripcion?.estadoPago === 'por_vencer' ||
      b.suscripcion?.estadoPago === 'prorroga'
    ));
    if (recaudacionHistoricaTotalRD === 0 && (totalNegocios > 0 || totalPersonal > 0)) {
      recaudacionHistoricaTotalRD = (totalNegocios * 500) + (personalAlDia.length * 200);
    }

    // 2. Recaudado Este Mes
    const hoy = new Date();
    const mesActualPrefijo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const cobrosMes = historial.filter(h => (h.fecha || '').startsWith(mesActualPrefijo));
    let recaudadoMesActualRD = cobrosMes.reduce((acc, h) => acc + (Number(h.monto) || 0), 0);
    if (recaudadoMesActualRD === 0 && historial.length === 0) {
      recaudadoMesActualRD = recaudacionHistoricaTotalRD;
    }

    // 3. Proyección Próximo Mes (Ingreso mensual garantizado por personal activo)
    const proyeccionProximoMesRD = personalAlDia.length * 200;
    const proyeccionDetallada = personalAlDia.map(b => {
      const neg = negocios.find(n => n.id === b.negocioId);
      return {
        barberoId: b.id,
        barberoNombre: b.nombre,
        negocioId: b.negocioId,
        negocioNombre: neg?.nombre || 'Negocio',
        tipoNegocio: neg?.tipoNegocio || 'barberia',
        proximoVencimiento: b.suscripcion?.proximoVencimiento || 'Próximo ciclo',
        montoEstimadoRD: 200
      };
    });

    // 4. Monto pendiente por cobrar este mes
    const alertas = barberos.filter(b => {
      const est = b.suscripcion?.estadoPago;
      return est === 'por_vencer' || est === 'vencido' || est === 'prorroga' || est === 'suspendido' || est === 'cancelado';
    });
    const pendientesCobro = alertas.filter(b => b.suscripcion?.estadoPago !== 'suspendido' && b.suscripcion?.estadoPago !== 'cancelado');
    const montoPendienteMesActualRD = pendientesCobro.length * 200;

    // 5. Conteo por Verticales
    const porVertical = {
      barberia: negocios.filter(n => (n.tipoNegocio || 'barberia') === 'barberia').length,
      salon: negocios.filter(n => n.tipoNegocio === 'salon').length,
      tatuaje: negocios.filter(n => n.tipoNegocio === 'tatuaje').length,
      spa: negocios.filter(n => n.tipoNegocio === 'spa').length
    };

    return {
      totalNegocios,
      totalPersonal,
      personalAlDia: personalAlDia.length,
      recaudacionHistoricaTotalRD,
      recaudadoMesActualRD,
      proyeccionProximoMesRD,
      montoPendienteMesActualRD,
      ingresosInstalacionesRD: totalNegocios * 500,
      ingresosMensualesBarberosRD: personalAlDia.length * 200,
      ingresoTotalPlataformaRD: recaudacionHistoricaTotalRD,
      totalBarberias: totalNegocios,
      totalBarberos: totalPersonal,
      barberosAlDia: personalAlDia.length,
      historialCobros: historial,
      cobrosMes,
      proyeccionDetallada,
      alertas,
      porVertical
    };
  }

  registrarPagoPersonalizado(datos) {
    const db = this.get();
    const {
      negocioId,
      personalId,
      monto,
      meses = 1,
      concepto = '',
      metodo = 'Transferencia Bancaria',
      nuevaFechaVencimiento = null
    } = datos;

    const montoNum = Number(monto) || 0;
    const neg = db.negocios.find(n => n.id === negocioId);
    let barbero = null;
    if (personalId) {
      barbero = db.barberos.find(b => b.id === personalId);
    }

    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    // Actualizar suscripción del barbero si corresponde
    if (barbero) {
      if (!barbero.suscripcion) {
        barbero.suscripcion = { costoMensualRD: 200, estadoPago: 'al_dia' };
      }
      barbero.suscripcion.estadoPago = 'al_dia';
      barbero.suscripcion.ultimoPagoFecha = hoyStr;
      barbero.suscripcion.prorrogaHasta = null;
      barbero.suscripcion.diasProrroga = 0;
      barbero.activo = true;

      if (nuevaFechaVencimiento) {
        barbero.suscripcion.proximoVencimiento = nuevaFechaVencimiento;
      } else {
        // Calcular vencimiento: sumar meses * 30 días
        const baseFechaStr = (barbero.suscripcion.proximoVencimiento && barbero.suscripcion.proximoVencimiento > hoyStr)
          ? barbero.suscripcion.proximoVencimiento
          : hoyStr;
        const [y, m, d] = baseFechaStr.split('-').map(Number);
        const fechaObj = new Date(y, m - 1, d);
        fechaObj.setDate(fechaObj.getDate() + (Math.max(1, Number(meses) || 1) * 30));
        barbero.suscripcion.proximoVencimiento = fechaObj.toISOString().split('T')[0];
      }
    }

    // Actualizar suscripción del negocio si corresponde
    if (neg) {
      if (!neg.suscripcion) {
        neg.suscripcion = { costoInstalacionRD: 500, pagadoInstalacion: true, estado: 'activa' };
      }
      neg.suscripcion.estado = 'activa';
      neg.activo = true;
      if (nuevaFechaVencimiento) {
        neg.suscripcion.proximoVencimiento = nuevaFechaVencimiento;
      }
    }

    // Asentar en el libro contable
    if (!db.suscripciones) db.suscripciones = { costoInstalacionRD: 500, costoMensualBarberoRD: 200, historialCobros: [] };
    if (!db.suscripciones.historialCobros) db.suscripciones.historialCobros = [];

    const vert = VERTICALES[neg?.tipoNegocio || 'barberia'] || VERTICALES.barberia;
    const conceptoFinal = concepto || (barbero
      ? `Pago suscripción (${meses} mes(es)): ${barbero.nombre} (${vert.personalSingular})`
      : `Pago conjunto negocio: ${neg?.nombre || 'Negocio'}`);

    const registro = {
      id: `cobro-${Date.now()}`,
      fecha: new Date().toISOString(),
      negocioId: neg?.id || null,
      negocioNombre: neg?.nombre || 'General CÍTALO',
      tipo: barbero ? 'mensualidad' : 'pago_conjunto',
      concepto: conceptoFinal,
      personalId: barbero?.id || null,
      personalNombre: barbero?.nombre || null,
      mesesPagados: Number(meses) || 1,
      monto: montoNum,
      montoRD: montoNum,
      moneda: 'DOP',
      metodo
    };

    db.suscripciones.historialCobros.unshift(registro);
    this.save(db);
    return registro;
  }

  cambiarEstadoSuscripcionNegocio(negocioId, nuevoEstado) {
    const db = this.get();
    const neg = db.negocios.find(n => n.id === negocioId);
    if (!neg) return null;

    if (!neg.suscripcion) {
      neg.suscripcion = { costoInstalacionRD: 500, pagadoInstalacion: true, estado: 'activa' };
    }
    neg.suscripcion.estado = nuevoEstado; // 'activa' | 'suspendida' | 'cancelada' | 'prorroga'

    if (nuevoEstado === 'cancelada' || nuevoEstado === 'suspendida') {
      neg.activo = false;
    } else if (nuevoEstado === 'activa') {
      neg.activo = true;
    }

    this.save(db);
    return neg;
  }

  cambiarEstadoSuscripcionBarbero(barberoId, nuevoEstado, proximoVencimiento = null) {
    const db = this.get();
    const b = db.barberos.find(x => x.id === barberoId);
    if (!b) return null;

    if (!b.suscripcion) {
      b.suscripcion = { costoMensualRD: 200, estadoPago: 'al_dia' };
    }
    b.suscripcion.estadoPago = nuevoEstado; // 'al_dia' | 'por_vencer' | 'prorroga' | 'vencido' | 'suspendido' | 'cancelado'

    if (proximoVencimiento) {
      b.suscripcion.proximoVencimiento = proximoVencimiento;
    }

    if (nuevoEstado === 'suspendido' || nuevoEstado === 'cancelado') {
      b.activo = false;
    } else {
      b.activo = true;
    }

    this.save(db);
    return b;
  }

  registrarPagoMesBarbero(barberoId, metodo = 'Transferencia / Efectivo') {
    const db = this.get();
    const b = db.barberos.find(x => x.id === barberoId);
    if (b) {
      const neg = db.negocios.find(n => n.id === b.negocioId);
      const vert = VERTICALES[neg?.tipoNegocio || 'barberia'] || VERTICALES.barberia;
      const hoy = new Date();
      const nuevaFecha = new Date(hoy);
      nuevaFecha.setDate(nuevaFecha.getDate() + 30);
      b.suscripcion = {
        costoMensualRD: 200,
        estadoPago: 'al_dia',
        ultimoPagoFecha: hoy.toISOString().split('T')[0],
        proximoVencimiento: nuevaFecha.toISOString().split('T')[0],
        prorrogaHasta: null,
        diasProrroga: 0
      };
      b.activo = true;

      // Registrar en el libro contable de la plataforma
      if (!db.suscripciones) db.suscripciones = { costoInstalacionRD: 500, costoMensualBarberoRD: 200, historialCobros: [] };
      if (!db.suscripciones.historialCobros) db.suscripciones.historialCobros = [];
      db.suscripciones.historialCobros.unshift({
        id: `cobro-mes-${Date.now()}`,
        fecha: new Date().toISOString(),
        negocioId: b.negocioId,
        negocioNombre: neg?.nombre || 'Negocio',
        tipo: 'mensualidad',
        concepto: `Mensualidad de ${vert.personalSingular}: ${b.nombre}`,
        personalId: b.id,
        personalNombre: b.nombre,
        monto: 200,
        moneda: 'DOP',
        metodo
      });

      this.save(db);
      return true;
    }
    return false;
  }

  registrarCobroManual(datos) {
    const db = this.get();
    if (!db.suscripciones) db.suscripciones = { costoInstalacionRD: 500, costoMensualBarberoRD: 200, historialCobros: [] };
    if (!db.suscripciones.historialCobros) db.suscripciones.historialCobros = [];
    const montoFinal = Number(datos.monto ?? datos.montoRD) || 0;
    const nuevo = {
      id: `cobro-manual-${Date.now()}`,
      fecha: new Date().toISOString(),
      negocioId: datos.negocioId || null,
      negocioNombre: datos.negocioNombre || 'Cobro registrado',
      tipo: datos.tipo || 'otro',
      concepto: datos.concepto || 'Cobro registrado',
      personalId: datos.personalId || null,
      personalNombre: datos.personalNombre || null,
      monto: montoFinal,
      montoRD: montoFinal,
      moneda: datos.moneda || 'DOP',
      metodo: datos.metodo || datos.metodoPago || 'Efectivo / Transferencia'
    };
    db.suscripciones.historialCobros.unshift(nuevo);
    this.save(db);
    return nuevo;
  }

  darProrrogaBarbero(barberoId, dias = 3) {
    const db = this.get();
    const b = db.barberos.find(x => x.id === barberoId);
    if (b) {
      if (!b.suscripcion) b.suscripcion = { costoMensualRD: 200, estadoPago: 'al_dia' };
      const f = new Date();
      f.setDate(f.getDate() + dias);
      b.suscripcion.diasProrroga = (b.suscripcion.diasProrroga || 0) + dias;
      b.suscripcion.prorrogaHasta = f.toISOString().split('T')[0];
      b.suscripcion.estadoPago = 'prorroga';
      b.activo = true; // Sigue activo durante la prórroga
      this.save(db);
      return true;
    }
    return false;
  }

  toggleSuspensionBarbero(barberoId) {
    const db = this.get();
    const b = db.barberos.find(x => x.id === barberoId);
    if (b) {
      if (!b.suscripcion) b.suscripcion = { costoMensualRD: 200, estadoPago: 'al_dia' };
      const estaSuspendido = b.suscripcion.estadoPago === 'suspendido';
      if (estaSuspendido) {
        b.suscripcion.estadoPago = 'al_dia';
        b.activo = true;
      } else {
        b.suscripcion.estadoPago = 'suspendido';
        b.activo = false;
      }
      this.save(db);
      return b.suscripcion.estadoPago;
    }
    return null;
  }

  actualizarBarbero(id, data) {
    const db = this.get();
    const idx = db.barberos.findIndex(b => b.id === id);
    if (idx >= 0) {
      db.barberos[idx] = { ...db.barberos[idx], ...data };
      this.save(db);
      return db.barberos[idx];
    }
    return null;
  }

  eliminarBarbero(id) {
    const db = this.get();
    db.barberos = db.barberos.filter(b => b.id !== id);
    db.citas = db.citas.filter(c => c.barberoId !== id);
    this.save(db);
  }

  // --- BLOQUEOS Y DISPONIBILIDAD DEL BARBERO ---
  toggleBloqueoHora(barberoId, fecha, horaInicio, horaFin = null) {
    const db = this.get();
    const barbero = db.barberos.find(b => b.id === barberoId);
    if (!barbero) return false;

    if (!barbero.bloqueos) barbero.bloqueos = [];

    // Si fin no está definido, sumar 15 o 30 min
    const finCalculado = horaFin || horaInicio;

    const existIdx = barbero.bloqueos.findIndex(b => b.fecha === fecha && b.inicio === horaInicio);
    if (existIdx >= 0) {
      // Desbloquear
      barbero.bloqueos.splice(existIdx, 1);
    } else {
      // Bloquear
      barbero.bloqueos.push({
        id: `blk-${Date.now()}`,
        fecha,
        inicio: horaInicio,
        fin: finCalculado,
        motivo: 'Bloqueado por el barbero'
      });
    }

    this.save(db);
    return true;
  }

  toggleBloqueoDiaCompleto(barberoId, fecha) {
    const db = this.get();
    const barbero = db.barberos.find(b => b.id === barberoId);
    if (!barbero) return false;

    if (!barbero.bloqueos) barbero.bloqueos = [];

    const existIdx = barbero.bloqueos.findIndex(b => b.fecha === fecha && !b.inicio);
    if (existIdx >= 0) {
      barbero.bloqueos.splice(existIdx, 1);
    } else {
      barbero.bloqueos.push({
        id: `blk-${Date.now()}`,
        fecha,
        inicio: null,
        fin: null,
        motivo: 'Día libre / Bloqueado completo'
      });
    }

    this.save(db);
    return true;
  }

  // --- MÉTODOS DE SERVICIOS ---
  getServicios(negocioId) {
    const list = this.get().servicios || [];
    return negocioId ? list.filter(s => s.negocioId === negocioId) : list;
  }

  getServicio(id) {
    return (this.get().servicios || []).find(s => s.id === id) || null;
  }

  crearServicio(negocioId, data) {
    const db = this.get();
    const id = `serv-${Date.now()}`;
    const nuevo = {
      id,
      negocioId,
      activo: true,
      ...data
    };
    db.servicios.push(nuevo);
    this.save(db);
    return nuevo;
  }

  actualizarServicio(id, data) {
    const db = this.get();
    const idx = db.servicios.findIndex(s => s.id === id);
    if (idx >= 0) {
      db.servicios[idx] = { ...db.servicios[idx], ...data };
      this.save(db);
      return db.servicios[idx];
    }
    return null;
  }

  eliminarServicio(id) {
    const db = this.get();
    db.servicios = db.servicios.filter(s => s.id !== id);
    this.save(db);
  }

  // --- MÉTODOS DE CITAS ---
  getCitas(negocioId = null, barberoId = null, fechaLocal = null) {
    let list = this.get().citas || [];
    if (negocioId) list = list.filter(c => String(c.negocioId) === String(negocioId));
    if (barberoId) list = list.filter(c => String(c.barberoId) === String(barberoId));
    if (fechaLocal) list = list.filter(c => c.fechaLocal === fechaLocal);
    list.sort((a, b) => {
      const fDiff = (a.fechaLocal || '').localeCompare(b.fechaLocal || '');
      if (fDiff !== 0) return fDiff;
      return (a.horaInicioLocal || '').localeCompare(b.horaInicioLocal || '');
    });
    return list;
  }

  getCita(id) {
    return (this.get().citas || []).find(c => c.id === id) || null;
  }

  crearCita(data) {
    const db = this.get();
    if (!db.citas) db.citas = [];
    const id = `cita-${Date.now()}`;
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nueva = {
      id,
      tokenCliente: token,
      estado: data.estado || 'confirmada',
      origen: data.origen || 'web',
      creadoEn: new Date().toISOString(),
      ...data,
      negocioId: String(data.negocioId || ''),
      barberoId: String(data.barberoId || '')
    };
    db.citas.push(nueva);

    // INDEXACIÓN AUTOMÁTICA DEL CLIENTE EN LA BARBERÍA
    if (data.negocioId && data.clienteNombre) {
      if (!db.clientes) db.clientes = [];
      const nombreNorm = data.clienteNombre.trim();
      const telNorm = (data.clienteTelefono || '').trim();

      let cliente = db.clientes.find(c =>
        c.negocioId === data.negocioId &&
        ((telNorm && c.telefono && c.telefono === telNorm) || c.nombre.toLowerCase() === nombreNorm.toLowerCase())
      );

      const fechaVisita = data.fechaLocal || new Date().toISOString().split('T')[0];

      if (cliente) {
        cliente.nombre = nombreNorm; // mantener capitalización más reciente
        if (telNorm) cliente.telefono = telNorm;
        cliente.totalVisitas = (cliente.totalVisitas || 1) + 1;
        cliente.ultimaVisita = fechaVisita;
        cliente.ultimoBarberoId = data.barberoId;
      } else {
        cliente = {
          id: `cli-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          negocioId: data.negocioId,
          nombre: nombreNorm,
          telefono: telNorm,
          totalVisitas: 1,
          primeraVisita: fechaVisita,
          ultimaVisita: fechaVisita,
          ultimoBarberoId: data.barberoId
        };
        db.clientes.push(cliente);
      }
    }

    // NOTIFICACIÓN AUTOMÁTICA AL BOT DE TELEGRAM DEL BARBERO
    const barbero = db.barberos.find(b => b.id === data.barberoId);
    if (barbero?.telegram?.conectado && barbero?.telegram?.chatId) {
      this.enviarNotificacionTelegram(barbero.telegram.chatId, nueva, barbero);
    }

    this.save(db);
    return nueva;
  }

  // ENVIAR NOTIFICACIÓN A TELEGRAM
  enviarNotificacionTelegram(chatId, cita, barbero = null) {
    if (!chatId) return;
    const botToken = '9289341660:AAGliANdEIlXYs4MrVxWxSkXiVmYpWnkPJs';
    const serviciosTxt = (cita.servicios || []).map(s => s.nombre).join(', ') || 'Corte';
    const hora = cita.horaInicioLocal || '09:00';

    const [hh, mm] = hora.split(':').map(Number);
    const ampm = hh >= 12 ? 'pm' : 'am';
    const h12 = hh % 12 || 12;
    const hora12 = `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;

    const mensaje = `💈 <b>¡Nueva Cita Agendada!</b>\n\n👤 <b>Cliente:</b> ${cita.clienteNombre || 'Sin nombre'}\n📞 <b>Teléfono:</b> <a href="tel:${cita.clienteTelefono}">${cita.clienteTelefono || 'N/A'}</a>\n💇 <b>Servicio:</b> ${serviciosTxt}\n📅 <b>Día:</b> ${cita.fechaLocal}\n⏰ <b>Hora:</b> ${hora12} hs\n📍 <i>Origen: ${cita.origen || 'web'}</i>\n\nAgendaBarber`;

    try {
      if (typeof fetch !== 'undefined') {
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: mensaje,
            parse_mode: 'HTML'
          })
        }).then(r => r.json()).then(res => {
          if (res.ok) {
            console.log('Notificación de cita enviada a Telegram exitosamente');
          } else {
            console.warn('Telegram API error al enviar cita:', res);
          }
        }).catch(err => {
          console.warn('Error de red enviando a Telegram:', err);
        });
      }
    } catch (e) {
      console.warn('Excepción enviando a Telegram:', e);
    }
  }

  enviarNotificacionCancelacionTelegram(chatId, cita, motivo = null) {
    if (!chatId) return;
    const botToken = '9289341660:AAGliANdEIlXYs4MrVxWxSkXiVmYpWnkPJs';
    const mensaje = `🚫 <b>Cita Cancelada</b>\n\n👤 <b>Cliente:</b> ${cita.clienteNombre}\n📅 <b>Día:</b> ${cita.fechaLocal} a las ${cita.horaInicioLocal} hs\n${motivo ? `❓ <b>Motivo:</b> ${motivo}` : ''}\n\nTu sillón ha sido liberado automáticamente en esa hora.`;

    try {
      if (typeof fetch !== 'undefined') {
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: mensaje,
            parse_mode: 'HTML'
          })
        }).catch(() => {});
      }
    } catch {}
  }

  actualizarCita(id, data) {
    const db = this.get();
    const idx = db.citas.findIndex(c => c.id === id);
    if (idx >= 0) {
      db.citas[idx] = { ...db.citas[idx], ...data };
      this.save(db);
      return db.citas[idx];
    }
    return null;
  }

  actualizarEstadoCita(citaId, nuevoEstado, motivo = null) {
    const db = this.get();
    const cita = db.citas.find(c => c.id === citaId);
    if (cita) {
      cita.estado = nuevoEstado;
      if (motivo) cita.motivoCancelacion = motivo;
      this.save(db);

      if (nuevoEstado === 'cancelada') {
        const barbero = db.barberos.find(b => b.id === cita.barberoId);
        if (barbero?.telegram?.conectado && barbero?.telegram?.chatId) {
          this.enviarNotificacionCancelacionTelegram(barbero.telegram.chatId, cita, motivo);
        }
      }

      return true;
    }
    return false;
  }

  eliminarCita(citaId) {
    const db = this.get();
    db.citas = db.citas.filter(c => c.id !== citaId);
    this.save(db);
  }

  // --- WALK-INS ---
  getWalkins(negocioId) {
    return (this.get().colaEspera || []).filter(w => !negocioId || w.negocioId === negocioId);
  }

  crearWalkin(negocioId, data) {
    const db = this.get();
    const nuevo = {
      id: `wk-${Date.now()}`,
      negocioId,
      estado: 'esperando',
      llegadaHora: data.llegadaHora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...data
    };
    db.colaEspera.push(nuevo);
    this.save(db);
    return nuevo;
  }

  eliminarWalkin(id) {
    const db = this.get();
    db.colaEspera = (db.colaEspera || []).filter(w => w.id !== id);
    this.save(db);
  }

  // --- DIRECTORIO DE CLIENTES POR BARBERÍA ---
  getClientes(negocioId) {
    const list = this.get().clientes || [];
    const filtrados = negocioId ? list.filter(c => c.negocioId === negocioId) : list;
    return filtrados.sort((a, b) => (b.ultimaVisita || '').localeCompare(a.ultimaVisita || ''));
  }

  buscarClientes(negocioId, query) {
    const clientes = this.getClientes(negocioId);
    if (!query) return clientes;
    const q = query.toLowerCase().trim();
    return clientes.filter(c => 
      c.nombre.toLowerCase().includes(q) || 
      (c.telefono && c.telefono.includes(q))
    );
  }

  eliminarCliente(id) {
    const db = this.get();
    db.clientes = (db.clientes || []).filter(c => c.id !== id);
    this.save(db);
  }

  // --- ESTADÍSTICAS DETALLADAS ---
  getStatsGlobales() {
    const db = this.get();
    const totalBarberias = db.negocios.length;
    const totalBarberos = db.barberos.length;
    const totalCitas = db.citas.length;
    const totalIngresos = db.citas
      .filter(c => c.estado !== 'cancelada')
      .reduce((sum, c) => {
        const cost = (c.servicios || []).reduce((acc, s) => acc + (s.precio || 0), 0);
        return sum + cost;
      }, 0);

    return { totalBarberias, totalBarberos, totalCitas, totalIngresos };
  }

  getStatsNegocio(negocioId) {
    const db = this.get();
    const citas = db.citas.filter(c => c.negocioId === negocioId);
    const barberos = db.barberos.filter(b => b.negocioId === negocioId);
    const servicios = db.servicios.filter(s => s.negocioId === negocioId);

    const completadas = citas.filter(c => c.estado === 'terminada' || c.estado === 'en_proceso' || c.estado === 'llego' || c.estado === 'confirmada');
    const canceladas = citas.filter(c => c.estado === 'cancelada');
    const noAsistio = citas.filter(c => c.estado === 'no_se_presento');

    const totalIngresos = completadas.reduce((sum, c) => {
      return sum + (c.servicios || []).reduce((acc, s) => acc + (s.precio || 0), 0);
    }, 0);

    // Desglose por barbero
    const statsPorBarbero = barberos.map(b => {
      const citasB = citas.filter(c => c.barberoId === b.id);
      const completadasB = citasB.filter(c => c.estado !== 'cancelada' && c.estado !== 'no_se_presento');
      const ingresosB = completadasB.reduce((sum, c) => {
        return sum + (c.servicios || []).reduce((acc, s) => acc + (s.precio || 0), 0);
      }, 0);
      return {
        id: b.id,
        nombre: b.nombre,
        citasTotal: citasB.length,
        completadas: completadasB.length,
        ingresos: ingresosB
      };
    });

    // Cortes más pedidos
    const contadorServicios = {};
    for (const c of citas) {
      if (c.estado !== 'cancelada') {
        for (const s of (c.servicios || [])) {
          contadorServicios[s.nombre] = (contadorServicios[s.nombre] || 0) + 1;
        }
      }
    }

    const rankingServicios = Object.entries(contadorServicios)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    return {
      citasTotal: citas.length,
      completadas: completadas.length,
      canceladas: canceladas.length,
      noAsistio: noAsistio.length,
      totalIngresos,
      statsPorBarbero,
      rankingServicios
    };
  }

  getStatsBarbero(barberoId) {
    const db = this.get();
    const citas = db.citas.filter(c => c.barberoId === barberoId);
    const completadas = citas.filter(c => c.estado === 'terminada');
    const activas = citas.filter(c => c.estado === 'confirmada' || c.estado === 'llego' || c.estado === 'en_proceso');
    const canceladas = citas.filter(c => c.estado === 'cancelada');
    const noAsistio = citas.filter(c => c.estado === 'no_se_presento');

    const totalIngresos = (completadas.concat(activas)).reduce((sum, c) => {
      return sum + (c.servicios || []).reduce((acc, s) => acc + (s.precio || 0), 0);
    }, 0);

    // Clientes únicos
    const clientesSet = new Set(citas.map(c => c.clienteTelefono || c.clienteNombre));

    return {
      citasTotal: citas.length,
      completadas: completadas.length,
      activas: activas.length,
      canceladas: canceladas.length,
      noAsistio: noAsistio.length,
      totalIngresos,
      clientesUnicos: clientesSet.size
    };
  }
}

export const DB = new AppDatabase();
DB.VERTICALES = VERTICALES;
