/**
 * Cloudflare Worker Principal - AgendaBarber
 * Enrutador HTTP (fetch) y Manejador de Cron Trigger (scheduled).
 */

import { handleBookingRequest } from './routes/booking.js';
import { handleUploadRequest } from './routes/upload.js';
import { handleTelegramWebhook } from './routes/telegram.js';
import { procesarRecordatoriosCron } from './services/reminders.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

export default {
  /**
   * Manejador de Solicitudes HTTP (Fetch)
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Manejar preflight OPTIONS para CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    let response;

    if (url.pathname === '/api/reservar') {
      response = await handleBookingRequest(request, env);
    } else if (url.pathname === '/api/upload-imagen') {
      response = await handleUploadRequest(request, env);
    } else if (url.pathname === '/telegram') {
      response = await handleTelegramWebhook(request, env);
    } else if (url.pathname === '/api/health') {
      response = new Response(JSON.stringify({ status: 'ok', service: 'AgendaBarber Worker' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      response = new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Adjuntar encabezados CORS a todas las respuestas
    const newHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      newHeaders.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  },

  /**
   * Manejador de Tareas Programadas (Cron Trigger cada 1 minuto)
   */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(procesarRecordatoriosCron(env));
  }
};
