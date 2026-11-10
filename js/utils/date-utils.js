/**
 * Utilidades de fecha y hora para AgendaBarber
 * Soporta formato de 12 horas (AM/PM), zonas horarias y cuentas regresivas.
 */

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DIAS_SEMANA_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const MESES_CORTOS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

/**
 * Convierte hora militar "14:30" o "09:05" a formato legible de 12 horas "2:30 pm" o "9:05 am".
 */
export function formatTime12(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');

  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 se convierte en 12

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formatea un rango horario en 12 horas.
 * Ej: "09:00" y "10:30" -> "9:00 am - 10:30 am"
 */
export function formatTimeRange12(inicioStr, finStr) {
  if (!inicioStr) return '';
  if (!finStr) return formatTime12(inicioStr);
  return `${formatTime12(inicioStr)} - ${formatTime12(finStr)}`;
}

/**
 * Convierte minutos desde medianoche (ej: 870) a formato 12 horas (ej: "2:30 pm").
 */
export function minutesToTime12(mins) {
  const normalized = Math.max(0, Math.min(1439, Math.round(mins)));
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const time24 = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return formatTime12(time24);
}

/**
 * Obtiene la fecha local actual en formato 'YYYY-MM-DD'.
 */
export function getFechaHoyLocal(timeZone = 'America/Montevideo') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }
}

/**
 * Obtiene la fecha local de mañana en formato 'YYYY-MM-DD'.
 */
export function getFechaMananaLocal(timeZone = 'America/Santo_Domingo') {
  const hoyStr = getFechaHoyLocal(timeZone);
  const [y, m, d] = hoyStr.split('-').map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0));
  return nextDate.toISOString().split('T')[0];
}

/**
 * Obtiene los minutos actuales transcurridos en el día según zona horaria.
 */
export function getMinutosHoyLocal(timeZone = 'America/Montevideo') {
  try {
    const formatter = new Intl.DateTimeFormat('es-UY', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.format(new Date()).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  } catch {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
}

/**
 * Formatea una fecha 'YYYY-MM-DD' en texto legible en español.
 * Ej: "Miércoles, 11 de Noviembre"
 */
export function formatearFechaLegible(fechaStr) {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const diaSemana = DIAS_SEMANA[dateObj.getDay()];
  const diaNum = dateObj.getDate();
  const mes = MESES[dateObj.getMonth()];
  return `${diaSemana}, ${diaNum} de ${mes}`;
}

/**
 * Formatea una fecha 'YYYY-MM-DD' en formato corto.
 * Ej: "Mié 11 Nov"
 */
export function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return `${DIAS_SEMANA_CORTOS[dateObj.getDay()]} ${dateObj.getDate()} ${MESES_CORTOS[dateObj.getMonth()]}`;
}

/**
 * Retorna texto de cuenta regresiva para una cita.
 * Ej: "en 12 min", "ahora", "hace 5 min", "en 2h 15m".
 */
export function getCuentaRegresiva(fechaLocal, horaLocal, timeZone = 'America/Montevideo') {
  const hoy = getFechaHoyLocal(timeZone);
  if (fechaLocal !== hoy) {
    if (fechaLocal > hoy) return `el ${formatearFechaCorta(fechaLocal)}`;
    return `pasada`;
  }

  const minutosAhora = getMinutosHoyLocal(timeZone);
  const [hh, mm] = horaLocal.split(':').map(Number);
  const minutosCita = hh * 60 + mm;
  const dif = minutosCita - minutosAhora;

  if (dif === 0) return 'ahora';
  if (dif > 0 && dif <= 60) return `en ${dif} min`;
  if (dif > 60) {
    const horas = Math.floor(dif / 60);
    const mins = dif % 60;
    return mins > 0 ? `en ${horas}h ${mins}m` : `en ${horas}h`;
  }
  const pasados = Math.abs(dif);
  if (pasados < 60) return `hace ${pasados} min`;
  const horasPasadas = Math.floor(pasados / 60);
  return `hace ${horasPasadas}h`;
}

/**
 * Suma días (positivos o negativos) a una fecha 'YYYY-MM-DD'.
 */
export function sumarDiasAFecha(fechaStr, dias) {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + dias, 12, 0, 0));
  return target.toISOString().split('T')[0];
}

/**
 * Suma minutos a una cadena 'HH:mm' en formato 24h.
 */
export function sumarMinutosAHora(horaStr, minutosSuma) {
  const [h, m] = horaStr.split(':').map(Number);
  const total = h * 60 + m + minutosSuma;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
