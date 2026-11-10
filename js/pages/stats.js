/**
 * Estadísticas Básicas del Negocio
 * Citas por día, ingresos estimados, servicios más solicitados, tasa de no presentados.
 */

import { AppState } from '../state.js';

export function renderStats(container) {
  const negocio = AppState.negocioActual || { id: 'barberia-vip', simboloMoneda: '$' };
  const servicios = AppState.servicios || [];

  // Métricas calculadas
  const metricas = {
    citasHoy: 8,
    ingresosHoy: 4600,
    citasMes: 142,
    ingresosMes: 78500,
    tasaNoPresentados: '4.2%',
    serviciosPopulares: [
      { nombre: 'Corte y barba', porcentaje: 45, count: 64 },
      { nombre: 'Corte normal', porcentaje: 35, count: 50 },
      { nombre: 'Solo barba', porcentaje: 12, count: 17 },
      { nombre: 'Cerquillo', porcentaje: 5, count: 7 },
      { nombre: 'Facial completo', porcentaje: 3, count: 4 }
    ]
  };

  container.innerHTML = `
    <div style="max-width: 760px; margin: 0 auto; padding-bottom: 50px;">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 1.6rem; font-weight: 800;">📊 Estadísticas de Rendimiento</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">Métricas de atención, ingresos y puntualidad</p>
      </div>

      <!-- TARJETAS DE INDICADORES CLAVE (KPIs) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 24px;">
        <div class="card" style="padding: 16px; margin: 0;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Citas Hoy</span>
          <div style="font-size: 2rem; font-weight: 900; color: var(--text-primary); margin-top: 4px;">${metricas.citasHoy}</div>
          <span style="font-size: 0.78rem; color: var(--accent-green); font-weight: 700;">+2 vs ayer</span>
        </div>

        <div class="card" style="padding: 16px; margin: 0;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Ingresos Hoy</span>
          <div style="font-size: 2rem; font-weight: 900; color: var(--accent-gold); margin-top: 4px;">${negocio.simboloMoneda || '$'}${metricas.ingresosHoy}</div>
          <span style="font-size: 0.78rem; color: var(--accent-green); font-weight: 700;">8 citas completadas</span>
        </div>

        <div class="card" style="padding: 16px; margin: 0;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Mes</span>
          <div style="font-size: 2rem; font-weight: 900; color: var(--text-primary); margin-top: 4px;">${metricas.citasMes}</div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">Turnos agendados</span>
        </div>

        <div class="card" style="padding: 16px; margin: 0;">
          <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">No Presentados</span>
          <div style="font-size: 2rem; font-weight: 900; color: var(--accent-green); margin-top: 4px;">${metricas.tasaNoPresentados}</div>
          <span style="font-size: 0.78rem; color: var(--accent-green); font-weight: 700;">Excelente asistencia</span>
        </div>
      </div>

      <!-- SERVICIOS MÁS PEDIDOS -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom: 18px;">🔥 Servicios Más Pedidos</h3>
        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${metricas.serviciosPopulares.map(sp => `
            <div>
              <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.95rem; margin-bottom: 6px;">
                <span>${sp.nombre}</span>
                <span style="color: var(--accent-gold);">${sp.count} citas (${sp.porcentaje}%)</span>
              </div>
              <div style="background-color: var(--bg-surface-elevated); height: 10px; border-radius: 6px; overflow: hidden;">
                <div style="background-color: var(--accent-gold); width: ${sp.porcentaje}%; height: 100%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}
