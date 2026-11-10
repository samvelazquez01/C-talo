/**
 * Módulo Compartido: Algoritmo de Disponibilidad de AgendaBarber
 * Usado tanto en el Frontend como en el Cloudflare Worker.
 */

/**
 * Convierte cadena "HH:mm" a minutos desde medianoche (0 - 1439).
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Convierte minutos desde medianoche a cadena "HH:mm".
 */
export function minutesToTime(mins) {
  const normalized = Math.max(0, Math.min(1439, Math.round(mins)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Resta una lista de intervalos ocupados de una lista de intervalos base.
 */
export function subtractIntervals(baseIntervals, occupiedIntervals) {
  if (!baseIntervals || baseIntervals.length === 0) return [];
  if (!occupiedIntervals || occupiedIntervals.length === 0) {
    return baseIntervals.filter(([a, b]) => b > a);
  }

  // Fusionar intervalos ocupados solapados
  const sortedOccupied = occupiedIntervals
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);

  const mergedOccupied = [];
  for (const curr of sortedOccupied) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push(curr);
    } else {
      const prev = mergedOccupied[mergedOccupied.length - 1];
      if (curr[0] <= prev[1]) {
        prev[1] = Math.max(prev[1], curr[1]);
      } else {
        mergedOccupied.push(curr);
      }
    }
  }

  let free = [];
  for (const [bStart, bEnd] of baseIntervals) {
    let currentStart = bStart;
    for (const [oStart, oEnd] of mergedOccupied) {
      if (oEnd <= currentStart) continue;
      if (oStart >= bEnd) break;

      if (oStart > currentStart) {
        free.push([currentStart, Math.min(oStart, bEnd)]);
      }
      currentStart = Math.max(currentStart, oEnd);
      if (currentStart >= bEnd) break;
    }
    if (currentStart < bEnd) {
      free.push([currentStart, bEnd]);
    }
  }

  return free.filter(([a, b]) => b > a);
}

/**
 * Calcula la disponibilidad del barbero para una fecha específica.
 */
export function calcularDisponibilidad(params) {
  const {
    fecha,
    duracionServicio: D,
    dMin = 15,
    horarioSemanal = {},
    citasExistentes = [],
    bloqueos = [],
    vacaciones = [],
    reglas = {},
    ahoraMinutos = null,
    esHoy = false
  } = params;

  if (!fecha || !D || D <= 0) return [];

  const pasoCuadricula = Math.max(5, reglas.pasoCuadriculaMin || 15);
  const anticipacionMinima = reglas.anticipacionMinimaMin ?? 30;
  const compactarAgenda = Boolean(reglas.compactarAgenda);

  // 1. Validar Vacaciones
  for (const vac of vacaciones) {
    if (fecha >= vac.desde && fecha <= vac.hasta) {
      return [];
    }
  }

  // 2. Obtener turnos base del día de la semana
  const [y, m, d] = fecha.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const diaSemana = String(dateObj.getUTCDay()); // '0' Domingo a '6' Sábado

  const configDia = horarioSemanal[diaSemana];
  let turnosDia = [];

  if (Array.isArray(configDia)) {
    turnosDia = configDia;
  } else if (configDia && typeof configDia === 'object') {
    if (configDia.activo === false) {
      return []; // Día libre
    }
    turnosDia = configDia.turnos || [];
  }

  if (!Array.isArray(turnosDia) || turnosDia.length === 0) {
    return []; // No trabaja este día
  }

  const baseIntervals = turnosDia.map(t => [timeToMinutes(t.inicio), timeToMinutes(t.fin)]);

  // 3. Recopilar ocupados: pausas, bloqueos y citas
  const occupiedIntervals = [];

  // Pausa de almuerzo fija configurada para este día de la semana
  if (configDia && typeof configDia === 'object' && configDia.pausaAlmuerzo?.activo) {
    const pIni = timeToMinutes(configDia.pausaAlmuerzo.inicio);
    const pFin = timeToMinutes(configDia.pausaAlmuerzo.fin);
    if (pFin > pIni) {
      occupiedIntervals.push([pIni, pFin]);
    }
  }

  // Bloqueos puntuales para esta fecha
  for (const b of bloqueos) {
    if (b.fecha === fecha) {
      if (!b.inicio && !b.fin) {
        // Bloqueo de día completo
        return [];
      }
      occupiedIntervals.push([timeToMinutes(b.inicio), timeToMinutes(b.fin)]);
    }
  }

  // Citas existentes (activas, excluyendo canceladas)
  const citasActivas = citasExistentes.filter(c => c.estado !== 'cancelada');
  for (const c of citasActivas) {
    const start = timeToMinutes(c.inicio || c.horaInicioLocal);
    const duration = c.duracionTotalMin || (timeToMinutes(c.fin || c.horaFinLocal) - start);
    const descanso = c.descansoPostMin || 0;
    const end = start + duration + descanso;
    occupiedIntervals.push([start, end]);
  }

  // 4. Calcular Intervalos Libres del día: turnos - ocupados
  const freeIntervals = subtractIntervals(baseIntervals, occupiedIntervals);
  if (freeIntervals.length === 0) return [];

  // Límites para citas de hoy según anticipación mínima
  const limiteMinimoHoy = (esHoy && ahoraMinutos !== null) ? ahoraMinutos + anticipacionMinima : -1;

  // 5. Puntos de contacto para modo "Compactar agenda"
  const puntosDeContacto = new Set();
  for (const [tStart, tEnd] of baseIntervals) {
    puntosDeContacto.add(tStart);
    puntosDeContacto.add(tEnd);
  }
  for (const [oStart, oEnd] of occupiedIntervals) {
    puntosDeContacto.add(oStart);
    puntosDeContacto.add(oEnd);
  }

  const slotsGenerados = [];

  // 6. Recorrer cada intervalo libre [a, b]
  for (const [a, b] of freeIntervals) {
    const duracionLibre = b - a;
    if (duracionLibre < D) continue;

    // Generar inicios t alineados al paso de cuadrícula
    const startGrid = Math.ceil(a / pasoCuadricula) * pasoCuadricula;
    const endGrid = Math.floor((b - D) / pasoCuadricula) * pasoCuadricula;

    let slotsValidosEnIntervalo = [];

    if (startGrid <= endGrid) {
      for (let t = startGrid; t <= endGrid; t += pasoCuadricula) {
        if (t < a || t + D > b) continue;

        // Regla 3: Huecos útiles
        const gapPre = t - a;
        const gapPost = b - (t + D);

        const gapPreValido = (gapPre === 0 || gapPre >= dMin);
        const gapPostValido = (gapPost === 0 || gapPost >= dMin);

        if (gapPreValido && gapPostValido) {
          slotsValidosEnIntervalo.push({
            t,
            gapPre,
            gapPost,
            desperdicio: (gapPre % dMin) + (gapPost % dMin)
          });
        }
      }
    }

    // Regla 4: Fallback si ningún t cumple pero cabe
    if (slotsValidosEnIntervalo.length === 0 && duracionLibre >= D) {
      const fallbackStarts = new Set([a, b - D]);
      for (const t of fallbackStarts) {
        if (t >= a && t + D <= b) {
          const gapPre = t - a;
          const gapPost = b - (t + D);
          slotsValidosEnIntervalo.push({
            t,
            gapPre,
            gapPost,
            desperdicio: 100
          });
        }
      }
    }

    for (const item of slotsValidosEnIntervalo) {
      if (limiteMinimoHoy >= 0 && item.t < limiteMinimoHoy) {
        continue;
      }

      if (compactarAgenda) {
        const tocaInicio = puntosDeContacto.has(item.t);
        const tocaFin = puntosDeContacto.has(item.t + D);
        if (!tocaInicio && !tocaFin) {
          continue;
        }
      }

      const esPegada = puntosDeContacto.has(item.t) || puntosDeContacto.has(item.t + D);
      const ceroDesperdicio = (item.gapPre === 0 || item.gapPre % dMin === 0) &&
                              (item.gapPost === 0 || item.gapPost % dMin === 0);

      slotsGenerados.push({
        hora: minutesToTime(item.t),
        horaFin: minutesToTime(item.t + D),
        minutos: item.t,
        duracion: D,
        desperdicio: item.desperdicio,
        esRecomendada: esPegada || (ceroDesperdicio && item.desperdicio === 0)
      });
    }
  }

  // Eliminar duplicados
  const mapaUnicos = new Map();
  for (const s of slotsGenerados) {
    if (!mapaUnicos.has(s.hora)) {
      mapaUnicos.set(s.hora, s);
    }
  }

  const resultado = Array.from(mapaUnicos.values());
  resultado.sort((x, y) => x.minutos - y.minutos);

  return resultado;
}

/**
 * Valida si un slot solicitado colisiona con la lista de intervalos ocupados.
 */
export function verificarColision(horaInicio, duracionMin, ocupados = []) {
  const reqStart = timeToMinutes(horaInicio);
  const reqEnd = reqStart + duracionMin;

  for (const item of ocupados) {
    const occStart = timeToMinutes(item.inicio);
    const occEnd = timeToMinutes(item.fin);

    if (reqStart < occEnd && reqEnd > occStart) {
      return true;
    }
  }
  return false;
}
