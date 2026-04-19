// 📦 Встроенный HTML (ваш фронтенд)
const INDEX_HTML = `<!DOCTYPE html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>🚌 qrnspk</title>
<style>body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:20px;background:#f8fafc}
.card{background:#fff;padding:20px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);margin:16px 0}
input{width:100%;padding:12px;margin:8px 0;border:1px solid #e2e8f0;border-radius:8px}
button{background:#2563eb;color:#fff;border:none;padding:12px 20px;border-radius:8px;cursor:pointer;width:100%}
button:disabled{background:#94a3b8}
.result{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}
.box{background:#f1f5f9;padding:12px;border-radius:8px;border-left:4px solid #2563eb}
.label{font-size:.8rem;color:#64748b;text-transform:uppercase}
.value{font-weight:600;font-size:1.1rem;word-break:break-word}
.status{padding:10px;border-radius:8px;margin:8px 0;display:none}
.status.show{display:block}
.loading{background:#dbeafe;color:#1e40af}
.error{background:#fef2f2;color:#991b1b}
.success{background:#f0fdf4;color:#166534}</style></head><body>
<div class="card"><h2>🚌 qrnspk</h2><input id="qrInput" placeholder="https://qr.bilet.nspk.ru/?paytagid=..." value="https://qr.bilet.nspk.ru/?paytagid=100000403158&s=qr&m=t">
<button id="btn" onclick="parse()">🔍 Получить данные</button>
<div id="status" class="status"></div>
<div class="result" id="result" style="display:none">
<div class="box"><div class="label">Тип</div><div class="value" id="t">—</div></div>
<div class="box"><div class="label">Маршрут</div><div class="value" id="r">—</div></div>
<div class="box"><div class="label">Номер ТС</div><div class="value" id="v">—</div></div>
<div class="box"><div class="label">Цена</div><div class="value" id="p">—</div></div></div></div>
<script>function show(m,c){const e=document.getElementById('status');e.textContent=m;e.className='status show '+c}
async function parse(){const i=document.getElementById('qrInput').value.trim();const b=document.getElementById('btn');
if(!i)return show('⚠️ Введите ссылку','error');b.disabled=true;b.textContent='⏳';show('🔄','loading');
const url=new URL(i);const pid=url.searchParams.get('paytagid')||url.searchParams.get('payTagId');
if(!pid){show('❌ paytagid не найден','error');b.disabled=false;b.textContent='🔍 Получить данные';return}
try{const res=await fetch('/api/proxy?payTagId='+pid+'&s='+(url.searchParams.get('s')||'qr')+'&m='+(url.searchParams.get('m')||'t'));
const data=await res.json();if(data.responseStatus!=='OK')throw new Error('API error');
const d=data.result?.[0];if(!d)throw new Error('Пустой ответ');
document.getElementById('t').textContent=d.vehicleTypeName||'—';
document.getElementById('r').textContent=d.routeNumber||'—';
document.getElementById('v').textContent=d.vehicleNumber||'—';
document.getElementById('p').textContent=d.price?d.price+' ₽':'—';
document.getElementById('result').style.display='grid';show('✅ Готово','success');
}catch(e){show('❌ '+e.message,'error')}finally{b.disabled=false;b.textContent='🔍 Получить данные'}}
document.getElementById('qrInput').addEventListener('keypress',e=>{if(e.key==='Enter')parse()})</script></body></html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 🔹 API маршрут
    if (path === '/api/proxy') {
      return handleApi(request, url);    }

    // 🔹 Отдаём HTML для всех остальных путей
    return new Response(INDEX_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

async function handleApi(request, url) {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  const payTagId = url.searchParams.get('payTagId') || url.searchParams.get('paytagid');
  if (!payTagId) {
    return json({ error: 'payTagId is required' }, 400);
  }

  const s = url.searchParams.get('s') || 'qr';
  const m = url.searchParams.get('m') || 't';

  const nspkUrl = `https://qr.bilet.nspk.ru/api/v1/pay-tags/tariff?payTagId=${encodeURIComponent(payTagId)}&s=${encodeURIComponent(s)}&m=${encodeURIComponent(m)}`;

  try {
    const response = await fetch(nspkUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ru-RU,ru;q=0.9',
        'Referer': 'https://qr.bilet.nspk.ru/',
        'Origin': 'https://qr.bilet.nspk.ru'
      }
    });

    const data = await response.json();
    return json(data, response.status);
  } catch (err) {
    return json({ error: 'NSPK request failed', debug: err.message }, 502);
  }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
