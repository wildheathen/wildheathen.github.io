# ⚔️ wildheathen.github.io

Sito statico per il gruppo D&D 3.5 — reference SRD in italiano e schede personaggio interattive.

---

## 📁 Struttura del repo

```
wildheathen.github.io/
├── scheda/                 ← App schede personaggio (PWA)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   ├── parser.js
│   ├── manifest.json
│   ├── sw.js
│   ├── icon-192.png
│   └── icon-512.png
└── ...                     ← resto del sito SRD
```

---

## 🎲 Schede Personaggio — `wildheathen.github.io/scheda/`

App web per gestire le schede dei personaggi durante le sessioni di gioco.
Funziona **completamente offline** dopo il primo caricamento ed è installabile come app Android/iOS.

### Funzionalità

- **Home con lista personaggi** — tutti i PG salvati come card con HP colorato in tempo reale
- **Import da Roll20** — carica il JSON esportato tramite file picker o copia/incolla
- **Scheda completa** con tab: Info · Caratteristiche · Combattimento · Abilità · Incantesimi · Equipaggiamento · Talenti & Note
- **HP editor** — bottoni +/−, input numerico Danno/Cura, barra colore verde→oro→rosso
- **Slot incantesimi** — pip cliccabili, calcolati da tabella mago D&D 3.5 + bonus INT
- **Grimorio** — filtri Tutti / Solo Preparati / Divino / Arcano, checkbox preparazione
- **Note di sessione** persistenti per personaggio
- **PWA installabile** — icona sul desktop Android, funziona offline

### Come importare un personaggio da Roll20

Usa il bookmarklet qui sotto per esportare il JSON dalla scheda Roll20.

**Codice bookmarklet** (salvalo come segnalibro nel browser):

```
javascript:(function(){var out={};var frames=[window].concat(Array.from(document.querySelectorAll('iframe')).map(f=>{try{return f.contentWindow}catch(e){return null}}).filter(Boolean));frames.forEach(function(w){try{w.document.querySelectorAll('input[name^="attr_"],textarea[name^="attr_"]').forEach(function(el){if(el.value)out[el.name]=el.value});}catch(e){}});var json=JSON.stringify(out,null,2);var name=(out['attr_character_name']||'personaggio').replace(/\s+/g,'_');var blob=new Blob([json],{type:'application/json'});var url=URL.createObjectURL(blob);var div=document.createElement('div');div.style='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.92);z-index:99999;display:flex;flex-direction:column;padding:20px;box-sizing:border-box;gap:12px;justify-content:center';var info=document.createElement('div');info.style='color:#fff;font-size:16px;text-align:center';info.textContent='Trovati '+Object.keys(out).length+' campi per '+name;var dl=document.createElement('a');dl.href=url;dl.download=name+'_roll20.json';dl.textContent='⬇ SCARICA JSON';dl.style='display:block;padding:20px;background:#1a6b2a;color:#fff;text-align:center;font-size:18px;font-weight:bold;text-decoration:none;border-radius:8px;cursor:pointer';var btnClose=document.createElement('button');btnClose.textContent='✕ CHIUDI';btnClose.style='padding:16px;background:#444;color:#fff;border:none;font-size:16px;border-radius:8px;cursor:pointer';btnClose.onclick=function(){URL.revokeObjectURL(url);document.body.removeChild(div)};div.appendChild(info);div.appendChild(dl);div.appendChild(btnClose);document.body.appendChild(div);})();
```

**Istruzioni Android Chrome:**
1. Crea un segnalibro qualsiasi, poi modificalo
2. Sostituisci l'URL con il codice sopra
3. Apri Roll20, vai sulla scheda del personaggio
4. Tocca la barra dell'indirizzo, digita il nome del segnalibro e selezionalo
5. Tocca **⬇ SCARICA JSON**
6. Carica il file in `wildheathen.github.io/scheda/`

### Installare come app su Android

1. Apri `wildheathen.github.io/scheda/` in Chrome
2. Menu (⋮) → **Aggiungi alla schermata Home**

### Dati e privacy

Tutto salvato localmente in `localStorage`. Niente server, niente upload.

---

## 📋 Limitazioni note del parser Roll20

- **Incantesimi:** solo 2 per livello nel JSON flat. Gli slot si calcolano dalla tabella mago.
- **Equipaggiamento:** solo il primo item. Il resto è in repeating sections non esportate.
- **Talenti:** testo libero, parsati riga per riga.

---

## 🗂 Tech stack

| Componente | Tecnologia |
|---|---|
| Hosting | GitHub Pages |
| Frontend | HTML / CSS / JS vanilla |
| Persistenza | localStorage |
| Offline | Service Worker |
| Installabilità | Web App Manifest (PWA) |

---

*Progetto hobby — D&D 3.5 per uso personale del gruppo.*