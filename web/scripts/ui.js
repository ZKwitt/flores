// scripts/ui.js
import {
  getSheets, getProductsFor, getAllProducts,
  updateStockOnServer_decrement, updateStockOnServer_increaseViaSet
} from './api.js';

const tabsRow = document.getElementById('tabsRow');
const productsGrid = document.getElementById('productsGrid');
const cartIconBtn = document.getElementById('cart-icon-btn');
const cartPopupOverlay = document.getElementById('cart-popup-overlay');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalEl = document.getElementById('cart-total');
const cartCloseBtn = document.getElementById('cart-close');
const cartConfirmBtn = document.getElementById('cart-confirm');

let lastProductsCache = [];
let cart = JSON.parse(localStorage.getItem('shop_cart_v1') || '[]');
let lastLoadedSheetKey = null;
const WHATSAPP_NUMBER = '573207378992';

function saveCart(){ localStorage.setItem('shop_cart_v1', JSON.stringify(cart)); }
function parsePriceNumber(v){
  if (v===undefined || v===null) return 0;
  const s = String(v).replace(/\s+/g,'').replace(/\./g,'').replace(/,/g,'.').replace(/[^0-9.\-]/g,'');
  const n = Number(s); return isNaN(n)?0:n;
}
function fmtPrice(v){ return Number(parsePriceNumber(v)).toLocaleString('de-DE'); }
function escapeHtml(s){ if(s===undefined||s===null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function getReservedQty(sheetKey,row){
  return cart.filter(i=> (i.sheetKey||'').toString().trim().toLowerCase() === (sheetKey||'').toString().trim().toLowerCase() && String(i.row) === String(row)).reduce((s,i)=>s+Number(i.qty||0),0);
}

function getOriginalStockFromCache(sheetKey,row){
  const p = lastProductsCache.find(pp => String(pp.row) === String(row) && (pp.sheetKey||'').toString().trim().toLowerCase() === (sheetKey||'').toString().trim().toLowerCase());
  if(p){
    const d = p.data||{};
    const v = d.Stock || d.stock || d.cantidad || 0;
    return Number(v||0);
  }
  return 0;
}

function refreshCardStockDisplay(sheetKey, row){
  const cards = Array.from(document.querySelectorAll('.product-card')).filter(c => (c.dataset.sheetKey||'').toString().trim().toLowerCase() === (sheetKey||'').toString().trim().toLowerCase() && (c.dataset.row||'') === String(row));
  const orig = getOriginalStockFromCache(sheetKey,row);
  const reserved = getReservedQty(sheetKey,row);
  const avail = Math.max(0, orig - reserved);
  cards.forEach(card=>{
    const sp = card.querySelector('.stockval'); if(sp) sp.innerText = avail;
    const btn = card.querySelector('.product-btn'); if(btn) btn.disabled = avail <= 0;
    card.style.opacity = avail<=0 ? '0.45' : '';
  });
}

export function initUI(openCardPaymentModal){
  cartIconBtn.addEventListener('click', openCartPopup);
  cartCloseBtn.addEventListener('click', closeCartPopup);
  cartConfirmBtn.addEventListener('click', sendToWhatsApp);
  // add payment button handler will be injected by ensureCartActions which uses openCardPaymentModal
  loadCategories();
  updateCartUI();
  document.getElementById('searchInput')?.addEventListener('keypress', (e)=>{ if(e.key==='Enter') searchProducts(); });
}

function updateCartUI(){
  const count = cart.reduce((s,i)=>s+Number(i.qty||0),0);
  cartIconBtn.innerText = `Carrito (${count})`;
  saveCart();
}

/* add to cart */
export async function addToCartFromCard(card, qty){
  const sheetKey = card.dataset.sheetKey || lastLoadedSheetKey || 'UNKNOWN';
  const row = card.dataset.row;
  const name = card.querySelector('.product-title')?.innerText || 'Sin nombre';
  const price = card.dataset.price ?? card.querySelector('.product-price')?.innerText || '0';
  const origStock = getOriginalStockFromCache(sheetKey,row);
  const reserved = getReservedQty(sheetKey,row);
  const available = Math.max(0, origStock - reserved);
  if(qty > available){ alert('No hay suficiente stock disponible.'); return; }

  const key = `${sheetKey}::${row}`;
  const existing = cart.find(i => `${i.sheetKey}::${i.row}` === key);
  if(existing) existing.qty = Math.min(origStock, existing.qty + qty);
  else cart.push({ sheetKey, row, name, price, _priceNum: parsePriceNumber(price), qty });

  refreshCardStockDisplay(sheetKey,row);
  updateCartUI();
  // decrement on server async
  updateStockOnServer_decrement(sheetKey, row, qty).catch(e=>console.warn(e));
  cartIconBtn.style.transform = 'scale(1.12)';
  setTimeout(()=> cartIconBtn.style.transform = '', 200);
}

/* remove from cart (index) */
export function removeFromCart(idx){
  if(idx<0||idx>=cart.length) return;
  const it = cart[idx];
  const removedQty = Number(it.qty||0);
  cart.splice(idx,1);
  updateCartUI();
  refreshAllCardDisplays();
  openCartPopup(); // re-open so user sees the updated list
  updateStockOnServer_increaseViaSet(it.sheetKey, it.row, removedQty).catch(e=>console.warn(e));
}

/* open/close cart */
function openCartPopup(){
  if(cart.length === 0){
    cartItemsContainer.innerHTML = '<p style="text-align:center;color:#999">Carrito vacío</p>';
    cartTotalEl.innerHTML = '';
    ensureCartActions(); // creates pay button etc
    cartPopupOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    return;
  }
  let html = '';
  cart.forEach((item, idx) => {
    const itemTotal = parsePriceNumber(item._priceNum !== undefined ? item._priceNum : item.price) * Number(item.qty||0);
    html += `<div class="cart-item" style="display:flex;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #111">
      <div style="flex:1"><div style="font-weight:800">${escapeHtml(item.name)}</div><div style="font-size:0.9rem;color:#aaa">x${item.qty} — ${Number(itemTotal).toLocaleString('de-DE')}</div></div>
      <div><button style="background:transparent;border:none;color:#f66" onclick="window.__UI.removeFromCart(${idx})">✕</button></div>
    </div>`;
  });
  cartItemsContainer.innerHTML = html;
  const total = cart.reduce((s,i)=> s + (parsePriceNumber(i._priceNum !== undefined ? i._priceNum : i.price) * Number(i.qty||0)), 0);
  cartTotalEl.innerHTML = `💰 Total: <span style="color:#9D4EDD">${Number(total).toLocaleString('de-DE')}</span>`;
  ensureCartActions();
  cartPopupOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeCartPopup(){ cartPopupOverlay.style.display = 'none'; document.body.style.overflow = ''; }

function sendToWhatsApp(){
  if(cart.length === 0){ alert('El carrito está vacío'); return; }
  let message = '*Nuevo Pedido - KukoroShop*\\n\\n';
  let total = 0;
  cart.forEach(item => {
    const itemTotal = parsePriceNumber(item._priceNum !== undefined ? item._priceNum : item.price) * Number(item.qty||0);
    total += itemTotal;
    message += `*${item.name}*\\n   Cantidad: ${item.qty}\\n   Precio: ${Number(itemTotal).toLocaleString('de-DE')}\\n\\n`;
  });
  message += `*TOTAL: ${Number(total).toLocaleString('de-DE')}*\\n\\n`;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  cart = []; updateCartUI(); refreshAllCardDisplays(); closeCartPopup();
}

/* ensureCartActions: create or reuse whatsapp and pay buttons */
let _openCardPaymentModalFn = null;
export function setOpenCardPaymentModal(fn){ _openCardPaymentModalFn = fn; }
function ensureCartActions(){
  const popupInner = cartPopupOverlay.querySelector('.cart-popup');
  if(!popupInner) return;
  let row = popupInner.querySelector('.cart-actions-row');
  if(!row){
    row = document.createElement('div');
    row.className = 'cart-actions-row';
    row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:12px;padding-top:8px;border-top:1px solid #111';
    popupInner.appendChild(row);
  }

  // move existing #cart-confirm into row if present (avoid duplicates)
  const existingConfirm = document.getElementById('cart-confirm');
  if(existingConfirm && existingConfirm.parentElement !== row) row.appendChild(existingConfirm);

  // create pay button only if not exists
  if(!row.querySelector('#cart-paycard')){
    const payBtn = document.createElement('button');
    payBtn.id = 'cart-paycard';
    payBtn.innerText = 'Pagar con tarjeta';
    payBtn.style.cssText = 'padding:8px;border-radius:8px;background:#3b82f6;color:#fff;border:none';
    payBtn.onclick = ()=> {
      if(typeof _openCardPaymentModalFn === 'function') _openCardPaymentModalFn();
      else console.warn('open card payment not defined yet');
    };
    row.appendChild(payBtn);
  }
}

/* Products rendering */
function makeImgEl(raw, alt, className){
  const img = document.createElement('img');
  img.alt = alt||'';
  img.className = className||'';
  img.loading = 'lazy';
  img.src = raw? (/* proxy optional */ raw) : '';
  img.style.maxHeight='380px'; img.style.objectFit='contain';
  img.onerror = ()=>img.remove();
  return img;
}

export async function loadCategories(){
  try{
    const data = await getSheets();
    const sheets = data.sheets || [];
    renderTabs(sheets);
  }catch(e){ tabsRow.innerHTML = '<div style="color:#f88">Error cargando categorías</div>'; console.error(e); }
}
function renderTabs(sheets){
  tabsRow.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'tab active'; allBtn.innerText = '✨ Todos';
  allBtn.onclick = ()=>{ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); allBtn.classList.add('active'); loadProductsAll(); };
  tabsRow.appendChild(allBtn);
  sheets.forEach(s=>{
    const btn = document.createElement('button'); btn.className='tab'; btn.innerText = s.key; btn.onclick = ()=>{ document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active')); btn.classList.add('active'); loadProductsFor(s.key); };
    tabsRow.appendChild(btn);
  });
  loadProductsAll();
}

export async function loadProductsFor(sheetKey){
  lastLoadedSheetKey = sheetKey;
  productsGrid.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">Cargando productos...</div>';
  try{
    const data = await getProductsFor(sheetKey);
    const products = (data.products||[]).map(p=> { if(!p.sheetKey) p.sheetKey = sheetKey; return p; });
    lastProductsCache = products.map(p=> ({ row:p.row, sheetKey:p.sheetKey, data:p.data||{} }));
    renderProducts(products, sheetKey);
  }catch(e){ productsGrid.innerHTML = '<div style="text-align:center;color:#f88">Error cargando productos</div>'; console.error(e); }
}

export async function loadProductsAll(){
  lastLoadedSheetKey = 'ALL';
  productsGrid.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa">Cargando todos los productos...</div>';
  try{
    const data = await getAllProducts();
    let products = data.products || [];
    products.forEach(p => p.data = p.data || {});
    lastProductsCache = products.map(p=> ({ row:p.row, sheetKey:p.sheetKey||p.data.Categoria||'UNKNOWN', data:p.data }));
    renderProducts(products, 'ALL');
  }catch(e){ productsGrid.innerHTML = '<div style="text-align:center;color:#f88">Error cargando productos</div>'; console.error(e); }
}

function renderProducts(products, sheetKey){
  if(!products || products.length===0){ productsGrid.innerHTML = '<div style="text-align:center;color:#aaa;padding:40px">No hay productos</div>'; return; }
  productsGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  products.forEach(p=>{
    const d = p.data||{};
    const name = d.Nombre || d.nombre || 'Sin nombre';
    const price = d.Precio || d.price || '';
    const stock = Number(d.Stock || d.stock || d.cantidad || 0);
    const imgUrl = d.Img || d.img || d.imagen || '';
    const card = document.createElement('div'); card.className='product-card'; card.dataset.origStock = String(stock); card.dataset.price = price; card.dataset.row = String(p.row); card.dataset.sheetKey = p.sheetKey || sheetKey;
    card.innerHTML = `<div style="min-height:380px;display:flex;align-items:center;justify-content:center;background:#0f0f0f"><div style="width:90%;text-align:center;padding:16px"><div class="prod-img-placeholder" style="width:100%;height:300px;display:flex;align-items:center;justify-content:center;color:#888">🖼️</div></div></div>
    <div class="product-info"><div class="product-title">${escapeHtml(name)}</div><div><span class="product-price">${price?('$ '+fmtPrice(price)):'-'}</span></div><div style="margin-top:8px">Stock: <span class="stockval">${Math.max(0,stock - getReservedQty(p.sheetKey||sheetKey,p.row))}</span></div>
    <div style="margin-top:10px;color:#bbb;font-size:0.95rem;max-height:60px;overflow:hidden">${escapeHtml(d.descripcion||'Sin descripción')}</div>
    <div class="product-actions" style="margin-top:12px"><button class="qty-btn minus">−</button><div class="qty-display">1</div><button class="qty-btn plus">+</button><button class="product-btn">Agregar</button></div></div>`;
    // attach image
    const placeholder = card.querySelector('.prod-img-placeholder');
    if(imgUrl && /^https?:\/\//i.test(imgUrl)){
      const imgEl = makeImgEl(imgUrl, name, 'product-image');
      const wrap = document.createElement('div'); wrap.style.width='100%'; wrap.style.height='380px'; wrap.style.display='flex'; wrap.style.alignItems='center'; wrap.style.justifyContent='center'; wrap.style.background='#0f0f0f';
      wrap.appendChild(imgEl); card.firstElementChild.replaceWith(wrap);
      imgEl.addEventListener('click', ()=> { window.open(imgUrl, '_blank'); });
    }
    frag.appendChild(card);
  });
  productsGrid.appendChild(frag);

  if(!productsGrid._hasDelegation){
    productsGrid.addEventListener('click', function(e){
      const plus = e.target.closest('.plus');
      if(plus){ const card = plus.closest('.product-card'); const qty = card.querySelector('.qty-display'); const curr = Number(qty.innerText||'1'); const orig = Number(card.dataset.origStock||0); if(curr < Math.max(0, orig - getReservedQty(card.dataset.sheetKey, card.dataset.row))) qty.innerText = curr+1; return; }
      const minus = e.target.closest('.minus');
      if(minus){ const card = minus.closest('.product-card'); const qty = card.querySelector('.qty-display'); const curr = Number(qty.innerText||'1'); if(curr>1) qty.innerText = curr-1; return; }
      const orderBtn = e.target.closest('.product-btn');
      if(orderBtn){ const card = orderBtn.closest('.product-card'); const q = Number(card.querySelector('.qty-display').innerText||'1'); addToCartFromCard(card, q); return; }
    });
    productsGrid._hasDelegation = true;
  }
}

export function refreshAllCardDisplays(){
  document.querySelectorAll('.product-card').forEach(card=> refreshCardStockDisplay(card.dataset.sheetKey, card.dataset.row));
}

/* small helpers exposed for payment & global access */
export function getCart(){ return cart; }
export function clearCart(){ cart = []; saveCart(); updateCartUI(); refreshAllCardDisplays(); }
export function removeAllCartItemsAndRestoreStock(){ // utility if payment fails and need restore
  // restore the quantities
  const items = [...cart];
  cart = []; saveCart(); updateCartUI(); refreshAllCardDisplays();
  items.forEach(it => updateStockOnServer_increaseViaSet(it.sheetKey, it.row, Number(it.qty||0)).catch(e=>console.warn(e)));
}

/* expose important functions to window for onclick handlers inside HTML snippets */
window.__UI = { removeFromCart };

/* expose setOpenCardPaymentModal so main can pass payment open function */
export function setOpenCardPaymentModal(fn){ _openCardPaymentModalFn = fn; }
