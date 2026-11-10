import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage para entorno Node de pruebas
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new LocalStorageMock();
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, detail) {
    this.name = name;
    this.detail = detail;
  }
};

const { DB } = await import('../../js/db.js');
const { Auth } = await import('../../js/auth.js');

describe('Seguridad, Autenticación y Facturación SaaS', () => {
  beforeEach(() => {
    localStorage.clear();
    DB.reiniciarACero();
  });

  it('Autentica al Superadmin con la clave predeterminada 1234 y permite cambiarla', () => {
    assert.strictEqual(Auth.loginSuperadmin('admin', 'incorrecta'), false);
    assert.strictEqual(Auth.loginSuperadmin('admin', '1234'), true);

    const sesion = Auth.getSuperadminSession();
    assert.ok(sesion);
    assert.strictEqual(sesion.usuario, 'admin');

    // Cambiar contraseña
    const cambiado = Auth.cambiarPasswordSuperadmin('nuevaClaveSegura');
    assert.strictEqual(cambiado, true);

    // Antigua clave ya no funciona
    assert.strictEqual(Auth.loginSuperadmin('admin', '1234'), false);
    // Nueva clave funciona
    assert.strictEqual(Auth.loginSuperadmin('admin', 'nuevaClaveSegura'), true);

    Auth.logoutSuperadmin();
    assert.strictEqual(Auth.getSuperadminSession(), null);
  });

  it('Permite crear una barbería con credenciales para el dueño y autenticarlo', () => {
    const biz = DB.crearNegocio({
      nombre: 'Barbería Don Vito',
      slug: 'don-vito',
      moneda: 'DOP',
      usuario: 'vito-admin',
      password: 'miPassword123'
    });

    assert.strictEqual(biz.moneda, 'DOP');
    assert.strictEqual(biz.simboloMoneda, 'RD$');
    assert.strictEqual(biz.cuenta.usuario, 'vito-admin');

    // Autenticación de dueño
    const fail = Auth.loginDueno('vito-admin', 'clave_erronea');
    assert.strictEqual(fail.ok, false);

    const ok = Auth.loginDueno('vito-admin', 'miPassword123');
    assert.strictEqual(ok.ok, true);
    assert.strictEqual(ok.negocio.id, biz.id);

    const sesionDueno = Auth.getDuenoSession();
    assert.ok(sesionDueno);
    assert.strictEqual(sesionDueno.slug, 'don-vito');

    Auth.logoutDueno();
    assert.strictEqual(Auth.getDuenoSession(), null);
  });

  it('Permite al dueño crear barberos con credenciales y autenticar al barbero', () => {
    const biz = DB.crearNegocio({
      nombre: 'Barbería VIP',
      slug: 'barberia-vip',
      usuario: 'vip',
      password: '123'
    });

    const barbero = DB.crearBarbero(biz.id, {
      nombre: 'Samuel Velásquez',
      slug: 'samuel',
      telefono: '8095551234',
      usuario: 'samuel809',
      password: 'barberoPassword'
    });

    assert.strictEqual(barbero.cuenta.usuario, 'samuel809');
    assert.strictEqual(barbero.cuenta.password, 'barberoPassword');

    const loginFail = Auth.loginBarbero('samuel809', 'mal');
    assert.strictEqual(loginFail.ok, false);

    const loginOk = Auth.loginBarbero('samuel809', 'barberoPassword');
    assert.strictEqual(loginOk.ok, true);
    assert.strictEqual(loginOk.barbero.id, barbero.id);

    const sesionBarbero = Auth.getBarberoSession();
    assert.ok(sesionBarbero);
    assert.strictEqual(sesionBarbero.nombre, 'Samuel Velásquez');

    Auth.logoutBarbero();
    assert.strictEqual(Auth.getBarberoSession(), null);
  });

  it('Calcula las métricas de ingresos del Superadmin: RD$ 500 instalación y RD$ 200 mensual por barbero', () => {
    // 2 Negocios = 2 x 500 = RD$ 1,000 recaudados por instalación
    const b1 = DB.crearNegocio({ nombre: 'B1', slug: 'b1' });
    const b2 = DB.crearNegocio({ nombre: 'B2', slug: 'b2' });

    // 3 Profesionales en B1, 2 en B2 = 5 Profesionales
    const barbero1 = DB.crearBarbero(b1.id, { nombre: 'Barbero 1' });
    DB.crearBarbero(b1.id, { nombre: 'Barbero 2' });
    DB.crearBarbero(b1.id, { nombre: 'Barbero 3' });
    DB.crearBarbero(b2.id, { nombre: 'Barbero 4' });
    DB.crearBarbero(b2.id, { nombre: 'Barbero 5' });

    // Se cobra el mes de un barbero (RD$ 200)
    DB.registrarPagoMesBarbero(barbero1.id);

    const stats = DB.getStatsPlataforma();
    assert.strictEqual(stats.totalNegocios, 2);
    assert.strictEqual(stats.totalPersonal, 5);
    assert.strictEqual(stats.ingresosInstalacionesRD, 1000); // 2 * 500
    assert.strictEqual(stats.proyeccionProximoMesRD, 1000); // 5 activos * 200
    assert.strictEqual(stats.recaudacionHistoricaTotalRD, 1200); // 1000 de instalaciones + 200 de mensualidad
    assert.strictEqual(stats.historialCobros.length, 3); // 2 instalaciones + 1 mensualidad
  });

  it('Suspender a un barbero por falta de pago lo desactiva y lo oculta de la agenda pública de clientes', () => {
    const biz = DB.crearNegocio({ nombre: 'Barbería Test', slug: 'test' });
    const barbero1 = DB.crearBarbero(biz.id, { nombre: 'Barbero Activo' });
    const barbero2 = DB.crearBarbero(biz.id, { nombre: 'Barbero Moroso' });

    // Al inicio, ambos barberos están disponibles para los clientes
    let publicos = DB.getBarberos(biz.id, true);
    assert.strictEqual(publicos.length, 2);

    // El superadmin suspende al barbero moroso
    DB.toggleSuspensionBarbero(barbero2.id);

    // En la agenda pública solo queda el Barbero Activo
    publicos = DB.getBarberos(biz.id, true);
    assert.strictEqual(publicos.length, 1);
    assert.strictEqual(publicos[0].id, barbero1.id);

    // Si el barbero moroso paga su mes, se renueva y se reactiva
    DB.registrarPagoMesBarbero(barbero2.id);
    publicos = DB.getBarberos(biz.id, true);
    assert.strictEqual(publicos.length, 2);
  });

  it('Soporta múltiples verticales de negocio (Barbería, Salón, Tatuajes, Spa) y registra desglose en estadísticas', () => {
    const b1 = DB.crearNegocio({ nombre: 'Barber Shop', slug: 'b-shop', tipoNegocio: 'barberia' });
    const b2 = DB.crearNegocio({ nombre: 'Glam Salon', slug: 'glam', tipoNegocio: 'salon' });
    const b3 = DB.crearNegocio({ nombre: 'Ink Studio', slug: 'ink', tipoNegocio: 'tatuaje' });
    const b4 = DB.crearNegocio({ nombre: 'Zen Spa', slug: 'zen', tipoNegocio: 'spa' });

    assert.strictEqual(b1.tipoNegocio, 'barberia');
    assert.strictEqual(b2.tipoNegocio, 'salon');
    assert.strictEqual(b3.tipoNegocio, 'tatuaje');
    assert.strictEqual(b4.tipoNegocio, 'spa');

    const stats = DB.getStatsPlataforma();
    assert.strictEqual(stats.totalNegocios, 4);
    assert.strictEqual(stats.porVertical.barberia, 1);
    assert.strictEqual(stats.porVertical.salon, 1);
    assert.strictEqual(stats.porVertical.tatuaje, 1);
    assert.strictEqual(stats.porVertical.spa, 1);
  });

  it('Permite al Superadmin actualizar el logo y marca de CÍTALO y auditar cobros manuales en el libro contable', () => {
    const plat = DB.getPlataforma();
    assert.strictEqual(plat.nombre, 'CÍTALO');
    assert.strictEqual(plat.eslogan, 'Tu cita a un click');

    DB.actualizarPlataforma({
      logoUrl: 'https://i.ibb.co/test/logo.png',
      eslogan: 'Tu cita a un click - República Dominicana'
    });

    const platActualizada = DB.getPlataforma();
    assert.strictEqual(platActualizada.logoUrl, 'https://i.ibb.co/test/logo.png');
    assert.strictEqual(platActualizada.eslogan, 'Tu cita a un click - República Dominicana');

    // Registrar cobro manual en libro contable
    const cobro = DB.registrarCobroManual({
      montoRD: 1500,
      concepto: 'Mantenimiento anual y soporte VIP',
      negocioNombre: 'Salón Glamour',
      metodoPago: 'Efectivo'
    });

    assert.ok(cobro.id);
    assert.strictEqual(cobro.montoRD, 1500);

    const stats = DB.getStatsPlataforma();
    assert.ok(stats.historialCobros.find(c => c.id === cobro.id));
  });

  it('Distingue enlace de negocio (con múltiples barberos seleccionables) de enlace personal directo de un barbero', () => {
    const biz = DB.crearNegocio({ nombre: 'Peluquería Dúo', slug: 'peluqueria-duo' });
    const b1 = DB.crearBarbero(biz.id, { nombre: 'Carlos Barbero', slug: 'carlos' });
    const b2 = DB.crearBarbero(biz.id, { nombre: 'Manuel Estilista', slug: 'manuel' });

    // Cuando se entra al negocio directamente, ambos barberos están disponibles para seleccionar
    const barberosDelNegocio = DB.getBarberos(biz.id, true);
    assert.strictEqual(barberosDelNegocio.length, 2);
    assert.strictEqual(barberosDelNegocio[0].nombre, 'Carlos Barbero');
    assert.strictEqual(barberosDelNegocio[1].nombre, 'Manuel Estilista');

    // Cuando se busca por slug personal del barbero, se obtiene su perfil personal directo
    const personalCarlos = DB.getBarbero('carlos');
    assert.ok(personalCarlos);
    assert.strictEqual(personalCarlos.id, b1.id);
    assert.strictEqual(personalCarlos.negocioId, biz.id);

    const personalManuel = DB.getBarbero('manuel');
    assert.ok(personalManuel);
    assert.strictEqual(personalManuel.id, b2.id);
    assert.strictEqual(personalManuel.negocioId, biz.id);
  });

  it('Registra citas en fechas futuras (ej. 12 de Noviembre) y son recuperables por el barbero en agenda diaria y completa', () => {
    localStorage.clear();
    DB.reiniciarACero();

    const biz = DB.crearNegocio({ nombre: 'Barbería Élite', vertical: 'barberia' });
    const b1 = DB.crearBarbero(biz.id, { nombre: 'Marcos VIP', slug: 'marcos' });

    // Cita para hoy
    const citaHoy = DB.crearCita({
      negocioId: biz.id,
      barberoId: b1.id,
      clienteNombre: 'Carlos Cliente',
      clienteTelefono: '8095551234',
      fechaLocal: '2026-11-10',
      horaInicioLocal: '10:00',
      horaFinLocal: '10:45',
      duracionTotalMin: 45,
      servicios: [{ id: 's1', nombre: 'Corte Clásico', precio: 350 }]
    });

    // Cita para fecha futura (12 de Noviembre)
    const citaFutura = DB.crearCita({
      negocioId: biz.id,
      barberoId: b1.id,
      clienteNombre: 'Pedro Futuro',
      clienteTelefono: '8295559876',
      fechaLocal: '2026-11-12',
      horaInicioLocal: '15:30',
      horaFinLocal: '16:15',
      duracionTotalMin: 45,
      servicios: [{ id: 's1', nombre: 'Corte + Barba', precio: 500 }]
    });

    // 1. La agenda completa del barbero debe listar AMBAS citas
    const todasLasCitas = DB.getCitas(biz.id, b1.id);
    assert.strictEqual(todasLasCitas.length, 2);

    // 2. La consulta específica del día 12 debe retornar la cita de Pedro
    const citas12Nov = DB.getCitas(biz.id, b1.id, '2026-11-12');
    assert.strictEqual(citas12Nov.length, 1);
    assert.strictEqual(citas12Nov[0].clienteNombre, 'Pedro Futuro');
    assert.strictEqual(citas12Nov[0].horaInicioLocal, '15:30');

    // 3. La consulta de hoy solo retorna la cita de hoy
    const citasHoyList = DB.getCitas(biz.id, b1.id, '2026-11-10');
    assert.strictEqual(citasHoyList.length, 1);
    assert.strictEqual(citasHoyList[0].clienteNombre, 'Carlos Cliente');

    // 4. Los clientes quedaron indexados en el directorio del local
    const clientes = DB.getClientes(biz.id);
    assert.strictEqual(clientes.length, 2);
  });

  it('Permite registrar pagos personalizados en bloque (ej. RD$ 1,000 por 5 meses) y cancelar o suspender suscripciones', () => {
    localStorage.clear();
    DB.reiniciarACero();

    const biz = DB.crearNegocio({ nombre: 'Barbería Platinum', slug: 'platinum' });
    const barbero = DB.crearBarbero(biz.id, { nombre: 'Ángel Barbero' });

    // 1. Registro de pago en bloque de RD$ 1,000 por 5 meses
    const cobroBloque = DB.registrarPagoPersonalizado({
      negocioId: biz.id,
      personalId: barbero.id,
      monto: 1000,
      meses: 5,
      concepto: 'Adelanto 5 meses de Ángel',
      metodo: 'Transferencia Banco Popular'
    });

    assert.ok(cobroBloque.id);
    assert.strictEqual(cobroBloque.monto, 1000);
    assert.strictEqual(cobroBloque.mesesPagados, 5);

    const barberoActualizado = DB.getBarbero(barbero.id);
    assert.strictEqual(barberoActualizado.suscripcion.estadoPago, 'al_dia');
    assert.strictEqual(barberoActualizado.activo, true);

    // 2. Cancelar la suscripción del negocio (sin eliminar la cuenta ni datos)
    DB.cambiarEstadoSuscripcionNegocio(biz.id, 'cancelada');
    const bizCancelado = DB.getNegocio(biz.id);
    assert.strictEqual(bizCancelado.suscripcion.estado, 'cancelada');
    assert.strictEqual(bizCancelado.activo, false);

    // Los barberos de un negocio cancelado quedan ocultos de las reservas públicas
    let publicos = DB.getBarberos(biz.id, true);
    assert.strictEqual(publicos.length, 0);

    // 3. Reactivar la suscripción del negocio
    DB.cambiarEstadoSuscripcionNegocio(biz.id, 'activa');
    publicos = DB.getBarberos(biz.id, true);
    assert.strictEqual(publicos.length, 1);

    // 4. Cancelar la suscripción individual de un barbero
    DB.cambiarEstadoSuscripcionBarbero(barbero.id, 'cancelado');
    const barberoCancelado = DB.getBarbero(barbero.id);
    assert.strictEqual(barberoCancelado.suscripcion.estadoPago, 'cancelado');
    assert.strictEqual(barberoCancelado.activo, false);

    publicos = DB.getBarberos(biz.id, true);
    assert.strictEqual(publicos.length, 0);
  });

  it('Permite cambiar usuario y contraseña desde los paneles de Superadmin, Dueño y Barbero', () => {
    // 1. Superadmin cambia su usuario y clave
    assert.strictEqual(Auth.loginSuperadmin('admin', '1234'), true);
    Auth.actualizarCredencialesSuperadmin('master-admin', 'claveSuperSecreta');
    
    // Antiguas credenciales fallan
    assert.strictEqual(Auth.loginSuperadmin('admin', '1234'), false);
    // Nuevas credenciales ingresan
    assert.strictEqual(Auth.loginSuperadmin('master-admin', 'claveSuperSecreta'), true);

    // 2. Dueño de negocio cambia su usuario y clave
    const biz = DB.crearNegocio({
      nombre: 'Imperio Barber',
      slug: 'imperio',
      usuario: 'imperio-user',
      password: 'passwordOriginal'
    });
    assert.strictEqual(Auth.loginDueno('imperio-user', 'passwordOriginal').ok, true);

    Auth.actualizarCredencialesDueno(biz.id, 'nuevo-imperio-user', 'nuevoPasswordEmpresa');
    assert.strictEqual(Auth.loginDueno('imperio-user', 'passwordOriginal').ok, false);
    assert.strictEqual(Auth.loginDueno('nuevo-imperio-user', 'nuevoPasswordEmpresa').ok, true);

    // 3. Barbero cambia su usuario y clave
    const barbero = DB.crearBarbero({
      negocioId: biz.id,
      nombre: 'Marcos Vasquez',
      slug: 'marcos',
      usuario: 'marcos-user',
      password: 'barberoClave1'
    });
    assert.strictEqual(Auth.loginBarbero('marcos-user', 'barberoClave1').ok, true);

    Auth.actualizarCredencialesBarbero(barbero.id, 'marcos-vip', 'barberoClave2026');
    assert.strictEqual(Auth.loginBarbero('marcos-user', 'barberoClave1').ok, false);
    assert.strictEqual(Auth.loginBarbero('marcos-vip', 'barberoClave2026').ok, true);
  });
});
