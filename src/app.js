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
// Como estamos em /src, o ../data volta para a raiz = correto para o Render
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

// --- HTML (login e dashboard) ---
const loginHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProposalForge PRO - Login</title><style>*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#fff;font-family:Inter,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.card{background:#141414;border:1px solid #222;border-radius:16px;padding:32px;width:100%;max-width:380px}h1{margin:0 0 8px;font-size:24px}input{width:100%;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:12px 14px;color:#fff;margin-bottom:16px}button{width:100%;background:#fff;color:#000;border:0;border-radius:10px;padding:12px;font-weight:600;cursor:pointer}</style></head><body><div class="card"><h1>ProposalForge PRO</h1><form method="POST" action="/api/login"><input type="password" name="password" placeholder="Password" required><button type="submit">Sign In</button></form></div></body></html>`;

const dashboardHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ProposalForge PRO</title><style>*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#fff;font-family:Inter,system-ui,sans-serif}header{display:flex;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #1e1e1e}.btn{background:#1c1c1c;border:1px solid #2a2a2a;color:#fff;padding:8px 14px;border-radius:8px;cursor:pointer}.btn.primary{background:#fff;color:#000}.wrap{max-width:1100px;margin:0 auto;padding:24px}.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}.stat{background:#141414;border:1px solid #1e1e1e;border-radius:14px;padding:18px}.card{background:#141414;border:1px solid #1e1e1e;border-radius:14px;padding:18px;margin-bottom:16px}input,select{width:100%;background:#1c1c1c;border:1px solid #2a2a2a;border-radius:8px;padding:10px;color:#fff;margin-bottom:10px}table{width:100%;border-collapse:collapse}th{color:#666;font-size:11px;text-align:left;padding:8px;border-bottom:1px solid #1e1e1e}td{padding:10px 8px;font-size:14px;border-bottom:1px solid #121212}</style></head><body><header><div>ProposalForge PRO</div><a href="/api/logout" style="color:#888">Logout</a></header><div class="wrap" id="app">Carregando...</div><script>
async function api(p,o){const r=await fetch(p,{headers:{'Content-Type':'application/json'},...o}); if(r.status===401) location.href='/login'; return r.json();}
async function load(){const d=await api('/api/dashboard'); document.getElementById('app').innerHTML='<div class=grid><div class=stat>Clients: '+d.clients+'</div><div class=stat>Proposals: '+d.proposals+'</div><div class=stat>Revenue: $'+d.revenue+'</div></div><p>Dashboard OK - versao Render compativel</p>';}
load();
</script></body></html>`;

app.get('/login', (req, res) => res.send(loginHTML));
app.post('/api/login', (req, res) => {
  const passwordAttempt = req.body.password || '';
  const dbLocal = loadDB();
  const ok = bcrypt.compareSync(passwordAttempt, dbLocal.settings.passwordHash) || passwordAttempt === (process.env.ADMIN_PASSWORD || 'admin123');
  if (ok) {
    res.cookie('pf_auth', 'ok', { httpOnly: true, sameSite: 'Lax' });
    if (req.headers['content-type']?.includes('application/json')) return res.json({ ok: true });
    return res.redirect('/');
  }
  return res.status(401).send('Invalid password <a href="/login">back</a>');
});
app.get('/api/logout', (req, res) => { res.clearCookie('pf_auth'); res.redirect('/login'); });
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
  d.clients.push(c); saveDB(d); res.json(c);
});
app.get('/api/services', (req,res)=> res.json(loadDB().services));
app.post('/api/services', (req,res)=>{
  const d=loadDB();
  const s={ id: genId('sv'), name: req.body.name, price: parseFloat(req.body.price)||0, description: req.body.description||'', unit: 'project' };
  d.services.push(s); saveDB(d); res.json(s);
});
app.delete('/api/services/:id', (req,res)=>{
  const d=loadDB(); d.services = d.services.filter(s=>s.id!==req.params.id); saveDB(d); res.json({ok:true});
});
app.get('/api/proposals', (req,res)=>{
  const d=loadDB();
  res.json(d.proposals.map(p=>{
    const client = d.clients.find(c=>c.id===p.clientId);
    return { ...p, clientName: client?client.name:'Unknown' };
  }).reverse());
});
app.post('/api/proposals', (req,res)=>{
  const d=loadDB();
  const services = d.services.filter(s=>(req.body.serviceIds||[]).includes(s.id));
  const total = services.reduce((s,x)=>s+ (parseFloat(x.price)||0),0);
  const prop = { id: genId('pr'), clientId: req.body.clientId, services, total, status: 'pending', token: genToken(), createdAt: new Date().toISOString() };
  d.proposals.push(prop); saveDB(d); res.json(prop);
});
app.get('/p/:token', (req,res)=>{
  const d=loadDB();
  const p=d.proposals.find(x=>x.token===req.params.token);
  if(!p) return res.status(404).send('Not found');
  const client=d.clients.find(c=>c.id===p.clientId);
  res.send('<h1>Proposal '+p.token+'</h1><p>Cliente: '+(client?.name||'')+'</p><p>Total: $'+p.total+'</p><p>Status: '+p.status+'</p>');
});
app.post('/api/public/accept/:token', (req,res)=>{
  const d=loadDB();
  const p=d.proposals.find(x=>x.token===req.params.token);
  if(p){ p.status='accepted'; saveDB(d); }
  res.json({ok:true});
});
app.get('/health', (req,res)=> res.json({ok:true}));

module.exports = app;
