// ══════════════════════════════════════════════════════════════
//  D&D 3.5 SCHEDE  —  APP
// ══════════════════════════════════════════════════════════════

// ── Helpers globali ──
const $  = id => document.getElementById(id);
const fmt = n => (n >= 0 ? '+' : '') + n;
const neg = n => n < 0 ? 'neg' : n > 0 ? 'pos' : '';

let PG    = null;   // personaggio corrente
let STATE = {};     // stato sessione corrente

// ══════════════════════════════════════════════════════════════
//  STORAGE — gestione personaggi salvati
// ══════════════════════════════════════════════════════════════
const PG_INDEX_KEY = 'dnd35_index';

function pgStateKey(name) {
  return 'dnd35_pg_' + name.toLowerCase().replace(/\s+/g, '_');
}
function pgDataKey(name) {
  return 'dnd35_pgdata_' + name.toLowerCase().replace(/\s+/g, '_');
}

function getIndex() {
  try { return JSON.parse(localStorage.getItem(PG_INDEX_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveIndex(idx) {
  localStorage.setItem(PG_INDEX_KEY, JSON.stringify(idx));
}

function savePGData(pg) {
  localStorage.setItem(pgDataKey(pg.name), JSON.stringify(pg));
  const idx = getIndex();
  if (!idx.includes(pg.name)) {
    idx.push(pg.name);
    saveIndex(idx);
  }
}

function loadPGData(name) {
  try { return JSON.parse(localStorage.getItem(pgDataKey(name))); }
  catch(e) { return null; }
}

function deletePG(name) {
  localStorage.removeItem(pgDataKey(name));
  localStorage.removeItem(pgStateKey(name));
  const idx = getIndex().filter(n => n !== name);
  saveIndex(idx);
}

function loadState(pg) {
  try {
    const raw = localStorage.getItem(pgStateKey(pg.name));
    if (raw) STATE = JSON.parse(raw);
    else STATE = {};
  } catch(e) { STATE = {}; }
  STATE.hp        = STATE.hp        ?? pg.hpCurr;
  STATE.nonLethal = STATE.nonLethal ?? pg.nonLethal;
  STATE.slotUsed  = STATE.slotUsed  ?? {};
  STATE.prepared  = STATE.prepared  ?? {};
  STATE.notes     = STATE.notes     ?? pg.notes;
  pg.grimoire.forEach(sp => {
    if (STATE.prepared[sp.id] === undefined) STATE.prepared[sp.id] = false;
  });
}

function saveState() {
  if (!PG) return;
  STATE.notes = $('notes-area')?.value || STATE.notes;
  try {
    localStorage.setItem(pgStateKey(PG.name), JSON.stringify(STATE));
    showToast('Salvato ✓');
    const btn = $('save-btn');
    if (btn) { btn.textContent = '✓ Salvato'; setTimeout(() => btn.textContent = 'Salva', 2000); }
  } catch(e) { showToast('Errore salvataggio', true); }
}

window.addEventListener('beforeunload', () => { if (PG) saveState(); });

// ══════════════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════════════
function showToast(msg, warn = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('warn', warn);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

// ══════════════════════════════════════════════════════════════
//  SCREEN ROUTING
// ══════════════════════════════════════════════════════════════
function showScreen(id) {
  ['home','import-screen','sheet-screen'].forEach(s => {
    const el = $(s);
    el.classList.remove('active');
  });
  $(id).classList.add('active');
}

// ══════════════════════════════════════════════════════════════
//  HOME SCREEN
// ══════════════════════════════════════════════════════════════
function renderHome() {
  showScreen('home');
  const idx   = getIndex();
  const grid  = $('pg-grid');
  const empty = $('pg-empty');

  if (idx.length === 0) {
    grid.innerHTML  = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = idx.map(name => {
      const pg = loadPGData(name);
      if (!pg) return '';
      const state = (() => {
        try { return JSON.parse(localStorage.getItem(pgStateKey(name)) || '{}'); }
        catch(e) { return {}; }
      })();
      const hp    = state.hp ?? pg.hpCurr;
      const emoji = getClassEmoji(pg.class1);
      const pct   = Math.round(hp / pg.hpMax * 100);
      const hpColor = pct > 50 ? 'var(--green2)' : pct > 25 ? 'var(--gold)' : 'var(--red2)';
      return `
        <div class="pg-card" onclick="openPG('${esc(name)}')">
          <button class="pg-card-delete" onclick="event.stopPropagation();confirmDelete('${esc(name)}')" title="Elimina">✕</button>
          <div class="pg-card-avatar">${emoji}</div>
          <div class="pg-card-name">${esc(pg.name)}</div>
          <div class="pg-card-sub">${esc(pg.race)} · ${esc(pg.class1)} Lv.${pg.level}</div>
          <div class="pg-card-hp" style="color:${hpColor}">${hp}/${pg.hpMax} PF</div>
        </div>`;
    }).join('');
  }
}

function getClassEmoji(cls) {
  const c = (cls || '').toLowerCase();
  if (c.includes('mago') || c.includes('wizard'))  return '🧙';
  if (c.includes('guerr') || c.includes('fighter'))return '⚔️';
  if (c.includes('ladro') || c.includes('rogue'))  return '🗡️';
  if (c.includes('chierico') || c.includes('cleric')) return '✝️';
  if (c.includes('druido') || c.includes('druid')) return '🌿';
  if (c.includes('ranger'))                        return '🏹';
  if (c.includes('bardo') || c.includes('bard'))   return '🎸';
  if (c.includes('paladino') || c.includes('paladin')) return '🛡️';
  if (c.includes('monaco') || c.includes('monk'))  return '👊';
  if (c.includes('barbaro') || c.includes('barb')) return '💪';
  return '🎲';
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function openPG(name) {
  const pg = loadPGData(name);
  if (!pg) { showToast('Dati non trovati', true); return; }
  PG = pg;
  loadState(PG);
  showScreen('sheet-screen');
  buildSheet();
}

// ── Elimina personaggio ──
let pendingDelete = null;
function confirmDelete(name) {
  pendingDelete = name;
  $('confirm-pg-name').textContent = name;
  $('confirm-overlay').classList.add('open');
}
function cancelDelete() {
  pendingDelete = null;
  $('confirm-overlay').classList.remove('open');
}
function executeDelete() {
  if (pendingDelete) {
    deletePG(pendingDelete);
    pendingDelete = null;
  }
  $('confirm-overlay').classList.remove('open');
  renderHome();
}

// ══════════════════════════════════════════════════════════════
//  IMPORT SCREEN
// ══════════════════════════════════════════════════════════════
function goToImport() {
  $('parse-error').style.display = 'none';
  $('parse-error').textContent   = '';
  $('file-input').value          = '';
  showScreen('import-screen');
}

function showImportError(msg) {
  const el = $('parse-error');
  el.textContent   = '⚠ ' + msg;
  el.style.display = 'block';
}

function processJSON(text) {
  try {
    const raw  = JSON.parse(text);
    const data = raw.attr_character_name ? raw : (raw.data || raw);
    if (!data.attr_character_name) throw new Error('Campo attr_character_name non trovato. Esporta lo snapshot corretto da Roll20.');
    const pg = parseRoll20(data);
    savePGData(pg);
    showToast(`${pg.name} caricato!`);
    // Apri direttamente la scheda
    PG = pg;
    loadState(PG);
    showScreen('sheet-screen');
    buildSheet();
  } catch(e) {
    showImportError(e.message);
  }
}

// File picker
$('drop-zone').addEventListener('click', () => $('file-input').click());
$('drop-zone').addEventListener('dragover',  e => { e.preventDefault(); $('drop-zone').classList.add('drag-over'); });
$('drop-zone').addEventListener('dragleave', ()  => $('drop-zone').classList.remove('drag-over'));
$('drop-zone').addEventListener('drop', e => {
  e.preventDefault(); $('drop-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) { const r = new FileReader(); r.onload = ev => processJSON(ev.target.result); r.readAsText(file); }
});
$('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) { const r = new FileReader(); r.onload = ev => processJSON(ev.target.result); r.readAsText(file); }
  $('file-input').value = '';
});

// Paste modal
function openPasteModal()  { $('paste-modal').classList.add('open'); }
function closePasteModal() { $('paste-modal').classList.remove('open'); }
function loadFromPaste() {
  const text = $('paste-area').value.trim();
  closePasteModal();
  if (text) processJSON(text);
}

// ══════════════════════════════════════════════════════════════
//  SHEET — tab switching
// ══════════════════════════════════════════════════════════════
function switchTab(name, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tn-btn').forEach(b => b.classList.remove('active'));
  $('p-' + name).classList.add('active');
  btn.classList.add('active');
}

function goHome() {
  if (PG) saveState();
  PG = null; STATE = {};
  renderHome();
  showScreen('home');
}

// ══════════════════════════════════════════════════════════════
//  BUILD SHEET
// ══════════════════════════════════════════════════════════════
function buildSheet() {
  buildHeader();
  buildInfo();
  buildStats();
  buildCombat();
  buildSkills();
  buildSpells();
  buildEquip();
  buildFeats();
  // Attiva prima tab
  const firstBtn = document.querySelector('.tn-btn');
  if (firstBtn) switchTab('info', firstBtn);
}

// ── Header ──
function buildHeader() {
  const pg = PG;
  const hp = STATE.hp;
  const pct = hp / pg.hpMax;
  const hpColor = pct > .5 ? 'var(--red2)' : pct > .25 ? '#e89a4c' : 'var(--red)';
  $('hdr-avatar').textContent = getClassEmoji(pg.class1);
  $('hdr-name').textContent   = pg.name;
  $('hdr-sub').innerHTML      = `<strong>${esc(pg.race)}</strong> · ${esc(pg.class1)} Lv.${pg.level} <span style="color:var(--text-dim)">· ${esc(pg.gender)}</span>`;
  $('hdr-badges').innerHTML   = [
    {cls:'hb-hp',  v:`${hp}/${pg.hpMax}`, l:'PF',         style:`color:${hpColor}`},
    {cls:'hb-ac',  v:pg.ac,               l:'CA',          style:''},
    {cls:'hb-ini', v:fmt(pg.init),         l:'Iniziativa',  style:''},
    {cls:'hb-bab', v:fmt(pg.bab),          l:'BAB',         style:''},
  ].map(b => `<div class="hb ${b.cls}"><div class="hb-v" style="${b.style}">${b.v}</div><div class="hb-l">${b.l}</div></div>`).join('');
}

// ── Tab: Info ──
function buildInfo() {
  const pg = PG;
  $('p-info').innerHTML = `
    <div class="g2">
      <div>
        <div class="st">Identità</div>
        <div class="card">
          ${[['Nome',pg.name],['Razza',pg.race],['Classe',pg.class1+' '+pg.level],['Dado Vita',pg.hitDie+'×'+pg.level],
             ['Genere',pg.gender],['Divinità',pg.deity],['Allineamento',pg.alignment],
             ['Oro',pg.gold+' mo'],['Lingue',pg.languages]]
            .map(([k,v])=>`<div class="row"><span class="row-n">${k}</span><span style="color:var(--text)">${esc(String(v))}</span></div>`).join('')}
        </div>
      </div>
      <div>
        <div class="st">Riepilogo</div>
        <div class="card">
          <div class="row"><span class="row-n">BAB / Mischia / Distanza</span><span class="row-v sm blue">${fmt(pg.bab)} / ${fmt(pg.bab+pg.strMod)} / ${fmt(pg.bab+pg.dexMod)}</span></div>
          <div class="row"><span class="row-n">CA / Tocco / Piatta</span><span class="row-v sm blue">${pg.ac} / ${pg.touchAC} / ${pg.flatAC}</span></div>
          <div class="row"><span class="row-n">Iniziativa</span><span class="row-v pos">${fmt(pg.init)}</span></div>
          <div class="row"><span class="row-n">Velocità</span><span class="row-v sm">${pg.speed} ft</span></div>
          <div class="row"><span class="row-n">Livello Incantatore</span><span class="row-v">${pg.casterLevel}</span></div>
          ${Object.keys(pg.spellDC).length ? `<div class="row"><span class="row-n">CD Incantesimi</span><span class="row-v sm blue">${Object.entries(pg.spellDC).map(([l,v])=>'Lv'+l+':'+v).join(' · ')}</span></div>` : ''}
        </div>
        <div class="st" style="margin-top:16px">Punti Ferita</div>
        <div class="card" id="info-hp-card"></div>
      </div>
    </div>
    <div class="st">Caratteristiche</div>
    <div class="g6" id="info-stats-grid"></div>
    <div class="g3" style="margin-top:16px">
      <div><div class="st">Tiri Salvezza</div><div class="card">${savesHTML()}</div></div>
      <div><div class="st">CA</div><div class="card">${caRowsHTML()}</div></div>
      <div><div class="st">Classi Abilità</div><div class="card"><div class="note-text">${esc(PG.classAbilities||'—')}</div></div></div>
    </div>`;
  buildStatCards('info-stats-grid');
  buildInfoHP();
}

function savesHTML() {
  const pg = PG;
  return `<table class="tbl"><thead><tr><th>Tiro</th><th class="r">Tot.</th><th class="r">Mod.</th></tr></thead><tbody>
    ${[['Tempra','COS',pg.fort,pg.conMod],['Riflessi','DES',pg.refl,pg.dexMod],['Volontà','SAG',pg.will,pg.wisMod]]
      .map(([n,s,v,m])=>`<tr><td class="row-n">${n} <small>(${s})</small></td><td class="val">${fmt(v)}</td><td class="val" style="color:var(--text-dim)">${fmt(m)}</td></tr>`).join('')}
  </tbody></table>`;
}

function caRowsHTML() {
  const pg = PG;
  return [['CA Normale',pg.ac,'blue'],['CA Tocco',pg.touchAC,''],['CA Piatta',pg.flatAC,'sm'],['CA Immobilizzato',pg.immobilAC,'sm']]
    .map(([n,v,c])=>`<div class="row"><span class="row-n">${n}</span><span class="row-v ${c}">${v}</span></div>`).join('');
}

function buildStatCards(targetId) {
  const pg = PG;
  $(targetId).innerHTML = [
    {code:'FOR',v:pg.str,m:pg.strMod},{code:'DES',v:pg.dex,m:pg.dexMod},
    {code:'COS',v:pg.con,m:pg.conMod},{code:'INT',v:pg.int,m:pg.intMod},
    {code:'SAG',v:pg.wis,m:pg.wisMod},{code:'CAR',v:pg.cha,m:pg.chaMod},
  ].map(s => `<div class="sc">
    <div class="sc-n">${s.code}</div>
    <div class="sc-v">${s.v}</div>
    <div class="sc-m ${s.m<0?'neg':''}">${fmt(s.m)}</div>
  </div>`).join('');
}

// ── HP editor ──
function buildInfoHP() {
  const pct = STATE.hp / PG.hpMax * 100;
  const barColor = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--gold)' : 'var(--red)';
  const el = $('info-hp-card');
  if (!el) return;
  el.innerHTML = `
    <div style="text-align:center;padding:6px 0 10px">
      <div style="font-family:'Cinzel',serif;font-size:32px;font-weight:700;color:var(--red2)" id="info-hp-v">${STATE.hp}</div>
      <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">su ${PG.hpMax} massimi</div>
    </div>
    <div class="hpbar-bg"><div class="hpbar-fill" id="hpbar-info" style="width:${pct}%;background:${barColor}"></div></div>
    <div class="row" style="margin-top:10px"><span class="row-n">Non letale</span><span class="row-v neg" id="nl-info">${STATE.nonLethal}</span></div>`;
}

// ── Tab: Caratteristiche ──
function buildStats() {
  const pg = PG;
  $('p-stats').innerHTML = `
    <div class="st">Punteggi di Caratteristica</div>
    <div class="g6" id="stats-full-grid"></div>
    <div class="g2" style="margin-top:16px">
      <div><div class="st">Tiri Salvezza</div><div class="card">${savesHTML()}</div></div>
      <div><div class="st">BAB & Attacchi</div><div class="card">
        ${[['BAB',fmt(pg.bab),''],['Mischia +FOR',fmt(pg.bab+pg.strMod),''],['Distanza +DES',fmt(pg.bab+pg.dexMod),''],
           ['Lotta',fmt(pg.bab+pg.strMod),''],['Iniziativa',fmt(pg.init),'pos'],['Concentrazione',fmt(pg.fort+pg.conMod),''],]
          .map(([n,v,c])=>`<div class="row"><span class="row-n">${n}</span><span class="row-v ${c}">${v}</span></div>`).join('')}
      </div></div>
    </div>
    <div class="st">Velocità</div>
    <div class="g4">
      ${[['🏃','Base',pg.speed+' ft'],['🦅','Volo','— ft'],['🧗','Scalare','— ft'],['🏊','Nuotare','— ft']]
        .map(([i,l,v])=>`<div class="card" style="text-align:center;padding:10px">
          <div style="font-size:18px;margin-bottom:3px">${i}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:15px;color:var(--text)">${v}</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text-dim);margin-top:2px">${l}</div>
        </div>`).join('')}
    </div>`;
  buildStatCards('stats-full-grid');
}

// ── Tab: Combattimento ──
function buildCombat() {
  const pg = PG;
  $('p-combat').innerHTML = `
    <div class="g3" style="margin-bottom:16px">
      <div>
        <div class="st">Punti Ferita</div>
        <div class="card">
          <div class="hp-editor">
            <button class="hp-btn dmg" onclick="changeHP(-1)">−</button>
            <div>
              <div class="hp-display" id="hp-disp">${STATE.hp}</div>
              <div class="hp-max" style="text-align:center">su ${pg.hpMax}</div>
            </div>
            <button class="hp-btn heal" onclick="changeHP(+1)">+</button>
          </div>
          <div class="hpbar-bg"><div class="hpbar-fill" id="hpbar-main"></div></div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <input class="hp-input" id="hp-amt" type="number" min="1" value="1" style="width:52px">
            <button class="btn" style="font-size:11px" onclick="changeHP(-parseInt($('hp-amt').value)||0)">Danno</button>
            <button class="btn primary" style="font-size:11px" onclick="changeHP(+parseInt($('hp-amt').value)||0)">Cura</button>
          </div>
          <div class="divider"></div>
          <div class="row">
            <span class="row-n">Danno non letale</span>
            <div style="display:flex;align-items:center;gap:6px">
              <button class="hp-btn dmg" style="width:24px;height:24px;font-size:14px" onclick="changeNL(+1)">+</button>
              <span class="row-v neg" id="nl-disp" style="min-width:26px;text-align:center">${STATE.nonLethal}</span>
              <button class="hp-btn heal" style="width:24px;height:24px;font-size:14px" onclick="changeNL(-1)">−</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="st">Iniziativa</div>
        <div class="card" style="text-align:center;padding:18px">
          <div style="font-family:'Cinzel',serif;font-size:44px;font-weight:700;color:var(--green2)">${fmt(pg.init)}</div>
          <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-top:4px">Totale</div>
          <div style="font-size:12px;color:var(--text-dim);margin-top:8px">DES <strong style="color:var(--gold);font-family:'JetBrains Mono',monospace">${fmt(pg.dexMod)}</strong></div>
        </div>
      </div>
      <div>
        <div class="st">Tiri Salvezza</div>
        <div class="card">${savesHTML()}</div>
      </div>
    </div>
    <div class="st">Classe Armatura</div>
    <div class="ca-grid">
      ${[['CA Normale',pg.ac,'var(--blue2)'],['CA Tocco',pg.touchAC,'var(--gold)'],['CA Piatta',pg.flatAC,'var(--text-dim)']]
        .map(([l,v,c])=>`<div class="ca-big"><div class="ca-big-v" style="color:${c}">${v}</div><div class="ca-big-l">${l}</div></div>`).join('')}
    </div>
    <div class="ca-comps">
      ${[['DES',pg.acDex],['Armatura',pg.acArmor],['Scudo',pg.shieldBonus],['Taglia',pg.acSize],['Schivata',pg.acDodge],['Nat.',pg.acNatural],['Dev.',pg.acDeflect],['Vari',pg.acMisc]]
        .map(([l,v])=>`<div class="ca-comp"><strong>${fmt(v)}</strong> ${l}</div>`).join('')}
    </div>
    <div class="st">Armi</div>
    <div id="weapons-list"></div>`;
  buildWeapons();
  refreshHPBar();
}

function buildWeapons() {
  const el = $('weapons-list');
  if (!el) return;
  if (!PG.weapons.length) { el.innerHTML = '<div style="color:var(--text-dim);font-style:italic;padding:10px 0">Nessuna arma nel JSON.</div>'; return; }
  el.innerHTML = PG.weapons.map(w => {
    const atk = fmt(PG.bab + (w.stat === 'DES' ? PG.dexMod : PG.strMod));
    return `<div class="wc">
      <div class="wc-name">${esc(w.name)}</div>
      <div class="wc-meta">${esc(w.cat)} · usa ${w.stat}</div>
      <div class="wc-stats">
        <div class="ws"><div class="ws-v atk">${atk}</div><div class="ws-l">Attacco</div></div>
        <div class="ws"><div class="ws-v dmg">${esc(w.damage)}</div><div class="ws-l">Danno</div></div>
        <div class="ws"><div class="ws-v">${esc(w.critRange)}</div><div class="ws-l">Crit.</div></div>
        <div class="ws"><div class="ws-v">${esc(w.critMult)}</div><div class="ws-l">Mult.</div></div>
        <div class="ws"><div class="ws-v">${esc(w.range)}</div><div class="ws-l">Gittata</div></div>
        ${w.ammo !== null ? `<div class="ws"><div class="ws-v" style="color:var(--text)">${w.ammo}</div><div class="ws-l">Muniz.</div></div>` : ''}
      </div>
    </div>`;
  }).join('');
}

// HP functions
function changeHP(delta) {
  STATE.hp = Math.max(0, Math.min(PG.hpMax, STATE.hp + delta));
  refreshHPDisplay();
}
function changeNL(delta) {
  STATE.nonLethal = Math.max(0, STATE.nonLethal + delta);
  if ($('nl-disp'))  $('nl-disp').textContent  = STATE.nonLethal;
  if ($('nl-info'))  $('nl-info').textContent   = STATE.nonLethal;
  buildHeader();
}
function refreshHPDisplay() {
  if ($('hp-disp'))   $('hp-disp').textContent   = STATE.hp;
  if ($('info-hp-v')) $('info-hp-v').textContent  = STATE.hp;
  refreshHPBar();
  buildHeader();
  buildInfoHP();
}
function refreshHPBar() {
  const pct = STATE.hp / PG.hpMax * 100;
  const barColor = pct > 50 ? 'var(--green)' : pct > 25 ? 'var(--gold)' : 'var(--red)';
  ['hpbar-main','hpbar-info'].forEach(id => {
    const el = $(id);
    if (el) { el.style.width = pct + '%'; el.style.background = barColor; }
  });
}

// ── Tab: Abilità ──
function buildSkills() {
  $('p-skills').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div class="st" style="margin:0;border:none">Abilità — Lista Completa</div>
      <div style="font-size:11px;color:var(--text-dim)"><span style="color:var(--gold-dim)">★</span> = Solo se addestrato</div>
    </div>
    <table class="tbl">
      <thead><tr><th>Abilità</th><th class="r">Tot.</th><th class="r">Car.</th><th class="r">Gradi</th></tr></thead>
      <tbody>
        ${PG.skills.map(sk => `<tr>
          <td>${esc(sk.name)}${sk.trained ? ' <span class="trained-star">★</span>' : ''}</td>
          <td class="val ${neg(sk.total)}">${fmt(sk.total)}</td>
          <td class="mono r" style="color:var(--text-dim)">${sk.stat}</td>
          <td class="mono r" style="color:var(--text-dim)">${sk.ranks}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

// ── Tab: Incantesimi ──
let spellFilter = 'all';
function filterSpells(mode, btn) {
  spellFilter = mode;
  document.querySelectorAll('.gtb-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGrimoire();
}
function togglePrepared(id) {
  STATE.prepared[id] = !STATE.prepared[id];
  renderGrimoire();
}
function toggleSlot(lv, idx) {
  const used = STATE.slotUsed[lv] || 0;
  STATE.slotUsed[lv] = idx < used ? Math.max(0, used - 1) : Math.min(PG.spellSlots[lv] || 0, used + 1);
  renderSlots();
}

function buildSpells() {
  const total = PG.grimoire.length;
  $('p-spells').innerHTML = `
    <div class="st">Slot Giornalieri</div>
    <div class="slot-row" id="slot-row"></div>
    <div class="st">Grimorio <span style="font-weight:400;font-size:12px;color:var(--text-dim);margin-left:6px">(${total} incantesimi)</span></div>
    <div class="grimoire-toolbar">
      <button class="gtb-btn active" onclick="filterSpells('all',this)">Tutti (${total})</button>
      <button class="gtb-btn" onclick="filterSpells('prepared',this)">Solo Preparati</button>
      <button class="gtb-btn" onclick="filterSpells('divine',this)">Divino</button>
      <button class="gtb-btn" onclick="filterSpells('arcane',this)">Arcano</button>
      <span style="margin-left:auto;font-size:11px;color:var(--text-dim)">✓ = preparato</span>
    </div>
    <div id="spells-list"></div>`;
  renderSlots();
  renderGrimoire();
}

function renderSlots() {
  const el = $('slot-row');
  if (!el) return;
  const slots = PG.spellSlots;
  if (!Object.keys(slots).length) {
    el.innerHTML = '<div style="color:var(--text-dim);font-style:italic;font-size:13px">Slot non calcolabili.</div>';
    return;
  }
  el.innerHTML = Object.entries(slots).map(([lv, tot]) => {
    const used = STATE.slotUsed[lv] || 0;
    let pips = '';
    for (let i = 0; i < tot; i++) {
      const isUsed = i < used;
      pips += `<div class="pip ${isUsed ? 'used' : ''}" onclick="toggleSlot(${lv},${i})">${isUsed ? '○' : '✦'}</div>`;
    }
    return `<div class="slot-group">
      <div class="slot-lv">Lv.${lv} <span style="color:var(--text-dim)">· CD ${PG.spellDC[lv] || '—'}</span></div>
      <div class="slot-pips">${pips}</div>
      <div class="slot-dc">${tot - used} / ${tot} disp.</div>
    </div>`;
  }).join('');
}

function renderGrimoire() {
  const el = $('spells-list');
  if (!el) return;
  if (!PG.grimoire.length) {
    el.innerHTML = '<div style="color:var(--text-dim);font-style:italic;padding:20px;text-align:center">Nessun incantesimo nel JSON.</div>';
    return;
  }
  const byLevel = {};
  PG.grimoire.forEach(sp => { if (!byLevel[sp.level]) byLevel[sp.level] = []; byLevel[sp.level].push(sp); });
  let html = '';
  Object.entries(byLevel).sort(([a],[b]) => +a - +b).forEach(([lv, spells]) => {
    const show = spellFilter === 'all'      ? spells
               : spellFilter === 'prepared' ? spells.filter(sp => STATE.prepared[sp.id])
               : spellFilter === 'divine'   ? spells.filter(sp => sp.source === 'Divino')
               : spellFilter === 'arcane'   ? spells.filter(sp => sp.source === 'Arcano')
               : spells;
    if (!show.length) return;
    const prepCount = spells.filter(s => STATE.prepared[s.id]).length;
    html += `<div class="spell-lv-header">Livello ${lv}
      <span style="color:var(--text-dim);margin-left:10px">CD: ${PG.spellDC[lv] || '—'} · Slot: ${PG.spellSlots[lv] ?? '—'} · Preparati: ${prepCount}/${spells.length}</span>
    </div>`;
    show.forEach(sp => {
      const prep = STATE.prepared[sp.id];
      html += `<div class="spell-card ${prep ? '' : 'not-prepared'}">
        <div class="spell-hd">
          <span class="spell-name">${esc(sp.name)}</span>
          <div class="spell-right">
            <div class="spell-tags">
              ${sp.school ? `<span class="tag-sm">${esc(sp.school)}</span>` : ''}
              ${sp.sub    ? `<span class="tag-sm blue">${esc(sp.sub)}</span>` : ''}
              ${PG.spellDC[lv] ? `<span class="tag-sm green">CD ${PG.spellDC[lv]}</span>` : ''}
              <span class="tag-sm" style="color:var(--text-dim)">${sp.source}</span>
            </div>
            <div class="prep-toggle ${prep ? 'on' : ''}" onclick="togglePrepared('${sp.id}')">${prep ? '✓' : ''}</div>
          </div>
        </div>
        <div class="spell-desc">${esc(sp.desc)}</div>
        ${sp.duration && sp.duration !== '—' ? `<div class="spell-foot">Durata: <span>${esc(sp.duration)}</span></div>` : ''}
        ${sp.range ? `<div class="spell-foot">Gittata: <span>${esc(sp.range)}</span></div>` : ''}
      </div>`;
    });
  });
  if (!html) html = '<div style="padding:20px;text-align:center;color:var(--text-dim);font-style:italic">Nessun incantesimo da mostrare.</div>';
  el.innerHTML = html;
}

// ── Tab: Equipaggiamento ──
function buildEquip() {
  const pg = PG;
  const cw   = pg.totalWeight;
  const lPct = pg.heavyLoad ? Math.min(cw / pg.heavyLoad * 100, 100) : 0;
  const status = cw <= pg.lightLoad ? '🟢 Leggero' : cw <= pg.medLoad ? '🟡 Medio' : cw > 0 ? '🔴 Pesante' : '—';
  $('p-equip').innerHTML = `
    <div class="g2" style="margin-bottom:16px">
      <div>
        <div class="st">Ingombro</div>
        <div class="card">
          <div class="row"><span class="row-n">Peso</span><span class="row-v ${cw <= pg.lightLoad ? 'pos' : cw <= pg.medLoad ? '' : 'neg'}">${cw} kg</span></div>
          <div class="row"><span class="row-n">Leggero max</span><span class="row-v sm pos">${pg.lightLoad} kg</span></div>
          <div class="row"><span class="row-n">Medio max</span><span class="row-v sm" style="color:var(--gold)">${pg.medLoad} kg</span></div>
          <div class="row"><span class="row-n">Pesante max</span><span class="row-v sm neg">${pg.heavyLoad} kg</span></div>
          <div style="margin-top:10px">
            <div class="load-bar-bg">
              <div class="load-seg" style="width:${pg.heavyLoad?pg.lightLoad/pg.heavyLoad*100:33}%;background:rgba(76,168,122,.25)"></div>
              <div class="load-seg" style="width:${pg.heavyLoad?pg.medLoad/pg.heavyLoad*100:66}%;background:rgba(201,168,76,.2)"></div>
              <div class="load-seg" style="width:${lPct}%;background:rgba(201,76,76,.5)"></div>
            </div>
            <div style="margin-top:8px;font-size:12px;color:var(--text-dim)">${status}</div>
          </div>
        </div>
      </div>
      <div>
        <div class="st">Ricchezza</div>
        <div class="card">
          <div class="row"><span class="row-n">Monete d'Oro</span><span class="row-v">${pg.gold} mo</span></div>
        </div>
        <div class="st" style="margin-top:14px">Slot Magici</div>
        <div class="ms-grid">
          ${pg.magicSlots.map(s=>`<div class="ms"><div class="ms-icon">${s.icon}</div><div><div class="ms-name">${s.slot}</div><div class="ms-item">—</div></div></div>`).join('')}
        </div>
      </div>
    </div>
    <div class="st">Oggetti</div>
    ${pg.equipment.length ? `
      <table class="tbl"><thead><tr><th>Oggetto</th><th class="r">Qtà</th><th class="r">Peso</th><th>Note</th></tr></thead>
      <tbody>${pg.equipment.map(e=>`<tr><td class="row-n">${esc(e.name)}</td><td class="val" style="color:var(--text)">${e.qty}</td><td class="mono dimtext r">${esc(e.weight)}</td><td class="dimtext">${esc(e.notes)}</td></tr>`).join('')}</tbody>
      </table>` : '<div style="color:var(--text-dim);font-style:italic;font-size:13px">Equipaggiamento limitato nel JSON Roll20.</div>'}`;
}

// ── Tab: Talenti & Note ──
function buildFeats() {
  const pg = PG;
  $('p-feats').innerHTML = `
    <div class="st">Talenti</div>
    ${pg.feats.length ?
      `<table class="tbl"><thead><tr><th>Talento</th></tr></thead>
      <tbody>${pg.feats.map(f=>`<tr><td class="row-n">${esc(f)}</td></tr>`).join('')}</tbody></table>`
      : '<div style="color:var(--text-dim);font-style:italic;font-size:13px">Talenti non presenti nel JSON.</div>'}
    <div class="g2" style="margin-top:20px">
      <div>
        <div class="st">Abilità di Classe</div>
        <div class="card"><div class="note-text">${esc(pg.classAbilities || '—')}</div></div>
      </div>
      <div>
        <div class="st">Abilità Razziali</div>
        <div class="card"><div class="note-text">${esc(pg.racialAbilities || '—')}</div></div>
      </div>
    </div>
    <div class="st" style="margin-top:20px">Note di Sessione</div>
    <div class="card">
      <textarea id="notes-area"
        style="width:100%;min-height:120px;background:transparent;border:none;color:var(--text);
               font-family:'Crimson Text',serif;font-size:14px;font-style:italic;resize:vertical;
               outline:none;line-height:1.7"
        placeholder="Note di sessione...">${esc(STATE.notes || '')}</textarea>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/scheda/sw.js').catch(() => {});
}

renderHome();
showScreen('home');
