/*
 * lectores.mjs — Genera data/lectores.json (público: solo resúmenes SHA-256) y la lista privada de PIN.
 * Uso: node tools/lectores.mjs <lectores-privado.json> <salida-pines.csv>
 * lectores-privado.json: [{ "nombre": "Fabián Ospina", "correo": "...", "cargo": "...", "rol": "coordinador|moderador|apoyo", "pin": "opcional" }]
 * El nombre debe coincidir con el que aparece en los responsables de data/agenda.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto, randomInt } from 'node:crypto';

const [, , entrada, salidaPines] = process.argv;
const enc = new TextEncoder();
const hex = async (t) => Buffer.from(await crypto.subtle.digest('SHA-256', enc.encode(t))).toString('hex');
const sal = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString('base64');
const lista = JSON.parse(readFileSync(entrada, 'utf8'));
const pub = [];
const csv = ['Nombre;Correo;Rol;PIN'];
for (const l of lista) {
  const correo = l.correo.trim().toLowerCase();
  const pin = l.pin || String(randomInt(100000, 999999));
  pub.push({ nombre: l.nombre, cargo: l.cargo, rol: l.rol, h: await hex(`${sal}|${correo}`), p: await hex(`${sal}|${correo}|${pin}`) });
  csv.push(`${l.nombre};${correo};${l.rol};${pin}`);
}
writeFileSync('data/lectores.json', JSON.stringify({
  descripcion: 'Lectores habilitados para el escáner de pases. Solo se publican resúmenes: el correo y el PIN se verifican en el dispositivo.',
  reglas: { minutosAntes: 30, minutosDespues: 15 },
  sal, lectores: pub
}, null, 2));
writeFileSync(salidaPines, csv.join('\n') + '\n');
console.log(`${pub.length} lectores → data/lectores.json; PIN en ${salidaPines}`);
