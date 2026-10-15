/* LUNA — module Journal (écran 2 du module Corps).
   Un seul réveil, partagé avec la Roue (window.LUNA, défini dans index.html).
   Données : localStorage « luna.journal » (relevés, tests, notes, activités, repas, couchers), sur l'appareil.
   Aucune donnée de naissance.

   Deux choses séparées (décision du 11/10) :
   - RELEVÉ = ressenti seulement (5 questions + détail facultatif). « prévu » (un moment du plan) ou « libre » (à tout moment) ;
   - TEST   = PVT-B (vigilance soutenue), 3 min, ou un test cognitif : Symbol Search (vitesse de traitement, ≈ 45 s),
              Rotation span (mémoire de travail, ≈ 90 s), Hand Swype (vitesse de réaction/choix, 60 s), Flanker (attention/inhibition, ≈ 110 s). « prévu » ou « libre ».
   Le plan de la journée (PLAN) est une simple liste en « réveil + X » : on peut ajouter ou changer des moments sans toucher au reste.

   Symbol Search (14/10) : protocole lu chez Hernandez et al. 2023 (20 essais, carte du bas identique à celle du haut) ;
   symboles, pauses, exclusions et entraînement = RÉGLAGES DE LA MAQUETTE du 14/10, qui ne changent plus pendant le recueil
   (chaque passage garde sa version et ses réglages). Tous les passages sont « libres » tant que le plan n'a pas de moment Symbol Search.

   Rotation span, Hand Swype, Flanker (15/10) : même principe — réglages = ceux des maquettes du 14/10, figés pendant le recueil
   (versions « v1 »), entraînement montré la première fois seulement et jamais enregistré, essai interrompu = rien d'enregistré.
   Chaque passage garde ses essais (compacts) ; tous les chiffres affichés sont recalculés à partir d'eux. Tous « libres » pour l'instant.

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
  var KEY = 'luna.journal', KEY_BK = 'luna.journal.lastBackup', KEY_ACTS = 'luna.activities', KEY_BEDSKIP = 'luna.bedSkip', KEY_PRAC = 'luna.practiced';

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

  // Symbol Search : RÉGLAGES FIGÉS (maquette du 14/10). Ne pas les changer en cours de recueil : la référence compare « mêmes réglages ».
  // iti = pause entre deux essais ; hit = retour visuel du toucher ; fbOk / fbErr = retour de l'entraînement (ms) ;
  // rtMin / rtMax = temps comptés (ms) ; minAcc = seuil sous lequel l'étude lue écartait le passage ; refMin = passages avant d'afficher une référence.
  var SS = { ver: 1, trials: 20, practice: 4, iti: 400, hit: 100, fbOk: 900, fbErr: 1400, ready: 1600,
             rtMin: 200, rtMax: 5000, symbols: 9, refMin: 3, minAcc: 0.7, estSec: 45 };
  var SS_NAMES = ['cercle', 'carré', 'triangle', 'plus', 'croix', 'losange', 'arche', 'zigzag', 'cible'];
  var SS_PATHS = [
    '<circle cx="50" cy="50" r="28"/>',
    '<rect x="24" y="24" width="52" height="52"/>',
    '<path d="M50 22L78 76L22 76Z"/>',
    '<path d="M50 20V80M20 50H80"/>',
    '<path d="M26 26L74 74M74 26L26 74"/>',
    '<path d="M50 18L82 50L50 82L18 50Z"/>',
    '<path d="M22 72A28 28 0 0 1 78 72"/>',
    '<path d="M16 62L33 38L50 62L67 38L84 62"/>',
    '<circle cx="50" cy="50" r="30"/><circle class="solid" cx="50" cy="50" r="9"/>'
  ];
  // Rotation span : RÉGLAGES FIGÉS (valeurs de départ de la maquette du 14/10, version téléphone de Hakun 2023). Ne pas les changer en cours de recueil.
  // blank = pause avant chaque lettre et chaque flèche ; arrow = durée de la flèche à retenir ; feedback = retour de l'entraînement (ms) ;
  // startTimeout = temps limite des lettres à l'entraînement seulement ; between = écran « Essai n sur 3 » ; 3 essais de 5 flèches, sans temps limite pendant le test.
  var RS = { ver: 1, trials: 3, size: 5, blank: 500, arrow: 1000, feedback: 800, startTimeout: 5000, between: 1400, refMin: 3, estSec: 90 };
  var RS_LETTERS = ['F', 'G', 'R'];
  var RS_DIRS = ['haut', 'haut-droite', 'droite', 'bas-droite', 'bas', 'bas-gauche', 'gauche', 'haut-gauche'];
  // Hand Swype : RÉGLAGES FIGÉS (maquette du 14/10 ; test NeuroUX, Paolillo 2024). dur = durée du test (la source : 60 s) ; swipe = distance du balayage (px) ;
  // hit = retour du sens enregistré, blank = vide entre deux essais, fbOk / fbErr = retour de l'entraînement ; pool = nombre d'essais tirés d'avance (jamais atteint en 60 s).
  var HS = { ver: 1, dur: 60000, hit: 150, blank: 150, swipe: 28, fbOk: 1000, fbErr: 1500, pool: 150, practice: 6, ready: 1600, el: 'ship', refMin: 3, estSec: 60 };
  var HS_DIRS = ['U', 'R', 'D', 'L'];
  var HS_WORD = { U: 'haut', D: 'bas', L: 'gauche', R: 'droite' };
  var HS_TXT = { U: 'vers le haut', D: 'vers le bas', L: 'vers la gauche', R: 'vers la droite' };
  var HS_KEYS = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
  // Flanker : RÉGLAGES FIGÉS (maquette du 14/10 ; NIH Toolbox, Zelazo 2014, et manuel ABCD sur téléphone). La flèche à juger est toujours au milieu.
  // fix = fixation (une des trois durées, tirée au hasard) ; iti = pause entre essais ; hit = bouton touché surligné ; limit = temps limite d'un essai ;
  // minRt = en dessous, une réponse juste n'est pas comptée dans les temps ; entraînement : blocs de 4 essais, 3 justes pour passer, 3 blocs au plus.
  var FL = { ver: 1, trials: 40, fix: [1000, 1250, 1500], iti: 800, hit: 100, limit: 3000, fbOk: 1000, fbErr: 1500, minRt: 100, practice: 4, pracBlocks: 3, pracPass: 3, ready: 1600, refMin: 3, estSec: 110 };
  // Les tests qu'on peut lancer librement (Journal → « Test libre »). Memory List viendra s'ajouter ici.
  var TESTS = [
    { id: 'pvt', name: 'PVT-B', cog: 'Vigilance soutenue', dur: '3 min' },
    { id: 'rs',  name: 'Rotation span', cog: 'Mémoire de travail', dur: '≈ ' + ssDur(RS.estSec * 1000) },
    { id: 'fl',  name: 'Flanker', cog: 'Inhibition', dur: '≈ ' + ssDur(FL.estSec * 1000) },
    { id: 'ss',  name: 'Symbol Search', cog: 'Vitesse de traitement', dur: '≈ ' + SS.estSec + ' s' },
    { id: 'hs',  name: 'Hand Swype', cog: 'Flexibilité', dur: ssDur(HS.estSec * 1000) }
  ];

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
    '.j-opt span.d{font-size:13px;line-height:1.4;color:var(--muted)}',
    // Choix du test libre
    '.j-pick{margin:0 5px;width:calc(100% - 10px);min-height:64px;padding:12px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line2);',
    '  color:var(--text);font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:3px}',
    '.j-pick .p1{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:15px;font-weight:700}',
    '.j-pick .p1 small{font-size:12px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.j-pick .p2{font-size:13px;color:var(--muted)}',
    '.j-pick .p3{font-size:12px;color:var(--nav-off);font-variant-numeric:tabular-nums}',
    // Symbol Search
    '#v-journal main.ss-main{padding:16px 20px 12px;gap:14px;align-items:center;justify-content:center}',
    '.ss-trial{width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.ss-card{display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;border:2px solid var(--line2);border-radius:14px;background:var(--card);color:var(--text);min-width:0}',
    '.ss-card svg{width:46px;height:46px;flex:none;fill:none;stroke:currentColor;stroke-width:8;stroke-linecap:round;stroke-linejoin:round}',
    '.ss-card svg .solid{fill:currentColor;stroke:none}',
    '.ss-top{width:min(100%,220px);min-height:96px;border-color:var(--text)}',
    '.ss-bottoms{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}',
    'button.ss-choice{appearance:none;-webkit-appearance:none;font:inherit;min-height:112px;cursor:pointer;touch-action:manipulation}',
    'button.ss-choice.hit{background:var(--nav-on);border-color:var(--text)}',
    '.ss-trial.blank .ss-card svg{visibility:hidden}',
    '.ss-cue{font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--muted);text-transform:uppercase;text-align:center}',
    '.ss-fb{font-size:15px;font-weight:600;color:var(--muted);min-height:1.6em;text-align:center}',
    '.ss-fb.ok{color:#52B7B0}',
    '.ss-between{font-size:26px;font-weight:700;text-align:center}',
    '.ss-note{font-size:14px;line-height:1.4;color:var(--muted);text-align:center}',
    '.ss-demo{display:flex;flex-direction:column;align-items:center;gap:10px;margin:0 5px}',
    '.ss-demo .ss-card svg{width:38px;height:38px}',
    '.ss-demo .ss-top{min-height:80px}',
    '.ss-strip{position:relative;height:28px;margin:4px 0;background:var(--bg);border:1px solid var(--line2);border-radius:6px}',
    '.ss-strip .band{position:absolute;top:0;bottom:0;background:var(--nav-on);border-left:1px solid var(--dash);border-right:1px solid var(--dash)}',
    '.ss-strip .med{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--muted)}',
    '.ss-strip .cur{position:absolute;top:50%;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:var(--text);border:2px solid var(--card)}',
    '.ss-ax{display:flex;justify-content:space-between;font-size:11.5px;color:var(--muted)}',
    '.ss-facts{display:flex;flex-direction:column;margin:0}',
    '.ss-facts div{display:flex;justify-content:space-between;gap:12px;border-top:1px solid var(--line);padding:6px 0;font-size:13px}',
    '.ss-facts dt{color:var(--muted)}',
    '.ss-facts dd{margin:0;font-weight:600;font-variant-numeric:tabular-nums;text-align:right}',
    '.ss-tab{width:100%;border-collapse:collapse;font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.ss-tab th,.ss-tab td{padding:4px;text-align:left;border-top:1px solid var(--line);white-space:nowrap}',
    '.ss-tabwrap{max-height:240px;overflow:auto;border:1px solid var(--line);border-radius:8px;margin-top:4px}',
    '.ss-sec{display:flex;flex-direction:column;gap:4px;padding:8px 0;border-top:1px solid var(--line)}',
    '.ss-sec h3{margin:0;font-size:13px;font-weight:700}',
    '.ss-sec p{margin:0;font-size:13px;line-height:1.45;color:var(--muted)}',
    '.ss-sec a{color:var(--text);overflow-wrap:anywhere}',
    '.ss-q{font-size:16px;line-height:1.35;color:var(--text);text-align:center;max-width:26ch;margin:0}',
    '.rn-wrap{width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;margin:auto 0}',
    // Rotation span
    '.rs-box{width:min(58vw,170px);aspect-ratio:1;max-width:100%;color:var(--text)}',
    '.rs-box.small{width:76px}',
    '.rs-box svg{width:100%;height:100%;display:block;overflow:visible}',
    '.rs-box text{fill:currentColor;font-family:inherit}',
    '.rs-demo{display:flex;justify-content:center;gap:28px;margin:0 5px}',
    '.rs-demo figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px}',
    '.rs-demo figcaption{font-size:12px;color:var(--muted);text-align:center;max-width:13ch}',
    '.rs-answers{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:min(100%,320px)}',
    '.rs-answers .btn.rs-big{min-height:60px;font-size:16px}',
    '.rs-count{font-size:14px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums;min-height:1.3em;margin:0}',
    '.rs-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:min(100%,272px)}',
    '.rs-tile{position:relative;appearance:none;-webkit-appearance:none;aspect-ratio:1;background:var(--card);border:1px solid var(--line2);border-radius:10px;color:var(--text);padding:8px;display:grid;place-items:center;cursor:pointer;touch-action:manipulation;font:inherit}',
    '.rs-tile svg{width:100%;height:100%;display:block}',
    '.rs-tile.sel{border-color:var(--text);background:var(--nav-on);box-shadow:inset 0 0 0 1px var(--text)}',
    '.rs-tile .n{position:absolute;top:2px;left:6px;font-size:12px;font-weight:700;color:var(--text)}',
    '.rs-marks{display:flex;flex-direction:column;gap:8px;align-items:center}',
    '.rs-row{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted)}',
    '.rs-cells{display:flex;gap:5px}',
    '.rs-m{width:16px;height:16px;border:2px solid var(--line2);border-radius:3px;display:inline-block;vertical-align:-3px}',
    '.rs-m.cp{background:var(--text);border-color:var(--text)}',
    '.rs-m.ap{border-color:var(--text)}',
    '.rs-m.no{border-style:dashed;border-color:var(--muted)}',
    '.rs-leg{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:12px;color:var(--muted)}',
    // Hand Swype
    '.hs-defs{position:absolute;width:0;height:0;overflow:hidden}',
    '.hs-rule,.hs-pad{--p:min(7rem,calc((100vw - 5.5rem) / 3));flex:none}',
    '.hs-trial{width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;margin:auto 0;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.hs-rule{align-self:center;width:calc(var(--p) * 3);max-width:100%;min-height:66px;display:flex;align-items:center;gap:10px;padding:10px 12px;border:2px solid var(--text);background:var(--nav-on);border-radius:12px;font-size:16px;line-height:1.25;text-align:left;color:var(--text)}',
    '.hs-rule[data-rule="move"]{border-style:dashed;background:var(--card)}',
    '.hs-rule svg{width:34px;height:34px;flex:none}',
    '.hs-rule b{font-weight:700;text-transform:uppercase;letter-spacing:.04em}',
    '.hs-rule.off{visibility:hidden}',
    '.hs-pad{position:relative;align-self:center;width:calc(var(--p) * 3);max-width:100%;height:calc(var(--p) * 2);overflow:hidden;background:var(--card);border:1px solid var(--line2);border-radius:12px;touch-action:none;cursor:grab;color:var(--text);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.hs-pad.demo{cursor:default;margin:0 auto}',
    '.hs-rule.demo{margin:0 auto}',
    '.hs-belt{position:absolute;left:calc(var(--p) * -1);top:calc(var(--p) * -1);display:grid;grid-template-columns:repeat(5,var(--p));grid-auto-rows:var(--p);animation-duration:1.3s;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform;--a:0deg}',
    '.hs-belt[data-point="R"]{--a:90deg}',
    '.hs-belt[data-point="D"]{--a:180deg}',
    '.hs-belt[data-point="L"]{--a:270deg}',
    '.hs-belt .h{width:calc(var(--p) * .78);height:calc(var(--p) * .78);margin:calc(var(--p) * .11);transform:rotate(var(--a))}',
    '.hs-belt.mv-R{animation-name:hsbeltR}',
    '.hs-belt.mv-L{animation-name:hsbeltL}',
    '.hs-belt.mv-D{animation-name:hsbeltD}',
    '.hs-belt.mv-U{animation-name:hsbeltU}',
    '@keyframes hsbeltR{from{transform:translateX(0)}to{transform:translateX(var(--p))}}',
    '@keyframes hsbeltL{from{transform:translateX(var(--p))}to{transform:translateX(0)}}',
    '@keyframes hsbeltD{from{transform:translateY(0)}to{transform:translateY(var(--p))}}',
    '@keyframes hsbeltU{from{transform:translateY(var(--p))}to{transform:translateY(0)}}',
    '.hs-reg{position:absolute;top:0;right:0;bottom:0;left:0;display:grid;place-items:center;color:var(--muted)}',
    '.hs-reg svg{width:44px;height:44px}',
    '@media (pointer:coarse){.hs-keys{display:none}}',
    '@media (prefers-reduced-motion:reduce){.hs-pad.demo .hs-belt{animation:none}}',
    // Flanker
    '.fl-trial{width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;margin:auto 0;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.fl-stim{display:flex;align-items:center;justify-content:center;gap:6px;height:clamp(4.2rem,20vw,6rem);width:100%;color:var(--text)}',
    '.fl-a{position:relative;width:min(15vw,4.2rem);aspect-ratio:1;flex:none}',
    '.fl-a svg{width:100%;height:100%;display:block;overflow:visible}',
    '.fl-a.tg::after{content:"";position:absolute;left:50%;top:74%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:12px solid var(--text)}',
    '.fl-resp{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}',
    'button.fl-btn{appearance:none;-webkit-appearance:none;min-height:76px;font-size:16px;display:flex;align-items:center;justify-content:center;gap:10px;touch-action:manipulation}',
    'button.fl-btn svg{width:34px;height:34px;flex:none}',
    'button.fl-btn.hit{background:var(--nav-on);border-color:var(--text)}'
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

  /* ---------- Symbol Search : fonctions pures ---------- */
  // Signature des réglages : deux passages ne se comparent que si elle est identique.
  var SS_CFG = 'v' + SS.ver + '/n' + SS.trials + '/iti' + SS.iti + '/rt' + SS.rtMin + '-' + SS.rtMax + '/sym' + SS.symbols;
  function ssMedian(a) {
    if (!a.length) return null;
    var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function ssShuffle(a, rnd) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function ssHalf(n, first, second) { // n valeurs : la moitié `first`, le reste `second`
    var half = Math.floor(n / 2), out = [];
    for (var i = 0; i < n; i++) out.push(i < half ? first : second);
    return out;
  }
  // Une carte du haut : deux symboles différents, pas la même paire que l'essai d'avant (boucles bornées).
  function ssPair(rnd, prev) {
    for (var k = 0; k < 200; k++) {
      var a = Math.floor(rnd() * SS.symbols), b = Math.floor(rnd() * SS.symbols);
      if (a !== b && a + '-' + b !== prev) return [a, b];
    }
    return prev === '0-1' ? [0, 2] : [0, 1]; // repli, ne devrait jamais servir
  }
  function ssOther(rnd, a, b) { // un symbole qui n'est ni a ni b
    for (var k = 0; k < 200; k++) { var c = Math.floor(rnd() * SS.symbols); if (c !== a && c !== b) return c; }
    for (var c2 = 0; c2 < SS.symbols; c2++) if (c2 !== a && c2 !== b) return c2;
    return 0;
  }
  /* n essais (pair). La moitié des bonnes cartes à gauche, la moitié à droite ; la moitié des écarts sur le 1er symbole, la moitié sur le 2e.
     Jamais 4 fois le même côté d'affilée, jamais deux fois de suite la même carte du haut. (Règles de la maquette du 14/10.) */
  function ssMake(n, rnd) {
    var sides = [], k, i;
    for (k = 0; k < 300; k++) {
      sides = ssShuffle(ssHalf(n, 'L', 'R'), rnd);
      var ok = true;
      for (i = 3; i < n; i++) if (sides[i] === sides[i - 1] && sides[i] === sides[i - 2] && sides[i] === sides[i - 3]) { ok = false; break; }
      if (ok) break;
    }
    var ks = ssShuffle(ssHalf(n, 0, 1), rnd), out = [], prev = '';
    for (i = 0; i < n; i++) {
      var p = ssPair(rnd, prev), a = p[0], b = p[1], c = ssOther(rnd, a, b);
      prev = a + '-' + b;
      out.push({ top: [a, b], match: [a, b], foil: ks[i] === 0 ? [c, b] : [a, c], side: sides[i], k: ks[i] });
    }
    return out;
  }
  // tr : [{ side:'L'|'R', resp:'L'|'R', rt:ms }]. Temps comptés : réponses justes entre rtMin et rtMax.
  function ssScore(tr) {
    var correct = 0, excl = 0, used = [];
    tr.forEach(function (t) {
      if (t.resp === t.side) {
        correct++;
        if (t.rt < SS.rtMin || t.rt > SS.rtMax) excl++; else used.push(t.rt);
      }
    });
    return { n: tr.length, correct: correct, excluded: excl, used: used.length, med: ssMedian(used), acc: tr.length ? correct / tr.length : 0 };
  }
  // Référence personnelle (À ajuster) : médiane des passages PRÉVUS précédents, mêmes réglages, même appareil. Les tests libres n'y entrent pas.
  function ssRefCompare(prev, cur) {
    if (prev.length < SS.refMin) return { ok: false, n: prev.length, need: SS.refMin };
    var lo = Math.min.apply(null, prev), hi = Math.max.apply(null, prev), ref = ssMedian(prev);
    return { ok: true, n: prev.length, ref: ref, lo: lo, hi: hi, cur: cur, diff: cur - ref, pos: cur < lo ? 'below' : cur > hi ? 'above' : 'inside' };
  }
  function ssScale(c) {
    var lo = Math.min(c.lo, c.cur), hi = Math.max(c.hi, c.cur);
    var pd = hi > lo ? (hi - lo) * 0.2 : Math.max(Math.abs(hi) * 0.05, 1), d0 = lo - pd, d1 = hi + pd;
    return function (v) { return (v - d0) / (d1 - d0) * 100; };
  }
  function ssMs(v) { return v === null || v === undefined ? '·' : Math.round(v) + ' ms'; }
  function ssDur(ms) {
    if (ms === null || ms === undefined || !isFinite(ms)) return '·';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + ' s';
    var m = Math.floor(s / 60), r = s % 60;
    return m + ' min' + (r ? ' ' + pad(r) + ' s' : '');
  }
  function ssSide(s) { return s === 'L' ? 'gauche' : 'droite'; }
  function ssGlyph(i) { return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + SS_PATHS[i] + '</svg>'; }
  function ssPairHtml(p) { return ssGlyph(p[0]) + ssGlyph(p[1]); }
  function ssPairName(p) { return SS_NAMES[p[0]] + ' et ' + SS_NAMES[p[1]]; }

  /* ---------- Rotation span, Hand Swype, Flanker : fonctions pures ---------- */
  var RS_CFG = 'v' + RS.ver + '/' + RS.trials + 'x' + RS.size + '/free';
  var HS_CFG = 'v' + HS.ver + '/' + (HS.dur / 1000) + 's/random/' + HS.el + '/sw' + HS.swipe;
  var FL_CFG = 'v' + FL.ver + '/n' + FL.trials + '/mid/rt' + FL.minRt + '/lim' + FL.limit;
  function fmtN1(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }

  // Rotation span. Un essai = { a: flèches vues (0 à 15), s: flèches touchées, l: [[1 juste | 0 fausse | 2 temps écoulé, ms], …] }.
  function rsArrowLabel(id) { return (id < 8 ? 'Flèche longue' : 'Flèche courte') + ' vers ' + RS_DIRS[id % 8]; }
  function rsPick(n, rnd) { // n flèches différentes parmi 16 (aucune flèche répétée dans un essai)
    var a = [];
    for (var i = 0; i < 16; i++) a.push(i);
    return ssShuffle(a, rnd).slice(0, n);
  }
  function rsScoreTrial(arrows, sel) { // cp : à la bonne place ; ap : retrouvée n'importe où
    var cp = 0, ap = 0, marks = [];
    for (var j = 0; j < arrows.length; j++) {
      if (sel[j] === arrows[j]) { cp++; ap++; marks.push('cp'); }
      else if (sel.indexOf(arrows[j]) >= 0) { ap++; marks.push('ap'); }
      else marks.push('no');
    }
    return { cp: cp, ap: ap, marks: marks };
  }
  function rsSummary(trials) {
    var cp = 0, ap = 0, max = 0, lc = 0, lt = 0, to = 0, sum = 0, an = 0, marks = [];
    trials.forEach(function (t) {
      var sc = rsScoreTrial(t.a, t.s);
      cp += sc.cp; ap += sc.ap; max += t.a.length; marks.push(sc.marks);
      t.l.forEach(function (l) { lt++; if (l[0] === 1) lc++; if (l[0] === 2) to++; else { sum += l[1]; an++; } });
    });
    return { cp: cp, ap: ap, max: max, lc: lc, lt: lt, to: to, avgRt: an ? Math.round(sum / an * 10) / 10 : null, marks: marks };
  }

  // Hand Swype. Un essai (stocké) = [règle (0 pointent, 1 se déplacent), sens où ils pointent, sens où ils se déplacent, sens de la réponse, ms] ; sens : 0 haut, 1 droite, 2 bas, 3 gauche.
  // Tout est tiré au hasard à chaque essai ; seule règle : le sens où ils pointent et celui où ils se déplacent sont toujours différents.
  function hsMake(n, rnd) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var rule = rnd() < 0.5 ? 'point' : 'move', p = HS_DIRS[Math.floor(rnd() * 4)];
      var others = HS_DIRS.filter(function (d) { return d !== p; }), m = others[Math.floor(rnd() * 3)];
      out.push({ rule: rule, point: p, move: m, ans: rule === 'point' ? p : m, sw: i > 0 && out[i - 1].rule !== rule });
    }
    return out;
  }
  function hsPractice(rnd) { // tiré au hasard aussi, mais on garde un tirage où l'on voit les deux consignes (au moins 2 changements)
    for (var k = 0; k < 300; k++) {
      var tr = hsMake(HS.practice, rnd);
      if (tr.filter(function (t) { return t.sw; }).length >= 2) return tr;
    }
    return hsMake(HS.practice, rnd);
  }
  function hsSwipeDir(dx, dy, min) { // rien tant que le doigt n'a pas parcouru min px ; ensuite l'axe le plus long (à égalité, l'horizontal)
    if (Math.sqrt(dx * dx + dy * dy) < min) return null;
    return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
  }
  function hsExpand(list) {
    var out = [];
    list.forEach(function (t, i) {
      var rule = t[0] === 1 ? 'move' : 'point', p = HS_DIRS[t[1]], m = HS_DIRS[t[2]], ans = rule === 'point' ? p : m, resp = HS_DIRS[t[3]];
      out.push({ rule: rule, point: p, move: m, ans: ans, resp: resp, rt: t[4], ok: resp === ans, sw: i > 0 && out[i - 1].rule !== rule });
    });
    return out;
  }
  function hsCompact(t) { return [t.rule === 'move' ? 1 : 0, HS_DIRS.indexOf(t.point), HS_DIRS.indexOf(t.move), HS_DIRS.indexOf(t.resp), Math.round(t.rt)]; }
  // Temps médian des réponses justes (chiffre principal), erreurs, et temps selon que la consigne change ou se répète
  // (le premier essai n'a pas d'essai d'avant : il n'entre pas dans ces deux-là).
  function hsScore(list) {
    var tr = hsExpand(list), correct = 0, nSw = 0, nRep = 0, okSw = 0, okRep = 0, rt = [], rtSw = [], rtRep = [];
    tr.forEach(function (t, i) {
      if (i > 0) { if (t.sw) nSw++; else nRep++; }
      if (!t.ok) return;
      correct++; rt.push(t.rt);
      if (i > 0) { if (t.sw) { okSw++; rtSw.push(t.rt); } else { okRep++; rtRep.push(t.rt); } }
    });
    var med = ssMedian(rt), ms = ssMedian(rtSw), mr = ssMedian(rtRep);
    return { n: tr.length, correct: correct, errors: tr.length - correct, errRate: tr.length ? (tr.length - correct) / tr.length : null,
             med: med, medSw: ms, medRep: mr, swCost: (ms !== null && mr !== null) ? ms - mr : null, nSw: nSw, nRep: nRep, okSw: okSw, okRep: okRep };
  }

  // Flanker. Un essai (stocké) = [congruent 1 | incongruent 0, côté de la cible (0 gauche, 1 droite), réponse (0 gauche, 1 droite, 2 aucune), ms (−1 si aucune)].
  // De quoi recalculer le temps incongruent, le temps congruent et le coût (le chiffre à suivre n'est pas encore tranché).
  function flMake(n, rnd) { // moitié congruents, moitié incongruents, autant à gauche qu'à droite ; jamais 4 fois de suite la même condition ou le même côté (boucles bornées)
    var kinds = [], i;
    [true, false].forEach(function (c) { ['L', 'R'].forEach(function (d) { kinds.push({ cong: c, dir: d }); }); });
    var per = Math.floor(n / kinds.length);
    for (var attempt = 0; attempt < 500; attempt++) {
      var left = kinds.map(function () { return per; }), out = [], stuck = false;
      for (i = 0; i < per * kinds.length; i++) {
        var cand = [], L = out.length;
        for (var k = 0; k < kinds.length; k++) {
          if (!left[k]) continue;
          var nx = kinds[k];
          var runC = L >= 3 && out[L - 1].cong === nx.cong && out[L - 2].cong === nx.cong && out[L - 3].cong === nx.cong;
          var runD = L >= 3 && out[L - 1].dir === nx.dir && out[L - 2].dir === nx.dir && out[L - 3].dir === nx.dir;
          if (!runC && !runD) for (var w = 0; w < left[k]; w++) cand.push(k);
        }
        if (!cand.length) { stuck = true; break; }
        var pk = cand[Math.floor(rnd() * cand.length)];
        left[pk]--; out.push({ cong: kinds[pk].cong, dir: kinds[pk].dir });
      }
      if (!stuck) return out;
    }
    var base = [];
    for (i = 0; i < per; i++) kinds.forEach(function (k2) { base.push({ cong: k2.cong, dir: k2.dir }); });
    return ssShuffle(base, rnd);
  }
  function flPractice(rnd) { // 4 essais : 2 congruents, 2 incongruents, un de chaque côté
    return ssShuffle([{ cong: true, dir: 'L' }, { cong: true, dir: 'R' }, { cong: false, dir: 'L' }, { cong: false, dir: 'R' }], rnd);
  }
  function flExpand(list) {
    return list.map(function (t) {
      var dir = t[1] === 0 ? 'L' : 'R', resp = t[2] === 2 ? null : (t[2] === 0 ? 'L' : 'R');
      return { cong: t[0] === 1, dir: dir, resp: resp, rt: t[3] < 0 ? null : t[3], ok: resp === dir };
    });
  }
  function flCompact(t) { return [t.cong ? 1 : 0, t.dir === 'L' ? 0 : 1, t.resp === null ? 2 : (t.resp === 'L' ? 0 : 1), t.rt === null ? -1 : Math.round(t.rt)]; }
  function flScore(list) {
    var tr = flExpand(list), correct = 0, none = 0, fast = 0, nC = 0, nI = 0, okC = 0, okI = 0, rc = [], ri = [];
    tr.forEach(function (t) {
      if (t.cong) nC++; else nI++;
      if (t.resp === null) { none++; return; }
      if (t.ok) {
        correct++;
        if (t.cong) okC++; else okI++;
        if (t.rt < FL.minRt) fast++; else (t.cong ? rc : ri).push(t.rt);
      }
    });
    var mc = ssMedian(rc), mi = ssMedian(ri);
    return { n: tr.length, correct: correct, none: none, fast: fast, nCong: nC, nIncong: nI, okCong: okC, okIncong: okI,
             medCong: mc, medIncong: mi, cost: (mc !== null && mi !== null) ? mi - mc : null, usedCong: rc.length, usedIncong: ri.length };
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
  // Symbol Search : résumé + un essai = [côté de la bonne carte, écart sur le symbole 1 ou 2, côté choisi, temps en ms] (0 = gauche, 1 = droite).
  function cleanSs(s) {
    s = s && typeof s === 'object' ? s : {};
    var ver = int(s.ver, 1, 99), n = int(s.n, 1, 100), c = int(s.correct, 0, 100), u = int(s.used, 0, 100), x = int(s.excluded, 0, 100);
    if (ver === null || n === null || c === null || u === null || x === null || c > n || u > c || u + x !== c) return null;
    var med = s.med === null || s.med === undefined ? null : Number(s.med);
    var tr = Array.isArray(s.trials) ? s.trials.slice(0, 100).filter(function (t) {
      return Array.isArray(t) && t.length === 4 && (t[0] === 0 || t[0] === 1) && (t[1] === 0 || t[1] === 1) && (t[2] === 0 || t[2] === 1) &&
             isFinite(t[3]) && t[3] >= 0 && t[3] < 1e6;
    }).map(function (t) { return [t[0], t[1], t[2], Math.round(t[3])]; }) : [];
    return { ver: ver, cfg: typeof s.cfg === 'string' ? s.cfg.slice(0, 80) : '', n: n, correct: c, used: u, excluded: x,
             med: isFinite(med) && med >= 0 ? Math.round(med * 10) / 10 : null, durationMs: int(s.durationMs, 0, 1e7) || 0, trials: tr };
  }
  // Liste d'entiers de lo à hi, de minLen à maxLen éléments, sans doublon si `distinct` ; sinon null.
  function intList(v, lo, hi, minLen, maxLen, distinct) {
    if (!Array.isArray(v) || v.length < minLen || v.length > maxLen) return null;
    var out = [];
    for (var i = 0; i < v.length; i++) {
      var n = int(v[i], lo, hi);
      if (n === null || (distinct && out.indexOf(n) >= 0)) return null;
      out.push(n);
    }
    return out;
  }
  function round1(v) { return v === null || v === undefined ? null : Math.round(v * 10) / 10; }
  // Rotation span, Hand Swype, Flanker : on ne garde que les essais (et la version, les réglages, la durée) ; tous les chiffres sont recalculés à partir des essais.
  function cleanRs(s) {
    s = s && typeof s === 'object' ? s : {};
    var ver = int(s.ver, 1, 99);
    if (ver === null || !Array.isArray(s.trials) || s.trials.length < 1 || s.trials.length > 6) return null;
    var tr = [];
    for (var i = 0; i < s.trials.length; i++) {
      var t = s.trials[i];
      if (!t || typeof t !== 'object') return null;
      var a = intList(t.a, 0, 15, 1, 8, true), sel = intList(t.s, 0, 15, 0, 8, true);
      if (!a || !sel || sel.length > a.length || !Array.isArray(t.l) || t.l.length !== a.length) return null;
      var l = [];
      for (var j = 0; j < t.l.length; j++) {
        var x = t.l[j], c = Array.isArray(x) ? int(x[0], 0, 2) : null, rt = Array.isArray(x) ? Number(x[1]) : NaN;
        if (c === null || !isFinite(rt) || rt < 0 || rt >= 1e6) return null;
        l.push([c, Math.round(rt)]);
      }
      tr.push({ a: a, s: sel, l: l });
    }
    var sm = rsSummary(tr);
    return { ver: ver, cfg: typeof s.cfg === 'string' ? s.cfg.slice(0, 80) : '', cp: sm.cp, ap: sm.ap, max: sm.max, lc: sm.lc, lt: sm.lt, to: sm.to, avgRt: sm.avgRt,
             durationMs: int(s.durationMs, 0, 1e7) || 0, trials: tr };
  }
  function cleanHs(s) {
    s = s && typeof s === 'object' ? s : {};
    var ver = int(s.ver, 1, 99);
    if (ver === null || !Array.isArray(s.trials) || s.trials.length < 1 || s.trials.length > 200) return null;
    var tr = [];
    for (var i = 0; i < s.trials.length; i++) {
      var t = s.trials[i];
      if (!Array.isArray(t) || t.length !== 5) return null;
      var r = int(t[0], 0, 1), p = int(t[1], 0, 3), m = int(t[2], 0, 3), a = int(t[3], 0, 3), rt = Number(t[4]);
      if (r === null || p === null || m === null || a === null || p === m || !isFinite(rt) || rt < 0 || rt >= 1e6) return null;
      tr.push([r, p, m, a, Math.round(rt)]);
    }
    var sc = hsScore(tr);
    return { ver: ver, cfg: typeof s.cfg === 'string' ? s.cfg.slice(0, 80) : '', n: sc.n, correct: sc.correct, errors: sc.errors, med: round1(sc.med),
             medSw: round1(sc.medSw), medRep: round1(sc.medRep), durationMs: int(s.durationMs, 0, 1e7) || 0, trials: tr };
  }
  function cleanFl(s) {
    s = s && typeof s === 'object' ? s : {};
    var ver = int(s.ver, 1, 99);
    if (ver === null || !Array.isArray(s.trials) || s.trials.length < 1 || s.trials.length > 120) return null;
    var tr = [];
    for (var i = 0; i < s.trials.length; i++) {
      var t = s.trials[i];
      if (!Array.isArray(t) || t.length !== 4) return null;
      var c = int(t[0], 0, 1), d = int(t[1], 0, 1), r = int(t[2], 0, 2), rt = Number(t[3]);
      if (c === null || d === null || r === null || !isFinite(rt) || rt >= 1e6 || (r === 2) !== (rt === -1) || (r !== 2 && rt < 0)) return null;
      tr.push([c, d, r, Math.round(rt)]);
    }
    var sc = flScore(tr);
    return { ver: ver, cfg: typeof s.cfg === 'string' ? s.cfg.slice(0, 80) : '', n: sc.n, correct: sc.correct, none: sc.none, fast: sc.fast,
             medCong: round1(sc.medCong), medIncong: round1(sc.medIncong), durationMs: int(s.durationMs, 0, 1e7) || 0, trials: tr };
  }
  var CL = { ss: cleanSs, rs: cleanRs, hs: cleanHs, fl: cleanFl }; // un validateur par test enregistré
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
    if (e.test && CL[e.test]) { // Symbol Search, Rotation span, Hand Swype, Flanker
      var tp2 = CL[e.test](e[e.test]);
      if (!tp2) return null;
      o.test = e.test; o[e.test] = tp2;
      o.device = e.device === 'tel' ? 'tel' : 'ord';
      o.input = typeof e.input === 'string' ? e.input.slice(0, 12) : '';
      var nth = int(e.nth, 1, 100000), nd = int(e.nthDay, 1, 1000);
      if (nth !== null) o.nth = nth;
      if (nd !== null) o.nthDay = nd;
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
    return { mode: o.mode || 'releve', test: o.test || 'pvt', slot: o.slot == null ? null : o.slot, feel: {}, detail: '', feelTs: 0, ts: 0, wake: 0, result: null,
             tMode: 'test', prac: null };
  }

  /* ---------- Aujourd'hui : moments du plan ---------- */
  function todayInfo() {
    var now = new Date(), wake = L.getWake(), tk = dayKey(now.getTime(), wake), done = {};
    entries.forEach(function (e) {
      if (e.day !== tk || e.slot == null || (e.kind !== 'releve' && e.kind !== 'test')) return;
      if (e.test) return; // les moments du plan ne comptent que le PVT-B jusqu'à l'arrivée des moments à plusieurs tests
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
    } else if (e.test === 'ss') {
      var sv = e.ss, early = e.plan !== 'prevu' && e.rel < 120;
      line = ph.name + ' · ' + (sv.med === null ? 'pas de mesure' : ssMs(sv.med)) + ' · ' + sv.correct + '/' + sv.n + ' justes · ' + DEVICE_TXT[e.device];
      kindTxt = 'Symbol Search · ' + planTxt(e) + (early ? ' · avant R+2h' : '');
      if (e.nth) body = '<div class="body">Passage n° ' + e.nth + (e.nthDay ? ' · ' + (e.nthDay === 1 ? '1er' : e.nthDay + 'ᵉ') + ' de la journée' : '') + '</div>';
    } else if (e.test && TD[e.test] && TD[e.test].histLine) { // Rotation span, Hand Swype, Flanker
      var td3 = TD[e.test], early3 = e.plan !== 'prevu' && e.rel < 120;
      line = ph.name + ' · ' + td3.histLine(e[e.test]) + ' · ' + DEVICE_TXT[e.device];
      kindTxt = td3.name + ' · ' + planTxt(e) + (early3 ? ' · avant R+2h' : '');
      if (e.nth) body = '<div class="body">Passage n° ' + e.nth + (e.nthDay ? ' · ' + (e.nthDay === 1 ? '1er' : e.nthDay + 'ᵉ') + ' de la journée' : '') + '</div>';
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
    return '<header class="subhead"><div class="top">' + (both ? back('feel', 'Ressenti') : (m ? back('home', 'Journal') : back('tests', 'Tests'))) +
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

  /* ---------- Test libre : choisir le test ---------- */
  function testOf(e) { return e.test || 'pvt'; }
  function lastPass(id) {
    var best = null;
    entries.forEach(function (e) { if (e.kind === 'test' && testOf(e) === id && (!best || e.ts > best.ts)) best = e; });
    return best;
  }
  function vTests() {
    var tk = todayInfo().tk;
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="module">Test libre</span></div>' +
      '<h1 tabindex="-1">Choisir un test</h1><p class="sub">À tout moment · enregistré hors des moments du plan</p></header>' +
      '<main style="padding-top:14px;gap:10px">' +
      TESTS.map(function (t) {
        var l = lastPass(t.id);
        return '<button type="button" class="j-pick" data-act="test-pick" data-id="' + t.id + '">' +
          '<span class="p1"><span>' + esc(t.name) + '</span><small>' + esc(t.dur) + '</small></span>' +
          '<span class="p2">' + esc(t.cog) + '</span>' +
          '<span class="p3">' + (l ? 'Dernier passage : ' + esc(dayText(l.day, tk)).toLowerCase() + ', ' + clockOf(l.ts) : 'Jamais passé') + '</span></button>';
      }).join('') +
      '<p class="j-p">Un test libre ne valide aucun moment du plan. Il est gardé et compté dans ton numéro de passage, mais il n’entre ni dans ta référence ni dans la lecture par heure.</p></main>';
  }

  /* ---------- Tests : descripteurs ---------- */
  // Un descripteur par test enregistré (Symbol Search, Rotation span, Hand Swype, Flanker). Les écrans de Symbol Search sont écrits à part (version validée le 15/10) ;
  // les autres sont fabriqués à partir de leur descripteur (voir « Écrans communs »).
  var TD = {};
  TD.ss = { name: 'Symbol Search',
    pack: function (r) {
      return { ver: r.ver, cfg: r.cfg, n: r.n, correct: r.correct, used: r.used, excluded: r.excluded, med: r.med === null ? null : Math.round(r.med * 10) / 10,
               durationMs: r.durationMs,
               trials: r.trials.map(function (t) { return [t.side === 'L' ? 0 : 1, t.k, t.resp === 'L' ? 0 : 1, Math.round(t.rt)]; }) };
    } };
  var RUN = {}; // déroulés : { ss: { practice, test }, ... }, renseignés plus bas

  /* ---------- Symbol Search : écrans ---------- */
  var INPUT_TXT = { touch: 'doigt', mouse: 'souris', souris: 'souris', pen: 'stylet', clavier: 'clavier', mixte: 'mixte' };
  function ssPlural(n, one, many) { return n + ' ' + (n > 1 ? many : one); }

  function vSsIntro() {
    var m = flow.slot != null ? PLAN[flow.slot] : null, practiced = tPracticed('ss');
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : 'Test libre : il sera enregistré, hors des moments du plan et hors de ta référence.';
    if (!m && L.mod(minOf(new Date()) - L.getWake()) < 120) msg += ' Avant R+2h, il sera noté « avant R+2h » (l’inertie du réveil peut durer 2 à 4 h : Jewett 1999).';
    var demoTop = [0, 3], demoFoil = [0, 5];
    return '<header class="subhead"><div class="top">' + (m ? back('home', 'Journal') : back('tests', 'Tests')) +
      '<span class="module">' + (m ? rLabel(m.r) + ' · prévu' : 'Test libre') + '</span></div>' +
      '<h1 tabindex="-1">Symbol Search</h1><p class="sub">Vitesse de traitement · ≈ ' + SS.estSec + ' s</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      (notice ? '<p class="j-warn" role="alert">' + esc(notice) + '</p>' : '') +
      '<div class="ss-demo"><div class="ss-card ss-top" role="img" aria-label="Exemple, carte du haut : ' + ssPairName(demoTop) + '">' + ssPairHtml(demoTop) + '</div>' +
      '<div class="ss-bottoms" role="img" aria-label="Exemple, cartes du bas : à gauche ' + ssPairName(demoTop) + ', à droite ' + ssPairName(demoFoil) + '">' +
      '<div class="ss-card">' + ssPairHtml(demoTop) + '</div><div class="ss-card">' + ssPairHtml(demoFoil) + '</div></div></div>' +
      '<section class="j-card"><h2 class="j-kick">AVANT DE COMMENCER</h2><ol class="j-list">' +
      '<li>Une carte apparaît en haut, deux en bas.</li>' +
      '<li>Touche la carte du bas identique à celle du haut, le plus vite possible sans te tromper' + (DEVICE === 'ord' ? ' (ou touches ← et →)' : '') + '.</li>' +
      '<li>L’autre carte ne diffère que d’un symbole. Ici, il faudrait toucher celle de gauche.</li>' +
      '<li>' + SS.trials + ' essais. ' + (DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.') + '</li></ol></section>' +
      '<div class="chips"><div class="chips" style="margin:0"><span class="chip main">Établi · Hernandez 2023</span><span class="chip hy">À ajuster · symboles et réglages de LUNA</span></div></div>' +
      '<p class="j-p">Le protocole (20 essais, carte identique à choisir) vient de l’étude lue. Les neuf symboles sont dessinés pour LUNA : ce ne sont pas ceux de l’étude. Durée de ≈ ' + SS.estSec + ' s estimée d’après l’étude, non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.</p>' +
      '<p class="j-p">' + esc(msg) + '</p></main>' +
      '<div class="foot">' +
      (practiced
        ? '<button type="button" class="btn primary" data-act="ss-test">Commencer (≈ ' + SS.estSec + ' s)</button><button type="button" class="btn secondary" data-act="ss-practice">Refaire l’entraînement</button>'
        : '<button type="button" class="btn primary" data-act="ss-practice">Entraînement (≈ 20 s, une fois)</button><button type="button" class="btn secondary" data-act="ss-test">Passer directement au test</button>') +
      '</div>';
  }

  function vSsRun() {
    return '<header><div class="j-runhead"><h1 tabindex="-1">Symbol Search</h1><span class="j-time" id="rn-count" style="font-size:15px" aria-live="polite">Prêt</span></div>' +
      '<div class="j-prog" aria-hidden="true"><div id="rn-bar"></div></div></header>' +
      '<main class="ss-main" id="rn-stage"></main>' +
      '<div class="foot"><button type="button" class="btn ghost" data-act="run-stop">Arrêter</button></div>';
  }

  function vSsPrac() {
    var good = flow.prac ? flow.prac.good : 0;
    return '<header><span class="module" style="display:block">Entraînement terminé</span>' +
      '<h1 tabindex="-1" style="margin-top:4px">' + good + (good > 1 ? ' bonnes réponses' : ' bonne réponse') + ' sur ' + SS.practice + '</h1></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card"><p class="lead">L’entraînement n’est pas noté dans les passages.</p>' +
      '<p>Aucun seuil de réussite : l’étude lue n’en donne pas. Tu peux le refaire autant que tu veux.</p></section></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="ss-test">Passer le test</button>' +
      '<button type="button" class="btn secondary" data-act="ss-practice">Refaire l’entraînement</button>' +
      '<button type="button" class="btn ghost" data-act="ss-intro">Retour à la consigne</button></div>';
  }

  // Référence personnelle : médiane des passages PRÉVUS précédents, mêmes réglages, même appareil. Un test libre y est comparé mais n'y entre pas.
  function ssRefPrev(cfg, device) {
    return entries.filter(function (e) { return e.test === 'ss' && e.plan === 'prevu' && e.ss.cfg === cfg && e.device === device && e.ss.med !== null; })
      .map(function (e) { return e.ss.med; });
  }
  function ssRefHtml(r, libre) {
    var h = '<section class="j-card"><h2 class="j-kick">TA RÉFÉRENCE</h2><div class="chips" style="margin:0"><span class="chip hy">À ajuster</span></div>';
    if (libre) h += '<p>Test libre : il est comparé à ta référence mais n’y entre pas (« libre : hors référence »).</p>';
    if (r.med === null) return h + '<p>Pas de chiffre principal pour ce passage : aucune réponse juste n’a pu être comptée.</p></section>';
    var c = ssRefCompare(ssRefPrev(r.cfg, r.device), r.med);
    if (!c.ok) {
      return h + '<p>Pas encore de référence : il faut au moins ' + c.need + ' passages comparables (mêmes réglages, même appareil, faits aux moments du plan, hors « test libre »). Il y en a ' + c.n + '.</p>' +
        (c.n === 0 ? '<p>Les moments du plan, qui fourniront ces passages, arrivent dans une prochaine version de l’appli.</p>' : '') + '</section>';
    }
    var p = ssScale(c), lo = p(c.lo), hi = p(c.hi);
    var verdict = c.pos === 'inside' ? 'Dans la fourchette de tes passages précédents.' : (c.pos === 'above' ? 'Plus lent que tous tes passages précédents.' : 'Plus rapide que tous tes passages précédents.');
    var a = Math.round(Math.abs(c.diff)), diff = a === 0 ? 'aucun écart' : a + ' ms ' + (c.diff > 0 ? 'plus lent' : 'plus rapide');
    var label = 'Ce passage : ' + ssMs(c.cur) + '. Ta médiane : ' + ssMs(c.ref) + '. Fourchette de tes passages précédents : ' + ssMs(c.lo) + ' à ' + ssMs(c.hi) + '.';
    return h + '<p class="lead" style="font-size:14px">' + verdict + '</p>' +
      '<div class="ss-strip" role="img" aria-label="' + label + '"><i class="band" style="left:' + lo.toFixed(1) + '%;width:' + (hi - lo).toFixed(1) + '%"></i>' +
      '<i class="med" style="left:' + p(c.ref).toFixed(1) + '%"></i><i class="cur" style="left:' + p(c.cur).toFixed(1) + '%"></i></div>' +
      '<div class="ss-ax" aria-hidden="true"><span>← plus rapide</span><span>plus lent →</span></div>' +
      '<p class="j-fhint">Bande : fourchette de tes passages · trait : ta médiane · rond : ce passage.</p>' +
      '<dl class="ss-facts"><div><dt>Ce passage</dt><dd>' + ssMs(c.cur) + '</dd></div>' +
      '<div><dt>Ta médiane, ' + ssPlural(c.n, 'passage', 'passages') + ' avant</dt><dd>' + ssMs(c.ref) + '</dd></div>' +
      '<div><dt>Fourchette de ces passages</dt><dd>' + ssMs(c.lo) + ' à ' + ssMs(c.hi) + '</dd></div>' +
      '<div><dt>Écart avec ta médiane</dt><dd>' + diff + '</dd></div></dl>' +
      (c.n < 10 ? '<p class="j-fhint">Moins de 10 passages avant : la fourchette est encore approximative.</p>' : '') + '</section>';
  }

  function ssTableHtml(trials) {
    var rows = trials.map(function (t, i) {
      return '<tr><td>' + (i + 1) + '</td><td>' + ssSide(t.side) + '</td><td>' + ssSide(t.resp) + '</td><td>' + (t.ok ? 'juste' : 'erreur') + '</td><td>' + Math.round(t.rt) + ' ms</td></tr>';
    }).join('');
    return '<details class="j-det"><summary>Voir les essais en tableau</summary><div class="ss-tabwrap"><table class="ss-tab"><thead><tr><th>#</th><th>Bonne</th><th>Choix</th><th>Résultat</th><th>Temps</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>';
  }

  function vSsResult() {
    var r = flow.result, rel = relAt(r.ts, r.wake), ph = phaseAt(rel), libre = flow.slot == null, early = libre && rel < 120;
    var count = entries.filter(function (e) { return e.test === 'ss'; }).length + 1;
    return '<header><span class="module" style="display:block">Fin du test</span><h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' + clockOf(r.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics"><div><b>' + (r.med === null ? '—' : Math.round(r.med) + '<small> ms</small>') + '</b><span>Temps médian, réponses justes</span></div>' +
      '<div><b>' + r.correct + '<small> / ' + r.n + '</small></b><span>Réponses justes</span></div>' +
      '<div><b>' + r.used + '<small> / ' + r.n + '</small></b><span>Essais comptés dans le temps</span></div></div>' +
      '<p class="j-fhint" style="color:var(--text)"><b>Chiffre principal :</b> le temps médian des réponses justes (le premier chiffre). Plus bas = plus rapide.</p>' +
      '<p class="j-fhint">Durée du passage : ' + ssDur(r.durationMs) + ' (estimée : ≈ ' + SS.estSec + ' s)</p>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, ' + ssPlural(count, 'test', 'tests') + ')</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + (INPUT_TXT[r.input] || r.input) + '</span>' +
      '<span class="chip hy">' + (libre ? 'test libre' : 'prévu') + (early ? ' · avant R+2h' : '') + '</span></div></section>' +
      (r.acc < SS.minAcc ? '<p class="j-ok">Sous 70 % de réponses justes, l’étude lue écartait le passage de ses analyses.</p>' : '') +
      ssRefHtml(r, libre) +
      '<section class="j-card"><dl class="ss-facts" style="margin:0"><div><dt>Justes hors des temps comptés (moins de 0,2 s ou plus de 5 s)</dt><dd>' + r.excluded + '</dd></div></dl></section>' +
      ssTableHtml(r.trials) +
      '<details class="j-det"><summary>Comment lire ce résultat</summary>' +
      '<div class="ss-sec"><h3>Le chiffre qui compte · Établi</h3><p>Temps médian des réponses justes, en ms. Plus bas = plus rapide. L’étude lue suit le temps des réponses justes ; LUNA le résume par la médiane (choix à ajuster). À côté : les réponses justes. Sous 70 % de justes, l’étude écartait le passage.</p></div>' +
      '<div class="ss-sec"><h3>Comparé à quoi · À ajuster</h3><p>À toi-même : la médiane de tes passages précédents sur ce test, faits aux moments du plan, avec les mêmes réglages, sur cet appareil. Les tests libres ne comptent pas. Rien n’est affiché avant 3 passages.</p></div>' +
      '<div class="ss-sec"><h3>Pas de barème · Établi</h3><p>Dans les sources lues, aucune norme ni seuil « bon / mauvais » pour ce test. LUNA n’en invente pas. Aucun seuil de santé non plus : un professionnel décide.</p></div>' +
      '<div class="ss-sec"><h3>Prudence · Établi</h3><p>Un passage seul est bruité. L’ICC de 0,71 classe des personnes entre elles. Pour suivre une même personne, la variation fiable d’un passage à l’autre est de 0,41 à 0,53 (Sliwinski 2018, deux types de tâches confondus, résumé seul). Un passage hors de la fourchette n’est donc pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.</p></div>' +
      '<div class="ss-sec"><h3>Précision · Hypothèse à mesurer</h3><p>Le chronomètre part à l’image où les cartes s’affichent : précision d’une image environ (17 ms), non vérifiée sur ton téléphone.</p></div></details>' +
      '<p class="j-p">Un seul passage ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="ss-save">Enregistrer le test</button>' +
      '<button type="button" class="btn ghost" data-act="discard">Ne pas enregistrer</button></div>';
  }

  /* ---------- Écrans communs : Rotation span, Hand Swype, Flanker ---------- */
  // Le déroulé, les consignes, la référence et la lecture du résultat suivent les maquettes du 14/10. Les classes « ss-* » sont les styles partagés des tests.
  function secHtml(title, label, text) { return '<div class="ss-sec"><h3>' + title + ' · ' + label + '</h3><p>' + text + '</p></div>'; }
  function metric(v, label) { return '<div><b>' + v + '</b><span>' + label + '</span></div>'; }
  function factRow(dt, dd) { return '<div><dt>' + dt + '</dt><dd>' + dd + '</dd></div>'; }
  function factsCard(rows) { return '<section class="j-card"><dl class="ss-facts" style="margin:0">' + rows.join('') + '</dl></section>'; }
  function tTable(heads, rows, note) {
    return '<details class="j-det"><summary>Voir les essais en tableau</summary><div class="ss-tabwrap"><table class="ss-tab"><thead><tr>' +
      heads.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + (note ? '<p class="j-fhint">' + note + '</p>' : '') + '</details>';
  }
  function costTxt(c) { return c === null || c === undefined ? '·' : (c >= 0 ? '+' : '−') + Math.round(Math.abs(c)) + ' ms'; }
  function pctTxt(v) { return v === null || v === undefined ? '·' : Math.round(v * 100) + ' %'; }
  function readCompare(extra) {
    return secHtml('Comparé à quoi', 'À ajuster', 'À toi-même : la médiane de tes passages précédents sur ce test, faits aux moments du plan, avec les mêmes réglages, sur cet appareil' + (extra || '') +
      '. Les tests libres ne comptent pas. Rien n’est affiché avant 3 passages.');
  }
  function readPrec(what) {
    return secHtml('Précision', 'Hypothèse à mesurer', 'Le chronomètre part à l’image où ' + what + ' : précision d’une image environ (17 ms), non vérifiée sur ton téléphone.');
  }
  function link(url, label) { return '<a href="' + url + '" target="_blank" rel="noopener">' + label + '</a>'; }
  var ms2 = function (d) { var a = Math.round(Math.abs(d)); return a === 0 ? 'aucun écart' : a + ' ms ' + (d > 0 ? 'plus lent' : 'plus rapide'); };

  // --- Rotation span : dessins
  function rsArrowSvg(id) {
    var long = id < 8, dir = id % 8, tip = long ? 12 : 27.5, tail = long ? 88 : 72.5, h = 15;
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="rotate(' + (dir * 45) + ' 50 50)" fill="currentColor" stroke="currentColor">' +
      '<line x1="50" y1="' + tail + '" x2="50" y2="' + (tip + h - 2) + '" stroke-width="7" stroke-linecap="round"/>' +
      '<polygon points="50,' + tip + ' 40,' + (tip + h + 2) + ' 60,' + (tip + h + 2) + '" stroke-width="2" stroke-linejoin="round"/></g></svg>';
  }
  function rsLetterHtml(s, cls) {
    return '<div class="rs-box' + (cls ? ' ' + cls : '') + '"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="rotate(' + s.angle + ' 50 50)">' +
      '<g' + (s.mirror ? ' transform="translate(100 0) scale(-1 1)"' : '') + '><text x="50" y="78" text-anchor="middle" font-size="80" font-weight="600">' + s.ch + '</text></g></g></svg></div>';
  }
  // --- Hand Swype : dessins (vaisseaux : un avant et un arrière nets, donc un sens de pointage sans ambiguïté)
  function hsDefs() {
    return '<svg class="hs-defs" aria-hidden="true" focusable="false"><defs><symbol id="hs-el-ship" viewBox="0 0 100 100">' +
      '<path d="M50 4 C63 20 67 38 67 60 L67 78 L33 78 L33 60 C33 38 37 20 50 4 Z" fill="currentColor"/>' +
      '<path d="M33 54 L16 82 L33 76 Z M67 54 L84 82 L67 76 Z" fill="currentColor"/>' +
      '<rect x="41" y="78" width="18" height="10" rx="2" fill="currentColor"/>' +
      '<circle cx="50" cy="40" r="8" style="fill: var(--card)"/></symbol></defs></svg>';
  }
  function hsElSvg(cls) { return '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#hs-el-ship"/></svg>'; }
  function hsArrowSvg(dir) {
    var rot = { U: 0, R: 90, D: 180, L: 270 }[dir] || 0;
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g transform="rotate(' + rot + ' 50 50)" fill="currentColor" stroke="currentColor">' +
      '<line x1="50" y1="86" x2="50" y2="34" stroke-width="9" stroke-linecap="round"/><polygon points="50,12 28,42 72,42" stroke-width="3" stroke-linejoin="round"/></g></svg>';
  }
  function hsRuleHtml(rule) {
    var icon = rule === 'point' ? hsElSvg('') :
      '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 10 L78 44 H59 V90 H41 V44 H22 Z" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="round"/></svg>';
    return icon + '<span>Les vaisseaux <b>' + (rule === 'point' ? 'pointent' : 'se déplacent') + '</b></span>';
  }
  function hsBeltHtml(point, move) { // 20 vaisseaux (5 × 4) ; la zone en montre 3 × 2. Tous pointent d'un côté et avancent d'un autre.
    var cells = '';
    for (var i = 0; i < 20; i++) cells += hsElSvg('h');
    return '<div class="hs-belt mv-' + move + '" data-point="' + point + '">' + cells + '</div>';
  }
  // --- Flanker : dessins
  function flArrowSvg(dir) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g fill="currentColor" stroke="currentColor"' + (dir === 'L' ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
      '<line x1="14" y1="50" x2="68" y2="50" stroke-width="9" stroke-linecap="round"/><polygon points="90,50 62,30 62,70" stroke-width="3" stroke-linejoin="round"/></g></svg>';
  }
  function flStimHtml(t) { // cinq flèches ; un triangle sous celle du milieu, la cible
    var flank = t.cong ? t.dir : (t.dir === 'L' ? 'R' : 'L'), out = '';
    for (var k = 0; k < 5; k++) out += '<div class="fl-a' + (k === 2 ? ' tg' : '') + '">' + flArrowSvg(k === 2 ? t.dir : flank) + '</div>';
    return out;
  }
  function flFixHtml() {
    return '<div class="fl-a"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path d="M50 36v28M36 50h28" stroke="currentColor" stroke-width="7" stroke-linecap="round" fill="none"/></svg></div>';
  }
  function flWord(d) { return d === 'L' ? 'gauche' : 'droite'; }

  /* Descripteurs */
  TD.rs = { name: 'Rotation span', cog: 'Mémoire de travail', estSec: RS.estSec, pracDur: '≈ 1 min', cfg: RS_CFG,
    chipMain: 'Établi · Hakun 2023', chipHy: 'À ajuster · entraînement et réglages de LUNA',
    demo: function () {
      return '<div class="rs-demo"><figure role="img" aria-label="Exemple : la lettre G, en miroir et penchée">' + rsLetterHtml({ ch: 'G', mirror: true, angle: 45 }, 'small') + '<figcaption>Lettre : normale ou miroir ?</figcaption></figure>' +
        '<figure role="img" aria-label="Exemple : une longue flèche vers le haut à droite"><div class="rs-box small">' + rsArrowSvg(1) + '</div><figcaption>Flèche à retenir</figcaption></figure></div>';
    },
    steps: function () {
      return ['Une lettre apparaît, penchée. Normale ou en miroir ?', 'Une flèche apparaît 1 seconde. Retiens-la.',
        'Ça recommence, puis tu retouches les flèches dans l’ordre.',
        RS.trials + ' essais de ' + RS.size + ' flèches, sans temps limite pour juger les lettres. ' + (DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.')];
    },
    about: 'Le protocole (flèche à retenir 1 s entre des lettres à juger, rappel parmi 16 flèches, 3 essais de 5 flèches sans temps limite) vient de la version téléphone lue (Hakun 2023). L’entraînement est plus court que celui du manuel (5 lettres, puis 1 essai de 2 flèches). Aucune flèche n’est répétée dans un essai. Durée de ≈ ' + ssDur(RS.estSec * 1000) + ' estimée d’après les pauses et le manuel (environ 30 s par essai), non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.',
    pracTitle: function (p) { return 'Dernier essai : ' + p.cp + ' sur ' + p.size + ' flèches'; },
    pracNote: function () { return '<p class="lead">L’entraînement n’est pas noté dans les passages.</p><p>Tu peux le refaire autant que tu veux.</p>'; },
    fig: function (r) { return r.sc.cp; }, figE: function (p) { return p.cp; },
    ref: { fmt: fmtN1, diff: function (d) { var a = Math.abs(d); return a < 0.05 ? 'aucun écart' : fmtN1(a) + (a >= 2 ? ' flèches' : ' flèche') + (d > 0 ? ' de plus' : ' de moins'); },
           above: 'Plus de flèches à la bonne place que dans tous tes passages précédents.', below: 'Moins de flèches à la bonne place que dans tous tes passages précédents.',
           axLo: '← moins de flèches', axHi: 'plus de flèches →', none: 'Pas de chiffre principal pour ce passage.' },
    mainTxt: 'les flèches à la bonne place (le premier chiffre). Plus haut = mieux retenu.',
    metrics: function (r) {
      var s = r.sc;
      return metric(s.cp + '<small> / ' + s.max + '</small>', 'Flèches à la bonne place') + metric(s.ap + '<small> / ' + s.max + '</small>', 'Retrouvées, ordre ignoré') + metric(s.lc + '<small> / ' + s.lt + '</small>', 'Lettres justes');
    },
    facts: function (r) {
      var s = r.sc, rows = r.rec.trials.map(function (t, i) {
        var cells = s.marks[i].map(function (m) {
          return '<i class="rs-m ' + m + '" title="' + (m === 'cp' ? 'à la bonne place' : m === 'ap' ? 'retrouvée ailleurs' : 'non retrouvée') + '"></i>';
        }).join('');
        return '<div class="rs-row"><span>Essai ' + (i + 1) + '</span><span class="rs-cells">' + cells + '</span></div>';
      }).join('');
      return '<section class="j-card"><div class="rs-marks">' + rows + '</div>' +
        '<div class="rs-leg"><span><i class="rs-m cp"></i> bonne place</span><span><i class="rs-m ap"></i> retrouvée ailleurs</span><span><i class="rs-m no"></i> non retrouvée</span></div>' +
        '<dl class="ss-facts" style="margin:0">' + factRow('Temps moyen par lettre', s.avgRt === null ? '·' : (s.avgRt / 1000).toFixed(1).replace('.', ',') + ' s') + '</dl></section>';
    },
    read: function () {
      return secHtml('Le chiffre qui compte', 'Établi', 'Flèches à la bonne place, sur 15. Plus haut = mieux retenu. C’est le score partiel du protocole. Les autres lignes du résultat (flèches retrouvées ailleurs, lettres jugées, temps par lettre) sont des repères à côté.') +
        readCompare() +
        secHtml('Pas de barème', 'Établi', 'Dans les sources lues, aucune norme ni seuil « bon / mauvais » pour cette version téléphone. LUNA n’en invente pas. Aucun seuil de santé non plus : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Chez les étudiants de l’étude (Hakun 2023), la part de variation d’un passage à l’autre qui est un vrai changement, et non du hasard, est de 0,37 (0,48 d’un jour à l’autre), sur une échelle où 1 = tout est fiable. Environ 57 % de la variation du score vient de l’erreur de mesure. Un passage hors de la fourchette n’est donc pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.') +
        secHtml('Sources', 'Établi', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC9919550/', 'Hakun et al. 2023, version téléphone') + ' · ' + link('https://www.millisecond.com/library/v7/rotationspantask/rotationspantask/rotationspantask.manual', 'Manuel du Rotation Span, Millisecond') + '. Non lus : Kane et al. 2004 et Shah et Miyake 1996, le protocole d’origine.');
    },
    histLine: function (p) { return p.cp + '/' + p.max + ' flèches à la bonne place'; },
    pack: function (r) { return CL.rs(r.rec); } };

  TD.hs = { name: 'Hand Swype', cog: 'Flexibilité', estSec: HS.estSec, pracDur: '≈ 30 s', cfg: HS_CFG,
    chipMain: 'Établi · NeuroUX, Paolillo 2024', chipHy: 'À ajuster · vaisseaux et réglages de LUNA',
    demo: function () {
      return hsDefs() + '<div class="hs-rule demo" data-rule="point">' + hsRuleHtml('point') + '</div>' +
        '<div class="hs-pad demo" role="img" aria-label="Exemple : des vaisseaux pointent vers la droite et se déplacent vers le haut">' + hsBeltHtml('R', 'U') + '</div>' +
        '<p class="ss-note">Ici, les vaisseaux pointent vers la droite et se déplacent vers le haut.</p>';
    },
    steps: function () {
      return ['Des vaisseaux défilent. Chacun pointe d’un côté, et tous avancent d’un autre côté.',
        'Une consigne, au-dessus, dit lequel suivre : « pointent » (cadre plein) ou « se déplacent » (cadre en tirets).',
        'Balaye la zone du doigt dans ce sens, vite et sans te tromper. Ici, la consigne dit « pointent » : il faut balayer vers la droite. Avec « se déplacent », ce serait vers le haut.',
        'La consigne est tirée au hasard à chaque essai : elle peut rester la même ou changer, sans ordre. Le test dure 60 secondes.' +
          (DEVICE === 'ord' ? ' Sur ordinateur : souris ou touches ← ↑ → ↓ (le temps n’est alors pas comparable à celui d’un balayage).' : ''),
        DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.'];
    },
    about: 'Le protocole lu (des mains défilent, la consigne « pointent » ou « se déplacent » change, le test s’arrête après 60 s) vient de NeuroUX (Paolillo 2024). La source ne donne ni le nombre d’éléments, ni la vitesse, ni le rythme des changements, ni la distance du balayage, ni la façon de mesurer le temps : ce sont des choix de LUNA, et les éléments sont des vaisseaux dessinés pour LUNA (pas des mains). Le temps part de l’image où les éléments s’affichent et comprend le geste : il ne se compare pas à ceux de l’étude. Durée fixe de 60 s. On te compare à toi-même, <b>sur le même appareil et avec la même façon de répondre</b> (doigt, souris ou clavier).',
    pracTitle: function (p) { return p.good + (p.good > 1 ? ' bonnes réponses' : ' bonne réponse') + ' sur ' + HS.practice; },
    pracNote: function () { return '<p class="lead">L’entraînement n’est pas noté dans les passages.</p><p>Aucune source lue sur l’entraînement de ce test. Tu peux le refaire autant que tu veux.</p>'; },
    fig: function (r) { return r.sc.med; }, figE: function (p) { return p.med; },
    ref: { fmt: ssMs, diff: ms2, above: 'Plus lent que tous tes passages précédents.', below: 'Plus rapide que tous tes passages précédents.',
           axLo: '← plus rapide', axHi: 'plus lent →', none: 'Pas de chiffre principal pour ce passage : aucune réponse juste n’a pu être comptée.' },
    mainTxt: 'le temps médian des réponses justes (le premier chiffre), à lire avec les erreurs. Plus bas = plus rapide.',
    metrics: function (r) {
      var s = r.sc;
      return metric(s.med === null ? '—' : Math.round(s.med) + '<small> ms</small>', 'Temps médian, réponses justes') + metric(s.errors + '<small> / ' + s.n + '</small>', 'Erreurs') + metric(String(s.n), 'Essais faits en 60\u00a0s');
    },
    facts: function (r) {
      var s = r.sc;
      return factsCard([factRow('Taux d’erreurs', pctTxt(s.errRate)),
        factRow('Temps médian, consigne changée (' + s.okSw + ' justes sur ' + s.nSw + ')', ssMs(s.medSw)),
        factRow('Temps médian, même consigne (' + s.okRep + ' justes sur ' + s.nRep + ')', ssMs(s.medRep)),
        factRow('Écart : changée moins répétée (lecture de LUNA)', costTxt(s.swCost)),
        factRow('Façon de répondre', esc(INPUT_TXT[r.input] || r.input))]);
    },
    table: function (r) {
      var rows = hsExpand(r.rec.trials).map(function (t, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + (t.rule === 'point' ? 'pointent' : 'avancent') + '</td><td>' + (i === 0 ? '—' : (t.sw ? 'oui' : 'non')) + '</td><td>' + HS_WORD[t.ans] + '</td><td>' + HS_WORD[t.resp] + '</td><td>' + t.rt + ' ms</td></tr>';
      }).join('');
      return tTable(['#', 'Règle', 'Chgt', 'Attendu', 'Choix', 'Temps'], rows, 'Règle : ce que suit la consigne. Chgt : la consigne a changé depuis l’essai d’avant.');
    },
    read: function () {
      return secHtml('Le chiffre qui compte', 'À ajuster', 'Temps médian des réponses justes, en ms. Plus bas = plus rapide. Le temps part de l’apparition des éléments et s’arrête quand ton doigt a parcouru 28 px (ou à la touche, sur ordinateur). À lire avec les erreurs : la source suit les deux (ICC 0,86 pour le temps, 0,86 pour les erreurs). Un temps plus court avec plus d’erreurs peut vouloir dire que tu as seulement été plus vite, pas plus juste : c’est la lecture de LUNA, pas un chiffre lu. Pas de score qui les mélange. À côté, pour information : le nombre d’essais faits (la durée est fixe, donc il varie) et l’écart de temps entre un essai où la consigne change et un essai où elle se répète ; ce dernier est la lecture de LUNA, aucun chiffre lu pour ce test. Dans l’étude, un passage dont le temps médian est sous 0,5 s était écarté (effort supposé faible) ; LUNA le garde, avec ses erreurs.') +
        readCompare(' et avec la même façon de répondre (doigt, souris ou clavier)') +
        secHtml('Pas de barème', 'Établi', 'L’étude lue ne donne ni barème ni seuil pour ce test. Elle écrit que les chercheurs sont invités à utiliser leur propre groupe témoin pour comparer. Ses moyennes par âge décrivent un groupe, pas toi, et ne valent pas pour LUNA (autre mesure du temps, autres images). Aucun seuil de santé : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Dans l’étude, le temps d’une même personne varie en moyenne de 340 ms (écart-type) d’un passage à l’autre, pour un temps moyen de 1 809 ms. Les ICC (0,86) classent des personnes entre elles : ils ne disent pas si ton propre temps varie de façon fiable. D’un passage à l’autre, les erreurs baissent et le temps monte : les premiers passages peuvent bouger. Dans ce qui a été lu, aucun lien significatif avec l’heure n’est rapporté pour ce test. Un passage hors de la fourchette n’est pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte. Chiffres repris de la page par extraction automatique du texte, pas revérifiés sur les tableaux eux-mêmes.') +
        readPrec('les éléments s’affichent') +
        secHtml('Sources', 'Établi', link('https://www.jmir.org/2024/1/e51978', 'Paolillo et al. 2024, NeuroUX, J Med Internet Res 26:e51978') + '. Non lus : les trois annexes de l’article (fichiers DOCX), ses tableaux et figures vus seulement par extraction du texte, la page de l’éditeur de NeuroUX. Pas de description plus détaillée du protocole de Hand Swype trouvée.');
    },
    histLine: function (p) { return (p.med === null ? 'pas de mesure' : ssMs(p.med)) + ' · ' + ssPlural(p.errors, 'erreur', 'erreurs') + ' · ' + ssPlural(p.n, 'essai', 'essais'); },
    pack: function (r) { return CL.hs(r.rec); } };

  TD.fl = { name: 'Flanker', cog: 'Inhibition', estSec: FL.estSec, pracDur: '≈ 30 s', cfg: FL_CFG,
    chipMain: 'Établi · NIH Toolbox, Zelazo 2014', chipHy: 'À ajuster · réglages de LUNA',
    demo: function () {
      return '<div class="fl-stim" role="img" aria-label="Exemple : une flèche vers la droite, marquée d’un triangle, entourée de flèches vers la gauche">' + flStimHtml({ cong: false, dir: 'R' }) + '</div>' +
        '<p class="ss-cue">Flèche au-dessus du triangle</p>';
    },
    steps: function () {
      return ['Cinq flèches apparaissent. Un triangle marque celle à juger : ici, toujours celle du milieu.',
        'Touche « Gauche » ou « Droite » selon son sens, vite et sans te tromper' + (DEVICE === 'ord' ? ' (ou touches ← et →)' : '') + '.',
        'Celles autour peuvent pointer à l’opposé : ignore-les. Ici, il faudrait toucher « Droite ».',
        FL.trials + ' essais. ' + (DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.')];
    },
    about: 'Le protocole (flèche du milieu à juger, entourée de flèches qui pointent du même côté ou à l’opposé) vient du NIH Toolbox (Zelazo 2014) ; la fixation, les pauses et l’entraînement viennent du manuel du Flanker ABCD sur téléphone. Le nombre d’essais (40), le temps limite (3 s) et le calcul du temps (médiane des réponses justes de 100 ms ou plus) sont des choix de LUNA. Durée de ≈ ' + ssDur(FL.estSec * 1000) + ' estimée d’après les pauses, non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.',
    pracTitle: function (p) { return p.good + (p.good > 1 ? ' bonnes réponses' : ' bonne réponse') + ' sur ' + FL.practice + ' au dernier bloc'; },
    pracNote: function (p) {
      return '<p class="lead">L’entraînement n’est pas noté dans les passages.</p><p>' + (p.passed ? 'Le seuil du manuel (3 sur 4) est atteint.' : 'Le manuel passe au test après 3 blocs, même sans atteindre 3 sur 4.') + ' Tu peux le refaire autant que tu veux.</p>';
    },
    fig: function (r) { return r.sc.medIncong; }, figE: function (p) { return p.medIncong; },
    ref: { fmt: ssMs, diff: ms2, above: 'Plus lent que tous tes passages précédents.', below: 'Plus rapide que tous tes passages précédents.',
           axLo: '← plus rapide', axHi: 'plus lent →', none: 'Pas de chiffre principal pour ce passage : aucun essai incongruent juste n’a pu être compté.' },
    mainTxt: 'le temps médian des essais incongruents (le premier chiffre). Plus bas = plus rapide. Le chiffre à suivre n’est pas encore tranché : le coût d’interférence est gardé à côté.',
    metrics: function (r) {
      var s = r.sc;
      return metric(s.medIncong === null ? '—' : Math.round(s.medIncong) + '<small> ms</small>', 'Temps médian, essais incongruents') + metric(costTxt(s.cost).replace(' ', '\u00a0'), 'Coût d’interférence') + metric(s.correct + '<small> / ' + s.n + '</small>', 'Réponses justes');
    },
    facts: function (r) {
      var s = r.sc;
      return factsCard([factRow('Temps médian, essais congruents', ssMs(s.medCong)),
        factRow('Essais comptés dans les temps (cong. / incong.)', s.usedCong + ' / ' + s.usedIncong),
        factRow('Justes : congruents, incongruents', s.okCong + '/' + s.nCong + ', ' + s.okIncong + '/' + s.nIncong),
        factRow('Justes trop rapides (moins de 100 ms), écartées du temps', String(s.fast)),
        factRow('Sans réponse dans les 3 s', String(s.none))]);
    },
    table: function (r) {
      var rows = flExpand(r.rec.trials).map(function (t, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + (t.cong ? 'cong.' : 'incong.') + '</td><td>' + flWord(t.dir) + '</td><td>' + (t.resp === null ? '—' : flWord(t.resp)) + '</td><td>' + (t.rt === null ? '—' : t.rt + ' ms') + '</td></tr>';
      }).join('');
      return tTable(['#', 'Condition', 'Cible', 'Choix', 'Temps'], rows, 'Cong. : les flèches autour pointent du même côté que la cible. Incong. : à l’opposé.');
    },
    read: function () {
      return secHtml('Le chiffre qui compte', 'À ajuster', 'Temps médian des essais incongruents, en ms : ceux où les flèches autour pointent à l’opposé de la cible. Plus bas = plus rapide. Seules les réponses justes de 100 ms ou plus comptent. À côté : les réponses justes, et le coût d’interférence (incongruent moins congruent). Ce choix est celui de LUNA. Le temps incongruent est plus stable (ICC 0,66) mais mêle vitesse générale et inhibition. Le coût isole mieux l’inhibition mais est plus fragile (ICC 0,4). Le chiffre à suivre reste à décider : LUNA garde de quoi calculer les deux.') +
        readCompare() +
        secHtml('Pas de barème', 'Établi', 'Le NIH Toolbox standardise son score (moyenne 10, écart-type 3) avec ses propres normes. Elles situent une personne parmi la population : elles ne disent pas à quelle heure tu es à ton meilleur, et elles ne s’appliquent pas à LUNA (autres durées, autres images). Aucun autre barème ni seuil dans les sources lues, et aucun seuil de santé : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Les ICC lus (0,83 pour le score NIH) classent des personnes entre elles : ils ne disent pas si ton propre temps varie de façon fiable d’un passage à l’autre, chiffre non lu pour ce test. L’effet d’apprentissage est petit (d = 0,27), mais les premiers passages peuvent bouger. Ces chiffres valent pour la cible au milieu. Un passage hors de la fourchette n’est pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.') +
        readPrec('la cible s’affiche') +
        secHtml('Sources', 'Établi', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC4601803', 'Zelazo et al. 2014, NIH Toolbox') + ' · ' + link('https://www.millisecond.com/library/v7/flankertask/abcdarrowflankertest/abcdarrowflankertest_smartphone/abcdarrowflankertest_smartphone.manual', 'Manuel du Flanker ABCD sur téléphone') + ' · ' + link('https://link.springer.com/article/10.3758/s13428-017-0935-1', 'Hedge, Powell et Sumner 2018') + '. Non lus : Eriksen et Eriksen 1974 (l’origine du test), la figure 2 de Zelazo (les durées), les tableaux de Hedge.');
    },
    histLine: function (p) { return (p.medIncong === null ? 'pas de mesure' : 'incongruent ' + ssMs(p.medIncong)) + ' · ' + p.correct + '/' + p.n + ' justes'; },
    pack: function (r) { return CL.fl(r.rec); } };

  RUN.rs = { practice: rsRunPractice, test: rsRunTest };
  RUN.hs = { practice: hsRunPractice, test: hsRunTest };
  RUN.fl = { practice: flRunPractice, test: flRunTest };

  // Référence personnelle : médiane des passages PRÉVUS précédents, mêmes réglages, même appareil (et, pour Hand Swype, même façon de répondre).
  // Un test libre y est comparé mais n'y entre pas.
  function tRefPrev(id, r) {
    var td = TD[id];
    return entries.filter(function (e) {
      return e.test === id && e.plan === 'prevu' && e[id] && e[id].cfg === r.cfg && e.device === r.device && (id !== 'hs' || e.input === r.input);
    }).map(function (e) { return td.figE(e[id]); }).filter(function (v) { return v !== null && v !== undefined && isFinite(v); });
  }
  function tRefHtml(id, r, libre) {
    var td = TD[id], R = td.ref, cur = td.fig(r);
    var h = '<section class="j-card"><h2 class="j-kick">TA RÉFÉRENCE</h2><div class="chips" style="margin:0"><span class="chip hy">À ajuster</span></div>';
    if (libre) h += '<p>Test libre : il est comparé à ta référence mais n’y entre pas (« libre : hors référence »).</p>';
    if (cur === null || cur === undefined) return h + '<p>' + R.none + '</p></section>';
    var c = ssRefCompare(tRefPrev(id, r), cur);
    if (!c.ok) {
      return h + '<p>Pas encore de référence : il faut au moins ' + c.need + ' passages comparables (mêmes réglages, même appareil' + (id === 'hs' ? ', même façon de répondre' : '') + ', faits aux moments du plan, hors « test libre »). Il y en a ' + c.n + '.</p>' +
        (c.n === 0 ? '<p>Les moments du plan, qui fourniront ces passages, arrivent dans une prochaine version de l’appli.</p>' : '') + '</section>';
    }
    var p = ssScale(c), lo = p(c.lo), hi = p(c.hi);
    var verdict = c.pos === 'inside' ? 'Dans la fourchette de tes passages précédents.' : (c.pos === 'above' ? R.above : R.below);
    var label = 'Ce passage : ' + R.fmt(c.cur) + '. Ta médiane : ' + R.fmt(c.ref) + '. Fourchette de tes passages précédents : ' + R.fmt(c.lo) + ' à ' + R.fmt(c.hi) + '.';
    return h + '<p class="lead" style="font-size:14px">' + verdict + '</p>' +
      '<div class="ss-strip" role="img" aria-label="' + label + '"><i class="band" style="left:' + lo.toFixed(1) + '%;width:' + (hi - lo).toFixed(1) + '%"></i>' +
      '<i class="med" style="left:' + p(c.ref).toFixed(1) + '%"></i><i class="cur" style="left:' + p(c.cur).toFixed(1) + '%"></i></div>' +
      '<div class="ss-ax" aria-hidden="true"><span>' + R.axLo + '</span><span>' + R.axHi + '</span></div>' +
      '<p class="j-fhint">Bande : fourchette de tes passages · trait : ta médiane · rond : ce passage.</p>' +
      '<dl class="ss-facts"><div><dt>Ce passage</dt><dd>' + R.fmt(c.cur) + '</dd></div>' +
      '<div><dt>Ta médiane, ' + ssPlural(c.n, 'passage', 'passages') + ' avant</dt><dd>' + R.fmt(c.ref) + '</dd></div>' +
      '<div><dt>Fourchette de ces passages</dt><dd>' + R.fmt(c.lo) + ' à ' + R.fmt(c.hi) + '</dd></div>' +
      '<div><dt>Écart avec ta médiane</dt><dd>' + R.diff(c.diff) + '</dd></div></dl>' +
      (c.n < 10 ? '<p class="j-fhint">Moins de 10 passages avant : la fourchette est encore approximative.</p>' : '') + '</section>';
  }

  function vTIntro() {
    var id = flow.test, td = TD[id], m = flow.slot != null ? PLAN[flow.slot] : null, practiced = tPracticed(id), est = ssDur(td.estSec * 1000);
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : 'Test libre : il sera enregistré, hors des moments du plan et hors de ta référence.';
    if (!m && L.mod(minOf(new Date()) - L.getWake()) < 120) msg += ' Avant R+2h, il sera noté « avant R+2h » (l’inertie du réveil peut durer 2 à 4 h : Jewett 1999).';
    return '<header class="subhead"><div class="top">' + (m ? back('home', 'Journal') : back('tests', 'Tests')) +
      '<span class="module">' + (m ? rLabel(m.r) + ' · prévu' : 'Test libre') + '</span></div>' +
      '<h1 tabindex="-1">' + esc(td.name) + '</h1><p class="sub">' + esc(td.cog) + ' · ≈ ' + est + '</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      (notice ? '<p class="j-warn" role="alert">' + esc(notice) + '</p>' : '') +
      td.demo() +
      '<section class="j-card"><h2 class="j-kick">AVANT DE COMMENCER</h2><ol class="j-list">' + td.steps().map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></section>' +
      '<div class="chips"><div class="chips" style="margin:0"><span class="chip main">' + td.chipMain + '</span><span class="chip hy">' + td.chipHy + '</span></div></div>' +
      '<p class="j-p">' + td.about + '</p>' +
      '<p class="j-p">' + esc(msg) + '</p></main>' +
      '<div class="foot">' +
      (practiced
        ? '<button type="button" class="btn primary" data-act="' + id + '-test">Commencer (≈ ' + est + ')</button><button type="button" class="btn secondary" data-act="' + id + '-practice">Refaire l’entraînement</button>'
        : '<button type="button" class="btn primary" data-act="' + id + '-practice">Entraînement (' + td.pracDur + ', une fois)</button><button type="button" class="btn secondary" data-act="' + id + '-test">Passer directement au test</button>') +
      '</div>';
  }
  function vTRun() {
    var td = TD[flow.test];
    return '<header><div class="j-runhead"><h1 tabindex="-1">' + esc(td.name) + '</h1><span class="j-time" id="rn-count" style="font-size:15px" aria-live="polite">Prêt</span></div>' +
      '<div class="j-prog" aria-hidden="true"><div id="rn-bar"></div></div></header>' +
      '<main class="ss-main" id="rn-stage"></main>' +
      '<div class="foot"><button type="button" class="btn ghost" data-act="run-stop">Arrêter</button></div>';
  }
  function vTPrac() {
    var id = flow.test, td = TD[id], p = flow.prac || {};
    return '<header><span class="module" style="display:block">Entraînement terminé</span>' +
      '<h1 tabindex="-1" style="margin-top:4px">' + esc(td.pracTitle(p)) + '</h1></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' + td.pracNote(p) + '</section></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="' + id + '-test">Passer le test</button>' +
      '<button type="button" class="btn secondary" data-act="' + id + '-practice">Refaire l’entraînement</button>' +
      '<button type="button" class="btn ghost" data-act="' + id + '-intro">Retour à la consigne</button></div>';
  }
  function vTResult() {
    var id = flow.test, td = TD[id], r = flow.result, rel = relAt(r.ts, r.wake), ph = phaseAt(rel), libre = flow.slot == null, early = libre && rel < 120;
    var count = entries.filter(function (e) { return e.test === id; }).length + 1;
    return '<header><span class="module" style="display:block">Fin du test</span><h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' + clockOf(r.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics">' + td.metrics(r) + '</div>' +
      '<p class="j-fhint" style="color:var(--text)"><b>Chiffre principal :</b> ' + td.mainTxt + '</p>' +
      '<p class="j-fhint">Durée du passage : ' + ssDur(r.durationMs) + ' (estimée : ≈ ' + ssDur(td.estSec * 1000) + ')</p>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, ' + ssPlural(count, 'test', 'tests') + ')</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + (INPUT_TXT[r.input] || r.input) + '</span>' +
      '<span class="chip hy">' + (libre ? 'test libre' : 'prévu') + (early ? ' · avant R+2h' : '') + '</span></div></section>' +
      tRefHtml(id, r, libre) +
      td.facts(r) +
      (td.table ? td.table(r) : '') +
      '<details class="j-det"><summary>Comment lire ce résultat</summary>' + td.read() + '</details>' +
      '<p class="j-p">Un seul passage ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="' + id + '-save">Enregistrer le test</button>' +
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
    list.forEach(function (e) { var k = e.kind === 'releve' && e.pvt ? 'combo' : (e.kind === 'test' && e.test ? e.test : e.kind); n[k] = (n[k] || 0) + 1; });
    var parts = [];
    [['releve', 'relevé', 'relevés'], ['combo', 'relevé + test', 'relevés + tests'], ['test', 'test', 'tests'], ['rs', 'passage Rotation span', 'passages Rotation span'], ['fl', 'passage Flanker', 'passages Flanker'], ['ss', 'passage Symbol Search', 'passages Symbol Search'], ['hs', 'passage Hand Swype', 'passages Hand Swype'], ['activite', 'activité', 'activités'],
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
                reminders: vRemind, 'act-start': vActStart, 'act-end': vActEnd, meal: vMeal, bed: vBed, edit: vEdit,
                tests: vTests, 'ss-intro': vSsIntro, 'ss-run': vSsRun, 'ss-prac': vSsPrac, 'ss-result': vSsResult,
                'rs-intro': vTIntro, 'rs-run': vTRun, 'rs-prac': vTPrac, 'rs-result': vTResult,
                'hs-intro': vTIntro, 'hs-run': vTRun, 'hs-prac': vTPrac, 'hs-result': vTResult,
                'fl-intro': vTIntro, 'fl-run': vTRun, 'fl-prac': vTPrac, 'fl-result': vTResult };

  function render() {
    var runM = /^(ss|rs|hs|fl)-run$/.exec(screen);
    if (rnRun && !runM) { rnRun.why = 'silent'; rnKill(); } // on quitte l'écran du test : on l'arrête sans rien dire
    root.innerHTML = (VIEWS[screen] || vHome)();
    L.navVisible(screen === 'home' || screen === 'backup' || screen === 'reminders');
    if (screen === 'home') { L.bindWake(root.querySelector('.wake-input')); updateHome(); }
    if (screen === 'reminders') L.bindWake(root.querySelector('.wake-input'));
    if (screen === 'run') startPvt();
    if (runM) rnStart(RUN[runM[1]][flow.tMode === 'practice' ? 'practice' : 'test']);
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

  /* ---------- Test Symbol Search ---------- */
  // Déroulé porté de la maquette du 14/10 : tout ce qui attend (pause, réponse) passe par rnPend, donc tout peut être annulé d'un coup.
  var RN_CANCEL = {};
  var rnRun = null; // { dead, rej, why }

  function tPracticed(id) {
    try { var o = JSON.parse(localStorage.getItem(KEY_PRAC)); return !!(o && o[id]); } catch (e) { return false; }
  }
  function tMarkPracticed(id) {
    try { var o = JSON.parse(localStorage.getItem(KEY_PRAC)) || {}; o[id] = Date.now(); localStorage.setItem(KEY_PRAC, JSON.stringify(o)); } catch (e) {}
  }
  function rnPend(setup) {
    var c = rnRun;
    return new Promise(function (resolve, reject) {
      if (!c || c.dead) { reject(RN_CANCEL); return; }
      var cleanup = null;
      var killer = function () { if (cleanup) cleanup(); reject(RN_CANCEL); };
      c.rej.add(killer);
      var done = function (v) { c.rej.delete(killer); if (cleanup) cleanup(); resolve(v); };
      cleanup = setup(done) || null;
    });
  }
  function rnSleep(ms) { return rnPend(function (done) { var t = setTimeout(done, ms); return function () { clearTimeout(t); }; }); }
  function rnKill() {
    if (!rnRun) return;
    rnRun.dead = true;
    var fns = Array.from(rnRun.rej);
    rnRun.rej.clear();
    fns.forEach(function (f) { f(); });
  }
  function rnVis() { if (document.hidden && rnRun) { rnRun.why = 'hidden'; rnKill(); } }
  function rnEnd() { rnRun = null; document.removeEventListener('visibilitychange', rnVis); }
  function rnStop() { if (rnRun) { rnRun.why = 'stop'; rnKill(); } }
  function rnStart(fn) {
    rnKill();
    var c = rnRun = { dead: false, rej: new Set(), why: 'stop' };
    document.addEventListener('visibilitychange', rnVis);
    fn().catch(function (e) {
      if (rnRun !== c) return;
      rnEnd();
      var why = e === RN_CANCEL ? c.why : 'error';
      if (e !== RN_CANCEL && window.console) console.error(e);
      if (why === 'silent') return;
      if (why === 'hidden') notice = 'Test interrompu : l’appli a quitté l’écran. Rien n’a été enregistré. Tu peux recommencer.';
      else if (why === 'error') notice = 'Un problème est survenu. Rien n’a été enregistré. Tu peux recommencer.';
      go(flow.test + '-intro');
      notice = '';
    });
  }

  function rnStage(html) { var s = $('rn-stage'); if (s) s.innerHTML = html; }
  function rnReadout(text, p) {
    var t = $('rn-count'), b = $('rn-bar');
    if (t) t.textContent = text;
    if (b) b.style.width = Math.round((p || 0) * 100) + '%';
  }
  // Écran d'essai : posé une fois par bloc, seul le contenu des cartes change ensuite.
  function ssTrialScreen() {
    rnStage('<div class="ss-trial blank" id="ss-trial"><div class="ss-card ss-top" id="ss-top" role="img" aria-label="Carte du haut"></div>' +
      '<p class="ss-cue">Touche la carte du bas identique</p>' +
      '<div class="ss-bottoms"><button type="button" class="ss-card ss-choice" id="ss-cl"></button><button type="button" class="ss-card ss-choice" id="ss-cr"></button></div>' +
      '<p class="ss-fb" id="ss-fb" aria-live="polite"></p></div>');
  }

  // Un essai : cartes affichées, réponse, pause. Le temps part de l'image où les cartes s'affichent (comme le PVT-B).
  async function ssTrialOnce(t, o) {
    var tr = $('ss-trial'), top = $('ss-top'), cL = $('ss-cl'), cR = $('ss-cr'), fbl = $('ss-fb');
    if (!tr || !top || !cL || !cR || !fbl) throw new Error('écran du test absent');
    fbl.textContent = ''; fbl.className = 'ss-fb';
    var left = t.side === 'L' ? t.match : t.foil, right = t.side === 'L' ? t.foil : t.match;
    top.innerHTML = ssPairHtml(t.top); top.setAttribute('aria-label', 'Carte du haut : ' + ssPairName(t.top));
    cL.innerHTML = ssPairHtml(left); cL.setAttribute('aria-label', 'Carte de gauche : ' + ssPairName(left));
    cR.innerHTML = ssPairHtml(right); cR.setAttribute('aria-label', 'Carte de droite : ' + ssPairName(right));
    var res = await rnPend(function (done) {
      var armed = false, t0 = 0, raf = 0;
      function fin(resp, ev, inp) {
        if (!armed) return;
        armed = false;
        done({ resp: resp, rt: Math.max(0, tsOf(ev) - t0), inp: inp });
      }
      function mk(resp) { // toucher ou clic = pointerdown ; un « click » sans souris (detail 0) = touche Entrée/Espace sur le bouton
        return function (ev) {
          if (ev.type === 'click') { if (ev.detail !== 0) return; fin(resp, ev, 'clavier'); }
          else fin(resp, ev, ev.pointerType || 'souris');
        };
      }
      var onL = mk('L'), onR = mk('R');
      function onKey(ev) {
        if (ev.repeat) return;
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); fin('L', ev, 'clavier'); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); fin('R', ev, 'clavier'); }
      }
      cL.addEventListener('pointerdown', onL); cL.addEventListener('click', onL);
      cR.addEventListener('pointerdown', onR); cR.addEventListener('click', onR);
      document.addEventListener('keydown', onKey);
      tr.classList.remove('blank');
      raf = requestAnimationFrame(function () { t0 = performance.now(); armed = true; });
      return function () {
        cancelAnimationFrame(raf);
        cL.removeEventListener('pointerdown', onL); cL.removeEventListener('click', onL);
        cR.removeEventListener('pointerdown', onR); cR.removeEventListener('click', onR);
        document.removeEventListener('keydown', onKey);
      };
    });
    var ok = res.resp === t.side, btn = res.resp === 'L' ? cL : cR;
    btn.classList.add('hit');
    if (o.practice) {
      fbl.textContent = ok ? 'Correct' : 'Pas cette carte : la bonne était à ' + ssSide(t.side);
      fbl.className = 'ss-fb' + (ok ? ' ok' : '');
    }
    await rnSleep(SS.hit);
    btn.classList.remove('hit');
    if (o.practice) await rnSleep((ok ? SS.fbOk : SS.fbErr) - SS.hit);
    tr.classList.add('blank'); fbl.textContent = '';
    await rnSleep(SS.iti);
    return { side: t.side, k: t.k, resp: res.resp, rt: Math.round(res.rt), ok: ok, inp: res.inp };
  }
  async function ssRunList(list, o) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      rnReadout(o.label + ' ' + (i + 1) + ' sur ' + list.length, i / list.length);
      out.push(await ssTrialOnce(list[i], o));
    }
    return out;
  }

  // Entraînement : un bloc de 4 essais avec retour. Pas enregistré.
  async function ssPractice() {
    rnReadout('Entraînement', 0);
    rnStage('<p class="ss-between">Entraînement</p><p class="ss-note">' + SS.practice + ' essais, avec un retour après chaque réponse.</p>');
    await rnSleep(SS.ready);
    ssTrialScreen();
    var res = await ssRunList(ssMake(SS.practice, Math.random), { practice: true, label: 'Entraînement' });
    var good = res.filter(function (r) { return r.ok; }).length;
    tMarkPracticed('ss');
    rnEnd();
    flow.prac = { good: good };
    go('ss-prac');
  }
  // Test : 20 essais.
  async function ssTest() {
    var t0 = performance.now();
    flow.ts = Date.now();
    flow.wake = L.getWake();
    rnReadout('Prêt', 0);
    rnStage('<p class="ss-between">Prêt</p><p class="ss-note">' + SS.trials + ' essais. Le plus vite possible, sans te tromper.</p>');
    await rnSleep(SS.ready);
    ssTrialScreen();
    var res = await ssRunList(ssMake(SS.trials, Math.random), { practice: false, label: 'Essai' });
    var sc = ssScore(res), inps = {};
    res.forEach(function (t) { inps[t.inp] = true; });
    var kinds = Object.keys(inps);
    flow.result = { ver: SS.ver, cfg: SS_CFG, n: sc.n, correct: sc.correct, used: sc.used, excluded: sc.excluded, med: sc.med, acc: sc.acc,
                    durationMs: Math.round(performance.now() - t0), trials: res, device: DEVICE, input: kinds.length === 1 ? kinds[0] : 'mixte',
                    ts: flow.ts, wake: flow.wake };
    rnEnd();
    go('ss-result');
  }

  /* ---------- Test Rotation span ---------- */
  // Déroulé porté de la maquette du 14/10 : lettre à juger, pause, flèche (1 s), pause, lettre, … puis rappel des flèches dans l'ordre.
  // Pas de temps limite pendant le test ; à l'entraînement, les lettres ont 5 s. Tout ce qui attend passe par rnPend, donc tout peut être annulé d'un coup.
  function rsBlank() { rnStage('<div class="rs-box" aria-hidden="true"></div>'); }
  async function rsLetter(timeoutMs) {
    var s = { ch: RS_LETTERS[Math.floor(Math.random() * 3)], mirror: Math.floor(Math.random() * 2) === 1, angle: Math.floor(Math.random() * 8) * 45 };
    rnStage('<div class="rn-wrap">' + rsLetterHtml(s) + '<p class="ss-q">Cette lettre est-elle normale ou en miroir ?</p>' +
      '<div class="rs-answers"><button type="button" class="btn secondary rs-big" id="rs-n">Normale</button><button type="button" class="btn secondary rs-big" id="rs-m">Miroir</button></div></div>');
    var aN = $('rs-n'), aM = $('rs-m');
    if (!aN || !aM) throw new Error('écran du test absent');
    var res = await rnPend(function (done) {
      var armed = false, t0 = 0, raf = 0, timer = 0;
      function fin(answer, timedOut, ev, inp) {
        if (!armed) return;
        armed = false;
        done({ answer: answer, timedOut: timedOut, rt: Math.max(0, (ev ? tsOf(ev) : performance.now()) - t0), inp: inp });
      }
      function mk(answer) { // toucher ou clic = pointerdown ; un « click » sans souris (detail 0) = touche Entrée/Espace sur le bouton
        return function (ev) {
          if (ev.type === 'click') { if (ev.detail !== 0) return; fin(answer, false, ev, 'clavier'); }
          else fin(answer, false, ev, ev.pointerType || 'souris');
        };
      }
      var onN = mk('normale'), onM = mk('miroir');
      aN.addEventListener('pointerdown', onN); aN.addEventListener('click', onN);
      aM.addEventListener('pointerdown', onM); aM.addEventListener('click', onM);
      raf = requestAnimationFrame(function () {
        t0 = performance.now(); armed = true;
        if (timeoutMs) timer = setTimeout(function () { fin(null, true, null, ''); }, timeoutMs);
      });
      return function () {
        cancelAnimationFrame(raf); clearTimeout(timer);
        aN.removeEventListener('pointerdown', onN); aN.removeEventListener('click', onN);
        aM.removeEventListener('pointerdown', onM); aM.removeEventListener('click', onM);
      };
    });
    res.truth = s.mirror ? 'miroir' : 'normale';
    res.correct = !res.timedOut && res.answer === res.truth;
    return res;
  }
  async function rsFeedback(r) {
    var msg = r.timedOut ? 'Temps écoulé' : r.correct ? 'Correct' : 'Réponse attendue : ' + r.truth;
    rnStage('<p class="ss-fb' + (r.correct ? ' ok' : '') + '">' + msg + '</p>');
    await rnSleep(RS.feedback);
  }
  function rsRecall(size) { // touche les flèches vues, dans l'ordre ; « Valider » reste toujours possible (comme dans la maquette)
    var sel = [], tiles = '';
    for (var id = 0; id < 16; id++) tiles += '<button type="button" class="rs-tile" data-id="' + id + '" aria-label="' + rsArrowLabel(id) + '">' + rsArrowSvg(id) + '</button>';
    rnStage('<div class="rn-wrap"><p class="ss-q">Touche les flèches vues, dans l’ordre.</p><p class="rs-count" id="rs-cnt"></p><div class="rs-grid" id="rs-g">' + tiles + '</div>' +
      '<div class="rs-answers"><button type="button" class="btn ghost" id="rs-clr">Effacer la dernière</button><button type="button" class="btn primary" id="rs-ok">Valider</button></div></div>');
    var g = $('rs-g'), cnt = $('rs-cnt'), clr = $('rs-clr'), ok = $('rs-ok');
    if (!g || !cnt || !clr || !ok) throw new Error('écran du test absent');
    function paint() {
      cnt.textContent = sel.length + ' sur ' + size;
      Array.prototype.forEach.call(g.querySelectorAll('.rs-tile'), function (b) {
        var i = sel.indexOf(Number(b.getAttribute('data-id'))), n = b.querySelector('.n');
        b.classList.toggle('sel', i >= 0);
        if (i >= 0) { if (!n) { n = document.createElement('span'); n.className = 'n'; b.appendChild(n); } n.textContent = String(i + 1); }
        else if (n) n.parentNode.removeChild(n);
      });
      clr.disabled = sel.length === 0;
    }
    paint();
    return rnPend(function (done) {
      function onTile(e) {
        var b = e.target.closest ? e.target.closest('.rs-tile') : null;
        if (!b) return;
        var id = Number(b.getAttribute('data-id'));
        if (sel.length >= size || sel.indexOf(id) >= 0) return;
        sel.push(id); paint();
      }
      function onClr() { sel.pop(); paint(); }
      function onOk() { done(sel.slice()); }
      g.addEventListener('click', onTile); clr.addEventListener('click', onClr); ok.addEventListener('click', onOk);
      return function () { g.removeEventListener('click', onTile); clr.removeEventListener('click', onClr); ok.removeEventListener('click', onOk); };
    });
  }
  // Un essai : lettre, pause, flèche, pause, lettre, … puis rappel. o.inps recueille la façon de répondre aux lettres.
  async function rsTrial(o) {
    var arrows = rsPick(o.size, Math.random), letters = [];
    for (var k = 0; k < o.size; k++) {
      rnReadout(o.label + ' · flèche ' + (k + 1) + ' sur ' + o.size, (o.i + (k + 0.5) / (o.size + 1)) / o.total);
      rsBlank(); await rnSleep(RS.blank);
      var r = await rsLetter(o.timeoutMs);
      letters.push([r.timedOut ? 2 : (r.correct ? 1 : 0), Math.round(r.rt)]);
      if (r.inp) o.inps[r.inp] = true;
      if (o.practice) await rsFeedback(r);
      rsBlank(); await rnSleep(RS.blank);
      rnStage('<div class="rs-box" role="img" aria-label="Flèche à retenir">' + rsArrowSvg(arrows[k]) + '</div>');
      await rnSleep(RS.arrow);
    }
    rnReadout(o.label + ' · rappel', (o.i + o.size / (o.size + 1)) / o.total);
    var sel = await rsRecall(o.size);
    return { a: arrows, s: sel, l: letters };
  }
  // Entraînement : 5 lettres avec retour, puis 1 essai de 2 flèches avec retour. Pas enregistré.
  async function rsRunPractice() {
    var inps = {};
    for (var k = 0; k < 5; k++) {
      rnReadout('Entraînement · lettre ' + (k + 1) + ' sur 5', k / 6);
      rsBlank(); await rnSleep(RS.blank);
      var r = await rsLetter(RS.startTimeout);
      await rsFeedback(r);
    }
    var tr = await rsTrial({ i: 5, total: 6, size: 2, timeoutMs: RS.startTimeout, practice: true, label: 'Entraînement', inps: inps });
    tMarkPracticed('rs');
    rnEnd();
    flow.prac = { cp: rsScoreTrial(tr.a, tr.s).cp, size: 2 };
    go('rs-prac');
  }
  // Test : 3 essais de 5 flèches, sans temps limite.
  async function rsRunTest() {
    var t0 = performance.now(), trials = [], inps = {};
    flow.ts = Date.now();
    flow.wake = L.getWake();
    for (var i = 0; i < RS.trials; i++) {
      rnReadout('Essai ' + (i + 1) + ' sur ' + RS.trials, i / RS.trials);
      rnStage('<p class="ss-between">Essai ' + (i + 1) + ' sur ' + RS.trials + '</p><p class="ss-note">' + RS.size + ' flèches</p>');
      await rnSleep(RS.between);
      trials.push(await rsTrial({ i: i, total: RS.trials, size: RS.size, timeoutMs: 0, practice: false, label: 'Essai ' + (i + 1) + ' sur ' + RS.trials, inps: inps }));
    }
    var kinds = Object.keys(inps), dur = Math.round(performance.now() - t0);
    flow.result = { cfg: RS_CFG, rec: { ver: RS.ver, cfg: RS_CFG, durationMs: dur, trials: trials }, sc: rsSummary(trials), durationMs: dur,
                    device: DEVICE, input: kinds.length === 1 ? kinds[0] : 'mixte', ts: flow.ts, wake: flow.wake };
    rnEnd();
    go('rs-result');
  }

  /* ---------- Test Hand Swype ---------- */
  // Déroulé porté de la maquette du 14/10 : consigne et vaisseaux apparaissent ensemble ; réponse par balayage (28 px, sans attendre que le doigt se lève)
  // ou par touche ← ↑ → ↓ ; le sens enregistré s'affiche 150 ms en flèche neutre, puis 150 ms de vide. 60 s ; l'essai en cours à 60 s n'est pas compté.
  function hsTrialScreen() {
    rnStage(hsDefs() + '<div class="hs-trial"><div class="hs-rule off" id="hs-rule" data-rule="point">' + hsRuleHtml('point') + '</div>' +
      '<div class="hs-pad" id="hs-pad" role="img" aria-label="Zone de balayage : des vaisseaux défilent"></div>' +
      '<p class="ss-cue">Balaye la zone du doigt<span class="hs-keys"> · ou touches ← ↑ → ↓</span></p><p class="ss-fb" id="hs-fb" aria-live="polite"></p></div>');
  }
  async function hsTrialOnce(t, o, deadline) {
    var pad = $('hs-pad'), fbl = $('hs-fb'), rule = $('hs-rule');
    if (!pad || !fbl || !rule) throw new Error('écran du test absent');
    fbl.textContent = ''; fbl.className = 'ss-fb';
    var res = await rnPend(function (done) {
      var armed = false, t0 = 0, timer = 0, raf = 0, pid = null, sx = 0, sy = 0, ptype = '';
      function fin(resp, via, ev) {
        if (!armed) return;
        armed = false;
        done({ resp: resp, rt: Math.max(0, tsOf(ev) - t0), via: via });
      }
      function stopTrack() {
        pid = null;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      }
      function onDown(e) {
        if (!armed || pid !== null) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pid = e.pointerId; sx = e.clientX; sy = e.clientY; ptype = e.pointerType;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
        if (e.cancelable) e.preventDefault();
      }
      function onMove(e) {
        if (e.pointerId !== pid) return;
        var d = hsSwipeDir(e.clientX - sx, e.clientY - sy, HS.swipe);
        if (d) { var via = ptype || 'souris'; stopTrack(); fin(d, via, e); }
      }
      function onUp(e) { if (e.pointerId === pid) stopTrack(); }
      function onKey(e) {
        if (e.repeat) return;
        var d = HS_KEYS[e.key];
        if (d) { e.preventDefault(); fin(d, 'clavier', e); }
      }
      pad.addEventListener('pointerdown', onDown);
      document.addEventListener('keydown', onKey);
      rule.setAttribute('data-rule', t.rule); rule.className = 'hs-rule'; rule.innerHTML = hsRuleHtml(t.rule);
      pad.innerHTML = hsBeltHtml(t.point, t.move);
      raf = requestAnimationFrame(function () {
        t0 = performance.now(); armed = true;
        if (deadline) timer = setTimeout(function () { if (armed) { armed = false; done({ timeout: true }); } }, Math.max(0, deadline - performance.now()));
      });
      return function () {
        cancelAnimationFrame(raf); clearTimeout(timer); stopTrack();
        pad.removeEventListener('pointerdown', onDown);
        document.removeEventListener('keydown', onKey);
      };
    });
    if (res.timeout) { pad.innerHTML = ''; return null; }
    var ok = res.resp === t.ans;
    pad.innerHTML = '<div class="hs-reg">' + hsArrowSvg(res.resp) + '</div>';
    if (o.practice) {
      fbl.textContent = ok ? 'Correct' : 'Pas ce sens : les vaisseaux ' + (t.rule === 'point' ? 'pointaient ' : 'se déplaçaient ') + HS_TXT[t.ans];
      fbl.className = 'ss-fb' + (ok ? ' ok' : '');
    }
    await rnSleep(HS.hit);
    pad.innerHTML = '';
    if (o.practice) await rnSleep((ok ? HS.fbOk : HS.fbErr) - HS.hit);
    fbl.textContent = '';
    await rnSleep(HS.blank);
    return { rule: t.rule, point: t.point, move: t.move, resp: res.resp, rt: res.rt, ok: ok, via: res.via };
  }
  async function hsRunPractice() { // 6 essais tirés au hasard (au moins 2 changements de consigne), retour neutre. Pas enregistré.
    rnReadout('Entraînement', 0);
    rnStage('<p class="ss-between">Entraînement</p><p class="ss-note">' + HS.practice + ' essais, avec un retour après chaque réponse. La consigne est tirée au hasard à chaque essai.</p>');
    await rnSleep(1800);
    hsTrialScreen();
    var list = hsPractice(Math.random), good = 0;
    for (var i = 0; i < list.length; i++) {
      rnReadout('Entraînement · ' + (i + 1) + ' sur ' + list.length, i / list.length);
      var r = await hsTrialOnce(list[i], { practice: true }, null);
      if (r && r.ok) good++;
    }
    tMarkPracticed('hs');
    rnEnd();
    flow.prac = { good: good };
    go('hs-prac');
  }
  async function hsRunTest() { // 60 s à partir de la première apparition des vaisseaux
    var t0 = performance.now(), out = [], vias = {};
    flow.ts = Date.now();
    flow.wake = L.getWake();
    rnReadout('Prêt', 0);
    rnStage('<p class="ss-between">Prêt</p><p class="ss-note">60 secondes. La consigne peut changer à chaque essai : suis celle qui est affichée.</p>');
    await rnSleep(HS.ready);
    hsTrialScreen();
    var list = hsMake(HS.pool, Math.random), deadline = performance.now() + HS.dur, tickId = 0;
    function tick() { var rem = Math.max(0, deadline - performance.now()); rnReadout('Test · ' + Math.ceil(rem / 1000) + ' s restantes', 1 - rem / HS.dur); }
    tick();
    tickId = setInterval(tick, 250);
    try {
      for (var i = 0; i < list.length && performance.now() < deadline; i++) {
        var r = await hsTrialOnce(list[i], { practice: false }, deadline);
        if (!r) break;
        out.push(r); vias[r.via] = true;
      }
    } finally { clearInterval(tickId); }
    if (!out.length) {
      rnEnd();
      notice = 'Aucun essai n’a été fait en 60 s. Rien n’a été enregistré. Tu peux recommencer.';
      go('hs-intro');
      notice = '';
      return;
    }
    var trials = out.map(hsCompact), kinds = Object.keys(vias), dur = Math.round(performance.now() - t0);
    flow.result = { cfg: HS_CFG, rec: { ver: HS.ver, cfg: HS_CFG, durationMs: dur, trials: trials }, sc: hsScore(trials), durationMs: dur,
                    device: DEVICE, input: kinds.length === 1 ? kinds[0] : 'mixte', ts: flow.ts, wake: flow.wake };
    rnEnd();
    go('hs-result');
  }

  /* ---------- Test Flanker ---------- */
  // Déroulé porté de la maquette du 14/10 : fixation (1000, 1250 ou 1500 ms), cinq flèches (jusqu'à la réponse ou 3 s), bouton touché surligné 100 ms, pause 800 ms.
  function flTrialScreen() {
    rnStage('<div class="fl-trial"><div class="fl-stim" id="fl-stim" role="img" aria-label="Zone des flèches"></div><p class="ss-cue">Flèche au-dessus du triangle</p><p class="ss-fb" id="fl-fb" aria-live="polite"></p>' +
      '<div class="fl-resp"><button type="button" class="btn secondary fl-btn" id="fl-l" aria-label="Gauche">' + flArrowSvg('L') + 'Gauche</button>' +
      '<button type="button" class="btn secondary fl-btn" id="fl-r" aria-label="Droite">Droite' + flArrowSvg('R') + '</button></div></div>');
  }
  async function flTrialOnce(t, o) {
    var st = $('fl-stim'), fbl = $('fl-fb'), bL = $('fl-l'), bR = $('fl-r');
    if (!st || !fbl || !bL || !bR) throw new Error('écran du test absent');
    fbl.textContent = ''; fbl.className = 'ss-fb';
    st.innerHTML = flFixHtml();
    await rnSleep(FL.fix[Math.floor(Math.random() * FL.fix.length)]);
    var res = await rnPend(function (done) {
      var armed = false, t0 = 0, timer = 0, raf = 0;
      function fin(resp, ev, inp) {
        if (!armed) return;
        armed = false;
        done({ resp: resp, rt: resp ? Math.max(0, tsOf(ev) - t0) : null, inp: inp });
      }
      function mk(resp) { // toucher ou clic = pointerdown ; un « click » sans souris (detail 0) = touche Entrée/Espace sur le bouton
        return function (ev) {
          if (ev.type === 'click') { if (ev.detail !== 0) return; fin(resp, ev, 'clavier'); }
          else fin(resp, ev, ev.pointerType || 'souris');
        };
      }
      var onL = mk('L'), onR = mk('R');
      function onKey(ev) {
        if (ev.repeat) return;
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); fin('L', ev, 'clavier'); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); fin('R', ev, 'clavier'); }
      }
      bL.addEventListener('pointerdown', onL); bL.addEventListener('click', onL);
      bR.addEventListener('pointerdown', onR); bR.addEventListener('click', onR);
      document.addEventListener('keydown', onKey);
      st.innerHTML = flStimHtml(t);
      raf = requestAnimationFrame(function () {
        t0 = performance.now(); armed = true;
        timer = setTimeout(function () { fin(null, null, ''); }, FL.limit);
      });
      return function () {
        cancelAnimationFrame(raf); clearTimeout(timer);
        bL.removeEventListener('pointerdown', onL); bL.removeEventListener('click', onL);
        bR.removeEventListener('pointerdown', onR); bR.removeEventListener('click', onR);
        document.removeEventListener('keydown', onKey);
      };
    });
    var ok = res.resp === t.dir, btn = res.resp ? (res.resp === 'L' ? bL : bR) : null;
    st.innerHTML = '';
    if (btn) btn.classList.add('hit');
    if (o.practice) {
      fbl.textContent = res.resp === null ? 'Temps écoulé' : ok ? 'Correct' : 'Pas ce côté : la flèche marquée pointait à ' + flWord(t.dir);
      fbl.className = 'ss-fb' + (ok ? ' ok' : '');
    }
    await rnSleep(FL.hit);
    if (btn) btn.classList.remove('hit');
    if (o.practice) await rnSleep((ok ? FL.fbOk : FL.fbErr) - FL.hit);
    fbl.textContent = '';
    await rnSleep(FL.iti);
    return { cong: t.cong, dir: t.dir, resp: res.resp, rt: res.rt, ok: ok, inp: res.inp };
  }
  async function flRunPractice() { // blocs de 4 essais avec retour ; 3 justes sur 4 pour passer ; 3 blocs au plus. Pas enregistré.
    var passed = false, runs = 0, good = 0;
    while (runs < FL.pracBlocks && !passed) {
      runs++;
      rnReadout('Entraînement · bloc ' + runs + ' sur ' + FL.pracBlocks + ' au plus', 0);
      rnStage('<p class="ss-between">' + (runs === 1 ? 'Entraînement' : 'On le refait') + '</p><p class="ss-note">' +
        (runs === 1 ? FL.practice + ' essais, avec un retour après chaque réponse.' : 'Seule la flèche marquée compte.') + '</p>');
      await rnSleep(FL.ready);
      flTrialScreen();
      var list = flPractice(Math.random), res = [];
      for (var i = 0; i < list.length; i++) {
        rnReadout('Entraînement · ' + (i + 1) + ' sur ' + list.length, i / list.length);
        res.push(await flTrialOnce(list[i], { practice: true }));
      }
      good = res.filter(function (r) { return r.ok; }).length;
      passed = good >= FL.pracPass;
    }
    tMarkPracticed('fl');
    rnEnd();
    flow.prac = { good: good, passed: passed };
    go('fl-prac');
  }
  async function flRunTest() {
    var t0 = performance.now(), res = [], inps = {};
    flow.ts = Date.now();
    flow.wake = L.getWake();
    rnReadout('Prêt', 0);
    rnStage('<p class="ss-between">Prêt</p><p class="ss-note">' + FL.trials + ' essais. Réponds vite, sans te tromper.</p>');
    await rnSleep(FL.ready);
    flTrialScreen();
    var list = flMake(FL.trials, Math.random);
    for (var i = 0; i < list.length; i++) {
      rnReadout('Essai ' + (i + 1) + ' sur ' + list.length, i / list.length);
      var r = await flTrialOnce(list[i], { practice: false });
      res.push(r);
      if (r.inp) inps[r.inp] = true;
    }
    var trials = res.map(flCompact), kinds = Object.keys(inps), dur = Math.round(performance.now() - t0);
    flow.result = { cfg: FL_CFG, rec: { ver: FL.ver, cfg: FL_CFG, durationMs: dur, trials: trials }, sc: flScore(trials), durationMs: dur,
                    device: DEVICE, input: kinds.length === 1 ? kinds[0] : 'mixte', ts: flow.ts, wake: flow.wake };
    rnEnd();
    go('fl-result');
  }

  RUN.ss = { practice: ssPractice, test: ssTest };

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
  // Un passage de Symbol Search, Rotation span, Hand Swype ou Flanker : un test seul (les moments du plan à plusieurs tests viendront plus tard).
  function saveTestN() {
    var id = flow.test, td = TD[id], r = flow.result;
    if (!r || !td) return;
    var prev = entries.filter(function (x) { return x.test === id; });
    var e = baseEntry('test', r.ts, r.wake);
    e.test = id; e.slot = flow.slot; e.plan = flow.slot != null ? 'prevu' : 'libre'; e.device = r.device; e.input = r.input;
    e.nth = prev.length + 1; // n-ième passage de ce test (tous passages, libres compris)
    e.nthDay = prev.filter(function (x) { return x.day === e.day; }).length + 1; // n-ième passage de ce test dans la journée
    e[id] = td.pack(r);
    entries.push(e);
    afterSave(td.name + ' enregistré · ' + clockOf(r.ts) + '.');
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
    var tm = /^(ss|rs|hs|fl)-(intro|practice|test|save)$/.exec(name); // écrans communs à tous les tests (sauf PVT-B)
    if (tm) {
      flow.test = tm[1];
      if (tm[2] === 'intro') go(tm[1] + '-intro');
      else if (tm[2] === 'practice') { flow.tMode = 'practice'; go(tm[1] + '-run'); }
      else if (tm[2] === 'test') { flow.tMode = 'test'; go(tm[1] + '-run'); }
      else saveTestN();
      return;
    }
    switch (name) {
      case 'home': pendingDel = null; form = null; manageActs = false; flow = newFlow(); go('home'); break;
      case 'releve': flow = newFlow({ mode: 'releve' }); go('feel'); break;
      case 'test-libre': flow = newFlow({ mode: 'test' }); go('tests'); break;
      case 'tests': flow = newFlow({ mode: 'test' }); go('tests'); break;
      case 'test-pick':
        var tid = TESTS.some(function (t) { return t.id === id; }) ? id : 'pvt';
        flow = newFlow({ mode: 'test', test: tid }); go(tid === 'pvt' ? 'intro' : tid + '-intro'); break;
      case 'run-stop': rnStop(); break;
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
