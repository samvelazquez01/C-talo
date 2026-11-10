/**
 * Generador de archivos .ics (iCalendar) para añadir a Google Calendar, Apple Calendar, Outlook, etc.
 */

function formatICSDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Genera el contenido de un archivo .ics y dispara la descarga en el navegador.
 * @param {Object} params
 * @param {string} params.titulo - Título del evento (ej: "Corte Clásico en Barbería El Galpón")
 * @param {string} params.descripcion - Descripción (servicios, barbero, etc.)
 * @param {string} params.ubicacion - Dirección del local
 * @param {Date|string} params.inicioUTC - Fecha y hora de inicio (Date o string ISO)
 * @param {Date|string} params.finUTC - Fecha y hora de fin (Date o string ISO)
 * @param {string} [params.nombreArchivo='cita.ics']
 */
export function descargarArchivoICS({
  titulo,
  descripcion = '',
  ubicacion = '',
  inicioUTC,
  finUTC,
  nombreArchivo = 'cita-agendabarber.ics'
}) {
  const dtStart = new Date(inicioUTC);
  const dtEnd = new Date(finUTC);
  const dtStamp = formatICSDate(new Date());

  const cleanText = (str) =>
    (str || '').replace(/[\r\n]+/g, '\\n').replace(/[,;]/g, '\\$&');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AgendaBarber//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:cita-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@agendabarber`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${formatICSDate(dtStart)}`,
    `DTEND:${formatICSDate(dtEnd)}`,
    `SUMMARY:${cleanText(titulo)}`,
    `DESCRIPTION:${cleanText(descripcion)}`,
    `LOCATION:${cleanText(ubicacion)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga un archivo .ics con todas las citas del barbero para importar en Apple Calendar / Google Calendar.
 */
export function descargarCalendarioCompletoBarberoICS({ barbero, negocio, citas }) {
  const dtStamp = formatICSDate(new Date());
  const cleanText = (str) => (str || '').replace(/[\r\n]+/g, '\\n').replace(/[,;]/g, '\\$&');

  const vevents = citas.filter(c => c.estado !== 'cancelada').map(c => {
    const [y, m, d] = (c.fechaLocal || '').split('-').map(Number);
    const [h1, m1] = (c.horaInicioLocal || '09:00').split(':').map(Number);
    const [h2, m2] = (c.horaFinLocal || c.horaInicioLocal || '09:30').split(':').map(Number);

    const dtStart = new Date(Date.UTC(y, m - 1, d, h1, m1, 0));
    const dtEnd = new Date(Date.UTC(y, m - 1, d, h2, m2, 0));

    const servs = (c.servicios || []).map(s => s.nombre).join(', ') || 'Corte';
    const desc = `Cliente: ${c.clienteNombre || 'Sin nombre'}\\nTel: ${c.clienteTelefono || 'N/A'}\\nServicios: ${servs}`;

    return [
      'BEGIN:VEVENT',
      `UID:${c.id}@agendabarber`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${formatICSDate(dtStart)}`,
      `DTEND:${formatICSDate(dtEnd)}`,
      `SUMMARY:💈 ${cleanText(c.clienteNombre)} - ${cleanText(servs)}`,
      `DESCRIPTION:${cleanText(desc)}`,
      `LOCATION:${cleanText(negocio?.direccion || negocio?.nombre || '')}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    ].join('\r\n');
  });

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AgendaBarber//ES',
    `X-WR-CALNAME:Citas de ${barbero?.nombre || 'Barbero'} (${negocio?.nombre || 'Barbería'})`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agenda-${barbero?.slug || 'barbero'}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
