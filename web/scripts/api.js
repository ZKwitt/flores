// scripts/api.js
export const API_URL = 'https://a.thepersonmrt.workers.dev/';

function firstKeyValue(obj, keys){
  if (!obj) return undefined;
  const map = {};
  Object.keys(obj).forEach(k => map[k.toLowerCase()] = obj[k]);
  for (let key of keys){
    const v = map[key.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

export async function getSheets(){
  const r = await fetch(API_URL, {cache:'no-store'});
  return await r.json().catch(()=>({sheets:[]}));
}
export async function getProductsFor(sheetKey){
  const r = await fetch(API_URL + '?sheetKey=' + encodeURIComponent(sheetKey), {cache:'no-store'});
  return await r.json().catch(()=>({products:[]}));
}
export async function getAllProducts(){
  const r = await fetch(API_URL + '?all=1', {cache:'no-store'});
  return await r.json().catch(()=>({products:[]}));
}

/* STOCK helpers (same behaviour as original) */
export async function fetchServerStock(sheetKeyRaw, row){
  try {
    const resp = await fetch(API_URL + '?sheetKey=' + encodeURIComponent(sheetKeyRaw), { cache: 'no-store' });
    if(!resp.ok) return null;
    const json = await resp.json().catch(()=>null);
    if(!json || !Array.isArray(json.products)) return null;
    const found = json.products.find(p => String(p.row) === String(row));
    if(!found) return null;
    const stockVal = firstKeyValue(found.data || {}, ['stock','cantidad','Stock']) || found.data && (found.data.Stock || found.data.cantidad) || 0;
    return Number(stockVal || 0);
  } catch(e){ console.warn('fetchServerStock err',e); return null; }
}

async function postAction(body){
  const resp = await fetch(API_URL, { method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const text = await resp.text().catch(()=>null);
  try { return text ? JSON.parse(text) : null; } catch(e){ return null; }
}

export async function updateStockOnServer_decrement(sheetKeyRaw, row, qty){
  if(!qty || qty <= 0) return;
  for(let i=0;i<qty;i++){
    const json = await postAction({ action:'decrement', sheetKey: sheetKeyRaw, row: String(row) });
    if(!json || json.error) break;
  }
}
export async function updateStockOnServer_set(sheetKeyRaw, row, newStock){
  await postAction({ action:'set', sheetKey: sheetKeyRaw, row: String(row), value: String(newStock) });
}
export async function updateStockOnServer_increaseViaSet(sheetKeyRaw, row, delta){
  if(!delta || delta <= 0) return;
  const serverStock = await fetchServerStock(sheetKeyRaw, row);
  const base = (serverStock !== null && serverStock !== undefined) ? Number(serverStock) : Number(0);
  const newStock = Math.max(0, base + Number(delta));
  await updateStockOnServer_set(sheetKeyRaw, row, newStock);
}
