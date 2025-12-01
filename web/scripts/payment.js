// scripts/payment.js
// módulo independiente: crea los modales y ofrece openCardPaymentModal / initPayment(getCart, clearCart)
let _getCart = null;
let _clearCart = null;

function ensureModals(){
  if(!document.getElementById('card-modal-overlay')){
    const div = document.createElement('div');
    div.id = 'card-modal-overlay';
    div.style = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);z-index:20000';
    div.innerHTML = `
      <div id="card-modal" style="background:#0b0b0b;padding:16px;border-radius:12px;width:520px;max-width:96%;color:#eee">
        <h3>Pagar con tarjeta (Simulación)</h3>
        <div id="card-errors" style="color:#f66;margin-bottom:8px"></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label>Nombre completo<input id="card-name" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff" /></label>
          <label>Correo<input id="card-email" type="email" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff" /></label>
          <label>Teléfono<input id="card-phone" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff" /></label>
          <label>Dirección<textarea id="card-address" rows="2" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff"></textarea></label>
          <hr style="border:none;border-top:1px solid #222" />
          <label>Número de tarjeta<input id="card-number" placeholder="4242 4242 4242 4242" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff" /></label>
          <div style="display:flex;gap:8px">
            <label style="flex:1">MM/AA<input id="card-exp" placeholder="08/28" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff" /></label>
            <label style="width:120px">CVV<input id="card-cvv" placeholder="123" style="width:100%;padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff" /></label>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="card-cancel" style="padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#ddd">Cancelar</button>
            <button id="card-submit" style="padding:8px;border-radius:6px;background:#9D4EDD;color:#fff">Pagar ahora</button>
          </div>
          <div style="font-size:0.85rem;color:#aaa">Simulación: <strong>no</strong> se envían datos a ningún proveedor. En producción integra Stripe/Adyen y nunca almacenes CVV.</div>
        </div>
      </div>`;
    document.body.appendChild(div);
  }
  if(!document.getElementById('otp-modal-overlay')){
    const o = document.createElement('div');
    o.id = 'otp-modal-overlay';
    o.style = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);z-index:21000';
    o.innerHTML = `<div style="background:#0b0b0b;padding:16px;border-radius:12px;width:360px;color:#eee">
      <h4>3D Secure — Código OTP</h4>
      <p style="color:#aaa">Ingresa el código (usa <strong>123456</strong> para simular éxito)</p>
      <input id="otp-input" placeholder="Código OTP" style="padding:8px;border-radius:6px;background:#111;border:1px solid #222;color:#fff;width:100%" />
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
        <button id="otp-cancel" style="padding:8px;border-radius:6px;background:transparent;border:1px solid #333;color:#ddd">Cancelar</button>
        <button id="otp-confirm" style="padding:8px;border-radius:6px;background:#9D4EDD;color:#fff">Confirmar</button>
      </div></div>`;
    document.body.appendChild(o);
  }
}

/* Luhn simple */
function luhnCheck(num){
  const s = String(num).replace(/\D/g,''); if(!s) return false;
  let sum=0, alt=false;
  for(let i=s.length-1;i>=0;i--){ let d=Number(s[i]); if(alt){ d*=2; if(d>9)d-=9;} sum+=d; alt=!alt; }
  return (sum%10)===0;
}

export function initPayment(getCart, clearCart){
  _getCart = getCart; _clearCart = clearCart;
  ensureModals();
  document.addEventListener('click', async (e)=>{
    if(e.target && e.target.id === 'card-submit'){
      const err = validateCardInputs();
      const errEl = document.getElementById('card-errors');
      if(err){ if(errEl) errEl.innerText = err; return; }
      // prepare pending and show OTP
      if(document.getElementById('otp-modal-overlay')) document.getElementById('otp-modal-overlay').style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    if(e.target && e.target.id === 'card-cancel'){ closeCardModal(); }
  });

  document.getElementById('otp-confirm')?.addEventListener('click', async ()=>{
    const code = (document.getElementById('otp-input')||{}).value||'';
    if(!code){ alert('Ingresa el código OTP'); return; }
    if(code !== '123456'){
      alert('OTP incorrecto. Restaurando stock y cancelando pago.');
      // restore stock using the items in getCart()
      const items = _getCart() || [];
      for(const it of items){ try{ await import('./api.js').then(m=>m.updateStockOnServer_increaseViaSet(it.sheetKey, it.row, Number(it.qty||0))); } catch(e){ console.warn(e); } }
      closeOtpModal(); closeCardModal();
      return;
    }
    // success simulated
    const token = 'tok_' + Date.now();
    alert('Pago simulado correcto. Token: ' + token);
    // clear cart in UI
    _clearCart();
    closeOtpModal(); closeCardModal();
  });
  document.getElementById('otp-cancel')?.addEventListener('click', ()=>{ closeOtpModal(); closeCardModal(); });
}

function validateCardInputs(){
  const name = document.getElementById('card-name')?.value.trim();
  const email = document.getElementById('card-email')?.value.trim();
  const phone = document.getElementById('card-phone')?.value.trim();
  const addr = document.getElementById('card-address')?.value.trim();
  const number = document.getElementById('card-number')?.value.replace(/\s+/g,'');
  const exp = document.getElementById('card-exp')?.value.trim();
  const cvv = document.getElementById('card-cvv')?.value.trim();
  if(!name || !email || !phone || !addr) return 'Completa tus datos personales.';
  if(!number || number.length < 12) return 'Número de tarjeta inválido.';
  if(!luhnCheck(number)) return 'Número de tarjeta no pasa Luhn.';
  if(!exp || !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(exp)) return 'Formato MM/AA inválido.';
  const [mm,yy] = exp.split('/').map(x=>Number(x));
  const now = new Date(); const full = 2000 + yy;
  if(full < now.getFullYear() || (full === now.getFullYear() && (mm-1) < now.getMonth())) return 'La tarjeta está vencida.';
  if(!cvv || cvv.length < 3) return 'CVV inválido.';
  return null;
}

/* open/close modals */
export function openCardPaymentModal(){
  ensureModals();
  // reset fields if exist
  ['card-name','card-email','card-phone','card-address','card-number','card-exp','card-cvv','card-errors'].forEach(id=>{
    const el = document.getElementById(id); if(!el) return; if(el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = ''; else el.innerText = '';
  });
  document.getElementById('card-modal-overlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
export function closeCardModal(){ document.getElementById('card-modal-overlay') && (document.getElementById('card-modal-overlay').style.display = 'none'); document.body.style.overflow = ''; }
function closeOtpModal(){ const o = document.getElementById('otp-modal-overlay'); if(o) o.style.display='none'; }

/* initPayment must be called from main with getCart & clearCart */
