/**
 * Configuración de AgendaBarber
 * Firebase Spark (Costo Cero) y Cloudflare Worker
 */

export const CONFIG = {
  // Configuración de Firebase (Proyecto en plan Spark)
  // Reemplaza con tus credenciales de la consola de Firebase:
  // https://console.firebase.google.com/
  firebase: {
    apiKey: "TU_FIREBASE_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
  },

  // URL del Cloudflare Worker desplegado (o local para desarrollo)
  // Ej: "https://agendabarber-worker.tunombre.workers.dev" o "http://localhost:8787"
  workerUrl: "https://agendabarber-worker.reemplazar.workers.dev",

  // Datos por defecto
  defaults: {
    zonaHoraria: "America/Montevideo",
    moneda: "UYU",
    simboloMoneda: "$",
    dMinPorDefecto: 15,
    pasoCuadriculaMin: 15,
    anticipacionMinimaMin: 30,
    maxDiasAdelante: 30
  }
};

/**
 * Determina si las credenciales de Firebase han sido configuradas o si se debe usar el modo demostración/mock.
 */
export function isFirebaseConfigured() {
  return (
    CONFIG.firebase.apiKey &&
    !CONFIG.firebase.apiKey.startsWith('TU_') &&
    CONFIG.firebase.projectId &&
    !CONFIG.firebase.projectId.startsWith('tu-')
  );
}
