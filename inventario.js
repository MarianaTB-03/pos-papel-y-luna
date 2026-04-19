// ============================================================
// inventario.js — Gestión de productos con API
// ============================================================

let idProductoAEliminar = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([cargarProductos(), cargarCategorias()]);
    document.getElementById('loading-inv').style.display = 'none';
    document.getElementById('contenido-inv').style.display = '';
    renderTablaProductos();
    llenarSelectCategorias();
  } catch (err) {
    document.getElementById('loading-inv').textContent = '❌ Error al cargar productos: ' + err.message;
  }
});

function llenarSelectCategorias() {
  const sel = document.getElementById('producto-categoria');
  const cats = obtenerCategoriasCache();
  // Mantener opción vacía
  sel.innerHTML = '<option value="">Seleccionar categoría...</option>';
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.nombre;
    opt.textContent = c.nombre;
    sel.appendChild(opt);
  });
}

function renderTablaProductos() {
  const productos = obtenerProductosCache();
  const tbody     = document.getElementById('tbody-productos');
  const vacio     = document.getElementById('vacio-inventario');
  const contador  = document.getElementById('contador-productos');

  contador.textContent = `${productos.length} producto${productos.length !== 1 ? 's' : ''}`;

  if (productos.length === 0) {
    tbody.innerHTML = '';
    vacio.classList.remove('oculto');
    return;
  }

  vacio.classList.add('oculto');

  tbody.innerHTML = productos.map(p => `
    <tr>
      <td><code style="font-size:0.82rem; color:var(--gris);">${p.codigo}</code></td>
      <td><strong>${p.nombre}</strong></td>
      <td>${p.categoria}</td>
      <td class="precio">${formatearPeso(p.precio)}</td>
      <td style="color:var(--gris);">${formatearPeso(p.costo)}</td>
      <td>
        ${p.seguimiento
          ? `<span style="font-weight:600; color:${p.stock === 0 ? 'var(--rojo)' : 'var(--dorado)'};">${p.stock} uds</span>`
          : `<span style="color:var(--gris); font-size:0.82rem;">Sin seguimiento</span>`
        }
      </td>
      <td style="display:flex; gap:8px;">
        <button class="btn-editar btn-sm" onclick="abrirEditar('${p.id}')">✏️ Editar</button>
        <button class="btn-danger btn-sm" onclick="abrirModalEliminar('${p.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function abrirFormulario() {
  limpiarFormulario();
  document.getElementById('producto-codigo').value = generarCodigoInterno();
  document.getElementById('form-titulo').textContent = 'Crear Producto';
  document.getElementById('form-producto-wrap').classList.remove('oculto');
  document.getElementById('form-producto-wrap').scrollIntoView({ behavior: 'smooth' });
}

function abrirEditar(id) {
  const producto = obtenerProductosCache().find(p => p.id === id);
  if (!producto) return;

  limpiarFormulario();

  document.getElementById('producto-id').value          = producto.id;
  document.getElementById('producto-nombre').value      = producto.nombre;
  document.getElementById('producto-precio').value      = producto.precio;
  document.getElementById('producto-costo').value       = producto.costo;
  document.getElementById('producto-codigo').value      = producto.codigo;
  document.getElementById('producto-seguimiento').checked = producto.seguimiento;

  // Categoría
  llenarSelectCategorias();
  document.getElementById('producto-categoria').value = producto.categoria;

  if (producto.seguimiento) {
    document.getElementById('grupo-stock').classList.remove('oculto');
    document.getElementById('producto-stock').value = producto.stock;
  }

  document.getElementById('form-titulo').textContent = 'Editar Producto';
  document.getElementById('form-producto-wrap').classList.remove('oculto');
  document.getElementById('form-producto-wrap').scrollIntoView({ behavior: 'smooth' });
}

function cerrarFormulario() {
  document.getElementById('form-producto-wrap').classList.add('oculto');
  limpiarFormulario();
}

function toggleStock() {
  const tiene = document.getElementById('producto-seguimiento').checked;
  const grupo = document.getElementById('grupo-stock');
  if (tiene) {
    grupo.classList.remove('oculto');
  } else {
    grupo.classList.add('oculto');
    document.getElementById('producto-stock').value = '';
  }
}

async function guardarProducto() {
  const id          = document.getElementById('producto-id').value;
  const nombre      = document.getElementById('producto-nombre').value.trim();
  const categoria   = document.getElementById('producto-categoria').value.trim();
  const precio      = parseFloat(document.getElementById('producto-precio').value);
  const costo       = parseFloat(document.getElementById('producto-costo').value);
  const codigo      = document.getElementById('producto-codigo').value.trim();
  const seguimiento = document.getElementById('producto-seguimiento').checked;
  const stockVal    = document.getElementById('producto-stock').value;
  const stock       = seguimiento ? parseInt(stockVal) : null;

  let hayError = false;

  if (!nombre) { mostrarError('error-nombre','producto-nombre','El nombre es obligatorio'); hayError = true; }
  else { ocultarError('error-nombre','producto-nombre'); }

  if (nombre) {
    const duplicado = obtenerProductosCache().some(
      p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== id
    );
    if (duplicado) { mostrarError('error-nombre','producto-nombre','Ya existe un producto con ese nombre'); hayError = true; }
  }

  if (!categoria) { mostrarError('error-categoria','producto-categoria','La categoría es obligatoria'); hayError = true; }
  else { ocultarError('error-categoria','producto-categoria'); }

  if (isNaN(precio) || precio < 0) { mostrarError('error-precio','producto-precio','Precio inválido'); hayError = true; }
  else { ocultarError('error-precio','producto-precio'); }

  if (isNaN(costo) || costo < 0) { mostrarError('error-costo','producto-costo','Costo inválido'); hayError = true; }
  else { ocultarError('error-costo','producto-costo'); }

  if (!codigo) { mostrarError('error-codigo','producto-codigo','El código es obligatorio'); hayError = true; }
  else {
    const codDuplicado = obtenerProductosCache().some(p => p.codigo === codigo && p.id !== id);
    if (codDuplicado) { mostrarError('error-codigo','producto-codigo','Este código ya existe'); hayError = true; }
    else { ocultarError('error-codigo','producto-codigo'); }
  }

  if (seguimiento) {
    if (stockVal === '' || isNaN(stock) || stock < 0) { mostrarError('error-stock','producto-stock','Stock inválido'); hayError = true; }
    else {
      ocultarError('error-stock','producto-stock');
      document.getElementById('aviso-stock-cero').classList.toggle('oculto', stock !== 0);
    }
  }

  if (hayError) return;

  const btn = document.getElementById('btn-guardar-prod');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const productoData = { nombre, categoria, precio, costo, codigo, seguimiento, stock: seguimiento ? stock : null };

  try {
    if (id) {
      productoData.id = id;
      await actualizarProductoAPI(productoData);
      mostrarAlertaExito('Producto actualizado correctamente ✓');
    } else {
      productoData.id = generarId('PRD');
      await guardarNuevoProducto(productoData);
      mostrarAlertaExito('Producto creado correctamente ✓');
    }
    cerrarFormulario();
    renderTablaProductos();
  } catch (err) {
    mostrarAlertaError('Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

function abrirModalEliminar(id) {
  const producto = obtenerProductosCache().find(p => p.id === id);
  if (!producto) return;
  idProductoAEliminar = id;
  document.getElementById('modal-eliminar-texto').innerHTML =
    `¿Estás seguro de eliminar <strong>${producto.nombre}</strong>? Esta acción no se puede deshacer.`;
  document.getElementById('modal-eliminar').classList.add('visible');
}

function cerrarModalEliminar() {
  idProductoAEliminar = null;
  document.getElementById('modal-eliminar').classList.remove('visible');
}

async function confirmarEliminar() {
  if (!idProductoAEliminar) return;
  try {
    await eliminarProductoAPI(idProductoAEliminar);
    idProductoAEliminar = null;
    cerrarModalEliminar();
    renderTablaProductos();
    mostrarAlertaExito('Producto eliminado correctamente');
  } catch (err) {
    mostrarAlertaError('Error al eliminar: ' + err.message);
    cerrarModalEliminar();
  }
}

// ---------- Helpers ----------
function mostrarError(idMsg, idCampo, texto) {
  const msg = document.getElementById(idMsg);
  msg.textContent = texto;
  msg.classList.add('visible');
  document.getElementById(idCampo).classList.add('campo-error');
}
function ocultarError(idMsg, idCampo) {
  document.getElementById(idMsg).classList.remove('visible');
  document.getElementById(idCampo).classList.remove('campo-error');
}
function limpiarFormulario() {
  ['producto-id','producto-nombre','producto-precio','producto-costo','producto-codigo','producto-stock']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('producto-categoria').value = '';
  document.getElementById('producto-seguimiento').checked = false;
  document.getElementById('grupo-stock').classList.add('oculto');
  document.querySelectorAll('.msg-error').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.campo-error').forEach(el => el.classList.remove('campo-error'));
  const aviso = document.getElementById('aviso-stock-cero');
  if (aviso) aviso.classList.add('oculto');
}
function mostrarAlertaExito(msg) {
  const el = document.getElementById('alerta-global');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3000);
}
function mostrarAlertaError(msg) {
  const el = document.getElementById('alerta-error');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 4000);
}
