'use strict';

(function initAdmin() {

  const SIZES   = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const STATUSES = ['pendiente', 'confirmado', 'en preparación', 'enviado', 'entregado', 'cancelado'];

  let allOrders   = [];
  let allProducts = [];
  let currentOrderFilter = 'all';

  // ─── Init ────────────────────────────────────────────────

  async function init() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      showDashboard();
    } else {
      showLogin();
    }

    sb.auth.onAuthStateChange((_event, session) => {
      if (session) showDashboard();
      else showLogin();
    });
  }

  // ─── Auth ────────────────────────────────────────────────

  function showLogin() {
    document.getElementById('loginScreen').style.display  = 'flex';
    document.getElementById('adminLayout').style.display  = 'none';
  }

  function showDashboard() {
    document.getElementById('loginScreen').style.display  = 'none';
    document.getElementById('adminLayout').style.display  = 'flex';
    loadOrders();
    loadProducts();
    setupTabs();
    setupProductModal();
    setupOrderModal();
    document.getElementById('logoutBtn').addEventListener('click', logout);
  }

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl  = document.getElementById('loginError');
    const btn      = e.target.querySelector('[type="submit"]');

    btn.textContent = 'INGRESANDO...';
    btn.disabled = true;
    errorEl.style.display = 'none';

    const { error } = await sb.auth.signInWithPassword({ email, password });

    btn.textContent = 'INGRESAR →';
    btn.disabled = false;

    if (error) {
      errorEl.textContent = 'Email o contraseña incorrectos.';
      errorEl.style.display = 'block';
    }
  });

  async function logout() {
    await sb.auth.signOut();
  }

  // ─── Tabs ────────────────────────────────────────────────

  function setupTabs() {
    document.querySelectorAll('.admin-nav__item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav__item').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
        document.getElementById(`tab-${tab}`).style.display = 'flex';
      });
    });
  }

  // ─── Orders ──────────────────────────────────────────────

  async function loadOrders() {
    const { data, error } = await sb
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      document.getElementById('ordersBody').innerHTML =
        '<tr><td colspan="7" class="table-loading">Error al cargar pedidos.</td></tr>';
      return;
    }

    allOrders = data || [];
    renderOrders();
    updatePendingBadge();

    // Setup filters
    document.getElementById('orderFilters').addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentOrderFilter = btn.dataset.status;
      renderOrders();
    });
  }

  function renderOrders() {
    const filtered = currentOrderFilter === 'all'
      ? allOrders
      : allOrders.filter(o => o.status === currentOrderFilter);

    if (!filtered.length) {
      document.getElementById('ordersBody').innerHTML =
        '<tr><td colspan="7" class="table-loading">No hay pedidos.</td></tr>';
      return;
    }

    document.getElementById('ordersBody').innerHTML = filtered.map(order => {
      const items = order.items || [];
      const itemSummary = items.map(i => `${i.name} (${i.size}) x${i.qty}`).join(', ');
      const date = new Date(order.created_at).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: '2-digit'
      });

      return `
        <tr>
          <td style="font-family:var(--font-display);font-size:0.65rem;color:var(--clr-text-3)">
            ${order.id.slice(0,8).toUpperCase()}
          </td>
          <td>
            <strong style="display:block;color:var(--clr-text)">${escHtml(order.buyer_name)}</strong>
            <span style="font-size:0.75rem">${escHtml(order.buyer_email)}</span>
          </td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(itemSummary)}">
            ${escHtml(itemSummary)}
          </td>
          <td style="font-family:var(--font-display);font-weight:700;color:var(--clr-accent)">
            ${formatPrice(order.subtotal)}
          </td>
          <td>
            <select class="status-select" data-order="${order.id}" data-current="${order.status}">
              ${STATUSES.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${capitalize(s)}</option>`).join('')}
            </select>
          </td>
          <td style="color:var(--clr-text-3);white-space:nowrap">${date}</td>
          <td>
            <div class="table-actions">
              <button class="action-btn" data-view-order="${order.id}">Ver</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Status change
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const { error } = await sb
          .from('orders')
          .update({ status: sel.value })
          .eq('id', sel.dataset.order);

        if (!error) {
          const order = allOrders.find(o => o.id === sel.dataset.order);
          if (order) order.status = sel.value;
          updatePendingBadge();
        } else {
          sel.value = sel.dataset.current;
          alert('Error al actualizar el estado.');
        }
      });
    });

    // View detail
    document.querySelectorAll('[data-view-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        const order = allOrders.find(o => o.id === btn.dataset.viewOrder);
        if (order) showOrderDetail(order);
      });
    });
  }

  function updatePendingBadge() {
    const count = allOrders.filter(o => o.status === 'pendiente').length;
    const badge = document.getElementById('pendingBadge');
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── Products ────────────────────────────────────────────

  async function loadProducts() {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      document.getElementById('productsBody').innerHTML =
        '<tr><td colspan="6" class="table-loading">Error al cargar productos.</td></tr>';
      return;
    }

    allProducts = data || [];
    renderProducts();
  }

  function renderProducts() {
    if (!allProducts.length) {
      document.getElementById('productsBody').innerHTML =
        '<tr><td colspan="6" class="table-loading">No hay productos. Agregá uno.</td></tr>';
      return;
    }

    document.getElementById('productsBody').innerHTML = allProducts.map(p => {
      const stock = p.stock || {};
      const stockSummary = Object.entries(stock)
        .filter(([, qty]) => qty > 0)
        .map(([s, qty]) => `${s}:${qty}`)
        .join(' · ') || '—';

      return `
        <tr>
          <td>
            ${p.image_url
              ? `<img src="${p.image_url}" alt="" class="product-thumb">`
              : `<div class="product-thumb-placeholder">
                   <img src="Imagenes/emotesignatus.png" alt="">
                 </div>`
            }
          </td>
          <td style="color:var(--clr-text);font-weight:500">${escHtml(p.name)}</td>
          <td style="font-family:var(--font-display);font-weight:700;color:var(--clr-accent)">
            ${formatPrice(p.price)}
          </td>
          <td style="font-size:0.75rem;color:var(--clr-text-3)">${stockSummary}</td>
          <td><span class="active-dot ${p.active ? '' : 'is-off'}"></span></td>
          <td>
            <div class="table-actions">
              <button class="action-btn" data-edit="${p.id}">Editar</button>
              <button class="action-btn action-btn--danger" data-delete="${p.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const product = allProducts.find(p => p.id === btn.dataset.edit);
        if (product) openProductModal(product);
      });
    });

    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(btn.dataset.delete));
    });
  }

  // ─── Product Modal ───────────────────────────────────────

  function setupProductModal() {
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
    document.getElementById('productModalClose').addEventListener('click', closeProductModal);
    document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
    document.getElementById('productModalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeProductModal();
    });
    document.getElementById('productForm').addEventListener('submit', handleSaveProduct);
  }

  function openProductModal(product) {
    const isEdit = !!product;
    document.getElementById('productModalTitle').textContent = isEdit ? 'EDITAR PRODUCTO' : 'AGREGAR PRODUCTO';
    document.getElementById('productId').value    = product?.id    || '';
    document.getElementById('productName').value  = product?.name  || '';
    document.getElementById('productPrice').value = product?.price || '';
    document.getElementById('productDesc').value  = product?.description || '';
    document.getElementById('productImage').value = product?.image_url   || '';
    document.getElementById('productActive').checked = product?.active ?? true;

    const stock = product?.stock || {};
    SIZES.forEach(s => {
      const el = document.getElementById(`stock-${s}`);
      if (el) el.value = stock[s] ?? 0;
    });

    document.getElementById('productModalOverlay').style.display = 'flex';
  }

  function closeProductModal() {
    document.getElementById('productModalOverlay').style.display = 'none';
    document.getElementById('productForm').reset();
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('saveProductBtn');

    const name  = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    if (!name || isNaN(price)) return;

    const stock = {};
    SIZES.forEach(s => {
      const val = parseInt(document.getElementById(`stock-${s}`).value) || 0;
      stock[s] = val;
    });

    const payload = {
      name,
      price,
      description: document.getElementById('productDesc').value.trim(),
      image_url:   document.getElementById('productImage').value.trim(),
      active:      document.getElementById('productActive').checked,
      stock
    };

    btn.textContent = 'GUARDANDO...';
    btn.disabled = true;

    const id = document.getElementById('productId').value;
    let error;

    if (id) {
      ({ error } = await sb.from('products').update(payload).eq('id', id));
    } else {
      ({ error } = await sb.from('products').insert(payload));
    }

    btn.textContent = 'GUARDAR PRODUCTO';
    btn.disabled = false;

    if (error) {
      alert('Error al guardar el producto.');
      return;
    }

    closeProductModal();
    await loadProducts();
  }

  async function deleteProduct(id) {
    if (!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;
    const { error } = await sb.from('products').delete().eq('id', id);
    if (!error) {
      await loadProducts();
    } else {
      alert('Error al eliminar el producto.');
    }
  }

  // ─── Order Detail Modal ───────────────────────────────────

  function setupOrderModal() {
    document.getElementById('orderModalClose').addEventListener('click', () => {
      document.getElementById('orderModalOverlay').style.display = 'none';
    });
    document.getElementById('orderModalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget)
        document.getElementById('orderModalOverlay').style.display = 'none';
    });
  }

  function showOrderDetail(order) {
    const items = order.items || [];
    const date  = new Date(order.created_at).toLocaleString('es-AR');

    document.getElementById('orderDetail').innerHTML = `
      <div class="order-detail-grid">
        <div class="order-detail-section">
          <h3>Comprador</h3>
          <p>
            <strong>${escHtml(order.buyer_name)}</strong><br>
            ${escHtml(order.buyer_email)}<br>
            ${order.buyer_phone ? escHtml(order.buyer_phone) + '<br>' : ''}
            ${order.buyer_address ? escHtml(order.buyer_address) : '—'}
          </p>
        </div>
        <div class="order-detail-section">
          <h3>Info del pedido</h3>
          <p>
            <strong>ID:</strong> ${order.id.slice(0,8).toUpperCase()}<br>
            <strong>Fecha:</strong> ${date}<br>
            <strong>Estado:</strong> ${capitalize(order.status)}<br>
            ${order.mp_payment_id ? `<strong>Pago MP:</strong> ${order.mp_payment_id}` : ''}
          </p>
        </div>
      </div>
      <div class="order-items-list">
        ${items.map(item => `
          <div class="order-item-row">
            <span>${escHtml(item.name)} · Talle ${item.size} × ${item.qty}</span>
            <span>${formatPrice(item.price * item.qty)}</span>
          </div>
        `).join('')}
        <div class="order-total-row">
          <span>Total</span>
          <span>${formatPrice(order.subtotal)}</span>
        </div>
      </div>
      <div class="order-status-form">
        <label>Cambiar estado:</label>
        <select class="status-select" id="detailStatusSelect">
          ${STATUSES.map(s => `<option value="${s}" ${s === order.status ? 'selected' : ''}>${capitalize(s)}</option>`).join('')}
        </select>
        <button class="btn btn--accent" id="detailStatusSave">GUARDAR</button>
      </div>
    `;

    document.getElementById('detailStatusSave').addEventListener('click', async () => {
      const newStatus = document.getElementById('detailStatusSelect').value;
      const { error } = await sb.from('orders').update({ status: newStatus }).eq('id', order.id);
      if (!error) {
        order.status = newStatus;
        const tableSelect = document.querySelector(`.status-select[data-order="${order.id}"]`);
        if (tableSelect) tableSelect.value = newStatus;
        allOrders.find(o => o.id === order.id).status = newStatus;
        updatePendingBadge();
        document.getElementById('orderModalOverlay').style.display = 'none';
      } else {
        alert('Error al actualizar el estado.');
      }
    });

    document.getElementById('orderModalOverlay').style.display = 'flex';
  }

  // ─── Helpers ─────────────────────────────────────────────

  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  init();

})();
