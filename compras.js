// ============================================================
// compras.js — Registro de compras con API
// ============================================================

let itemsCompra = []; // { producto, cantidad, costoUnit, subtotal }

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await Promise.all([cargarProductos(), cargarProveedores(), cargarCompras()]);
    document.getElementById('loading-compras').style.display = 'none';
    document.getElementById('contenido-compras').style.display = '';
    llenarSelectProveedores();
    renderItemsCompra();
    renderHistorialCompras();
  } catch (err) {
    document.getElementById('loading-compras').textContent = '❌ Error al cargar: ' + err.message;
  }
});

function llenarSelectProveedores() {
  const sel = document.getElementById('compra-proveedor');
  const proveedores = obtenerProveedoresCache();
  sel.innerHTML = '<option value="">— Sin proveedor —</option>';
  proveedores.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    sel.appendChild(opt);
  });
}

// ---- Búsqueda de productos ----
function buscarProductoCompra(texto) {
  const div = document.getElementById('compra-resultados');
  if (!texto.trim()) { div.classList.remove('visible'); div.innerHTML = ''; return; }

  const productos = obtenerProductosCache();
  const q = texto.toLowerCase();
  const coincidencias = productos.filter(p =>
    p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
  );

  if (coincidencias.length === 0) {
    div.innerHTML = '<div style="padding:12px 16px;color:var(--gris);font-size:0.88rem;">Sin resultados</div>';
    div.classList.add('visible');
    return;
  }

  div.innerHTML = coincidencias.map(p => `
    <div class="resultado-item" onclick="agregarItemCompra('${p.id}')">
      <div>
        <div class="resultado-nombre">${p.nombre}</div>
        <div class="resultado-codigo">${p.codigo} · ${p.categoria}</div>
      </div>
      <div class="resultado-precio">${formatearPeso(p.costo)} costo</div>
    </div>
  `).join('');
  div.classList.add('visible');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.buscador-wrap')) {
    const d = document.getElementById('compra-resultados');
    if (d) d.classList.remove('visible');
  }
});

function agregarItemCompra(productoId) {
  const prod = obtenerProductosCache().find(p => p.id === productoId);
  if (!prod) return;

  const existente = itemsCompra.find(i => i.producto.id === productoId);
  if (existente) {
    existente.cantidad += 1;
    existente.subtotal = existente.cantidad * existente.costoUnit;
  } else {
    itemsCompra.push({
      producto: { ...prod },
      cantidad: 1,
      costoUnit: prod.costo,
      subtotal: prod.costo
    });
  }

  // Limpiar búsqueda
  document.getElementById('compra-buscar').value = '';
  const d = document.getElementById('compra-resultados');
  d.classList.remove('visible'); d.innerHTML = '';

  renderItemsCompra();
}

function cambiarCantidadCompra(index, delta) {
  const item = itemsCompra[index];
  if (!item) return;
  const nueva = item.cantidad + delta;
  if (nueva <= 0) { itemsCompra.splice(index, 1); }
  else { item.cantidad = nueva; item.subtotal = nueva * item.costoUnit; }
  renderItemsCompra();
}

function cambiarCostoCompra(index, valor) {
  const item = itemsCompra[index];
  if (!item) return;
  const costo = parseFloat(valor) || 0;
  item.costoUnit = costo;
  item.subtotal = item.cantidad * costo;
  renderItemsCompra();
}

function eliminarItemCompra(index) {
  itemsCompra.splice(index, 1);
  renderItemsCompra();
}

function calcularTotalCompra() {
  return itemsCompra.reduce((acc, i) => acc + i.subtotal, 0);
}

function renderItemsCompra() {
  const tbody = document.getElementById('tbody-compra');
  const vacio = document.getElementById('compra-vacia');
  const totalFila = document.getElementById('compra-total-fila');
  const totalSpan = document.getElementById('compra-total');

  if (itemsCompra.length === 0) {
    tbody.innerHTML = '';
    vacio.style.display = 'block';
    totalFila.style.display = 'none';
    return;
  }

  vacio.style.display = 'none';
  totalFila.style.display = 'flex';

  tbody.innerHTML = itemsCompra.map((item, i) => `
    <tr>
      <td>
        <div style="font-weight:600;">${item.producto.nombre}</div>
        <div style="font-size:0.76rem;color:var(--gris);">${item.producto.codigo}</div>
      </td>
      <td style="text-align:center;">
        <div class="control-cantidad">
          <button class="btn-cantidad" onclick="cambiarCantidadCompra(${i}, -1)">−</button>
          <span class="cantidad-valor">${item.cantidad}</span>
          <button class="btn-cantidad" onclick="cambiarCantidadCompra(${i}, 1)">+</button>
        </div>
      </td>
      <td>
        <input type="number" value="${item.costoUnit}" min="0"
          style="width:80px;padding:4px 8px;border:1px solid var(--y3);border-radius:6px;font-size:0.88rem;"
          oninput="cambiarCostoCompra(${i}, this.value)" />
      </td>
      <td class="precio">${formatearPeso(item.subtotal)}</td>
      <td>
        <button class="btn-danger btn-sm" onclick="eliminarItemCompra(${i})">🗑️</button>
      </td>
    </tr>
  `).join('');

  totalSpan.textContent = formatearPeso(calcularTotalCompra());
}

async function registrarCompra() {
  if (itemsCompra.length === 0) {
    mostrarAlerta('Agrega al menos un producto a la compra', 'error');
    return;
  }

  const proveedorId = document.getElementById('compra-proveedor').value;
  const btn = document.getElementById('btn-registrar-compra');
  btn.disabled = true;
  btn.textContent = 'Registrando...';

  try {
    const compra = {
      id: generarId('CMP'),
      fecha: new Date().toISOString(),
      proveedorId: proveedorId,
      total: calcularTotalCompra(),
      items: itemsCompra.map(i => ({
        productoId: i.producto.id,
        productoNombre: i.producto.nombre,
        cantidad: i.cantidad,
        costoUnit: i.costoUnit,
        subtotal: i.subtotal
      }))
    };

    await guardarCompra(compra);

    // Actualizar stock de productos con seguimiento
    for (const item of itemsCompra) {
      const prod = obtenerProductosCache().find(p => p.id === item.producto.id);
      if (prod && prod.seguimiento) {
        prod.stock = (prod.stock || 0) + item.cantidad;
        try { await actualizarProductoAPI(prod); } catch {}
      }
    }

    // Limpiar formulario
    itemsCompra = [];
    document.getElementById('compra-proveedor').value = '';
    renderItemsCompra();
    mostrarAlerta('Compra registrada correctamente ✓', 'exito');

    // Recargar historial
    const comprasData = await cargarCompras();
    renderHistorialCompras(comprasData);

  } catch (err) {
    mostrarAlerta('Error al registrar compra: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '✅ Registrar Compra';
  }
}

async function recargarCompras() {
  try {
    const data = await cargarCompras();
    renderHistorialCompras(data);
    mostrarAlerta('Historial actualizado ✓', 'exito');
  } catch (err) {
    mostrarAlerta('Error: ' + err.message, 'error');
  }
}

function renderHistorialCompras(compras) {
  const lista = document.getElementById('compras-lista');
  const vacio = document.getElementById('compras-vacio');

  if (!compras) {
    // Intentar desde caché no existe para compras, usar lo recibido
    lista.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gris);">Cargando...</div>';
    return;
  }

  if (compras.length === 0) {
    lista.innerHTML = '';
    vacio.classList.remove('oculto');
    return;
  }

  vacio.classList.add('oculto');

  const ordenadas = [...compras].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  lista.innerHTML = ordenadas.map(c => {
    const fecha = new Date(c.fecha);
    const fechaStr = fecha.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
    const horaStr  = fecha.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    const proveedor = obtenerProveedoresCache().find(p => p.id === c.proveedorId);
    const items = Array.isArray(c.items) ? c.items : [];

    return `
      <div style="padding:14px 18px;border-bottom:1px solid var(--y3);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <span style="font-weight:600;font-size:0.9rem;">${fechaStr} — ${horaStr}</span>
            ${proveedor ? `<span style="font-size:0.78rem;color:var(--gris);margin-left:8px;">· ${proveedor.nombre}</span>` : ''}
          </div>
          <span style="font-weight:700;color:var(--texto);">${formatearPeso(c.total)}</span>
        </div>
        <div style="font-size:0.78rem;color:var(--gris);">
          ${items.map(i => `${i.productoNombre || i.productoId} ×${i.cantidad}`).join(' · ')}
        </div>
        <div style="font-size:0.7rem;color:var(--gris);margin-top:2px;">ID: ${c.id}</div>
      </div>
    `;
  }).join('');
}

function mostrarAlerta(msg, tipo) {
  const id = tipo === 'error' ? 'alerta-error-compras' : 'alerta-compras';
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3500);
}
