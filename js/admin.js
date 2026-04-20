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

  let _dashboardReady = false;

  function showDashboard() {
    document.getElementById('loginScreen').style.display  = 'none';
    document.getElementById('adminLayout').style.display  = 'flex';
    loadOrders();
    loadProducts();

    if (_dashboardReady) return;
    _dashboardReady = true;

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

  // Cada item: { url: string|null, file: File|null, preview: string }
  let _productImages = [];
  let _dragFromIndex = null;
  // Modelo 3D: { url: string|null, file: File|null, name: string }
  let _productModel = { url: null, file: null, name: '' };

  function setupProductModal() {
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal(null));
    document.getElementById('productModalClose').addEventListener('click', closeProductModal);
    document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
    document.getElementById('productModalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeProductModal();
    });
    document.getElementById('productForm').addEventListener('submit', handleSaveProduct);

    document.getElementById('productImageFile').addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          _productImages.push({ url: null, file, preview: ev.target.result });
          renderImageGallery();
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    });

    document.getElementById('btnUploadModel').addEventListener('click', () => {
      document.getElementById('productModelFile').click();
    });

    document.getElementById('productModelFile').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      _productModel = { url: null, file, name: file.name };
      renderModelInfo();
      e.target.value = '';
    });

    document.getElementById('btnRemoveModel').addEventListener('click', () => {
      _productModel = { url: null, file: null, name: '' };
      renderModelInfo();
    });
  }

  function renderModelInfo() {
    const info   = document.getElementById('modelUploadInfo');
    const remove = document.getElementById('btnRemoveModel');
    const hasModel = !!(_productModel.url || _productModel.file);
    if (hasModel) {
      const label = _productModel.file
        ? `Nuevo: ${_productModel.name}`
        : `Modelo cargado`;
      info.innerHTML = `
        <span class="model-upload__badge">3D</span>
        <span class="model-upload__name">${label}</span>
      `;
      remove.style.display = 'inline-flex';
    } else {
      info.innerHTML = '<span class="model-upload__empty">Sin modelo 3D</span>';
      remove.style.display = 'none';
    }
  }

  function renderImageGallery() {
    const gallery = document.getElementById('imageGallery');
    const tiles = _productImages.map((img, i) => `
      <div class="image-tile" draggable="true" data-idx="${i}">
        <img src="${img.preview}" alt="" />
        ${i === 0 ? '<span class="image-tile__badge">Principal</span>' : ''}
        <button type="button" class="image-tile__remove" data-remove="${i}" title="Quitar">×</button>
      </div>
    `).join('');

    gallery.innerHTML = tiles + `
      <button type="button" class="image-add-tile" id="btnAddImage">
        <span class="image-add-tile__plus">+</span>
        <span class="image-add-tile__label">Agregar imagen</span>
      </button>
    `;

    document.getElementById('btnAddImage').addEventListener('click', () => {
      document.getElementById('productImageFile').click();
    });

    gallery.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.remove);
        _productImages.splice(idx, 1);
        renderImageGallery();
      });
    });

    gallery.querySelectorAll('.image-tile').forEach(tile => {
      tile.addEventListener('dragstart', (e) => {
        _dragFromIndex = parseInt(tile.dataset.idx);
        tile.classList.add('is-dragging');
      });
      tile.addEventListener('dragend', () => {
        tile.classList.remove('is-dragging');
        _dragFromIndex = null;
      });
      tile.addEventListener('dragover', (e) => {
        e.preventDefault();
        tile.classList.add('is-drag-over');
      });
      tile.addEventListener('dragleave', () => {
        tile.classList.remove('is-drag-over');
      });
      tile.addEventListener('drop', (e) => {
        e.preventDefault();
        tile.classList.remove('is-drag-over');
        const to = parseInt(tile.dataset.idx);
        if (_dragFromIndex === null || _dragFromIndex === to) return;
        const [moved] = _productImages.splice(_dragFromIndex, 1);
        _productImages.splice(to, 0, moved);
        renderImageGallery();
      });
    });
  }

  function openProductModal(product) {
    const isEdit = !!product;
    document.getElementById('productImageFile').value = '';

    const existing = [];
    if (Array.isArray(product?.images) && product.images.length) {
      product.images.forEach(url => existing.push({ url, file: null, preview: url }));
    } else if (product?.image_url) {
      existing.push({ url: product.image_url, file: null, preview: product.image_url });
    }
    _productImages = existing;
    renderImageGallery();

    _productModel = product?.model_url
      ? { url: product.model_url, file: null, name: 'Modelo existente' }
      : { url: null, file: null, name: '' };
    renderModelInfo();

    document.getElementById('productModalTitle').textContent = isEdit ? 'EDITAR PRODUCTO' : 'AGREGAR PRODUCTO';
    document.getElementById('productId').value    = product?.id    || '';
    document.getElementById('productName').value  = product?.name  || '';
    document.getElementById('productPrice').value = product?.price || '';
    document.getElementById('productDesc').value  = product?.description || '';
    document.getElementById('productActive').checked = product?.active ?? true;

    const stock = product?.stock || {};
    SIZES.forEach(s => {
      const el = document.getElementById(`stock-${s}`);
      if (el) el.value = stock[s] ?? 0;
    });

    document.getElementById('productModalOverlay').style.display = 'flex';
  }

  function closeProductModal() {
    _productImages = [];
    _productModel = { url: null, file: null, name: '' };
    document.getElementById('productImageFile').value = '';
    document.getElementById('productModelFile').value = '';
    document.getElementById('imageGallery').innerHTML = '';
    renderModelInfo();
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

    btn.textContent = 'GUARDANDO...';
    btn.disabled = true;

    const finalUrls = [];
    for (const img of _productImages) {
      if (img.url && !img.file) {
        finalUrls.push(img.url);
        continue;
      }
      const ext      = img.file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('product-images')
        .upload(fileName, img.file, { upsert: false });

      if (uploadError) {
        alert('Error al subir la imagen: ' + uploadError.message);
        btn.textContent = 'GUARDAR PRODUCTO';
        btn.disabled = false;
        return;
      }

      const { data: urlData } = sb.storage
        .from('product-images')
        .getPublicUrl(uploadData.path);
      finalUrls.push(urlData.publicUrl);
    }

    let modelUrl = _productModel.url || null;
    if (_productModel.file) {
      const ext      = _productModel.file.name.split('.').pop();
      const fileName = `models/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: uploadData, error: uploadError } = await sb.storage
        .from('product-images')
        .upload(fileName, _productModel.file, { upsert: false, contentType: 'model/gltf-binary' });

      if (uploadError) {
        alert('Error al subir el modelo 3D: ' + uploadError.message);
        btn.textContent = 'GUARDAR PRODUCTO';
        btn.disabled = false;
        return;
      }

      const { data: urlData } = sb.storage
        .from('product-images')
        .getPublicUrl(uploadData.path);
      modelUrl = urlData.publicUrl;
    }

    const payload = {
      name,
      price,
      description: document.getElementById('productDesc').value.trim(),
      image_url:   finalUrls[0] || null,
      images:      finalUrls,
      model_url:   modelUrl,
      active:      document.getElementById('productActive').checked,
      stock
    };

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
