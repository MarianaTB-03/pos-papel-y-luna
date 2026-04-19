// ============================================================
// pago.js — Procesamiento de pagos
// ============================================================

function mostrarPago() {
  if (ventaActiva.items.length === 0) {
    mostrarAlertaCaja('Agrega al menos un producto antes de proceder al pago', 'error');
    return;
  }

  document.getElementById('pago-total-valor').textContent = formatearPeso(calcularTotal());
  seleccionarMetodo('efectivo');

  document.getElementById('panel-pago').classList.remove('oculto');
  document.getElementById('panel-placeholder').classList.add('oculto');
  document.getElementById('panel-factura').classList.add('oculto');
}

function seleccionarMetodo(metodo) {
  ventaActiva.metodoPago = metodo;

  document.querySelectorAll('.metodo-tab').forEach(tab => tab.classList.remove('activo'));
  document.getElementById(`tab-${metodo}`).classList.add('activo');

  const panelEfectivo = document.getElementById('efectivo-panel');
  if (metodo === 'efectivo') {
    panelEfectivo.style.display = 'block';
    document.getElementById('input-efectivo').value = '';
    document.getElementById('cambio-valor').textContent = '$0';
    document.getElementById('cambio-valor').classList.remove('cambio-negativo');
  } else {
    panelEfectivo.style.display = 'none';
  }
}

function calcularCambio() {
  const total    = calcularTotal();
  const recibido = parseFloat(document.getElementById('input-efectivo').value) || 0;
  const cambio   = recibido - total;

  ventaActiva.efectivoRecibido = recibido;
  ventaActiva.cambio = cambio;

  const cambioSpan = document.getElementById('cambio-valor');
  cambioSpan.textContent = formatearPeso(Math.abs(cambio));

  if (cambio < 0) {
    cambioSpan.classList.add('cambio-negativo');
  } else {
    cambioSpan.classList.remove('cambio-negativo');
  }
}

async function confirmarVenta() {
  const total = calcularTotal();

  if (ventaActiva.metodoPago === 'efectivo') {
    const recibido = parseFloat(document.getElementById('input-efectivo').value) || 0;
    if (recibido < total) {
      mostrarAlertaCaja('El valor recibido es menor al total de la venta', 'error');
      return;
    }
    ventaActiva.efectivoRecibido = recibido;
    ventaActiva.cambio = recibido - total;
  }

  const clienteId = document.getElementById('pago-cliente')?.value || '';

  const ventaCerrada = {
    id:               ventaActiva.id || generarIdVenta(),
    fecha:            new Date().toISOString(),
    items:            ventaActiva.items,
    total:            total,
    metodoPago:       ventaActiva.metodoPago,
    efectivoRecibido: ventaActiva.efectivoRecibido,
    cambio:           ventaActiva.cambio,
    clienteId:        clienteId,
    estado:           'cerrada'
  };

  const btn = document.querySelector('#panel-pago .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Procesando...'; }

  try {
    if (ventaActiva.id) {
      await actualizarVentaAPI(ventaCerrada);
    } else {
      await guardarVenta(ventaCerrada);
    }

    await descontarStock(ventaActiva.items);
    mostrarRecibo(ventaCerrada);
    iniciarVenta();
    renderVentaActiva();
    document.getElementById('panel-pago').classList.add('oculto');
  } catch (err) {
    mostrarAlertaCaja('Error al registrar venta: ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ Confirmar Venta'; }
  }
}

async function descontarStock(items) {
  for (const item of items) {
    const prod = obtenerProductosCache().find(p => p.id === item.producto.id);
    if (prod && prod.seguimiento) {
      prod.stock = Math.max(0, prod.stock - item.cantidad);
      try { await actualizarProductoAPI(prod); } catch {}
    }
  }
}

function mostrarRecibo(venta) {
  const fecha    = new Date(venta.fecha);
  const fechaStr = fecha.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
  const horaStr  = fecha.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

  const itemsHTML = venta.items.map(item => `
    <div class="recibo-item">
      <span>${item.producto.nombre}</span>
      <span>${formatearPeso(item.subtotal)}</span>
    </div>
    <div class="recibo-item recibo-item-detalle">
      <span>${item.cantidad} x ${formatearPeso(item.producto.precio)}</span>
    </div>
  `).join('');

  const cambioHTML = venta.metodoPago === 'efectivo' ? `
    <div class="recibo-fila"><span>Recibido:</span><span>${formatearPeso(venta.efectivoRecibido)}</span></div>
    <div class="recibo-fila"><span>Cambio:</span><span>${formatearPeso(venta.cambio)}</span></div>
  ` : '';

  const metodoTexto = { efectivo: '💵 Efectivo', nequi: '📱 Nequi', debe: '👤 Debe' }[venta.metodoPago] || venta.metodoPago;

  document.getElementById('recibo-contenido').innerHTML = `
    <div class="recibo-header">
      <div class="recibo-nombre">Papel y Luna</div>
      <div class="recibo-sub">Papelería y Miscelánea</div>
      <div class="recibo-sub">${fechaStr} — ${horaStr}</div>
      <div class="recibo-sub" style="font-size:0.7rem; color:var(--arena);">ID: ${venta.id}</div>
    </div>
    <div class="recibo-items">${itemsHTML}</div>
    <div class="recibo-totales">
      <div class="recibo-fila total"><span>TOTAL</span><span>${formatearPeso(venta.total)}</span></div>
      <div class="recibo-fila"><span>Pago:</span><span>${metodoTexto}</span></div>
      ${cambioHTML}
    </div>
    <div class="recibo-footer">¡Gracias por su compra!<br>Papel y Luna te espera 🌙</div>
  `;

  document.getElementById('panel-factura').classList.remove('oculto');
  document.getElementById('panel-placeholder').classList.add('oculto');
}

function cancelarPago() {
  document.getElementById('panel-pago').classList.add('oculto');
  document.getElementById('panel-placeholder').classList.remove('oculto');
}
