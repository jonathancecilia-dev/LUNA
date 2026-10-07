/* LUNA — module Journal (écran 2 du module Corps).
   Un seul réveil, partagé avec la Roue (window.LUNA, défini dans index.html).
   Données : localStorage « luna.journal » (relevés + notes), sur l'appareil. Aucune donnée de naissance.

   Test PVT-B : protocole de Basner et al. 2011 — 3 min ; intervalle aléatoire de 1 à 4 s entre deux
   stimuli, retour affiché 1 s compris ; lapse = réponse > 355 ms ; faux départ = réponse < 100 ms.
   Adaptations de l'appli (CHOIX de l'appli, pas tirés de l'étude) :
   - réponse au toucher/clic (pointerdown) ou à la touche Espace/Entrée ;
   - un double-toucher à moins de 150 ms n'est pas compté ;
   - pas de réponse au bout de 10 s : compté comme lapse, puis stimulus suivant ;
   - test interrompu si l'appli quitte l'écran ;
   - moins de 10 réponses valides : le relevé ne peut pas être enregistré.
   Le temps de réaction est mesuré à partir de l'affichage du compteur ; la latence de l'écran et du
   toucher dépend de l'appareil : on se compare à soi-même, sur le même appareil. */
(function () {
  'use strict';
  var L = window.LUNA;
  var root = document.getElementById('v-journal');
  if (!L || !root) return;

  /* ---------- Constantes ---------- */
  var KEY = 'luna.journal', KEY_BK = 'luna.journal.lastBackup';
  var PTS = [
    { target: 30,  tol: 15, name: 'Inertie → Montée',       goal: 'Inertie encore présente ?' },
    { target: 120, tol: 30, name: 'Montée → Pic cognitif',  goal: 'Entrée dans le pic' },
    { target: 330, tol: 30, name: 'Descente → Creux',       goal: 'Juste avant le creux' },
    { target: 480, tol: 30, name: 'Creux → Remontée',       goal: 'Juste après le creux' },
    { target: 600, tol: 30, name: 'Remontée → Pic du soir', goal: 'Juste avant le pic du soir' }
  ];
  var FEEL = [
    { id: 'confort',   label: 'Confort',           group: 'corps',  opts: ['Douloureux', 'Inconfortable', 'Neutre', 'Bien', 'Très bien'] },
    { id: 'energie',   label: 'Énergie physique',  group: 'corps',  opts: ['Épuisé', 'Mou', 'Modéré', 'Énergisé', 'Survolté'] },
    { id: 'moral',     label: 'Moral',             group: 'esprit', opts: ['Très mal', 'Pas top', 'Neutre', 'Bien', 'Très bien'] },
    { id: 'agitation', label: 'Agitation mentale', group: 'esprit', opts: ['Calme', 'Posé', 'Modéré', 'Agité', 'Très agité'] }
  ];
  var PVT = { duration: 180000, isiMin: 1000, isiMax: 4000, feedback: 1000, lapse: 355, falseStart: 100,
              timeout: 10000, debounce: 150, minValid: 10 };
  var DEVICE = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 'tel' : 'ord';
  var DEVICE_TXT = { tel: 'téléphone', ord: 'ordinateur' };

  var ICON_CHEV = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  var ICON_BACK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
  var ICON_CHECK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_PEN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/></svg>';

  /* ---------- Styles du Journal ---------- */
  var css = [
    '#v-journal .subhead{padding-top:calc(env(safe-area-inset-top) + 6px);padding-left:12px}',
    '#v-journal .subhead h1{margin:2px 0 0 8px}',
    '#v-journal .subhead .sub{margin-left:8px}',
    '#v-journal .nowline{margin:4px 0 0 8px;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '#v-journal .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;display:inline-block}',
    '#v-journal main{padding:8px 15px 12px}',
    '.j-sect{display:flex;align-items:baseline;justify-content:space-between;margin:0 5px}',
    '.j-sect.j-gap{margin-top:8px}',
    '.j-kick{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted)}',
    '.j-aside{font-size:12px;color:var(--muted)}',
    '.j-points{display:flex;flex-direction:column;gap:2px}',
    '.j-pt{display:flex;align-items:center;gap:12px;min-height:50px;padding:5px 10px;border-radius:12px;border:1px solid transparent}',
    '.j-pt.open{background:var(--card);border-color:var(--line2)}',
    '.j-n{width:28px;height:28px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:1px dashed var(--dash);color:var(--muted)}',
    '.j-pt.open .j-n{border:2px solid var(--text);color:var(--text)}',
    '.j-pt.done .j-n{background:var(--text);border:1px solid var(--text);color:#0E1624}',
    '.j-ptx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.j-ptn{font-size:14px;font-weight:600}',
    '.j-ptg{font-size:12px;color:var(--muted)}',
    '.j-pts{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:2px}',
    '.j-st{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;border:1px dashed var(--dash);color:var(--chip);white-space:nowrap}',
    '.j-pt.open .j-st{border:1px solid var(--text);color:var(--text)}',
    '.j-pt.done .j-st{border:1px solid var(--dash);color:var(--text)}',
    '.j-win{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.j-actions{margin:2px 5px 0;display:flex;flex-direction:column;gap:6px}',
    '.j-hint{font-size:12.5px;line-height:1.4;color:var(--muted);text-align:center}',
    '.j-hint.left{text-align:left}',
    '.btn{width:100%;min-height:48px;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;border:1px solid transparent;',
    '  padding:0 16px;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none}',
    '.btn.primary{background:var(--text);color:#0E1624}',
    '.btn.primary:disabled{background:#243148;color:var(--nav-off);cursor:default}',
    '.btn.secondary{background:none;border-color:var(--line2);color:var(--text);font-weight:600}',
    '.btn.ghost{background:none;color:var(--muted);min-height:44px;font-size:14px;font-weight:600}',
    '.btn.j-small{min-height:44px;font-size:14px;margin:4px 5px 0;width:auto}',
    '.j-hist{display:flex;flex-direction:column;gap:6px}',
    '.j-h{margin:0 5px;padding:10px 12px;border-radius:12px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:4px}',
    '.j-h .r1{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.j-h .when{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-h .kind{font-size:12px;color:var(--muted)}',
    '.j-h .r2{display:flex;align-items:center;gap:8px;font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.j-h .body{font-size:12.5px;line-height:1.4;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.j-h .body.note{color:var(--text)}',
    '.j-h .body.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    '.j-h .act{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap}',
    '.j-confirm{font-size:12.5px;color:var(--text)}',
    '.j-link{min-height:44px;padding:0 8px;background:none;border:none;color:var(--muted);font-size:13px;font-weight:600;text-decoration:underline;cursor:pointer}',
    '.j-link.danger{color:#F08A6A}',
    '.j-empty{margin:0 5px;padding:14px 16px;border-radius:12px;border:1px dashed var(--dash);font-size:13.5px;line-height:1.4;color:var(--muted)}',
    '.j-warn{margin:0 5px;padding:10px 12px;border-radius:12px;border:1px solid #F08A6A;font-size:13px;line-height:1.4;color:var(--text)}',
    '.j-ok{margin:0 5px;padding:10px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--card);font-size:13px;line-height:1.4;color:var(--text)}',
    '.foot{flex-shrink:0;padding:10px 20px calc(24px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--nav);display:flex;flex-direction:column;gap:6px}',
    '.j-field{display:flex;flex-direction:column;gap:4px}',
    '.j-lab{font-size:13px;font-weight:600}',
    '.j-sec{margin:0 5px;display:flex;flex-direction:column;gap:10px}',
    '.j-sec h2{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted)}',
    '.j-sel{width:100%;min-height:48px;padding:0 12px;background:var(--card);border:1px solid var(--line2);border-radius:12px;color:var(--text);font:inherit;font-size:16px;color-scheme:dark}',
    '.j-ta{margin:0 5px;width:calc(100% - 10px);min-height:240px;padding:12px 14px;background:var(--card);border:1px solid var(--line2);border-radius:12px;color:var(--text);font:inherit;font-size:16px;line-height:1.45;resize:none;color-scheme:dark}',
    '.j-ta.small{min-height:110px;margin:6px 0;width:100%;font-size:14px}',
    '.j-ta::placeholder{color:var(--nav-off)}',
    '.j-card{margin:0 5px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.j-card p{font-size:13.5px;line-height:1.4;color:var(--muted)}',
    '.j-card p.lead{font-size:15px;color:var(--text)}',
    '.j-card p.last{font-size:13px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums}',
    '.j-list{margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.4;list-style:decimal}',
    '.chips{margin:0 5px}',
    '.j-p{margin:0 5px;font-size:12.5px;line-height:1.45;color:var(--muted)}',
    '.j-det{margin:0 5px;font-size:13px;color:var(--muted)}',
    '.j-det summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600}',
    '.j-ver{margin:4px 5px 0;font-size:11.5px;color:var(--nav-off);text-align:center}',
    '.j-runhead{display:flex;align-items:baseline;justify-content:space-between}',
    '.j-runhead h1{font-size:15px}',
    '.j-time{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-prog{height:6px;border-radius:3px;background:#243148;overflow:hidden;margin-top:10px}',
    '.j-prog>div{height:6px;width:0;background:#52B7B0}',
    '#v-journal main.j-runmain{padding:24px 20px 12px;gap:14px}',
    '.j-area{flex:1;min-height:0;width:100%;border:1px solid var(--line2);border-radius:24px;background:var(--card);color:var(--text);',
    '  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;touch-action:none;',
    '  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:pointer}',
    '.j-num{font-size:min(96px,24vw);font-weight:700;line-height:1;letter-spacing:-.02em;color:#F2C14E;font-variant-numeric:tabular-nums;min-height:1em}',
    '.j-num.txt{font-size:40px;color:var(--muted);letter-spacing:0}',
    '.j-unit{font-size:15px;font-weight:600;letter-spacing:.14em;color:var(--muted)}',
    '.j-unit[hidden]{display:none}',
    '.j-runhint{font-size:14px;line-height:1.4;text-align:center;color:var(--muted)}',
    '.j-metrics{display:flex;gap:8px}',
    '.j-metrics>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.j-metrics b{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-metrics b small{font-size:13px;font-weight:600;color:var(--muted)}',
    '.j-metrics span{font-size:12px;color:var(--muted)}',
    '.j-opt{display:flex;align-items:flex-start;gap:12px;min-height:44px;padding:12px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line);cursor:pointer}',
    '.j-opt.on{border-color:var(--text)}',
    '.j-opt input{width:20px;height:20px;margin:2px 0 0;flex-shrink:0;accent-color:#EEF1F6}',
    '.j-opt .t{display:flex;flex-direction:column;gap:3px}',
    '.j-opt b{font-size:15px}',
    '.j-opt b small{font-size:12px;font-weight:600;color:var(--muted)}',
    '.j-opt span.d{font-size:13px;line-height:1.4;color:var(--muted)}'
  ].join('\n');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- Outils ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function minOf(d) { return d.getHours() * 60 + d.getMinutes(); }
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateOfKey(k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(k, n) { var d = dateOfKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  // « Journée » = de ton réveil au réveil suivant. Avant l'heure de réveil, on est encore dans la journée d'hier.
  function dayKey(ts, wake) { var d = new Date(ts); if (minOf(d) < wake) d.setDate(d.getDate() - 1); return keyOf(d); }
  function dayText(k, today) {
    if (k === today) return 'Aujourd’hui';
    if (k === addDays(today, -1)) return 'Hier';
    return dateOfKey(k).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function clockOf(ts) { return L.fmtClock(minOf(new Date(ts))); }
  function relAt(ts, wake) { return L.mod(minOf(new Date(ts)) - wake); }
  function phaseAt(rel) {
    var P = L.phases;
    for (var i = 0; i < P.length; i++) if (rel >= P[i].s && rel < P[i].e) return P[i];
    return P[0];
  }
  function uid(ts) { return ts.toString(36) + '-' + Math.floor(Math.random() * 1679616).toString(36); }
  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }

  /* ---------- Données ---------- */
  var entries = [], storageOk = true, lastBackup = null;

  function lite(e) {
    return e && typeof e === 'object' && typeof e.id === 'string' && (e.kind === 'releve' || e.kind === 'note') && isFinite(e.ts) ? e : null;
  }
  function readAll() {
    try { localStorage.setItem('luna.probe', '1'); localStorage.removeItem('luna.probe'); } catch (e) { storageOk = false; }
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try {
        var o = JSON.parse(raw);
        if (o && Array.isArray(o.entries)) entries = o.entries.map(lite).filter(Boolean);
      } catch (e) {
        // Données illisibles : on les garde de côté avant d'écrire autre chose par-dessus.
        try { localStorage.setItem(KEY + '.corrupt', raw); } catch (e2) {}
      }
    }
    entries.sort(byTs);
    try { var b = Number(localStorage.getItem(KEY_BK)); lastBackup = b > 0 ? b : null; } catch (e) {}
  }
  function byTs(a, b) { return a.ts - b.ts; }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, entries: entries })); storageOk = true; } catch (e) { storageOk = false; }
    // Demande (sans fenêtre) que le navigateur ne supprime pas ces données si l'appareil manque d'espace.
    if (storageOk && navigator.storage && navigator.storage.persist) { try { navigator.storage.persist().catch(function () {}); } catch (e) {} }
    return storageOk;
  }
  function markBackup() {
    lastBackup = Date.now();
    try { localStorage.setItem(KEY_BK, String(lastBackup)); } catch (e) {}
  }

  // Validation stricte d'une entrée venant d'un fichier de sauvegarde.
  function int(v, lo, hi) { var n = Number(v); return isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi ? n : null; }
  function clean(e) {
    if (!e || typeof e !== 'object') return null;
    var ts = Number(e.ts);
    if (!isFinite(ts) || ts < 1e12 || ts > 4e12) return null;
    if (typeof e.id !== 'string' || !e.id || e.id.length > 40) return null;
    var wake = int(e.wake, 0, 1439); if (wake === null) wake = L.getWake();
    var o = { id: e.id, kind: e.kind, ts: ts, wake: wake, rel: L.mod(minOf(new Date(ts)) - wake) };
    o.day = typeof e.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.day) ? e.day : dayKey(ts, wake);
    if (e.kind === 'note') {
      if (typeof e.text !== 'string' || !e.text.trim()) return null;
      o.text = e.text.slice(0, 5000);
      return o;
    }
    if (e.kind === 'releve') {
      var f = e.feel || {}, p = e.pvt || {};
      o.feel = {};
      for (var i = 0; i < FEEL.length; i++) { var v = int(f[FEEL[i].id], 1, 5); if (v === null) return null; o.feel[FEEL[i].id] = v; }
      var n = int(p.n, 0, 100000), lp = int(p.lapses, 0, 100000), fs = int(p.falseStarts, 0, 100000), to = int(p.timeouts, 0, 100000);
      if (n === null || lp === null || fs === null || to === null) return null;
      var rts = Array.isArray(p.rts) ? p.rts.slice(0, 600).map(Number).filter(function (x) { return isFinite(x) && x >= 0 && x < 100000; }) : [];
      var mean = p.mean === null ? null : Number(p.mean);
      o.pvt = { n: n, mean: isFinite(mean) ? mean : null, lapses: lp, falseStarts: fs, timeouts: to, rts: rts, durationMs: int(p.durationMs, 0, 1e7) || 0 };
      o.point = int(e.point, 0, PTS.length - 1);
      o.device = e.device === 'tel' ? 'tel' : 'ord';
      o.input = typeof e.input === 'string' ? e.input.slice(0, 12) : '';
      return o;
    }
    return null;
  }

  /* ---------- État de l'écran ---------- */
  var screen = 'home';
  var flow = newFlow();
  var noteText = '', noteTs = 0;
  var pendingDel = null, notice = '';
  var backupStatus = '';
  var restore = null, restoreError = '';

  function newFlow() { return { confort: '', energie: '', moral: '', agitation: '', point: null, ts: 0, wake: 0, result: null }; }

  /* ---------- Aujourd'hui ---------- */
  function todayInfo() {
    var now = new Date(), wake = L.getWake(), done = {};
    var tk = dayKey(now.getTime(), wake);
    entries.forEach(function (e) {
      if (e.kind === 'releve' && e.day === tk && e.point != null && (!done[e.point] || e.ts < done[e.point].ts)) done[e.point] = e;
    });
    return { now: now, wake: wake, tk: tk, rel: L.mod(minOf(now) - wake), done: done };
  }
  function pointStates(info) {
    var open = -1, next = -1;
    var list = PTS.map(function (p, i) {
      var s = p.target - p.tol, e = p.target + p.tol, kind, status;
      if (info.done[i]) { kind = 'done'; status = 'Fait · ' + clockOf(info.done[i].ts); }
      else if (info.rel >= s && info.rel <= e) { kind = 'open'; status = 'Créneau ouvert'; if (open < 0) open = i; }
      else if (info.rel > e) { kind = 'past'; status = 'Passé'; }
      else { kind = 'soon'; status = 'À venir'; if (next < 0) next = i; }
      return { kind: kind, status: status, win: L.fmt(info.wake + s) + ' – ' + L.fmt(info.wake + e) };
    });
    return { list: list, open: open, next: next };
  }
  // Point que le relevé en cours validerait (créneau ouvert et pas déjà fait), sinon null = relevé libre.
  function pointForNow() {
    var info = todayInfo(), ps = pointStates(info);
    return ps.open >= 0 ? ps.open : null;
  }

  function histCard(e, today, full) {
    var ph = phaseAt(e.rel), isNote = e.kind === 'note', line, body;
    if (isNote) { line = ph.name; body = '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.text) + '</div>'; }
    else {
      var p = e.pvt, ft = e.feel;
      line = ph.name + ' · ' + (p.mean === null ? 'pas de mesure' : p.mean + ' ms') + ' · ' + plural(p.lapses, 'lapse', 'lapses') + ' · ' + DEVICE_TXT[e.device];
      body = '<div class="body">Corps : ' + FEEL[0].opts[ft.confort - 1] + ', ' + FEEL[1].opts[ft.energie - 1] +
             ' · Esprit : ' + FEEL[2].opts[ft.moral - 1] + ', ' + FEEL[3].opts[ft.agitation - 1] + '</div>';
    }
    var act = '';
    if (full) {
      act = pendingDel === e.id
        ? '<div class="act"><span class="j-confirm">Supprimer pour de bon ?</span>' +
          '<button type="button" class="j-link danger" data-act="del-yes" data-id="' + esc(e.id) + '">Oui, supprimer</button>' +
          '<button type="button" class="j-link" data-act="del-no">Annuler</button></div>'
        : '<div class="act"><button type="button" class="j-link" data-act="del" data-id="' + esc(e.id) + '">Supprimer</button></div>';
    }
    return '<div class="j-h"><div class="r1"><span class="when">' + esc(dayText(e.day, today)) + ' · ' + clockOf(e.ts) + '</span><span class="kind">' +
      (isNote ? 'Note' : 'Relevé') + '</span></div><div class="r2"><span class="dot" style="background:' + ph.color + '"></span><span>' + esc(line) +
      '</span></div>' + body + act + '</div>';
  }

  function updateHome() {
    var pe = $('j-points');
    if (!pe) return;
    var info = todayInfo(), ps = pointStates(info);
    pe.innerHTML = ps.list.map(function (s, i) {
      return '<li class="j-pt ' + s.kind + '"><div class="j-n">' + (s.kind === 'done' ? ICON_CHECK : (i + 1)) + '</div>' +
        '<div class="j-ptx"><span class="j-ptn">' + esc(PTS[i].name) + '</span><span class="j-ptg">' + esc(PTS[i].goal) + '</span></div>' +
        '<div class="j-pts"><span class="j-st">' + s.status + '</span><span class="j-win">' + s.win + '</span></div></li>';
    }).join('');
    var cta;
    if (ps.open >= 0) cta = 'Créneau ouvert : ' + PTS[ps.open].name + ' (' + ps.list[ps.open].win + ')';
    else if (ps.next >= 0) cta = 'Prochain créneau : ' + PTS[ps.next].name + ', dès ' + L.fmt(info.wake + PTS[ps.next].target - PTS[ps.next].tol) + ' · relevé libre possible';
    else cta = 'Les créneaux du jour sont passés · relevé libre possible';
    $('j-cta').textContent = cta;

    var recent = entries.slice().reverse();
    $('j-hnote').textContent = entries.length ? plural(entries.length, 'entrée', 'entrées') : '';
    $('j-hist').innerHTML = entries.length
      ? '<div class="j-hist">' + recent.slice(0, 3).map(function (e) { return histCard(e, info.tk, false); }).join('') + '</div>' +
        '<button type="button" class="btn secondary j-small" data-act="history">Tout l’historique ' + ICON_CHEV + '</button>'
      : '<div class="j-empty">Rien pour l’instant. Ton premier relevé ou ta première note apparaîtra ici ; pas de courbe tant qu’il n’y a pas de données.</div>';
  }

  /* ---------- Écrans ---------- */
  function back(act, label) { return '<button type="button" class="back" data-act="' + act + '">' + ICON_BACK + label + '</button>'; }

  function vHome() {
    return '<header>' +
      '<div class="top"><span class="brand">LUNA</span><span class="module">Module Corps</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Journal</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">5 tests PVT-B par jour, calés sur ton réveil</p></header>' +
      '<main>' +
      (storageOk ? '' : '<p class="j-warn" role="alert">Cet appareil refuse d’enregistrer les données (navigation privée ?). Sauvegarde ton fichier avant de quitter.</p>') +
      (notice ? '<p class="j-ok" role="status">' + esc(notice) + '</p>' : '') +
      '<div class="j-sect"><span class="j-kick">AUJOURD’HUI</span><span class="j-aside">fenêtres de 30 à 60 min</span></div>' +
      '<ol class="j-points" id="j-points"></ol>' +
      '<div class="j-actions"><button type="button" class="btn primary" data-act="releve">Faire un relevé</button>' +
      '<span class="j-hint" id="j-cta"></span>' +
      '<button type="button" class="btn secondary" data-act="note">' + ICON_PEN + 'Écrire une note</button></div>' +
      '<div class="j-sect j-gap"><span class="j-kick">HISTORIQUE</span><span class="j-aside" id="j-hnote"></span></div>' +
      '<div id="j-hist"></div>' +
      '<button type="button" class="btn secondary j-small" data-act="backup">Sauvegarder / Restaurer ' + ICON_CHEV + '</button>' +
      '</main>';
  }

  function feelField(f) {
    var cur = flow[f.id];
    return '<div class="j-field"><label class="j-lab" for="j-f-' + f.id + '">' + f.label + '</label>' +
      '<select id="j-f-' + f.id + '" class="j-sel" data-feel="' + f.id + '"><option value="">Choisir…</option>' +
      f.opts.map(function (o, i) { return '<option value="' + (i + 1) + '"' + (String(i + 1) === String(cur) ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
      '</select></div>';
  }
  function feelComplete() { return FEEL.every(function (f) { return flow[f.id]; }); }

  function vFeel() {
    var d = new Date(), ph = phaseAt(L.mod(minOf(d) - L.getWake()));
    var ok = feelComplete();
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="module">Étape 1 sur 2</span></div>' +
      '<h1 tabindex="-1">Ressenti</h1><p class="sub">Ce que tu ressens là, maintenant</p>' +
      '<div class="nowline"><span class="dot" style="background:' + ph.color + '"></span><span>' + L.fmtClock(minOf(d)) + ' · ' + esc(ph.name) + '</span></div></header>' +
      '<main style="gap:18px;padding-top:14px">' +
      '<section class="j-sec"><h2>CORPS · LE VAISSEAU</h2>' + feelField(FEEL[0]) + feelField(FEEL[1]) + '</section>' +
      '<section class="j-sec"><h2>ESPRIT · LE PILOTE</h2>' + feelField(FEEL[2]) + feelField(FEEL[3]) + '</section></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="j-next" data-act="intro"' + (ok ? '' : ' disabled') + '>Suivant · test de vigilance</button>' +
      '<span class="j-hint" id="j-feelhint">' + (ok ? 'Étape suivante : 3 minutes de test' : 'Les 4 réponses sont nécessaires') + '</span></div>';
  }

  function vIntro() {
    var pt = pointForNow();
    var msg = pt !== null ? 'Ce relevé comptera pour le point « ' + PTS[pt].name + ' ».' : 'Relevé libre : il sera enregistré, sans valider l’un des 5 points.';
    return '<header class="subhead"><div class="top">' + back('feel', 'Ressenti') + '<span class="module">Étape 2 sur 2</span></div>' +
      '<h1 tabindex="-1">Test de vigilance</h1><p class="sub">PVT-B · 3 minutes</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      (notice ? '<p class="j-warn" role="alert">' + esc(notice) + '</p>' : '') +
      '<section class="j-card"><h2 class="j-kick">AVANT DE COMMENCER</h2><ol class="j-list">' +
      '<li>Un compteur apparaît à des moments imprévisibles.</li>' +
      '<li>Touche l’écran dès qu’il apparaît, le plus vite possible' + (DEVICE === 'ord' ? ' (ou appuie sur Espace)' : '') + '.</li>' +
      '<li>Ne touche pas avant : ça compte comme un faux départ.</li>' +
      '<li>' + (DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.') + '</li></ol></section>' +
      '<div class="chips"><div class="chips" style="margin:0"><span class="chip main">Protocole établi · Basner 2011</span><span class="chip hy">Adapté à l’écran</span></div></div>' +
      '<p class="j-p">Le protocole a été validé sur du matériel dédié. Sur ' + (DEVICE === 'tel' ? 'téléphone' : 'ordinateur') + ', les valeurs absolues peuvent différer : on te compare à toi-même, <b>sur le même appareil</b>.</p>' +
      '<p class="j-p">' + esc(msg) + '</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="run">Commencer (3 min)</button></div>';
  }

  function vRun() {
    return '<header><div class="j-runhead"><h1 tabindex="-1">Test en cours</h1><span class="j-time" id="j-time" aria-hidden="true">3:00</span></div>' +
      '<div class="j-prog" aria-hidden="true"><div id="j-bar"></div></div></header>' +
      '<main class="j-runmain">' +
      '<button type="button" class="j-area" id="j-area" aria-label="Zone de réponse. Touche ici, ou appuie sur Espace, dès qu’un compteur apparaît.">' +
      '<span class="j-num" id="j-num" aria-hidden="true"></span><span class="j-unit" id="j-unit" aria-hidden="true" hidden>MS</span></button>' +
      '<p class="j-runhint">Touche dès que le compteur apparaît. Ne touche pas avant.</p></main>' +
      '<div class="foot"><button type="button" class="btn ghost" data-act="stop">Arrêter le test</button></div>';
  }

  function vResult() {
    var r = flow.result, ph = phaseAt(relAt(flow.ts, flow.wake)), enough = r.n >= PVT.minValid;
    var feel = function (a, b, c, d) { return FEEL[a].opts[flow[FEEL[a].id] - 1] + ', ' + FEEL[b].opts[flow[FEEL[b].id] - 1]; };
    return '<header><span class="module" style="display:block">Étape 2 sur 2 · fin du test</span>' +
      '<h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' +
      clockOf(flow.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics"><div><b>' + (r.mean === null ? '—' : r.mean + '<small> ms</small>') + '</b><span>Temps de réaction moyen</span></div>' +
      '<div><b>' + r.lapses + '</b><span>Lapse (réponse &gt; 355 ms)</span></div>' +
      '<div><b>' + r.falseStarts + '</b><span>Faux départ (&lt; 100 ms)</span></div></div>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, 1 test)</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + plural(r.n, 'réponse', 'réponses') + '</span></div></section>' +
      (enough ? '' : '<p class="j-warn" role="alert">Trop peu de réponses (' + r.n + ', il en faut au moins ' + PVT.minValid + ') : ce test ne peut pas être enregistré. Refais-le quand tu es prêt.</p>') +
      '<section class="j-card"><h2 class="j-kick">TON RESSENTI</h2>' +
      '<p class="lead" style="font-size:14px;line-height:1.5;color:var(--text)">Corps : ' + feel(0, 1) + '</p>' +
      '<p class="lead" style="font-size:14px;line-height:1.5;color:var(--text)">Esprit : ' + feel(2, 3) + '</p></section>' +
      '<p class="j-p">Un seul test ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot">' +
      (enough ? '<button type="button" class="btn primary" data-act="save">Enregistrer le relevé</button>'
              : '<button type="button" class="btn primary" data-act="intro">Refaire le test</button>') +
      '<button type="button" class="btn ghost" data-act="discard">Ne pas enregistrer</button></div>';
  }

  function vNote() {
    var d = new Date(noteTs), ph = phaseAt(relAt(noteTs, L.getWake()));
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<h1 tabindex="-1">Note libre</h1><p class="sub">Ce qui te vient en tête, rangé avec l’heure</p>' +
      '<div class="nowline"><span class="dot" style="background:' + ph.color + '"></span><span>' + L.fmtClock(minOf(d)) + ' · ' + esc(ph.name) + '</span></div></header>' +
      '<main style="padding-top:14px;gap:8px"><label for="j-note" class="j-lab" style="margin:0 5px">Ta note</label>' +
      '<textarea id="j-note" class="j-ta" placeholder="Écris ce qui te vient…" maxlength="5000">' + esc(noteText) + '</textarea></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="j-notesave" data-act="save-note"' + (noteText.trim() ? '' : ' disabled') + '>Enregistrer la note</button>' +
      '<span class="j-hint">Elle apparaîtra dans l’historique, avec l’heure et la phase</span></div>';
  }

  function lastBackupText() {
    if (!lastBackup) return 'Dernière sauvegarde : jamais';
    var d = new Date(lastBackup), same = keyOf(d) === keyOf(new Date());
    return 'Dernière sauvegarde : ' + (same ? 'aujourd’hui' : 'le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) + ', ' + L.fmtClock(minOf(d));
  }

  function vBackup() {
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<h1 tabindex="-1">Sauvegarde</h1><p class="sub">Un fichier : tes relevés, tes notes et ton réveil</p></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' +
      '<p class="lead">Au quotidien, rien à faire : tes relevés et tes notes se gardent tout seuls sur cet appareil, d’un jour à l’autre.</p>' +
      '<p>La sauvegarde est une assurance : si l’appli est supprimée, si les données du navigateur sont effacées ou si tu changes d’appareil, le fichier permet de tout retrouver. Le téléphone et l’ordinateur ne se partagent rien : « Restaurer » en mode « Fusionner » réunit leurs données.</p>' +
      '<p>Suggestion, pas une règle : une fois par semaine.</p>' +
      '<p style="font-size:12.5px">Le fichier contient tes notes : range-le dans un endroit privé.</p>' +
      '<p class="last">' + lastBackupText() + '</p></section>' +
      '<div class="j-actions"><button type="button" class="btn primary" data-act="do-backup">Sauvegarder (fichier)</button>' +
      '<button type="button" class="btn secondary" data-act="restore">Restaurer depuis un fichier</button>' +
      '<span class="j-hint left" id="j-status" role="status" aria-live="polite">' + esc(backupStatus) + '</span></div>' +
      '<details class="j-det" id="j-det"><summary>Si rien ne s’ouvre : copier le contenu</summary>' +
      '<textarea id="j-copy" class="j-ta small" readonly rows="5" aria-label="Contenu de la sauvegarde"></textarea>' +
      '<button type="button" class="btn secondary" data-act="copy">Copier le texte</button></details>' +
      '<p class="j-ver">Version du code : ' + esc(L.version || '?') + '</p></main>';
  }

  function restoreStats() {
    var r = restore, known = {};
    entries.forEach(function (e) { known[e.id] = true; });
    var fresh = r.entries.filter(function (e) { return !known[e.id]; });
    var notes = r.entries.filter(function (e) { return e.kind === 'note'; }).length;
    var ts = r.entries.map(function (e) { return e.ts; });
    return { fresh: fresh, dup: r.entries.length - fresh.length, notes: notes, releves: r.entries.length - notes,
             from: ts.length ? Math.min.apply(null, ts) : 0, to: ts.length ? Math.max.apply(null, ts) : 0 };
  }
  function dShort(ts) { return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }

  function vRestore() {
    var r = restore, body = '', btn, canGo = !!r;
    if (r) {
      var s = restoreStats(), nR = entries.filter(function (e) { return e.kind === 'releve'; }).length, nN = entries.length - nR;
      btn = r.mode === 'merge' ? 'Restaurer (fusionner)' : (r.confirm ? 'Oui, remplacer mes données' : 'Restaurer (remplacer)');
      body = '<section class="j-card"><h2 class="j-kick">FICHIER CHOISI</h2>' +
        '<p class="lead" style="font-size:14px;font-weight:700;overflow-wrap:anywhere">' + esc(r.name || 'Texte collé') + '</p>' +
        '<p>' + (r.exportedAt ? 'Sauvegarde du ' + esc(dShort(r.exportedAt)) + ', ' + clockOf(r.exportedAt) : 'Date de sauvegarde inconnue') + '</p>' +
        '<p>' + plural(s.releves, 'relevé', 'relevés') + ' · ' + plural(s.notes, 'note', 'notes') + (s.from ? ' · du ' + esc(dShort(s.from)) + ' au ' + esc(dShort(s.to)) : '') + '</p>' +
        '<p>' + plural(s.fresh.length, 'élément nouveau', 'éléments nouveaux') + ' pour cet appareil · ' + plural(s.dup, 'déjà présent', 'déjà présents') + '</p></section>' +
        '<section class="j-sec" style="gap:8px"><h2>COMMENT LE RESTAURER ?</h2>' +
        '<label class="j-opt' + (r.mode === 'merge' ? ' on' : '') + '"><input type="radio" name="rmode" value="merge"' + (r.mode === 'merge' ? ' checked' : '') + '>' +
        '<span class="t"><b>Fusionner <small>· recommandé</small></b><span class="d">Ajoute ce qui manque sur cet appareil. Rien n’est effacé, les doublons sont ignorés, ton réveil actuel est gardé.</span></span></label>' +
        '<label class="j-opt' + (r.mode === 'replace' ? ' on' : '') + '"><input type="radio" name="rmode" value="replace"' + (r.mode === 'replace' ? ' checked' : '') + '>' +
        '<span class="t"><b>Remplacer</b><span class="d">Efface les relevés et notes de cet appareil, et met ceux du fichier à la place (réveil compris). Ce qui a été fait après la sauvegarde est perdu.</span></span></label></section>' +
        (r.mode === 'replace' && r.confirm ? '<p class="j-warn" role="alert">Cela efface les ' + plural(nR, 'relevé', 'relevés') + ' et ' + plural(nN, 'note', 'notes') + ' de cet appareil pour mettre ceux du fichier à la place.</p>' : '');
    } else {
      btn = 'Restaurer';
      body = '<section class="j-card"><p class="lead">Choisis le fichier <b>luna-sauvegarde-….json</b> enregistré plus tôt. L’appli te montre ce qu’il contient avant de toucher à quoi que ce soit.</p>' +
        '<label class="btn secondary" for="j-file" style="width:auto">Choisir un fichier…</label>' +
        '<input id="j-file" type="file" accept=".json,application/json,text/plain" class="sr"></section>' +
        '<details class="j-det"><summary>Ou coller le contenu</summary>' +
        '<textarea id="j-paste" class="j-ta small" aria-label="Contenu de la sauvegarde à coller"></textarea>' +
        '<button type="button" class="btn secondary" data-act="read-paste">Lire ce texte</button></details>';
    }
    return '<header class="subhead"><div class="top">' + back('backup', 'Sauvegarde') + '<span class="brand">LUNA</span></div>' +
      '<h1 tabindex="-1">Restaurer</h1><p class="sub">' + (r ? 'Vérifie le contenu, puis choisis le mode' : 'Choisis un fichier de sauvegarde LUNA') + '</p></header>' +
      '<main style="padding-top:14px;gap:14px">' +
      (restoreError ? '<p class="j-warn" role="alert">' + esc(restoreError) + '</p>' : '') + body + '</main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="restore-go"' + (canGo ? '' : ' disabled') + '>' + btn + '</button>' +
      '<button type="button" class="btn ghost" data-act="backup">Annuler</button></div>';
  }

  function vHistory() {
    var tk = todayInfo().tk, list = entries.slice().reverse();
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<h1 tabindex="-1">Historique</h1><p class="sub">' + plural(entries.length, 'entrée', 'entrées') + ' · les plus récentes d’abord</p></header>' +
      '<main style="padding-top:14px"><div class="j-hist">' +
      (list.length ? list.map(function (e) { return histCard(e, tk, true); }).join('') : '<div class="j-empty">Rien pour l’instant.</div>') +
      '</div></main>';
  }

  var VIEWS = { home: vHome, feel: vFeel, intro: vIntro, run: vRun, result: vResult, note: vNote, backup: vBackup, restore: vRestore, history: vHistory };

  function render() {
    root.innerHTML = (VIEWS[screen] || vHome)();
    L.navVisible(screen === 'home' || screen === 'backup');
    if (screen === 'home') { L.bindWake(root.querySelector('.wake-input')); updateHome(); }
    if (screen === 'run') startPvt();
    var focus = screen === 'run' ? $('j-area') : root.querySelector('h1');
    if (focus) focus.focus({ preventScroll: true });
    var m = root.querySelector('main');
    if (m) m.scrollTop = 0;
  }
  function go(s) { screen = s; render(); }

  /* ---------- Test PVT-B ---------- */
  var pvt = null;
  function isi() { return PVT.isiMin + Math.random() * (PVT.isiMax - PVT.isiMin); }
  // Heure d'un événement de saisie, sur la même horloge que performance.now() (repli : maintenant).
  function tsOf(e) {
    var n = performance.now();
    return (typeof e.timeStamp === 'number' && e.timeStamp > 0 && Math.abs(n - e.timeStamp) < 250) ? e.timeStamp : n;
  }

  function startPvt() {
    var area = $('j-area'), num = $('j-num'), unit = $('j-unit'), timeEl = $('j-time'), bar = $('j-bar');
    var t0 = performance.now();
    var s = { start: t0, state: 'wait', onset: 0, nextAt: t0 + isi(), fbUntil: 0, last: -1e9, rts: [], falseStarts: 0, timeouts: 0,
              inputs: {}, raf: 0, ended: false, rem: -1, lock: null };
    pvt = s;
    flow.ts = Date.now();
    flow.wake = L.getWake();
    flow.point = pointForNow();

    function view(kind, text) {
      if (kind === 'blank') { num.textContent = ''; num.className = 'j-num'; unit.hidden = true; }
      else if (kind === 'txt') { num.textContent = text; num.className = 'j-num txt'; unit.hidden = true; }
      else { num.textContent = text; num.className = 'j-num'; unit.hidden = false; }
    }
    view('blank');

    function frame() {
      if (s.ended) return;
      var t = performance.now(), el = t - s.start;
      if (el >= PVT.duration) { finish('end'); return; }
      var rem = Math.ceil((PVT.duration - el) / 1000);
      if (rem !== s.rem) {
        s.rem = rem;
        timeEl.textContent = Math.floor(rem / 60) + ':' + pad(rem % 60);
        bar.style.width = (el / PVT.duration * 100).toFixed(1) + '%';
      }
      if (s.state === 'wait') {
        if (s.fbUntil && t >= s.fbUntil) { s.fbUntil = 0; view('blank'); }
        if (t >= s.nextAt) { s.state = 'stim'; s.fbUntil = 0; view('num', '0'); s.onset = performance.now(); }
      } else {
        var rt = t - s.onset;
        if (rt >= PVT.timeout) { s.timeouts++; s.state = 'wait'; s.nextAt = t + isi(); view('blank'); }
        else num.textContent = String(Math.floor(rt));
      }
      s.raf = requestAnimationFrame(frame);
    }

    function respond(e, kind) {
      if (s.ended) return;
      var t = tsOf(e);
      if (t - s.last < PVT.debounce) return;
      s.last = t;
      s.inputs[kind] = (s.inputs[kind] || 0) + 1;
      if (s.state === 'stim') {
        var rt = Math.max(0, t - s.onset);
        s.state = 'wait'; s.nextAt = t + isi(); s.fbUntil = t + PVT.feedback;
        if (rt < PVT.falseStart) { s.falseStarts++; view('txt', 'Trop tôt'); }
        else { s.rts.push(Math.round(rt)); view('num', String(Math.round(rt))); }
      } else {
        s.falseStarts++; s.fbUntil = t + PVT.feedback; view('txt', 'Trop tôt');
      }
    }
    function onDown(e) { e.preventDefault(); respond(e, e.pointerType || 'souris'); }
    function onKey(e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); respond(e, 'clavier'); } }
    function onVis() { if (document.hidden) finish('hidden'); }

    area.addEventListener('pointerdown', onDown);
    area.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { s.lock = l; if (s.ended) l.release().catch(function () {}); }).catch(function () {}); } catch (e) {}

    function finish(why) {
      if (s.ended) return;
      s.ended = true;
      cancelAnimationFrame(s.raf);
      area.removeEventListener('pointerdown', onDown);
      area.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      try { if (s.lock) s.lock.release().catch(function () {}); } catch (e) {}
      pvt = null;
      if (why === 'stop') { go('intro'); return; }
      if (why === 'hidden') { notice = 'Test interrompu : l’appli a quitté l’écran. Rien n’a été enregistré. Tu peux recommencer.'; go('intro'); notice = ''; return; }
      var rts = s.rts, n = rts.length, sum = 0, i;
      for (i = 0; i < n; i++) sum += rts[i];
      var lapses = s.timeouts;
      for (i = 0; i < n; i++) if (rts[i] > PVT.lapse) lapses++;
      var best = '', bc = 0;
      Object.keys(s.inputs).forEach(function (k) { if (s.inputs[k] > bc) { bc = s.inputs[k]; best = k; } });
      flow.result = { n: n, mean: n ? Math.round(sum / n) : null, lapses: lapses, falseStarts: s.falseStarts, timeouts: s.timeouts,
                      rts: rts, durationMs: Math.round(performance.now() - s.start), device: DEVICE, input: best };
      go('result');
    }
    s.finish = finish;
    s.raf = requestAnimationFrame(frame);
  }

  /* ---------- Enregistrer ---------- */
  function saveReleve() {
    var r = flow.result, ts = flow.ts, wake = flow.wake;
    entries.push({
      id: uid(ts), kind: 'releve', ts: ts, day: dayKey(ts, wake), wake: wake, rel: relAt(ts, wake), point: flow.point,
      device: r.device, input: r.input,
      feel: { confort: +flow.confort, energie: +flow.energie, moral: +flow.moral, agitation: +flow.agitation },
      pvt: { n: r.n, mean: r.mean, lapses: r.lapses, falseStarts: r.falseStarts, timeouts: r.timeouts, rts: r.rts, durationMs: r.durationMs }
    });
    entries.sort(byTs);
    persist();
    flow = newFlow();
    go('home');
  }
  function saveNote() {
    var text = noteText.trim();
    if (!text) return;
    var wake = L.getWake();
    entries.push({ id: uid(noteTs), kind: 'note', ts: noteTs, day: dayKey(noteTs, wake), wake: wake, rel: relAt(noteTs, wake), text: text });
    entries.sort(byTs);
    persist();
    noteText = '';
    go('home');
  }

  /* ---------- Sauvegarde ---------- */
  function buildBackup() {
    return JSON.stringify({ app: 'LUNA', v: 1, exportedAt: Date.now(), wake: L.wakeStr(L.getWake()), entries: entries });
  }
  function setStatus(msg) {
    backupStatus = msg;
    var el = $('j-status');
    if (el) el.textContent = msg;
  }
  function refreshLast() {
    var el = root.querySelector('.j-card p.last');
    if (el) el.textContent = lastBackupText();
  }
  function doBackup() {
    var text = buildBackup(), d = new Date(), name = 'luna-sauvegarde-' + keyOf(d) + '.json', file = null;
    try { file = new File([text], name, { type: 'application/json' }); } catch (e) {}
    function download() {
      try {
        var url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
        markBackup(); refreshLast();
        setStatus('Fichier « ' + name + ' » téléchargé : cherche-le dans tes Téléchargements. Si rien n’apparaît, ouvre « copier le contenu » ci-dessous.');
      } catch (e) {
        setStatus('Le téléchargement a échoué. Ouvre « copier le contenu » ci-dessous.');
      }
    }
    setStatus('');
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Sauvegarde LUNA' }).then(function () {
        markBackup(); refreshLast();
        setStatus('Fichier « ' + name + ' » partagé. Vérifie qu’il est bien rangé là où tu l’as choisi.');
      }).catch(function (err) {
        if (err && err.name === 'AbortError') setStatus('Sauvegarde annulée.');
        else download();
      });
    } else {
      download();
    }
  }
  function doCopy() {
    var ta = $('j-copy');
    if (!ta) return;
    ta.value = buildBackup();
    function ok() { markBackup(); refreshLast(); setStatus('Texte copié. Colle-le dans une note ou un message à toi-même, et garde-le.'); }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(ta.value).then(ok, function () { ta.select(); setStatus('Sélectionne le texte et copie-le à la main.'); }); return; }
    } catch (e) {}
    ta.select();
    try { if (document.execCommand('copy')) { ok(); return; } } catch (e) {}
    setStatus('Sélectionne le texte et copie-le à la main.');
  }

  /* ---------- Restauration ---------- */
  function parseBackup(text, name) {
    var o;
    if (typeof text !== 'string' || text.length > 20e6) return 'Ce fichier est trop gros ou illisible.';
    try { o = JSON.parse(text); } catch (e) { return 'Ce fichier n’est pas une sauvegarde LUNA (texte illisible).'; }
    if (!o || o.app !== 'LUNA' || !Array.isArray(o.entries)) return 'Ce fichier n’est pas une sauvegarde LUNA.';
    if (o.entries.length > 50000) return 'Ce fichier contient trop d’entrées.';
    var list = o.entries.map(clean).filter(Boolean);
    var seen = {};
    list = list.filter(function (e) { if (seen[e.id]) return false; seen[e.id] = true; return true; }).sort(byTs);
    var skipped = o.entries.length - list.length;
    return { name: name, entries: list, wake: typeof o.wake === 'string' ? o.wake : null, exportedAt: Number(o.exportedAt) > 0 ? Number(o.exportedAt) : 0,
             mode: 'merge', confirm: false, skipped: skipped };
  }
  function loadRestore(text, name) {
    var r = parseBackup(text, name);
    if (typeof r === 'string') { restore = null; restoreError = r; }
    else if (!r.entries.length) { restore = null; restoreError = 'Cette sauvegarde ne contient aucun relevé ni aucune note.'; }
    else { restore = r; restoreError = r.skipped ? plural(r.skipped, 'entrée illisible ignorée', 'entrées illisibles ignorées') + '.' : ''; }
    render();
  }
  function applyRestore() {
    var r = restore, s = restoreStats(), msg;
    if (r.mode === 'merge') {
      entries = entries.concat(s.fresh).sort(byTs);
      msg = 'Restauré : ' + plural(s.fresh.filter(function (e) { return e.kind === 'releve'; }).length, 'relevé ajouté', 'relevés ajoutés') + ' et ' +
        plural(s.fresh.filter(function (e) { return e.kind === 'note'; }).length, 'note ajoutée', 'notes ajoutées') + ' ; ' + plural(s.dup, 'était déjà présent', 'étaient déjà présents') + '.';
    } else {
      entries = r.entries.slice().sort(byTs);
      if (r.wake && L.parseWake(r.wake) !== null) L.setWake(r.wake, null);
      msg = 'Restauré : cet appareil contient maintenant ' + plural(s.releves, 'relevé', 'relevés') + ' et ' + plural(s.notes, 'note', 'notes') + ' du fichier.';
    }
    if (!persist()) msg += ' Attention : l’appareil refuse d’enregistrer ces données.';
    restore = null; restoreError = '';
    backupStatus = msg;
    go('backup');
  }

  /* ---------- Événements ---------- */
  function act(name, el) {
    var id = el.getAttribute('data-id');
    switch (name) {
      case 'home': pendingDel = null; notice = ''; go('home'); break;
      case 'releve': flow = newFlow(); go('feel'); break;
      case 'feel': go('feel'); break;
      case 'intro': go('intro'); break;
      case 'run': go('run'); break;
      case 'stop': if (pvt) pvt.finish('stop'); break;
      case 'save': saveReleve(); break;
      case 'discard': flow = newFlow(); go('home'); break;
      case 'note': noteText = ''; noteTs = Date.now(); go('note'); break;
      case 'save-note': saveNote(); break;
      case 'backup': restore = null; restoreError = ''; go('backup'); break;
      case 'do-backup': doBackup(); break;
      case 'copy': doCopy(); break;
      case 'restore': restore = null; restoreError = ''; go('restore'); break;
      case 'read-paste': var ta = $('j-paste'); loadRestore(ta ? ta.value : '', ''); break;
      case 'restore-go':
        if (!restore) break;
        if (restore.mode === 'replace' && !restore.confirm) { restore.confirm = true; render(); }
        else applyRestore();
        break;
      case 'history': pendingDel = null; go('history'); break;
      case 'del': pendingDel = id; render(); break;
      case 'del-no': pendingDel = null; render(); break;
      case 'del-yes':
        entries = entries.filter(function (e) { return e.id !== id; });
        pendingDel = null; persist(); render(); break;
    }
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (b && root.contains(b)) act(b.getAttribute('data-act'), b);
  });
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-feel')) {
      flow[t.getAttribute('data-feel')] = t.value;
      var ok = feelComplete(), nx = $('j-next'), hint = $('j-feelhint');
      if (nx) nx.disabled = !ok;
      if (hint) hint.textContent = ok ? 'Étape suivante : 3 minutes de test' : 'Les 4 réponses sont nécessaires';
    } else if (t.id === 'j-file' && t.files && t.files[0]) {
      var f = t.files[0], rd = new FileReader();
      rd.onload = function () { loadRestore(String(rd.result), f.name); };
      rd.onerror = function () { restore = null; restoreError = 'Impossible de lire ce fichier.'; render(); };
      rd.readAsText(f);
    } else if (t.name === 'rmode' && restore) {
      restore.mode = t.value; restore.confirm = false; render();
    }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'j-note') {
      noteText = e.target.value;
      var b = $('j-notesave');
      if (b) b.disabled = !noteText.trim();
    }
  });
  root.addEventListener('toggle', function (e) {
    if (e.target && e.target.id === 'j-det' && e.target.open) { var ta = $('j-copy'); if (ta) ta.value = buildBackup(); }
  }, true);

  /* ---------- Branchement sur l'appli ---------- */
  function maybeUpdate() { if (!root.hidden && screen === 'home') updateHome(); }
  L.on('tick', maybeUpdate);
  L.on('wake', maybeUpdate);
  L.journal = {
    onShow: function () {
      if (['home', 'backup', 'history'].indexOf(screen) < 0) { flow = newFlow(); screen = 'home'; }
      render();
    }
  };
  readAll();
})();
