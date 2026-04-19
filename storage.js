// ============================================================
// storage.js — Caché en memoria + sincronización con API
// ============================================================

let _productos   = null;
let _ventas      = [];   // ventas abiertas se guardan localmente también
let _categorias  = null;
let _proveedores = null;
let _clientes    = null;

// --------- PRODUCTOS ---------
async function cargarProductos() {
  const raw = await apiGet('productos');
  _productos = raw.map(normalizarProducto);
  return _productos;
}

function normalizarProducto(p) {
  return {
    id:          String(p.id || ''),
    nombre:      String(p.nombre || ''),
    categoria:   String(p.categoria || ''),
    precio:      Number(p.precio) || 0,
    costo:       Number(p.costo) || 0,
    codigo:      String(p.codigo || ''),
    seguimiento: p.seguimientoInventario === true || p.seguimientoInventario === 'TRUE' || p.seguimientoInventario === 'true' || p.seguimiento === true || p.seguimiento === 'TRUE' || p.seguimiento === 'true',
    stock:       Number(p.stock) || 0
  };
}

function obtenerProductosCache() { return _productos || []; }

async function guardarNuevoProducto(prod) {
  prod.id = prod.id || generarId('PRD');
  await apiPost('productos', {
    id: prod.id,
    nombre: prod.nombre,
    categoria: prod.categoria,
    precio: prod.precio,
    costo: prod.costo,
    codigo: prod.codigo,
    seguimientoInventario: prod.seguimiento,
    stock: prod.stock ?? ''
  });
  if (_productos) _productos.push(prod);
}

async function actualizarProductoAPI(prod) {
  await apiPost('productos_update', {
    id: prod.id,
    nombre: prod.nombre,
    categoria: prod.categoria,
    precio: prod.precio,
    costo: prod.costo,
    codigo: prod.codigo,
    seguimientoInventario: prod.seguimiento,
    stock: prod.stock ?? ''
  });
  if (_productos) {
    const idx = _productos.findIndex(p => p.id === prod.id);
    if (idx !== -1) _productos[idx] = prod;
  }
}

async function eliminarProductoAPI(id) {
  await apiPost('productos_delete', { id });
  if (_productos) _productos = _productos.filter(p => p.id !== id);
}

function generarCodigoInterno() {
  const productos = obtenerProductosCache();
  if (productos.length === 0) return 'PRD-001';
  const numeros = productos
    .map(p => { const m = String(p.codigo).match(/PRD-(\d+)/); return m ? parseInt(m[1]) : 0; })
    .filter(n => !isNaN(n));
  const siguiente = numeros.length ? Math.max(...numeros) + 1 : 1;
  return `PRD-${String(siguiente).padStart(3, '0')}`;
}

// --------- VENTAS ---------
async function cargarVentas() {
  const raw = await apiGet('ventas');
  _ventas = raw.map(v => ({
    id:               String(v.id || ''),
    fecha:            String(v.fecha || ''),
    clienteId:        String(v.clienteId || ''),
    metodoPago:       String(v.metodoPago || ''),
    total:            Number(v.total) || 0,
    efectivoRecibido: Number(v.efectivoRecibido) || 0,
    cambio:           Number(v.cambio) || 0,
    estado:           String(v.estado || 'cerrada'),
    items:            parseJsonField(v.itemsJson)
  }));
  return _ventas;
}

function obtenerVentasCache() { return _ventas; }

async function guardarVenta(venta) {
  const payload = {
    id:               venta.id,
    fecha:            venta.fecha,
    clienteId:        venta.clienteId || '',
    metodoPago:       venta.metodoPago || '',
    total:            venta.total,
    efectivoRecibido: venta.efectivoRecibido || 0,
    cambio:           venta.cambio || 0,
    estado:           venta.estado,
    itemsJson:        JSON.stringify(venta.items)
  };
  await apiPost('ventas', payload);
  const idx = _ventas.findIndex(v => v.id === venta.id);
  if (idx !== -1) _ventas[idx] = venta;
  else _ventas.push(venta);
}

async function actualizarVentaAPI(venta) {
  await apiPost('ventas_update', {
    id:               venta.id,
    fecha:            venta.fecha,
    clienteId:        venta.clienteId || '',
    metodoPago:       venta.metodoPago || '',
    total:            venta.total,
    efectivoRecibido: venta.efectivoRecibido || 0,
    cambio:           venta.cambio || 0,
    estado:           venta.estado,
    itemsJson:        JSON.stringify(venta.items)
  });
  const idx = _ventas.findIndex(v => v.id === venta.id);
  if (idx !== -1) _ventas[idx] = venta;
}

function generarIdVenta() { return generarId('VTA'); }

// --------- COMPRAS ---------
async function guardarCompra(compra) {
  await apiPost('compras', {
    id:          compra.id,
    fecha:       compra.fecha,
    proveedorId: compra.proveedorId || '',
    total:       compra.total,
    itemsJson:   JSON.stringify(compra.items)
  });
}

async function cargarCompras() {
  const raw = await apiGet('compras');
  return raw.map(c => ({
    id:          String(c.id || ''),
    fecha:       String(c.fecha || ''),
    proveedorId: String(c.proveedorId || ''),
    total:       Number(c.total) || 0,
    items:       parseJsonField(c.itemsJson)
  }));
}

// --------- CATEGORÍAS ---------
async function cargarCategorias() {
  const raw = await apiGet('categorias');
  _categorias = raw.map(c => ({
    id:     String(c.id || ''),
    nombre: String(c.nombre || ''),
    descripcion: String(c.descripcion || '')
  }));
  return _categorias;
}
function obtenerCategoriasCache() { return _categorias || []; }
async function guardarCategoria(cat) {
  cat.id = cat.id || generarId('CAT');
  await apiPost('categorias', cat);
  if (_categorias) _categorias.push(cat);
}
async function actualizarCategoriaAPI(cat) {
  await apiPost('categorias_update', cat);
  if (_categorias) { const i = _categorias.findIndex(c => c.id === cat.id); if (i !== -1) _categorias[i] = cat; }
}
async function eliminarCategoriaAPI(id) {
  await apiPost('categorias_delete', { id });
  if (_categorias) _categorias = _categorias.filter(c => c.id !== id);
}

// --------- PROVEEDORES ---------
async function cargarProveedores() {
  const raw = await apiGet('proveedores');
  _proveedores = raw.map(p => ({
    id:       String(p.id || ''),
    nombre:   String(p.nombre || ''),
    telefono: String(p.telefono || ''),
    correo:   String(p.correo || '')
  }));
  return _proveedores;
}
function obtenerProveedoresCache() { return _proveedores || []; }
async function guardarProveedor(prov) {
  prov.id = prov.id || generarId('PRV');
  await apiPost('proveedores', prov);
  if (_proveedores) _proveedores.push(prov);
}
async function actualizarProveedorAPI(prov) {
  await apiPost('proveedores_update', prov);
  if (_proveedores) { const i = _proveedores.findIndex(p => p.id === prov.id); if (i !== -1) _proveedores[i] = prov; }
}
async function eliminarProveedorAPI(id) {
  await apiPost('proveedores_delete', { id });
  if (_proveedores) _proveedores = _proveedores.filter(p => p.id !== id);
}

// --------- CLIENTES ---------
async function cargarClientes() {
  const raw = await apiGet('clientes');
  _clientes = raw.map(c => ({
    id:       String(c.id || ''),
    nombre:   String(c.nombre || ''),
    telefono: String(c.telefono || ''),
    correo:   String(c.correo || '')
  }));
  return _clientes;
}
function obtenerClientesCache() { return _clientes || []; }
async function guardarCliente(cli) {
  cli.id = cli.id || generarId('CLI');
  await apiPost('clientes', cli);
  if (_clientes) _clientes.push(cli);
}
async function actualizarClienteAPI(cli) {
  await apiPost('clientes_update', cli);
  if (_clientes) { const i = _clientes.findIndex(c => c.id === cli.id); if (i !== -1) _clientes[i] = cli; }
}
async function eliminarClienteAPI(id) {
  await apiPost('clientes_delete', { id });
  if (_clientes) _clientes = _clientes.filter(c => c.id !== id);
}

// --------- UTILS ---------
function parseJsonField(val) {
  if (!val) return [];
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return []; }
}
