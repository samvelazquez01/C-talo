/**
 * Módulo Anti-Spam y Limitador de Tasa para el Worker
 * Protege contra reservas masivas, spam por IP y números inválidos.
 */

const ipRequests = new Map();
const phoneRequests = new Map();

// Ventana de 15 minutos (900,000 ms)
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 10;
const MAX_REQUESTS_PER_PHONE = 5;

/**
 * Limpia registros obsoletos de memoria para no saturar RAM.
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [k, v] of ipRequests.entries()) {
    if (now - v.lastSeen > WINDOW_MS) ipRequests.delete(k);
  }
  for (const [k, v] of phoneRequests.entries()) {
    if (now - v.lastSeen > WINDOW_MS) phoneRequests.delete(k);
  }
}

/**
 * Valida formato básico de número telefónico (mínimo 7 dígitos numéricos).
 */
export function validarTelefono(tel) {
  if (!tel || typeof tel !== 'string') return false;
  const digits = tel.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Verifica si la solicitud cumple con las políticas anti-spam.
 * @param {string} ip - IP del cliente
 * @param {string} phone - Teléfono del cliente
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkRateLimit(ip, phone) {
  cleanupExpired();
  const now = Date.now();

  // 1. Validar formato de teléfono
  if (!validarTelefono(phone)) {
    return {
      allowed: false,
      reason: 'El número de teléfono proporcionado no es válido (debe tener entre 7 y 15 dígitos).'
    };
  }

  // 2. Comprobar límite por IP
  const cleanIp = ip || 'unknown-ip';
  const ipData = ipRequests.get(cleanIp) || { count: 0, lastSeen: now };
  if (now - ipData.lastSeen < WINDOW_MS && ipData.count >= MAX_REQUESTS_PER_IP) {
    return {
      allowed: false,
      reason: 'Demasiadas solicitudes desde esta dirección IP. Intenta nuevamente en unos minutos.'
    };
  }

  // 3. Comprobar límite por teléfono
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneData = phoneRequests.get(cleanPhone) || { count: 0, lastSeen: now };
  if (now - phoneData.lastSeen < WINDOW_MS && phoneData.count >= MAX_REQUESTS_PER_PHONE) {
    return {
      allowed: false,
      reason: 'Este número de teléfono ya ha realizado varias reservas recientes.'
    };
  }

  // Actualizar contadores
  ipData.count += 1;
  ipData.lastSeen = now;
  ipRequests.set(cleanIp, ipData);

  phoneData.count += 1;
  phoneData.lastSeen = now;
  phoneRequests.set(cleanPhone, phoneData);

  return { allowed: true };
}
