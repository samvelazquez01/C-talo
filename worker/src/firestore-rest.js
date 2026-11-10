/**
 * Cliente REST para Cloud Firestore v1
 * Permite realizar transacciones atómicas seguras sin librerías pesadas en Cloudflare Workers.
 */

import { getGoogleAccessToken } from './auth-google.js';
import { verificarColision } from './shared/availability.js';

function getBaseUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

/**
 * Convierte un valor JS a formato Firestore Document Field.
 */
export function jsToFirestore(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(jsToFirestore) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = jsToFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Convierte un formato Firestore Document Field a valor JS plano.
 */
export function firestoreToJs(field) {
  if (!field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('nullValue' in field) return null;
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) {
    return (field.arrayValue.values || []).map(firestoreToJs);
  }
  if ('mapValue' in field) {
    const obj = {};
    for (const [k, v] of Object.entries(field.mapValue.fields || {})) {
      obj[k] = firestoreToJs(v);
    }
    return obj;
  }
  return null;
}

export function firestoreDocToJs(doc) {
  if (!doc || !doc.fields) return null;
  const obj = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    obj[k] = firestoreToJs(v);
  }
  return obj;
}

/**
 * Inicia una transacción en Firestore REST.
 */
async function beginTransaction(env, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:beginTransaction`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  if (!res.ok) throw new Error('Error al iniciar transacción Firestore');
  const data = await res.json();
  return data.transaction;
}

/**
 * Ejecuta la transacción atómica de reserva pública:
 * 1. Lee doc de disponibilidad del barbero y fecha con el transaction ID.
 * 2. Verifica si el slot solicitado colisiona con algún ocupado.
 * 3. Si colisiona -> Lanza error 409 Conflicto.
 * 4. Si está libre -> Inserta cita en negocios/{id}/citas y actualiza disponibilidad/{barbero_fecha} en un Commit atómico.
 */
export async function ejecutarReservaAtomica(env, payload) {
  const token = await getGoogleAccessToken(env);
  const transactionId = await beginTransaction(env, token);

  const dispoDocPath = `disponibilidad/${payload.barberoId}_${payload.fechaLocal}`;
  const fullDispoDocName = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${dispoDocPath}`;

  // 1. Leer documento de disponibilidad actual dentro de la transacción
  const readUrl = `https://firestore.googleapis.com/v1/${fullDispoDocName}?transaction=${encodeURIComponent(transactionId)}`;
  const readRes = await fetch(readUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  let ocupadosExistentes = [];
  if (readRes.ok) {
    const dispoDoc = await readRes.json();
    const data = firestoreDocToJs(dispoDoc);
    ocupadosExistentes = data?.ocupados || [];
  }

  // 2. Comprobar colisión
  const hayColision = verificarColision(payload.horaInicioLocal, payload.duracionTotalMin, ocupadosExistentes);
  if (hayColision) {
    throw new Error('CONFLICT_SLOT_TAKEN');
  }

  // 3. Preparar nueva lista de ocupados
  const nuevosOcupados = [
    ...ocupadosExistentes,
    {
      inicio: payload.horaInicioLocal,
      fin: payload.horaFinLocal,
      tipo: 'cita'
    }
  ];

  // 4. Preparar documento de cita
  const citaId = `cita-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const fullCitaDocName = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/negocios/${payload.negocioId}/citas/${citaId}`;

  const citaDocData = {
    id: citaId,
    negocioId: payload.negocioId,
    barberoId: payload.barberoId,
    clienteNombre: payload.clienteNombre,
    clienteTelefono: payload.clienteTelefono,
    servicios: payload.servicios,
    duracionTotalMin: payload.duracionTotalMin,
    fechaLocal: payload.fechaLocal,
    horaInicioLocal: payload.horaInicioLocal,
    horaFinLocal: payload.horaFinLocal,
    inicioUTC: payload.inicioUTC,
    finUTC: payload.finUTC,
    estado: 'confirmada',
    origen: 'web',
    tokenCliente: payload.tokenCliente,
    recordatorioEnviado: false,
    minutosRecordatorio: payload.minutosRecordatorio || 15,
    creadoEn: new Date().toISOString()
  };

  // Convertir a campos Firestore
  const citaFields = {};
  for (const [k, v] of Object.entries(citaDocData)) {
    citaFields[k] = jsToFirestore(v);
  }

  const dispoFields = {
    barberoId: jsToFirestore(payload.barberoId),
    fechaLocal: jsToFirestore(payload.fechaLocal),
    negocioId: jsToFirestore(payload.negocioId),
    ocupados: jsToFirestore(nuevosOcupados),
    ultimaActualizacion: jsToFirestore(new Date().toISOString())
  };

  // 5. Commit atómico
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`;
  const commitPayload = {
    transaction: transactionId,
    writes: [
      {
        update: {
          name: fullCitaDocName,
          fields: citaFields
        }
      },
      {
        update: {
          name: fullDispoDocName,
          fields: dispoFields
        }
      }
    ]
  };

  const commitRes = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commitPayload)
  });

  if (!commitRes.ok) {
    const errText = await commitRes.text();
    throw new Error(`Error en el commit de la transacción Firestore: ${errText}`);
  }

  return citaDocData;
}

/**
 * Consulta citas con recordatorio pendiente para el cron.
 */
export async function getCitasPendientesRecordatorio(env) {
  const token = await getGoogleAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;

  // Consulta estructurada para Firestore REST
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'citas', allDescendants: true }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            {
              fieldFilter: {
                field: { fieldPath: 'estado' },
                op: 'EQUAL',
                value: { stringValue: 'confirmada' }
              }
            },
            {
              fieldFilter: {
                field: { fieldPath: 'recordatorioEnviado' },
                op: 'EQUAL',
                value: { booleanValue: false }
              }
            }
          ]
        }
      },
      limit: 15
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  });

  if (!res.ok) {
    console.warn('Error consultando recordatorios pendientes:', await res.text());
    return [];
  }

  const results = await res.json();
  const citas = [];
  for (const item of results) {
    if (item.document) {
      citas.push({
        docPath: item.document.name,
        ...firestoreDocToJs(item.document)
      });
    }
  }
  return citas;
}

/**
 * Marca una cita como recordatorio enviado.
 */
export async function marcarRecordatorioEnviado(env, fullDocName) {
  const token = await getGoogleAccessToken(env);
  const url = `https://firestore.googleapis.com/v1/${fullDocName}?updateMask.fieldPaths=recordatorioEnviado`;

  await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fields: {
        recordatorioEnviado: { booleanValue: true }
      }
    })
  });
}
