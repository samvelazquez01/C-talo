/**
 * Lógica del Cron Trigger de Cloudflare Workers (Ejecuta cada minuto)
 * Envía recordatorios X minutos antes y marca 'recordatorioEnviado' para evitar duplicados.
 */

import { getCitasPendientesRecordatorio, marcarRecordatorioEnviado } from '../firestore-rest.js';
import { notificarRecordatorioCita } from './telegram-bot.js';

export async function procesarRecordatoriosCron(env) {
  try {
    const ahora = Date.now();
    const citasPendientes = await getCitasPendientesRecordatorio(env);

    for (const cita of citasPendientes) {
      if (!cita.inicioUTC) continue;

      const inicioTimestamp = new Date(cita.inicioUTC).getTime();
      const difMinutos = Math.round((inicioTimestamp - ahora) / 60000);
      const minutosConfigurados = cita.minutosRecordatorio || 15;

      // Si la cita inicia pronto (dentro de la ventana de anticipación y no está en el pasado lejano)
      if (difMinutos <= minutosConfigurados && difMinutos >= -5) {
        // Enviar notificación a Telegram si el barbero tiene chat_id
        if (cita.telegramChatId) {
          await notificarRecordatorioCita(env, cita.telegramChatId, cita, minutosConfigurados);
        }

        // Marcar en Firestore como recordatorioEnviado = true
        if (cita.docPath) {
          await marcarRecordatorioEnviado(env, cita.docPath);
        }
      }
    }
  } catch (error) {
    console.error('Error durante la ejecución del cron de recordatorios:', error);
  }
}
