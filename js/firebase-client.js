/**
 * Cliente de Firebase y Almacén de Datos de AgendaBarber
 * Soporta Firebase v10 oficial y fallback reactivo de demostración si aún no se configuran las credenciales.
 */

import { CONFIG, isFirebaseConfigured } from './config.js';

let app = null;
let auth = null;
let db = null;
let isMock = false;

// Estado en memoria / LocalStorage para modo mock
const STORAGE_KEY = 'agendabarber_demo_db_v1';

class MockDatabase {
  constructor() {
    this.listeners = new Map();
    this.data = this.loadData();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('No se pudo leer LocalStorage, usando memoria', e);
    }
    return null;
  }

  saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Error al persistir en LocalStorage', e);
    }
    this.notifyAll();
  }

  init(seed) {
    if (!this.data) {
      this.data = JSON.parse(JSON.stringify(seed));
      this.initDynamicAppointments();
      this.saveData();
    }
  }

  initDynamicAppointments() {
    if (!this.data.citas) {
      const hoy = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const fechaHoy = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;

      // Minutos actuales para generar citas realistas alrededor de la hora actual
      const currentH = hoy.getHours();
      const nextHour1 = Math.min(20, Math.max(9, currentH + 1));
      const nextHour2 = Math.min(21, nextHour1 + 1);
      const pastHour = Math.max(9, currentH - 1);

      this.data.citas = [
        {
          id: 'cita-demo-1',
          negocioId: 'barberia-vip',
          barberoId: 'barbero-carlos',
          clienteNombre: 'Ignacio Rossi',
          clienteTelefono: '+59899444111',
          servicios: [
            { id: 'serv-2', nombre: 'Corte y barba', duracionMin: 50, precio: 750 }
          ],
          duracionTotalMin: 60,
          descansoPostMin: 10,
          fechaLocal: fechaHoy,
          horaInicioLocal: `${pad(nextHour1)}:00`,
          horaFinLocal: `${pad(nextHour1)}:50`,
          inicioUTC: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), nextHour1, 0).toISOString(),
          finUTC: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), nextHour1, 50).toISOString(),
          estado: 'confirmada',
          origen: 'web',
          tokenCliente: 'tok_demo_ignacio_12345',
          recordatorioEnviado: false,
          minutosRecordatorio: 15,
          creadoEn: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'cita-demo-2',
          negocioId: 'barberia-vip',
          barberoId: 'barbero-carlos',
          clienteNombre: 'Federico Ramos',
          clienteTelefono: '+59899777222',
          servicios: [
            { id: 'serv-1', nombre: 'Corte normal', duracionMin: 30, precio: 500 }
          ],
          duracionTotalMin: 35,
          descansoPostMin: 5,
          fechaLocal: fechaHoy,
          horaInicioLocal: `${pad(nextHour2)}:00`,
          horaFinLocal: `${pad(nextHour2)}:30`,
          inicioUTC: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), nextHour2, 0).toISOString(),
          finUTC: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), nextHour2, 30).toISOString(),
          estado: 'confirmada',
          origen: 'web',
          tokenCliente: 'tok_demo_federico_67890',
          recordatorioEnviado: false,
          minutosRecordatorio: 15,
          creadoEn: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'cita-demo-3',
          negocioId: 'barberia-vip',
          barberoId: 'barbero-carlos',
          clienteNombre: 'Santiago Giménez',
          clienteTelefono: '+59899123888',
          servicios: [
            { id: 'serv-3', nombre: 'Solo barba', duracionMin: 25, precio: 350 }
          ],
          duracionTotalMin: 30,
          descansoPostMin: 5,
          fechaLocal: fechaHoy,
          horaInicioLocal: `${pad(pastHour)}:00`,
          horaFinLocal: `${pad(pastHour)}:25`,
          inicioUTC: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), pastHour, 0).toISOString(),
          finUTC: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), pastHour, 25).toISOString(),
          estado: 'terminada',
          origen: 'web',
          tokenCliente: 'tok_demo_santiago_44556',
          recordatorioEnviado: true,
          minutosRecordatorio: 15,
          creadoEn: new Date(Date.now() - 14400000).toISOString()
        }
      ];

      this.data.disponibilidad = {
        [`barbero-carlos_${fechaHoy}`]: {
          barberoId: 'barbero-carlos',
          fechaLocal: fechaHoy,
          negocioId: 'barberia-vip',
          ocupados: [
            { inicio: `${pad(nextHour1)}:00`, fin: `${pad(nextHour1)}:60`, tipo: 'cita' },
            { inicio: `${pad(nextHour2)}:00`, fin: `${pad(nextHour2)}:35`, tipo: 'cita' },
            { inicio: `${pad(pastHour)}:00`, fin: `${pad(pastHour)}:30`, tipo: 'cita' }
          ]
        }
      };
    }
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  notify(key) {
    const list = this.listeners.get(key);
    if (list) {
      list.forEach((fn) => {
        try { fn(); } catch (err) { console.error('Error en listener:', err); }
      });
    }
  }

  notifyAll() {
    this.listeners.forEach((set) => {
      set.forEach((fn) => {
        try { fn(); } catch (err) { console.error('Error en listener:', err); }
      });
    });
  }
}

const mockDb = new MockDatabase();

/**
 * Inicializa el cliente Firebase o el mock autónomo.
 */
export async function initFirebase(seedData = null) {
  if (isFirebaseConfigured()) {
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
      const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      app = initializeApp(CONFIG.firebase);
      auth = getAuth(app);
      db = getFirestore(app);
      isMock = false;
      return { app, auth, db, isMock: false };
    } catch (e) {
      console.warn('No se pudo conectar a Firebase oficial, activando modo demostración:', e);
    }
  }

  // Activar modo Mock
  isMock = true;
  if (seedData) {
    mockDb.init(seedData);
  }
  return { app: null, auth: null, db: null, isMock: true };
}

// -------------------------------------------------------------
// SERVICIOS DE DATOS ABSTRAÍDOS (Firebase Firestore + Mock Store)
// -------------------------------------------------------------

export const DataService = {
  isMockMode() {
    return isMock;
  },

  async getNegocioBySlug(slug) {
    if (isMock) {
      return mockDb.data?.negocio?.slug === slug ? mockDb.data.negocio : null;
    }
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(db, 'negocios'), where('slug', '==', slug));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  async getBarberosByNegocio(negocioId) {
    if (isMock) {
      return mockDb.data?.barberos || [];
    }
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, `negocios/${negocioId}/barberos`));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getServiciosByNegocio(negocioId) {
    if (isMock) {
      return mockDb.data?.servicios || [];
    }
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, `negocios/${negocioId}/servicios`));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async getDisponibilidadDoc(barberoId, fechaLocal) {
    const docId = `${barberoId}_${fechaLocal}`;
    if (isMock) {
      return mockDb.data?.disponibilidad?.[docId] || null;
    }
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'disponibilidad', docId));
    return snap.exists() ? snap.data() : null;
  },

  /**
   * Suscribe en tiempo real a las citas del barbero para una fecha determinada.
   */
  subscribeCitasFecha(negocioId, barberoId, fechaLocal, callback) {
    if (isMock) {
      const emit = () => {
        const citas = (mockDb.data?.citas || []).filter(
          c => c.barberoId === barberoId && c.fechaLocal === fechaLocal
        );
        citas.sort((a, b) => a.horaInicioLocal.localeCompare(b.horaInicioLocal));
        callback(citas);
      };
      emit();
      return mockDb.subscribe(`citas_${barberoId}_${fechaLocal}`, emit);
    }

    let unsubscribe = () => {};
    (async () => {
      const { collection, query, where, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const q = query(
        collection(db, `negocios/${negocioId}/citas`),
        where('barberoId', '==', barberoId),
        where('fechaLocal', '==', fechaLocal)
      );
      unsubscribe = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.horaInicioLocal || '').localeCompare(b.horaInicioLocal || ''));
        callback(list);
      }, (err) => {
        console.error('Error en listener de citas:', err);
      });
    })();

    return () => unsubscribe();
  },

  /**
   * Actualiza el estado de una cita ('llego', 'en_proceso', 'terminada', 'no_se_presento', 'cancelada').
   */
  async actualizarEstadoCita(negocioId, citaId, nuevoEstado, motivoCancelacion = null) {
    if (isMock) {
      const cita = mockDb.data.citas?.find(c => c.id === citaId);
      if (cita) {
        cita.estado = nuevoEstado;
        if (motivoCancelacion) cita.motivoCancelacion = motivoCancelacion;
        mockDb.saveData();
      }
      return true;
    }
    const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const payload = { estado: nuevoEstado };
    if (motivoCancelacion) payload.motivoCancelacion = motivoCancelacion;
    await updateDoc(doc(db, `negocios/${negocioId}/citas`, citaId), payload);
    return true;
  },

  /**
   * Crea una cita manual desde el panel del barbero.
   */
  async crearCitaManual(negocioId, citaData) {
    if (isMock) {
      const nuevaCita = {
        id: `cita-manual-${Date.now()}`,
        ...citaData,
        origen: 'manual',
        creadoEn: new Date().toISOString()
      };
      if (!mockDb.data.citas) mockDb.data.citas = [];
      mockDb.data.citas.push(nuevaCita);

      // Actualizar documento de disponibilidad
      const dispoId = `${nuevaCita.barberoId}_${nuevaCita.fechaLocal}`;
      if (!mockDb.data.disponibilidad) mockDb.data.disponibilidad = {};
      if (!mockDb.data.disponibilidad[dispoId]) {
        mockDb.data.disponibilidad[dispoId] = {
          barberoId: nuevaCita.barberoId,
          fechaLocal: nuevaCita.fechaLocal,
          negocioId,
          ocupados: []
        };
      }
      mockDb.data.disponibilidad[dispoId].ocupados.push({
        inicio: nuevaCita.horaInicioLocal,
        fin: nuevaCita.horaFinLocal,
        tipo: 'cita'
      });

      mockDb.saveData();
      return nuevaCita;
    }

    const { collection, addDoc, doc, setDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const ref = await addDoc(collection(db, `negocios/${negocioId}/citas`), {
      ...citaData,
      origen: 'manual',
      creadoEn: new Date().toISOString()
    });

    // Actualizar doc disponibilidad
    const dispoId = `${citaData.barberoId}_${citaData.fechaLocal}`;
    const dispoRef = doc(db, 'disponibilidad', dispoId);
    const snap = await getDoc(dispoRef);
    const prev = snap.exists() ? snap.data().ocupados || [] : [];
    prev.push({ inicio: citaData.horaInicioLocal, fin: citaData.horaFinLocal, tipo: 'cita' });
    await setDoc(dispoRef, {
      barberoId: citaData.barberoId,
      fechaLocal: citaData.fechaLocal,
      negocioId,
      ocupados: prev,
      ultimaActualizacion: new Date().toISOString()
    }, { merge: true });

    return { id: ref.id, ...citaData };
  },

  /**
   * Agrega un cliente a la cola presencial (walk-in).
   */
  async agregarAColaEspera(item) {
    if (isMock) {
      if (!mockDb.data.colaEspera) mockDb.data.colaEspera = [];
      const nuevo = { id: `walkin-${Date.now()}`, ...item, estado: 'esperando' };
      mockDb.data.colaEspera.push(nuevo);
      mockDb.saveData();
      return nuevo;
    }
    // Si está conectado a Firebase
    return null;
  },

  async actualizarColaEspera(cola) {
    if (isMock) {
      mockDb.data.colaEspera = cola;
      mockDb.saveData();
    }
  },

  async getColaEspera() {
    return mockDb.data?.colaEspera || [];
  },

  async getClientesHistorial(negocioId) {
    if (isMock) {
      return mockDb.data?.clientesHistorial || [];
    }
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, `negocios/${negocioId}/clientes_historial`));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async guardarClienteHistorial(negocioId, cliente) {
    if (isMock) {
      if (!mockDb.data.clientesHistorial) mockDb.data.clientesHistorial = [];
      const idx = mockDb.data.clientesHistorial.findIndex(c => c.telefono === cliente.telefono);
      if (idx >= 0) {
        mockDb.data.clientesHistorial[idx] = { ...mockDb.data.clientesHistorial[idx], ...cliente };
      } else {
        mockDb.data.clientesHistorial.push(cliente);
      }
      mockDb.saveData();
      return true;
    }
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const telLimpio = (cliente.telefono || '').replace(/\D/g, '');
    await setDoc(doc(db, `negocios/${negocioId}/clientes_historial`, telLimpio), cliente, { merge: true });
    return true;
  },

  /**
   * Guarda las modificaciones de configuración del barbero (horarios, bloqueos, reglas).
   */
  async guardarBarbero(negocioId, barbero) {
    if (isMock) {
      const idx = (mockDb.data.barberos || []).findIndex(b => b.id === barbero.id);
      if (idx >= 0) {
        mockDb.data.barberos[idx] = { ...barbero };
      } else {
        if (!mockDb.data.barberos) mockDb.data.barberos = [];
        mockDb.data.barberos.push(barbero);
      }
      mockDb.saveData();
      return true;
    }
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(db, `negocios/${negocioId}/barberos`, barbero.id), barbero, { merge: true });
    return true;
  },

  /**
   * Guarda o actualiza un servicio.
   */
  async guardarServicio(negocioId, servicio) {
    if (isMock) {
      if (!mockDb.data.servicios) mockDb.data.servicios = [];
      const idx = mockDb.data.servicios.findIndex(s => s.id === servicio.id);
      if (idx >= 0) {
        mockDb.data.servicios[idx] = { ...servicio };
      } else {
        mockDb.data.servicios.push(servicio);
      }
      mockDb.saveData();
      return true;
    }
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(db, `negocios/${negocioId}/servicios`, servicio.id), servicio, { merge: true });
    return true;
  },

  async eliminarServicio(negocioId, servicioId) {
    if (isMock) {
      mockDb.data.servicios = (mockDb.data.servicios || []).filter(s => s.id !== servicioId);
      mockDb.saveData();
      return true;
    }
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await deleteDoc(doc(db, `negocios/${negocioId}/servicios`, servicioId));
    return true;
  },

  /**
   * Busca una cita por su token de cliente privado (para cancelación o consulta).
   */
  async getCitaByToken(token) {
    if (isMock) {
      return (mockDb.data?.citas || []).find(c => c.tokenCliente === token) || null;
    }
    const { collectionGroup, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collectionGroup(db, 'citas'), where('tokenCliente', '==', token));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  /**
   * Guarda un nuevo negocio completo al finalizar onboarding.
   */
  async guardarNuevoNegocio(negocio, barberoPrincipal, servicios) {
    if (isMock) {
      mockDb.data = {
        negocio,
        barberos: [barberoPrincipal],
        servicios,
        citas: [],
        disponibilidad: {},
        clientesHistorial: [],
        colaEspera: []
      };
      mockDb.saveData();
      return { negocioId: negocio.id, barberoId: barberoPrincipal.id };
    }

    const { doc, setDoc, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const batch = writeBatch(db);

    // Negocio
    batch.set(doc(db, 'negocios', negocio.id), negocio);
    // Barbero principal
    batch.set(doc(db, `negocios/${negocio.id}/barberos`, barberoPrincipal.id), barberoPrincipal);
    // Servicios iniciales
    for (const serv of servicios) {
      batch.set(doc(db, `negocios/${negocio.id}/servicios`, serv.id), serv);
    }
    await batch.commit();
    return { negocioId: negocio.id, barberoId: barberoPrincipal.id };
  }
};
