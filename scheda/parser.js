// ══════════════════════════════════════════════════════════════
//  ROLL20 JSON PARSER  —  D&D 3.5
//  Mappa attr_* → oggetto PG normalizzato
// ══════════════════════════════════════════════════════════════
function parseRoll20(raw) {
  const d = raw;
  const n  = k => parseInt(d['attr_'+k]) || 0;
  const s  = k => (d['attr_'+k] || '').trim();
  const f  = k => parseFloat(d['attr_'+k]) || 0;

  function mod(base) { return Math.floor((base - 10) / 2); }

  const str  = n('str')  || n('str-base')  || 10;
  const dex  = n('dex')  || n('dex-base')  || 10;
  const con  = n('con')  || n('con-base')  || 10;
  const int_ = n('int')  || n('int-base')  || 10;
  const wis  = n('wis')  || n('wis-base')  || 10;
  const cha  = n('cha')  || n('cha-base')  || 10;

  const strMod = n('str-mod') !== 0 ? n('str-mod') : mod(str);
  const dexMod = n('dex-mod') !== 0 ? n('dex-mod') : mod(dex);
  const conMod = n('con-mod') !== 0 ? n('con-mod') : mod(con);
  const intMod = n('int-mod') !== 0 ? n('int-mod') : mod(int_);
  const wisMod = n('wis-mod') !== 0 ? n('wis-mod') : mod(wis);
  const chaMod = n('cha-mod') !== 0 ? n('cha-mod') : mod(cha);

  const level  = n('level') || n('level1') || 1;
  const bab    = n('bab')   || n('babmab') || 0;
  const hpMax  = n('hitpoints_max') || n('hitpoint') || 1;
  const hpCurr = n('hitpoints') || hpMax;

  // Spell DC per livello
  const spellDC = {};
  for (let lv = 0; lv <= 9; lv++) {
    const dc = n('spelldc'+lv) || n('arcanespelldc'+lv);
    if (dc) spellDC[lv] = dc;
  }

  // Slot incantesimi — tabella mago standard D&D 3.5
  const wizardSlots = [
    [3,1,0,0,0,0,0,0,0,0],
    [4,2,0,0,0,0,0,0,0,0],
    [4,2,1,0,0,0,0,0,0,0],
    [4,3,2,0,0,0,0,0,0,0],
    [4,3,2,1,0,0,0,0,0,0],
    [4,3,3,2,1,0,0,0,0,0],
    [4,4,3,2,2,1,0,0,0,0],
    [4,4,3,3,2,2,1,0,0,0],
    [4,4,4,3,3,2,2,1,0,0],
    [4,4,4,3,3,3,2,2,1,0],
    [4,4,4,4,3,3,2,2,2,1],
    [4,4,4,4,4,3,3,2,2,2],
    [4,4,4,4,4,4,3,3,2,2],
    [4,4,4,4,4,4,4,3,3,2],
    [4,4,4,4,4,4,4,4,3,3],
    [4,4,4,4,4,4,4,4,4,3],
    [4,4,4,4,4,4,4,4,4,4],
    [4,4,4,4,4,4,4,4,4,4],
    [4,4,4,4,4,4,4,4,4,4],
    [4,4,4,4,4,4,4,4,4,4],
  ];
  const slotTable = wizardSlots[Math.min(level, 20) - 1] || wizardSlots[0];
  const spellSlots = {};
  const intBonus = [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4];
  const intIdx = Math.max(0, Math.min(int_ - 10, 19));
  slotTable.forEach((base, lv) => {
    if (base > 0) {
      const bonus = (lv > 0 && intBonus[intIdx] >= lv) ? 1 : 0;
      spellSlots[lv] = base + bonus;
    }
  });

  // Grimorio: legge attr_spellname{lv}{slot}
  const grimoire = [];
  for (let lv = 0; lv <= 9; lv++) {
    for (let slot = 1; slot <= 2; slot++) {
      const key  = `attr_spellname${lv}${slot}`;
      const name = (d[key] || '').trim();
      if (!name) continue;
      grimoire.push({
        id:       `sp_${lv}_${slot}`,
        level:    lv,
        name:     name,
        school:   s(`spellschool${lv}${slot}`),
        sub:      s(`spelltea${lv}${slot}`),
        desc:     s(`spelldescriptor${lv}${slot}`) || '—',
        duration: s(`spellduration${lv}${slot}`) || '—',
        range:    s(`spellrange${lv}${slot}`),
        dc:       spellDC[lv] || null,
        source:   slot === 1 ? 'Divino' : 'Arcano',
      });
    }
  }

  // Armi
  const weapons = [];
  const weaponKeys = ['weapon','weapon1','weapon2','weapon3','weapon4',
                      'weapon5','weapon6','weapon7','weapon8','weapon9','weapon10'];
  for (const wk of weaponKeys) {
    const wname = s(wk + 'name');
    if (!wname) continue;
    const statKey = s(wk + 'stat').includes('dex') ? 'DES' : 'FOR';
    weapons.push({
      name:      wname,
      stat:      statKey,
      damage:    s(wk + 'statdamage') || '—',
      critRange: s(wk + 'critmin') ? s(wk + 'critmin') + '-20' : '20',
      critMult:  s(wk + 'critmult') ? '×' + s(wk + 'critmult') : '×2',
      range:     n(wk + 'range') ? n(wk + 'range') + ' ft' : '—',
      ammo:      n(wk + 'ammunition') || null,
      cat:       s(wk + 'category') || '1-hand',
    });
  }

  // Abilità
  const SKILL_DEF = [
    {key:'appraise',        name:'Valutare',             stat:'INT', trained:false},
    {key:'autohypnosis',    name:'Autohipnosi',          stat:'SAG', trained:true},
    {key:'balance',         name:'Equilibrio',           stat:'DES', trained:false},
    {key:'bluff',           name:'Raggirare',            stat:'CAR', trained:false},
    {key:'climb',           name:'Scalare',              stat:'FOR', trained:false},
    {key:'concentration',   name:'Concentrazione',       stat:'COS', trained:false},
    {key:'craft1',          name:'Artigianato',          stat:'INT', trained:false},
    {key:'decipherscript',  name:'Decifrare Scritture',  stat:'INT', trained:true},
    {key:'diplomacy',       name:'Diplomazia',           stat:'CAR', trained:false},
    {key:'disabledevice',   name:'Disattivare Congegni', stat:'INT', trained:true},
    {key:'disguise',        name:'Cammuffare',           stat:'CAR', trained:false},
    {key:'escapeartist',    name:'Artista della Fuga',   stat:'DES', trained:false},
    {key:'forgery',         name:'Falsificare',          stat:'INT', trained:false},
    {key:'gatherinformation',name:'Raccogliere Info',    stat:'CAR', trained:false},
    {key:'handleanimal',    name:'Addestrare Animali',   stat:'CAR', trained:true},
    {key:'heal',            name:'Guarire',              stat:'SAG', trained:false},
    {key:'hide',            name:'Nascondersi',          stat:'DES', trained:false},
    {key:'intimidate',      name:'Intimidire',           stat:'CAR', trained:false},
    {key:'jump',            name:'Saltare',              stat:'FOR', trained:false},
    {key:'knowarcana',      name:'Con.: Arcano',         stat:'INT', trained:true},
    {key:'knowengineer',    name:'Con.: Ingegneria',     stat:'INT', trained:true},
    {key:'knowdungeon',     name:'Con.: Dungeon',        stat:'INT', trained:true},
    {key:'knowgeography',   name:'Con.: Geografia',      stat:'INT', trained:true},
    {key:'knowhistory',     name:'Con.: Storia',         stat:'INT', trained:true},
    {key:'knowlocal',       name:'Con.: Locali',         stat:'INT', trained:true},
    {key:'knownature',      name:'Con.: Natura',         stat:'INT', trained:true},
    {key:'knownobility',    name:'Con.: Nobiltà',        stat:'INT', trained:true},
    {key:'knowpsionic',     name:'Con.: Psionica',       stat:'INT', trained:true},
    {key:'knowreligion',    name:'Con.: Religioni',      stat:'INT', trained:true},
    {key:'knowplanes',      name:'Con.: Piani',          stat:'INT', trained:true},
    {key:'listen',          name:'Ascoltare',            stat:'SAG', trained:false},
    {key:'martiallore',     name:'Martial Lore',         stat:'INT', trained:true},
    {key:'movesilent',      name:'Muoversi Silenzioso',  stat:'DES', trained:false},
    {key:'openlock',        name:'Scassinare Serrature', stat:'DES', trained:true},
    {key:'perform1',        name:'Intrattenere',         stat:'CAR', trained:false},
    {key:'ride',            name:'Cavalcare',            stat:'DES', trained:false},
    {key:'search',          name:'Cercare',              stat:'INT', trained:false},
    {key:'sensemotive',     name:'Percepire Intenzioni', stat:'SAG', trained:false},
    {key:'sleightofhand',   name:'Rapidità di Mano',     stat:'DES', trained:true},
    {key:'spellcraft',      name:'Sapienza Magica',      stat:'INT', trained:true},
    {key:'spot',            name:'Osservare',            stat:'SAG', trained:false},
    {key:'survival',        name:'Sopravvivenza',        stat:'SAG', trained:false},
    {key:'swim',            name:'Nuotare',              stat:'FOR', trained:false},
    {key:'tumble',          name:'Acrobazia',            stat:'DES', trained:true},
    {key:'usemagicdevice',  name:'Usare Og. Magici',     stat:'CAR', trained:true},
    {key:'userope',         name:'Usare Corde',          stat:'DES', trained:false},
  ];
  const skills = SKILL_DEF.map(sk => ({
    name:    sk.name,
    stat:    sk.stat,
    total:   n(sk.key) || 0,
    ranks:   n(sk.key + 'ranks') || 0,
    trained: sk.trained,
  }));

  // Equipment
  const equipment = [];
  const eqName = s('equipmentname');
  if (eqName) equipment.push({
    name: eqName, qty: 1,
    weight: s('equipmentnotes') || s('equipmentweight') || '—',
    cost: s('equipmentcost') || '—', notes: '',
  });
  const singleUse = s('singleusemagicitems');
  if (singleUse) equipment.push({name: singleUse, qty:1, weight:'—', cost:'—', notes:'Monouso'});

  // Talenti
  const featsRaw = s('feats');
  const feats = featsRaw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('['));

  return {
    name:      s('character_name') || 'Sconosciuto',
    race:      s('race') || '—',
    class1:    s('class1') || '—',
    level,
    gender:    s('gender') || '—',
    deity:     s('deity') || '—',
    alignment: s('alignment') || '—',
    gold:      f('gold'),
    str, dex, con, int: int_, wis, cha,
    strMod, dexMod, conMod, intMod, wisMod, chaMod,
    hpMax, hpCurr,
    nonLethal:   n('nonlethaldamage') || 0,
    hitDie:      s('hitdie1') ? 'd' + s('hitdie1') : 'd6',
    init:        n('init') || dexMod,
    speed:       n('speed30') || 30,
    bab,
    fort:        n('fortitude') || 0,
    refl:        n('reflex')    || 0,
    will:        n('will')      || 0,
    ac:          n('armorclass') || 10,
    touchAC:     n('touchac')   || 10,
    flatAC:      n('flatac')    || 10,
    immobilAC:   n('immoblac')  || 10,
    acDex:       n('armorclassdexmod') || dexMod,
    acArmor:     n('armorclassbonus')  || 0,
    shieldBonus: n('shieldbonus')      || 0,
    acSize:      n('armorclasssizemod')|| 0,
    acDodge:     n('acdodgemod')       || 0,
    acNatural:   n('acnaturalarmor')   || 0,
    acDeflect:   n('acdeflectionmod')  || 0,
    acMisc:      n('acmiscmod')        || 0,
    armorPenalty:n('armorpenalty')     || 0,
    lightLoad:   n('lightloadmax')     || 0,
    medLoad:     n('medloadmax')       || 0,
    heavyLoad:   n('heavyloadmax')     || 0,
    totalWeight: f('totalcarriedweight')|| 0,
    casterLevel: level,
    castingStat: 'INT',
    spellDC,
    spellSlots,
    grimoire,
    classAbilities:  s('classabilities'),
    racialAbilities: s('racialabilities') || '—',
    skills,
    weapons,
    feats,
    equipment,
    languages: s('languages') || '—',
    notes:     s('other') || '',
    magicSlots:[
      {slot:'Testa',icon:'👑'},{slot:'Occhi',icon:'👓'},{slot:'Collo',icon:'📿'},
      {slot:'Spalle',icon:'🧥'},{slot:'Torso',icon:'🛡'},{slot:'Corpo',icon:'👘'},
      {slot:'Vita',icon:'🔮'},{slot:'Polsi',icon:'⌚'},{slot:'Mani',icon:'🧤'},
      {slot:'Dito 1',icon:'💍'},{slot:'Dito 2',icon:'💍'},{slot:'Piedi',icon:'👢'},
    ],
  };
}
