/* LUNA — module Journal (écran 2 du module Corps).
   Un seul réveil, partagé avec la Roue (window.LUNA, défini dans index.html).
   Données : localStorage « luna.journal » (relevés, tests, notes, activités, repas, couchers), sur l'appareil.
   Aucune donnée de naissance.

   Deux choses séparées (décision du 11/10) :
   - RELEVÉ = ressenti seulement (5 questions + détail facultatif). « prévu » (un moment du plan) ou « libre » (à tout moment) ;
   - TEST   = PVT-B (vigilance soutenue), 3 min. « prévu » ou « libre ».
   Le plan de la journée (PLAN) est une simple liste en « réveil + X » : on peut ajouter ou changer des moments sans toucher au reste.

   Test PVT-B : protocole de Basner et al. 2011 — 3 min ; intervalle aléatoire de 1 à 4 s entre deux
   stimuli, retour affiché 1 s compris ; lapse = réponse > 355 ms ; faux départ = réponse < 100 ms.
   Adaptations de l'appli (CHOIX de l'appli, pas tirés de l'étude) :
   - réponse au toucher/clic (pointerdown) ou à la touche Espace/Entrée ;
   - un double-toucher à moins de 150 ms n'est pas compté ;
   - pas de réponse au bout de 10 s : compté comme lapse, puis stimulus suivant ;
   - test interrompu si l'appli quitte l'écran ;
   - moins de 10 réponses valides : le test ne peut pas être enregistré.
   Rappels : l'écran « Rappels » crée un fichier calendrier (.ics) ; c'est le calendrier de l'appareil qui sonne.
   Le temps de réaction est mesuré à partir de l'affichage du compteur ; la latence de l'écran et du
   toucher dépend de l'appareil : on se compare à soi-même, sur le même appareil.

   Question « Éveil » : échelle de 5 niveaux inspirée de la KSS (Åkerstedt & Gillberg 1990). Forme à 5 niveaux NON validée ;
   traduction française faite pour LUNA. Valeur stockée : 1 = très éveillé … 5 = très somnolent (sens inverse des autres questions). */
(function () {
  'use strict';
  var L = window.LUNA;
  var root = document.getElementById('v-journal');
  if (!L || !root) return;

  /* ---------- Constantes ---------- */
  var KEY = 'luna.journal', KEY_BK = 'luna.journal.lastBackup', KEY_ACTS = 'luna.activities', KEY_BEDSKIP = 'luna.bedSkip';

  // Plan de la journée, en minutes APRÈS le réveil (R+). kind : 'releve' | 'test' | 'both'.
  // Pour changer le plan : modifier cette liste (l'ordre doit rester croissant).
  var PLAN = [
    { r: 30,  kind: 'releve', name: 'Au réveil',                 goal: 'Comment tu te sens après le réveil' },
    { r: 120, kind: 'test',   name: 'Référence',                 goal: 'Niveau de départ : la référence des autres tests' },
    { r: 180, kind: 'test',   name: 'La montée continue ?',      goal: 'Plus haut que la référence ? La remise en route est-elle finie ?' },
    { r: 240, kind: 'test',   name: 'Plateau du matin',          goal: 'Au niveau de la référence ou au-dessus ?' },
    { r: 300, kind: 'test',   name: 'Fin du plateau',            goal: 'Première baisse avant le creux ?' },
    { r: 360, kind: 'releve', name: 'Début du creux',            goal: 'Le creux commence-t-il ?' },
    { r: 420, kind: 'releve', name: 'Creux',                     goal: 'Profondeur du creux ressenti' },
    { r: 480, kind: 'both',   name: 'Sortie du creux',           goal: 'La vigilance est-elle revenue ?' },
    { r: 540, kind: 'releve', name: 'Milieu de fin d’après-midi', goal: 'Sommet éventuel de fin d’après-midi, ressenti' },
    { r: 600, kind: 'both',   name: 'Fin d’après-midi',          goal: 'Comparée au matin' },
    { r: 660, kind: 'both',   name: 'Soirée',                    goal: 'Vigilance stable ?' },
    { r: 720, kind: 'releve', name: 'Fin de journée',            goal: 'Comment finit la journée' },
    { r: 780, kind: 'releve', name: 'Approche du sommeil',       goal: 'Somnolence ressentie, avant la mélatonine' }
  ];
  var WIN = { before: 10, after: 30 }; // fenêtre d'un moment : de R+X − 10 min à R+X + 30 min
  var KIND_TXT = { releve: 'Relevé', test: 'Test', both: 'Relevé + test' };
  function momTitle(m) { return rLabel(m.r) + ' · ' + KIND_TXT[m.kind] + ' · ' + m.name; }

  // Termes validés par l'utilisateur le 11/10 (Éveil : explication complète affichée sous la question).
  var FEEL = [
    { id: 'eveil',     label: 'Éveil',              group: 'corps',  opts: ['Très éveillé', 'Éveillé', 'Ni éveillé ni somnolent', 'Somnolent', 'Très somnolent'],
      hint: 'Somnolent = sans effort pour rester éveillé · Très somnolent = je lutte pour rester éveillé' },
    { id: 'energie',   label: 'Énergie physique',   group: 'corps',  opts: ['Épuisé', 'Mou', 'Modéré', 'Énergisé', 'Survolté'] },
    { id: 'confort',   label: 'Confort physique',   group: 'corps',  opts: ['Douloureux', 'Inconfortable', 'Neutre', 'Confortable', 'Très confortable'] },
    { id: 'moral',     label: 'Moral',              group: 'esprit', opts: ['Très mal', 'Pas top', 'Neutre', 'Bien', 'Très bien'] },
    { id: 'agitation', label: 'Agitation mentale',  group: 'esprit', opts: ['Très calme', 'Calme', 'Moyen', 'Agité', 'Très agité'] }
  ];
  // Anciens relevés (avant le 11/10) : 4 questions, autres mots. On les affiche avec leurs mots d'origine.
  var FEEL_V1 = [
    { id: 'confort',   opts: ['Douloureux', 'Inconfortable', 'Neutre', 'Bien', 'Très bien'] },
    { id: 'energie',   opts: ['Épuisé', 'Mou', 'Modéré', 'Énergisé', 'Survolté'] },
    { id: 'moral',     opts: ['Très mal', 'Pas top', 'Neutre', 'Bien', 'Très bien'] },
    { id: 'agitation', opts: ['Calme', 'Posé', 'Modéré', 'Agité', 'Très agité'] }
  ];
  var ACTS_DEFAULT = ['Travail', 'Sport', 'Marche', 'Repos', 'Tâches', 'Loisirs'];
  var LONG_ACT_MIN = 180; // une activité « en cours » depuis plus de 3 h déclenche un rappel doux sur l'écran d'accueil
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
    '#v-journal .subhead .titlerow{margin:2px 0 0 8px}',
    '#v-journal .subhead .titlerow h1{margin:0}',
    '#v-journal .nowline{margin:4px 0 0 8px;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '#v-journal .dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;display:inline-block}',
    '#v-journal main{padding:8px 15px 12px}',
    '.j-sect{display:flex;align-items:baseline;justify-content:space-between;margin:0 5px}',
    '.j-sect.j-gap{margin-top:8px}',
    '.j-kick{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted)}',
    '.j-aside{font-size:12px;color:var(--muted)}',
    '.j-points{display:flex;flex-direction:column;gap:2px;padding:0 0 6px}',
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
    '.j-grid{margin:0 5px;display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.j-grid .btn{padding:0 8px;font-size:14px;min-height:46px}',
    '.j-now{margin:0 5px;background:var(--card);border:1px solid var(--line2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}',
    '.j-now.act{border-left:4px solid #52B7B0}',
    '.j-now.bed{border-left:4px solid #8C6FD0}',
    '.j-now .t1{font-size:17px;font-weight:700;line-height:1.25}',
    '.j-now .t2{font-size:13px;line-height:1.4;color:var(--muted)}',
    '.j-now .t3{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.j-now .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}',
    '.j-now .btns .btn{flex:1;min-width:120px}',
    '.j-now .inrow{display:flex;gap:8px;align-items:center;margin-top:4px}',
    '.j-now .inrow .j-sel{flex:1;min-width:0}',
    '.j-now .inrow .btn{flex:1;min-width:0;width:auto}',
    '.j-tags{display:flex;flex-wrap:wrap;gap:8px}',
    '.j-tag{min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line2);background:var(--card);color:var(--text);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}',
    '.j-tag.on{border-color:var(--text);background:var(--nav-on)}',
    '.j-tag .x{margin-left:8px;color:#F08A6A;font-weight:700}',
    '.j-hist{display:flex;flex-direction:column;gap:6px}',
    '.j-h{margin:0 5px;padding:10px 12px;border-radius:12px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:4px}',
    '.j-h .r1{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.j-h .when{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-h .kind{font-size:12px;color:var(--muted);text-align:right}',
    '.j-h .r2{display:flex;align-items:center;gap:8px;font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.j-h .body{font-size:12.5px;line-height:1.4;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.j-h .body.note{color:var(--text)}',
    '.j-h .body.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    '.j-h .act{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap}',
    '.j-confirm{font-size:12.5px;color:var(--text)}',
    '.j-link{min-height:44px;padding:0 8px;background:none;border:none;color:var(--muted);font-size:13px;font-weight:600;text-decoration:underline;cursor:pointer;font-family:inherit}',
    '.j-link.danger{color:#F08A6A}',
    '.j-empty{margin:0 5px;padding:14px 16px;border-radius:12px;border:1px dashed var(--dash);font-size:13.5px;line-height:1.4;color:var(--muted)}',
    '.j-warn{margin:0 5px;padding:10px 12px;border-radius:12px;border:1px solid #F08A6A;font-size:13px;line-height:1.4;color:var(--text)}',
    '.j-ok{margin:0 5px;padding:10px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--card);font-size:13px;line-height:1.4;color:var(--text)}',
    '.foot{flex-shrink:0;padding:10px 20px calc(24px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--nav);display:flex;flex-direction:column;gap:6px}',
    '.j-field{display:flex;flex-direction:column;gap:4px}',
    '.j-lab{font-size:13px;font-weight:600}',
    '.j-fhint{font-size:12px;line-height:1.35;color:var(--muted)}',
    '.j-sec{margin:0 5px;display:flex;flex-direction:column;gap:10px}',
    '.j-sec h2{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted)}',
    '.j-sel{width:100%;min-height:48px;padding:0 12px;background:var(--card);border:1px solid var(--line2);border-radius:12px;color:var(--text);font:inherit;font-size:16px;color-scheme:dark}',
    '.j-ta{margin:0 5px;width:calc(100% - 10px);min-height:240px;padding:12px 14px;background:var(--card);border:1px solid var(--line2);border-radius:12px;color:var(--text);font:inherit;font-size:16px;line-height:1.45;resize:none;color-scheme:dark}',
    '.j-ta.small{min-height:110px;margin:6px 0;width:100%;font-size:14px}',
    '.j-ta.mid{min-height:96px;margin:6px 0;width:100%;font-size:16px}',
    '.j-ta::placeholder,.j-sel::placeholder{color:var(--nav-off)}',
    '.j-card{margin:0 5px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.j-card p{font-size:13.5px;line-height:1.4;color:var(--muted)}',
    '.j-card p.lead{font-size:15px;color:var(--text)}',
    '.j-card p.last{font-size:13px;font-weight:600;color:var(--text);font-variant-numeric:tabular-nums}',
    '.j-list{margin:0;padding:0 0 0 20px;display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.4;list-style:decimal}',
    '.chips{margin:0 5px}',
    '.j-p{margin:0 5px;font-size:12.5px;line-height:1.45;color:var(--muted)}',
    '.j-det{margin:0 5px;font-size:13px;color:var(--muted)}',
    '.j-det summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600;list-style:none}',
    '.j-det summary::-webkit-details-marker{display:none}',
    '.j-det summary::before{content:"▸";display:inline-block;width:16px;font-size:12px;color:var(--muted)}',
    '.j-det[open]>summary::before{content:"▾"}',
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
  var uidN = 0; // compteur : deux entrées créées dans la même milliseconde n'ont jamais le même identifiant
  function uid(ts) { uidN++; return ts.toString(36) + '-' + Math.floor(Math.random() * 1679616).toString(36) + uidN.toString(36); }
  function plural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }
  function rLabel(r) { var h = Math.floor(r / 60), m = r % 60; return 'R+' + h + 'h' + (m ? pad(m) : ''); }
  function durText(min) {
    min = Math.max(0, Math.round(min));
    if (min < 60) return min + ' min';
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' h' + (m ? ' ' + pad(m) : '');
  }
  function clockInput(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function validClock(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(s || ''); }
  // Heure saisie (HH:MM) -> l'occurrence la plus récente qui ne soit pas dans le futur (10 min de marge).
  // Ex. à 8h30 : « 00:40 » = cette nuit ; « 23:30 » = hier soir.
  function tsFromClock(s, nowMs) {
    var p = s.split(':'), d = new Date(nowMs);
    d.setHours(+p[0], +p[1], 0, 0);
    if (d.getTime() > nowMs + 10 * 60000) d.setDate(d.getDate() - 1);
    return d.getTime();
  }
  // Heure saisie le même jour que ref (ms) ; si elle tombe avant ref, c'est le lendemain.
  function tsAfter(s, refMs) {
    var p = s.split(':'), d = new Date(refMs);
    d.setHours(+p[0], +p[1], 0, 0);
    if (d.getTime() < refMs) d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  /* ---------- Données ---------- */
  var entries = [], storageOk = true, lastBackup = null, actNames = ACTS_DEFAULT.slice();
  var KINDS = ['releve', 'test', 'note', 'activite', 'repas', 'coucher'];

  function lite(e) {
    return e && typeof e === 'object' && typeof e.id === 'string' && KINDS.indexOf(e.kind) >= 0 && isFinite(e.ts) ? e : null;
  }
  function byTs(a, b) { return a.ts - b.ts; }
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
    try {
      var a = JSON.parse(localStorage.getItem(KEY_ACTS));
      if (Array.isArray(a)) actNames = a.filter(function (x) { return typeof x === 'string' && x.trim() && x.length <= 40; }).map(function (x) { return x.trim(); }).slice(0, 30);
    } catch (e) {}
    if (normalizeActs()) persist();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, entries: entries })); storageOk = true; } catch (e) { storageOk = false; }
    // Demande (sans fenêtre) que le navigateur ne supprime pas ces données si l'appareil manque d'espace.
    if (storageOk && navigator.storage && navigator.storage.persist) { try { navigator.storage.persist().catch(function () {}); } catch (e) {} }
    return storageOk;
  }
  function saveActNames() { try { localStorage.setItem(KEY_ACTS, JSON.stringify(actNames)); } catch (e) {} }
  function markBackup() {
    lastBackup = Date.now();
    try { localStorage.setItem(KEY_BK, String(lastBackup)); } catch (e) {}
  }

  // Une seule activité « en cours » à la fois : les autres sont closes au début de la suivante.
  function normalizeActs() {
    var acts = entries.filter(function (e) { return e.kind === 'activite'; }).sort(byTs), changed = false;
    for (var i = 0; i < acts.length - 1; i++) {
      if (acts[i].end == null) { acts[i].end = acts[i + 1].ts; changed = true; }
    }
    return changed;
  }
  function currentAct() {
    var best = null;
    entries.forEach(function (e) { if (e.kind === 'activite' && e.end == null && (!best || e.ts > best.ts)) best = e; });
    return best;
  }
  function rememberAct(name) {
    if (!name) return;
    var low = name.toLowerCase();
    if (!actNames.some(function (n) { return n.toLowerCase() === low; })) { actNames.push(name); saveActNames(); }
  }

  // Heure du réveil qui suit un coucher, ou null si inconnue.
  function nightEnd(c) {
    if (c.wakeTs) return c.wakeTs;
    var nk = addDays(c.day, 1), first = null;
    entries.forEach(function (e) { if (e.day === nk && e.kind !== 'coucher' && (!first || e.ts < first.ts)) first = e; });
    if (!first) return null;
    var d = dateOfKey(nk); d.setMinutes(first.wake);
    var w = d.getTime();
    return (w > c.ts && w - c.ts < 20 * 3600e3) ? w : null;
  }

  // Validation stricte d'une entrée venant d'un fichier de sauvegarde.
  function int(v, lo, hi) { var n = Number(v); return v !== null && v !== '' && isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi ? n : null; }
  function feelIds(list) { return list.map(function (f) { return f.id; }); }
  function cleanFeel(f, ids, partial) {
    f = f && typeof f === 'object' ? f : {};
    var o = {}, n = 0;
    for (var i = 0; i < ids.length; i++) {
      var v = int(f[ids[i]], 1, 5);
      if (v === null) { if (!partial) return null; } else { o[ids[i]] = v; n++; }
    }
    return partial && !n ? null : o;
  }
  function cleanPvt(p) {
    p = p && typeof p === 'object' ? p : {};
    var n = int(p.n, 0, 100000), lp = int(p.lapses, 0, 100000), fs = int(p.falseStarts, 0, 100000), to = int(p.timeouts, 0, 100000);
    if (n === null || lp === null || fs === null || to === null) return null;
    var rts = Array.isArray(p.rts) ? p.rts.slice(0, 600).map(Number).filter(function (x) { return isFinite(x) && x >= 0 && x < 100000; }) : [];
    var mean = p.mean === null || p.mean === undefined ? null : Number(p.mean);
    return { n: n, mean: isFinite(mean) ? mean : null, lapses: lp, falseStarts: fs, timeouts: to, rts: rts, durationMs: int(p.durationMs, 0, 1e7) || 0 };
  }
  function clean(e) {
    if (!e || typeof e !== 'object') return null;
    var ts = Number(e.ts);
    if (!isFinite(ts) || ts < 1e12 || ts > 4e12) return null;
    if (typeof e.id !== 'string' || !e.id || e.id.length > 40) return null;
    if (KINDS.indexOf(e.kind) < 0) return null;
    var wake = int(e.wake, 0, 1439); if (wake === null) wake = L.getWake();
    var o = { id: e.id, kind: e.kind, ts: ts, wake: wake, rel: L.mod(minOf(new Date(ts)) - wake) };
    o.day = typeof e.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.day) ? e.day : dayKey(ts, wake);
    var k = e.kind, ids5 = feelIds(FEEL), fl;
    if (k === 'note' || k === 'repas') {
      if (typeof e.text !== 'string' || !e.text.trim()) return null;
      o.text = e.text.slice(0, k === 'note' ? 5000 : 1000);
      return o;
    }
    if (k === 'coucher') {
      var wt = Number(e.wakeTs);
      if (e.wakeTs != null && isFinite(wt) && wt > ts && wt - ts < 20 * 3600e3) o.wakeTs = wt;
      if (e.memo) o.memo = true;
      return o;
    }
    if (k === 'activite') {
      var name = typeof e.name === 'string' ? e.name.trim().slice(0, 40) : '';
      if (!name) return null;
      o.name = name;
      var en = e.end == null ? null : Number(e.end);
      o.end = (en !== null && isFinite(en) && en >= ts && en < ts + 7 * 86400e3) ? en : null;
      o.comment = typeof e.comment === 'string' ? e.comment.trim().slice(0, 500) : '';
      fl = cleanFeel(e.feelStart, ids5, true); if (fl) { o.feelStart = fl; if (e.feelStartLate) o.feelStartLate = true; }
      fl = cleanFeel(e.feelEnd, ids5, true); if (fl) { o.feelEnd = fl; if (e.feelEndLate) o.feelEndLate = true; }
      return o;
    }
    // relevé ou test
    if (k === 'releve' && e.pvt) { // ancien format (avant le 11/10) : ressenti en 4 questions + test dans la même entrée
      var f1 = cleanFeel(e.feel, feelIds(FEEL_V1), false), pv1 = cleanPvt(e.pvt);
      if (!f1 || !pv1) return null;
      o.feel = f1; o.pvt = pv1; o.point = int(e.point, 0, 20);
      o.device = e.device === 'tel' ? 'tel' : 'ord';
      o.input = typeof e.input === 'string' ? e.input.slice(0, 12) : '';
      return o;
    }
    o.slot = e.slot == null ? null : int(e.slot, 0, 99);
    o.plan = o.slot !== null && e.plan !== 'libre' ? 'prevu' : 'libre';
    if (k === 'releve') {
      var f2 = cleanFeel(e.feel, ids5, false);
      if (!f2) return null;
      o.feel = f2; o.fv = 2;
      var dt = typeof e.detail === 'string' ? e.detail.trim().slice(0, 500) : '';
      if (dt) o.detail = dt;
      return o;
    }
    var pv2 = cleanPvt(e.pvt); // test
    if (!pv2) return null;
    o.pvt = pv2;
    o.device = e.device === 'tel' ? 'tel' : 'ord';
    o.input = typeof e.input === 'string' ? e.input.slice(0, 12) : '';
    return o;
  }

  /* ---------- État de l'écran ---------- */
  var screen = 'home';
  var flow = newFlow();
  var form = null;          // formulaire en cours : activité, repas, coucher, modification
  var noteText = '', noteTs = 0;
  var pendingDel = null, notice = '';
  var backupStatus = '';
  var rem = { moments: true, phases: false, days: 1 }, remStatus = '';
  var restore = null, restoreError = '';
  var manageActs = false;

  function newFlow(o) {
    o = o || {};
    return { mode: o.mode || 'releve', slot: o.slot == null ? null : o.slot, feel: {}, detail: '', feelTs: 0, ts: 0, wake: 0, result: null };
  }

  /* ---------- Aujourd'hui : moments du plan ---------- */
  function todayInfo() {
    var now = new Date(), wake = L.getWake(), tk = dayKey(now.getTime(), wake), done = {};
    entries.forEach(function (e) {
      if (e.day !== tk || e.slot == null || (e.kind !== 'releve' && e.kind !== 'test')) return;
      var d = done[e.slot] || (done[e.slot] = {});
      if (!d[e.kind] || e.ts < d[e.kind].ts) d[e.kind] = e;
    });
    return { now: now, wake: wake, tk: tk, rel: L.mod(minOf(now) - wake), done: done };
  }
  function slotStates(info) {
    var open = -1, next = -1;
    var list = PLAN.map(function (m, i) {
      var d = info.done[i] || {}, part = !!(d.releve || d.test);
      var needR = m.kind !== 'test' && !d.releve, needT = m.kind !== 'releve' && !d.test;
      var s = m.r - WIN.before, e = m.r + WIN.after, kind, status;
      if (!needR && !needT) { kind = 'done'; status = 'Fait · ' + clockOf(Math.max((d.releve || { ts: 0 }).ts, (d.test || { ts: 0 }).ts)); }
      else if (info.rel >= s && info.rel <= e) { kind = 'open'; status = part ? (d.releve ? 'Relevé fait' : 'Test fait') : 'Créneau ouvert'; if (open < 0) open = i; }
      else if (info.rel > e) { kind = 'past'; status = part ? 'Incomplet' : 'Passé'; }
      else { kind = 'soon'; status = 'À venir'; if (next < 0) next = i; }
      return { kind: kind, status: status, needR: needR, needT: needT, win: L.fmt(info.wake + s) + ' – ' + L.fmt(info.wake + e), at: L.fmtClock(info.wake + m.r) };
    });
    return { list: list, open: open, next: next };
  }
  function actionLabel(s) {
    if (s.needR && s.needT) return 'Relevé puis test';
    return s.needR ? 'Faire le relevé' : 'Faire le test (3 min)';
  }
  function startMoment(i) {
    var s = slotStates(todayInfo()).list[i];
    if (!s || (!s.needR && !s.needT)) return;
    flow = newFlow({ slot: i, mode: s.needR && s.needT ? 'both' : (s.needR ? 'releve' : 'test') });
    go(s.needR ? 'feel' : 'intro');
  }

  /* ---------- Libellés du ressenti ---------- */
  var SHORT = { eveil: 'Éveil', energie: 'Énergie', confort: 'Confort', moral: 'Moral', agitation: 'Agitation' };
  function optText(id, v, legacy) {
    var f = (legacy ? FEEL_V1 : FEEL).filter(function (x) { return x.id === id; })[0];
    return f && v ? f.opts[v - 1] : '';
  }
  // « Corps : … · Esprit : … » (relevés complets)
  function feelWords(f, legacy) {
    var t = function (id) { return optText(id, f[id], legacy); };
    var corps = (legacy ? ['confort', 'energie'] : ['eveil', 'energie', 'confort']).map(t).filter(Boolean).join(', ');
    var esprit = ['moral', 'agitation'].map(t).filter(Boolean).join(', ');
    return 'Corps : ' + corps + ' · Esprit : ' + esprit;
  }
  // « Éveil Éveillé · Moral Bien » (ressentis partiels des activités)
  function feelShort(f) {
    return FEEL.filter(function (x) { return f[x.id]; }).map(function (x) { return SHORT[x.id] + ' ' + optText(x.id, f[x.id]); }).join(' · ');
  }
  function partialFeel(obj) {
    var o = {}, n = 0;
    FEEL.forEach(function (f) { var v = int(obj && obj[f.id], 1, 5); if (v !== null) { o[f.id] = v; n++; } });
    return n ? o : null;
  }
  function sameFeel(a, b) {
    a = a || {}; b = b || {};
    return FEEL.every(function (f) { return (a[f.id] || 0) === (b[f.id] || 0); });
  }
  function feelComplete() { return FEEL.every(function (f) { return flow.feel[f.id]; }); }

  /* ---------- Historique ---------- */
  var KIND_LABEL = { releve: 'Relevé', test: 'Test', note: 'Note', activite: 'Activité', repas: 'Repas', coucher: 'Coucher' };
  function planTxt(e) {
    if (e.plan !== 'prevu') return 'libre';
    var m = PLAN[e.slot];
    return 'prévu' + (m ? ' · ' + rLabel(m.r) : '');
  }
  function bedText(c) {
    var end = nightEnd(c);
    return end ? 'Temps au lit : ' + durText((end - c.ts) / 60000) + (c.memo ? ' · noté de mémoire' : '')
               : 'Temps au lit : connu après ton prochain réveil' + (c.memo ? ' · noté de mémoire' : '');
  }

  function histCard(e, today, full) {
    var ph = phaseAt(e.rel), line = '', body = '', kindTxt = KIND_LABEL[e.kind], editable = false, nowMs = Date.now();
    if (e.kind === 'note') {
      line = ph.name; body = '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.text) + '</div>';
    } else if (e.kind === 'repas') {
      line = ph.name; body = '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.text) + '</div>'; editable = true;
    } else if (e.kind === 'coucher') {
      line = 'Coucher'; body = '<div class="body">' + esc(bedText(e)) + '</div>'; editable = true;
    } else if (e.kind === 'activite') {
      editable = true;
      var endTxt = e.end == null ? 'en cours depuis ' + durText((nowMs - e.ts) / 60000) : clockOf(e.end) + ' (' + durText((e.end - e.ts) / 60000) + ')';
      line = e.name + ' · ' + clockOf(e.ts) + (e.end == null ? ' · ' : ' → ') + endTxt;
      body = (e.comment ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.comment) + '</div>' : '') +
        (e.feelStart ? '<div class="body">Début : ' + esc(feelShort(e.feelStart)) + (e.feelStartLate ? ' (noté après coup)' : '') + '</div>' : '') +
        (e.feelEnd ? '<div class="body">Fin : ' + esc(feelShort(e.feelEnd)) + (e.feelEndLate ? ' (noté après coup)' : '') + '</div>' : '');
    } else if (e.kind === 'test') {
      var p = e.pvt;
      line = ph.name + ' · ' + (p.mean === null ? 'pas de mesure' : p.mean + ' ms') + ' · ' + plural(p.lapses, 'lapse', 'lapses') + ' · ' + DEVICE_TXT[e.device];
      kindTxt = 'Test · ' + planTxt(e);
    } else if (e.pvt) { // ancien relevé combiné (avant le 11/10)
      var q = e.pvt;
      line = ph.name + ' · ' + (q.mean === null ? 'pas de mesure' : q.mean + ' ms') + ' · ' + plural(q.lapses, 'lapse', 'lapses') + ' · ' + DEVICE_TXT[e.device];
      body = '<div class="body">' + esc(feelWords(e.feel, true)) + '</div>';
      kindTxt = 'Relevé + test';
    } else {
      line = ph.name;
      body = '<div class="body">' + esc(feelWords(e.feel, e.fv !== 2)) + '</div>' +
        (e.detail ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.detail) + '</div>' : '');
      kindTxt = 'Relevé · ' + planTxt(e);
    }
    var act = '';
    if (full) {
      act = pendingDel === e.id
        ? '<div class="act"><span class="j-confirm">Supprimer pour de bon ?</span>' +
          '<button type="button" class="j-link danger" data-act="del-yes" data-id="' + esc(e.id) + '">Oui, supprimer</button>' +
          '<button type="button" class="j-link" data-act="del-no">Annuler</button></div>'
        : '<div class="act">' + (editable ? '<button type="button" class="j-link" data-act="edit" data-id="' + esc(e.id) + '">Modifier</button>' : '') +
          '<button type="button" class="j-link" data-act="del" data-id="' + esc(e.id) + '">Supprimer</button></div>';
    }
    return '<div class="j-h"><div class="r1"><span class="when">' + esc(dayText(e.day, today)) + ' · ' + clockOf(e.ts) + '</span><span class="kind">' +
      esc(kindTxt) + '</span></div><div class="r2"><span class="dot" style="background:' + ph.color + '"></span><span>' + esc(line) +
      '</span></div>' + body + act + '</div>';
  }

  /* ---------- Accueil ---------- */
  function momentCard(info, ps) {
    if (ps.open >= 0) {
      var m = PLAN[ps.open], s = ps.list[ps.open];
      return '<div class="j-now"><span class="j-kick">MAINTENANT</span>' +
        '<div class="t1">' + esc(momTitle(m)) + '</div>' +
        '<div class="t2">' + esc(m.goal) + '</div>' +
        '<div class="t3">Fenêtre ' + s.win + ' · prévu à ' + s.at + '</div>' +
        '<div class="btns"><button type="button" class="btn primary" data-act="moment" data-id="' + ps.open + '">' + actionLabel(s) + '</button></div></div>';
    }
    if (ps.next >= 0) {
      var n = PLAN[ps.next], sn = ps.list[ps.next];
      return '<div class="j-now"><span class="j-kick">PROCHAIN MOMENT</span>' +
        '<div class="t1">' + esc(momTitle(n)) + '</div>' +
        '<div class="t3">Dès ' + L.fmt(info.wake + n.r - WIN.before) + ' · prévu à ' + sn.at + '</div>' +
        '<div class="t2">Rien à faire maintenant. Un relevé libre reste possible à tout moment.</div></div>';
    }
    return '<div class="j-now"><span class="j-kick">AUJOURD’HUI</span><div class="t1">Les moments du jour sont passés</div>' +
      '<div class="t2">Un relevé libre reste possible à tout moment. Il n’y a rien à rattraper.</div></div>';
  }
  function actCard(a, info) {
    var min = (info.now.getTime() - a.ts) / 60000;
    return '<div class="j-now act"><span class="j-kick">ACTIVITÉ EN COURS</span><div class="t1">' + esc(a.name) + '</div>' +
      '<div class="t3">Depuis ' + clockOf(a.ts) + ' · ' + durText(min) + '</div>' +
      (min >= LONG_ACT_MIN ? '<div class="t2">Toujours en cours ? Tu peux la terminer à l’heure qui convient.</div>' : '') +
      '<div class="btns"><button type="button" class="btn primary" data-act="act-end">Terminer</button>' +
      '<button type="button" class="btn secondary" data-act="edit" data-id="' + esc(a.id) + '">Modifier</button></div></div>';
  }
  function needBed(info) {
    if (info.rel >= 600) return false; // la question n'a de sens que le matin (10 premières heures après le réveil)
    var prev = addDays(info.tk, -1);
    if (entries.some(function (e) { return e.kind === 'coucher' && e.day === prev; })) return false;
    try { if (localStorage.getItem(KEY_BEDSKIP) === info.tk) return false; } catch (e) {}
    return true;
  }
  function bedCard() {
    var last = null;
    entries.forEach(function (e) { if (e.kind === 'coucher') last = e; });
    return '<div class="j-now bed"><span class="j-kick">COUCHER</span><div class="t1">À quelle heure t’es-tu couché hier soir ?</div>' +
      '<div class="t2">De mémoire, c’est très bien.</div>' +
      '<div class="inrow"><input id="j-bedin" class="j-sel" type="time" value="' + (last ? clockInput(last.ts) : '') + '" aria-label="Heure du coucher hier soir">' +
      '<button type="button" class="btn primary" data-act="bed-card-go">Enregistrer</button></div>' +
      '<div class="btns"><button type="button" class="btn ghost" data-act="bed-skip">Pas cette fois</button></div></div>';
  }

  function setHtml(el, html) { // ne réécrit pas si rien n'a changé (évite de perdre un champ en cours de saisie)
    if (el && el.getAttribute('data-sig') !== html) { el.innerHTML = html; el.setAttribute('data-sig', html); }
  }
  function updateHome() {
    var top = $('j-top');
    if (!top) return;
    var info = todayInfo(), ps = slotStates(info), ca = currentAct();
    var typing = document.activeElement && top.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
    if (!typing) setHtml(top, momentCard(info, ps) + (ca ? actCard(ca, info) : '') + (needBed(info) ? bedCard() : ''));

    var nDone = ps.list.filter(function (s) { return s.kind === 'done'; }).length;
    $('j-plansum').textContent = 'Plan du jour · ' + PLAN.length + ' moments · ' + nDone + ' fait' + (nDone > 1 ? 's' : '');
    $('j-points').innerHTML = ps.list.map(function (s, i) {
      return '<li class="j-pt ' + s.kind + '"><div class="j-n">' + (s.kind === 'done' ? ICON_CHECK : (i + 1)) + '</div>' +
        '<div class="j-ptx"><span class="j-ptn">' + rLabel(PLAN[i].r) + ' · ' + KIND_TXT[PLAN[i].kind] + '</span><span class="j-ptg">' + esc(PLAN[i].goal) + '</span></div>' +
        '<div class="j-pts"><span class="j-st">' + s.status + '</span><span class="j-win">' + s.at + '</span></div></li>';
    }).join('');

    var recent = entries.slice().reverse();
    $('j-hnote').textContent = entries.length ? plural(entries.length, 'entrée', 'entrées') : '';
    $('j-hist').innerHTML = entries.length
      ? '<div class="j-hist">' + recent.slice(0, 3).map(function (e) { return histCard(e, info.tk, false); }).join('') + '</div>' +
        '<button type="button" class="btn secondary j-small" data-act="history">Tout l’historique ' + ICON_CHEV + '</button>'
      : '<div class="j-empty">Rien pour l’instant. Ton premier relevé, test, repas ou ta première activité apparaîtra ici ; pas de courbe tant qu’il n’y a pas de données.</div>';
  }

  /* ---------- Écrans ---------- */
  function back(act, label) { return '<button type="button" class="back" data-act="' + act + '">' + ICON_BACK + label + '</button>'; }

  function vHome() {
    return '<header>' +
      '<div class="top"><span class="brand">LUNA</span><span class="module">Module Corps</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Journal</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">' + PLAN.length + ' moments par jour, calés sur ton réveil (R+ = heures depuis le réveil)</p></header>' +
      '<main>' +
      (storageOk ? '' : '<p class="j-warn" role="alert">Cet appareil refuse d’enregistrer les données (navigation privée ?). Sauvegarde ton fichier avant de quitter.</p>') +
      (notice ? '<p class="j-ok" role="status">' + esc(notice) + '</p>' : '') +
      '<div id="j-top" style="display:flex;flex-direction:column;gap:10px"></div>' +
      '<details class="j-det" id="j-plan"><summary id="j-plansum"></summary><ol class="j-points" id="j-points"></ol></details>' +
      '<div class="j-sect"><span class="j-kick">À TOUT MOMENT</span></div>' +
      '<div class="j-grid">' +
      '<button type="button" class="btn primary" data-act="releve">Relevé libre</button>' +
      '<button type="button" class="btn secondary" data-act="test-libre">Test libre</button>' +
      '<button type="button" class="btn secondary" data-act="act-start">Activité</button>' +
      '<button type="button" class="btn secondary" data-act="meal">Repas</button>' +
      '<button type="button" class="btn secondary" data-act="bed">Coucher</button>' +
      '<button type="button" class="btn secondary" data-act="note">' + ICON_PEN + 'Note</button></div>' +
      '<div class="j-sect j-gap"><span class="j-kick">HISTORIQUE</span><span class="j-aside" id="j-hnote"></span></div>' +
      '<div id="j-hist"></div>' +
      '<button type="button" class="btn secondary j-small" data-act="backup">Sauvegarder / Restaurer ' + ICON_CHEV + '</button>' +
      '<button type="button" class="btn secondary j-small" data-act="remind">Rappels dans le calendrier ' + ICON_CHEV + '</button>' +
      '</main>';
  }

  // Une question de ressenti. ns : « flow » (relevé), « as » (début d'activité), « ae » (fin d'activité).
  function feelTarget(ns) {
    if (ns === 'flow') return flow.feel;
    if (!form) return {};
    return ns === 'as' ? (form.feelStart || (form.feelStart = {})) : (form.feelEnd || (form.feelEnd = {}));
  }
  function feelField(f, ns) {
    var cur = feelTarget(ns)[f.id], id = 'j-f-' + (ns === 'flow' ? '' : ns + '-') + f.id;
    return '<div class="j-field"><label class="j-lab" for="' + id + '">' + f.label + '</label>' +
      '<select id="' + id + '" class="j-sel" data-feel="' + f.id + '" data-ns="' + ns + '"><option value="">Choisir…</option>' +
      f.opts.map(function (o, i) { return '<option value="' + (i + 1) + '"' + (String(i + 1) === String(cur) ? ' selected' : '') + '>' + o + '</option>'; }).join('') +
      '</select>' + (f.hint ? '<span class="j-fhint">' + esc(f.hint) + '</span>' : '') + '</div>';
  }
  function feelBlock(ns, title, open, detId) {
    return '<details class="j-det" id="' + detId + '"' + (open ? ' open' : '') + '><summary>' + title + '</summary>' +
      '<div class="j-sec" style="margin:0;gap:12px;padding-bottom:8px">' + FEEL.map(function (f) { return feelField(f, ns); }).join('') + '</div></details>';
  }

  function vFeel() {
    var d = new Date(), ph = phaseAt(L.mod(minOf(d) - L.getWake())), ok = feelComplete();
    var both = flow.mode === 'both', m = flow.slot != null ? PLAN[flow.slot] : null;
    var mod = both ? 'Étape 1 sur 2' : (m ? rLabel(m.r) + ' · prévu' : 'Relevé libre');
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="module">' + mod + '</span></div>' +
      '<h1 tabindex="-1">Ressenti</h1><p class="sub">Comment te sens-tu là, maintenant (ces 5 dernières minutes) ?</p>' +
      '<div class="nowline"><span class="dot" style="background:' + ph.color + '"></span><span>' + L.fmtClock(minOf(d)) + ' · ' + esc(ph.name) + '</span></div></header>' +
      '<main style="gap:18px;padding-top:14px">' +
      '<section class="j-sec"><h2>CORPS · LE VAISSEAU</h2>' + feelField(FEEL[0], 'flow') + feelField(FEEL[1], 'flow') + feelField(FEEL[2], 'flow') + '</section>' +
      '<section class="j-sec"><h2>ESPRIT · LE PILOTE</h2>' + feelField(FEEL[3], 'flow') + feelField(FEEL[4], 'flow') + '</section>' +
      '<details class="j-det" id="j-detbox"' + (flow.detail ? ' open' : '') + '><summary>Ajouter un détail (facultatif)</summary>' +
      '<textarea id="j-detail" class="j-ta mid" maxlength="500" placeholder="Ce qui explique ce ressenti : mal dormi, café, douleur…" aria-label="Détail du ressenti">' + esc(flow.detail) + '</textarea></details></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="j-next" data-act="' + (both ? 'intro' : 'save-releve') + '"' + (ok ? '' : ' disabled') + '>' +
      (both ? 'Suivant · test de vigilance' : 'Enregistrer le relevé') + '</button>' +
      '<span class="j-hint" id="j-feelhint">' + feelHint(ok, both) + '</span></div>';
  }
  function feelHint(ok, both) { return ok ? (both ? 'Étape suivante : 3 minutes de test' : 'Prêt à enregistrer') : 'Les 5 réponses sont nécessaires'; }

  function vIntro() {
    var m = flow.slot != null ? PLAN[flow.slot] : null, both = flow.mode === 'both';
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : 'Test libre : il sera enregistré, hors des moments du plan.';
    return '<header class="subhead"><div class="top">' + (both ? back('feel', 'Ressenti') : back('home', 'Journal')) +
      '<span class="module">' + (both ? 'Étape 2 sur 2' : (m ? rLabel(m.r) + ' · prévu' : 'Test libre')) + '</span></div>' +
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
      '<div class="foot"><button type="button" class="btn primary" data-act="run">Commencer (3 min)</button>' +
      (both ? '<button type="button" class="btn ghost" data-act="save-releve">Enregistrer le relevé sans le test</button>' : '') + '</div>';
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
    var r = flow.result, ph = phaseAt(relAt(flow.ts, flow.wake)), enough = r.n >= PVT.minValid, both = flow.mode === 'both';
    return '<header><span class="module" style="display:block">' + (both ? 'Étape 2 sur 2 · fin du test' : 'Fin du test') + '</span>' +
      '<h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' +
      clockOf(flow.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics"><div><b>' + (r.mean === null ? '—' : r.mean + '<small> ms</small>') + '</b><span>Temps de réaction moyen</span></div>' +
      '<div><b>' + r.lapses + '</b><span>Lapse (réponse &gt; 355 ms)</span></div>' +
      '<div><b>' + r.falseStarts + '</b><span>Faux départ (&lt; 100 ms)</span></div></div>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, 1 test)</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + plural(r.n, 'réponse', 'réponses') + '</span></div></section>' +
      (enough ? '' : '<p class="j-warn" role="alert">Trop peu de réponses (' + r.n + ', il en faut au moins ' + PVT.minValid + ') : ce test ne peut pas être enregistré. Refais-le quand tu es prêt.</p>') +
      (both ? '<section class="j-card"><h2 class="j-kick">TON RESSENTI</h2>' +
        '<p class="lead" style="font-size:14px;line-height:1.5;color:var(--text)">' + esc(feelWords(flow.feel, false)) + '</p>' +
        (flow.detail.trim() ? '<p style="font-size:13px;color:var(--muted)">' + esc(flow.detail.trim()) + '</p>' : '') + '</section>' : '') +
      '<p class="j-p">Un seul test ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot">' +
      (enough ? '<button type="button" class="btn primary" data-act="save">' + (both ? 'Enregistrer le relevé et le test' : 'Enregistrer le test') + '</button>'
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

  /* ---------- Formulaires : activité, repas, coucher, modification ---------- */
  function fld(label, inner, hint) {
    return '<div class="j-field"><label class="j-lab">' + label + '</label>' + inner + (hint ? '<span class="j-fhint">' + hint + '</span>' : '') + '</div>';
  }
  function timeIn(field, value, label) {
    return '<input class="j-sel" type="time" data-field="' + field + '" value="' + esc(value || '') + '" aria-label="' + esc(label) + '">';
  }
  function formHeader(title, sub) {
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<h1 tabindex="-1">' + title + '</h1><p class="sub">' + sub + '</p></header>';
  }
  function formFoot(act, label, enabled) {
    return '<div class="foot"><button type="button" class="btn primary" id="f-go" data-act="' + act + '"' + (enabled ? '' : ' disabled') + '>' + label + '</button>' +
      '<button type="button" class="btn ghost" data-act="home">Annuler</button></div>';
  }
  function formError() { return form && form.error ? '<p class="j-warn" role="alert">' + esc(form.error) + '</p>' : ''; }

  function formValid() {
    if (!form) return false;
    switch (form.type) {
      case 'act-start': return !!form.name.trim() && validClock(form.time);
      case 'act-end': return validClock(form.time);
      case 'meal': return !!form.text.trim() && validClock(form.time);
      case 'bed': return validClock(form.time);
      case 'edit':
        if (form.kind === 'activite') return !!form.name.trim() && validClock(form.time) && (form.end === '' || validClock(form.end));
        if (form.kind === 'repas') return !!form.text.trim() && validClock(form.time);
        return validClock(form.time);
    }
    return false;
  }

  function vActStart() {
    var cur = currentAct();
    var tags = actNames.map(function (n) {
      return manageActs
        ? '<button type="button" class="j-tag" data-act="act-del" data-name="' + esc(n) + '" aria-label="Retirer ' + esc(n) + ' de la liste">' + esc(n) + '<span class="x" aria-hidden="true">✕</span></button>'
        : '<button type="button" class="j-tag' + (form.name.trim().toLowerCase() === n.toLowerCase() ? ' on' : '') + '" data-act="act-pick" data-name="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');
    return formHeader('Activité', 'Une seule à la fois · le ressenti est facultatif') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      (cur ? '<p class="j-ok">« ' + esc(cur.name) + ' » est en cours depuis ' + clockOf(cur.ts) + ' : elle sera terminée à l’heure de début ci-dessous.</p>' : '') +
      '<section class="j-sec" style="gap:8px"><h2>QUELLE ACTIVITÉ ?</h2><div class="j-tags">' + (tags || '<span class="j-fhint">Liste vide : écris une activité ci-dessous.</span>') + '</div>' +
      '<button type="button" class="j-link" style="align-self:flex-start;padding-left:0" data-act="act-manage">' + (manageActs ? 'Terminé' : 'Modifier la liste') + '</button>' +
      '<input id="f-name" class="j-sel" type="text" maxlength="40" data-field="name" placeholder="Ou écris une autre activité…" value="' + esc(form.name) + '" aria-label="Nom de l’activité"></section>' +
      '<section class="j-sec">' + fld('Heure de début', timeIn('time', form.time, 'Heure de début'), 'Modifiable si tu as commencé plus tôt.') + '</section>' +
      feelBlock('as', 'Ressenti de début (facultatif)', form.feelOpen, 'f-feel') +
      '</main>' + formFoot('act-start-go', 'Commencer', formValid());
  }

  function vActEnd() {
    var a = entries.filter(function (e) { return e.id === form.id; })[0];
    return formHeader('Terminer l’activité', '« ' + esc(a ? a.name : '') + ' » · depuis ' + (a ? clockOf(a.ts) : '') + ' · le ressenti est facultatif') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec">' + fld('Heure de fin', timeIn('time', form.time, 'Heure de fin'), 'Modifiable si tu as fini plus tôt.') +
      '<div class="j-field"><label class="j-lab" for="f-comment">Comment ça s’est passé ? (facultatif)</label>' +
      '<textarea id="f-comment" class="j-ta mid" data-field="comment" maxlength="500" placeholder="Quelques mots…">' + esc(form.comment) + '</textarea></div></section>' +
      feelBlock('ae', 'Ressenti de fin (facultatif)', form.feelOpen, 'f-feel') +
      '</main>' + formFoot('act-end-go', 'Terminer l’activité', formValid());
  }

  function vMeal() {
    return formHeader('Repas', 'L’heure et ce que tu as mangé') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec">' + fld('Heure du repas', timeIn('time', form.time, 'Heure du repas'), 'Modifiable si tu notes après coup. Si tu as oublié, une note suffit.') +
      '<div class="j-field"><label class="j-lab" for="f-text">Contenu</label>' +
      '<textarea id="f-text" class="j-ta mid" data-field="text" maxlength="1000" placeholder="Ce que tu as mangé et bu…">' + esc(form.text) + '</textarea></div></section>' +
      '<p class="j-p">Un repas peut être noté pendant une activité : elle continue.</p></main>' + formFoot('meal-go', 'Enregistrer le repas', formValid());
  }

  function vBed() {
    return formHeader('Coucher', 'Quand tu vas te coucher') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec">' + fld('Heure du coucher', timeIn('time', form.time, 'Heure du coucher'), 'Modifiable si tu notes après coup (par ex. « 00:40 » ce matin).') + '</section>' +
      '<p class="j-p">LUNA en déduit ton « temps au lit » : du coucher au réveil. Ce n’est pas du sommeil mesuré (il comprend le temps pour s’endormir et les éveils de la nuit).</p></main>' +
      formFoot('bed-go', 'Enregistrer le coucher', formValid());
  }

  function vEdit() {
    var k = form.kind, title = { activite: 'Modifier l’activité', repas: 'Modifier le repas', coucher: 'Modifier le coucher' }[k], inner = '';
    if (k === 'activite') {
      inner = '<section class="j-sec"><div class="j-field"><label class="j-lab" for="f-name">Activité</label>' +
        '<input id="f-name" class="j-sel" type="text" maxlength="40" data-field="name" value="' + esc(form.name) + '"></div>' +
        fld('Heure de début', timeIn('time', form.time, 'Heure de début')) +
        fld('Heure de fin', timeIn('end', form.end, 'Heure de fin'), 'Laisse vide si l’activité est encore en cours.') +
        '<div class="j-field"><label class="j-lab" for="f-comment">Commentaire</label>' +
        '<textarea id="f-comment" class="j-ta mid" data-field="comment" maxlength="500">' + esc(form.comment) + '</textarea></div></section>' +
        '<p class="j-p">Un ressenti ajouté ici est marqué « noté après coup » : c’est un souvenir, pas ce que tu ressentais à ce moment-là.</p>' +
        feelBlock('as', 'Ressenti de début', form.feelOpen, 'f-feel') + feelBlock('ae', 'Ressenti de fin', form.feelOpen2, 'f-feel2');
    } else if (k === 'repas') {
      inner = '<section class="j-sec">' + fld('Heure du repas', timeIn('time', form.time, 'Heure du repas')) +
        '<div class="j-field"><label class="j-lab" for="f-text">Contenu</label>' +
        '<textarea id="f-text" class="j-ta mid" data-field="text" maxlength="1000">' + esc(form.text) + '</textarea></div></section>';
    } else {
      inner = '<section class="j-sec">' + fld('Heure du coucher', timeIn('time', form.time, 'Heure du coucher')) + '</section>';
    }
    return formHeader(title, 'Corrige l’heure ou le texte') + '<main style="padding-top:14px;gap:14px">' + formError() + inner + '</main>' +
      formFoot('edit-go', 'Enregistrer les changements', formValid());
  }

  function lastBackupText() {
    if (!lastBackup) return 'Dernière sauvegarde : jamais';
    var d = new Date(lastBackup), same = keyOf(d) === keyOf(new Date());
    return 'Dernière sauvegarde : ' + (same ? 'aujourd’hui' : 'le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) + ', ' + L.fmtClock(minOf(d));
  }

  function vBackup() {
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<h1 tabindex="-1">Sauvegarde</h1><p class="sub">Un fichier : tout ton Journal et ton réveil</p></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' +
      '<p class="lead">Au quotidien, rien à faire : tes relevés, tests, notes, activités, repas et couchers se gardent tout seuls sur cet appareil, d’un jour à l’autre.</p>' +
      '<p>La sauvegarde est une assurance : si l’appli est supprimée, si les données du navigateur sont effacées ou si tu changes d’appareil, le fichier permet de tout retrouver. Le téléphone et l’ordinateur ne se partagent rien : « Restaurer » en mode « Fusionner » réunit leurs données.</p>' +
      '<p>Suggestion, pas une règle : une fois par semaine.</p>' +
      '<p style="font-size:12.5px">Le fichier contient tes notes, tes repas et tes activités : range-le dans un endroit privé.</p>' +
      '<p class="last">' + lastBackupText() + '</p></section>' +
      '<div class="j-actions"><button type="button" class="btn primary" data-act="do-backup">Sauvegarder (fichier)</button>' +
      '<button type="button" class="btn secondary" data-act="restore">Restaurer depuis un fichier</button>' +
      '<span class="j-hint left" id="j-status" role="status" aria-live="polite">' + esc(backupStatus) + '</span></div>' +
      '<details class="j-det" id="j-det"><summary>Si rien ne s’ouvre : copier le contenu</summary>' +
      '<textarea id="j-copy" class="j-ta small" readonly rows="5" aria-label="Contenu de la sauvegarde"></textarea>' +
      '<button type="button" class="btn secondary" data-act="copy">Copier le texte</button></details>' +
      '<p class="j-ver">Version du code : ' + esc(L.version || '?') + '</p></main>';
  }

  function vRemind() {
    var w = L.getWake(), nP = remPhases().length;
    function opt(key, title, desc) {
      return '<label class="j-opt' + (rem[key] ? ' on' : '') + '"><input type="checkbox" data-rem="' + key + '"' + (rem[key] ? ' checked' : '') + '>' +
        '<span class="t"><b>' + title + '</b><span class="d">' + desc + '</span></span></label>';
    }
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Rappels</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">Ton calendrier te prévient, appli fermée</p></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' +
      '<p class="lead">Chaque matin : entre ton réveil ci-dessus, puis crée le fichier du jour.</p>' +
      '<p>LUNA ne peut pas sonner quand elle est fermée : c’est ton calendrier qui te prévient. Les heures sont calées sur ton réveil : <b id="j-rwake">' + L.fmtClock(w) + '</b>.</p>' +
      '<p>Si un rappel passe, ce n’est pas grave : il n’y a rien à rattraper.</p>' +
      '<div class="chips" style="margin:0"><span class="chip hy">Heures = moyennes à ajuster</span></div></section>' +
      '<section class="j-sec" style="gap:8px"><h2>QUOI RAPPELER ?</h2>' +
      opt('moments', 'Moments du plan · ' + PLAN.length + ' par jour', 'Un rappel à l’heure de chaque moment (relevé, test, ou les deux), de ' + rLabel(PLAN[0].r) + ' à ' + rLabel(PLAN[PLAN.length - 1].r) + '. Pour un réveil à 8h10 : 8h40, 10h10, 11h10…') +
      opt('phases', 'Changements de phase · ' + nP + ' par jour', 'Au début de chaque phase, avec son conseil. Pas pour la première (tu viens de te réveiller). Désactivé au départ pour ne pas surcharger.') +
      '<div class="j-field" style="margin-top:4px"><label class="j-lab" for="j-rdays">Pour</label>' +
      '<select id="j-rdays" class="j-sel" data-rem="days">' + [1, 7, 14, 30].map(function (d) {
        return '<option value="' + d + '"' + (rem.days === d ? ' selected' : '') + '>' + (d === 1 ? 'Aujourd’hui seulement' : d + ' jours de suite') + '</option>';
      }).join('') + '</select></div></section>' +
      '<div class="j-actions"><button type="button" class="btn primary" id="j-mk" data-act="make-ics"' + (rem.moments || rem.phases ? '' : ' disabled') + '>Créer le fichier calendrier</button>' +
      '<span class="j-hint left" id="j-rstatus" role="status" aria-live="polite">' + esc(remStatus) + '</span></div>' +
      '<details class="j-det"><summary>Comment l’ajouter à mon calendrier ?</summary>' +
      '<p class="j-p" style="margin:0 0 8px"><b>iPhone</b> : ouvre le fichier obtenu (feuille de partage ou dossier Téléchargements) ; le calendrier de l’iPhone propose de l’ajouter. Choisis un calendrier lié à ton compte Google pour que les rappels arrivent aussi dans Google Agenda (non vérifié).</p>' +
      '<p class="j-p" style="margin:0 0 8px"><b>Google Agenda sur ordinateur</b> : Paramètres → Importer et exporter, puis choisis le fichier et le calendrier de destination. D’après l’aide de Google, l’import se fait sur ordinateur.</p>' +
      '<p class="j-p" style="margin:0 0 8px">Conseil : range-les dans un calendrier à part nommé « LUNA » ; pour tout retirer d’un coup, il suffit de le supprimer.</p>' +
      '<p class="j-p" style="margin:0 0 8px">Pas encore vérifié : où Chrome sur iPhone range ce fichier, et si ton calendrier garde les alarmes d’un fichier importé.</p></details></main>';
  }

  /* ---------- Restauration : affichage ---------- */
  function countsText(list) {
    var n = {};
    list.forEach(function (e) { var k = e.kind === 'releve' && e.pvt ? 'combo' : e.kind; n[k] = (n[k] || 0) + 1; });
    var parts = [];
    [['releve', 'relevé', 'relevés'], ['combo', 'relevé + test', 'relevés + tests'], ['test', 'test', 'tests'], ['activite', 'activité', 'activités'],
     ['repas', 'repas', 'repas'], ['coucher', 'coucher', 'couchers'], ['note', 'note', 'notes']].forEach(function (t) {
      if (n[t[0]]) parts.push(plural(n[t[0]], t[1], t[2]));
    });
    return parts.length ? parts.join(' · ') : 'aucune entrée';
  }
  function restoreStats() {
    var r = restore, known = {};
    entries.forEach(function (e) { known[e.id] = true; });
    var fresh = r.entries.filter(function (e) { return !known[e.id]; });
    var ts = r.entries.map(function (e) { return e.ts; });
    return { fresh: fresh, dup: r.entries.length - fresh.length,
             from: ts.length ? Math.min.apply(null, ts) : 0, to: ts.length ? Math.max.apply(null, ts) : 0 };
  }
  function dShort(ts) { return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); }

  function vRestore() {
    var r = restore, body = '', btn, canGo = !!r;
    if (r) {
      var s = restoreStats();
      btn = r.mode === 'merge' ? 'Restaurer (fusionner)' : (r.confirm ? 'Oui, remplacer mes données' : 'Restaurer (remplacer)');
      body = '<section class="j-card"><h2 class="j-kick">FICHIER CHOISI</h2>' +
        '<p class="lead" style="font-size:14px;font-weight:700;overflow-wrap:anywhere">' + esc(r.name || 'Texte collé') + '</p>' +
        '<p>' + (r.exportedAt ? 'Sauvegarde du ' + esc(dShort(r.exportedAt)) + ', ' + clockOf(r.exportedAt) : 'Date de sauvegarde inconnue') + '</p>' +
        '<p>' + esc(countsText(r.entries)) + (s.from ? ' · du ' + esc(dShort(s.from)) + ' au ' + esc(dShort(s.to)) : '') + '</p>' +
        '<p>' + plural(s.fresh.length, 'élément nouveau', 'éléments nouveaux') + ' pour cet appareil · ' + plural(s.dup, 'déjà présent', 'déjà présents') + '</p></section>' +
        '<section class="j-sec" style="gap:8px"><h2>COMMENT LE RESTAURER ?</h2>' +
        '<label class="j-opt' + (r.mode === 'merge' ? ' on' : '') + '"><input type="radio" name="rmode" value="merge"' + (r.mode === 'merge' ? ' checked' : '') + '>' +
        '<span class="t"><b>Fusionner <small>· recommandé</small></b><span class="d">Ajoute ce qui manque sur cet appareil. Rien n’est effacé, les doublons sont ignorés, ton réveil actuel est gardé.</span></span></label>' +
        '<label class="j-opt' + (r.mode === 'replace' ? ' on' : '') + '"><input type="radio" name="rmode" value="replace"' + (r.mode === 'replace' ? ' checked' : '') + '>' +
        '<span class="t"><b>Remplacer</b><span class="d">Efface le Journal de cet appareil, et met celui du fichier à la place (réveil compris). Ce qui a été fait après la sauvegarde est perdu.</span></span></label></section>' +
        (r.mode === 'replace' && r.confirm ? '<p class="j-warn" role="alert">Cela efface le contenu du Journal de cet appareil (' + esc(countsText(entries)) + ') pour mettre celui du fichier à la place.</p>' : '');
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

  var VIEWS = { home: vHome, feel: vFeel, intro: vIntro, run: vRun, result: vResult, note: vNote, backup: vBackup, restore: vRestore, history: vHistory,
                reminders: vRemind, 'act-start': vActStart, 'act-end': vActEnd, meal: vMeal, bed: vBed, edit: vEdit };

  function render() {
    root.innerHTML = (VIEWS[screen] || vHome)();
    L.navVisible(screen === 'home' || screen === 'backup' || screen === 'reminders');
    if (screen === 'home') { L.bindWake(root.querySelector('.wake-input')); updateHome(); }
    if (screen === 'reminders') L.bindWake(root.querySelector('.wake-input'));
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
  function afterSave(msg) {
    entries.sort(byTs);
    if (!persist()) msg += ' Attention : l’appareil refuse d’enregistrer.';
    notice = msg;
    flow = newFlow();
    form = null;
    updateAlert();
    go('home');
  }
  function baseEntry(kind, ts, wake) {
    return { id: uid(ts), kind: kind, ts: ts, day: dayKey(ts, wake), wake: wake, rel: relAt(ts, wake) };
  }
  function releveEntry(ts, wake) {
    var f = {}, e = baseEntry('releve', ts, wake);
    FEEL.forEach(function (x) { f[x.id] = +flow.feel[x.id]; });
    e.slot = flow.slot; e.plan = flow.slot != null ? 'prevu' : 'libre'; e.fv = 2; e.feel = f;
    var dt = (flow.detail || '').trim();
    if (dt) e.detail = dt.slice(0, 500);
    return e;
  }
  function saveReleveOnly() {
    if (!feelComplete()) return;
    var ts = flow.feelTs || Date.now(); // relevé + test : heure où le ressenti a été validé
    entries.push(releveEntry(ts, L.getWake()));
    afterSave('Relevé enregistré · ' + clockOf(ts) + '.');
  }
  function saveTest() { // test seul, ou relevé + test
    var r = flow.result, ts = flow.ts, wake = flow.wake;
    if (flow.mode === 'both') entries.push(releveEntry(flow.feelTs || ts, wake));
    var t = baseEntry('test', ts, wake);
    t.slot = flow.slot; t.plan = flow.slot != null ? 'prevu' : 'libre'; t.device = r.device; t.input = r.input;
    t.pvt = { n: r.n, mean: r.mean, lapses: r.lapses, falseStarts: r.falseStarts, timeouts: r.timeouts, rts: r.rts, durationMs: r.durationMs };
    entries.push(t);
    afterSave((flow.mode === 'both' ? 'Relevé et test enregistrés · ' : 'Test enregistré · ') + clockOf(ts) + '.');
  }
  function saveNote() {
    var text = noteText.trim();
    if (!text) return;
    var e = baseEntry('note', noteTs, L.getWake());
    e.text = text;
    entries.push(e);
    noteText = '';
    afterSave('Note enregistrée.');
  }

  /* ---------- Activités ---------- */
  function openActStart() {
    manageActs = false;
    form = { type: 'act-start', name: '', time: clockInput(Date.now()), feelStart: {}, feelOpen: false, error: '' };
    go('act-start');
  }
  function doActStart() {
    if (!form || !formValid()) return;
    var name = form.name.trim().slice(0, 40), ts = tsFromClock(form.time, Date.now()), cur = currentAct(), msg = '';
    if (cur && ts < cur.ts) { form.error = 'Cette heure est avant le début de « ' + cur.name + ' » (' + clockOf(cur.ts) + ').'; render(); return; }
    if (cur) { cur.end = ts; msg = '« ' + cur.name + ' » terminée à ' + clockOf(ts) + '. '; }
    var e = baseEntry('activite', ts, L.getWake());
    e.name = name; e.end = null; e.comment = '';
    var fs = partialFeel(form.feelStart);
    if (fs) e.feelStart = fs;
    entries.push(e);
    rememberAct(name);
    afterSave(msg + '« ' + name + ' » commencée à ' + clockOf(ts) + '.');
  }
  function openActEnd() {
    var a = currentAct();
    if (!a) { go('home'); return; }
    form = { type: 'act-end', id: a.id, time: clockInput(Date.now()), comment: a.comment || '', feelEnd: {}, feelOpen: false, error: '' };
    go('act-end');
  }
  function doActEnd() {
    if (!form || !formValid()) return;
    var a = entries.filter(function (e) { return e.id === form.id; })[0];
    if (!a) return;
    var ts = tsFromClock(form.time, Date.now());
    if (ts < a.ts) { form.error = 'L’heure de fin est avant le début (' + clockOf(a.ts) + ').'; render(); return; }
    a.end = ts;
    a.comment = form.comment.trim().slice(0, 500);
    var fe = partialFeel(form.feelEnd);
    if (fe) a.feelEnd = fe;
    afterSave('« ' + a.name + ' » terminée à ' + clockOf(ts) + ' (' + durText((ts - a.ts) / 60000) + ').');
  }

  /* ---------- Repas, coucher ---------- */
  function openMeal() { form = { type: 'meal', time: clockInput(Date.now()), text: '', error: '' }; go('meal'); }
  function doMeal() {
    if (!form || !formValid()) return;
    var ts = tsFromClock(form.time, Date.now()), e = baseEntry('repas', ts, L.getWake());
    e.text = form.text.trim().slice(0, 1000);
    entries.push(e);
    afterSave('Repas noté à ' + clockOf(ts) + '.');
  }
  function openBed() { form = { type: 'bed', time: clockInput(Date.now()), error: '' }; go('bed'); }
  function doBed() {
    if (!form || !formValid()) return;
    var now = Date.now(), ts = tsFromClock(form.time, now), e = baseEntry('coucher', ts, L.getWake());
    if (now - ts > 30 * 60000) e.memo = true; // noté bien après l'heure : de mémoire
    entries.push(e);
    afterSave('Coucher noté à ' + clockOf(ts) + '.');
  }
  // Carte du matin : « À quelle heure t'es-tu couché hier soir ? »
  function doBedCard() {
    var inp = $('j-bedin'), v = inp ? inp.value : '';
    if (!validClock(v)) { notice = 'Choisis l’heure de ton coucher.'; render(); return; }
    var ts = tsFromClock(v, Date.now()), wake = L.getWake(), info = todayInfo(), e = baseEntry('coucher', ts, wake);
    var d = dateOfKey(info.tk); d.setMinutes(wake);
    e.memo = true;
    if (d.getTime() > ts && d.getTime() - ts < 20 * 3600e3) e.wakeTs = d.getTime(); // le réveil de ce matin
    entries.push(e);
    afterSave('Coucher noté à ' + clockOf(ts) + '.');
  }
  function skipBed() {
    try { localStorage.setItem(KEY_BEDSKIP, todayInfo().tk); } catch (e) {}
    updateHome();
  }

  /* ---------- Modifier une entrée ---------- */
  // Heure saisie la plus proche de l'heure d'origine (± 1 jour).
  function nearestTs(clock, refTs) {
    var p = clock.split(':'), best = null;
    [-1, 0, 1].forEach(function (k) {
      var d = new Date(refTs); d.setDate(d.getDate() + k); d.setHours(+p[0], +p[1], 0, 0);
      if (best === null || Math.abs(d.getTime() - refTs) < Math.abs(best - refTs)) best = d.getTime();
    });
    return best;
  }
  function openEdit(id) {
    var e = entries.filter(function (x) { return x.id === id; })[0];
    if (!e || ['activite', 'repas', 'coucher'].indexOf(e.kind) < 0) return;
    form = { type: 'edit', id: id, kind: e.kind, time: clockInput(e.ts), error: '' };
    if (e.kind === 'activite') {
      form.name = e.name; form.end = e.end == null ? '' : clockInput(e.end); form.comment = e.comment || '';
      form.feelStart = Object.assign({}, e.feelStart || {}); form.feelEnd = Object.assign({}, e.feelEnd || {});
      form.feelOpen = !!e.feelStart; form.feelOpen2 = !!e.feelEnd;
    }
    if (e.kind === 'repas') form.text = e.text;
    go('edit');
  }
  function doEdit() {
    if (!form || !formValid()) return;
    var e = entries.filter(function (x) { return x.id === form.id; })[0];
    if (!e) return;
    var ts = nearestTs(form.time, e.ts);
    if (e.kind === 'activite') {
      var other = currentAct(), end = null;
      if (form.end) {
        end = tsAfter(form.end, ts);
        if (end - ts > 16 * 3600e3) { form.error = 'Cette activité durerait plus de 16 h : vérifie l’heure de fin.'; render(); return; }
      } else if (other && other.id !== e.id) {
        form.error = '« ' + other.name + ' » est déjà en cours : une seule activité à la fois. Indique une heure de fin.'; render(); return;
      }
      e.name = form.name.trim().slice(0, 40); e.ts = ts; e.end = end; e.comment = form.comment.trim().slice(0, 500);
      var fs = partialFeel(form.feelStart), fe = partialFeel(form.feelEnd);
      if (!sameFeel(fs, e.feelStart)) {
        if (fs) { e.feelStart = fs; e.feelStartLate = true; } else { delete e.feelStart; delete e.feelStartLate; }
      }
      if (!sameFeel(fe, e.feelEnd)) {
        if (fe) { e.feelEnd = fe; e.feelEndLate = true; } else { delete e.feelEnd; delete e.feelEndLate; }
      }
      rememberAct(e.name);
    } else if (e.kind === 'repas') {
      e.text = form.text.trim().slice(0, 1000); e.ts = ts;
    } else {
      e.ts = ts;
      if (e.wakeTs && !(e.wakeTs > ts && e.wakeTs - ts < 20 * 3600e3)) delete e.wakeTs;
    }
    e.day = dayKey(e.ts, e.wake); e.rel = relAt(e.ts, e.wake);
    normalizeActs();
    afterSave('Modifié.');
  }

  /* ---------- Sauvegarde ---------- */
  function buildBackup() {
    return JSON.stringify({ app: 'LUNA', v: 2, exportedAt: Date.now(), wake: L.wakeStr(L.getWake()), activities: actNames, entries: entries });
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
  // Envoie un fichier : feuille de partage si le navigateur la propose pour un fichier, sinon téléchargement.
  function shareOrDownload(text, name, type, title, cb) {
    var file = null;
    try { file = new File([text], name, { type: type }); } catch (e) {}
    function download() {
      try {
        var url = URL.createObjectURL(new Blob([text], { type: type }));
        var a = document.createElement('a');
        a.href = url; a.download = name;
        document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
        cb.downloaded();
      } catch (e) { cb.failed(); }
    }
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: title }).then(function () { cb.shared(); }, function (err) {
        if (err && err.name === 'AbortError') cb.aborted(); else download();
      });
    } else {
      download();
    }
  }
  function doBackup() {
    var name = 'luna-sauvegarde-' + keyOf(new Date()) + '.json';
    setStatus('');
    shareOrDownload(buildBackup(), name, 'application/json', 'Sauvegarde LUNA', {
      shared: function () { markBackup(); refreshLast(); setStatus('Fichier « ' + name + ' » partagé. Vérifie qu’il est bien rangé là où tu l’as choisi.'); },
      downloaded: function () { markBackup(); refreshLast(); setStatus('Fichier « ' + name + ' » téléchargé : cherche-le dans tes Téléchargements. Si rien n’apparaît, ouvre « copier le contenu » ci-dessous.'); },
      aborted: function () { setStatus('Sauvegarde annulée.'); },
      failed: function () { setStatus('Le téléchargement a échoué. Ouvre « copier le contenu » ci-dessous.'); }
    });
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

  /* ---------- Rappels : fichier calendrier (.ics, RFC 5545) ---------- */
  // Phases à annoncer : toutes sauf la première (on vient de se réveiller).
  function remPhases() { return L.phases.filter(function (p) { return p.s > 0; }); }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  // Lignes de 75 octets au plus ; la suite commence par une espace. On ne coupe jamais au milieu d'un caractère.
  function icsFold(line) {
    var enc = new TextEncoder(), out = [], cur = '', n = 0;
    Array.from(line).forEach(function (c) {
      var b = enc.encode(c).length;
      if (n + b > 75) { out.push(cur); cur = ' '; n = 1; }
      cur += c; n += b;
    });
    out.push(cur);
    return out.join('\r\n');
  }
  function icsLocal(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00'; }
  function icsUtc(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }

  // Heures « flottantes » (sans fuseau) : le calendrier les lit à l'heure locale de l'appareil.
  function buildIcs(o) {
    var wake = L.getWake(), now = new Date(), ev = [];
    var seq = Math.max(0, Math.floor((now.getTime() - Date.UTC(2026, 9, 1)) / 60000)); // monte à chaque nouvelle version du fichier
    function at(total) { return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, total, 0); }
    // Un seul jour : identifiants datés (refaire le fichier le même jour met les rappels à jour ; un autre jour en crée de nouveaux).
    var dayTag = o.days === 1 ? '-' + keyOf(now).replace(/-/g, '') : '';
    function add(uid, startTotal, durMin, summary, desc) {
      var s = at(startTotal), e = new Date(s.getTime() + durMin * 60000);
      var lines = ['BEGIN:VEVENT', 'UID:' + uid + dayTag + '@luna.local', 'DTSTAMP:' + icsUtc(now), 'SEQUENCE:' + seq,
        'DTSTART:' + icsLocal(s), 'DTEND:' + icsLocal(e)];
      if (o.days > 1) lines.push('RRULE:FREQ=DAILY;COUNT=' + o.days);
      ev.push(lines.concat(['SUMMARY:' + icsEsc(summary), 'DESCRIPTION:' + icsEsc(desc), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(summary), 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT']));
    }
    var wk = L.fmtClock(wake);
    if (o.moments) PLAN.forEach(function (m, i) {
      add('luna-moment-' + i, wake + m.r, 15, 'LUNA · ' + momTitle(m),
        'Moment prévu à ' + L.fmt(wake + m.r) + ' (' + rLabel(m.r) + ', calé sur ton réveil de ' + wk + '). ' + m.goal + (/[?!.]$/.test(m.goal) ? '' : '.') +
        ' Fenêtre : de ' + L.fmt(wake + m.r - WIN.before) + ' à ' + L.fmt(wake + m.r + WIN.after) + '. Si ce moment passe, ce n’est pas grave.');
    });
    if (o.phases) remPhases().forEach(function (p, i) {
      add('luna-phase-' + i, wake + p.s, 5, 'LUNA · Nouvelle phase · ' + p.name,
        'Début vers ' + L.fmt(wake + p.s) + ' (moyenne calée sur ton réveil de ' + wk + '). ' + p.advice +
        ' Étiquette : ' + p.status + (p.durLabel ? ' · durée : ' + p.durLabel.toLowerCase() : '') + '.');
    });
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LUNA//Rappels//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:LUNA'];
    ev.forEach(function (e) { lines = lines.concat(e); });
    lines.push('END:VCALENDAR');
    return { text: lines.map(icsFold).join('\r\n') + '\r\n', count: ev.length };
  }
  function setRStatus(msg) {
    remStatus = msg;
    var el = $('j-rstatus');
    if (el) el.textContent = msg;
  }
  function doIcs() {
    if (!rem.moments && !rem.phases) return;
    var out = buildIcs(rem), name = 'luna-rappels-' + keyOf(new Date()) + '.ics';
    var what = rem.days === 1 ? plural(out.count, 'rappel', 'rappels') + ' pour aujourd’hui'
                                : plural(out.count, 'rappel', 'rappels') + ' par jour, pendant ' + rem.days + ' jours';
    setRStatus('');
    shareOrDownload(out.text, name, 'text/calendar', 'Rappels LUNA', {
      shared: function () { setRStatus('Fichier « ' + name + ' » partagé (' + what + '). Ouvre-le avec ton calendrier pour l’ajouter.'); },
      downloaded: function () { setRStatus('Fichier « ' + name + ' » téléchargé (' + what + '). Ouvre-le pour l’ajouter à ton calendrier.'); },
      aborted: function () { setRStatus('Envoi annulé.'); },
      failed: function () { setRStatus('Le téléchargement a échoué.'); }
    });
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
    var acts = Array.isArray(o.activities) ? o.activities.filter(function (x) { return typeof x === 'string' && x.trim() && x.length <= 40; }).map(function (x) { return x.trim(); }).slice(0, 30) : [];
    return { name: name, entries: list, wake: typeof o.wake === 'string' ? o.wake : null, exportedAt: Number(o.exportedAt) > 0 ? Number(o.exportedAt) : 0,
             acts: acts, mode: 'merge', confirm: false, skipped: skipped };
  }
  function loadRestore(text, name) {
    var r = parseBackup(text, name);
    if (typeof r === 'string') { restore = null; restoreError = r; }
    else if (!r.entries.length) { restore = null; restoreError = 'Cette sauvegarde ne contient aucune entrée.'; }
    else { restore = r; restoreError = r.skipped ? plural(r.skipped, 'entrée illisible ignorée', 'entrées illisibles ignorées') + '.' : ''; }
    render();
  }
  function applyRestore() {
    var r = restore, s = restoreStats(), msg;
    if (r.mode === 'merge') {
      entries = entries.concat(s.fresh).sort(byTs);
      msg = 'Restauré. Ajouté : ' + countsText(s.fresh) + ' ; ' + plural(s.dup, 'était déjà présent', 'étaient déjà présents') + '.';
    } else {
      entries = r.entries.slice().sort(byTs);
      if (r.wake && L.parseWake(r.wake) !== null) L.setWake(r.wake, null);
      msg = 'Restauré : cet appareil contient maintenant ' + countsText(r.entries) + ' du fichier.';
    }
    // les noms d'activités du fichier, et ceux des activités restaurées, rejoignent la liste rapide
    r.acts.forEach(rememberAct);
    r.entries.forEach(function (e) { if (e.kind === 'activite') rememberAct(e.name); });
    normalizeActs();
    if (!persist()) msg += ' Attention : l’appareil refuse d’enregistrer ces données.';
    restore = null; restoreError = '';
    backupStatus = msg;
    updateAlert();
    go('backup');
  }

  /* ---------- Événements ---------- */
  function act(name, el) {
    var id = el.getAttribute('data-id');
    notice = '';
    switch (name) {
      case 'home': pendingDel = null; form = null; manageActs = false; flow = newFlow(); go('home'); break;
      case 'releve': flow = newFlow({ mode: 'releve' }); go('feel'); break;
      case 'test-libre': flow = newFlow({ mode: 'test' }); go('intro'); break;
      case 'moment': startMoment(Number(id)); break;
      case 'feel': go('feel'); break;
      case 'intro': if (screen === 'feel') flow.feelTs = Date.now(); go('intro'); break;
      case 'run': go('run'); break;
      case 'stop': if (pvt) pvt.finish('stop'); break;
      case 'save': saveTest(); break;
      case 'save-releve': saveReleveOnly(); break;
      case 'discard': flow = newFlow(); go('home'); break;
      case 'note': noteText = ''; noteTs = Date.now(); go('note'); break;
      case 'save-note': saveNote(); break;
      case 'act-start': openActStart(); break;
      case 'act-pick': if (form) { form.name = el.getAttribute('data-name'); render(); } break;
      case 'act-manage': manageActs = !manageActs; render(); break;
      case 'act-del':
        actNames = actNames.filter(function (n) { return n !== el.getAttribute('data-name'); });
        saveActNames(); render(); break;
      case 'act-start-go': doActStart(); break;
      case 'act-end': openActEnd(); break;
      case 'act-end-go': doActEnd(); break;
      case 'meal': openMeal(); break;
      case 'meal-go': doMeal(); break;
      case 'bed': openBed(); break;
      case 'bed-go': doBed(); break;
      case 'bed-card-go': doBedCard(); break;
      case 'bed-skip': skipBed(); break;
      case 'edit': openEdit(id); break;
      case 'edit-go': doEdit(); break;
      case 'backup': restore = null; restoreError = ''; go('backup'); break;
      case 'do-backup': doBackup(); break;
      case 'remind': remStatus = ''; go('reminders'); break;
      case 'make-ics': doIcs(); break;
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
        pendingDel = null; persist(); updateAlert(); render(); break;
    }
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-act]') : null;
    if (b && root.contains(b)) act(b.getAttribute('data-act'), b);
  });

  // Champ d'un formulaire (activité, repas, coucher, modification) : on garde la valeur dans `form`.
  function onField(t) {
    var f = t.getAttribute('data-field');
    if (!f || !form) return;
    form[f] = t.value;
    var b = $('f-go');
    if (b) b.disabled = !formValid();
  }
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-feel')) {
      var ns = t.getAttribute('data-ns') || 'flow', tgt = feelTarget(ns), key = t.getAttribute('data-feel');
      if (t.value) tgt[key] = t.value; else delete tgt[key];
      if (ns === 'flow') {
        var ok = feelComplete(), nx = $('j-next'), hint = $('j-feelhint');
        if (nx) nx.disabled = !ok;
        if (hint) hint.textContent = feelHint(ok, flow.mode === 'both');
      }
    } else if (t.getAttribute && t.getAttribute('data-field')) {
      onField(t);
    } else if (t.getAttribute && t.getAttribute('data-rem')) {
      var key2 = t.getAttribute('data-rem');
      if (key2 === 'days') rem.days = Number(t.value) || 1;
      else {
        rem[key2] = t.checked;
        var lab = t.closest('.j-opt');
        if (lab) lab.classList.toggle('on', t.checked);
      }
      var mk = $('j-mk');
      if (mk) mk.disabled = !(rem.moments || rem.phases);
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
    var t = e.target;
    if (t.id === 'j-note') {
      noteText = t.value;
      var b = $('j-notesave');
      if (b) b.disabled = !noteText.trim();
    } else if (t.id === 'j-detail') {
      flow.detail = t.value;
    } else if (t.getAttribute && t.getAttribute('data-field')) {
      onField(t);
    }
  });
  root.addEventListener('toggle', function (e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === 'j-det' && t.open) { var ta = $('j-copy'); if (ta) ta.value = buildBackup(); }
    else if (t.id === 'f-feel' && form) form.feelOpen = t.open;
    else if (t.id === 'f-feel2' && form) form.feelOpen2 = t.open;
  }, true);

  /* ---------- Alerte sur la Roue : activité en cours depuis longtemps ---------- */
  function updateAlert() {
    if (!L.setAlert) return;
    var a = currentAct(), min = a ? (Date.now() - a.ts) / 60000 : 0;
    if (a && min >= LONG_ACT_MIN) L.setAlert({ title: 'Activité en cours · ' + a.name, sub: 'Depuis ' + durText(min) + ' · la terminer ?' });
    else L.setAlert(null);
  }

  /* ---------- Branchement sur l'appli ---------- */
  function maybeUpdate() {
    updateAlert();
    if (root.hidden) return;
    if (screen === 'home') updateHome();
    if (screen === 'reminders') { var w = $('j-rwake'); if (w) w.textContent = L.fmtClock(L.getWake()); }
  }
  L.on('tick', maybeUpdate);
  L.on('wake', maybeUpdate);
  L.journal = {
    onShow: function () {
      notice = '';
      if (['home', 'backup', 'history', 'reminders'].indexOf(screen) < 0) { flow = newFlow(); form = null; manageActs = false; screen = 'home'; }
      render();
    }
  };
  readAll();
  updateAlert();
})();
