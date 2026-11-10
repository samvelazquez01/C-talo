import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  timeToMinutes,
  minutesToTime,
  subtractIntervals,
  calcularDisponibilidad,
  verificarColision
} from '../../js/shared/availability.js';

describe('Algoritmo de Disponibilidad - Pruebas Unitarias', () => {

  it('Convierte correctamente tiempo a minutos y viceversa', () => {
    assert.strictEqual(timeToMinutes('00:00'), 0);
    assert.strictEqual(timeToMinutes('09:15'), 555);
    assert.strictEqual(timeToMinutes('14:30'), 870);
    assert.strictEqual(timeToMinutes('23:59'), 1439);

    assert.strictEqual(minutesToTime(0), '00:00');
    assert.strictEqual(minutesToTime(555), '09:15');
    assert.strictEqual(minutesToTime(870), '14:30');
  });

  it('Resta intervalos y fusiona solapes correctamente', () => {
    const base = [[480, 720]]; // 08:00 a 12:00 (240 min)
    const ocupados = [
      [540, 600], // 09:00 a 10:00
      [660, 690]  // 11:00 a 11:30
    ];
    const libres = subtractIntervals(base, ocupados);
    assert.deepStrictEqual(libres, [
      [480, 540], // 08:00 - 09:00 (60 min)
      [600, 660], // 10:00 - 11:00 (60 min)
      [690, 720]  // 11:30 - 12:00 (30 min)
    ]);
  });

  it('Descarta huecos inútiles: con Dmin=15, un hueco de 10 min entre citas no se ofrece para cita de 15 o 30 min', () => {
    // Turno: 09:00 a 10:00 (60 min)
    // Cita 1: 09:00 a 09:15
    // Supongamos un espacio ocupado de 09:25 a 10:00
    // Queda un hueco libre de 09:15 a 09:25 (10 minutos)
    // Con dMin = 15, un servicio de 15 min NO debe poder entrar en esos 10 min.
    const resultado = calcularDisponibilidad({
      fecha: '2026-11-11', // Miércoles (3)
      duracionServicio: 15,
      dMin: 15,
      horarioSemanal: {
        '3': [{ inicio: '09:00', fin: '10:00' }]
      },
      citasExistentes: [
        { horaInicioLocal: '09:00', horaFinLocal: '09:15', estado: 'confirmada' },
        { horaInicioLocal: '09:25', horaFinLocal: '10:00', estado: 'confirmada' }
      ],
      reglas: { pasoCuadriculaMin: 5 }
    });

    // En el intervalo libre [09:15, 09:25] solo hay 10 min, menor a D=15. No debe generar slots allí.
    assert.strictEqual(resultado.length, 0);
  });

  it('No deja huecos huérfanos menores a Dmin cuando el intervalo es más grande', () => {
    // Turno: 09:00 a 09:40 (40 minutos)
    // Servicio D = 30 min, Dmin = 15 min, cuadrícula = 5 min
    // Posibles inicios t:
    // t=09:00: dura hasta 09:30. Hueco previo: 0 min (válido). Hueco posterior: 10 min (< 15 inútil!).
    // t=09:05: dura hasta 09:35. Hueco previo: 5 min (< 15 inútil). Hueco posterior: 5 min (< 15 inútil).
    // t=09:10: dura hasta 09:40. Hueco previo: 10 min (< 15 inútil). Hueco posterior: 0 min (válido).
    // Ninguno cumple estrictamente la regla 3 porque deja un remanente de 10 min (< 15 min).
    // Pero la Regla 4 (Fallback) rescata t=a (09:00) y t=b-D (09:10) para no perder la cita de 30 min!
    const resultado = calcularDisponibilidad({
      fecha: '2026-11-11',
      duracionServicio: 30,
      dMin: 15,
      horarioSemanal: {
        '3': [{ inicio: '09:00', fin: '09:40' }]
      },
      reglas: { pasoCuadriculaMin: 5 }
    });

    const horas = resultado.map(r => r.hora);
    assert.ok(horas.includes('09:00'), 'Debe incluir fallback al inicio 09:00');
    assert.ok(horas.includes('09:10'), 'Debe incluir fallback al final 09:10');
    assert.ok(!horas.includes('09:05'), 'No debe incluir 09:05 que desperdicia ambos extremos');
  });

  it('Genera slots exactos en intervalos justos (D = intervalo)', () => {
    // Turno: 10:00 a 10:30 (30 minutos exactos)
    // Servicio D = 30 min, dMin = 15
    const resultado = calcularDisponibilidad({
      fecha: '2026-11-11',
      duracionServicio: 30,
      dMin: 15,
      horarioSemanal: {
        '3': [{ inicio: '10:00', fin: '10:30' }]
      },
      reglas: { pasoCuadriculaMin: 15 }
    });

    assert.strictEqual(resultado.length, 1);
    assert.strictEqual(resultado[0].hora, '10:00');
    assert.strictEqual(resultado[0].horaFin, '10:30');
    assert.strictEqual(resultado[0].esRecomendada, true);
  });

  it('Respeta bordes de turno e intervalos con descanso de limpieza post-servicio', () => {
    // Turno: 08:00 a 12:00
    // Cita: 08:00 a 08:30 con 10 min de descanso post-servicio = ocupado hasta 08:40
    // dMin = 20, D = 20, cuadrícula = 10 min
    const resultado = calcularDisponibilidad({
      fecha: '2026-11-11',
      duracionServicio: 20,
      dMin: 20,
      horarioSemanal: {
        '3': [{ inicio: '08:00', fin: '10:00' }]
      },
      citasExistentes: [
        { horaInicioLocal: '08:00', horaFinLocal: '08:30', descansoPostMin: 10, estado: 'confirmada' }
      ],
      reglas: { pasoCuadriculaMin: 10 }
    });

    const horas = resultado.map(r => r.hora);
    // El libre empieza en 08:40. Slots posibles: 08:40, 09:00, 09:20, 09:40
    assert.ok(horas.includes('08:40'), 'Debe ofrecer 08:40 inmediatamente después del descanso');
    assert.ok(!horas.includes('08:30'), 'No debe ofrecer 08:30 porque el barbero está en descanso');
  });

  it('Maneja días bloqueados completos y rangos de vacaciones', () => {
    // Día bloqueado completo
    const resBloqueado = calcularDisponibilidad({
      fecha: '2026-11-11',
      duracionServicio: 30,
      dMin: 15,
      horarioSemanal: { '3': [{ inicio: '09:00', fin: '18:00' }] },
      bloqueos: [{ fecha: '2026-11-11' }] // Sin horas = día entero
    });
    assert.strictEqual(resBloqueado.length, 0);

    // Vacaciones
    const resVacaciones = calcularDisponibilidad({
      fecha: '2026-12-25',
      duracionServicio: 30,
      dMin: 15,
      horarioSemanal: { '5': [{ inicio: '09:00', fin: '18:00' }] },
      vacaciones: [{ desde: '2026-12-24', hasta: '2026-12-31' }]
    });
    assert.strictEqual(resVacaciones.length, 0);
  });

  it('Modo "Compactar agenda": solo ofrece horas pegadas a citas existentes o inicio de turno', () => {
    // Turno: 08:00 a 14:00 (6 horas = 360 min)
    // Cita existente: 10:00 a 10:30
    // Sin compactar, se ofrecerían slots en 08:00, 08:30, 09:00, 09:30, 10:30, 11:00...
    // Con compactar agenda = true:
    // Solo debe ofrecer:
    // - Pegado al inicio de turno: 08:00
    // - Pegado antes de la cita: 09:30 (fin a las 10:00)
    // - Pegado después de la cita: 10:30
    // - Pegado al fin de turno: 13:30 (fin a las 14:00)
    const resultado = calcularDisponibilidad({
      fecha: '2026-11-11',
      duracionServicio: 30,
      dMin: 30,
      horarioSemanal: {
        '3': [{ inicio: '08:00', fin: '14:00' }]
      },
      citasExistentes: [
        { horaInicioLocal: '10:00', horaFinLocal: '10:30', estado: 'confirmada' }
      ],
      reglas: { pasoCuadriculaMin: 30, compactarAgenda: true }
    });

    const horas = resultado.map(r => r.hora);
    assert.ok(horas.includes('08:00'), 'Debe incluir inicio de turno 08:00');
    assert.ok(horas.includes('09:30'), 'Debe incluir slot pegado antes de la cita 09:30');
    assert.ok(horas.includes('10:30'), 'Debe incluir slot pegado después de la cita 10:30');
    assert.ok(horas.includes('13:30'), 'Debe incluir slot pegado al final de turno 13:30');
    assert.ok(!horas.includes('11:30'), 'No debe incluir horas flotantes en medio sin cita pegada');
  });

  it('Verifica colisiones atómicas con precisión', () => {
    const ocupados = [
      { inicio: '10:00', fin: '10:30' },
      { inicio: '11:00', fin: '11:45' }
    ];

    // Colisión exacta
    assert.strictEqual(verificarColision('10:00', 30, ocupados), true);
    // Solape parcial inicio
    assert.strictEqual(verificarColision('09:45', 30, ocupados), true);
    // Solape parcial fin
    assert.strictEqual(verificarColision('10:15', 30, ocupados), true);
    // Adyacente (justo después, sin solape)
    assert.strictEqual(verificarColision('10:30', 30, ocupados), false);
    // Totalmente libre
    assert.strictEqual(verificarColision('10:30', 25, ocupados), false);
  });

  it('Respeta la pausa o almuerzo fijo del barbero excluyendo las horas de comida de la agenda', () => {
    // Miércoles 2026-11-11
    // Turno: 09:00 a 18:00
    // Almuerzo: 13:00 a 14:00
    const resultado = calcularDisponibilidad({
      fecha: '2026-11-11',
      duracionServicio: 30,
      dMin: 30,
      horarioSemanal: {
        '3': {
          activo: true,
          turnos: [{ inicio: '09:00', fin: '18:00' }],
          pausaAlmuerzo: {
            activo: true,
            inicio: '13:00',
            fin: '14:00'
          }
        }
      },
      reglas: { pasoCuadriculaMin: 30 }
    });

    const horas = resultado.map(r => r.hora);
    assert.ok(horas.includes('12:30'), 'Debe permitir turno antes del almuerzo (12:30 a 13:00)');
    assert.ok(!horas.includes('13:00'), 'NO debe permitir turno a las 13:00 (en pleno almuerzo)');
    assert.ok(!horas.includes('13:30'), 'NO debe permitir turno a las 13:30 (en pleno almuerzo)');
    assert.ok(horas.includes('14:00'), 'Debe permitir turno inmediatamente al terminar el almuerzo (14:00)');
  });
});
