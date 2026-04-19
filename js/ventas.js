// ============================================================
// ventas.js — Lógica de ventas con API
// ============================================================

let ventaActiva = {
  id: null,
  items: [],
  metodoPago: 'efectivo',
  efectivoRecibido: 0,
  cambio: 0,
  clienteId: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([cargarProductos(), cargarVentas(), cargarClientes()]);
    document.getElementById('loading-caja').style.display = 'none';
    document.getElementById('contenido-caja').style.display = '';
    iniciarVenta();
    renderVentaActiva();
    llenarSelectClientes();
  } catch (err) {
    document.getElementById('loading-caja').textContent = '❌ Error al cargar datos: ' + err.message;
  }
});

function llenarSelectClientes() {
  const sel = document.getElementById('pago-cliente');
  if (!sel) return;
  const clientes = obtenerClientesCache();
  sel.innerHTML = '<option value="">— Sin cliente —</option>';
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nombre;
    sel.appendChild(opt);
  });
}

function iniciarVenta() {
  ventaActiva = {
    id: null,
    items: [],
    metodoPago: 'efectivo',
    efectivoRecibido: 0,
    cambio: 0,
    clienteId: ''
  };
  const badge = document.getElementById('badge-venta-id');
  if (badge) badge.textContent = '';
}

function nuevaVenta() {
  iniciarVenta();
  renderVentaActiva();
  ocultarPaneles();
  limpiarBuscador();
}

function calcularTotal() {
  return ventaActiva.items.reduce((acc, item) => acc + item.subtotal, 0);
}

function buscarProductos(texto) {
  const resultadosDiv = document.getElementById('buscador-resultados');

  if (!texto.trim()) {
    resultadosDiv.classList.remove('visible');
    resultadosDiv.innerHTML = '';
    return;
  }

  const productos = obtenerProductosCache();
  const textoBusq = texto.toLowerCase();

  const coincidencias = productos.filter(p =>
    p.nombre.toLowerCase().includes(textoBusq) ||
    p.codigo.toLowerCase().includes(textoBusq)
  );

  if (coincidencias.length === 0) {
    resultadosDiv.innerHTML = '<div style="padding:12px 16px; color:var(--gris); font-size:0.88rem;">Sin resultados</div>';
    resultadosDiv.classList.add('visible');
    return;
  }

  resultadosDiv.innerHTML = coincidencias.map(p => {
    const sinStock = p.seguimiento && p.stock === 0;
    return `
      <div
        class="resultado-item ${sinStock ? 'sin-stock' : ''}"
        onclick="${sinStock ? '' : `agregarItem('${p.id}')`}"
        title="${sinStock ? 'Sin stock disponible' : 'Agregar a la venta'}"
      >
        <div>
          <div class="resultado-nombre">${p.nombre}</div>
          <div class="resultado-codigo">${p.codigo} · ${p.categoria}${sinStock ? ' · ⚠️ Sin stock' : ''}</div>
        </div>
        <div class="resultado-precio">${formatearPeso(p.precio)}</div>
      </div>
    `;
  }).join('');

  resultadosDiv.classList.add('visible');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.buscador-wrap')) {
    const r = document.getElementById('buscador-resultados');
    if (r) r.classList.remove('visible');
  }
});

function agregarItem(productoId) {
  const productos = obtenerProductosCache();
  const producto  = productos.find(p => p.id === productoId);
  if (!producto) return;

  if (producto.seguimiento && producto.stock === 0) {
    mostrarAlertaCaja('Este producto no tiene stock disponible', 'error');
    return;
  }

  const itemExistente = ventaActiva.items.find(i => i.producto.id === productoId);

  if (itemExistente) {
    if (producto.seguimiento && itemExistente.cantidad >= producto.stock) {
      mostrarAlertaCaja(`Stock máximo disponible: ${producto.stock} unidades`, 'error');
      return;
    }
    itemExistente.cantidad += 1;
    itemExistente.subtotal = itemExistente.cantidad * itemExistente.producto.precio;
  } else {
    ventaActiva.items.push({
      producto: { ...producto },
      cantidad: 1,
      subtotal: producto.precio
    });
  }

  limpiarBuscador();
  renderVentaActiva();
}

function cambiarCantidad(index, delta) {
  const item = ventaActiva.items[index];
  if (!item) return;

  const nuevaCantidad = item.cantidad + delta;

  if (nuevaCantidad <= 0) {
    ventaActiva.items.splice(index, 1);
  } else {
    const productos = obtenerProductosCache();
    const prod = productos.find(p => p.id === item.producto.id);
    if (prod && prod.seguimiento && nuevaCantidad > prod.stock) {
      mostrarAlertaCaja(`Stock máximo disponible: ${prod.stock} unidades`, 'error');
      return;
    }
    item.cantidad = nuevaCantidad;
    item.subtotal = nuevaCantidad * item.producto.precio;
  }

  renderVentaActiva();
}

function eliminarItem(index) {
  ventaActiva.items.splice(index, 1);
  renderVentaActiva();
}

// Editar producto desde el flujo de venta (MVP2 §2.3)
function abrirEditarProductoVenta(productoId) {
  const prod = obtenerProductosCache().find(p => p.id === productoId);
  if (!prod) return;
  document.getElementById('edit-prod-id').value     = prod.id;
  document.getElementById('edit-prod-nombre').value = prod.nombre;
  document.getElementById('edit-prod-precio').value = prod.precio;
  document.getElementById('edit-prod-costo').value  = prod.costo;
  document.getElementById('modal-editar-producto').classList.add('visible');
}

function cerrarModalEditarProducto() {
  document.getElementById('modal-editar-producto').classList.remove('visible');
}

async function guardarEdicionProducto() {
  const id     = document.getElementById('edit-prod-id').value;
  const nombre = document.getElementById('edit-prod-nombre').value.trim();
  const precio = parseFloat(document.getElementById('edit-prod-precio').value);
  const costo  = parseFloat(document.getElementById('edit-prod-costo').value);

  if (!nombre || isNaN(precio) || isNaN(costo)) {
    alert('Completa todos los campos correctamente');
    return;
  }

  const btn = document.getElementById('btn-guardar-edit-prod');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const prod = obtenerProductosCache().find(p => p.id === id);
    if (!prod) throw new Error('Producto no encontrado');

    const actualizado = { ...prod, nombre, precio, costo };
    await actualizarProductoAPI(actualizado);

    // Reflejar cambios en la venta activa
    ventaActiva.items.forEach(item => {
      if (item.producto.id === id) {
        item.producto.nombre = nombre;
        item.producto.precio = precio;
        item.producto.costo  = costo;
        item.subtotal = item.cantidad * precio;
      }
    });

    cerrarModalEditarProducto();
    renderVentaActiva();
    mostrarAlertaCaja('Producto actualizado ✓', 'exito');
  } catch (err) {
    alert('Error al actualizar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Cambios';
  }
}

function renderVentaActiva() {
  const tbody     = document.getElementById('tbody-venta');
  const msgVacio  = document.getElementById('venta-vacia');
  const filaTotal = document.getElementById('fila-total');
  const acciones  = document.getElementById('venta-acciones');
  const totalSpan = document.getElementById('total-venta');
  const badge     = document.getElementById('badge-venta-id');

  if (badge && ventaActiva.id) badge.textContent = ventaActiva.id;

  if (ventaActiva.items.length === 0) {
    tbody.innerHTML = '';
    msgVacio.style.display  = 'block';
    filaTotal.style.display = 'none';
    acciones.style.display  = 'none';
    return;
  }

  msgVacio.style.display  = 'none';
  filaTotal.style.display = 'flex';
  acciones.style.display  = 'flex';

  tbody.innerHTML = ventaActiva.items.map((item, index) => `
    <tr>
      <td>
        <div style="font-weight:600;">${item.producto.nombre}</div>
        <div style="font-size:0.76rem; color:var(--gris);">${item.producto.codigo}</div>
        <button onclick="abrirEditarProductoVenta('${item.producto.id}')"
          style="background:none;border:none;color:var(--gris);font-size:0.72rem;cursor:pointer;padding:0;text-decoration:underline;">
          ✏️ editar producto
        </button>
      </td>
      <td style="text-align:center;">
        <div class="control-cantidad">
          <button class="btn-cantidad" onclick="cambiarCantidad(${index}, -1)">−</button>
          <span class="cantidad-valor">${item.cantidad}</span>
          <button class="btn-cantidad" onclick="cambiarCantidad(${index}, 1)">+</button>
        </div>
      </td>
      <td class="precio">${formatearPeso(item.producto.precio)}</td>
      <td class="precio">${formatearPeso(item.subtotal)}</td>
      <td>
        <button class="btn-danger btn-sm" onclick="eliminarItem(${index})">🗑️</button>
      </td>
    </tr>
  `).join('');

  totalSpan.textContent = formatearPeso(calcularTotal());
}

function mostrarSeccion(seccion) {
  document.querySelectorAll('.caja-seccion').forEach(s => s.classList.remove('activa'));
  document.querySelectorAll('.navbar-tab').forEach(t => t.classList.remove('activa'));
  document.getElementById(`seccion-${seccion}`).classList.add('activa');
  document.getElementById(`tab-${seccion}`).classList.add('activa');
  if (seccion === 'historial') renderHistorial();
}

function ocultarPaneles() {
  document.getElementById('panel-pago').classList.add('oculto');
  document.getElementById('panel-factura').classList.add('oculto');
  document.getElementById('panel-placeholder').classList.remove('oculto');
}

function limpiarBuscador() {
  const input = document.getElementById('buscador-input');
  const res   = document.getElementById('buscador-resultados');
  if (input) input.value = '';
  if (res)   { res.classList.remove('visible'); res.innerHTML = ''; }
}

function mostrarAlertaCaja(mensaje, tipo) {
  const alerta = document.getElementById('alerta-caja');
  if (!alerta) return;
  alerta.textContent = mensaje;
  alerta.className = `alerta alerta-${tipo} visible`;
  setTimeout(() => alerta.classList.remove('visible'), 3500);
}

async function guardarVentaAbierta() {
  if (ventaActiva.items.length === 0) {
    mostrarAlertaCaja('Agrega al menos un producto antes de guardar', 'error');
    return;
  }

  const ventaAbierta = {
    id:               ventaActiva.id || generarIdVenta(),
    fecha:            new Date().toISOString(),
    items:            ventaActiva.items,
    total:            calcularTotal(),
    metodoPago:       '',
    efectivoRecibido: 0,
    cambio:           0,
    clienteId:        ventaActiva.clienteId || '',
    estado:           'abierta'
  };

  try {
    if (ventaActiva.id) {
      await actualizarVentaAPI(ventaAbierta);
    } else {
      await guardarVenta(ventaAbierta);
      ventaActiva.id = ventaAbierta.id;
    }
    mostrarAlertaCaja('Venta guardada. Puedes retomar desde el Historial ✓', 'exito');
  } catch (err) {
    mostrarAlertaCaja('Error al guardar: ' + err.message, 'error');
  }
}

function retomarVenta(ventaId) {
  const ventas = obtenerVentasCache();
  const venta  = ventas.find(v => v.id === ventaId && v.estado === 'abierta');
  if (!venta) return;

  ventaActiva = {
    id:               venta.id,
    items:            venta.items,
    metodoPago:       'efectivo',
    efectivoRecibido: 0,
    cambio:           0,
    clienteId:        venta.clienteId || ''
  };

  mostrarSeccion('venta');
  renderVentaActiva();
  ocultarPaneles();
}
