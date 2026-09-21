
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- JSON DB ---
const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function defaultDB() {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  return {
    settings: { passwordHash: hash },
    clients: [
      { id: 'cl_1', name: 'Acme Corp', email: 'hello@acme.com', company: 'Acme', createdAt: new Date().toISOString() }
    ],
    services: [
      { id: 'sv_1', name: 'Website Design', description: 'Modern responsive website', price: 1200, unit: 'project' },
      { id: 'sv_2', name: 'SEO Optimization', description: 'Monthly SEO', price: 400, unit: 'month' }
    ],
    proposals: []
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const db = defaultDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
      return db;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('DB load error, resetting', e);
    const db = defaultDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    return db;
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}
let db = loadDB();
function genId(prefix) { return prefix + '_' + Math.random().toString(36).substr(2, 9); }
function genToken() { return Math.random().toString(36).substr(2, 12); }

// --- Auth ---
function isAuth(req) {
  return req.cookies && req.cookies.pf_auth === 'ok';
}
function requireAuth(req, res, next) {
  if (req.path.startsWith('/p/') || req.path === '/login' || req.path.startsWith('/api/login') || req.path.startsWith('/api/public')) return next();
  if (isAuth(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/login');
}
app.use(requireAuth);

// --- HTML Templates ---
const loginHTML = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ProposalForge PRO - Login</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#fff;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{background:#141414;border:1px solid #222;border-radius:16px;padding:32px;width:100%;max-width:380px}
h1{margin:0 0 8px;font-size:24px;letter-spacing:-0.5px}.sub{color:#888;font-size:14px;margin-bottom:24px}
input{width:100%;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:12px 14px;color:#fff;margin-bottom:16px;outline:none}
input:focus{border-color:#fff}
button{width:100%;background:#fff;color:#000;border:0;border-radius:10px;padding:12px;font-weight:600;cursor:pointer}
button:hover{background:#e5e5e5}.hint{margin-top:16px;color:#555;font-size:12px;text-align:center}
</style></head><body>
<div class="card">
<h1>ProposalForge PRO</h1><div class="sub">Enter admin password to continue</div>
<form method="POST" action="/api/login"><input type="password" name="password" placeholder="Password (admin123)" required>
<button type="submit">Sign In</button></form>
<div class="hint">Demo: admin123 | Render compatible build</div>
</div>
</body></html>
`;

const dashboardHTML = `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ProposalForge PRO</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#fff;font-family:Inter,system-ui,sans-serif}
header{display:flex;justify-content:space-between;align-items:center;padding:18px 24px;border-bottom:1px solid #1e1e1e;position:sticky;top:0;background:#0a0a0a;z-index:10}
.logo{font-weight:800;letter-spacing:-0.5px}.nav{display:flex;gap:8px}
.btn{background:#1c1c1c;border:1px solid #2a2a2a;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px}
.btn.primary{background:#fff;color:#000;border-color:#fff}.wrap{max-width:1100px;margin:0 auto;padding:24px}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px}
.stat{background:#141414;border:1px solid #1e1e1e;border-radius:14px;padding:18px}
.stat .k{color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}.stat .v{font-size:26px;font-weight:700;margin-top:6px}
.cols{display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px}
.card{background:#141414;border:1px solid #1e1e1e;border-radius:14px;padding:18px;margin-bottom:16px}
.card h3{margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:#888}
input,select,textarea{width:100%;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:8px;padding:10px 12px;color:#fff;margin-bottom:10px;font-size:14px}
table{width:100%;border-collapse:collapse}th{color:#666;font-size:11px;text-transform:uppercase;text-align:left;padding:8px;border-bottom:1px solid #1e1e1e}
td{padding:10px 8px;font-size:14px;border-bottom:1px solid #121212}.badge{background:#1e1e1e;padding:3px 8px;border-radius:20px;font-size:11px}
.row{display:flex;gap:8px}.small{font-size:12px;color:#777}
</style></head><body>
<header><div class="logo">ProposalForge PRO</div><div class="nav"><button class="btn" onclick="location.href='/api/logout'">Logout</button></div></header>
<div class="wrap">
<div class="grid"><div class="stat"><div class="k">Clients</div><div class="v" id="st_clients">-</div></div><div class="stat"><div class="k">Proposals</div><div class="v" id="st_props">-</div></div><div class="stat"><div class="k">Revenue (accepted)</div><div class="v" id="st_rev">-</div></div></div>
<div class="cols">
<div>
<div class="card"><h3>New Proposal</h3>
<select id="p_client"></select>
<div id="p_services"></div>
<button class="btn primary" onclick="createProposal()">Create Proposal + Public Link</button>
<div id="p_result" class="small" style="margin-top:10px"></div>
</div>
<div class="card"><h3>Proposals</h3><table><thead><tr><th>Client</th><th>Total</th><th>Status</th><th>Link</th></tr></thead><tbody id="tb_props"></tbody></table></div>
</div>
<div>
<div class="card"><h3>Clients</h3><input id="c_name" placeholder="Name"><input id="c_email" placeholder="Email"><input id="c_company" placeholder="Company"><button class="btn primary" onclick="addClient()">Add Client</button><div id="list_clients" style="margin-top:12px"></div></div>
<div class="card"><h3>Services</h3><input id="s_name" placeholder="Service name"><input id="s_price" type="number" placeholder="Price"><input id="s_desc" placeholder="Description"><button class="btn primary" onclick="addService()">Add Service</button><div id="list_services" style="margin-top:12px"></div></div>
</div>
</div>
</div>
<script>
async function api(p,o){const r=await fetch(p,{headers:{'Content-Type':'application/json'},...o}); if(r.status===401) location.href='/login'; return r.json();}
async function load(){
 const d=await api('/api/dashboard'); document.getElementById('st_clients').innerText=d.clients; document.getElementById('st_props').innerText=d.proposals; document.getElementById('st_rev').innerText='$'+d.revenue;
 const clients=await api('/api/clients'); const sel=document.getElementById('p_client'); sel.innerHTML=clients.map(c=>`<option value="${c.id}">${c.name} - ${c.company}</option>`).join('');
 document.getElementById('list_clients').innerHTML=clients.map(c=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a"><span>${c.name}</span><span class="small">${c.email}</span></div>`).join('');
 const services=await api('/api/services'); document.getElementById('list_services').innerHTML=services.map(s=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1a1a1a"><span>${s.name} $${s.price}</span><button class="btn" onclick="delService('${s.id}')">x</button></div>`).join('');
 document.getElementById('p_services').innerHTML=services.map(s=>`<label style="display:flex;gap:8px;align-items:center;padding:6px 0"><input type="checkbox" value="${s.id}" data-price="${s.price}" data-name="${s.name}"> ${s.name} - $${s.price}</label>`).join('');
 const props=await api('/api/proposals'); document.getElementById('tb_props').innerHTML=props.map(p=>`<tr><td>${p.clientName}</td><td>$${p.total}</td><td><span class="badge">${p.status}</span></td><td><a href="/p/${p.token}" target="_blank" style="color:#fff">/p/${p.token}</a></td></tr>`).join('');
}
async function addClient(){const name=document.getElementById('c_name').value; const email=document.getElementById('c_email').value; const company=document.getElementById('c_company').value; if(!name) return; await api('/api/clients',{method:'POST',body:JSON.stringify({name,email,company})}); load();}
async function addService(){const name=document.getElementById('s_name').value; const price=parseFloat(document.getElementById('s_price').value)||0; const description=document.getElementById('s_desc').value; await api('/api/services',{method:'POST',body:JSON.stringify({name,price,description})}); load();}
async function delService(id){await api('/api/services/'+id,{method:'DELETE'}); load();}
async function createProposal(){const clientId=document.getElementById('p_client').value; const checks=[...document.querySelectorAll('#p_services input:checked')]; const serviceIds=checks.map(c=>c.value); if(!serviceIds.length) return alert('Select at least one service'); const r=await api('/api/proposals',{method:'POST',body:JSON.stringify({clientId,serviceIds})}); document.getElementById('p_result').innerHTML='Created! Public link: <a href="/p/'+r.token+'" target="_blank" style="color:#fff">/p/'+r.token+'</a>'; load();}
load();
</script>
</body></html>
`;

// --- Routes ---
app.get('/login', (req, res) => res.send(loginHTML));

app.post('/api/login', (req, res) => {
  const pwd = req.body.password || req.body.password;
  const bodyPwd = (req.body && req.body.password) || (req.body && req.body.pwd) || '';
  // support form POST
  const formPwd = req.body.password;
  const tryPwd = formPwd || bodyPwd || req.query.password || '';
  // also check urlencoded body is parsed
  let input = tryPwd;
  if (!input && req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
    input = req.body.password;
  }
  // For form POST without json, express.urlencoded already parsed
  const passwordAttempt = req.body.password || input || '';
  const dbLocal = loadDB();
  const ok = bcrypt.compareSync(passwordAttempt, dbLocal.settings.passwordHash) || passwordAttempt === (process.env.ADMIN_PASSWORD || 'admin123');
  if (ok) {
    res.cookie('pf_auth', 'ok', { httpOnly: true, sameSite: 'Lax' });
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) return res.json({ ok: true });
    return res.redirect('/');
  }
  return res.status(401).send('Invalid password <a href="/login">back</a>');
});

app.get('/api/logout', (req, res) => {
  res.clearCookie('pf_auth');
  res.redirect('/login');
});

app.get('/', (req, res) => res.send(dashboardHTML));

app.get('/api/dashboard', (req, res) => {
  const d = loadDB();
  const revenue = d.proposals.filter(p=>p.status==='accepted').reduce((s,p)=>s+p.total,0);
  res.json({ clients: d.clients.length, proposals: d.proposals.length, revenue });
});

app.get('/api/clients', (req,res)=> res.json(loadDB().clients));
app.post('/api/clients', (req,res)=>{
  const d=loadDB();
  const c={ id: genId('cl'), name: req.body.name, email: req.body.email||'', company: req.body.company||'', createdAt: new Date().toISOString() };
  d.clients.push(c); saveDB(d); db=d; res.json(c);
});

app.get('/api/services', (req,res)=> res.json(loadDB().services));
app.post('/api/services', (req,res)=>{
  const d=loadDB();
  const s={ id: genId('sv'), name: req.body.name, price: parseFloat(req.body.price)||0, description: req.body.description||'', unit: 'project' };
  d.services.push(s); saveDB(d); db=d; res.json(s);
});
app.delete('/api/services/:id', (req,res)=>{
  const d=loadDB(); d.services = d.services.filter(s=>s.id!==req.params.id); saveDB(d); res.json({ok:true});
});

app.get('/api/proposals', (req,res)=>{
  const d=loadDB();
  const list = d.proposals.map(p=>{
    const client = d.clients.find(c=>c.id===p.clientId);
    return { ...p, clientName: client?client.name:'Unknown' };
  }).reverse();
  res.json(list);
});
app.post('/api/proposals', (req,res)=>{
  const d=loadDB();
  const clientId=req.body.clientId;
  const serviceIds=req.body.serviceIds||[];
  const services = d.services.filter(s=>serviceIds.includes(s.id));
  const total = services.reduce((s,x)=>s+ (parseFloat(x.price)||0),0);
  const prop = { id: genId('pr'), clientId, services, total, status: 'pending', token: genToken(), createdAt: new Date().toISOString() };
  d.proposals.push(prop); saveDB(d); res.json(prop);
});

// Public proposal view
app.get('/p/:token', (req,res)=>{
  const d=loadDB();
  const p=d.proposals.find(x=>x.token===req.params.token);
  if(!p) return res.status(404).send('Proposal not found');
  const client=d.clients.find(c=>c.id===p.clientId);
  const html = `
  <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Proposal ${p.token}</title>
  <style>body{margin:0;background:#f5f5f3;color:#111;font-family:Inter,system-ui,sans-serif;padding:32px}.paper{max-width:780px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,0.08)}h1{margin:0}.muted{color:#777;font-size:14px}table{width:100%;margin-top:24px;border-collapse:collapse}th{text-align:left;color:#888;font-size:12px;text-transform:uppercase;padding:8px;border-bottom:1px solid #eee}td{padding:12px 8px;border-bottom:1px solid #f0f0f0}.total{font-size:20px;font-weight:700;margin-top:16px;text-align:right}.badge{display:inline-block;background:#111;color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;margin-top:12px}</style>
  </head><body><div class="paper">
  <div style="display:flex;justify-content:space-between"><div><h1>Proposal</h1><div class="muted">Token ${p.token} • ${new Date(p.createdAt).toLocaleDateString()}</div><div class="badge">${p.status}</div></div><div style="text-align:right"><div style="font-weight:700">${client?client.company||client.name:''}</div><div class="muted">${client?client.name:''} • ${client?client.email:''}</div></div></div>
  <table><thead><tr><th>Service</th><th>Description</th><th style="text-align:right">Price</th></tr></thead><tbody>
  ${p.services.map(s=>`<tr><td>${s.name}</td><td class="muted">${s.description||''}</td><td style="text-align:right">$${s.price}</td></tr>`).join('')}
  </tbody></table>
  <div class="total">Total: $${p.total}</div>
  <div style="margin-top:24px"><button onclick="fetch('/api/public/accept/${p.token}',{method:'POST'}).then(()=>location.reload())" style="background:#111;color:#fff;border:0;padding:12px 20px;border-radius:10px;cursor:pointer">Accept Proposal</button></div>
  <div class="muted" style="margin-top:24px">Powered by ProposalForge PRO</div>
  </div></body></html>`;
  res.send(html);
});

app.post('/api/public/accept/:token', (req,res)=>{
  const d=loadDB();
  const p=d.proposals.find(x=>x.token===req.params.token);
  if(p){ p.status='accepted'; saveDB(d); }
  res.json({ok:true});
});

app.get('/health', (req,res)=> res.json({ok:true, time: new Date().toISOString()}));

module.exports = app;
