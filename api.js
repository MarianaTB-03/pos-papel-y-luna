// ============================================================
// api.js — Servicio de comunicación con Google Sheets
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwhT_JGxfKZRubxNRiSV1rH8rPLAvogMhJLvzj8WOUjcKftdsRk1iid6kpa7kgyGeLlpA/exec';

// ---- GET ----
async function apiGet(resource) {
  const resp = await fetch(`${API_URL}?resource=${resource}`);
  const json = await resp.json();
  if (!json.success) throw new Error(json.message || `Error al cargar ${resource}`);
  return json.data || [];
}

// ---- POST ----
// Nota: NO se envía el header 'Content-Type: application/json' intencionalmente.
// Google Apps Script no maneja el preflight CORS que ese header genera.
// Sin el header, la petición es "simple" y llega correctamente.
// En el Apps Script, leer el body con: JSON.parse(e.postData.contents)
async function apiPost(resource, data) {
  const resp = await fetch(`${API_URL}?resource=${resource}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  const json = await resp.json();
  if (!json.success) throw new Error(json.message || `Error al guardar en ${resource}`);
  return json;
}

// ---- Helpers para IDs únicos ----
function generarId(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---- Helpers de formato ----
function formatearPeso(valor) {
  if (valor === null || valor === undefined || valor === '') return '-';
  return '$' + Number(valor).toLocaleString('es-CO');
}
