import { useState, useCallback, useRef, useEffect } from "react";

// ─── Data & Helpers ────────────────────────────────────────────────────────────
const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const HOURS = Array.from({ length: 25 }, (_, i) => {
  const h = 8 + Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
}).filter((_, i) => i < 24); // 08:00–19:30

const SLOT_COUNT = 24;

const generateId = () => Math.random().toString(36).substr(2, 9);

const MOCK_MEMBERS = [
  { id: "1", name: "Prof. Dr. Ricardo Almeida", email: "r.almeida@usp.br", role: "titular", color: "#1e40af" },
  { id: "2", name: "Profa. Dra. Fernanda Costa", email: "f.costa@unicamp.br", role: "titular", color: "#0f766e" },
  { id: "3", name: "Prof. Dr. Marco Oliveira", email: "m.oliveira@ufrj.br", role: "titular", color: "#7c3aed" },
  { id: "4", name: "Profa. Dra. Ana Beatriz", email: "a.beatriz@ufmg.br", role: "suplente", color: "#b45309" },
];

const generateMockAvailability = () => {
  const result = {};
  MOCK_MEMBERS.forEach((m) => {
    result[m.id] = {};
    DAYS.forEach((d) => {
      result[m.id][d] = Array.from({ length: SLOT_COUNT }, () => Math.random() > 0.45);
    });
  });
  return result;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy: #0f2240;
    --navy-mid: #1a3560;
    --navy-light: #2a4f8a;
    --accent: #3b82f6;
    --accent-glow: rgba(59,130,246,0.25);
    --teal: #0d9488;
    --gold: #d97706;
    --bg: #f4f6fb;
    --surface: #ffffff;
    --surface2: #eef1f8;
    --text: #0f2240;
    --text-muted: #64748b;
    --border: #d1d9e8;
    --success: #059669;
    --radius: 12px;
    --shadow: 0 2px 16px rgba(15,34,64,0.10);
    --shadow-lg: 0 8px 40px rgba(15,34,64,0.14);
  }

  html, body, #root { height: 100%; font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); }

  h1, h2, h3 { font-family: 'DM Serif Display', serif; }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* NAV */
  .nav {
    background: var(--navy);
    padding: 0 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    height: 60px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 20px rgba(0,0,0,0.3);
  }
  .nav-logo { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; }
  .nav-logo-icon {
    width: 32px; height: 32px; background: var(--accent);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    font-size: 16px;
  }
  .nav-logo h1 { font-size: 1.25rem; color: #fff; letter-spacing: -0.02em; }
  .nav-logo span { color: var(--accent); font-style: italic; }
  .nav-tabs { display: flex; gap: 0.25rem; margin-left: auto; }
  .nav-tab {
    padding: 0.4rem 1rem; border-radius: 8px; border: none; cursor: pointer;
    font-family: inherit; font-size: 0.85rem; font-weight: 500; transition: all 0.2s;
    color: rgba(255,255,255,0.65); background: transparent;
  }
  .nav-tab:hover { color: #fff; background: rgba(255,255,255,0.08); }
  .nav-tab.active { color: #fff; background: var(--accent); }
  .nav-badge {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--gold); color: white; font-size: 0.65rem; font-weight: 700;
    width: 16px; height: 16px; border-radius: 50%; margin-left: 4px; vertical-align: middle;
  }

  /* MAIN */
  .main { flex: 1; padding: 2rem; max-width: 1100px; margin: 0 auto; width: 100%; }

  /* CARDS */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.75rem;
    box-shadow: var(--shadow);
  }
  .card-title { font-size: 1.35rem; color: var(--navy); margin-bottom: 0.35rem; }
  .card-subtitle { font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.5rem; }

  /* FORM */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-group { display: flex; flex-direction: column; gap: 0.4rem; }
  .form-group.full { grid-column: 1 / -1; }
  .form-label { font-size: 0.8rem; font-weight: 600; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }
  .form-input, .form-select, .form-textarea {
    padding: 0.6rem 0.85rem;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.9rem;
    color: var(--text);
    background: var(--bg);
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: #fff;
  }
  .form-textarea { resize: vertical; min-height: 80px; }

  /* MEMBER ROW */
  .member-list { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
  .member-row {
    display: flex; align-items: center; gap: 0.75rem;
    padding: 0.65rem 0.9rem;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 8px;
    transition: border-color 0.2s;
  }
  .member-row:hover { border-color: var(--accent); }
  .member-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 700; color: white; flex-shrink: 0;
  }
  .member-info { flex: 1; min-width: 0; }
  .member-name { font-size: 0.88rem; font-weight: 600; color: var(--navy); }
  .member-email { font-size: 0.78rem; color: var(--text-muted); }
  .member-badge {
    font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.5rem;
    border-radius: 99px; text-transform: uppercase; letter-spacing: 0.04em;
  }
  .badge-titular { background: #dbeafe; color: #1e40af; }
  .badge-suplente { background: #fef3c7; color: #92400e; }

  /* BUTTONS */
  .btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.6rem 1.25rem; border-radius: 8px; border: none;
    font-family: inherit; font-size: 0.88rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s; text-decoration: none;
  }
  .btn-primary { background: var(--navy); color: white; }
  .btn-primary:hover { background: var(--navy-mid); transform: translateY(-1px); box-shadow: var(--shadow); }
  .btn-accent { background: var(--accent); color: white; }
  .btn-accent:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(59,130,246,0.4); }
  .btn-teams { background: #5b5fc7; color: white; }
  .btn-teams:hover { background: #4a4fb5; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(91,95,199,0.4); }
  .btn-ghost { background: transparent; color: var(--text-muted); border: 1.5px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .btn-success { background: var(--success); color: white; }
  .btn-sm { padding: 0.4rem 0.85rem; font-size: 0.8rem; }
  .btn-lg { padding: 0.8rem 1.75rem; font-size: 0.95rem; border-radius: 10px; }

  /* HEATMAP */
  .heatmap-wrap { overflow-x: auto; }
  .heatmap {
    display: grid;
    grid-template-columns: 52px repeat(5, 1fr);
    gap: 2px;
    min-width: 560px;
  }
  .hm-header {
    font-size: 0.75rem; font-weight: 700; color: var(--navy-mid);
    text-align: center; padding: 0.5rem 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .hm-time {
    font-size: 0.68rem; color: var(--text-muted); text-align: right; padding-right: 6px;
    display: flex; align-items: center; justify-content: flex-end; height: 22px;
  }
  .hm-cell {
    height: 22px; border-radius: 3px; cursor: pointer; position: relative;
    transition: transform 0.1s, filter 0.1s;
  }
  .hm-cell:hover { transform: scaleY(1.15); filter: brightness(1.15); z-index: 2; }
  .hm-tooltip {
    position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%);
    background: var(--navy); color: white; font-size: 0.72rem; padding: 0.45rem 0.65rem;
    border-radius: 6px; white-space: nowrap; z-index: 20; pointer-events: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  .hm-tooltip::after {
    content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    border: 5px solid transparent; border-top-color: var(--navy);
  }

  /* AVAILABILITY GRID (Professor) */
  .avail-grid {
    display: grid;
    grid-template-columns: 52px repeat(5, 1fr);
    gap: 2px;
    min-width: 560px;
    user-select: none;
  }
  .avail-cell {
    height: 22px; border-radius: 3px; cursor: pointer;
    transition: background 0.1s, transform 0.1s;
  }
  .avail-cell.free { background: #bbf7d0; }
  .avail-cell.free:hover { background: #4ade80; }
  .avail-cell.busy { background: var(--surface2); border: 1px solid var(--border); }
  .avail-cell.busy:hover { background: #dbeafe; }
  .avail-cell.dragging { background: #86efac !important; }

  /* LEGEND */
  .legend { display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--text-muted); }
  .legend-dot { width: 12px; height: 12px; border-radius: 3px; }

  /* STATUS PILLS */
  .status-row { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
  .status-pill {
    display: flex; align-items: center; gap: 0.4rem;
    padding: 0.35rem 0.9rem; border-radius: 99px;
    font-size: 0.78rem; font-weight: 600;
  }
  .pill-waiting { background: #fef3c7; color: #92400e; }
  .pill-done { background: #d1fae5; color: #065f46; }
  .pill-pending { background: #e0e7ff; color: #3730a3; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(15,34,64,0.55);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; backdrop-filter: blur(4px);
    animation: fadeIn 0.2s ease;
  }
  .modal {
    background: white; border-radius: 16px; padding: 2rem;
    max-width: 500px; width: 90%; box-shadow: var(--shadow-lg);
    animation: slideUp 0.25s ease;
  }
  .modal h2 { font-size: 1.5rem; color: var(--navy); margin-bottom: 0.5rem; }
  .modal p { font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; }

  /* DIVIDER */
  .divider { height: 1px; background: var(--border); margin: 1.25rem 0; }

  /* SECTION HEADER */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; gap: 1rem; }
  .section-title { font-size: 1.1rem; font-weight: 700; color: var(--navy); }

  /* STATS ROW */
  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card {
    background: var(--navy); color: white; border-radius: 10px; padding: 1rem 1.25rem;
    position: relative; overflow: hidden;
  }
  .stat-card::after {
    content: ''; position: absolute; top: -20px; right: -20px;
    width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%;
  }
  .stat-value { font-size: 2rem; font-family: 'DM Serif Display', serif; line-height: 1; }
  .stat-label { font-size: 0.75rem; opacity: 0.7; margin-top: 0.3rem; }

  /* STEP INDICATOR */
  .steps { display: flex; align-items: center; gap: 0; margin-bottom: 2rem; }
  .step { display: flex; align-items: center; gap: 0.5rem; }
  .step-num {
    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 0.75rem; font-weight: 700;
  }
  .step-num.done { background: var(--success); color: white; }
  .step-num.active { background: var(--navy); color: white; }
  .step-num.future { background: var(--surface2); color: var(--text-muted); }
  .step-label { font-size: 0.8rem; font-weight: 500; }
  .step-label.active { color: var(--navy); }
  .step-label.done { color: var(--success); }
  .step-label.future { color: var(--text-muted); }
  .step-connector { flex: 1; height: 2px; background: var(--border); max-width: 48px; }
  .step-connector.done { background: var(--success); }

  /* ALERT */
  .alert { border-radius: 8px; padding: 0.9rem 1.1rem; font-size: 0.88rem; display: flex; gap: 0.6rem; align-items: flex-start; }
  .alert-info { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
  .alert-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }

  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes pulse { 0%,100%{ opacity:1 } 50%{ opacity:0.5 } }
  .animate-pulse { animation: pulse 2s infinite; }

  .tag { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.55rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; font-size: 0.75rem; color: var(--text-muted); }

  @media (max-width: 640px) {
    .main { padding: 1rem; }
    .form-grid { grid-template-columns: 1fr; }
    .stats-row { grid-template-columns: 1fr 1fr; }
  }
`;

// ─── Heatmap color ─────────────────────────────────────────────────────────────
function heatColor(ratio) {
  if (ratio === 0) return "#eef1f8";
  if (ratio < 0.34) return "#bfdbfe";
  if (ratio < 0.67) return "#60a5fa";
  if (ratio < 1) return "#1d4ed8";
  return "#065f46";
}

// ─── Components ───────────────────────────────────────────────────────────────
function MemberAvatar({ member, size = 32 }) {
  const initials = member.name.split(" ").filter(w => /^[A-Z]/.test(w)).slice(0,2).map(w=>w[0]).join("");
  return (
    <div className="member-avatar" style={{ background: member.color, width: size, height: size, fontSize: size * 0.3 }}>
      {initials}
    </div>
  );
}

// ─── Screen: Create ───────────────────────────────────────────────────────────
function CreateScreen({ onCreate }) {
  const [title, setTitle] = useState("");
  const [student, setStudent] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const [date, setDate] = useState("");
  const [members, setMembers] = useState([
    { id: generateId(), name: "", email: "", role: "titular" },
    { id: generateId(), name: "", email: "", role: "titular" },
    { id: generateId(), name: "", email: "", role: "titular" },
  ]);

  const addMember = () => {
    if (members.length < 5)
      setMembers(m => [...m, { id: generateId(), name: "", email: "", role: "titular" }]);
  };

  const updateMember = (id, field, value) => {
    setMembers(m => m.map(x => x.id === id ? { ...x, [field]: value } : x));
  };
  const removeMember = (id) => setMembers(m => m.filter(x => x.id !== id));

  const handleSubmit = () => {
    if (!title || !student) return;
    onCreate({ title, student, pdfLink, date, members });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "var(--navy)", marginBottom: "0.25rem" }}>
          Nova Banca Acadêmica
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Preencha os dados abaixo para iniciar o processo de agendamento</p>
      </div>

      <div className="steps">
        <div className="step"><div className="step-num active">1</div><span className="step-label active">Dados</span></div>
        <div className="step-connector" />
        <div className="step"><div className="step-num future">2</div><span className="step-label future">Disponibilidade</span></div>
        <div className="step-connector" />
        <div className="step"><div className="step-num future">3</div><span className="step-label future">Consenso</span></div>
        <div className="step-connector" />
        <div className="step"><div className="step-num future">4</div><span className="step-label future">Confirmar</span></div>
      </div>

      <div className="card">
        <h3 className="card-title">Informações do Trabalho</h3>
        <p className="card-subtitle">Dados básicos sobre a defesa a ser agendada</p>
        <div className="form-grid">
          <div className="form-group full">
            <label className="form-label">Título do Trabalho *</label>
            <input className="form-input" placeholder="Ex: Redes Neurais Aplicadas à Detecção de Fraudes..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Nome do Aluno/Orientando *</label>
            <input className="form-input" placeholder="Nome completo" value={student} onChange={e => setStudent(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Data Desejada (orientação)</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group full">
            <label className="form-label">Link do PDF / Repositório</label>
            <input className="form-input" placeholder="https://drive.google.com/..." value={pdfLink} onChange={e => setPdfLink(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="card-title">Membros da Banca</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>3 a 5 membros • identifique titulares e suplentes</p>
          </div>
          {members.length < 5 && (
            <button className="btn btn-ghost btn-sm" onClick={addMember}>+ Adicionar membro</button>
          )}
        </div>

        <div className="member-list">
          {members.map((m, i) => (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: "0.6rem", alignItems: "center" }}>
              <input className="form-input" placeholder={`Nome — Membro ${i + 1}`} value={m.name} onChange={e => updateMember(m.id, "name", e.target.value)} />
              <input className="form-input" placeholder="e-mail institucional" value={m.email} onChange={e => updateMember(m.id, "email", e.target.value)} />
              <select className="form-select" value={m.role} onChange={e => updateMember(m.id, "role", e.target.value)} style={{ width: 110 }}>
                <option value="titular">Titular</option>
                <option value="suplente">Suplente</option>
              </select>
              {members.length > 3 && (
                <button className="btn btn-ghost btn-sm" onClick={() => removeMember(m.id)} style={{ color: "#ef4444", borderColor: "#fca5a5", padding: "0.4rem 0.6rem" }}>✕</button>
              )}
            </div>
          ))}
        </div>

        <div className="alert alert-info">
          <span>💡</span>
          <span>Cada membro receberá um link único por e-mail para preencher sua disponibilidade na semana.</span>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
        <button className="btn btn-ghost">Salvar rascunho</button>
        <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={!title || !student}>
          Criar Banca e Enviar Convites →
        </button>
      </div>
    </div>
  );
}

// ─── Screen: Professor Availability ──────────────────────────────────────────
function AvailabilityScreen({ member }) {
  const [grid, setGrid] = useState(() =>
    Object.fromEntries(DAYS.map(d => [d, new Array(SLOT_COUNT).fill(false)]))
  );
  const [dragging, setDragging] = useState(false);
  const [dragValue, setDragValue] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleCell = (day, slot, value) => {
    setGrid(g => ({ ...g, [day]: g[day].map((v, i) => (i === slot ? value : v)) }));
  };

  const handleMouseDown = (day, slot) => {
    const newVal = !grid[day][slot];
    setDragging(true);
    setDragValue(newVal);
    toggleCell(day, slot, newVal);
  };

  const handleMouseEnter = (day, slot) => {
    if (dragging) toggleCell(day, slot, dragValue);
  };

  useEffect(() => {
    const up = () => setDragging(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const freeCount = Object.values(grid).flat().filter(Boolean).length;

  if (saved) return (
    <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "var(--navy)", marginBottom: "0.5rem" }}>
        Disponibilidade Registrada!
      </h2>
      <p style={{ color: "var(--text-muted)", maxWidth: 400, margin: "0 auto 1.5rem" }}>
        Obrigado, <strong>{member.name}</strong>! Suas {freeCount} faixas de horário foram salvas. O orientando será notificado quando todos responderem.
      </p>
      <span className="tag">🔒 Você pode fechar esta janela</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div className="card" style={{ borderLeft: "4px solid var(--accent)", background: "linear-gradient(135deg,#eff6ff,#fff)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <MemberAvatar member={member} size={48} />
          <div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "var(--navy)" }}>{member.name}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Você foi convidado(a) para compor a banca de <strong>Maria Clara Souza</strong> • {member.role === "titular" ? "Membro Titular" : "Membro Suplente"}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3 className="card-title">Selecione sua Disponibilidade</h3>
            <p className="card-subtitle" style={{ margin: 0 }}>Clique e arraste para marcar os horários em que você está <strong>livre</strong> • Segunda a Sexta, 08h–20h</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.5rem", fontFamily: "'DM Serif Display', serif", color: "var(--navy)" }}>{freeCount}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>slots livres</div>
          </div>
        </div>

        <div className="heatmap-wrap">
          <div className="avail-grid">
            <div />
            {DAYS.map(d => <div key={d} className="hm-header">{d}</div>)}
            {HOURS.map((h, si) => (
              <>
                <div key={h} className="hm-time">{h}</div>
                {DAYS.map(d => (
                  <div
                    key={d}
                    className={`avail-cell ${grid[d][si] ? "free" : "busy"}`}
                    onMouseDown={() => handleMouseDown(d, si)}
                    onMouseEnter={() => handleMouseEnter(d, si)}
                  />
                ))}
              </>
            ))}
          </div>
        </div>

        <div className="divider" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{ background: "#bbf7d0" }} />Livre</div>
            <div className="legend-item"><div className="legend-dot" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }} />Ocupado</div>
          </div>
          <button className="btn btn-primary" onClick={() => setSaved(true)}>
            Confirmar Disponibilidade →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen: Consensus / Heatmap ─────────────────────────────────────────────
function ConsensusScreen({ banca, onConfirm }) {
  const availability = useRef(generateMockAvailability()).current;
  const [tooltip, setTooltip] = useState(null);
  const [selected, setSelected] = useState(null);
  const titulares = MOCK_MEMBERS.filter(m => m.role === "titular");
  const suplentes = MOCK_MEMBERS.filter(m => m.role === "suplente");

  const getSlotInfo = (day, slot) => {
    const free = MOCK_MEMBERS.filter(m => availability[m.id]?.[day]?.[slot]);
    const titFree = free.filter(m => m.role === "titular");
    return { free, titFree, ratio: titFree.length / titulares.length };
  };

  const bestSlots = [];
  DAYS.forEach(d => HOURS.forEach((h, si) => {
    const info = getSlotInfo(d, si);
    if (info.ratio === 1) bestSlots.push({ day: d, slot: si, time: h });
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "var(--navy)", marginBottom: "0.25rem" }}>
          Motor de Consenso
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Sobreposição das disponibilidades • quanto mais escuro, mais membros estão livres</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{MOCK_MEMBERS.length}</div>
          <div className="stat-label">Membros convidados</div>
        </div>
        <div className="stat-card" style={{ background: "var(--teal)" }}>
          <div className="stat-value">{MOCK_MEMBERS.length}</div>
          <div className="stat-label">Responderam</div>
        </div>
        <div className="stat-card" style={{ background: "var(--success)" }}>
          <div className="stat-value">{bestSlots.length}</div>
          <div className="stat-label">Slots perfeitos</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div className="card" style={{ flex: "1 1 380px" }}>
          <div className="section-header">
            <h3 className="card-title" style={{ marginBottom: 0 }}>Heatmap de Disponibilidade</h3>
          </div>
          <div className="heatmap-wrap">
            <div className="heatmap">
              <div />
              {DAYS.map(d => <div key={d} className="hm-header">{d}</div>)}
              {HOURS.map((h, si) => (
                <>
                  <div key={h} className="hm-time">{h}</div>
                  {DAYS.map(d => {
                    const info = getSlotInfo(d, si);
                    const isSelected = selected?.day === d && selected?.slot === si;
                    return (
                      <div
                        key={d}
                        className="hm-cell"
                        style={{
                          background: heatColor(info.ratio),
                          outline: isSelected ? "2px solid var(--gold)" : "none",
                          outlineOffset: 1,
                        }}
                        onMouseEnter={e => setTooltip({ day: d, slot: si, x: e.clientX, y: e.clientY, info })}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => setSelected({ day: d, slot: si, time: h, info })}
                      >
                        {tooltip?.day === d && tooltip?.slot === si && (
                          <div className="hm-tooltip">
                            <strong>{DAYS_FULL[DAYS.indexOf(d)]}, {h}</strong><br />
                            {info.titFree.length}/{titulares.length} titulares livres
                            {info.free.length > info.titFree.length && <> • {info.free.length - info.titFree.length} suplente(s)</>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          <div className="divider" />
          <div className="legend">
            {[0, 0.33, 0.67, 1].map((r, i) => (
              <div key={i} className="legend-item">
                <div className="legend-dot" style={{ background: heatColor(r) }} />
                {i === 0 ? "Nenhum" : i === 1 ? "1 titular" : i === 2 ? "2 titulares" : "Todos titulares"}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Membros</h4>
            {MOCK_MEMBERS.map(m => (
              <div key={m.id} className="member-row" style={{ padding: "0.5rem 0.6rem", marginBottom: "0.4rem" }}>
                <MemberAvatar member={m} size={28} />
                <div className="member-info">
                  <div className="member-name" style={{ fontSize: "0.8rem" }}>{m.name.replace("Prof. Dr. ","").replace("Profa. Dra. ","")}</div>
                </div>
                <span className={`member-badge ${m.role === "titular" ? "badge-titular" : "badge-suplente"}`}>{m.role}</span>
              </div>
            ))}
          </div>

          {selected && (
            <div className="card" style={{ padding: "1.25rem", borderColor: "var(--gold)", borderWidth: 2 }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--gold)", marginBottom: "0.75rem" }}>⭐ Horário Selecionado</h4>
              <div style={{ fontSize: "1.1rem", fontFamily: "'DM Serif Display',serif", color: "var(--navy)", marginBottom: "0.25rem" }}>
                {DAYS_FULL[DAYS.indexOf(selected.day)]}, {selected.time}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                {selected.info.titFree.length} de {titulares.length} titulares disponíveis
                {selected.info.ratio < 1 && (
                  <div style={{ color: "#b45309", marginTop: "0.25rem" }}>
                    ⚠ {titulares.length - selected.info.titFree.length} titular(es) indisponível(is)
                    {suplentes.filter(s => selected.info.free.some(f => f.id === s.id)).length > 0 &&
                      " — suplente disponível"}
                  </div>
                )}
              </div>
              <button className="btn btn-teams" style={{ width: "100%", justifyContent: "center" }} onClick={() => onConfirm(selected)}>
                <span>🟣</span> Agendar no Teams
              </button>
            </div>
          )}

          {!selected && bestSlots.length > 0 && (
            <div className="card" style={{ padding: "1.25rem", borderColor: "var(--success)", borderWidth: 2 }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--success)", marginBottom: "0.75rem" }}>✅ Slots Perfeitos</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {bestSlots.slice(0, 4).map((s, i) => (
                  <button key={i} className="btn btn-ghost btn-sm" style={{ justifyContent: "flex-start" }}
                    onClick={() => setSelected({ ...s, info: getSlotInfo(s.day, s.slot) })}>
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

// ─── Screen: Confirm / Teams ──────────────────────────────────────────────────
function ConfirmScreen({ banca, slot }) {
  const [step, setStep] = useState("idle"); // idle | loading | done
  const [link, setLink] = useState("");

  const simulate = async () => {
    setStep("loading");
    await new Promise(r => setTimeout(r, 2200));
    setLink("https://teams.microsoft.com/l/meetup-join/19:meeting_abc123xyz/0?context=...");
    setStep("done");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.8rem", color: "var(--navy)", marginBottom: "0.25rem" }}>
          Confirmação & Teams
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Revise os detalhes e gere a reunião no Microsoft Teams</p>
      </div>

      <div className="card">
        <h3 className="card-title">Resumo da Defesa</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
          {[
            ["Título", banca?.title || "Redes Neurais Aplicadas à Detecção de Fraudes"],
            ["Aluno", banca?.student || "Maria Clara Souza"],
            ["Horário", slot ? `${DAYS_FULL[DAYS.indexOf(slot.day)]}, ${slot.time}–${String(Number(slot.time.split(":")[0]) + (Number(slot.time.split(":")[1]) === 30 ? 1 : 0)).toString().padStart(2,"0")}:${Number(slot.time.split(":")[1]) === 30 ? "00" : "30"}` : "⚠ Nenhum horário selecionado"],
            ["Membros", `${MOCK_MEMBERS.filter(m => m.role === "titular").length} titulares • ${MOCK_MEMBERS.filter(m => m.role === "suplente").length} suplente`],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{k}</div>
              <div style={{ color: "var(--navy)", fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
        <div className="divider" />
        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--navy)", marginBottom: "0.75rem" }}>Participantes convocados</h4>
        <div className="member-list">
          {MOCK_MEMBERS.map(m => (
            <div key={m.id} className="member-row">
              <MemberAvatar member={m} size={30} />
              <div className="member-info">
                <div className="member-name">{m.name}</div>
                <div className="member-email">{m.email}</div>
              </div>
              <span className={`member-badge ${m.role === "titular" ? "badge-titular" : "badge-suplente"}`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>

      {step === "idle" && (
        <div className="card" style={{ background: "linear-gradient(135deg,#f0f1ff,#fff)", borderColor: "#c7d2fe" }}>
          <h3 className="card-title">Integração Microsoft Teams</h3>
          <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Ao clicar no botão abaixo, o BancaMatch irá criar uma reunião via <strong>Microsoft Graph API</strong>, gerar o link do Teams e disparar convites (.ics) com o PDF da dissertação para todos os membros.
          </p>
          <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
            <span>🔗</span>
            <span>O PDF será incluído como anexo no e-mail e o link de acesso aparecerá no corpo da mensagem.</span>
          </div>
          <button className="btn btn-teams btn-lg" onClick={simulate}>
            <span>🟣</span> Gerar Banca no Teams
          </button>
        </div>
      )}

      {step === "loading" && (
        <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
          <div className="animate-pulse" style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🟣</div>
          <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.3rem", color: "var(--navy)", marginBottom: "0.5rem" }}>Criando reunião no Teams...</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Conectando à Microsoft Graph API • Enviando convites</p>
        </div>
      )}

      {step === "done" && (
        <div className="card" style={{ borderColor: "var(--success)", borderWidth: 2 }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "2rem" }}>🎉</div>
            <div>
              <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.4rem", color: "var(--success)", marginBottom: "0.25rem" }}>Banca Agendada com Sucesso!</h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)" }}>Convites enviados para {MOCK_MEMBERS.length} membros • Reunião criada no Teams</p>
            </div>
          </div>

          <div style={{ background: "var(--bg)", borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🔗</span>
            <a href="#" style={{ color: "var(--accent)", fontSize: "0.82rem", wordBreak: "break-all", textDecoration: "none", flex: 1 }}>{link}</a>
            <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(link)}>Copiar</button>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {["✅ Convite enviado", "📎 PDF anexado", "🗓 .ics gerado", "🔔 Notificações ativas"].map(t => (
              <span key={t} className="tag" style={{ background: "#d1fae5", borderColor: "#a7f3d0", color: "#065f46" }}>{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("create"); // create | availability | consensus | confirm
  const [banca, setBanca] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [activeMember, setActiveMember] = useState(MOCK_MEMBERS[0]);

  const tabs = [
    { id: "create", label: "Criar Banca" },
    { id: "availability", label: "Disponibilidade", badge: "4" },
    { id: "consensus", label: "Consenso" },
    { id: "confirm", label: "Confirmar" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-logo" onClick={() => setScreen("create")}>
            <div className="nav-logo-icon">🎓</div>
            <h1>Agendador de <span>Bancas</span></h1>
          </div>
          <div className="nav-tabs">
            {tabs.map(t => (
              <button key={t.id} className={`nav-tab ${screen === t.id ? "active" : ""}`} onClick={() => setScreen(t.id)}>
                {t.label}
                {t.badge && <span className="nav-badge">{t.badge}</span>}
              </button>
            ))}
          </div>
        </nav>

        <main className="main">
          {screen === "create" && (
            <CreateScreen onCreate={b => { setBanca(b); setScreen("availability"); }} />
          )}
          {screen === "availability" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Visualizando como:</span>
                {MOCK_MEMBERS.map(m => (
                  <button key={m.id}
                    className={`btn btn-sm ${activeMember.id === m.id ? "btn-accent" : "btn-ghost"}`}
                    onClick={() => setActiveMember(m)}>
                    {m.name.split(" ").slice(-1)[0]}
                  </button>
                ))}
              </div>
              <AvailabilityScreen member={activeMember} />
            </div>
          )}
          {screen === "consensus" && (
            <ConsensusScreen banca={banca} onConfirm={s => { setSelectedSlot(s); setScreen("confirm"); }} />
          )}
          {screen === "confirm" && (
            <ConfirmScreen banca={banca} slot={selectedSlot} />
          )}
        </main>
      </div>
    </>
  );
}
