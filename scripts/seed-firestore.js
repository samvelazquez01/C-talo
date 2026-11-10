/**
 * Script de Carga de Datos de Ejemplo (Seed Data)
 * Ejecutable vía: npm run seed
 * Carga la barbería de demostración 'Barbería VIP', 2 barberos, 5 servicios y citas de prueba.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedPath = path.join(__dirname, '..', 'data', 'seed-data.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

console.log('💈 Datos de prueba preparados:');
console.log(`- Negocio: ${seedData.negocio.nombre} (/b/${seedData.negocio.slug})`);
console.log(`- Barberos: ${seedData.barberos.map(b => b.nombre).join(', ')}`);
console.log(`- Servicios: ${seedData.servicios.map(s => s.nombre).join(', ')}`);
console.log(`- Clientes en historial: ${seedData.clientesHistorial.length}`);
console.log('\n✅ Los datos están listos en frontend y se cargan automáticamente en modo demostración.');
console.log('Para subirlos a Firestore oficial, utiliza el panel de Firebase o tus credenciales de service account.');
