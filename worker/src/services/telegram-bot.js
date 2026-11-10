/**
 * Servicio de Notificaciones y Comandos del Bot de Telegram (Cloudflare Worker)
 * Envío de alertas con botones inline y manejo de excepciones tolerante a fallos.
 */

/**
 * Envía un mensaje a un chat de Telegram.
 */
export async function sendTelegramMessage(botToken, chatId, text, inlineKeyboard = null) {
  if (!botToken || !chatId) {
    console.warn('Telegram Bot Token o Chat ID ausente, omitiendo mensaje.');
    return false;
  }

  const payload = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  };

  if (inlineKeyboard) {
    payload.reply_markup = {
      inline_keyboard: inlineKeyboard
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn(`Aviso: Telegram no pudo entregar mensaje a ${chatId}:`, err);
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Error de conexión con Telegram API (tolerado sin romper reserva):', error);
    return false;
  }
}

/**
 * Notificación: Nueva Cita Agendada
 */
export async function notificarNuevaCita(env, barberoChatId, cita) {
  const serviciosText = (cita.servicios || []).map(s => s.nombre).join(', ');
  const mensaje = `
💈 <b>¡Nueva Cita Agendada!</b>

👤 <b>Cliente:</b> ${cita.clienteNombre}
📞 <b>Teléfono:</b> <a href="tel:${cita.clienteTelefono}">${cita.clienteTelefono}</a>
💇 <b>Servicio:</b> ${serviciosText}
📅 <b>Día:</b> ${cita.fechaLocal}
⏰ <b>Hora:</b> ${cita.horaInicioLocal} - ${cita.horaFinLocal} hs
  `.trim();

  const botones = [
    [
      { text: '✓ Confirmada', callback_data: `noop_${cita.id}` },
      { text: '🚫 Cancelar Cita', callback_data: `canc_${cita.id}` }
    ]
  ];

  return await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, barberoChatId, mensaje, botones);
}

/**
 * Notificación: Cita Cancelada por el Cliente
 */
export async function notificarCitaCancelada(env, barberoChatId, cita) {
  const mensaje = `
⚠️ <b>Cita Cancelada por el Cliente</b>

👤 <b>Cliente:</b> ${cita.clienteNombre}
📅 <b>Fecha:</b> ${cita.fechaLocal} a las ${cita.horaInicioLocal} hs
✂️ <i>El turno ha quedado libre en tu agenda.</i>
  `.trim();

  return await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, barberoChatId, mensaje);
}

/**
 * Notificación: Recordatorio X minutos antes
 */
export async function notificarRecordatorioCita(env, barberoChatId, cita, minutosAntes) {
  const serviciosText = (cita.servicios || []).map(s => s.nombre).join(', ');
  const mensaje = `
⏰ <b>Recordatorio de Cita</b>

En <b>${minutosAntes} minutos</b> tienes cita con <b>${cita.clienteNombre}</b>.
💇 <b>Servicio:</b> ${serviciosText}
📞 <b>Teléfono:</b> ${cita.clienteTelefono}
  `.trim();

  return await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, barberoChatId, mensaje);
}

/**
 * Notificación: Resumen Diario de Citas
 */
export async function notificarResumenDiario(env, barberoChatId, citasDelDia, fechaStr) {
  if (citasDelDia.length === 0) {
    const msg = `☀️ <b>Resumen para hoy (${fechaStr})</b>\n\nNo tienes citas agendadas aún. ¡Que tengas un excelente día!`;
    return await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, barberoChatId, msg);
  }

  const items = citasDelDia
    .sort((a, b) => a.horaInicioLocal.localeCompare(b.horaInicioLocal))
    .map((c, i) => `${i + 1}. <b>${c.horaInicioLocal} hs</b> - ${c.clienteNombre} (${c.servicios.map(s => s.nombre).join(', ')})`)
    .join('\n');

  const mensaje = `
☀️ <b>Resumen de Citas para Hoy (${fechaStr})</b>

Tienes <b>${citasDelDia.length} turnos</b> agendados:

${items}

💈 <i>¡Buen trabajo y excelente jornada!</i>
  `.trim();

  return await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, barberoChatId, mensaje);
}
