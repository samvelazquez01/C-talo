/**
 * Gestión de Estado Reactivo en Memoria y Utilidades de UI (Toast, Sonidos, Tema)
 */

export const AppState = {
  usuarioActual: null,
  negocioActual: null,
  barberos: [],
  servicios: [],
  barberoSeleccionado: null,
  fechaSeleccionada: null,
  vistaActual: 'dashboard', // 'dashboard', 'servicios', 'barberos', 'clientes', 'estadisticas', 'pantalla', 'booking', 'onboarding'
  sonidoHabilitado: true,
  listeners: new Set(),

  set(partial) {
    Object.assign(this, partial);
    this.notify();
  },

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  notify() {
    this.listeners.forEach((fn) => {
      try { fn(this); } catch (e) { console.error('Error notificando estado:', e); }
    });
  }
};

/**
 * Gestor de Tema (Oscuro / Claro)
 */
export const ThemeManager = {
  init() {
    const saved = localStorage.getItem('agendabarber_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    this.apply(theme);
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agendabarber_theme', theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
    return next;
  },

  getCurrent() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }
};

/**
 * Notificaciones Flotantes (Toasts)
 */
export function showToast(mensaje, tipo = 'info', duracionMs = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo} animate-fade-in`;

  const iconos = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconos[tipo] || 'ℹ'}</span>
    <span class="toast-msg">${mensaje}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duracionMs);
}

/**
 * Generador de Sonido de Campana Discreta usando Web Audio API nativo.
 * No requiere descargar archivos externos mp3 y funciona 100% offline.
 */
export function reproducirSonidoNuevaCita() {
  if (!AppState.sonidoHabilitado) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Campana armónica doble (880Hz y 1760Hz)
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // Nota La5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now + 0.08); // Nota Mi6
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.8);
    osc2.start(now + 0.08);
    osc2.stop(now + 1.2);
  } catch (err) {
    console.warn('No se pudo reproducir el sonido web audio:', err);
  }
}
