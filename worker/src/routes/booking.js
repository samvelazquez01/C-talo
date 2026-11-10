/**
 * Endpoint de Reserva del Cliente: POST /api/reservar
 * Valida anti-spam, ejecuta transacción atómica en Firestore REST y dispara notificación Telegram.
 */

import { checkRateLimit } from '../utils/rate-limiter.js';
import { ejecutarReservaAtomica } from '../firestore-rest.js';
import { notificarNuevaCita } from '../services/telegram-bot.js';

export async function handleBookingRequest(request, env) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const clientIp = request.headers.get('CF-Connecting-IP') || '127.0.0.1';
    const body = await request.json();

    const {
      negocioId,
      barberoId,
      clienteNombre,
      clienteTelefono,
      servicios,
      duracionTotalMin,
      fechaLocal,
      horaInicioLocal,
      horaFinLocal
    } = body;

    // 1. Validaciones básicas
    if (!negocioId || !barberoId || !clienteNombre || !clienteTelefono || !fechaLocal || !horaInicioLocal) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios para procesar la reserva.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Anti-spam por IP y Teléfono
    const limitCheck = checkRateLimit(clientIp, clienteTelefono);
    if (!limitCheck.allowed) {
      return new Response(JSON.stringify({ error: limitCheck.reason }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Generar token aleatorio largo para el cliente (gestión privada de cita)
    const tokenCliente = `tok_${crypto.randomUUID().replace(/-/g, '')}`;

    // Construcción de timestamps UTC estimados
    const [y, m, d] = fechaLocal.split('-').map(Number);
    const [hh, mm] = horaInicioLocal.split(':').map(Number);
    const inicioUTC = new Date(Date.UTC(y, m - 1, d, hh, mm, 0)).toISOString();
    const finUTC = new Date(Date.UTC(y, m - 1, d, hh, mm + (duracionTotalMin || 30), 0)).toISOString();

    const payload = {
      negocioId,
      barberoId,
      clienteNombre: clienteNombre.trim(),
      clienteTelefono: clienteTelefono.trim(),
      servicios: servicios || [],
      duracionTotalMin: duracionTotalMin || 30,
      fechaLocal,
      horaInicioLocal,
      horaFinLocal,
      inicioUTC,
      finUTC,
      tokenCliente
    };

    // 4. Ejecución atómica en Firestore REST
    const nuevaCita = await ejecutarReservaAtomica(env, payload);

    // 5. Notificación Telegram en segundo plano (si el barbero tiene chat_id)
    if (body.barberoChatId) {
      notificarNuevaCita(env, body.barberoChatId, nuevaCita).catch((err) => {
        console.warn('Error enviando notificación a Telegram:', err);
      });
    }

    return new Response(JSON.stringify({
      success: true,
      mensaje: 'Reserva confirmada con éxito',
      cita: nuevaCita
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error.message === 'CONFLICT_SLOT_TAKEN') {
      return new Response(JSON.stringify({
        error: 'Esa hora acaba de ocuparse por otro cliente.',
        code: 'SLOT_CONFLICT'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Error procesando reserva:', error);
    return new Response(JSON.stringify({
      error: 'Ocurrió un error al procesar tu solicitud. Inténtalo de nuevo.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
