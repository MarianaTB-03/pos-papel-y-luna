// ============================================================
// historial.js — Historial de ventas
// ============================================================

async function recargarHistorial() {
  try {
    await cargarVentas();
    renderHistorial();
    const alerta = document.getElementById('alerta-hist');
    if (alerta) { alerta.textContent = 'Historial actualizado ✓'; alerta.classList.add('visible'); setTimeout(() => alerta.classList.remove('visible'), 2500); }
  } catch (err) {
    alert('Error al recargar: ' + err.message);
  }
}

function renderHistorial() {
  const ventas = obtenerVentasCache();
  const lista  = document.getElementById('historial-lista');
  const vacio  = document.getElementById('historial-vacio');

  document.getElementById('panel-detalle-historial').classList.add('oculto');

  if (ventas.length === 0) {
    lista.innerHTML = '';
    vacio.classList.remove('oculto');
    return;
  }

  vacio.classList.add('oculto');

  const ordenadas = [...ventas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  lista.innerHTML = ordenadas.map(venta => {
    const fecha    = new Date(venta.fecha);
    const fechaStr = fecha.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
    const horaStr  = fecha.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

    const badgeEstado = venta.estado === 'abierta'
      ? '<span class="badge badge-abierta">Abierta</span>'
      : '<span class="badge badge-cerrada">Cerrada</span>';

    const badgeMetodo = venta.estado === 'cerrada' && venta.metodoPago
      ? `<span class="badge badge-${venta.metodoPago}" style="text-transform:capitalize; margin-right:4px;">${venta.metodoPago}</span>`
      : '';

    const btnRetomar = venta.estado === 'abierta'
      ? `<button class="btn-retomar" onclick="event.stopPropagation(); retomarVenta('${venta.id}')">▶ Retomar</button>`
      : '';

    return `
      <div class="historial-item" onclick="verDetalleHistorial('${venta.id}')">
        <div class="historial-fecha">${fechaStr}<br><span style="font-size:0.75rem;">${horaStr}</span></div>
        <div class="historial-id">${venta.id}</div>
        <div class="historial-total">${formatearPeso(venta.total)}</div>
        <div>${badgeMetodo}${badgeEstado}</div>
        <div>${btnRetomar}</div>
      </div>
    `;
  }).join('');
}

function verDetalleHistorial(ventaId) {
  const ventas = obtenerVentasCache();
  const venta  = ventas.find(v => v.id === ventaId);
  if (!venta) return;

  const fecha    = new Date(venta.fecha);
  const fechaStr = fecha.toLocaleDateString('es-CO', { day:'2-digit', month:'2-digit', year:'numeric' });
  const horaStr  = fecha.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });

  const items = Array.isArray(venta.items) ? venta.items : [];
  const itemsHTML = items.map(item => `
    <div class="recibo-item">
      <span>${item.producto ? item.producto.nombre : 'Producto'}</span>
      <span>${formatearPeso(item.subtotal)}</span>
    </div>
    <div class="recibo-item recibo-item-detalle">
      <span>${item.cantidad} x ${formatearPeso(item.producto ? item.producto.precio : 0)}</span>
    </div>
  `).join('');

  const cambioHTML = venta.estado === 'cerrada' && venta.metodoPago === 'efectivo' ? `
    <div class="recibo-fila"><span>Recibido:</span><span>${formatearPeso(venta.efectivoRecibido)}</span></div>
    <div class="recibo-fila"><span>Cambio:</span><span>${formatearPeso(venta.cambio)}</span></div>
  ` : '';

  const metodoTexto = { efectivo:'💵 Efectivo', nequi:'📱 Nequi', debe:'👤 Debe' }[venta.metodoPago] || '—';

  const notaAbierta = venta.estado === 'abierta'
    ? `<div style="background:#FFF3CD;color:#856404;padding:8px 10px;border-radius:6px;font-size:0.8rem;margin-bottom:12px;">⚠️ Esta venta está abierta y no ha sido cobrada</div>`
    : '';

  document.getElementById('recibo-historial').innerHTML = `
    ${notaAbierta}
    <div class="recibo-header">
      <div class="recibo-nombre">Papel y Luna</div>
      <div class="recibo-sub">Papelería y Miscelánea</div>
      <div class="recibo-sub">${fechaStr} — ${horaStr}</div>
      <div class="recibo-sub" style="font-size:0.7rem;color:var(--arena);">ID: ${venta.id}</div>
    </div>
    <div class="recibo-items">${itemsHTML}</div>
    <div class="recibo-totales">
      <div class="recibo-fila total"><span>TOTAL</span><span>${formatearPeso(venta.total)}</span></div>
      ${venta.estado === 'cerrada' ? `<div class="recibo-fila"><span>Pago:</span><span>${metodoTexto}</span></div>` : ''}
      ${cambioHTML}
    </div>
    <div class="recibo-footer">Estado: <strong>${venta.estado === 'cerrada' ? '✅ Cerrada' : '🟡 Abierta'}</strong></div>
  `;

  const panel = document.getElementById('panel-detalle-historial');
  panel.classList.remove('oculto');
  panel.scrollIntoView({ behavior: 'smooth' });
}
