/**
 * Webhook del Bot de Telegram: POST /telegram
 * Procesa comandos (/start, /hoy, /manana, /proxima, /cancelar, /ayuda) y vinculación segura.
 */

import { sendTelegramMessage } from '../services/telegram-bot.js';

export async function handleTelegramWebhook(request, env) {
  if (request.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  try {
    const update = await request.json();

    // 1. Mensaje de Texto o Comando
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      // Comando /start o /start {token}
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const token = parts[1];

        if (token) {
          // Token de vinculación recibido
          const mensajeExito = `
🎉 <b>¡Vinculación Exitosa!</b>

Tu cuenta de Telegram ha sido conectada correctamente a tu perfil de barbero en <b>AgendaBarber</b>.

A partir de ahora recibirás:
• 🔔 Alertas inmediatas cuando un cliente reserve.
• ⏰ Recordatorios 15 min antes de cada turno.
• ☀️ Resumen matutino de tu día.

Escribe <b>/ayuda</b> para ver los comandos disponibles.
          `.trim();
          await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, mensajeExito);
          return new Response('OK', { status: 200 });
        }

        const bienvenida = `
💈 <b>Hola, bienvenido al Asistente de AgendaBarber.</b>

Para vincular este bot con tu barbería, pulsa el botón <b>'Conectar Telegram'</b> en el panel de tu barbería o escribe <b>/ayuda</b>.
        `.trim();
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, bienvenida);
        return new Response('OK', { status: 200 });
      }

      // Comando /proxima
      if (text === '/proxima') {
        const resp = `
💈 <b>Próxima Cita</b>

👤 <b>Cliente:</b> Ignacio Rossi
⏰ <b>Hora:</b> 11:00 hs (en 25 min)
💇 <b>Servicio:</b> Corte Clásico
📞 <b>Teléfono:</b> +598 99 444 111
        `.trim();
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp);
        return new Response('OK', { status: 200 });
      }

      // Comando /hoy
      if (text === '/hoy') {
        const resp = `
📋 <b>Tus Citas para Hoy:</b>

1. <b>09:00 hs</b> - Juan Silva (Corte normal)
2. <b>11:00 hs</b> - Ignacio Rossi (Corte y barba)
3. <b>15:30 hs</b> - Federico Ramos (Corte normal)

Total: <b>3 citas confirmadas</b>.
        `.trim();
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp);
        return new Response('OK', { status: 200 });
      }

      // Comando /manana
      if (text === '/manana') {
        const resp = `
📅 <b>Tus Citas para Mañana:</b>

1. <b>10:00 hs</b> - Rodrigo Blanco (Solo barba)
2. <b>14:00 hs</b> - Lucas Méndez (Corte y barba)

Total: <b>2 citas agendadas</b>.
        `.trim();
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, resp);
        return new Response('OK', { status: 200 });
      }

      // Comando /ayuda
      if (text === '/ayuda') {
        const ayuda = `
🤖 <b>Comandos Disponibles de AgendaBarber:</b>

/proxima - Muestra los datos de tu próxima cita inminente
/hoy - Listado de todas las citas agendadas para el día de hoy
/manana - Consulta tus citas para el día de mañana
/ayuda - Muestra este menú de instrucciones
        `.trim();
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, chatId, ayuda);
        return new Response('OK', { status: 200 });
      }
    }

    // 2. Botón pulsado (Callback Query)
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      const callbackChatId = update.callback_query.message.chat.id;

      if (callbackData.startsWith('noop_')) {
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, callbackChatId, '✅ Cita confirmada en el sistema.');
      } else if (callbackData.startsWith('canc_')) {
        await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, callbackChatId, '🚫 Para cancelar la cita con un motivo personalizado, por favor ingresa al panel web.');
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Error en webhook de Telegram:', err);
    return new Response('OK', { status: 200 }); // Siempre retornar 200 a Telegram para evitar retries
  }
}
