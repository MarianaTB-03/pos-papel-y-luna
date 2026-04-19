// ============================================================
// entidades.js — CRUD de Categorías, Proveedores y Clientes
// ============================================================

let _entEliminarInfo = null; // { tipo, id, nombre }

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([cargarCategorias(), cargarProveedores(), cargarClientes()]);
    document.getElementById('loading-ent').style.display = 'none';
    document.getElementById('contenido-ent').style.display = '';
    renderTabla('categorias');
    renderTabla('proveedores');
    renderTabla('clientes');
  } catch (err) {
    document.getElementById('loading-ent').textContent = '❌ Error al cargar: ' + err.message;
  }
});

// ---- Navegación entre secciones ----
function mostrarEnt(tipo) {
  document.querySelectorAll('.ent-seccion').forEach(s => s.classList.remove('activa'));
  document.querySelectorAll('.navbar-tab').forEach(t => t.classList.remove('activa'));
  document.getElementById(`seccion-${tipo}`).classList.add('activa');
  document.getElementById(`tab-ent-${tipo}`).classList.add('activa');
}

// ---- Formularios ----
function abrirFormEnt(tipo) {
  limpiarFormEnt(tipo);
  document.getElementById(`form-titulo-${tipo}`).textContent = tipoNombre(tipo, true);
  document.getElementById(`form-${tipo}`).classList.remove('oculto');
  document.getElementById(`form-${tipo}`).scrollIntoView({ behavior: 'smooth' });
}

function editarEntidad(tipo, id) {
  const item = obtenerCache(tipo).find(e => e.id === id);
  if (!item) return;

  limpiarFormEnt(tipo);
  document.getElementById(`form-titulo-${tipo}`).textContent = 'Editar ' + tipoNombre(tipo, false);

  if (tipo === 'categorias') {
    document.getElementById('cat-id').value          = item.id;
    document.getElementById('cat-nombre').value      = item.nombre;
    document.getElementById('cat-descripcion').value = item.descripcion || '';
  } else if (tipo === 'proveedores') {
    document.getElementById('prov-id').value       = item.id;
    document.getElementById('prov-nombre').value   = item.nombre;
    document.getElementById('prov-telefono').value = item.telefono || '';
    document.getElementById('prov-correo').value   = item.correo || '';
  } else if (tipo === 'clientes') {
    document.getElementById('cli-id').value       = item.id;
    document.getElementById('cli-nombre').value   = item.nombre;
    document.getElementById('cli-telefono').value = item.telefono || '';
    document.getElementById('cli-correo').value   = item.correo || '';
  }

  document.getElementById(`form-${tipo}`).classList.remove('oculto');
  document.getElementById(`form-${tipo}`).scrollIntoView({ behavior: 'smooth' });
}

function cerrarFormEnt(tipo) {
  document.getElementById(`form-${tipo}`).classList.add('oculto');
  limpiarFormEnt(tipo);
}

function limpiarFormEnt(tipo) {
  if (tipo === 'categorias') {
    ['cat-id','cat-nombre','cat-descripcion'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const err = document.getElementById('err-cat-nombre'); if (err) { err.textContent = ''; err.classList.remove('visible'); }
  } else if (tipo === 'proveedores') {
    ['prov-id','prov-nombre','prov-telefono','prov-correo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const err = document.getElementById('err-prov-nombre'); if (err) { err.textContent = ''; err.classList.remove('visible'); }
  } else if (tipo === 'clientes') {
    ['cli-id','cli-nombre','cli-telefono','cli-correo'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const err = document.getElementById('err-cli-nombre'); if (err) { err.textContent = ''; err.classList.remove('visible'); }
  }
}

// ---- Guardar (crear o actualizar) ----
async function guardarEntidad(tipo) {
  let datos = {};
  let errNombreId, errNombreEl, nombreVal;

  if (tipo === 'categorias') {
    errNombreId = 'err-cat-nombre';
    nombreVal = document.getElementById('cat-nombre').value.trim();
    datos = {
      id:          document.getElementById('cat-id').value,
      nombre:      nombreVal,
      descripcion: document.getElementById('cat-descripcion').value.trim()
    };
  } else if (tipo === 'proveedores') {
    errNombreId = 'err-prov-nombre';
    nombreVal = document.getElementById('prov-nombre').value.trim();
    datos = {
      id:       document.getElementById('prov-id').value,
      nombre:   nombreVal,
      telefono: document.getElementById('prov-telefono').value.trim(),
      correo:   document.getElementById('prov-correo').value.trim()
    };
  } else if (tipo === 'clientes') {
    errNombreId = 'err-cli-nombre';
    nombreVal = document.getElementById('cli-nombre').value.trim();
    datos = {
      id:       document.getElementById('cli-id').value,
      nombre:   nombreVal,
      telefono: document.getElementById('cli-telefono').value.trim(),
      correo:   document.getElementById('cli-correo').value.trim()
    };
  }

  // Validar nombre
  errNombreEl = document.getElementById(errNombreId);
  if (!nombreVal) {
    errNombreEl.textContent = 'El nombre es obligatorio';
    errNombreEl.classList.add('visible');
    return;
  }
  errNombreEl.classList.remove('visible');

  const btnId = `btn-guardar-${tipo === 'categorias' ? 'cat' : tipo === 'proveedores' ? 'prov' : 'cli'}`;
  const btn = document.getElementById(btnId);
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    if (datos.id) {
      // Actualizar
      if (tipo === 'categorias')  await actualizarCategoriaAPI(datos);
      if (tipo === 'proveedores') await actualizarProveedorAPI(datos);
      if (tipo === 'clientes')    await actualizarClienteAPI(datos);
      mostrarAlertaEnt(`${tipoNombre(tipo, false)} actualizado correctamente ✓`);
    } else {
      // Crear
      if (tipo === 'categorias')  await guardarCategoria(datos);
      if (tipo === 'proveedores') await guardarProveedor(datos);
      if (tipo === 'clientes')    await guardarCliente(datos);
      mostrarAlertaEnt(`${tipoNombre(tipo, false)} creado correctamente ✓`);
    }
    cerrarFormEnt(tipo);
    renderTabla(tipo);
  } catch (err) {
    mostrarAlertaEntError('Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

// ---- Eliminar ----
function abrirModalEliminarEnt(tipo, id) {
  const item = obtenerCache(tipo).find(e => e.id === id);
  if (!item) return;
  _entEliminarInfo = { tipo, id, nombre: item.nombre };
  document.getElementById('modal-ent-texto').innerHTML =
    `¿Eliminar <strong>${item.nombre}</strong>? Esta acción no se puede deshacer.`;
  document.getElementById('modal-eliminar-ent').classList.add('visible');
}

function cerrarModalEliminarEnt() {
  _entEliminarInfo = null;
  document.getElementById('modal-eliminar-ent').classList.remove('visible');
}

async function confirmarEliminarEnt() {
  if (!_entEliminarInfo) return;
  const { tipo, id } = _entEliminarInfo;
  try {
    if (tipo === 'categorias')  await eliminarCategoriaAPI(id);
    if (tipo === 'proveedores') await eliminarProveedorAPI(id);
    if (tipo === 'clientes')    await eliminarClienteAPI(id);
    mostrarAlertaEnt('Eliminado correctamente');
    cerrarModalEliminarEnt();
    renderTabla(tipo);
  } catch (err) {
    mostrarAlertaEntError('Error al eliminar: ' + err.message);
    cerrarModalEliminarEnt();
  }
}

// ---- Render tablas ----
function renderTabla(tipo) {
  const items = obtenerCache(tipo);
  const tbody = document.getElementById(`tbody-${tipo}`);
  const vacio = document.getElementById(`vacio-${tipo}`);

  if (items.length === 0) {
    tbody.innerHTML = '';
    vacio.classList.remove('oculto');
    return;
  }
  vacio.classList.add('oculto');

  if (tipo === 'categorias') {
    tbody.innerHTML = items.map(c => `
      <tr>
        <td><strong>${c.nombre}</strong></td>
        <td style="color:var(--gris);">${c.descripcion || '—'}</td>
        <td style="display:flex;gap:8px;">
          <button class="btn-editar btn-sm" onclick="editarEntidad('categorias','${c.id}')">✏️</button>
          <button class="btn-danger btn-sm" onclick="abrirModalEliminarEnt('categorias','${c.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  } else if (tipo === 'proveedores') {
    tbody.innerHTML = items.map(p => `
      <tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.telefono || '—'}</td>
        <td>${p.correo || '—'}</td>
        <td style="display:flex;gap:8px;">
          <button class="btn-editar btn-sm" onclick="editarEntidad('proveedores','${p.id}')">✏️</button>
          <button class="btn-danger btn-sm" onclick="abrirModalEliminarEnt('proveedores','${p.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  } else if (tipo === 'clientes') {
    tbody.innerHTML = items.map(c => `
      <tr>
        <td><strong>${c.nombre}</strong></td>
        <td>${c.telefono || '—'}</td>
        <td>${c.correo || '—'}</td>
        <td style="display:flex;gap:8px;">
          <button class="btn-editar btn-sm" onclick="editarEntidad('clientes','${c.id}')">✏️</button>
          <button class="btn-danger btn-sm" onclick="abrirModalEliminarEnt('clientes','${c.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }
}

// ---- Helpers ----
function obtenerCache(tipo) {
  if (tipo === 'categorias')  return obtenerCategoriasCache();
  if (tipo === 'proveedores') return obtenerProveedoresCache();
  if (tipo === 'clientes')    return obtenerClientesCache();
  return [];
}

function tipoNombre(tipo, nueva) {
  const mapa = {
    categorias:  nueva ? 'Nueva Categoría' : 'Categoría',
    proveedores: nueva ? 'Nuevo Proveedor'  : 'Proveedor',
    clientes:    nueva ? 'Nuevo Cliente'     : 'Cliente'
  };
  return mapa[tipo] || tipo;
}

function mostrarAlertaEnt(msg) {
  const el = document.getElementById('alerta-ent');
  el.textContent = msg; el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3000);
}
function mostrarAlertaEntError(msg) {
  const el = document.getElementById('alerta-ent-error');
  el.textContent = msg; el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 4000);
}
