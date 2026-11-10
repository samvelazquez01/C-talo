/**
 * Sistema de Autenticación y Sesiones Persistentes para AgendaBarber
 * Mantiene las sesiones abiertas permanentemente en el dispositivo hasta que se pulse Cerrar Sesión.
 */

import { DB } from './db.js';

export const Auth = {
  // --- SUPERADMIN (DUEÑO DE LA PLATAFORMA) ---
  getSuperadminSession() {
    try {
      const raw = localStorage.getItem('agendabarber_auth_superadmin');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  loginSuperadmin(usuario, password) {
    const db = DB.get();
    const sa = db.superadmin || { usuario: 'admin', password: '1234' };
    const u = (usuario || '').trim().toLowerCase();
    if ((u === sa.usuario.toLowerCase() || u === 'admin') && password === sa.password) {
      const sesion = {
        usuario: sa.usuario,
        nombre: sa.nombre || 'Administrador Principal',
        loggedAt: Date.now()
      };
      localStorage.setItem('agendabarber_auth_superadmin', JSON.stringify(sesion));
      return true;
    }
    return false;
  },

  logoutSuperadmin() {
    localStorage.removeItem('agendabarber_auth_superadmin');
  },

  cambiarPasswordSuperadmin(nuevaPassword) {
    if (!nuevaPassword || nuevaPassword.trim().length < 3) return false;
    const db = DB.get();
    if (!db.superadmin) {
      db.superadmin = { usuario: 'admin', password: '1234', nombre: 'Administrador Principal' };
    }
    db.superadmin.password = nuevaPassword.trim();
    DB.save(db);
    return true;
  },

  // --- DUEÑO DE BARBERÍA ---
  getDuenoSession() {
    try {
      const raw = localStorage.getItem('agendabarber_auth_dueno');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  loginDueno(usuario, password) {
    const db = DB.get();
    const u = (usuario || '').trim().toLowerCase();
    const p = (password || '').trim();

    const negocio = (db.negocios || []).find(n => {
      const cu = n.cuenta || {};
      const matchUsuario = (
        (cu.usuario && cu.usuario.toLowerCase() === u) ||
        (n.slug && n.slug.toLowerCase() === u) ||
        (n.telefono && n.telefono.replace(/\D/g, '') === u.replace(/\D/g, ''))
      );
      const matchPassword = (cu.password ? cu.password === p : p === '1234');
      return matchUsuario && matchPassword;
    });

    if (negocio) {
      const sesion = {
        negocioId: negocio.id,
        slug: negocio.slug,
        nombre: negocio.nombre,
        usuario: negocio.cuenta?.usuario || negocio.slug,
        loggedAt: Date.now()
      };
      localStorage.setItem('agendabarber_auth_dueno', JSON.stringify(sesion));
      return { ok: true, negocio };
    }
    return { ok: false, error: 'Credenciales de barbería incorrectas' };
  },

  logoutDueno() {
    localStorage.removeItem('agendabarber_auth_dueno');
  },

  // --- BARBERO PROFESIONAL ---
  getBarberoSession() {
    try {
      const raw = localStorage.getItem('agendabarber_auth_barbero');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  loginBarbero(usuario, password) {
    const db = DB.get();
    const u = (usuario || '').trim().toLowerCase();
    const p = (password || '').trim();

    const barbero = (db.barberos || []).find(b => {
      const cu = b.cuenta || {};
      const matchUsuario = (
        (cu.usuario && cu.usuario.toLowerCase() === u) ||
        (b.slug && b.slug.toLowerCase() === u) ||
        (b.telefono && b.telefono.replace(/\D/g, '') === u.replace(/\D/g, ''))
      );
      const matchPassword = (cu.password ? cu.password === p : p === '1234');
      return matchUsuario && matchPassword;
    });

    if (barbero) {
      const negocio = (db.negocios || []).find(n => n.id === barbero.negocioId);
      const sesion = {
        barberoId: barbero.id,
        negocioId: barbero.negocioId,
        slug: barbero.slug,
        nombre: barbero.nombre,
        negocioSlug: negocio?.slug || '',
        loggedAt: Date.now()
      };
      localStorage.setItem('agendabarber_auth_barbero', JSON.stringify(sesion));
      return { ok: true, barbero, negocio };
    }
    return { ok: false, error: 'Credenciales de barbero incorrectas' };
  },

  logoutBarbero() {
    localStorage.removeItem('agendabarber_auth_barbero');
  }
};
