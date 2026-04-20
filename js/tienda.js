'use strict';

(function initTienda() {

  // ─── State ───────────────────────────────────────────────
  let products = [];
  let cart = JSON.parse(localStorage.getItem('signatus_cart') || '[]');
  const flippedCards = new Set();

  // ─── Init ────────────────────────────────────────────────
  async function init() {
    setupCart();
    setupCheckout();
    await loadProducts();
  }

  // ─── Products ────────────────────────────────────────────

  async function loadProducts() {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    document.getElementById('productsLoading').style.display = 'none';

    if (error || !data) {
      document.getElementById('productsGrid').innerHTML =
        '<p class="products-empty">Error al cargar productos. Intentá de nuevo más tarde.</p>';
      return;
    }

    products = data;

    if (!products.length) {
      document.getElementById('productsGrid').innerHTML =
        '<p class="products-empty">No hay productos disponibles aún. ¡Pronto habrá novedades!</p>';
      return;
    }

    renderProducts(products);
  }

  function renderProducts(list) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = list.map(productCardHTML).join('');
    list.forEach(p => initCard(p.id));
    updateCartUI();
  }

  function productCardHTML(p) {
    const stock = p.stock || {};
    const sizeButtons = Object.entries(stock).map(([size, qty]) => `
      <button class="size-btn" data-size="${size}" ${qty === 0 ? 'disabled' : ''}>
        ${size}
      </button>
    `).join('');

    const imgFront = p.image_url
      ? `<img src="${p.image_url}" alt="${escHtml(p.name)}">`
      : `<div class="product-card__placeholder">
           <img src="Imagenes/emotesignatus.png" alt="" class="placeholder-wolf">
         </div>`;

    return `
      <div class="product-scene" id="scene-${p.id}">
        <div class="product-card" id="card-${p.id}">

          <div class="product-card__face product-card__front">
            <div class="product-card__image">${imgFront}</div>
            <div class="product-card__info">
              <h3 class="product-card__name">${escHtml(p.name)}</h3>
              <p class="product-card__price">${formatPrice(p.price)}</p>
              <button class="product-card__flip-btn" data-flip="${p.id}">
                VER TALLES →
              </button>
            </div>
          </div>

          <div class="product-card__face product-card__back">
            <div class="product-card__back-content">
              <div>
                <h3>${escHtml(p.name)}</h3>
                <p class="product-card__price">${formatPrice(p.price)}</p>
                ${p.description ? `<p class="product-card__desc">${escHtml(p.description)}</p>` : ''}
              </div>
              <div>
                <p class="product-card__size-label">Talle</p>
                <div class="size-selector" id="sizes-${p.id}">${sizeButtons}</div>
              </div>
              <div class="qty-selector">
                <button class="qty-btn" data-action="dec" data-card="${p.id}">−</button>
                <span class="qty-value" id="qty-${p.id}">1</span>
                <button class="qty-btn" data-action="inc" data-card="${p.id}">+</button>
              </div>
              <button class="btn btn--accent" data-add="${p.id}">
                AGREGAR AL CARRITO
              </button>
              <button class="product-card__back-btn" data-flip="${p.id}">← VOLVER</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // ─── Card 3D tilt & flip ─────────────────────────────────

  function initCard(id) {
    const scene = document.getElementById(`scene-${id}`);
    const card  = document.getElementById(`card-${id}`);
    if (!scene || !card) return;

    // Tilt on mousemove (only when not flipped)
    scene.addEventListener('mousemove', (e) => {
      if (flippedCards.has(id)) return;
      const rect = scene.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 22;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 22;
      card.classList.add('is-tilt-active');
      card.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    });

    scene.addEventListener('mouseleave', () => {
      if (flippedCards.has(id)) return;
      card.classList.remove('is-tilt-active');
      card.style.transform = '';
    });

    // Flip buttons
    scene.querySelectorAll(`[data-flip="${id}"]`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFlip(id, card);
      });
    });

    // Size selection
    const sizeContainer = document.getElementById(`sizes-${id}`);
    if (sizeContainer) {
      sizeContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.size-btn');
        if (!btn || btn.disabled) return;
        sizeContainer.querySelectorAll('.size-btn').forEach(b => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
      });
    }

    // Qty buttons
    scene.querySelectorAll(`.qty-btn[data-card="${id}"]`).forEach(btn => {
      btn.addEventListener('click', () => {
        const qtyEl = document.getElementById(`qty-${id}`);
        let qty = parseInt(qtyEl.textContent);
        if (btn.dataset.action === 'inc') qty = Math.min(qty + 1, 10);
        if (btn.dataset.action === 'dec') qty = Math.max(qty - 1, 1);
        qtyEl.textContent = qty;
      });
    });

    // Add to cart
    scene.querySelector(`[data-add="${id}"]`)?.addEventListener('click', () => {
      const sizeBtn = document.querySelector(`#sizes-${id} .size-btn.is-selected`);
      if (!sizeBtn) {
        shakeEl(document.getElementById(`sizes-${id}`));
        return;
      }
      const product = products.find(p => p.id === id);
      const qty = parseInt(document.getElementById(`qty-${id}`).textContent);
      addToCart(product, sizeBtn.dataset.size, qty);
      toggleFlip(id, card); // flip back after adding
    });
  }

  function toggleFlip(id, card) {
    if (flippedCards.has(id)) {
      flippedCards.delete(id);
      card.classList.remove('is-flipped');
      card.style.transform = '';
    } else {
      flippedCards.add(id);
      card.style.transform = '';
      card.classList.add('is-flipped');
    }
  }

  // ─── Cart ────────────────────────────────────────────────

  function addToCart(product, size, qty) {
    const existing = cart.find(i => i.id === product.id && i.size === size);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, 10);
    } else {
      cart.push({
        id:        product.id,
        name:      product.name,
        price:     product.price,
        size,
        qty,
        image_url: product.image_url || ''
      });
    }
    saveCart();
    updateCartUI();
    openCart();
  }

  function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
  }

  function saveCart() {
    localStorage.setItem('signatus_cart', JSON.stringify(cart));
  }

  function cartTotal() {
    return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function updateCartUI() {
    const badge    = document.getElementById('cartBadge');
    const itemsEl  = document.getElementById('cartItems');
    const footerEl = document.getElementById('cartFooter');
    const emptyEl  = document.getElementById('cartEmpty');
    const totalEl  = document.getElementById('cartTotal');

    const count = cart.reduce((s, i) => s + i.qty, 0);

    if (count > 0) {
      badge.style.display = 'flex';
      badge.textContent = count;
    } else {
      badge.style.display = 'none';
    }

    if (!cart.length) {
      emptyEl.style.display = 'block';
      footerEl.style.display = 'none';
      itemsEl.innerHTML = '';
      itemsEl.appendChild(emptyEl);
      return;
    }

    emptyEl.style.display = 'none';
    footerEl.style.display = 'flex';
    totalEl.textContent = formatPrice(cartTotal());

    itemsEl.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <div class="cart-item__img">
          ${item.image_url
            ? `<img src="${item.image_url}" alt="${escHtml(item.name)}">`
            : `<div class="cart-item__img-placeholder">
                 <img src="Imagenes/emotesignatus.png" alt="">
               </div>`
          }
        </div>
        <div class="cart-item__info">
          <p class="cart-item__name">${escHtml(item.name)}</p>
          <p class="cart-item__meta">Talle ${item.size} · Cant. ${item.qty}</p>
          <button class="cart-item__remove" data-remove="${i}">Eliminar</button>
        </div>
        <span class="cart-item__price">${formatPrice(item.price * item.qty)}</span>
      </div>
    `).join('');

    itemsEl.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(parseInt(btn.dataset.remove)));
    });
  }

  // ─── Cart sidebar ────────────────────────────────────────

  function setupCart() {
    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('cartClose').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', closeCart);
    updateCartUI();
  }

  function openCart() {
    document.getElementById('cartSidebar').classList.add('is-open');
    document.getElementById('cartOverlay').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    document.getElementById('cartSidebar').classList.remove('is-open');
    document.getElementById('cartOverlay').classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // ─── Checkout ────────────────────────────────────────────

  function setupCheckout() {
    document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
    document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
    document.getElementById('checkoutOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeCheckout();
    });
    document.getElementById('successClose').addEventListener('click', () => {
      closeCheckout();
      cart = [];
      saveCart();
      updateCartUI();
      closeCart();
    });
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
  }

  function openCheckout() {
    if (!cart.length) return;
    closeCart();

    const summary = document.getElementById('checkoutSummary');
    summary.innerHTML = cart.map(item => `
      <div class="checkout-summary-item">
        <span>${escHtml(item.name)} (${item.size}) × ${item.qty}</span>
        <span>${formatPrice(item.price * item.qty)}</span>
      </div>
    `).join('') + `
      <div class="checkout-summary-total">
        <span>TOTAL</span>
        <span>${formatPrice(cartTotal())}</span>
      </div>
    `;

    document.getElementById('checkoutFormWrap').style.display = 'block';
    document.getElementById('checkoutSuccess').style.display  = 'none';
    document.getElementById('checkoutOverlay').style.display  = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeCheckout() {
    document.getElementById('checkoutOverlay').style.display = 'none';
    document.body.style.overflow = '';
  }

  async function handleCheckout(e) {
    e.preventDefault();
    const form = e.target;
    const btn  = form.querySelector('[type="submit"]');

    const buyer_name  = form.buyer_name.value.trim();
    const buyer_email = form.buyer_email.value.trim();

    if (!buyer_name || !buyer_email) {
      if (!buyer_name)  form.buyer_name.classList.add('is-error');
      if (!buyer_email) form.buyer_email.classList.add('is-error');
      return;
    }

    btn.textContent = 'ENVIANDO...';
    btn.disabled = true;

    const { error } = await sb.from('orders').insert({
      items:         cart,
      subtotal:      cartTotal(),
      buyer_name,
      buyer_email,
      buyer_phone:   form.buyer_phone.value.trim(),
      buyer_address: form.buyer_address.value.trim(),
      status:        'pendiente'
    });

    btn.textContent = 'CONFIRMAR PEDIDO →';
    btn.disabled = false;

    if (error) {
      alert('Hubo un error al procesar tu pedido. Por favor intentá de nuevo.');
      return;
    }

    document.getElementById('checkoutFormWrap').style.display = 'none';
    document.getElementById('checkoutSuccess').style.display  = 'flex';
  }

  // ─── Helpers ─────────────────────────────────────────────

  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  function shakeEl(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
  }

  // Shake keyframe
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      25%{transform:translateX(-6px)}
      75%{transform:translateX(6px)}
    }
  `;
  document.head.appendChild(style);

  init();

})();
