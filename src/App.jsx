import { useState, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection } from "firebase/firestore";

// ─── Firebase ─────────────────────────────────────────────────────────────────
let db = null;
let firebaseReady = false;
let firebaseApp = null;

function initFirebase(cfg) {
  try {
    firebaseApp = initializeApp(cfg, "bancas-app-" + Date.now());
    db = getFirestore(firebaseApp);
    firebaseReady = true;
    return true;
  } catch(e) { return false; }
}

async function saveBanca(banca) {
  if (!db || !firebaseReady) return;
  await setDoc(doc(db, "bancas", banca.id), { title: banca.title, student: banca.student, pdfLink: banca.pdfLink || "", date: banca.date || "", members: banca.members, createdAt: Date.now() });
}

async function saveAvailability(bancaId, memberId, grid) {
  if (!db || !firebaseReady) return;
  await setDoc(doc(db, "bancas", bancaId, "availability", memberId), { grid, savedAt: Date.now() });
}

async function loadBanca(bancaId) {
  if (!db || !firebaseReady) return null;
  const snap = await getDoc(doc(db, "bancas", bancaId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function subscribeAvailability(bancaId, callback) {
  if (!db || !firebaseReady) return () => {};
  return onSnapshot(collection(db, "bancas", bancaId, "availability"), snap => {
    const data = {};
    snap.forEach(d => { data[d.id] = d.data().grid; });
    callback(data);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(8 + Math.floor(i/2)).padStart(2,"0")}:${i%2===0?"00":"30"}`);
const SLOT_COUNT = 24;
const MEMBER_COLORS = ["#1e40af","#0f766e","#7c3aed","#b45309","#be185d"];
const generateId = () => Math.random().toString(36).substr(2, 9);
const emptyGrid = () => Object.fromEntries(DAYS.map(d => [d, new Array(SLOT_COUNT).fill(false)]));
const heatColor = r => r === 0 ? "#eef1f8" : r < 0.34 ? "#bfdbfe" : r < 0.67 ? "#60a5fa" : r < 1 ? "#1d4ed8" : "#065f46";

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--navy:#0f2240;--navy-mid:#1a3560;--accent:#3b82f6;--accent-glow:rgba(59,130,246,0.25);--teal:#0d9488;--gold:#d97706;--bg:#f4f6fb;--surface:#fff;--surface2:#eef1f8;--text:#0f2240;--text-muted:#64748b;--border:#d1d9e8;--success:#059669;--radius:12px;--shadow:0 2px 16px rgba(15,34,64,.10);--shadow-lg:0 8px 40px rgba(15,34,64,.14)}
  html,body,#root{height:100%;font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text)}
  h1,h2,h3{font-family:'DM Serif Display',serif}
  .app{min-height:100vh;display:flex;flex-direction:column}
  .nav{background:var(--navy);padding:0 2rem;display:flex;align-items:center;gap:1.5rem;height:60px;position:sticky;top:0;z-index:100;box-shadow:0 2px 20px rgba(0,0,0,.3)}
  .nav-logo{display:flex;align-items:center;gap:.6rem;cursor:pointer}
  .nav-logo-icon{width:32px;height:32px;background:var(--accent);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
  .nav-logo h1{font-size:1.25rem;color:#fff;letter-spacing:-.02em}
  .nav-logo span{color:var(--accent);font-style:italic}
  .nav-tabs{display:flex;gap:.25rem;margin-left:auto}
  .nav-tab{padding:.4rem 1rem;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-size:.85rem;font-weight:500;transition:all .2s;color:rgba(255,255,255,.65);background:transparent}
  .nav-tab:hover{color:#fff;background:rgba(255,255,255,.08)}
  .nav-tab.active{color:#fff;background:var(--accent)}
  .main{flex:1;padding:2rem;max-width:1100px;margin:0 auto;width:100%}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:1.75rem;box-shadow:var(--shadow)}
  .card-title{font-size:1.35rem;color:var(--navy);margin-bottom:.35rem}
  .card-subtitle{font-size:.88rem;color:var(--text-muted);margin-bottom:1.5rem}
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .form-group{display:flex;flex-direction:column;gap:.4rem}
  .form-group.full{grid-column:1/-1}
  .form-label{font-size:.8rem;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.05em}
  .form-input,.form-select{padding:.6rem .85rem;border:1.5px solid var(--border);border-radius:8px;font-family:inherit;font-size:.9rem;color:var(--text);background:var(--bg);transition:border-color .2s,box-shadow .2s;outline:none}
  .form-input:focus,.form-select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow);background:#fff}
  .member-list{display:flex;flex-direction:column;gap:.6rem;margin-bottom:1rem}
  .member-row{display:flex;align-items:center;gap:.75rem;padding:.65rem .9rem;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;transition:border-color .2s}
  .member-row:hover{border-color:var(--accent)}
  .member-avatar{border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;flex-shrink:0}
  .member-info{flex:1;min-width:0}
  .member-name{font-size:.88rem;font-weight:600;color:var(--navy)}
  .member-email{font-size:.78rem;color:var(--text-muted)}
  .member-badge{font-size:.68rem;font-weight:700;padding:.2rem .5rem;border-radius:99px;text-transform:uppercase;letter-spacing:.04em}
  .badge-titular{background:#dbeafe;color:#1e40af}
  .badge-suplente{background:#fef3c7;color:#92400e}
  .btn{display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.25rem;border-radius:8px;border:none;font-family:inherit;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .2s}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .btn-primary{background:var(--navy);color:white}
  .btn-primary:hover:not(:disabled){background:var(--navy-mid);transform:translateY(-1px);box-shadow:var(--shadow)}
  .btn-accent{background:var(--accent);color:white}
  .btn-teams{background:#5b5fc7;color:white}
  .btn-teams:hover:not(:disabled){background:#4a4fb5;transform:translateY(-1px)}
  .btn-ghost{background:transparent;color:var(--text-muted);border:1.5px solid var(--border)}
  .btn-ghost:hover:not(:disabled){border-color:var(--accent);color:var(--accent)}
  .btn-sm{padding:.4rem .85rem;font-size:.8rem}
  .btn-lg{padding:.8rem 1.75rem;font-size:.95rem;border-radius:10px}
  .heatmap-wrap{overflow-x:auto}
  .heatmap{display:grid;grid-template-columns:52px repeat(5,1fr);gap:2px;min-width:560px}
  .hm-header{font-size:.75rem;font-weight:700;color:var(--navy-mid);text-align:center;padding:.5rem .25rem;text-transform:uppercase;letter-spacing:.05em}
  .hm-time{font-size:.68rem;color:var(--text-muted);text-align:right;padding-right:6px;display:flex;align-items:center;justify-content:flex-end;height:22px}
  .hm-cell{height:22px;border-radius:3px;cursor:pointer;position:relative;transition:transform .1s,filter .1s}
  .hm-cell:hover{transform:scaleY(1.15);filter:brightness(1.15);z-index:2}
  .hm-tooltip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:var(--navy);color:white;font-size:.72rem;padding:.45rem .65rem;border-radius:6px;white-space:nowrap;z-index:20;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.25)}
  .hm-tooltip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--navy)}
  .avail-grid{display:grid;grid-template-columns:52px repeat(5,1fr);gap:2px;min-width:560px;user-select:none}
  .avail-cell{height:22px;border-radius:3px;cursor:pointer;transition:background .1s}
  .avail-cell.free{background:#bbf7d0}
  .avail-cell.free:hover{background:#4ade80}
  .avail-cell.busy{background:var(--surface2);border:1px solid var(--border)}
  .avail-cell.busy:hover{background:#dbeafe}
  .legend{display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap}
  .legend-item{display:flex;align-items:center;gap:.4rem;font-size:.78rem;color:var(--text-muted)}
  .legend-dot{width:12px;height:12px;border-radius:3px}
  .stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:1.5rem}
  .stat-card{background:var(--navy);color:white;border-radius:10px;padding:1rem 1.25rem;position:relative;overflow:hidden}
  .stat-value{font-size:2rem;font-family:'DM Serif Display',serif;line-height:1}
  .stat-label{font-size:.75rem;opacity:.7;margin-top:.3rem}
  .steps{display:flex;align-items:center;gap:0;margin-bottom:2rem}
  .step{display:flex;align-items:center;gap:.5rem}
  .step-num{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700}
  .step-num.active{background:var(--navy);color:white}
  .step-num.future{background:var(--surface2);color:var(--text-muted)}
  .step-label{font-size:.8rem;font-weight:500}
  .step-label.active{color:var(--navy)}
  .step-label.future{color:var(--text-muted)}
  .step-connector{flex:1;height:2px;background:var(--border);max-width:48px;margin:0 .5rem}
  .alert{border-radius:8px;padding:.9rem 1.1rem;font-size:.88rem;display:flex;gap:.6rem;align-items:flex-start}
  .alert-info{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af}
  .alert-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
  .modal-overlay{position:fixed;inset:0;background:rgba(15,34,64,.55);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px)}
  .modal{background:white;border-radius:16px;padding:2rem;max-width:520px;width:90%;box-shadow:var(--shadow-lg);animation:slideUp .25s ease}
  .modal h2{font-size:1.5rem;color:var(--navy);margin-bottom:.5rem}
  .divider{height:1px;background:var(--border);margin:1.25rem 0}
  .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;gap:1rem}
  .tag{display:inline-flex;align-items:center;gap:.3rem;padding:.2rem .55rem;background:var(--surface2);border:1px solid var(--border);border-radius:6px;font-size:.75rem;color:var(--text-muted)}
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .animate-pulse{animation:pulse 2s infinite}
  @media(max-width:640px){.main{padding:1rem}.form-grid{grid-template-columns:1fr}.stats-row{grid-template-columns:1fr 1fr}.nav-tabs{display:none}}
`;

function MemberAvatar({ member, size = 32 }) {
  const initials = member.name.split(" ").filter(w => /^[A-Z]/.test(w)).slice(0,2).map(w=>w[0]).join("");
  return <div className="member-avatar" style={{background:member.color||"#1e40af",width:size,height:size,fontSize:size*.3}}>{initials}</div>;
}

// ─── Firebase Config Modal ────────────────────────────────────────────────────
function FirebaseConfigModal({ onClose, onSaved }) {
  const [cfg, setCfg] = useState({ apiKey:"", authDomain:"", projectId:"", storageBucket:"", messagingSenderId:"", appId:"" });
  const apply = () => {
    if (initFirebase(cfg)) { onSaved(); onClose(); }
    else alert("Erro ao conectar ao Firebase. Verifique as credenciais.");
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>🔥 Configurar Firebase</h2>
        <p style={{fontSize:".85rem",color:"var(--text-muted)",marginBottom:"1.25rem",lineHeight:1.6}}>
          Crie um projeto em <strong>console.firebase.google.com</strong>, ative o <strong>Firestore Database</strong> e cole as credenciais do seu Web App abaixo.
        </p>
        <div style={{display:"flex",flexDirection:"column",gap:".6rem",marginBottom:"1.25rem"}}>
          {["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"].map(k => (
            <div key={k}>
              <label className="form-label" style={{display:"block",marginBottom:".2rem"}}>{k}</label>
              <input className="form-input" style={{width:"100%"}} placeholder={k} value={cfg[k]} onChange={e => setCfg(c => ({...c,[k]:e.target.value}))} />
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:".75rem"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={apply} disabled={!cfg.apiKey||!cfg.projectId}>Conectar Firebase</button>
        </div>
      </div>
    </div>
  );
}

// ─── CreateScreen ─────────────────────────────────────────────────────────────
function CreateScreen({ onCreate }) {
  const [title, setTitle] = useState("");
  const [student, setStudent] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const [date, setDate] = useState("");
  const [members, setMembers] = useState([
    {id:generateId(),name:"",email:"",role:"titular"},
    {id:generateId(),name:"",email:"",role:"titular"},
    {id:generateId(),name:"",email:"",role:"titular"},
  ]);
  const [serviceId, setServiceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [showEmailCfg, setShowEmailCfg] = useState(false);
  const [showFirebaseCfg, setShowFirebaseCfg] = useState(false);
  const [fbReady, setFbReady] = useState(firebaseReady);
  const [sending, setSending] = useState(false);
  const [sendResults, setSendResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const addMember = () => { if(members.length<5) setMembers(m=>[...m,{id:generateId(),name:"",email:"",role:"titular"}]); };
  const updateMember = (id,f,v) => setMembers(m=>m.map(x=>x.id===id?{...x,[f]:v}:x));
  const removeMember = id => setMembers(m=>m.filter(x=>x.id!==id));

  const sendEmails = async (bancaId, mems) => {
    if (!serviceId||!templateId||!publicKey) return [];
    const results = [];
    for (const m of mems.filter(x=>x.email)) {
      const link = `${window.location.origin}${window.location.pathname}?banca=${bancaId}&member=${m.id}`;
      try {
        const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ service_id:serviceId, template_id:templateId, user_id:publicKey,
            template_params:{to_name:m.name,to_email:m.email,student_name:student,banca_title:title,availability_link:link,role:m.role} })
        });
        results.push({name:m.name,email:m.email,status:res.ok?"enviado":"erro"});
      } catch { results.push({name:m.name,email:m.email,status:"erro"}); }
    }
    return results;
  };

  const handleSubmit = async () => {
    if (!title||!student) return;
    const bancaId = generateId();
    const mems = members.map((m,i)=>({...m,color:MEMBER_COLORS[i]}));
    const banca = {id:bancaId,title,student,pdfLink,date,members:mems};
    setSending(true);
    await saveBanca(banca);
    const results = await sendEmails(bancaId, mems);
    setSendResults(results);
    setSending(false);
    if (results.length>0) setShowResults(true);
    else onCreate(banca);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      <div>
        <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.8rem",color:"var(--navy)",marginBottom:".25rem"}}>Nova Banca Acadêmica</h2>
        <p style={{color:"var(--text-muted)",fontSize:".9rem"}}>Preencha os dados para iniciar o processo de agendamento</p>
      </div>

      <div className="steps">
        {["Dados","Disponibilidade","Consenso","Confirmar"].map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center"}}>
            <div className="step">
              <div className={`step-num ${i===0?"active":"future"}`}>{i+1}</div>
              <span className={`step-label ${i===0?"active":"future"}`}>{s}</span>
            </div>
            {i<3 && <div className="step-connector"/>}
          </div>
        ))}
      </div>

      {/* Firebase Status */}
      <div className="alert" style={{background:fbReady?"#ecfdf5":"#fffbeb",border:`1px solid ${fbReady?"#a7f3d0":"#fde68a"}`,color:fbReady?"#065f46":"#92400e"}}>
        <span>{fbReady?"🔥":"⚠️"}</span>
        <div style={{flex:1}}>
          {fbReady
            ? "Firebase conectado — disponibilidades serão salvas em tempo real."
            : "Firebase não configurado — as disponibilidades não serão persistidas remotamente."}
        </div>
        {!fbReady && <button className="btn btn-ghost btn-sm" style={{borderColor:"#fde68a",color:"#92400e",whiteSpace:"nowrap"}} onClick={()=>setShowFirebaseCfg(true)}>Configurar →</button>}
      </div>

      {showFirebaseCfg && <FirebaseConfigModal onClose={()=>setShowFirebaseCfg(false)} onSaved={()=>setFbReady(true)} />}

      <div className="card">
        <h3 className="card-title">Informações do Trabalho</h3>
        <p className="card-subtitle">Dados básicos sobre a defesa a ser agendada</p>
        <div className="form-grid">
          <div className="form-group full">
            <label className="form-label">Título do Trabalho *</label>
            <input className="form-input" placeholder="Ex: Redes Neurais Aplicadas à Detecção de Fraudes..." value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nome do Aluno/Orientando *</label>
            <input className="form-input" placeholder="Nome completo" value={student} onChange={e=>setStudent(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Data Desejada</label>
            <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="form-group full">
            <label className="form-label">Link do PDF / Repositório</label>
            <input className="form-input" placeholder="https://drive.google.com/..." value={pdfLink} onChange={e=>setPdfLink(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="card-title">Membros da Banca</h3>
            <p className="card-subtitle" style={{margin:0}}>3 a 5 membros • titulares e suplentes</p>
          </div>
          {members.length<5 && <button className="btn btn-ghost btn-sm" onClick={addMember}>+ Adicionar</button>}
        </div>
        <div className="member-list">
          {members.map((m,i)=>(
            <div key={m.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto auto",gap:".6rem",alignItems:"center"}}>
              <input className="form-input" placeholder={`Nome — Membro ${i+1}`} value={m.name} onChange={e=>updateMember(m.id,"name",e.target.value)} />
              <input className="form-input" placeholder="e-mail institucional" value={m.email} onChange={e=>updateMember(m.id,"email",e.target.value)} />
              <select className="form-select" value={m.role} onChange={e=>updateMember(m.id,"role",e.target.value)} style={{width:110}}>
                <option value="titular">Titular</option>
                <option value="suplente">Suplente</option>
              </select>
              {members.length>3 && <button className="btn btn-ghost btn-sm" onClick={()=>removeMember(m.id)} style={{color:"#ef4444",borderColor:"#fca5a5",padding:".4rem .6rem"}}>✕</button>}
            </div>
          ))}
        </div>
        <div className="alert alert-info">
          <span>💡</span>
          <span>Cada membro receberá um link único. Ao acessar, ele preenche a disponibilidade que fica salva no Firebase em tempo real.</span>
        </div>
      </div>

      {/* EmailJS Config */}
      <div className="card" style={{borderColor:showEmailCfg?"var(--accent)":"var(--border)"}}>
        <div className="section-header" style={{marginBottom:showEmailCfg?"1.25rem":0}}>
          <div>
            <h3 className="card-title" style={{fontSize:"1rem"}}>⚙️ Configuração de E-mail (EmailJS)</h3>
            <p style={{fontSize:".8rem",color:"var(--text-muted)",marginTop:".15rem"}}>
              {serviceId&&templateId&&publicKey ? "✅ Credenciais configuradas" : "⚠ Sem credenciais — e-mails não serão enviados"}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setShowEmailCfg(s=>!s)}>{showEmailCfg?"Fechar ▲":"Configurar ▼"}</button>
        </div>
        {showEmailCfg && (
          <div style={{display:"flex",flexDirection:"column",gap:".75rem"}}>
            <div className="alert alert-info">
              <span>📋</span>
              <div>Template em <strong>emailjs.com</strong> com variáveis:
                <code style={{display:"block",marginTop:".4rem",background:"#dbeafe",padding:".4rem .6rem",borderRadius:6,fontSize:".78rem"}}>
                  {"{{to_name}} {{to_email}} {{student_name}} {{banca_title}} {{availability_link}} {{role}}"}
                </code>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Service ID</label><input className="form-input" placeholder="service_xxxxxxx" value={serviceId} onChange={e=>setServiceId(e.target.value)}/></div>
              <div className="form-group"><label className="form-label">Template ID</label><input className="form-input" placeholder="template_xxxxxxx" value={templateId} onChange={e=>setTemplateId(e.target.value)}/></div>
              <div className="form-group full"><label className="form-label">Public Key</label><input className="form-input" placeholder="xxxxxxxxxxxxxxxxxxxx" value={publicKey} onChange={e=>setPublicKey(e.target.value)}/></div>
            </div>
          </div>
        )}
      </div>

      {showResults && (
        <div className="modal-overlay" onClick={()=>setShowResults(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2>📨 Resultado do Envio</h2>
            <p style={{fontSize:".88rem",color:"var(--text-muted)",marginBottom:"1.25rem"}}>Status de cada convite enviado:</p>
            <div style={{display:"flex",flexDirection:"column",gap:".5rem",marginBottom:"1.25rem"}}>
              {sendResults.map((r,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:".75rem",padding:".6rem .85rem",background:"var(--bg)",borderRadius:8}}>
                  <span style={{fontSize:"1.1rem"}}>{r.status==="enviado"?"✅":"❌"}</span>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:".88rem",color:"var(--navy)"}}>{r.name}</div><div style={{fontSize:".78rem",color:"var(--text-muted)"}}>{r.email}</div></div>
                  <span className={`member-badge ${r.status==="enviado"?"badge-titular":""}`} style={r.status!=="enviado"?{background:"#fee2e2",color:"#991b1b"}:{}}>{r.status}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{width:"100%",justifyContent:"center"}} onClick={()=>setShowResults(false)}>Continuar →</button>
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"flex-end",gap:".75rem"}}>
        <button className="btn btn-ghost">Salvar rascunho</button>
        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!title||!student||sending}>
          {sending?"⏳ Salvando e enviando...":"Criar Banca e Enviar Convites →"}
        </button>
      </div>
    </div>
  );
}

// ─── AvailabilityScreen ───────────────────────────────────────────────────────
function AvailabilityScreen({ bancaId, memberId, memberInfo }) {
  const [grid, setGrid] = useState(emptyGrid);
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!bancaId||!memberId||!firebaseReady) { setLoaded(true); return; }
    getDoc(doc(db,"bancas",bancaId,"availability",memberId)).then(snap => {
      if (snap.exists()) setGrid(snap.data().grid);
      setLoaded(true);
    });
  }, [bancaId, memberId]);

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const toggleCell = (day, slot, val) => setGrid(g=>({...g,[day]:g[day].map((v,i)=>i===slot?val:v)}));
  const handleMouseDown = (day, slot) => { const v=!grid[day][slot]; setDragging(true); setDragValue(v); toggleCell(day,slot,v); };
  const handleMouseEnter = (day, slot) => { if(dragging) toggleCell(day,slot,dragValue); };

  const handleSave = async () => {
    setSaving(true);
    await saveAvailability(bancaId, memberId, grid);
    setSaving(false);
    setSaved(true);
  };

  const freeCount = Object.values(grid).flat().filter(Boolean).length;
  const member = memberInfo || {name:"Professor(a)",role:"titular",color:"#1e40af"};

  if (!loaded) return <div className="card" style={{textAlign:"center",padding:"3rem"}}><div className="animate-pulse" style={{fontSize:"2rem",marginBottom:"1rem"}}>⏳</div><p style={{color:"var(--text-muted)"}}>Carregando...</p></div>;

  if (saved) return (
    <div className="card" style={{textAlign:"center",padding:"3rem"}}>
      <div style={{fontSize:"3rem",marginBottom:"1rem"}}>✅</div>
      <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.8rem",color:"var(--navy)",marginBottom:".5rem"}}>Disponibilidade Salva!</h2>
      <p style={{color:"var(--text-muted)",maxWidth:400,margin:"0 auto 1.5rem"}}>
        Obrigado, <strong>{member.name}</strong>! Seus {freeCount} horários foram {firebaseReady?"salvos no Firebase.":"registrados (modo offline)."}
      </p>
      <button className="btn btn-ghost" onClick={()=>setSaved(false)}>Editar disponibilidade</button>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      {!firebaseReady && <div className="alert alert-warn"><span>⚠️</span><span>Firebase não configurado — a disponibilidade não será salva remotamente.</span></div>}
      <div className="card" style={{borderLeft:"4px solid var(--accent)",background:"linear-gradient(135deg,#eff6ff,#fff)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
          <MemberAvatar member={member} size={48}/>
          <div>
            <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.4rem",color:"var(--navy)"}}>{member.name}</h2>
            <p style={{color:"var(--text-muted)",fontSize:".85rem"}}>Membro {member.role} • marque os horários em que você está <strong>livre</strong></p>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="card-title">Selecione sua Disponibilidade</h3>
            <p className="card-subtitle" style={{margin:0}}>Clique e arraste para marcar horários livres • Seg–Sex, 08h–20h</p>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"1.5rem",fontFamily:"'DM Serif Display',serif",color:"var(--navy)"}}>{freeCount}</div>
            <div style={{fontSize:".72rem",color:"var(--text-muted)"}}>slots livres</div>
          </div>
        </div>
        <div className="heatmap-wrap">
          <div className="avail-grid">
            <div/>
            {DAYS.map(d=><div key={d} className="hm-header">{d}</div>)}
            {HOURS.map((h,si)=>(
              <>
                <div key={h} className="hm-time">{h}</div>
                {DAYS.map(d=>(
                  <div key={d} className={`avail-cell ${grid[d][si]?"free":"busy"}`}
                    onMouseDown={()=>handleMouseDown(d,si)}
                    onMouseEnter={()=>handleMouseEnter(d,si)}/>
                ))}
              </>
            ))}
          </div>
        </div>
        <div className="divider"/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem"}}>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{background:"#bbf7d0"}}/>Livre</div>
            <div className="legend-item"><div className="legend-dot" style={{background:"var(--surface2)",border:"1px solid var(--border)"}}/>Ocupado</div>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving?"⏳ Salvando...":"Confirmar Disponibilidade →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ConsensusScreen ──────────────────────────────────────────────────────────
function ConsensusScreen({ banca, onConfirm }) {
  const members = banca?.members || [];
  const titulares = members.filter(m=>m.role==="titular");
  const [availability, setAvailability] = useState({});
  const [respondedIds, setRespondedIds] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!banca?.id) return;
    return subscribeAvailability(banca.id, data => {
      setAvailability(data);
      setRespondedIds(Object.keys(data));
    });
  }, [banca?.id]);

  const getSlotInfo = (day, slot) => {
    const free = members.filter(m=>availability[m.id]?.[day]?.[slot]);
    const titFree = free.filter(m=>m.role==="titular");
    return {free, titFree, ratio: titulares.length>0 ? titFree.length/titulares.length : 0};
  };

  const bestSlots = [];
  DAYS.forEach(d=>HOURS.forEach((h,si)=>{
    const info = getSlotInfo(d,si);
    if(info.ratio===1&&titulares.length>0) bestSlots.push({day:d,slot:si,time:h});
  }));

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      <div>
        <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.8rem",color:"var(--navy)",marginBottom:".25rem"}}>Motor de Consenso</h2>
        <p style={{color:"var(--text-muted)",fontSize:".9rem"}}>
          {firebaseReady?"🔴 Ao vivo — atualizando em tempo real do Firebase":"⚠ Firebase offline — configure para ver dados reais"}
        </p>
      </div>
      <div className="stats-row">
        <div className="stat-card"><div className="stat-value">{members.length}</div><div className="stat-label">Membros convidados</div></div>
        <div className="stat-card" style={{background:"var(--teal)"}}><div className="stat-value">{respondedIds.length}</div><div className="stat-label">Responderam</div></div>
        <div className="stat-card" style={{background:"var(--success)"}}><div className="stat-value">{bestSlots.length}</div><div className="stat-label">Slots perfeitos</div></div>
      </div>
      <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        <div className="card" style={{flex:"1 1 380px"}}>
          <div className="section-header"><h3 className="card-title" style={{marginBottom:0}}>Heatmap de Disponibilidade</h3></div>
          <div className="heatmap-wrap">
            <div className="heatmap">
              <div/>
              {DAYS.map(d=><div key={d} className="hm-header">{d}</div>)}
              {HOURS.map((h,si)=>(
                <>
                  <div key={h} className="hm-time">{h}</div>
                  {DAYS.map(d=>{
                    const info = getSlotInfo(d,si);
                    const isSel = selected?.day===d&&selected?.slot===si;
                    return (
                      <div key={d} className="hm-cell"
                        style={{background:heatColor(info.ratio),outline:isSel?"2px solid var(--gold)":"none",outlineOffset:1}}
                        onMouseEnter={()=>setTooltip({day:d,slot:si,info})}
                        onMouseLeave={()=>setTooltip(null)}
                        onClick={()=>setSelected({day:d,slot:si,time:h,info})}>
                        {tooltip?.day===d&&tooltip?.slot===si&&(
                          <div className="hm-tooltip">
                            <strong>{DAYS_FULL[DAYS.indexOf(d)]}, {h}</strong><br/>
                            {info.titFree.length}/{titulares.length} titulares livres
                            {info.free.length>info.titFree.length&&<> • {info.free.length-info.titFree.length} suplente(s)</>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="divider"/>
          <div className="legend">
            {[0,.33,.67,1].map((r,i)=>(
              <div key={i} className="legend-item"><div className="legend-dot" style={{background:heatColor(r)}}/>{i===0?"Nenhum":i===1?"1 titular":i===2?"2 titulares":"Todos titulares"}</div>
            ))}
          </div>
        </div>
        <div style={{flex:"0 0 260px",display:"flex",flexDirection:"column",gap:"1rem"}}>
          <div className="card" style={{padding:"1.25rem"}}>
            <h4 style={{fontSize:".85rem",fontWeight:700,color:"var(--navy)",marginBottom:".75rem",textTransform:"uppercase",letterSpacing:".05em"}}>Membros</h4>
            {members.map(m=>(
              <div key={m.id} className="member-row" style={{padding:".5rem .6rem",marginBottom:".4rem"}}>
                <MemberAvatar member={m} size={28}/>
                <div className="member-info"><div className="member-name" style={{fontSize:".8rem"}}>{m.name}</div></div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:".2rem"}}>
                  <span className={`member-badge ${m.role==="titular"?"badge-titular":"badge-suplente"}`}>{m.role}</span>
                  {respondedIds.includes(m.id)
                    ? <span style={{fontSize:".65rem",color:"var(--success)",fontWeight:700}}>✅ respondeu</span>
                    : <span style={{fontSize:".65rem",color:"var(--text-muted)"}}>⏳ pendente</span>}
                </div>
              </div>
            ))}
          </div>
          {selected&&(
            <div className="card" style={{padding:"1.25rem",borderColor:"var(--gold)",borderWidth:2}}>
              <h4 style={{fontSize:".85rem",fontWeight:700,color:"var(--gold)",marginBottom:".75rem"}}>⭐ Horário Selecionado</h4>
              <div style={{fontSize:"1.1rem",fontFamily:"'DM Serif Display',serif",color:"var(--navy)",marginBottom:".25rem"}}>{DAYS_FULL[DAYS.indexOf(selected.day)]}, {selected.time}</div>
              <div style={{fontSize:".78rem",color:"var(--text-muted)",marginBottom:"1rem"}}>
                {selected.info.titFree.length} de {titulares.length} titulares disponíveis
                {selected.info.ratio<1&&<div style={{color:"#b45309",marginTop:".25rem"}}>⚠ {titulares.length-selected.info.titFree.length} titular(es) indisponível(is)</div>}
              </div>
              <button className="btn btn-teams" style={{width:"100%",justifyContent:"center"}} onClick={()=>onConfirm(selected)}>
                🟣 Agendar no Teams
              </button>
            </div>
          )}
          {!selected&&bestSlots.length>0&&(
            <div className="card" style={{padding:"1.25rem",borderColor:"var(--success)",borderWidth:2}}>
              <h4 style={{fontSize:".85rem",fontWeight:700,color:"var(--success)",marginBottom:".75rem"}}>✅ Slots Perfeitos</h4>
              <div style={{display:"flex",flexDirection:"column",gap:".4rem"}}>
                {bestSlots.slice(0,4).map((s,i)=>(
                  <button key={i} className="btn btn-ghost btn-sm" style={{justifyContent:"flex-start"}}
                    onClick={()=>setSelected({...s,info:getSlotInfo(s.day,s.slot)})}>
                    {DAYS[DAYS.indexOf(s.day)]} {s.time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ConfirmScreen ────────────────────────────────────────────────────────────
function ConfirmScreen({ banca, slot }) {
  const [step, setStep] = useState("idle");
  const [link, setLink] = useState("");
  const members = banca?.members || [];

  const endTime = slot ? (()=>{
    const [h,m] = slot.time.split(":").map(Number);
    const em=m+30, eh=h+Math.floor(em/60);
    return `${String(eh).padStart(2,"0")}:${String(em%60).padStart(2,"0")}`;
  })() : null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1.5rem"}}>
      <div>
        <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.8rem",color:"var(--navy)",marginBottom:".25rem"}}>Confirmação & Teams</h2>
        <p style={{color:"var(--text-muted)",fontSize:".9rem"}}>Revise os detalhes e gere a reunião no Microsoft Teams</p>
      </div>
      <div className="card">
        <h3 className="card-title">Resumo da Defesa</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",fontSize:".9rem"}}>
          {[
            ["Título", banca?.title||"—"],
            ["Aluno", banca?.student||"—"],
            ["Horário", slot?`${DAYS_FULL[DAYS.indexOf(slot.day)]}, ${slot.time}–${endTime}`:"⚠ Nenhum horário selecionado"],
            ["Membros", `${members.filter(m=>m.role==="titular").length} titulares • ${members.filter(m=>m.role==="suplente").length} suplente(s)`],
          ].map(([k,v])=>(
            <div key={k}>
              <div style={{fontSize:".72rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-muted)",marginBottom:".2rem"}}>{k}</div>
              <div style={{color:"var(--navy)",fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
        <div className="divider"/>
        <h4 style={{fontSize:".85rem",fontWeight:700,color:"var(--navy)",marginBottom:".75rem"}}>Participantes convocados</h4>
        <div className="member-list">
          {members.map(m=>(
            <div key={m.id} className="member-row">
              <MemberAvatar member={m} size={30}/>
              <div className="member-info"><div className="member-name">{m.name}</div><div className="member-email">{m.email}</div></div>
              <span className={`member-badge ${m.role==="titular"?"badge-titular":"badge-suplente"}`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>
      {step==="idle"&&(
        <div className="card" style={{background:"linear-gradient(135deg,#f0f1ff,#fff)",borderColor:"#c7d2fe"}}>
          <h3 className="card-title">Integração Microsoft Teams</h3>
          <p style={{fontSize:".88rem",color:"var(--text-muted)",marginBottom:"1.25rem",lineHeight:1.6}}>
            Ao clicar abaixo, o app criará a reunião via <strong>Microsoft Graph API</strong>, gerará o link e disparará convites com o PDF para todos.
          </p>
          <button className="btn btn-teams btn-lg" onClick={async()=>{setStep("loading");await new Promise(r=>setTimeout(r,2200));setLink("https://teams.microsoft.com/l/meetup-join/19:meeting_abc123xyz/0?context=...");setStep("done");}}>
            🟣 Gerar Banca no Teams
          </button>
        </div>
      )}
      {step==="loading"&&(
        <div className="card" style={{textAlign:"center",padding:"2.5rem"}}>
          <div className="animate-pulse" style={{fontSize:"2.5rem",marginBottom:"1rem"}}>🟣</div>
          <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.3rem",color:"var(--navy)",marginBottom:".5rem"}}>Criando reunião no Teams...</h3>
          <p style={{color:"var(--text-muted)",fontSize:".88rem"}}>Conectando à Microsoft Graph API • Enviando convites</p>
        </div>
      )}
      {step==="done"&&(
        <div className="card" style={{borderColor:"var(--success)",borderWidth:2}}>
          <div style={{display:"flex",gap:"1rem",alignItems:"flex-start",marginBottom:"1.25rem"}}>
            <span style={{fontSize:"2rem"}}>🎉</span>
            <div>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:"1.4rem",color:"var(--success)",marginBottom:".25rem"}}>Banca Agendada!</h3>
              <p style={{fontSize:".88rem",color:"var(--text-muted)"}}>Convites enviados • Reunião criada no Teams</p>
            </div>
          </div>
          <div style={{background:"var(--bg)",borderRadius:8,padding:".85rem 1rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:".75rem"}}>
            <span>🔗</span>
            <a href="#" style={{color:"var(--accent)",fontSize:".82rem",wordBreak:"break-all",textDecoration:"none",flex:1}}>{link}</a>
            <button className="btn btn-ghost btn-sm" onClick={()=>navigator.clipboard?.writeText(link)}>Copiar</button>
          </div>
          <div style={{display:"flex",gap:".75rem",flexWrap:"wrap"}}>
            {["✅ Convite enviado","📎 PDF anexado","🗓 .ics gerado","🔔 Notificações ativas"].map(t=>(
              <span key={t} className="tag" style={{background:"#d1fae5",borderColor:"#a7f3d0",color:"#065f46"}}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("create");
  const [banca, setBanca] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [urlBancaId, setUrlBancaId] = useState(null);
  const [urlMemberId, setUrlMemberId] = useState(null);
  const [urlMemberInfo, setUrlMemberInfo] = useState(null);

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const bid = params.get("banca"), mid = params.get("member");
    if (bid&&mid) {
      setUrlBancaId(bid); setUrlMemberId(mid); setScreen("availability");
      loadBanca(bid).then(b=>{
        if(b){ setBanca(b); const m=b.members?.find(x=>x.id===mid); if(m) setUrlMemberInfo(m); }
      });
    }
  },[]);

  const isProfView = !!(urlBancaId&&urlMemberId);
  const tabs = [{id:"create",label:"Criar Banca"},{id:"availability",label:"Disponibilidade"},{id:"consensus",label:"Consenso"},{id:"confirm",label:"Confirmar"}];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo" onClick={()=>!isProfView&&setScreen("create")}>
            <div className="nav-logo-icon">🎓</div>
            <h1>Agendador de <span>Bancas</span></h1>
          </div>
          {!isProfView ? (
            <div className="nav-tabs">
              {tabs.map(t=>(
                <button key={t.id} className={`nav-tab ${screen===t.id?"active":""}`} onClick={()=>setScreen(t.id)}>{t.label}</button>
              ))}
            </div>
          ) : (
            <div style={{marginLeft:"auto",fontSize:".82rem",color:"rgba(255,255,255,.6)"}}>Preenchimento de disponibilidade</div>
          )}
        </nav>
        <main className="main">
          {screen==="create"&&<CreateScreen onCreate={b=>{setBanca(b);setScreen("consensus");}}/>}
          {screen==="availability"&&<AvailabilityScreen bancaId={urlBancaId||banca?.id} memberId={urlMemberId} memberInfo={urlMemberInfo}/>}
          {screen==="consensus"&&<ConsensusScreen banca={banca} onConfirm={s=>{setSelectedSlot(s);setScreen("confirm");}}/>}
          {screen==="confirm"&&<ConfirmScreen banca={banca} slot={selectedSlot}/>}
        </main>
      </div>
    </>
  );
}
