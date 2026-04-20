'use strict';

(function initTienda() {

  // ─── State ───────────────────────────────────────────────
  let products = [];
  let cart = JSON.parse(localStorage.getItem('signatus_cart') || '[]');
  const flippedCards = new Set();
  const cardImageIndex = new Map();

  function getImages(p) {
    if (Array.isArray(p.images) && p.images.length) return p.images;
    if (p.image_url) return [p.image_url];
    return [];
  }

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

    const images = getImages(p);
    const hasImages = images.length > 0;
    const has3D = !!p.model_url;
    const multiple  = images.length > 1;

    let mediaHTML;
    if (has3D) {
      mediaHTML = `
        <div class="product-card__image has-3d" id="img-${p.id}">
          <div class="product-3d-viewer" id="viewer-${p.id}" data-model="${escHtml(p.model_url)}"></div>
          <div class="viewer-loading" id="viewer-loading-${p.id}">
            <div class="spinner"></div>
          </div>
          <div class="spin-hint spin-hint--3d">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 4 21 12 13 12"/></svg>
            <span>Arrastrá para girar · Scroll para zoom</span>
          </div>
        </div>
      `;
    } else {
      const slides = hasImages
        ? images.map((src, i) => `
            <div class="product-image-3d__slide${i === 0 ? ' is-active' : ''}" data-slide="${i}">
              <img src="${src}" alt="${escHtml(p.name)}" draggable="false">
            </div>
          `).join('')
        : `<div class="product-image-3d__slide is-active">
             <div class="product-card__placeholder">
               <img src="Imagenes/emotesignatus.png" alt="" class="placeholder-wolf">
             </div>
           </div>`;

      const spinUI = multiple ? `
        <div class="spin-hint" data-spin-hint="${p.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><polyline points="21 4 21 12 13 12"/></svg>
          <span>Arrastrá para girar</span>
        </div>
        <div class="spin-progress" id="spin-progress-${p.id}">
          ${images.map((_, i) => `<span class="spin-progress__tick${i === 0 ? ' is-active' : ''}" data-tick="${i}"></span>`).join('')}
        </div>
      ` : '';

      mediaHTML = `
        <div class="product-card__image${multiple ? ' is-spinnable' : ''}" id="img-${p.id}" data-frames="${images.length}">
          <div class="product-image-3d" id="img3d-${p.id}">
            <div class="product-image-3d__inner" id="img3dinner-${p.id}">
              ${slides}
            </div>
          </div>
          ${spinUI}
        </div>
      `;
    }

    return `
      <div class="product-scene" id="scene-${p.id}">
        <div class="product-card" id="card-${p.id}">

          <div class="product-card__face product-card__front">
            ${mediaHTML}
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

    // ── 3D model viewer (if product has model_url) ──
    const viewerEl = document.getElementById(`viewer-${id}`);
    if (viewerEl && viewerEl.dataset.model) {
      initViewer3D(viewerEl, id);
    }

    // 360° drag-to-rotate on the product image
    const imgBox = document.getElementById(`img-${id}`);
    const frames = parseInt(imgBox?.dataset.frames || '0');
    cardImageIndex.set(id, 0);

    if (imgBox && frames > 1) {
      let dragging = false;
      let startX = 0;
      let startIdx = 0;

      const beginDrag = (clientX) => {
        dragging = true;
        startX = clientX;
        startIdx = cardImageIndex.get(id) || 0;
        imgBox.classList.add('is-spinning');
        imgBox.classList.add('has-interacted');
      };

      const moveDrag = (clientX) => {
        if (!dragging) return;
        const delta = clientX - startX;
        const sensitivity = Math.max(20, imgBox.clientWidth / (frames * 1.3));
        const offset = Math.round(delta / sensitivity);
        let next = (startIdx + offset) % frames;
        if (next < 0) next += frames;
        gotoSlide(id, next);
      };

      const endDrag = () => {
        dragging = false;
        imgBox.classList.remove('is-spinning');
      };

      imgBox.addEventListener('mousedown', (e) => {
        if (flippedCards.has(id)) return;
        e.preventDefault();
        beginDrag(e.clientX);
      });
      window.addEventListener('mousemove', (e) => moveDrag(e.clientX));
      window.addEventListener('mouseup', endDrag);

      imgBox.addEventListener('touchstart', (e) => {
        if (flippedCards.has(id)) return;
        beginDrag(e.touches[0].clientX);
      }, { passive: true });
      imgBox.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        e.preventDefault();
        moveDrag(e.touches[0].clientX);
      }, { passive: false });
      imgBox.addEventListener('touchend', endDrag);
      imgBox.addEventListener('touchcancel', endDrag);
    }

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
    } else {
      flippedCards.add(id);
      card.classList.add('is-flipped');
    }
  }

  function initViewer3D(el, id) {
    const modelUrl = el.dataset.model;
    const loadingEl = document.getElementById(`viewer-loading-${id}`);

    const hideLoader = (errMsg) => {
      if (loadingEl) {
        if (errMsg) {
          loadingEl.innerHTML = `<div class="viewer-error">⚠ No se pudo cargar el modelo 3D<br><small>${errMsg}</small></div>`;
          loadingEl.style.pointerEvents = 'auto';
        } else {
          loadingEl.style.display = 'none';
        }
      }
    };

    const tryInit = (attempt = 0) => {
      if (window.Product3DViewer) {
        window.Product3DViewer.init(el, modelUrl);
        const obs = new MutationObserver(() => {
          if (el.classList.contains('is-3d-loaded')) {
            hideLoader();
            obs.disconnect();
          } else if (el.classList.contains('is-3d-error')) {
            hideLoader('Revisá la consola del navegador');
            obs.disconnect();
          }
        });
        obs.observe(el, { attributes: true, attributeFilter: ['class'] });
        setTimeout(() => {
          if (!el.classList.contains('is-3d-loaded') && !el.classList.contains('is-3d-error')) {
            hideLoader('Timeout — el modelo tardó demasiado');
            obs.disconnect();
          }
        }, 30000);
      } else if (attempt < 50) {
        setTimeout(() => tryInit(attempt + 1), 100);
      } else {
        hideLoader('Three.js no cargó. ¿Tenés internet?');
      }
    };
    tryInit();
  }

  function gotoSlide(id, idx) {
    const slides = document.querySelectorAll(`#img3dinner-${id} .product-image-3d__slide`);
    const ticks  = document.querySelectorAll(`#spin-progress-${id} .spin-progress__tick`);
    slides.forEach((s, i) => s.classList.toggle('is-active', i === idx));
    ticks.forEach((t, i)  => t.classList.toggle('is-active', i === idx));
    cardImageIndex.set(id, idx);
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
