/* Kioo Cycle (ancien nom : LUNA) — module Journal (écran 2 du module Corps).
   Nom changé le 26/10/2026. Les clés de stockage « luna.* », window.LUNA et les identifiants du fichier calendrier (@luna.local)
   gardent l'ancien nom EXPRÈS : les renommer ferait perdre les données déjà notées ou dédoublerait les rappels déjà importés.
   Un seul réveil, partagé avec la Roue (window.LUNA, défini dans index.html).
   Données : localStorage « luna.journal » (relevés, tests, notes, activités, repas, couchers), sur l'appareil.
   Aucune donnée de naissance.

   Deux choses séparées (décision du 11/10) :
   - RELEVÉ = ressenti seulement (5 questions + détail facultatif). « prévu » (un moment du plan) ou « libre » (à tout moment) ;
   - TEST   = PVT-B (vigilance soutenue), 3 min, ou un test cognitif : Symbol Search (vitesse de traitement, ≈ 45 s),
              Rotation span (mémoire de travail, ≈ 90 s), Hand Swype (flexibilité, 60 s), Flanker (inhibition, ≈ 110 s), Memory List (mémoire épisodique, ≈ 2 min). « prévu » ou « libre ».
   Le plan de la journée (PLAN) est une simple liste en « réveil + X » : on peut ajouter ou changer des moments sans toucher au reste.

   Symbol Search (14/10) : protocole lu chez Hernandez et al. 2023 (20 essais, carte du bas identique à celle du haut) ;
   symboles, pauses, exclusions et entraînement = RÉGLAGES DE LA MAQUETTE du 14/10, qui ne changent plus pendant le recueil
   (chaque passage garde sa version et ses réglages). Tous les passages sont « libres » tant que le plan n'a pas de moment Symbol Search.

   Rotation span, Hand Swype, Flanker (15/10) : même principe — réglages = ceux des maquettes du 14/10, figés pendant le recueil
   (versions « v1 »), entraînement montré la première fois seulement et jamais enregistré, essai interrompu = rien d'enregistré.
   Chaque passage garde ses essais (compacts) ; tous les chiffres affichés sont recalculés à partir d'eux. Tous « libres » pour l'instant.

   Memory List (16/10) : mêmes principes, sans entraînement. 98 listes de mots (12 à retenir + 12 nouveaux), prises dans l'ordre, une par passage (libre ou non) ; une liste est
   « consommée » dès que ses 12 mots s'affichent (clé « luna.mlUsed »). Les mots de la reconnaissance sont gardés avec le passage.

   Plan des tests (16/10, morceau 4a) : le plan de la journée (7 plans qui tournent, ordre mélangé chaque semaine, étapes du PVT-B) est repris sans changement de l'annexe « plan-logique » (14/10) ;
   réglages dans « luna.plan » (premier jour choisi par l'utilisateur, graine tirée une seule fois, étape + historique des changements). Écran « Plan des tests » et carte d'accueil : affichage seulement,
   les moments du Journal ne lancent encore que le PVT-B. Sauvegarde v3 : + plan + journal des listes de mots ; les fichiers v1 et v2 se restaurent toujours.

   Test PVT-B : protocole de Basner et al. 2011 — 3 min ; intervalle aléatoire de 1 à 4 s entre deux
   stimuli, retour affiché 1 s compris ; lapse = réponse > 355 ms ; faux départ = réponse < 100 ms.
   Adaptations de l'appli (CHOIX de l'appli, pas tirés de l'étude) :
   - réponse au toucher/clic (pointerdown) ou à la touche Espace/Entrée ;
   - un double-toucher à moins de 150 ms n'est pas compté ;
   - pas de réponse au bout de 10 s : compté comme lapse, puis stimulus suivant ;
   - test interrompu si l'appli quitte l'écran ;
   - moins de 10 réponses valides : le test ne peut pas être enregistré.
   Rappels : l'écran « Rappels » crée un fichier calendrier (.ics) ; c'est le calendrier de l'appareil qui sonne.
   Depuis le 03/11/2026 : si kioo-config.js contient un identifiant client Google, un bouton envoie les mêmes rappels
   directement dans un agenda « Kioo Cycle » du compte Google (API Google Agenda, depuis le navigateur, sans serveur).
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
  var KEY = 'luna.journal', KEY_BK = 'luna.journal.lastBackup', KEY_ACTS = 'luna.activities', KEY_PRAC = 'luna.practiced', KEY_INST = 'luna.instants', KEY_NT = 'luna.noteTypes', KEY_MANTRA = 'luna.mantra';

  // Plan de la journée, en minutes APRÈS le réveil (R+). kind : 'releve' | 'test' | 'both'.
  // Pour changer le plan : modifier cette liste (l'ordre doit rester croissant).
  // IMPORTANT : un moment est repéré par son NUMÉRO dans cette liste (champ `slot` des entrées enregistrées) : ne jamais retirer ni insérer un moment au milieu.
  // Pour retirer un moment du plan sans abîmer l'historique, on met `off: true` (le moment disparaît du jour, de la liste et des rappels ; les anciennes entrées gardent leur libellé).
  // e4d (19/11) : R+10h et R+11h passent en relevé seul (plus de test après R+8h). Un ancien test de ces moments reste lisible : son libellé ne dépend que de `slot` et de l'heure R+.
  // `q` : à ce moment, l'appli pose la question du creux. Si `kind` n'est pas 'releve' (R+5h : 'test'), la question vient d'abord, puis le test.
  // e5 (20/11) : `qs` = le jeu de questions du relevé de ce moment (QSETS) ; R+2h devient « relevé + test » et R+4h « humeur de fond, puis test » (demande du recueil, 06/11 et 19/11).
  var PLAN = [
    { r: 30,  kind: 'releve', name: 'Au réveil',                 goal: 'Comment tu te sens après le réveil', qs: 'morning' },
    { r: 120, kind: 'both',   name: 'Référence',                 goal: 'Niveau de départ : la référence des autres tests', qs: 'morning' },
    { r: 180, kind: 'test',   name: 'La montée continue ?',      goal: 'Plus haut que la référence ? La remise en route est-elle finie ?' },
    { r: 240, kind: 'both',   name: 'Plateau du matin',          goal: 'Au niveau de la référence ou au-dessus ?', qs: 'humeur' },
    { r: 300, kind: 'test',   name: 'Fin du plateau',            goal: 'Première baisse avant le creux ?', q: 'creux', qgoal: 'Le creux commence-t-il ?' },
    { r: 360, kind: 'releve', name: 'Début du creux',            goal: 'Le creux commence-t-il ?', q: 'creux', qgoal: 'Y a-t-il un creux en ce moment ?' },
    { r: 420, kind: 'releve', name: 'Creux',                     goal: 'Profondeur du creux ressenti', q: 'creux', qgoal: 'Y a-t-il un creux en ce moment ?', off: true },
    { r: 480, kind: 'both',   name: 'Sortie du creux',           goal: 'La vigilance est-elle revenue ?', qs: 'day5' },
    { r: 540, kind: 'releve', name: 'Milieu de fin d’après-midi', goal: 'Sommet éventuel de fin d’après-midi, ressenti', qs: 'day4' },
    { r: 600, kind: 'releve', name: 'Fin d’après-midi',          goal: 'Comparée au matin', qs: 'day4' },
    { r: 660, kind: 'releve', name: 'Soirée',                    goal: 'Vigilance stable ?', qs: 'day4' },
    { r: 720, kind: 'releve', name: 'Fin de journée',            goal: 'Comment finit la journée', qs: 'day5' },
    { r: 780, kind: 'releve', name: 'Approche du sommeil',       goal: 'Somnolence ressentie, avant la mélatonine', qs: 'day4' }
  ];
  var WIN = { before: 10, after: 30 }; // fenêtre d'un moment : de R+X − 10 min à R+X + 30 min
  var KIND_TXT = { releve: 'Relevé', test: 'Test', both: 'Relevé + test' };
  function momTitle(m) { return rLabel(m.r) + ' · ' + KIND_TXT[m.kind] + ' · ' + m.name; } // reste pour les messages « ce test comptera pour le moment… »
  // F2 (depuis le 09/11) : à R+6h et R+7h, l'appli pose la question du creux à la place du relevé. Le titre des rappels du calendrier le dit aussi (demandé par l'utilisateur, 09/11 02h13) ; l'heure de l'alarme ne change pas.
  // e4b (19/11) : la question du creux passe à R+5h (puis le test) et R+6h ; R+7h est retiré du plan (`off`).
  function isQ(m) { return !!m.q && !m.off; }             // un moment où l'appli pose la question du creux
  function isQT(m) { return isQ(m) && m.kind !== 'releve'; } // la question d'abord, puis le test (R+5h)
  var NPLAN = PLAN.filter(function (m) { return !m.off; }).length; // moments réellement au programme (12)
  // e4d : s = état du moment (slotStates). Un jour du plan à 7 moments (avant le 21/11/2026) garde des tests à R+10h et R+11h, alors que le moment du plan est maintenant « Relevé » : l'étiquette suit le jour.
  function kindTxt(m, s) { return s && s.chain && m.kind === 'releve' ? KIND_TXT.both : KIND_TXT[m.kind]; }
  function momKind(m, s) { return isQT(m) ? 'Question du creux, puis test' : (m.q ? 'Question du creux' : kindTxt(m, s)); }
  function momLabel(m, s) { return rLabel(m.r) + ' · ' + momKind(m, s) + ' · ' + m.name; }
  function momGoal(m) { return isQT(m) ? m.qgoal + ' · ' + m.goal : (m.qgoal || m.goal); }
  function momCardLabel(m, s) { return isQT(m) ? rLabel(m.r) + ' · ' + KIND_TXT[m.kind] + ' · ' + m.name : momLabel(m, s); } // carte « Maintenant » : la question a sa propre carte, la carte du moment ne porte que le test
  function momCardGoal(m) { return isQT(m) ? m.goal : momGoal(m); }

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
  /* e5 (20/11) : le relevé en 6 questions possibles (`fv: 3`). « Humeur de fond » remplace « Moral » dans les relevés ; « Niaque » seulement le matin (R+30 min, R+2h).
     Un relevé n'a que les questions de son moment (un seul champ à R+4h) : voir QSETS et PLAN[i].qs. Les anciennes réponses de « Moral » (`fv` 1 et 2) restent lisibles sous
     « Moral (ancienne question) », jamais mélangées à Humeur de fond. Les débuts et fins d'activité gardent leurs 5 questions (FEEL) : ce n'est pas un relevé.
     Termes : ceux validés le 11/10 pour Éveil, Énergie, Confort, Agitation ; Humeur de fond et Niaque : écrans validés le 06/11, mots de la Niaque confirmés le 20/11. */
  var FEEL3 = [
    { id: 'eveil',     label: 'Éveil',              group: 'corps',  opts: FEEL[0].opts, hint: FEEL[0].hint },
    { id: 'energie',   label: 'Énergie physique',   group: 'corps',  opts: FEEL[1].opts },
    { id: 'confort',   label: 'Confort physique',   group: 'corps',  opts: FEEL[2].opts },
    { id: 'humeur',    label: 'Humeur de fond',     group: 'esprit', opts: ['Très mauvaise', 'Mauvaise', 'Neutre', 'Bonne', 'Très bonne'],
      hint: 'Ton humeur de base de la journée, pas une émotion du moment.' },
    { id: 'niaque',    label: 'Niaque',             group: 'esprit', opts: ['Aucune niaque', 'Peu de niaque', 'Moyenne', 'De la niaque', 'Beaucoup de niaque'],
      hint: 'La niaque, c’est l’envie de faire, d’avancer.' },
    { id: 'agitation', label: 'Agitation mentale',  group: 'esprit', opts: FEEL[4].opts }
  ];
  var QSETS = {
    morning: ['eveil', 'energie', 'confort', 'humeur', 'niaque'],      // R+30 min, R+2h
    humeur:  ['humeur'],                                               // R+4h : une seule question, puis le test
    day4:    ['eveil', 'energie', 'confort', 'agitation'],             // R+9h, R+10h, R+11h, R+13h
    day5:    ['eveil', 'energie', 'confort', 'agitation', 'humeur']    // R+8h, R+12h, et le relevé libre (le Moral d'avant devient l'Humeur de fond)
  };
  function feel3Def(id) { return FEEL3.filter(function (f) { return f.id === id; })[0] || null; }
  // Jeu de questions du relevé en cours : celui du moment du plan ; `flow.qs` force un jeu (Relevé du matin hors fenêtre) ; sinon le relevé libre.
  function qsetOf(fl) { return QSETS[(fl && fl.qs) || (fl && fl.slot != null && PLAN[fl.slot] && PLAN[fl.slot].qs) || 'day5']; }
  // Sommeil de la nuit (carte « Ma nuit », e5) : échelles du Consensus Sleep Diary (traduction de Claude, non validée) ; souvenir des rêves : les mots de l'utilisateur (20/11).
  var NIGHT_Q = [
    { id: 'sq',    label: 'Qualité du sommeil', ask: 'Comment évalues-tu la qualité de ton sommeil ?', opts: ['Très mauvais', 'Mauvais', 'Moyen', 'Bon', 'Très bon'] },
    { id: 'rest',  label: 'Reposé',             ask: 'Te sens-tu reposé ?',                            opts: ['Pas du tout reposé', 'Un peu reposé', 'Moyennement reposé', 'Bien reposé', 'Très bien reposé'] },
    { id: 'dream', label: 'Rêves',              ask: 'Souvenir des rêves',                             opts: ['Aucun souvenir', 'Impression floue', 'Rêve(s) flou(s)', 'Rêve(s) net(s)'] }
  ];
  function nightOpt(id, v) { var q = NIGHT_Q.filter(function (x) { return x.id === id; })[0]; return q && v ? q.opts[v - 1] || '' : ''; }
  var ACTS_DEFAULT = ['Travail', 'Sport', 'Marche', 'Repos', 'Tâches', 'Loisirs'];
  var INST_DEFAULT = ['popo']; // premier instant déjà créé ; tu peux le retirer ou en ajouter dans Réglages
  /* « Joint » (depuis e4f, 20/11) : un instant fourni d'office sur l'écran Instant (la liste de Réglages n'est pas touchée), avec un type facultatif.
     Le type est un champ `jtype` de l'entrée « instant », écrit seulement quand le nom est « Joint » ; le « popo » et les autres instants ne changent pas. */
  var JOINT = 'Joint';
  var JTYPES = [['divertissement', 'Divertissement'], ['habitude', 'Habitude'], ['intention', 'Intention'], ['influence', 'Influence']];
  function jKey(n) { return String(n == null ? '' : n).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function isJoint(n) { return jKey(n) === 'joint'; }
  function jtypeOk(id) { return typeof id === 'string' && JTYPES.some(function (t) { return t[0] === id; }); }
  function jtLabel(id) { var r = JTYPES.filter(function (t) { return t[0] === id; })[0]; return r ? r[1] : ''; }
  var CREUX_MIN = 60; // un creux « en cours » depuis plus d'1 h : la carte (et la bannière de la Roue) demandent s'il est terminé
  var CREUX_MAX = 4 * 3600e3; // un creux dure 4 h au maximum : au-delà, l'appli le coupe toute seule (demande de Jonathan, 09/11)
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
  // Memory List : RÉGLAGES FIGÉS (maquette du 14/10 ; test NeuroUX, Paolillo 2024). study = affichage des 12 mots ; odd = tâche intercalaire « touche la forme différente » ;
  // gap = écrans « Autre tâche » et « Reconnaissance » ; blank = pause après chaque mot ; hit = bouton touché surligné ; oddBlank = pause entre deux formes ; ready = écran « Prêt ».
  // Pas d'entraînement. Les 98 listes de mots sont prises dans l'ordre : la liste n sert au n-ième passage (voir mlPick). Ne pas les changer en cours de recueil.
  var ML = { ver: 1, study: 30000, odd: 30000, gap: 2200, blank: 300, hit: 100, oddBlank: 150, ready: 1600, nT: 12, nD: 12, refMin: 3, estSec: 120 };
  var ML_BANK = [ // liste n° 1 à 98 : « 12 mots à retenir | 12 mots nouveaux » (voir Banque-mots-Memory-List)
    'barbecue lama terrine vigne champignon guérite mélèze ombrelle savon astéroïde poulain guêtre|sirop parmesan cabriolet touriste blason lecteur charrette raie étable silex pinceau rascasse',
    'visière gypse passoire main tuile ruche auberge smoothie hirondelle calendrier digicode borne|melon boulanger chaise iris pavillon profiterole ortie beffroi morse chimpanzé toboggan serre',
    'opossum couturière palier acacia ours infusion aiguille baromètre mantille sceau grange huile|clémentine épinard gazon cymbale okapi porcelet matelas piolet volière bleuet bandana luzerne',
    'gazelle cible olive bras brindille placard levain mètre autocuiseur fondue marguerite écaille|bouchon furet améthyste caramel source péninsule galoche truite douche averse pilote coulisse',
    'tandem pesto épouvantail basket sentier tête kangourou sureau meule cafetière pistil rutabaga|crête mezzanine baignoire lampion rossignol verrou baleine carte mangeoire pneu aulne lasagne',
    'partition télescope gouge léopard mauve camionnette cajou litchi béret soupière reine planète|chipolata tableau dépendance épuisette jungle drap racine hanneton rondin lynx bourg bracelet',
    'réveil basilic topaze veston lamantin pince composteur gourde fourrure rive entrepôt musicien|cyprès vitrine houblon peluche wombat chenille levure perron banquise route épicerie vignoble',
    'râtelier givre guéridon kumquat terrasse coyote fleuriste plancher brebis thuya péage médecin|boue ventouse diamant poupée frites céleri crapaud registre excavatrice trottoir lutin isthme',
    'araignée lavoir salière estragon marée puzzle bougeoir collant oasis ocelot trèfle marronnier|boucherie fouet prisme bécasse valve suricate kayak toast abricot calanque continent paupière',
    'arche yourte bretelle chalumeau fourgon flocons martinet peuplier pupitre église bassin steak|bermuda enseigne limon coussin genette mayonnaise trône proue copeau kiosque interphone figue',
    'luciole tournevis atelier polenta cadran radiateur plomb belette kimono chaudron évier aurore|housse baobab librairie spectateur pinson mangue barrage équerre faisan laitue dossier congère',
    'haricot rouage marmite pollen trousse caillou boucle parquet chalutier émeraude tente génisse|monastère hérisson front paillasson igloo gnocchi dragée bahut hache colombier antilope grêle',
    'lait blouson tiroir dentelle calebasse stalactite quai endive fumée présentoir buffle cigogne|banque policier espadon monospace tisane tamaris guacamole peigne maquereau satin canal algue',
    'mansarde frigo tanière amande champ bronze martre ukulélé parchemin éclair jongleur redingote|spaghetti gousse mulet fermier boulevard snowboard corde tresse cèpe pilier peignoir tondeuse',
    'toucan flamme égouttoir poste mouflon fanfare grimoire artichaut pécan graine cube télévision|ruisseau boîte échelle roquefort chiffon sirène perle carrosse scorpion fuseau méduse brioche',
    'limace mouette surligneur bocage salopette tremplin girolle onyx cuillère mairie paella paume|ruban dauphin autobus dompteur fusain persil clavecin jetée croquette fleuve toile espadrille',
    'elfe poteau glacier assiette fossile bulldozer tornade rôti praline tenaille fauvette couloir|donjon zèbre crevette baudrier vermicelle sillon taxi salsifis lavabo oriflamme poing chardon',
    'pompe faitout bannière mitaine sauterelle roue lentille mikado curry citrouille gravier puits|tunique sucette potager filet bidon mangouste soupe nénuphar bécassine dune cordonnier éponge',
    'nouilles établi argile bouillotte truffe maison émeu soupirail cloche détroit lavande pelouse|braise asperge hochet religieuse louche pantalon croc serpent genouillère cône port aérodrome',
    'nèfle clairière ancre maillet houx brume dromadaire sucrier essoreuse cartable poireau fennec|lacet haie berceau vache cinéma purée buanderie tourterelle alphabet roquette hortensia piège',
    'gland botte gomme flotteur perche ficelle mousse éprouvette chamois soja nectarine jardinière|dragon cerceau vestibule thermomètre jabot guépard pois côtelette sable aquarium plume futaie',
    'rivage acrobate planeur orme cochon montre caniveau nageoire raclette trombone besace sablier|vernis bruine passerelle hamac forgeron crocodile ravioli guichet datte perceuse manoir fourmi',
    'mocassin guêpe basilique cocotte râteau serpe emmental repaire parking tulipe billard goéland|étudiant lampadaire poule bobine torche paquebot merle courgette tarot macaron saphir cordage',
    'faubourg clôture mozzarella pivoine bison atlas menuisier salon thym étiquette pantoufle geai|colle tablier nonnette pochette bourdon square bosquet digue cresson lièvre dînette moustache',
    'merguez jasmin carafe hameçon hautbois steppe short tarentule banane pompier terrier bourgeon|menthe ruelle haltère pirate lucarne pivert fourrage truie jade chaudière camembert autoroute',
    'toupie chorale églantier rayon girafe physalis truelle classeur goujon bandeau école moutarde|fougère bureau cigale ibis géranium archipel voile tonnelle pizza embarcadère palmier sceptre',
    'raton potier talus fresque chaussette paprika antenne mouchoir échalote congre archet éclipse|béton comptoir mûre veilleuse ravin chevreuil burnous wagon podium violette yaourt tapisserie',
    'langouste ogre rôtissoire balise porridge hyène sauteuse colline parasol coton liane faucille|moisson caille tisonnier acier toque restaurant fève danseur putois règle boulgour dentifrice',
    'globe écran tournesol crabe péniche langue herbier airelle saxophone muscade ressort escabeau|pichet buvard poivron coquillage agneau bambou électricien récif séquoia quille miche commode',
    'métronome ampoule velours mosaïque iguane pistache soucoupe fjord pastille chambre lune lotte|linotte allumette coriandre potage bretzel berge halle daurade ramure sorcière cuvette mouche',
    'cardigan monocle seiche secrétaire parc bouc macadamia vague coquelicot géant fougasse bourse|shampooing persienne voûte maïs houe héron renne torrent chêne xylophone gabardine projecteur',
    'tiramisu villa sculpture alouette dent sablé lagune aubergine quenouille comète buffet pétale|éteignoir glycine couleuvre pion babouin jerrican vitre vase chevalier pull marin tagliatelle',
    'engrenage licorne mousson glace parfum céréale cuivre oursin bouquetin meunier paravent laine|hêtre gigot pintade fauteuil lime résine cuvier tambourin bouilloire hangar bibelot croissant',
    'météorite cerisier goyave ouistiti cage aquarelle frange tailleur sterne stade pâtes broderie|barrette clef popcorn hibiscus traîneau rocher paille hermine rempart serviette lupin enclume',
    'abri yacht abécédaire saucière fanion sabot panais dindon herbe bergerie confiture hippocampe|plastique bêche orange cloison estuaire tapir tajine micro cobaye pâturage acteur violoncelle',
    'jeton benne poutre vent limonade trottinette vanille jument chandelier skieur marbre pangolin|lierre barrière tipi écrevisse feuille chapelle pépin cloporte galette gardon andouille tamis',
    'eucalyptus granit bouton piquet poire horloger clarinette triton blouse morille hameau casier|noyau avenue moteur grenier coiffeur gingembre éléphant épine lotion plaid vilebrequin quinoa',
    'flanelle huître four arcade châtaignier verger pelote guirlande jambon veau cocotier tapenade|pylône vaisselier lande rubis stylo millet papillon faucon opale rondelle casquette mandoline',
    'serrure baba batterie dépanneuse terrarium panda cheminée myrtille tilleul saumon craie gerbe|grillon sandwich buisson moulinet queue girouette abbaye palme jambe penderie jardinier chips',
    'fagot agenda grive hamburger frelon moto bassine pelle cartouche romarin skateboard noisetier|cormoran accordéon tirelire ponceuse tanche gruyère médaille boule feutre rose pain chapelure',
    'harmonica microscope blaireau échafaudage bille origan papier coing étang manette nasse lotus|pouce méridienne saladier damier chien anchois foulard lard gouttière piste chantilly sorbier',
    'tricycle pêche hôtel instituteur broche cornemuse mare lanterne rasoir glaçon fouine scarabée|platane beurre mulot éleveur landau égout curcuma pèlerine gargouille cadeau mérou ordinateur',
    'madeleine sole scarole galet primevère rallonge hélice perforateur timbre oreille cime moufle|iceberg toundra marmotte semoule tonnerre patin bolet carnet aéroport gnome échiquier corbeau',
    'ingénieur tonneau vinaigre marionnette plaine taureau loir crêpe gratin manège entonnoir foin|marqueur lilas tampon clavier encornet contrebasse grenade natte poupe hamster quartz potiron',
    'marais mimosa thermostat grue beignet jarre théière poulie groseille poncho cavalier autocar|cèdre pagode brochet risotto zesteur facteur confetti sommier neige boulette multiprise koala',
    'étal betterave esplanade duvet grille flan branche homard pardessus vipère clématite ramequin|daim carrelage potion pendentif cuisinier hachis aigle sécateur sève tapioca banlieue amphore',
    'singe pergola amulette caserne orchidée museau trapèze rail avoine vestiaire topinambour brie|bois périscope commerçant escargot sarcelle gondole kaki pendule flaque câpre échoppe spatule',
    'élan cristal serveur édredon couverture vautour poivre bouillon plectre rapporteur hutte robe|moustique mollet fraise flacon sémaphore palourde anis cocon économe lorgnon nichoir raquette',
    'réglisse sanglier caméra érable garrigue comté écrou portail turquoise masque réverbère moule|gymnase trésor plateau blette manivelle flamant locomotive cumin gerboise pomme bocal verglas',
    'étamine balayette sarrasin radeau nuée toit barrique perruche fenouil carton diadème autruche|ananas tourelle étourneau pied pioche cacao flipper randonneur rouleau turbot jacinthe canapé',
    'ricotta princesse sucre cerf trophée perruque allée hareng frêne apiculteur sommet fourchette|brique usine emballage savane griffe table cadenas hippopotame barque patate roseau châtaigne',
    'mixeur canari blanquette sandale buis pipette tigre imprimante oseille scie ronce cathédrale|veste arène anguille jumelles cahier hotte troglodyte pignon ketchup biscuit pissenlit tempe',
    'chronomètre narval nageur balance voiture pagne taïga bruyère encrier pingouin cisaille tarte|câble maçon pouf vallée serpillière fricassée hanche sardine noix enceinte imperméable grenat',
    'costume muesli pétanque libellule nougat brosse cycliste sciure taupe fusible garage mangrove|infirmier luge munster pâquerette chou tourteau huilier balai pluie albatros éventail turbine',
    'loutre banderole casserole sapin ouvrier safran annuaire épaulette pierre morue ragoût canyon|orge chouette jonquille bûcheron volant index plinthe pâtisserie traversin kiwi réchaud bouée',
    'devanture rosée balançoire coffre ventre sauce omelette coccinelle humus pédale maillot patte|poulailler tricot malle funambule ardoise feta taillis vitrail cave biscotte écureuil gorille',
    'framboise ambre nappe estrade chinchilla charbon peintre gouache gorge aile balustrade quiche|limande phoque tuba talisman architecte cape brasier lustre gaufre pilon brouillard reblochon',
    'lichen satellite seau véranda pressoir diligence bigorneau coulis gouffre plumeau navet lapin|moulin laurier saule cannelle mèche piston gobelet tabouret bungalow golfe barracuda carapace',
    'brodequin cabine houmous tasse lessive mécanicien tamanoir genêt baguette épicéa écurie photo|perroquet pieuvre baquet éboulis croûton anémone macaroni magicien chariot niveau silo levier',
    'immeuble torchon macaque pigeon seigle souche appentis brocoli gilet chanteur transat charrue|étain barbe coléoptère pharmacie orchestre chapiteau sorbet thon pastel brouette môle girofle',
    'mannequin salade bâton ciboulette rhinocéros versant lèvre collier loupe pâté timbale poussin|soufflet épingle mandrill magasin banc agate pastèque tempête agriculteur café orgue escarpin',
    'rame beurrier sauge horodateur anorak cabanon forteresse cendre prune littoral termite murène|lion mortier bouleau pélican héliport tartine volet bouche palais sifflet meringue crépuscule',
    'plafond écorce verre boutique compote toge fiole mousqueton mésange obsidienne berlingot paon|canif remorque banjo arrosoir sonnette hublot promenade chat rillettes soleil tamarin artisan',
    'poubelle impasse cornichon écumoire triangle cactus moineau piment divan étincelle soie appât|fronton tuyau rhubarbe brownie parterre cravate rongeur olivier bélier téléphone delta écluse',
    'bague rabot poussette mineur glaïeul coucou congélateur palette escalope baril loup limousine|papaye fromagerie radio joue gouvernail saucisse tronc carpe lémurien enclos fiacre corbeille',
    'robinet abreuvoir noyer panneau fossé bordure mirabelle jarretière voyageur gare cygne otarie|aspirateur patinoire concombre baie muguet étui étau tremble soda perdrix salamandre crêpière',
    'chocolat brousse tourbe orque mandarine diapason tulle fontaine râpe gecko poissonnier boulon|panthère dirigeable chèvre ongle carrousel radis étendard épeautre basson tige piscine agrafe',
    'poulpe cacahuète drapeau sacoche cruche uniforme hôpital aneth hélicoptère galaxie zinc ajonc|javelot rocaille financier viaduc porte campagnol burin bûche domino guimauve manchot papyrus',
    'détroit aiguille hirondelle mikado kimono frigo nèfle trèfle chaumière parquet fanfare mauve|chignon plume tisane route dauphin oriflamme corail interphone diamant source parmesan aulne',
    'composteur auberge rôti reine combe poulain baromètre levain salière trousse planeur dentelle|fleuve pilier enseigne brioche librairie cric guépard baleine soupe hortensia ventouse hochet',
    'amande fondue bassin tremplin repaire casque smoothie stalactite perche guêtre ours partition|caisse houblon grêle asperge poupée méduse taxi mezzanine boucherie spectateur chacal berceau',
    'glacier flamme faitout orme arche salon dromadaire caméléon blouson basilic éprouvette truffe|lynx ciment valve lasagne gazon gnocchi tondeuse péninsule cordage mangue rascasse espadrille',
    'chantier compas jardinière poteau ruche givre limace short mozzarella planète mansarde topaze|haie kayak crudités bouchon aérodrome igloo rossignol touriste peigne bandana sucette genette',
    'besace crevasse parking pompe argile rive étiquette girafe flotteur girolle steak charpentier|bahut mangeoire laitue galoche alphabet maquereau volière paupière racine lavabo boue criquet',
    'fresque gazelle assiette guéridon brume infusion cachalot sureau lentille ukulélé montre quai|fusain perle archipel colombier poule vestibule bermuda chenille serre braise suricate menthe',
    'tuile placard bourgeon surligneur médecin rouage guérite lavande ocelot thym redingote chemin|dossier futaie cintre hamac vache vermicelle épuisette scorpion baignoire kiosque fève calèche',
    'tiroir passoire luciole ancre ciboule savon banane mouflon nouilles bocage églantier entrepôt|potager registre truite aquarium forgeron châle lampion quille violette coussin épinard mulet',
    'sauterelle estragon canoë pelouse bronze terrasse talus raclette lotte fossile haricot yourte|récif lièvre autobus melon canal géranium roquefort chevet moisson saphir pinceau thermomètre',
    'clôture mocassin langouste géant barbecue pollen gomme hameçon huile éclipse kangourou cageot|pinson donjon miche buanderie excavatrice améthyste pantalon filet linotte jungle ortie cadre',
    'fauvette faubourg cartable globe vigne calendrier soja graine léopard boucle radiateur endive|boulgour datte allumette voile lampadaire torrent éponge perron vitre chevreuil luzerne furet',
    'tanière couturière gourde brebis ampoule échalote écaille botte mélèze dent airelle cafetière|port profiterole ibis dragée tableau zèbre jetée étudiant restaurant calanque guichet bibelot',
    'cuillère bretelle parasol citrouille toucan trombone gland atelier écran mosaïque olive meule|square lime bécasse tapisserie camembert snowboard drap xylophone paille peluche raie macaron',
    'fumée sablier toupie collant coque macadamia puits bergerie évier musicien sculpture porridge|sirène isthme rempart ruban crête yaourt tourterelle fourrage hangar bracelet potage hérisson',
    'jasmin martinet paprika poste digicode basket colonne aurore balise râteau génisse champignon|piolet séquoia sable feuille embarcadère cabas bretzel louche fermier estuaire toast hanneton',
    'maison mousson réveil artichaut limonade borne onyx pastille télescope villa crinière goéland|hibiscus pizza trottoir violoncelle satin castor commode veilleuse pneu baobab moteur abricot',
    'steppe litchi antenne astéroïde colline pupitre roue morille tulipe huître bouquetin couronne|boîte jerrican chêne épicerie baudrier religieuse gardon tablier sceptre mouche tajine pichet',
    'bougeoir stade mouette gypse jeton mouchoir truelle nageoire plancher cheminée éclair céréale|avenue shampooing pirate pâturage toque clémentine ramure levure digue babouin buvard serpent',
    'flocons dindon émeu araignée paravent tiramisu mètre ombrelle liane granit chambre skateboard|sillon hermine jade tamaris tonnelle vitrine dînette galette coureur corde mandoline sandwich',
    'citerne abécédaire pétale muscade puzzle nectarine mairie oursin tête frelon ogre coquelicot|guacamole salsifis barrage douche saladier berge clef rondin mangouste pivert tarot jardinier',
    'lune cajou elfe chiffonnier fourrure nasse trottinette brindille panda lagune goyave râtelier|autoroute fouet règle hêtre houe monastère roquette clavecin mayonnaise faisan éleveur blason',
    'visière télévision sablé sentier ressort terrier jongleur parfum congre marronnier vague lait|purée bosquet acteur millet housse grenier accordéon étable banquise chevalet fourmi crevette',
    'poireau couloir peuplier glaçon jambon faucille moufle compteur école engrenage triton martre|bécassine clavier vignoble nonnette dragon banque tipi antilope équerre gabardine rose frites',
    'tournesol microscope sceau geai plomb laine curry égouttoir groseille lavoir bouillotte hôtel|monospace jabot rocher buisson trône hamster toboggan couscous stylo iceberg pilote spaghetti',
    'grue emmental abri vinaigre soupirail marmite fagot homard licorne météorite grange bulldozer|gargouille crédence pochette carte épine aéroport ruisseau averse ravioli queue lutin daurade',
    'praline guêpe vipère bille marbre fleuriste épouvantail tente clou courroie velours menuisier|fougère ordinateur tambourin passerelle comptoir toile pois abbaye espadon vase opale spatule',
    'monocle ouistiti vent galet église couvercle soupière alouette péage sucrier branche pistache|gigot charrette dentifrice éléphant coulisse dune jambe pèlerine torche béton gruyère sorbier',
    'thermostat billard madeleine fjord buffet avoine hyène rutabaga grimoire frange acacia cuivre|cacatoès tirelire boulevard lacet wagon prisme voûte figue genouillère plateau capucine sirop',
    'tricycle singe émeraude raton rôtissoire mitaine pompier bassine gerbe pâtes cassoulet fanion|aigle échelle gymnase électricien anis carrefour piste lotion fauteuil bourdon crampon gousse'
  ];
  // Les tests qu'on peut lancer librement (Journal → « Test libre »).
  var TESTS = [
    { id: 'pvt', name: 'PVT-B', cog: 'Vigilance soutenue', dur: '3 min' },
    { id: 'rs',  name: 'Rotation span', cog: 'Mémoire de travail', dur: '≈ ' + ssDur(RS.estSec * 1000) },
    { id: 'fl',  name: 'Flanker', cog: 'Inhibition', dur: '≈ ' + ssDur(FL.estSec * 1000) },
    { id: 'ss',  name: 'Symbol Search', cog: 'Vitesse de traitement', dur: '≈ ' + SS.estSec + ' s' },
    { id: 'hs',  name: 'Hand Swype', cog: 'Flexibilité', dur: ssDur(HS.estSec * 1000) },
    { id: 'ml',  name: 'Memory List', cog: 'Mémoire épisodique', dur: '≈ ' + ssDur(ML.estSec * 1000) }
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
    '.j-pt.done .j-n{background:var(--text);border:1px solid var(--text);color:var(--ink-on)}',
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
    '.btn.primary{background:var(--text);color:var(--ink-on)}',
    '.btn.primary:disabled{background:var(--track);color:var(--nav-off);cursor:default}',
    '.btn.secondary{background:none;border-color:var(--line2);color:var(--text);font-weight:600}',
    '.btn.ghost{background:none;color:var(--muted);min-height:44px;font-size:14px;font-weight:600}',
    '.btn.j-small{min-height:44px;font-size:14px;margin:4px 5px 0;width:auto}',
    '#j-hist{display:flex;flex-direction:column;gap:8px}',
    '.btn.j-rank{margin:0 5px;width:calc(100% - 10px);justify-content:space-between;min-height:48px;font-size:15px}',
    '.btn.j-rank .j-rk{display:inline-flex;align-items:center;gap:2px;font-weight:700}',
    '.btn.j-wakebtn{margin:0 5px;width:calc(100% - 10px);justify-content:space-between;min-height:58px;padding:6px 14px;text-align:left}',
    '.j-wakebtn .j-wk1{display:flex;align-items:center;gap:12px;min-width:0}',
    '.j-wakebtn .j-wke{font-size:28px;line-height:1;flex-shrink:0}',
    '.j-wakebtn .j-wkt{display:flex;flex-direction:column;gap:1px;min-width:0}',
    '.j-wakebtn .j-wkt b{font-size:16px}',
    '.j-wakebtn .j-wks{font-size:12px;font-weight:600;color:var(--muted);line-height:1.3;overflow-wrap:anywhere}',
    '.j-wakebtn .j-rk{display:inline-flex;align-items:center;flex-shrink:0}',
    '.j-tiles{margin:0 5px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.j-tile{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:6px;min-height:136px;padding:14px 6px 10px;border-radius:16px;border:1px solid var(--line2);background:var(--card);color:var(--text);font-family:inherit;text-align:center;cursor:pointer}',
    '.j-tile .ic{font-size:38px;line-height:1.1}',
    '.j-tile .tn{font-size:14px;font-weight:700;line-height:1.2;overflow-wrap:normal;word-break:normal}',
    '.j-tile .ts{font-size:11.5px;line-height:1.3;color:var(--muted);overflow-wrap:anywhere}',
    '@media (max-width:340px){.j-tile .tn{font-size:12.5px}.j-tile .ts{font-size:11px}}',
    // e5b : le mantra se lit comme un texte de lecture : police serif de lecture du système (New York sur iPhone), grande taille, interligne aéré, une phrase par ligne, groupes espacés.
    '.j-card.j-mcard{padding:22px 20px 24px}',
    '.j-mantra{font-family:ui-serif,"New York","Iowan Old Style",Charter,Georgia,serif;font-size:19px;line-height:1.75;letter-spacing:.005em;text-align:left;overflow-wrap:break-word;color:var(--text)}',
    '.j-mantra .mg{margin:0 0 1.6em}.j-mantra .mg:last-child{margin-bottom:0}',
    '.j-mantra p{margin:0 0 .8em}.j-mantra .mg p:last-child{margin-bottom:0}',
    '@media (max-width:340px){.j-mantra{font-size:17.5px}.j-card.j-mcard{padding:18px 16px 20px}}',
    '#m-text.j-ta{font-family:ui-serif,"New York","Iowan Old Style",Charter,Georgia,serif;font-size:17px;line-height:1.6}',
    '.j-h.j-lastt{width:calc(100% - 10px);text-align:left;font:inherit;color:inherit;cursor:pointer;min-height:48px}',
    '.j-h.j-lastt .when{font-size:13px}',
    '.j-h .j-more{display:inline-flex;align-items:center;gap:2px;align-self:flex-end;font-size:13px;font-weight:700}',
    '.j-grid{margin:0 5px;display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.j-grid .btn{padding:0 8px;font-size:14px;min-height:46px}',
    '.j-grid .btn.wide{grid-column:1 / -1}',
    '.j-now{margin:0 5px;background:var(--card);border:1px solid var(--line2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}',
    '.j-now.act{border-left:4px solid var(--teal)}',
    '.j-now.creux,.j-now.creuxq{border-left:4px solid #6BBF8A}',
    '.j-now.creuxq .j-sel{width:100%;box-sizing:border-box}',
    '.j-now.bed{border-left:4px solid var(--violet)}',
    '.j-now .t1{font-size:17px;font-weight:700;line-height:1.25}',
    '.j-now .t2{font-size:13px;line-height:1.4;color:var(--muted)}',
    '.j-now .t3{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.j-now .btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}',
    '.j-now .btns .btn{flex:1;min-width:120px}',
    '.j-now .inrow{display:flex;gap:8px;align-items:center;margin-top:4px}',
    '.j-now .inrow .j-sel{flex:1;min-width:0}',
    '.j-now .inrow .btn{flex:1;min-width:0;width:auto}',
    '.j-picks{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.j-pick{display:flex;align-items:center;justify-content:center;text-align:center;min-height:64px;padding:8px 10px;border-radius:14px;border:1px solid var(--line2);background:var(--card);color:var(--text);font-size:17px;font-weight:700;line-height:1.2;overflow-wrap:anywhere;cursor:pointer;font-family:inherit}',
    '.j-picks.three{grid-template-columns:repeat(3,1fr)}',
    '.j-pick.other{border-style:dashed;font-weight:600;color:var(--muted)}',
    '.j-pick.on{border:2px solid var(--text);background:var(--nav-on);color:var(--text)}',
    '.j-addrow{display:flex;gap:8px;align-items:stretch}',
    '.j-addrow .j-sel{flex:1;min-width:0}',
    '.j-addrow .btn{flex:0 0 auto;width:auto;padding:0 16px}',
    '.j-mlist{list-style:none;margin:0;padding:0 0 10px;display:flex;flex-direction:column;gap:6px}',
    '.j-mrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 4px 2px 14px;border-radius:12px;background:var(--card);border:1px solid var(--line)}',
    '.j-mrow .n{font-size:15px;font-weight:600;overflow-wrap:anywhere}',
    '.j-hist{display:flex;flex-direction:column;gap:6px}',
    '.j-h{margin:0 5px;padding:10px 12px;border-radius:12px;background:var(--card);border:1px solid var(--line);display:flex;flex-direction:column;gap:4px}',
    '.j-h .r1{display:flex;align-items:center;justify-content:space-between;gap:8px}',
    '.j-h .when{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-h .kind{font-size:12px;color:var(--muted);text-align:right}',
    '.j-h .r2{display:flex;align-items:center;gap:8px;font-size:12.5px;font-variant-numeric:tabular-nums}',
    '.j-h .body{font-size:12.5px;line-height:1.4;color:var(--muted);white-space:pre-wrap;overflow-wrap:anywhere}',
    '.j-h .body.note{color:var(--text)}',
    '.j-h .body.clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
    '.j-h .kind.nt{padding:1px 9px;border-radius:12px;border:1px solid var(--line2);font-weight:700;max-width:60%;overflow-wrap:anywhere;text-align:center}',
    '.j-nt{display:flex;flex-direction:column;gap:8px}',
    '.j-nt .j-pick{position:relative;min-height:52px;padding:8px 6px;font-size:15px;overflow-wrap:normal;word-break:normal}',
    '.j-nt .j-pick.u{overflow-wrap:anywhere}',
    '.j-nt .j-pick .ck{position:absolute;top:-7px;right:-4px;width:20px;height:20px;border-radius:50%;background:var(--text);color:var(--bg);font-size:12px;line-height:20px;text-align:center;font-weight:800}',
    '@media (max-width:340px){.j-nt .j-pick{font-size:13.5px}}',
    '.j-fbar{display:flex;flex-direction:column;gap:6px;margin:0 5px 12px}',
    '.j-fbar .lab{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-top:4px}',
    '.j-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '.j-chip{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:4px 12px;border-radius:20px;border:1px solid var(--line2);background:var(--card);color:var(--text);font-size:13.5px;font-weight:600;line-height:1.2;cursor:pointer;font-family:inherit}',
    '.j-chip .n{font-size:11.5px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.j-chip.on{border:2px solid var(--text);background:var(--nav-on);padding:3px 11px}',
    '.j-chip.on .n{color:var(--text)}',
    '.j-gt{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin:12px 5px 0}',
    '.j-gt.sub{font-size:10.5px;letter-spacing:.1em;margin:6px 5px 0 14px}',
    '.j-h .ans{margin-top:6px;padding-left:9px;border-left:3px solid #6BBF8A}',
    '.j-h .ans.att{border-left-color:var(--nav-off)}',
    '.j-h .ans.lnk{border-left-color:var(--dash);border-left-style:dashed}',
    '.j-h .lkr{display:flex;align-items:baseline;flex-wrap:wrap;gap:0 6px;margin-top:2px}',
    '.j-h .lkc{font-size:12px;font-weight:700;color:var(--muted)}',
    '.j-h .lkt{font-size:13.5px;flex:1 1 150px;min-width:0;overflow-wrap:anywhere}',
    '.j-h.hl{outline:3px solid var(--nav-off);outline-offset:2px}',
    '.j-from{margin:0 5px;padding:8px 10px;border-left:3px dashed var(--dash);background:var(--card);border-radius:0 10px 10px 0}',
    '.j-from .alab{font-size:11.5px;font-weight:700;color:var(--muted)}',
    '.j-from .t{margin-top:2px;font-size:14px;white-space:pre-wrap;overflow-wrap:anywhere;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden}',
    '.j-h .alab{font-size:11.5px;font-weight:700;color:var(--muted)}',
    '.btn.danger{background:none;border:1px solid var(--coral);color:var(--coral-text);font-weight:600}',
    '.j-h .meta{font-size:11.5px;line-height:1.35;color:var(--muted);font-variant-numeric:tabular-nums}',
    '.j-h .act{display:flex;align-items:center;justify-content:flex-end;gap:4px;flex-wrap:wrap}',
    '.j-confirm{font-size:12.5px;color:var(--text)}',
    '.j-link{min-height:44px;padding:0 8px;background:none;border:none;color:var(--muted);font-size:13px;font-weight:600;text-decoration:underline;cursor:pointer;font-family:inherit}',
    '.j-link.danger{color:var(--coral-text)}',
    '.j-empty{margin:0 5px;padding:14px 16px;border-radius:12px;border:1px dashed var(--dash);font-size:13.5px;line-height:1.4;color:var(--muted)}',
    '.j-warn{margin:0 5px;padding:10px 12px;border-radius:12px;border:1px solid var(--coral);font-size:13px;line-height:1.4;color:var(--text)}',
    '.j-ok{margin:0 5px;padding:10px 12px;border-radius:12px;border:1px solid var(--line2);background:var(--card);font-size:13px;line-height:1.4;color:var(--text)}',
    '.foot{flex-shrink:0;padding:10px 20px calc(24px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--nav);display:flex;flex-direction:column;gap:6px}',
    '.j-field{display:flex;flex-direction:column;gap:4px}',
    '.j-lab{font-size:13px;font-weight:600}',
    '.j-fhint{font-size:12px;line-height:1.35;color:var(--muted)}',
    '.j-sec{margin:0 5px;display:flex;flex-direction:column;gap:10px}',
    '.j-sec h2{font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted)}',
    '.j-sel{width:100%;min-height:48px;padding:0 12px;background:var(--card);border:1px solid var(--line2);border-radius:12px;color:var(--text);font:inherit;font-size:16px}',
    '.j-ta{margin:0 5px;width:calc(100% - 10px);min-height:240px;padding:12px 14px;background:var(--card);border:1px solid var(--line2);border-radius:12px;color:var(--text);font:inherit;font-size:16px;line-height:1.45;resize:none}',
    '.j-ta.small{min-height:110px;margin:6px 0;width:100%;font-size:14px}',
    '.j-ta.mid{min-height:96px;margin:6px 0;width:100%;font-size:16px}',
    '.j-ta::placeholder,.j-sel::placeholder{color:var(--nav-off)}',
    '.j-card{margin:0 5px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}',
    '.j-card.fin{border-left:4px solid #6AA9E8}',
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
    '.j-prog{height:6px;border-radius:3px;background:var(--track);overflow:hidden;margin-top:10px}',
    '.j-prog>div{height:6px;width:0;background:var(--teal)}',
    '#v-journal main.j-runmain{padding:24px 20px 12px;gap:14px}',
    '.j-area{flex:1;min-height:0;width:100%;border:1px solid var(--line2);border-radius:24px;background:var(--card);color:var(--text);',
    '  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;touch-action:none;',
    '  -webkit-user-select:none;user-select:none;-webkit-touch-callout:none;cursor:pointer}',
    '.j-num{font-size:min(96px,24vw);font-weight:700;line-height:1;letter-spacing:-.02em;color:var(--gold-text);font-variant-numeric:tabular-nums;min-height:1em}',
    '.j-num.txt{font-size:40px;color:var(--muted);letter-spacing:0}',
    '.j-unit{font-size:15px;font-weight:600;letter-spacing:.14em;color:var(--muted)}',
    '.j-unit[hidden]{display:none}',
    '.j-jt[hidden]{display:none}',
    '.j-jt .j-pick{padding:8px 6px;font-size:16px;overflow-wrap:normal;word-break:normal}',
    '@media (max-width:340px){.j-jt .j-pick{font-size:13.5px}}',
    '.j-runhint{font-size:14px;line-height:1.4;text-align:center;color:var(--muted)}',
    '.j-metrics{display:flex;gap:8px}',
    '.j-metrics>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.j-metrics b{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-metrics b small{font-size:13px;font-weight:600;color:var(--muted)}',
    '.j-metrics span{font-size:12px;color:var(--muted)}',
    '.j-metrics.wrap{flex-wrap:wrap;gap:14px 8px}',
    '.j-metrics.wrap>div{flex:1 1 28%}',
    '.j-opt{display:flex;align-items:flex-start;gap:12px;min-height:44px;padding:12px 14px;border-radius:14px;background:var(--card);border:1px solid var(--line);cursor:pointer}',
    '.j-opt.on{border-color:var(--text)}',
    '.j-opt input{width:20px;height:20px;margin:2px 0 0;flex-shrink:0;accent-color:var(--text)}',
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
    '.ss-fb.ok{color:var(--teal-text)}',
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
    'button.fl-btn.hit{background:var(--nav-on);border-color:var(--text)}',
    // Memory List
    '.ml-trial{width:100%;display:flex;flex-direction:column;align-items:center;gap:14px;margin:auto 0;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.ml-words{list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;width:100%;padding:0;margin:0}',
    '.ml-words li{font-size:19px;font-weight:700;line-height:1.2;padding:10px 6px;background:var(--card);border:1px solid var(--line2);border-radius:10px;text-align:center;overflow-wrap:anywhere}',
    '.ml-word{font-size:clamp(2rem,9vw,2.8rem);font-weight:700;line-height:1.1;min-height:4.4rem;width:100%;display:grid;place-items:center;text-align:center;overflow-wrap:anywhere}',
    '.ml-odd{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:12px;width:min(100%,17rem);aspect-ratio:1}',
    'button.ml-cell{appearance:none;-webkit-appearance:none;display:grid;place-items:center;padding:16px;background:var(--card);border:1px solid var(--line2);border-radius:10px;color:var(--text);cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}',
    '.ml-cell svg{width:100%;height:100%;display:block}',
    '.ml-resp{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}',
    'button.ml-btn{appearance:none;-webkit-appearance:none;min-height:76px;font-size:18px;touch-action:manipulation}',
    'button.ml-btn.hit{background:var(--nav-on);border-color:var(--text)}',
    '@media (pointer:coarse){.ml-keys{display:none}}',
    // Plan des tests (4a)
    '.pl-nav{display:flex;align-items:center;gap:8px}',
    '.pl-nav .btn{width:52px;flex-shrink:0;padding:0}',
    '.btn.secondary:disabled{opacity:.35;cursor:default}',
    '.pl-navc{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column;gap:2px}',
    '.pl-navc b{font-size:16px;overflow-wrap:anywhere}',
    '.pl-navc span{font-size:12px;color:var(--muted);overflow-wrap:anywhere}',
    '.pl-ms{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}',
    '.pl-m{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line)}',
    '.pl-m:first-child{border-top:none}',
    '.pl-t{flex:0 0 58px;display:flex;flex-direction:column;gap:2px;font-variant-numeric:tabular-nums}',
    '.pl-t b{font-size:15px}',
    '.pl-t span{font-size:11.5px;color:var(--muted)}',
    '.pl-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.pl-n{font-size:12px;color:var(--muted);overflow-wrap:anywhere}',
    '.pl-seq{font-size:14px;font-weight:600;line-height:1.35;overflow-wrap:anywhere}',
    '.pl-it{display:inline-block;white-space:nowrap}',
    '.pl-it:not(:last-child)::after{content:" ·"}',
    '.pl-pvt{color:var(--muted);font-weight:600}',
    '.pl-d{flex-shrink:0;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap;padding-top:2px}',
    '.pl-tot{font-size:13px;font-weight:600;color:var(--text);padding-top:8px;border-top:1px solid var(--line)}',
    '.pl-setbody{display:flex;flex-direction:column;gap:10px;padding:2px 0 8px}',
    '.pl-quick{display:flex;gap:8px}',
    '.pl-quick .btn{flex:1;min-width:0;min-height:44px;font-size:14px}',
    '.pl-sep{border:none;border-top:1px solid var(--line);margin:6px 0;width:100%}',
    '.pl-hist{margin:0;padding:0 0 0 18px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}',
    '.pl-stages{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;font-size:12px;line-height:1.35;color:var(--muted)}',
    '.pl-stages b{color:var(--text)}',
    '.ch-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}',
    '.ch-it{display:flex;align-items:center;gap:12px;padding:11px 0;border-top:1px solid var(--line);font-size:15px;line-height:1.3}',
    '.ch-it:first-child{border-top:none}',
    '.ch-n{width:28px;height:28px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:1px dashed var(--dash);color:var(--muted)}',
    '.ch-it.done .ch-n{border:1px solid var(--dash);color:var(--text)}',
    '.ch-it.next .ch-n{border:1px solid var(--text);color:var(--text)}',
    '.ch-it.next .ch-t{font-weight:700}',
    '.ch-it.done .ch-t{color:var(--muted)}',
    '.ch-t{flex:1;min-width:0;overflow-wrap:anywhere}',
    '.ch-d{flex-shrink:0;font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.j-ptw{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}',
    '.j-ptl{align-self:flex-start;padding:0;min-height:44px;text-align:left}'
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
  // « 6 nov. à 13h00 » : la vraie date de l'instant (pas la « journée » du Journal) ; l'année s'ajoute si ce n'est pas l'année en cours.
  function whenText(ts) {
    var d = new Date(ts), o = { day: 'numeric', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
    return d.toLocaleDateString('fr-FR', o) + ' à ' + clockOf(ts);
  }
  // Dates d'une note : création = `ts` (aussi pour les notes d'avant le 08/11) ; dernière modification = `modTs`, seulement si le texte a été changé.
  function noteDates(e) {
    var m = typeof e.modTs === 'number' && isFinite(e.modTs) && e.modTs > e.ts;
    var a = ansAnswered(e) && typeof e.ansTs === 'number' && isFinite(e.ansTs) && e.ansTs > e.ts;
    var r = attFilled(e) && typeof e.attTs === 'number' && isFinite(e.attTs) && e.attTs > e.ts, v = isVal(e);
    return 'Créée le ' + whenText(e.ts) + (m ? ' · Modifiée le ' + whenText(e.modTs) : '') + (a ? ' · Répondu le ' + whenText(e.ansTs) + ' (' + delayText(e.ansTs - e.ts) + ')' : '') + (r ? ' · Note rattachée le ' + whenText(e.attTs) + ' (' + delayText(e.attTs - e.ts) + ')' : '') + (v ? ' · Validée le ' + whenText(e.valTs) + ' (' + delayText(e.valTs - e.ts) + ')' : '');
  }
  // Validation d'une note (depuis e5c, 24/11) : champ facultatif `valTs` (heure de la validation) sur une note. Réversible : « Annuler la validation » retire le champ. Indépendant de la réponse (questionnement) et de la note rattachée (to-do).
  function isVal(e) { return !!e && e.kind === 'note' && typeof e.valTs === 'number' && isFinite(e.valTs) && e.valTs > e.ts; }
  // Réponse à un questionnement (depuis le 08/11, c2a3) : champs facultatifs `ans` (texte) et `ansTs` (heure de la première réponse), sur la même note.
  function ansAnswered(e) { return !!e && e.kind === 'note' && typeof e.ans === 'string' && !!e.ans.trim(); }
  function delayText(ms) { // « 12 min après », « 3 h après », « 2 j après »
    var m = Math.floor(ms / 60000); // « après » = au moins : on arrondit vers le bas
    var A = '\u00a0'; // espaces insécables : « 3 h après » ne se coupe pas en deux lignes
    if (m < 1) return 'moins d’une minute' + A + 'après';
    if (m < 60) return m + A + 'min' + A + 'après';
    if (m < 1440) return Math.floor(m / 60) + A + 'h' + A + 'après';
    return Math.floor(m / 1440) + A + 'j' + A + 'après';
  }
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
  var ML_CFG = 'v' + ML.ver + '/' + ML.nT + '+' + ML.nD + '/study' + (ML.study / 1000) + '/odd' + (ML.odd / 1000);
  function fmtN1(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }

  // Rotation span. Un essai = { a: flèches vues (0 à 15), s: flèches touchées, l: [[1 juste | 0 fausse | 2 temps écoulé, ms], …] }.
  function rsArrowLabel(id) { return (id < 8 ? 'Flèche longue' : 'Flèche courte') + ' vers ' + RS_DIRS[id % 8]; }
  function rsPick(n, rnd) { // n flèches différentes parmi 16 (aucune flèche répétée dans un essai)
    var a = [];
    for (var i = 0; i < 16; i++) a.push(i);
    return ssShuffle(a, rnd).slice(0, n);
  }
  // cp : bon sens, bonne taille, bon ordre ; ap : retrouvée n'importe où ; dp : bon sens dans le bon ordre, taille ignorée (cp compris).
  // Numéros 0 à 7 = flèches longues, 8 à 15 = courtes, même sens si numéro % 8 égal : deux numéros différents de même sens ne diffèrent que par la taille.
  function rsScoreTrial(arrows, sel) {
    var cp = 0, ap = 0, dp = 0, marks = [];
    for (var j = 0; j < arrows.length; j++) {
      if (sel[j] === arrows[j]) { cp++; ap++; dp++; marks.push('cp'); }
      else {
        if (sel[j] !== undefined && sel[j] % 8 === arrows[j] % 8) dp++;
        if (sel.indexOf(arrows[j]) >= 0) { ap++; marks.push('ap'); }
        else marks.push('no');
      }
    }
    return { cp: cp, ap: ap, dp: dp, marks: marks };
  }
  function rsSummary(trials) {
    var cp = 0, ap = 0, dp = 0, max = 0, lc = 0, lt = 0, to = 0, sum = 0, an = 0, marks = [];
    trials.forEach(function (t) {
      var sc = rsScoreTrial(t.a, t.s);
      cp += sc.cp; ap += sc.ap; dp += sc.dp; max += t.a.length; marks.push(sc.marks);
      t.l.forEach(function (l) { lt++; if (l[0] === 1) lc++; if (l[0] === 2) to++; else { sum += l[1]; an++; } });
    });
    return { cp: cp, ap: ap, dp: dp, dl: dp - cp, max: max, lc: lc, lt: lt, to: to, avgRt: an ? Math.round(sum / an * 10) / 10 : null, marks: marks };
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

  // Memory List. Un mot de la reconnaissance (stocké) = [mot, dans la liste 1 | nouveau 0, réponse oui 1 | non 0, ms]. Les mots sont gardés avec le passage
  // (si un mot de la banque est remplacé un jour, les anciens passages gardent les leurs).
  function mlList(no) { // liste n° no (1 à 98) : 12 mots à retenir, 12 mots nouveaux
    var p = ML_BANK[no - 1].split('|');
    return { targets: p[0].split(' '), foils: p[1].split(' ') };
  }
  var ML_SEEN = (function () { // pour chaque liste : combien de ses mots figuraient déjà dans une liste précédente (0 pour les 68 premières)
    var seen = {}, out = [0];
    ML_BANK.forEach(function (s) {
      var ws = s.replace('|', ' ').split(' '), n = 0;
      ws.forEach(function (w) { if (seen[w]) n++; });
      ws.forEach(function (w) { seen[w] = true; });
      out.push(n);
    });
    return out;
  })();
  function mlMake(targets, foils, rnd) { // reconnaissance : les 24 mots mélangés, jamais plus de 3 mots du même type (liste / nouveau) d'affilée (boucle bornée)
    var all = targets.map(function (w) { return { word: w, target: true }; }).concat(foils.map(function (w) { return { word: w, target: false }; }));
    for (var attempt = 0; attempt < 500; attempt++) {
      var s = ssShuffle(all.slice(), rnd), ok = true;
      for (var i = 3; i < s.length; i++) {
        if (s[i].target === s[i - 1].target && s[i].target === s[i - 2].target && s[i].target === s[i - 3].target) { ok = false; break; }
      }
      if (ok) return s;
    }
    var t = ssShuffle(targets.slice(), rnd), f = ssShuffle(foils.slice(), rnd), out = [];
    for (var j = 0; j < Math.max(t.length, f.length); j++) {
      var pair = [];
      if (j < t.length) pair.push({ word: t[j], target: true });
      if (j < f.length) pair.push({ word: f[j], target: false });
      out.push.apply(out, rnd() < 0.5 ? pair : pair.reverse());
    }
    return out;
  }
  function mlExpand(list) {
    return list.map(function (t) { return { word: t[0], target: t[1] === 1, resp: t[2] === 1 ? 'Y' : 'N', rt: t[3], ok: t[1] === t[2] }; });
  }
  function mlCompact(t) { return [t.word, t.target ? 1 : 0, t.resp === 'Y' ? 1 : 0, Math.min(999999, Math.round(t.rt))]; }
  function mlScore(list) { // score de la source : mots de la liste reconnus (oui) + mots nouveaux refusés (non), de 0 à 24
    var tr = mlExpand(list), hits = 0, cr = 0, nT = 0, nD = 0, rts = [];
    tr.forEach(function (t) {
      rts.push(t.rt);
      if (t.target) { nT++; if (t.resp === 'Y') hits++; } else { nD++; if (t.resp === 'N') cr++; }
    });
    return { n: tr.length, nT: nT, nD: nD, hits: hits, misses: nT - hits, cr: cr, fa: nD - cr, score: hits + cr, medRt: ssMedian(rts) };
  }
  var ML_SHAPES = ['circle', 'square', 'triangle', 'plus'];
  function mlOddMake(rnd) { // tâche intercalaire : quatre formes, trois pareilles et une différente (sa place : 0 à 3)
    var base = ML_SHAPES[Math.floor(rnd() * ML_SHAPES.length)];
    var others = ML_SHAPES.filter(function (s) { return s !== base; });
    return { base: base, odd: others[Math.floor(rnd() * others.length)], pos: Math.floor(rnd() * 4) };
  }
  function mlShapeSvg(name) {
    var body = {
      circle: '<circle cx="50" cy="50" r="38" fill="currentColor"/>',
      square: '<rect x="14" y="14" width="72" height="72" rx="3" fill="currentColor"/>',
      triangle: '<polygon points="50,10 92,86 8,86" fill="currentColor"/>',
      plus: '<path d="M40 10h20v30h30v20H60v30H40V60H10V40h30z" fill="currentColor"/>'
    }[name];
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  /* ---------- Plan des tests : logique pure ---------- */
  // Reprise de `Annexe-plan-logique` (14/10, conversation « Tests cognitifs »), vérifiée là-bas par 4 506 contrôles. Ne pas modifier sans le dire :
  // le calendrier (7 plans, ordre des semaines, ordre des tests) doit rester le même que dans les maquettes. Seuls l'enveloppe et l'export sont ajoutés.
  // e4d (19/11/2026, décidé avec l'utilisateur) : plus de test après R+8h. Les jours depuis le 21/11/2026 suivent le plan à 5 moments (TEST_R, PLANS, PVT2, SLOTS) ;
  // les jours avant gardent le plan à 7 moments d'origine, inchangé (TEST_R7, PLANS7, PVT27, SLOTS7), pour que « Plan des tests » ne réécrive pas les jours déjà passés.
  var PL = (function () {
/* pure:start */
const DUR = { RS: 90, FL: 110, HS: 60, ML: 120, SS: 45 };   // secondes, estimées d'après les maquettes (À ajuster)
const PVT = 180;                                             // PVT-B : 3 min
const NAMES = { RS: 'Rotation span', FL: 'Flanker', HS: 'Hand Swype', ML: 'Memory List', SS: 'Symbol Search' };
const NDAYS = 98;                                            // 14 semaines
const FROM5 = '2026-11-21';                                  // premier jour du plan à 5 moments (les jours avant : plan à 7 moments)
// Plan à 5 moments (depuis le 21/11/2026). Rotation validée par l'utilisateur le 19/11 : mêmes règles que le plan à 7 moments (Memory List une fois par jour, jamais avec Flanker,
// jamais le même test à 1 h d'écart, 3 ou 4 passages par test et par moment sur 7 jours) ; seules les journées 2 et 7 changent par rapport aux 5 premières colonnes de l'ancien plan.
const TEST_R = [2, 3, 4, 5, 8];                              // R+X des 5 moments de test
const PLANS = [[["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["RS", "ML"], ["RS", "HS"]], [["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["HS", "SS"], ["ML", "SS"]], [["RS", "HS"], ["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["HS", "ML"]], [["HS", "ML"], ["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["FL", "SS"]], [["RS", "HS"], ["FL", "SS"], ["HS", "ML"], ["FL", "SS"], ["RS", "SS"]], [["FL", "SS"], ["HS", "ML"], ["RS", "FL"], ["HS", "SS"], ["RS", "FL"]], [["ML", "SS"], ["RS", "HS"], ["FL", "SS"], ["RS", "HS"], ["FL", "HS"]]];
// Étape 2 du PVT-B : en plus de R+2h, 2 moments (index dans TEST_R) qui tournent selon le plan (jamais deux moments à 1 h d'écart)
const PVT2 = [[1, 3], [1, 3], [1, 3], [2, 4], [2, 4], [3, 4], [2, 4]];
// Les 13 moments de la journée : relevé seul, test, ou test + relevé (R+10h et R+11h : relevé seul depuis le 21/11/2026)
const SLOTS = [
  { r: 0.5, kind: 'rel' },
  { r: 2, kind: 'test', ti: 0 }, { r: 3, kind: 'test', ti: 1 }, { r: 4, kind: 'test', ti: 2 }, { r: 5, kind: 'test', ti: 3 },
  { r: 6, kind: 'rel' }, { r: 7, kind: 'rel' },
  { r: 8, kind: 'testrel', ti: 4 }, { r: 9, kind: 'rel' },
  { r: 10, kind: 'rel' }, { r: 11, kind: 'rel' },
  { r: 12, kind: 'rel' }, { r: 13, kind: 'rel' }
];
// Plan à 7 moments d'origine (plan codé du 11/10 ; calendrier vérifié par calcul le 14/10), jusqu'au 20/11/2026 : NE PAS MODIFIER
const TEST_R7 = [2, 3, 4, 5, 8, 10, 11];
const PLANS7 = [[["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["RS", "ML"], ["RS", "HS"], ["RS", "HS"], ["FL", "SS"]], [["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["HS", "SS"], ["FL", "SS"], ["RS", "ML"], ["FL", "SS"]], [["RS", "HS"], ["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["HS", "ML"], ["FL", "SS"], ["RS", "HS"]], [["HS", "ML"], ["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["FL", "SS"], ["FL", "SS"], ["RS", "HS"]], [["RS", "HS"], ["FL", "SS"], ["HS", "ML"], ["FL", "SS"], ["RS", "SS"], ["FL", "HS"], ["RS", "SS"]], [["FL", "SS"], ["HS", "ML"], ["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["RS", "HS"], ["FL", "SS"]], [["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["RS", "HS"], ["FL", "HS"], ["FL", "SS"], ["HS", "ML"]]];
const PVT27 = [[1, 4], [2, 5], [3, 6], [1, 5], [2, 6], [3, 4], [2, 4]];
const SLOTS7 = [
  { r: 0.5, kind: 'rel' },
  { r: 2, kind: 'test', ti: 0 }, { r: 3, kind: 'test', ti: 1 }, { r: 4, kind: 'test', ti: 2 }, { r: 5, kind: 'test', ti: 3 },
  { r: 6, kind: 'rel' }, { r: 7, kind: 'rel' },
  { r: 8, kind: 'testrel', ti: 4 }, { r: 9, kind: 'rel' },
  { r: 10, kind: 'testrel', ti: 5 }, { r: 11, kind: 'testrel', ti: 6 },
  { r: 12, kind: 'rel' }, { r: 13, kind: 'rel' }
];
// Quel calendrier un jour suit-il ? `key` = date ISO du jour du plan (null : aperçu sans premier jour choisi → plan actuel). Les dates ISO se comparent comme du texte.
function ver(key) { return key && key < FROM5 ? 7 : 5; }
function tbl(v) { return v === 7 ? { TEST_R: TEST_R7, PLANS: PLANS7, PVT2: PVT27, SLOTS: SLOTS7 } : { TEST_R: TEST_R, PLANS: PLANS, PVT2: PVT2, SLOTS: SLOTS }; }

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtDur(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return m + ' min ' + pad2(s) + ' s';
}
function fmtMin(sec) { return Math.round(sec / 60) + ' min'; }
function fmtR(r) {
  const h = Math.floor(r), m = Math.round((r - h) * 60);
  return 'R+' + h + 'h' + (m ? pad2(m) : '');
}
function clockStr(wakeMin, r) {
  const t = Math.round(wakeMin + r * 60) % 1440;
  return pad2(Math.floor(t / 60)) + ':' + pad2(t % 60);
}
function parseHM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  if (!m) return null;
  const h = +m[1], mi = +m[2];
  return h < 24 && mi < 60 ? h * 60 + mi : null;
}
// Moments (index dans TEST_R) où le PVT-B est passé, selon le plan et l'étape (1, 2 ou 3)
// (`v` : 7 pour un jour avant le 21/11/2026, sinon 5 ; voir `ver`)
function pvtMoments(plan, stage, v) {
  const t = tbl(v);
  if (stage === 1) return t.TEST_R.map((_, i) => i);
  if (stage === 2) return [0].concat(t.PVT2[plan]);
  return [0];
}
function momentSec(plan, ti, stage, v) {
  const tests = tbl(v).PLANS[plan][ti].reduce((a, t) => a + DUR[t], 0);
  return tests + (pvtMoments(plan, stage, v).indexOf(ti) >= 0 ? PVT : 0);
}
function daySec(plan, stage, v) {
  let s = 0;
  const n = tbl(v).TEST_R.length;
  for (let ti = 0; ti < n; ti++) s += momentSec(plan, ti, stage, v);
  return s;
}
function avgDaySec(stage, v) {
  let s = 0;
  for (let p = 0; p < 7; p++) s += daySec(p, stage, v);
  return s / 7;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Ordre des 7 plans pour une semaine : chaque plan une fois, mélangé de façon reproductible
function weekOrder(seed, week) {
  const rnd = mulberry32(seed * 100003 + week * 7919 + 12345);
  const a = [0, 1, 2, 3, 4, 5, 6];
  for (let i = 6; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function planForDay(i, seed) { return weekOrder(seed, Math.floor(i / 7))[i % 7]; }
// Ordre des 2 tests dans un moment : tiré au hasard (reproductible), le PVT-B reste toujours en premier
function testOrder(i, ti, plan, seed, v) {
  const pair = tbl(v).PLANS[plan][ti];
  const flip = mulberry32(seed * 7919 + i * 131 + ti * 17 + 99)() < 0.5;
  return flip ? [pair[1], pair[0]] : [pair[0], pair[1]];
}
function weekOf(i) { return Math.floor(i / 7) + 1; }
function isRodage(i) { return weekOf(i) <= 2; }
function parseISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
}
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
function daysBetween(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function isoOf(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
function milestone(w) {
  if (w === 2) return ['Fin du rodage', 'les passages sont gardés, étiquetés « rodage »'];
  if (w === 4) return ['Revue du PVT-B', 'varie-t-il d\'une heure à l\'autre plus que d\'un jour à l\'autre ? Étape 2 ou 3 selon les résultats'];
  if (w === 6) return ['Premier point d\'étape', '4 semaines comptées, pour information'];
  if (w === 10) return ['Second point d\'étape', '8 semaines comptées, pour information'];
  if (w === 14) return ['Fin du recueil', '12 semaines comptées : les fenêtres'];
  return null;
}
/* pure:end */
    return { DUR: DUR, PVT: PVT, NAMES: NAMES, TEST_R: TEST_R, PLANS: PLANS, PVT2: PVT2, NDAYS: NDAYS, SLOTS: SLOTS, TEST_R7: TEST_R7, PLANS7: PLANS7, PVT27: PVT27, SLOTS7: SLOTS7, FROM5: FROM5, ver: ver, tbl: tbl, fmtDur: fmtDur, fmtMin: fmtMin, fmtR: fmtR, clockStr: clockStr,
             parseHM: parseHM, pvtMoments: pvtMoments, momentSec: momentSec, daySec: daySec, avgDaySec: avgDaySec, mulberry32: mulberry32, weekOrder: weekOrder,
             planForDay: planForDay, testOrder: testOrder, weekOf: weekOf, isRodage: isRodage, parseISO: parseISO, addDays: addDays, daysBetween: daysBetween,
             isoOf: isoOf, milestone: milestone };
  })();

  /* ---------- Données ---------- */
  var entries = [], storageOk = true, lastBackup = null, actNames = ACTS_DEFAULT.slice(), instNames = INST_DEFAULT.slice(), noteTypeNames = [], todos = [];
  var KINDS = ['releve', 'test', 'note', 'activite', 'creux', 'creuxq', 'repas', 'coucher', 'pas', 'instant', 'nuit'];

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
    loadMantra();
    try {
      var a = JSON.parse(localStorage.getItem(KEY_ACTS));
      if (Array.isArray(a)) actNames = cleanNames(a);
    } catch (e) {}
    try { // jamais enregistrée : la liste de départ ; enregistrée vide : elle reste vide (tu l'as vidée)
      var ai = JSON.parse(localStorage.getItem(KEY_INST));
      if (Array.isArray(ai)) instNames = cleanNames(ai);
    } catch (e) {}
    try { // types de note créés dans Réglages (depuis le 08/11) : vide au départ
      var nt = JSON.parse(localStorage.getItem(KEY_NT));
      if (Array.isArray(nt)) noteTypeNames = cleanTypeNames(nt);
    } catch (e) {}
    try { // délai de la bannière de sauvegarde (depuis le 09/11) : 4 h tant que rien n'est choisi ; 0 = jamais
      var bh = localStorage.getItem(KEY_BKH);
      if (bh !== null && /^\d+$/.test(bh) && BK_HOURS.indexOf(Number(bh)) >= 0) bkHours = Number(bh);
    } catch (e) {}
    try { // to-do (depuis le 09/11) : liste à part, vide au départ ; illisible → copie de côté, jamais écrasée sans trace
      var rawT = localStorage.getItem(KEY_TD);
      if (rawT) {
        try { todos = cleanTodos(JSON.parse(rawT)); }
        catch (e2) { try { localStorage.setItem(KEY_TD + '.corrupt', rawT); } catch (e3) {} }
      }
    } catch (e) {}
    var chA = normalizeActs(), cutR = creuxSweep(), tdMoved = 0, tdFlag = null;
    if (cutR) cutMsg = creuxCutText(cutR);
    try { tdFlag = localStorage.getItem(KEY_TDM); } catch (e) {}
    if (todos.length && tdFlag !== '1') tdMoved = moveTodos(todos); // les to-do de l'ancien onglet deviennent des notes (une seule fois)
    var saved0 = true;
    if (chA || cutR || tdMoved) saved0 = persist();
    if (todos.length && tdFlag !== '1' && saved0 && storageOk) { try { localStorage.setItem(KEY_TDM, '1'); } catch (e) {} }
    if (tdMoved) cutMsg = (cutMsg ? cutMsg + ' ' : '') + plural(tdMoved, 'to-do reprise', 'to-do reprises') + ' comme notes de catégorie To-do (Reflet → Notes → To-do). L’onglet To-do n’existe plus.';
    todos = [];
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 2, entries: entries })); storageOk = true; } catch (e) { storageOk = false; }
    // Demande (sans fenêtre) que le navigateur ne supprime pas ces données si l'appareil manque d'espace.
    if (storageOk && navigator.storage && navigator.storage.persist) { try { navigator.storage.persist().catch(function () {}); } catch (e) {} }
    return storageOk;
  }
  function saveActNames() { try { localStorage.setItem(KEY_ACTS, JSON.stringify(actNames)); } catch (e) {} }
  function saveInstNames() { try { localStorage.setItem(KEY_INST, JSON.stringify(instNames)); } catch (e) {} }
  function saveNoteTypeNames() { try { localStorage.setItem(KEY_NT, JSON.stringify(noteTypeNames)); } catch (e) {} }
  /* To-do (onglet du bas, du 09/11 au 19/11) : { id, ts (création), text (chose à faire), detail (détail de l'analyse, facultatif), done: true + doneTs (faite le …) }.
     Depuis le 19/11 l'onglet n'existe plus : To-do est une catégorie de note. Les to-do déjà saisies (clé luna.todos, ou champ `todos` d'un fichier de sauvegarde d'avant) sont reprises UNE FOIS comme notes de catégorie To-do
     (moveTodos) ; la clé luna.todos n'est jamais effacée ni réécrite (filet de sécurité : une ancienne version la relit). `luna.todosMoved` = « déjà reprises ». */
  var KEY_TD = 'luna.todos', KEY_TDM = 'luna.todosMoved', TD_TEXT = 300, TD_DETAIL = 5000, TD_MAX = 2000;
  function cleanTodo(o) {
    if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !o.id || o.id.length > 80) return null;
    if (typeof o.ts !== 'number' || !isFinite(o.ts) || o.ts <= 0 || o.ts >= 4e12) return null;
    var text = typeof o.text === 'string' ? o.text.trim().slice(0, TD_TEXT) : '';
    if (!text) return null;
    var t = { id: o.id, ts: o.ts, text: text };
    var d = typeof o.detail === 'string' ? o.detail.trim().slice(0, TD_DETAIL) : '';
    if (d) t.detail = d;
    if (o.done === true) { t.done = true; if (typeof o.doneTs === 'number' && isFinite(o.doneTs) && o.doneTs > o.ts && o.doneTs < 4e12) t.doneTs = o.doneTs; }
    return t;
  }
  function cleanTodos(a) {
    var seen = {}, out = [];
    (Array.isArray(a) ? a : []).forEach(function (x) { var t = cleanTodo(x); if (t && !seen[t.id]) { seen[t.id] = true; out.push(t); } });
    return out.sort(byTs).slice(0, TD_MAX);
  }
  function tdNoteId(t) { return ('td-' + t.id).slice(0, 40); } // identifiant stable : reprendre deux fois la même to-do ne fait jamais deux notes
  // Reprend des to-do comme notes de catégorie To-do : le texte = la chose à faire (+ « Détail de l'analyse »), la date de création est gardée, « faite » devient une note rattachée « Mise en place : Fait le … ».
  // Renvoie le nombre de notes ajoutées (celles dont l'identifiant existe déjà sont sautées).
  function moveTodos(list) {
    var have = {}, add = 0;
    entries.forEach(function (e) { have[e.id] = true; });
    list.forEach(function (t) {
      var id = tdNoteId(t);
      if (have[id]) return;
      var e = baseEntry('note', t.ts, L.getWake());
      e.id = id;
      e.text = (t.text + (t.detail ? '\n\nDétail de l’analyse : ' + t.detail : '')).slice(0, 5000);
      e.ntype = 'todo';
      if (t.done) { e.att = 'Fait' + (t.doneTs ? ' le ' + whenText(t.doneTs) : ''); if (t.doneTs && t.doneTs > t.ts) e.attTs = t.doneTs; }
      entries.push(e); have[id] = true; add++;
    });
    entries.sort(byTs);
    return add;
  }
  // Liste de motifs (activités, instants) : textes de 40 caractères au plus, sans doublon (majuscules ignorées), 30 au plus.
  function cleanNames(a) {
    var out = [];
    (Array.isArray(a) ? a : []).forEach(function (x) {
      if (typeof x !== 'string') return;
      var n = x.trim(), low = n.toLowerCase();
      if (!n || n.length > 40 || out.some(function (y) { return y.toLowerCase() === low; })) return;
      out.push(n);
    });
    return out.slice(0, 30);
  }
  // Ajoute un motif à une liste. Renvoie 'ok', 'doublon' ou 'pleine'.
  function addToList(list, name) {
    var low = name.toLowerCase();
    if (list.some(function (n) { return n.toLowerCase() === low; })) return 'doublon';
    if (list.length >= 30) return 'pleine';
    list.push(name);
    return 'ok';
  }
  /* Bannière « Dernière sauvegarde il y a N h » (depuis le 09/11) : Roue et Journal. Apparaît si la dernière sauvegarde est plus vieille que le délai (4 h au départ, réglable dans Réglages)
     ET qu'il y a du nouveau depuis (une entrée, une réponse, une to-do notée ou cochée) ; ou si aucune sauvegarde n'a jamais été faite ici alors qu'il y a des données.
     « Plus tard » la cache 1 h, en mémoire seulement. Une sauvegarde reste un geste de l'utilisateur : la bannière ouvre l'écran Sauvegarde. */
  var KEY_BKH = 'luna.bkHours', BK_HOURS = [2, 4, 6, 8, 12, 0], bkHours = 4, bkSnooze = 0;
  function bkNewSince(t) {
    function newer(x) { return typeof x === 'number' && isFinite(x) && x > t; }
    return entries.some(function (e) { return newer(e.ts) || newer(e.end) || newer(e.modTs) || newer(e.ansTs) || newer(e.attTs) || newer(e.catTs) || newer(e.valTs); }) ||
           todos.some(function (d) { return newer(d.ts) || newer(d.doneTs); });
  }
  function agoText(ms) {
    var m = Math.floor(ms / 60000), A = ' ';
    if (m < 60) return 'il' + A + 'y' + A + 'a' + A + Math.max(1, m) + A + 'min';
    var h = Math.floor(m / 60);
    return 'il' + A + 'y' + A + 'a' + A + (h < 48 ? h + A + 'h' : Math.floor(h / 24) + A + 'j');
  }
  function bkInfo() {
    var now = Date.now();
    if (!bkHours || now < bkSnooze || (!entries.length && !todos.length)) return null;
    if (!lastBackup) return { title: 'Aucune sauvegarde faite sur cet appareil', never: true };
    if (lastBackup > now || now - lastBackup < bkHours * 3600e3 || !bkNewSince(lastBackup)) return null;
    return { title: 'Dernière sauvegarde ' + agoText(now - lastBackup) };
  }
  function bkCard(info) {
    if (!info) return '';
    return '<div class="banner bk" role="status"><div class="txt"><b>' + esc(info.title) + '</b>' +
      '<button type="button" class="k-go" data-act="bk-go">Sauvegarder maintenant ›</button></div>' +
      '<button type="button" class="k-x" data-act="bk-later" aria-label="Masquer ce rappel pendant 1 heure">×</button></div>';
  }
  function saveBkHours() { try { localStorage.setItem(KEY_BKH, String(bkHours)); } catch (e) {} }
  function markBackup() {
    lastBackup = Date.now();
    try { localStorage.setItem(KEY_BK, String(lastBackup)); } catch (e) {}
    updateAlert();
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

  /* Creux (depuis le 09/11, f1) : un seul creux « en cours » à la fois. « Pas encore » repousse la question d'1 h, en mémoire seulement. */
  var creuxSnooze = {};
  function currentCreux() {
    var best = null;
    entries.forEach(function (e) { if (e.kind === 'creux' && e.end == null && (!best || e.ts > best.ts)) best = e; });
    return best;
  }
  function creuxById(id) { return entries.filter(function (e) { return e.kind === 'creux' && e.id === id; })[0]; }
  function creuxAsk(c) { var n = Date.now(); return !!c && (n - c.ts >= CREUX_MIN * 60000 || creuxQMoment(c) >= 0) && n >= (creuxSnooze[c.id] || 0); }
  // Deux creux ne se chevauchent pas (une fin à l'heure exacte d'un début est permise). `end` = null : creux ouvert.
  function creuxOverlap(ts, end, id) {
    var inf = 1e15, a1 = end == null ? inf : end;
    return entries.filter(function (c) {
      return c.kind === 'creux' && c.id !== id && ts < (c.end == null ? inf : c.end) && c.ts < a1;
    })[0] || null;
  }
  // B (09/11, f2c) : un creux signalé librement dont le DÉBUT tombe dans la fenêtre (−10 / +30 min) d'une question du creux compte comme « oui » à cette question
  // (la question disparaît). Renvoie le numéro du moment, ou -1. Calculé à la volée : si le creux est modifié ou supprimé, la question revient.
  function freeSlotAt(ts, wake) {
    var rel = relAt(ts, wake), out = -1;
    PLAN.forEach(function (m, i) { if (isQ(m) && rel >= m.r - WIN.before && rel <= m.r + WIN.after) out = i; });
    return out;
  }
  function creuxFreeSlot(c) { return (!c || c.kind !== 'creux' || c.origin === 'question') ? -1 : freeSlotAt(c.ts, c.wake); }
  function creuxOriginTxt(c) {
    if (c.origin !== 'question') { var fs = creuxFreeSlot(c); return 'signalement libre' + (fs >= 0 ? ', compté comme « oui » à la question de ' + rLabel(PLAN[fs].r) : ''); }
    var m = c.slot != null ? PLAN[c.slot] : null;
    return m ? 'réponse « oui » à la question de ' + rLabel(m.r) + (qLate(c) ? ' (réponse tardive)' : '') : 'réponse « oui » à la question du moment prévu';
  }
  // Un creux ouvert depuis 4 h est coupé tout seul (fin = début + 4 h, marquée `endAuto`). Un creux resté ouvert quand un autre commence est coupé au début du suivant.
  // Renvoie le dernier creux coupé (ou null) ; l'appelant enregistre.
  function creuxSweep() {
    var cs = entries.filter(function (e) { return e.kind === 'creux'; }).sort(byTs), now = Date.now(), cut = null;
    cs.forEach(function (c, i) {
      if (c.end != null) return;
      var end = Math.min(c.ts + CREUX_MAX, cs[i + 1] ? cs[i + 1].ts : Infinity);
      if (end <= now) { c.end = end; c.endAuto = true; cut = c; }
    });
    return cut;
  }
  var cutMsg = ''; // « Creux de 14h10 terminé automatiquement… » : montré sur l'écran Journal jusqu'à la prochaine action
  // F2 : la question du creux (depuis e4b : R+5h et R+6h). Heure prévue d'un moment = début du jour du Journal + réveil + R+.
  function plannedTs(tk, wake, r) { var p = tk.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 0, wake + r, 0).getTime(); }
  function creuxAt(ts) { // un creux ouvert (ou déjà terminé) à cet instant ?
    return entries.filter(function (c) { return c.kind === 'creux' && c.ts < ts && (c.end == null || c.end > ts); })[0] || null; // « déjà » ouvert : commencé avant l'heure prévue
  }
  function qLate(e) { // réponse donnée hors de la fenêtre du moment (−10 / +30 min) : gardée avec son heure réelle, mais ce n'est pas « la réponse à R+6h »
    var m = e.slot != null ? PLAN[e.slot] : null, at = e.kind === 'creux' ? (e.ansTs || e.ts) : e.ts;
    if (!m) return false;
    var rel = relAt(at, e.wake);
    return !(rel >= m.r - WIN.before && rel <= m.r + WIN.after);
  }
  function creuxQMoment(c) { // numéro du moment « question » dont la fenêtre est ouverte alors que ce creux était déjà ouvert à l'heure prévue (sinon -1)
    var now = Date.now(), wake = L.getWake(), tk = dayKey(now, wake), out = -1;
    PLAN.forEach(function (m, i) {
      if (!isQ(m)) return;
      var P = plannedTs(tk, wake, m.r);
      if (c.ts < P && now >= P - WIN.before * 60000 && now <= P + WIN.after * 60000) out = i;
    });
    return out;
  }
  var qDraft = {}; // note libre en cours de frappe dans la carte de la question (en mémoire)
  function creuxCutText(c) { return 'Creux de ' + clockOf(c.ts) + ' terminé automatiquement à ' + clockOf(c.end) + (c.end - c.ts >= CREUX_MAX ? ' (4 h au maximum).' : '.'); }

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
    // (f3) « pas de mesure » (med null) reste null : avant, isFinite(null) le changeait en 0 à la restauration
    return { ver: ver, cfg: typeof s.cfg === 'string' ? s.cfg.slice(0, 80) : '', n: n, correct: c, used: u, excluded: x,
             med: med !== null && isFinite(med) && med >= 0 ? Math.round(med * 10) / 10 : null, durationMs: int(s.durationMs, 0, 1e7) || 0, trials: tr };
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
  // Memory List : la liste utilisée, ses mots de reconnaissance (mot, type, réponse, ms) et la tâche intercalaire ; tous les chiffres sont recalculés à partir des mots.
  function cleanMl(s) {
    s = s && typeof s === 'object' ? s : {};
    var ver = int(s.ver, 1, 99), no = int(s.listNo, 1, 9999), seen = int(s.seen, 0, 200);
    if (ver === null || no === null || seen === null || !Array.isArray(s.items) || s.items.length < 1 || s.items.length > 60) return null;
    var items = [];
    for (var i = 0; i < s.items.length; i++) {
      var t = s.items[i];
      if (!Array.isArray(t) || t.length !== 4 || typeof t[0] !== 'string') return null;
      var w = t[0].trim().slice(0, 30), tg = int(t[1], 0, 1), r = int(t[2], 0, 1), rt = Number(t[3]);
      if (!w || tg === null || r === null || !isFinite(rt) || rt < 0 || rt >= 1e6) return null;
      items.push([w, tg, r, Math.round(rt)]);
    }
    var od = s.odd && typeof s.odd === 'object' ? s.odd : {}, on = int(od.n, 0, 100000), ok = int(od.ok, 0, 100000);
    if (on === null || ok === null || ok > on) return null;
    var sc = mlScore(items);
    return { ver: ver, cfg: typeof s.cfg === 'string' ? s.cfg.slice(0, 80) : '', listNo: no, seen: seen, reprise: !!s.reprise, odd: { n: on, ok: ok },
             n: sc.n, score: sc.score, hits: sc.hits, fa: sc.fa, medRt: round1(sc.medRt), durationMs: int(s.durationMs, 0, 1e7) || 0, items: items };
  }
  // Étiquettes d'un passage du plan (morceau 4b) : d = jour du plan (0 = premier jour), p = plan de journée (0 à 6), st = étape du PVT-B,
  // k = rang d'enregistrement du passage dans le moment (1 = premier), n = nombre de passages prévus dans le moment. Illisible : ignoré, l'entrée reste lisible.
  function cleanPj(p) {
    if (!p || typeof p !== 'object') return null;
    var d = int(p.d, 0, 999), pl = int(p.p, 0, 6), st = int(p.st, 1, 3);
    if (d === null || pl === null || st === null) return null;
    var o = { d: d, p: pl, st: st }, k = int(p.k, 1, 3), n = int(p.n, 1, 3);
    if (k !== null && n !== null) { o.k = k; o.n = n; }
    return o;
  }
  var CL = { ss: cleanSs, rs: cleanRs, hs: cleanHs, fl: cleanFl, ml: cleanMl }; // un validateur par test enregistré
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
      if (k === 'note' && e.modTs != null) { // date de dernière modification (depuis le 08/11) : gardée si elle est lisible et après la création
        var mt = Number(e.modTs);
        if (isFinite(mt) && mt > ts && mt < 4e12) o.modTs = mt;
      }
      if (k === 'note' && typeof e.ntype === 'string' && noteTypeOf(e.ntype).id) { // catégorie de note (depuis le 08/11) : gardée si elle est connue ; sous-catégorie (depuis le 19/11) : seulement avec une catégorie
        o.ntype = noteTypeOf(e.ntype).id;
        var nsb = subClean(e.nsub);
        if (nsb) o.nsub = nsb;
      }
      if (k === 'note' && o.ntype !== undefined || (k === 'note' && e.catTs != null)) { // heure du dernier classement (depuis le 19/11) : sert seulement à dire « du nouveau depuis la dernière sauvegarde »
        var ct0 = Number(e.catTs);
        if (e.catTs != null && isFinite(ct0) && ct0 > ts && ct0 < 4e12) o.catTs = ct0;
      }
      if (k === 'note' && typeof e.from === 'string' && e.from && e.from.length <= 40 && e.from !== e.id) o.from = e.from; // note d'origine (depuis le 19/11, e2) : l'identifiant seul ; la note d'origine peut arriver plus tard (autre fichier) ou ne plus exister
      if (k === 'note' && typeof e.att === 'string' && e.att.trim()) { // note rattachée (depuis le 19/11) : gardée ; son heure l'est si elle est lisible et après la création
        o.att = e.att.slice(0, 5000);
        var att0 = Number(e.attTs);
        if (e.attTs != null && isFinite(att0) && att0 > ts && att0 < 4e12) o.attTs = att0;
      }
      if (k === 'note' && e.valTs != null) { // validation (e5c) : gardée si son heure est lisible et après la création
        var vt = Number(e.valTs);
        if (isFinite(vt) && vt > ts && vt < 4e12) o.valTs = vt;
      }
      if (k === 'note' && typeof e.ans === 'string' && e.ans.trim()) { // réponse à un questionnement (c2a3) : gardée ; son heure l'est si elle est lisible et après la création
        o.ans = e.ans.slice(0, 5000);
        var at = Number(e.ansTs);
        if (e.ansTs != null && isFinite(at) && at > ts && at < 4e12) o.ansTs = at;
      }
      return o;
    }
    if (k === 'pas') { // « Pas ce moment » : un moment du plan laissé de côté, avec un mot facultatif
      o.slot = int(e.slot, 0, PLAN.length - 1);
      if (o.slot === null) return null;
      var px = typeof e.text === 'string' ? e.text.trim().slice(0, 300) : '';
      if (px) o.text = px;
      var pj0 = cleanPj(e.pj);
      if (pj0) { delete pj0.k; delete pj0.n; o.pj = pj0; }
      return o;
    }
    if (k === 'coucher') {
      var wt = Number(e.wakeTs);
      if (e.wakeTs != null && isFinite(wt) && wt > ts && wt - ts < 20 * 3600e3) o.wakeTs = wt;
      if (e.memo) o.memo = true;
      return o;
    }
    if (k === 'nuit') { // « Ma nuit » (depuis e5, 20/11) : qualité du sommeil, reposé, souvenir des rêves (4 niveaux), texte libre ; tout est facultatif mais au moins une réponse
      var nsq = int(e.sq, 1, 5), nrs = int(e.rest, 1, 5), ndr = int(e.dream, 1, 4), ndt = typeof e.dtext === 'string' ? e.dtext.trim().slice(0, 1000) : '';
      if (nsq === null && nrs === null && ndr === null && !ndt) return null;
      if (nsq !== null) o.sq = nsq;
      if (nrs !== null) o.rest = nrs;
      if (ndr !== null) o.dream = ndr;
      if (ndt) o.dtext = ndt;
      return o;
    }
    if (k === 'instant') { // un seul moment, sans fin : seul le nom et l'heure comptent
      var iname = typeof e.name === 'string' ? e.name.trim().slice(0, 40) : '';
      if (!iname) return null;
      o.name = iname;
      if (isJoint(iname) && jtypeOk(e.jtype)) o.jtype = e.jtype; // type du joint (facultatif), seulement sur un instant « Joint »
      return o;
    }
    if (k === 'creuxq') { // réponse « non » à la question du creux (F2) : le moment (R+6h / R+7h) et une note libre
      var qs2 = int(e.slot, 0, PLAN.length - 1);
      if (qs2 === null || !PLAN[qs2].q || e.ans !== 'non') return null;
      o.slot = qs2; o.ans = 'non';
      var qn = typeof e.note === 'string' ? e.note.trim().slice(0, 500) : '';
      if (qn) o.note = qn;
      return o;
    }
    if (k === 'creux') { // un creux (depuis le 09/11, f1) : un début, une fin déclarée « à peu près » (ou rien : en cours), l'origine et deux notes facultatives
      var ce = e.end == null ? null : Number(e.end);
      if (ce !== null && isFinite(ce) && ce >= ts) {
        if (ce > ts + CREUX_MAX) { o.end = ts + CREUX_MAX; o.endAuto = true; } // plus de 4 h : coupé à 4 h
        else { o.end = ce; if (e.endAuto === true) o.endAuto = true; }
      } else o.end = null;
      o.origin = e.origin === 'question' ? 'question' : 'libre';
      if (o.origin === 'question') { // réponse « oui » à la question de R+6h / R+7h (F2) : le moment et l'heure de la réponse
        var qsl = int(e.slot, 0, PLAN.length - 1), qat = Number(e.ansTs);
        if (qsl !== null && PLAN[qsl].q) { o.slot = qsl; if (isFinite(qat) && Math.abs(qat - ts) <= 12 * 3600e3) o.ansTs = qat; }
        else o.origin = 'libre';
      }
      var cn = typeof e.note === 'string' ? e.note.trim().slice(0, 500) : '', cen = typeof e.endNote === 'string' ? e.endNote.trim().slice(0, 500) : '';
      if (cn) o.note = cn;
      if (cen && o.end !== null) o.endNote = cen;
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
    if (k === 'test' && e.plan === 'creux') { // F3 : test de fin de creux (ni « prévu » ni « libre »), avec le creux qu'il marque
      o.slot = null; o.plan = 'creux';
      var fcid = typeof e.cid === 'string' ? e.cid.slice(0, 40) : '';
      if (fcid) o.cid = fcid;
    }
    if (k === 'releve' && Number(e.fv) === 3) { // depuis e5 : un relevé n'a que les questions de son moment (une seule à R+4h) ; au moins une réponse
      var f3 = cleanFeel(e.feel, feelIds(FEEL3), true);
      if (!f3) return null;
      o.feel = f3; o.fv = 3;
      var dt3 = typeof e.detail === 'string' ? e.detail.trim().slice(0, 500) : '';
      if (dt3) o.detail = dt3;
      return o;
    }
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
      if (o.plan === 'prevu') { var pjt = cleanPj(e.pj); if (pjt) o.pj = pjt; }
      return o;
    }
    var pv2 = cleanPvt(e.pvt); // test
    if (!pv2) return null;
    o.pvt = pv2;
    o.device = e.device === 'tel' ? 'tel' : 'ord';
    o.input = typeof e.input === 'string' ? e.input.slice(0, 12) : '';
    if (o.plan === 'prevu') { var pjp = cleanPj(e.pj); if (pjp) o.pj = pjp; }
    return o;
  }

  /* ---------- État de l'écran ---------- */
  var screen = 'home';
  var ret = 'home'; // e4c : écran où revient « Enregistrer » / « Annuler » d'un formulaire ouvert depuis l'Historique (« history »), sinon le Journal (« home »)
  var flow = newFlow();
  var form = null;          // formulaire en cours : activité, repas, coucher, modification
  var noteText = '', noteTs = 0, noteSel = { id: '', sub: '', other: false, txt: '' }, noteFrom = ''; // noteFrom : identifiant de la note d'origine quand on crée « à partir de… » (depuis le 19/11, e2)
  // Catégories de note (depuis le 19/11, évolution 1). Types de note : depuis le 08/11. Champ facultatif `ntype` (identifiants inchangés : questionnement, affirmation, todo, u:<nom>) ; '' = sans catégorie.
  // `nsub` = sous-catégorie (texte libre, 30 caractères au plus) : la liste d'une catégorie = celles de départ + celles que des notes portent déjà. `att` (+ `attTs`) = note rattachée : son nom dépend de la catégorie (attLabel).
  // Catégories et sous-catégories de départ : celles du classement manuel de l'utilisateur (« Feuille de route personnel », 19/11). Couleurs des pastilles : proposées par Claude ; encre foncée fixe pour garder le contraste en jour comme en nuit.
  var NS_LEN = 30, INK = '#2A2140';
  var NOTE_TYPES = [
    { id: '', name: 'Sans catégorie', bg: 'var(--p-not,var(--card))', ink: 'var(--p-ink,var(--text))', hint: 'Une note non classée : tu pourras la ranger plus tard (Reflet → Notes → Sans catégorie).' },
    { id: 'questionnement', name: 'Questionnement', bg: '#FFD6A8', ink: INK, hint: 'Une question que tu te poses sur toi ou sur la vie…', subs: ['Recherche', 'Perso', 'Perso (astre)'] },
    { id: 'affirmation', name: 'Affirmation', bg: '#C9F0F7', ink: INK, hint: 'Une phrase qui te décrit, ou que tu choisis de te dire.', subs: ['Personnelle', 'Constat personnel', 'Règle'] },
    { id: 'todo', name: 'To-do', bg: '#E4E0D4', ink: INK, hint: 'Une découverte sur toi à mettre en place, pas une corvée.', subs: ['Recherche internet', 'Vidéo', 'Personnel', 'Action', 'Action sur Kioo', 'Réflexion personnelle'] },
    { id: 'constat', name: 'Constat', bg: '#D8E6B8', ink: INK, hint: 'Ce que tu observes sur toi, sur ta journée, sur les autres.' },
    { id: 'idee', name: 'Idée', bg: '#FFF1B8', ink: INK, hint: 'Une idée à garder : un projet, une application, une histoire…' },
    { id: 'reflexion', name: 'Réflexion isolée', bg: '#F5D0E6', ink: INK, hint: 'Une réflexion qui se suffit à elle-même.' },
    { id: 'meditation', name: 'Méditation', bg: '#CBD5F4', ink: INK, hint: 'Ce que tu as vécu, visualisé ou ressenti en méditant.' },
    { id: 'scenario', name: 'Scénario', bg: '#E6CFF5', ink: INK, hint: 'Une idée d’histoire, de film, de scène.' },
    { id: 'trading', name: 'Trading', bg: '#BFE3D4', ink: INK, hint: 'Une note sur le trading.' },
    { id: 'kioo', name: 'Kioo', bg: '#F7C9C0', ink: INK, hint: 'Une idée ou une remarque sur l’appli Kioo Cycle.' },
    { id: 'az', name: 'A-Z', bg: '#D9D2C5', ink: INK, hint: 'Une note de ta liste A-Z.' },
    { id: 'synchro', name: 'Synchronicité', bg: '#F2E2A8', ink: INK, hint: 'Un signe, une coïncidence, une heure miroir. Tradition symbolique : une lecture personnelle, pas une mesure.', subs: ['Heure miroir'] },
    { id: 'diverse', name: 'Note diverse', bg: '#E3E3E3', ink: INK, hint: 'Une note qui ne va dans aucune autre catégorie.' }
  ];
  // Types libres (depuis le 08/11) : créés dans Réglages, un nom de 20 caractères au plus, 10 au plus, une seule couleur (lilas, proposée par Claude).
  // Une note garde `ntype: 'u:<nom>'` : son type reste lisible même si le type est retiré de la liste, renommé ou absent d'un autre appareil.
  // Depuis le 19/11 : un type libre qui porte le nom d'une catégorie de départ (« Constats », « idee »…) est cette catégorie, pas un doublon.
  var NT_LEN = 20, NT_MAX = 10, NT_CUSTOM = { bg: '#E0D4FF', ink: INK };
  function typeName(x) {
    var n = typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '';
    return n && n.length <= NT_LEN && !/[\u0000-\u001f\u007f]/.test(n) ? n : '';
  }
  function catKey(n) { // « Constats », « constat » et « Constat » sont la même catégorie ; les accents et le pluriel ne comptent pas
    var k = String(n).toLowerCase();
    try { k = k.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
    return k.replace(/[^a-z0-9]+/g, ' ').trim().replace(/s$/, '');
  }
  var CAT_ALIAS = { 'divers': 'diverse', 'note diverse': 'diverse', 'notes diverse': 'diverse', 'reflexion': 'reflexion', 'reflexion isolee': 'reflexion', 'todo': 'todo' };
  function builtinByName(n) {
    var k = catKey(n);
    k = CAT_ALIAS[k] || k;
    for (var i = 1; i < NOTE_TYPES.length; i++) if (NOTE_TYPES[i].id === k || catKey(NOTE_TYPES[i].name) === k) return NOTE_TYPES[i];
    return null;
  }
  function typeReserved(n) { return !!builtinByName(n); }
  function cleanTypeNames(a) {
    var out = [];
    (Array.isArray(a) ? a : []).forEach(function (x) {
      var n = typeName(x), low = n.toLowerCase();
      if (!n || typeReserved(n) || out.some(function (y) { return y.toLowerCase() === low; })) return;
      out.push(n);
    });
    return out.slice(0, NT_MAX);
  }
  // Ajoute un type libre : 'ok', 'doublon', 'reserve' (c'est une catégorie de départ) ou 'pleine'.
  function addTypeName(n) {
    var low = n.toLowerCase();
    if (typeReserved(n)) return 'reserve';
    if (noteTypeNames.some(function (y) { return y.toLowerCase() === low; })) return 'doublon';
    if (noteTypeNames.length >= NT_MAX) return 'pleine';
    noteTypeNames.push(n);
    return 'ok';
  }
  function noteTypeOf(id) {
    for (var i = 1; i < NOTE_TYPES.length; i++) if (NOTE_TYPES[i].id === id) return NOTE_TYPES[i];
    if (typeof id === 'string' && id.slice(0, 2) === 'u:') {
      var n = typeName(id.slice(2));
      if (n) {
        var b = builtinByName(n);
        if (b) return b;
        return { id: 'u:' + n, name: n, bg: NT_CUSTOM.bg, ink: NT_CUSTOM.ink, hint: 'Une catégorie que tu as créée dans Réglages.', custom: true };
      }
    }
    return NOTE_TYPES[0];
  }
  // Les catégories proposées : celles de départ, celles de Réglages, et celle de la note ouverte si elle a été retirée de la liste depuis (elle reste choisissable).
  function noteTypeChoices(cur) {
    var list = NOTE_TYPES.slice();
    noteTypeNames.forEach(function (n) { list.push(noteTypeOf('u:' + n)); });
    if (cur && !list.some(function (t) { return t.id === cur; })) list.push(noteTypeOf(cur));
    return list;
  }
  function subClean(x) {
    var n = typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '';
    return n && n.length <= NS_LEN && !/[\u0000-\u001f\u007f]/.test(n) ? n : '';
  }
  // Sous-catégories d'une catégorie : celles de départ, puis celles que des notes de cette catégorie portent déjà, puis celle de la note ouverte.
  function subChoices(catId, cur) {
    var t = noteTypeOf(catId), list = (t.subs || []).slice();
    if (!t.id) return list;
    entries.forEach(function (e) { if (e.kind === 'note' && e.nsub && noteTypeOf(e.ntype).id === t.id && list.indexOf(e.nsub) < 0) list.push(e.nsub); });
    if (cur && list.indexOf(cur) < 0) list.push(cur);
    return list;
  }
  function canonSub(catId, txt) { // « action » → « Action » si cette sous-catégorie existe déjà (majuscules ignorées)
    var low = txt.toLowerCase(), hit = subChoices(catId, '').filter(function (s) { return s.toLowerCase() === low; })[0];
    return hit || txt;
  }
  // Note rattachée (depuis le 19/11) : un champ texte par note, nommé comme la 3e colonne du classement de l'utilisateur ; `att` + `attTs` (heure de la première fois).
  // Un questionnement a en plus sa « Réponse » (`ans`, depuis le 08/11).
  function attLabel(id) { return id === 'affirmation' ? 'À écrire' : id === 'todo' ? 'Mise en place' : id === 'questionnement' ? 'Remarque' : 'Action / remarque'; }
  function attHint(id) {
    return id === 'affirmation' ? 'La phrase telle que tu veux l’écrire…' : id === 'todo' ? 'Comment tu l’as mise en place, ce que tu as fait…' :
      id === 'questionnement' ? 'Une remarque, en plus de la réponse…' : 'Une action à faire, une remarque sur cette note…';
  }
  function attFilled(e) { return !!e && e.kind === 'note' && typeof e.att === 'string' && !!e.att.trim(); }
  // État « fait » d'une note, pour le filtre de l'historique : questionnement répondu, to-do mise en place.
  function doneOf(e) { return noteTypeOf(e.ntype).id === 'todo' ? attFilled(e) : ansAnswered(e); }
  // Le choix en cours (catégorie + sous-catégorie) : celui de l'écran « Note libre » ou celui de « Modifier la note ».
  function curSel() { return screen === 'note' ? noteSel : (form && form.type === 'edit' && form.kind === 'note' ? form.sel : null); }
  function selSub(s) { return s && s.id ? (s.other ? canonSub(s.id, subClean(s.txt)) : (s.sub || '')) : ''; }
  function noteSubBlock(sel) {
    var c = noteTypeOf(sel.id), h = '';
    if (c.id) {
      h += '<div class="j-field"><label class="j-lab" for="f-sub">Sous-catégorie</label><select id="f-sub" class="j-sel" data-nt="sub"><option value="">Aucune</option>' +
        subChoices(c.id, sel.other ? '' : sel.sub).map(function (s) { return '<option value="' + esc(s) + '"' + (!sel.other && sel.sub === s ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') +
        '<option value="__other"' + (sel.other ? ' selected' : '') + '>Autre sous-catégorie…</option></select></div>';
      if (sel.other) h += '<input id="f-subother" class="j-sel" type="text" maxlength="' + NS_LEN + '" data-nt="subother" placeholder="Nom de la sous-catégorie" aria-label="Nom de la nouvelle sous-catégorie" value="' + esc(sel.txt || '') + '">';
    }
    return h + '<p class="j-p" style="margin:0 5px">' + esc(c.hint) + '</p>';
  }
  function noteTypeBlock(sel) {
    var c = noteTypeOf(sel.id);
    return '<div class="j-field"><label class="j-lab" for="f-cat">Catégorie</label><select id="f-cat" class="j-sel" data-nt="cat">' +
      noteTypeChoices(c.id).map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === c.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') +
      '</select></div><div id="j-ntsub" class="j-nt">' + noteSubBlock(sel) + '</div>';
  }
  // Rubrique « Réponse » de « Modifier la note » : visible pour un Questionnement, ou tant qu'une réponse existe (on ne cache jamais une réponse écrite).
  var ANS_COL = { bg: '#C8EBD2', ink: '#14301F', bar: '#6BBF8A' };
  function ansBlock() {
    if (!form || form.kind !== 'note') return '';
    if (noteTypeOf(form.sel.id).id !== 'questionnement' && !(form.ans || '').trim()) return '';
    var ne = entries.filter(function (x) { return x.id === form.id; })[0];
    var has = ansAnswered(ne) && typeof ne.ansTs === 'number' && ne.ansTs > ne.ts;
    return '<div class="j-field"><label class="j-lab" for="f-ans">Réponse</label>' +
      '<textarea id="f-ans" class="j-ta mid" data-field="ans" maxlength="5000" placeholder="Ta réponse à cette question…">' + esc(form.ans || '') + '</textarea>' +
      '<span class="j-fhint">' + (has ? 'Répondu le ' + esc(whenText(ne.ansTs)) + ' (' + esc(delayText(ne.ansTs - ne.ts)) + '). L’heure de la réponse ne change pas.' : 'L’heure à laquelle tu réponds est notée, avec le délai depuis la question.') + '</span></div>';
  }
  // Rubrique de la note rattachée : son nom suit la catégorie choisie (À écrire, Mise en place, Remarque, Action / remarque).
  function attBlock() {
    if (!form || form.kind !== 'note') return '';
    var cid = noteTypeOf(form.sel.id).id, ne = entries.filter(function (x) { return x.id === form.id; })[0];
    var has = attFilled(ne) && typeof ne.attTs === 'number' && ne.attTs > ne.ts;
    return '<div class="j-field"><label class="j-lab" for="f-att">' + esc(attLabel(cid)) + '</label>' +
      '<textarea id="f-att" class="j-ta mid" data-field="att" maxlength="5000" placeholder="' + esc(attHint(cid)) + '">' + esc(form.att || '') + '</textarea>' +
      '<span class="j-fhint">' + (has ? 'Ajouté le ' + esc(whenText(ne.attTs)) + ' (' + esc(delayText(ne.attTs - ne.ts)) + '). L’heure d’ajout ne change pas.' : 'L’heure à laquelle tu l’ajoutes est notée.') + '</span></div>';
  }
  // Choix d'une catégorie : sur l'écran « Note libre » ou « Modifier la note ». On ne redessine que ce qui dépend d'elle (sous-catégories, réponse, note rattachée) : le texte tapé et le clavier restent.
  function setNoteType(id) {
    var s = curSel();
    if (!s) return;
    var c = noteTypeOf(id).id;
    if (c !== s.id) { s.id = c; s.sub = ''; s.other = false; s.txt = ''; }
    var sb = $('j-ntsub'); if (sb) sb.innerHTML = noteSubBlock(s);
    if (screen !== 'note') {
      var ab = $('j-ans'); if (ab) ab.innerHTML = ansBlock(); // la rubrique « Réponse » apparaît avec « Questionnement »
      var tb = $('j-att'); if (tb) tb.innerHTML = attBlock(); // le nom de la note rattachée suit la catégorie
      var gb = $('f-go'); if (gb) gb.disabled = !formValid();
    }
  }
  function setNoteSub(v) {
    var s = curSel();
    if (!s) return;
    if (v === '__other') { s.other = true; s.sub = ''; } else { s.other = false; s.sub = v; s.txt = ''; }
    var sb = $('j-ntsub'); if (sb) sb.innerHTML = noteSubBlock(s);
    var f = $(s.other ? 'f-subother' : 'f-sub'); if (f) f.focus({ preventScroll: true });
    if (screen !== 'note') { var gb = $('f-go'); if (gb) gb.disabled = !formValid(); }
  }
  function setNoteSubText(v) {
    var s = curSel();
    if (!s) return;
    s.txt = v;
    if (screen !== 'note') { var gb = $('f-go'); if (gb) gb.disabled = !formValid(); }
  }
  var pendingDel = null, notice = '';
  var backupStatus = '';
  var rem = { moments: true, phases: false, backups: true, days: 1 }, remStatus = '';
  var restore = null, restoreError = '';
  var setDraft = { act: '', inst: '', nt: '' }, setNotice = '', setNoticeIn = ''; // Réglages : texte en cours de saisie, message

  function newFlow(o) {
    o = o || {};
    return { mode: o.mode || 'releve', test: o.test || 'pvt', slot: o.slot == null ? null : o.slot, qs: o.qs || '', thought: '', feel: {}, detail: '', feelTs: 0, ts: 0, wake: 0, result: null,
             tMode: 'test', prac: null, chain: null, chainMsg: '', fin: o.fin || '', finMsg: o.finMsg || '', finDone: o.finDone || '' };
  }

  /* ---------- Aujourd'hui : moments du plan ---------- */
  // Quand le recueil est en cours (plan « run »), les moments de test du plan (7 avant le 21/11/2026, 5 depuis) sont des moments ENCHAÎNÉS : le PVT-B (selon l'étape),
  // puis 2 tests dans l'ordre du jour (PL.testOrder). Avant le premier jour et après la fin, un moment garde son rôle d'avant (PVT-B seul).
  // Fenêtre : le moment doit être COMMENCÉ dans sa fenêtre (−10 / +30 min) ; une fois commencé, l'enchaînement peut la dépasser (choix de Claude, À ajuster).
  var STEP_NAME = { pvt: 'PVT-B', rs: 'Rotation span', fl: 'Flanker', hs: 'Hand Swype', ml: 'Memory List', ss: 'Symbol Search' };
  function stepSec(t) { return t === 'pvt' ? PL.PVT : PL.DUR[t.toUpperCase()]; }
  function stepsText(list) { return list.map(function (t) { return STEP_NAME[t]; }).join(' · '); }

  function todayInfo() {
    var now = new Date(), wake = L.getWake(), tk = dayKey(now.getTime(), wake), done = {}, skip = {}, qa = {};
    entries.forEach(function (e) {
      if (e.kind === 'creuxq' || (e.kind === 'creux' && (e.origin === 'question' || creuxFreeSlot(e) >= 0))) { // F2 : réponse à la question du creux ; B : un creux libre commencé dans la fenêtre compte comme « oui »
        var free = e.kind === 'creux' && e.origin !== 'question', qsl = free ? creuxFreeSlot(e) : e.slot, qans = e.kind === 'creux' ? 'oui' : 'non';
        var qat = e.kind === 'creux' ? (free ? e.ts : (e.ansTs || e.ts)) : e.ts, cur = qsl != null ? qa[qsl] : null; // « oui » l'emporte sur « non » ; à réponse égale, la plus ancienne du jour compte
        if (qsl != null && dayKey(qat, e.wake) === tk && (!cur || (qans === 'oui' && cur.ans === 'non') || (qans === cur.ans && qat < cur.ts))) qa[qsl] = { ts: qat, ans: qans, e: e, free: free };
        return;
      }
      if (e.day !== tk || e.slot == null) return;
      if (e.kind === 'pas') { if (!skip[e.slot] || e.ts > skip[e.slot].ts) skip[e.slot] = e; return; }
      if (e.kind !== 'releve' && e.kind !== 'test') return;
      var d = done[e.slot] || (done[e.slot] = { tests: {} });
      if (e.test) { if (!d.tests[e.test] || e.ts < d.tests[e.test].ts) d.tests[e.test] = e; return; } // les autres tests ne comptent que dans un moment enchaîné
      if (!d[e.kind] || e.ts < d[e.kind].ts) d[e.kind] = e;
    });
    return { now: now, wake: wake, tk: tk, rel: L.mod(minOf(now) - wake), done: done, skip: skip, qa: qa };
  }
  function slotStates(info) {
    var open = -1, next = -1, ps = pState(info.tk), pd = ps.s === 'run' ? pDay(ps.i, info.tk) : null;
    var list = PLAN.map(function (m, i) {
      if (m.off) return { kind: 'off', status: '', off: true, needR: false, needT: false, part: false, chain: null, skip: null, canNote: false, win: '', at: '', endAt: '' }; // e4b : moment retiré du plan (R+7h)
      var qp = null; // la question du creux de ce moment (s'il y en a une)
      if (isQ(m)) { // F2 : question du creux. Répondue = « fait » ; creux déjà ouvert à l'heure prévue = la question devient « ton creux est-il terminé ? » (carte du creux) ; sinon elle reste ouverte jusqu'à la réponse
        var qa1 = info.qa[i] || null, qs = m.r - WIN.before, qe = m.r + WIN.after, qcov = qa1 ? null : creuxAt(plannedTs(info.tk, info.wake, m.r)), qk, qst;
        if (qa1) { qk = 'done'; qst = (qa1.ans === 'oui' ? 'Oui' : 'Non') + ' · ' + clockOf(qa1.ts); }
        else if (qcov) { qk = 'done'; qst = 'Creux en cours à l’heure prévue'; }
        else if (info.rel >= qs) { qk = 'open'; qst = info.rel <= qe ? 'À répondre' : 'En attente'; }
        else { qk = 'soon'; qst = 'À venir'; if (!isQT(m) && next < 0) next = i; }
        qp = { kind: qk, status: qst, qpend: qk === 'open', freeQ: !!(qa1 && qa1.free) };
        if (!isQT(m)) return { kind: qk, status: qst, q: true, qpend: qp.qpend, freeQ: qp.freeQ, needR: false, needT: false, part: false, chain: null, skip: null, canNote: false,
                 win: L.fmt(info.wake + qs) + ' – ' + L.fmt(info.wake + qe), at: L.fmtClock(info.wake + m.r), endAt: L.fmt(info.wake + qe) };
      }
      var d = info.done[i] || { tests: {} }, sk = info.skip[i] || null, s = m.r - WIN.before, e = m.r + WIN.after, kind, status;
      var ti = pd ? pd.slots.indexOf(i) : -1, ch = null, part, needR, needT, last;
      if (ti >= 0) {
        var mo = pd.moments[ti], steps = (mo.pvt ? ['pvt'] : []).concat(mo.tests.map(function (t) { return t.toLowerCase(); }));
        var todo = steps.filter(function (t) { return !(t === 'pvt' ? d.test : d.tests[t]); });
        var hasR = m.kind !== 'test', total = steps.length + (hasR ? 1 : 0), nDone = steps.length - todo.length + (hasR && d.releve ? 1 : 0);
        needR = hasR && !d.releve; needT = todo.length > 0; part = nDone > 0;
        ch = { ti: ti, steps: steps, todo: todo, total: total, nDone: nDone, d: pd.i, plan: pd.plan, stage: pd.stage,
               sec: todo.reduce(function (a, t) { return a + stepSec(t); }, 0) };
      } else {
        part = !!(d.releve || d.test);
        needR = m.kind !== 'test' && !d.releve; needT = m.kind !== 'releve' && !d.test;
      }
      last = Math.max((d.releve || { ts: 0 }).ts, (d.test || { ts: 0 }).ts);
      Object.keys(d.tests).forEach(function (k) { last = Math.max(last, d.tests[k].ts); });
      if (!needR && !needT) { kind = 'done'; status = 'Fait · ' + clockOf(last); }
      else if (ch && sk && !part) { kind = 'past'; status = 'Pas ce moment'; }
      else if (info.rel >= s && info.rel <= e) {
        kind = 'open'; status = part ? (ch ? 'En cours' : (d.releve ? 'Relevé fait' : 'Test fait')) : 'Créneau ouvert'; if (open < 0) open = i;
      }
      else if (info.rel > e) { kind = 'past'; status = part ? 'Incomplet' : 'Passé'; }
      else { kind = 'soon'; status = 'À venir'; if (next < 0) next = i; }
      var out = { kind: kind, status: status, needR: needR, needT: needT, part: part, chain: ch, skip: sk, canNote: kind === 'past' && !!ch && !sk,
                  win: L.fmt(info.wake + s) + ' – ' + L.fmt(info.wake + e), at: L.fmtClock(info.wake + m.r), endAt: L.fmt(info.wake + e) };
      if (qp) { // e4b, R+5h : la question puis le test. Le moment n'est « fait » que si les deux le sont ; la question a sa propre carte (qpend), le test garde la sienne.
        out.qt = true; out.qk = qp.kind; out.qst = qp.status; out.qpend = qp.qpend; out.freeQ = qp.freeQ;
        if (kind === 'done' && qp.kind !== 'done') { out.kind = qp.kind; out.status = qp.status; }
      }
      return out;
    });
    return { list: list, open: open, next: next };
  }
  function actionLabel(s) {
    if (s.chain) return s.part ? 'Continuer le moment' : (s.needR ? 'Relevé puis tests' : 'Commencer');
    if (s.needR && s.needT) return 'Relevé puis test';
    return s.needR ? 'Faire le relevé' : 'Faire le test (3 min)';
  }
  function startMoment(i) {
    var s = slotStates(todayInfo()).list[i];
    if (!s || (!s.needR && !s.needT)) return;
    if (s.chain) { // moment enchaîné : le parcours garde le plan du jour (jour, plan, étape) et la suite des tests
      flow = newFlow({ slot: i, mode: 'test' });
      flow.chain = { slot: i, d: s.chain.d, plan: s.chain.plan, stage: s.chain.stage, steps: s.chain.steps.slice(), n: s.chain.steps.length };
      if (s.needR) go('feel'); else chainGo();
      return;
    }
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
  function feelWords(f, legacy) { // relevés d'avant e5 (fv 1 et 2) : l'ancien « Moral » est nommé « Moral (ancienne question) » et reste à part
    var t = function (id) { return optText(id, f[id], legacy); };
    var corps = (legacy ? ['confort', 'energie'] : ['eveil', 'energie', 'confort']).map(t).filter(Boolean).join(', ');
    return 'Corps : ' + corps + ' · Esprit : ' + t('agitation') + ' · Moral (ancienne question) : ' + t('moral');
  }
  // Relevés depuis e5 (fv 3) : seulement les réponses données, chacune avec le nom de sa question (« Humeur de fond : Bonne »)
  function optText3(id, v) { var d = feel3Def(id); return d && v ? d.opts[v - 1] || '' : ''; }
  function feelWords3(f) {
    var corps = ['eveil', 'energie', 'confort'].map(function (id) { return optText3(id, f[id]); }).filter(Boolean).join(', ');
    var rows = corps ? ['Corps : ' + corps] : [];
    ['humeur', 'niaque', 'agitation'].forEach(function (id) { if (f[id]) rows.push(feel3Def(id).label + ' : ' + optText3(id, f[id])); });
    return rows.join(' · ');
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
  function feelComplete() { return qsetOf(flow).every(function (id) { return flow.feel[id]; }); }

  /* ---------- Historique ---------- */
  var KIND_LABEL = { releve: 'Relevé', test: 'Test', note: 'Note', activite: 'Activité', creux: 'Creux', creuxq: 'Question du creux', repas: 'Repas', coucher: 'Coucher', pas: 'Pas ce moment', instant: 'Instant', nuit: 'Nuit' };
  function planTxt(e) {
    if (e.plan === 'creux') return 'fin de creux';
    if (e.plan !== 'prevu') return 'libre';
    var m = PLAN[e.slot];
    return 'prévu' + (m ? ' · ' + rLabel(m.r) : '') + (e.pj && PL.isRodage(e.pj.d) ? ' · rodage' : '');
  }
  function bedText(c) {
    var end = nightEnd(c);
    return end ? 'Temps au lit : ' + durText((end - c.ts) / 60000) + (c.memo ? ' · noté de mémoire' : '')
               : 'Temps au lit : connu après ton prochain réveil' + (c.memo ? ' · noté de mémoire' : '');
  }

  /* Liens entre notes (depuis le 19/11, e2) : `from` = identifiant de la note d'origine, posé à la création (« Créer à partir de… »). Le lien inverse n'est PAS écrit :
     on le retrouve en cherchant les notes dont `from` est celle-ci (rien n'est ajouté à la note d'origine). */
  var lkIdx = null; // { byId, kids } : construit à chaque dessin de l'historique, jamais gardé
  function lkBuild() {
    var byId = {}, kids = {};
    entries.forEach(function (x) { if (x.kind === 'note') byId[x.id] = x; });
    entries.forEach(function (x) { if (x.kind === 'note' && typeof x.from === 'string' && x.from && x.from !== x.id) (kids[x.from] = kids[x.from] || []).push(x); });
    return { byId: byId, kids: kids };
  }
  function lkExcerpt(t) { var q = String(t || '').replace(/\s+/g, ' ').trim(); return q.length > 80 ? q.slice(0, 79).trim() + '…' : q; }
  function lkName(o) { var c = noteTypeOf(o.ntype); return c.id ? c.name + (o.nsub ? ' · ' + o.nsub : '') : 'Note'; }
  function lkItem(o) {
    return '<div class="lkr"><span class="lkc">' + esc(lkName(o)) + '</span><span class="lkt">« ' + esc(lkExcerpt(o.text)) + ' »</span>' +
      '<button type="button" class="j-link" data-act="link-go" data-id="' + esc(o.id) + '" aria-label="Voir la note : ' + esc(lkExcerpt(o.text)) + '">Voir</button></div>';
  }
  function lkBlock(e) {
    if (!lkIdx || e.kind !== 'note') return '';
    var h = '';
    if (typeof e.from === 'string' && e.from && e.from !== e.id) {
      var o = lkIdx.byId[e.from];
      h += '<div class="ans lnk"><div class="alab">Créée à partir de</div>' + (o ? lkItem(o) : '<div class="body">une note qui n’existe plus</div>') + '</div>';
    }
    var ks = (lkIdx.kids[e.id] || []).slice().sort(function (a, b) { return a.ts - b.ts; });
    if (ks.length) h += '<div class="ans lnk"><div class="alab">À l’origine de</div>' + ks.slice(0, 5).map(lkItem).join('') +
      (ks.length > 5 ? '<div class="body">et ' + (ks.length - 5) + ' autre' + (ks.length - 5 > 1 ? 's' : '') + '</div>' : '') + '</div>';
    return h;
  }
  /* « Ma nuit » (e5) : le coucher du soir d'avant (jour précédent du réveil) et, s'il y en a un, le dernier instant « Joint » avant ce coucher (12 h au plus avant) : deux faits notés, rien n'est interprété. */
  function bedOfNight(e) {
    var prev = addDays(e.day, -1), best = null;
    entries.forEach(function (x) { if (x.kind === 'coucher' && x.day === prev && (!best || x.ts > best.ts)) best = x; });
    return best;
  }
  function jointBefore(ts) {
    for (var i = entries.length - 1; i >= 0; i--) { var x = entries[i]; if (x.kind === 'instant' && isJoint(x.name) && x.ts < ts && ts - x.ts <= 12 * 3600e3) return x; }
    return null;
  }
  function nightRows(e) {
    var rows = [], c = bedOfNight(e);
    if (e.dream) rows.push('Rêves : ' + nightOpt('dream', e.dream));
    if (c) {
      rows.push('Coucher ' + clockOf(c.ts) + ' · ' + bedText(c));
      var j = jointBefore(c.ts);
      if (j) rows.push('Dernier joint avant le coucher : ' + clockOf(j.ts) + ' (' + durText((c.ts - j.ts) / 60000) + ' avant' + (jtypeOk(j.jtype) ? ' · ' + jtLabel(j.jtype) : '') + ')');
    }
    return rows;
  }
  function histCard(e, today, full, mode) {
    var ph = phaseAt(e.rel), line = '', body = '', kindTxt = KIND_LABEL[e.kind], kindSty = '', editable = false, nowMs = Date.now();
    if (e.kind === 'note') {
      line = ph.name; editable = true;
      var cid = noteTypeOf(e.ntype).id, subTxt = cid && e.nsub ? ' · ' + e.nsub : '';
      if (cid) { var nty = noteTypeOf(e.ntype); kindTxt = nty.name + subTxt; kindSty = 'background:' + nty.bg + ';color:' + nty.ink; }
      var answered = ansAnswered(e), attd = attFilled(e);
      if (answered && cid === 'questionnement') { kindTxt = 'Questionnement' + subTxt + ' · répondu\u00a0✓'; kindSty = 'background:' + ANS_COL.bg + ';color:' + ANS_COL.ink; } // texte ET couleur : lisible sans la couleur
      else if (attd && cid === 'todo') { kindTxt = 'To-do' + subTxt + ' · mis en place\u00a0✓'; kindSty = 'background:' + ANS_COL.bg + ';color:' + ANS_COL.ink; }
      if (isVal(e)) { kindTxt += ' · validée\u00a0✓'; kindSty = 'background:' + ANS_COL.bg + ';color:' + ANS_COL.ink; } // e5c : texte ET couleur
      body = '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.text) + '</div>' +
        (answered ? '<div class="ans"><div class="alab">Réponse</div><div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.ans) + '</div></div>' : '') +
        (attd ? '<div class="ans att"><div class="alab">' + esc(attLabel(cid)) + '</div><div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.att) + '</div></div>' : '') +
        (full ? lkBlock(e) : '') +
        (full ? '<div class="meta">' + esc(noteDates(e)) + '</div>' : '');
    } else if (e.kind === 'repas') {
      line = ph.name; body = '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.text) + '</div>'; editable = true;
    } else if (e.kind === 'coucher') {
      line = 'Coucher'; body = '<div class="body">' + esc(bedText(e)) + '</div>'; editable = true;
    } else if (e.kind === 'nuit') { // « Ma nuit » : ressenti déclaré, rien de mesuré
      editable = true;
      line = ['sq', 'rest'].filter(function (id) { return e[id]; }).map(function (id) { return NIGHT_Q.filter(function (q) { return q.id === id; })[0].label + ' : ' + nightOpt(id, e[id]); }).join(' · ') || 'Rêves';
      body = nightRows(e).map(function (t) { return '<div class="body">' + esc(t) + '</div>'; }).join('') +
        (e.dtext ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.dtext) + '</div>' : '');
    } else if (e.kind === 'instant') {
      line = e.name + (jtypeOk(e.jtype) ? ' · ' + jtLabel(e.jtype) : ''); editable = true;
    } else if (e.kind === 'activite') {
      editable = true;
      var endTxt = e.end == null ? 'en cours depuis ' + durText((nowMs - e.ts) / 60000) : clockOf(e.end) + ' (' + durText((e.end - e.ts) / 60000) + ')';
      line = e.name + ' · ' + clockOf(e.ts) + (e.end == null ? ' · ' : ' → ') + endTxt;
      body = (e.comment ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.comment) + '</div>' : '') +
        (e.feelStart ? '<div class="body">Début : ' + esc(feelShort(e.feelStart)) + (e.feelStartLate ? ' (noté après coup)' : '') + '</div>' : '') +
        (e.feelEnd ? '<div class="body">Fin : ' + esc(feelShort(e.feelEnd)) + (e.feelEndLate ? ' (noté après coup)' : '') + '</div>' : '');
    } else if (e.kind === 'creux') {
      editable = true;
      line = 'Début ' + clockOf(e.ts) + (e.end == null ? ' · en cours depuis ' + durText((nowMs - e.ts) / 60000) : ' → fin ' + clockOf(e.end) + ' (' + durText((e.end - e.ts) / 60000) + ')');
      body = '<div class="body">Début : ' + esc(creuxOriginTxt(e)) + '</div>' +
        (e.note ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.note) + '</div>' : '') +
        (e.end != null ? '<div class="body">' + (e.endAuto ? 'Fin automatique : le creux n’avait pas été terminé (4 h au maximum)' : 'Fin déclarée, à peu près') + '</div>' + (e.endNote ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.endNote) + '</div>' : '') : '');
    } else if (e.kind === 'creuxq') {
      var qm = PLAN[e.slot];
      line = 'Réponse « non » · question de ' + (qm ? rLabel(qm.r) : 'R+5h / R+6h');
      body = '<div class="body">' + (qm ? (qLate(e) ? 'Réponse tardive : donnée hors de la fenêtre du moment (prévu à ' + L.fmtClock(e.wake + qm.r) + ')' : 'Dans la fenêtre du moment (prévu à ' + L.fmtClock(e.wake + qm.r) + ')') : 'Pas de creux') + '</div>' +
        (e.note ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.note) + '</div>' : '');
    } else if (e.kind === 'pas') {
      var pm = PLAN[e.slot];
      line = ph.name + (pm ? ' · ' + rLabel(pm.r) : '');
      body = e.text ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.text) + '</div>' : '<div class="body">Sans précision.</div>';
      kindTxt = 'Pas ce moment' + (e.pj && PL.isRodage(e.pj.d) ? ' · rodage' : '');
    } else if (e.test === 'ss') {
      var sv = e.ss, early = e.plan !== 'prevu' && e.rel < 120;
      line = ph.name + ' · ' + (sv.med === null ? 'pas de mesure' : ssMs(sv.med)) + ' · ' + sv.correct + '/' + sv.n + ' justes · ' + DEVICE_TXT[e.device];
      kindTxt = 'Symbol Search · ' + planTxt(e) + (early ? ' · avant R+2h' : '');
      body = passBody(e);
    } else if (e.test && TD[e.test] && TD[e.test].histLine) { // Rotation span, Hand Swype, Flanker
      var td3 = TD[e.test], early3 = e.plan !== 'prevu' && e.rel < 120;
      line = ph.name + ' · ' + td3.histLine(e[e.test]) + ' · ' + DEVICE_TXT[e.device];
      kindTxt = td3.name + ' · ' + planTxt(e) + (early3 ? ' · avant R+2h' : '');
      body = passBody(e);
    } else if (e.kind === 'test') {
      var p = e.pvt;
      line = ph.name + ' · ' + (p.mean === null ? 'pas de mesure' : p.mean + ' ms') + ' · ' + plural(p.lapses, 'lapse', 'lapses') + ' · ' + DEVICE_TXT[e.device];
      kindTxt = 'Test · ' + planTxt(e);
      body = passBody(e);
    } else if (e.pvt) { // ancien relevé combiné (avant le 11/10)
      var q = e.pvt;
      line = ph.name + ' · ' + (q.mean === null ? 'pas de mesure' : q.mean + ' ms') + ' · ' + plural(q.lapses, 'lapse', 'lapses') + ' · ' + DEVICE_TXT[e.device];
      body = '<div class="body">' + esc(feelWords(e.feel, true)) + '</div>';
      kindTxt = 'Relevé + test';
    } else {
      line = ph.name;
      body = '<div class="body">' + esc(e.fv === 3 ? feelWords3(e.feel) : feelWords(e.feel, e.fv !== 2)) + '</div>' +
        (e.detail ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.detail) + '</div>' : '');
      kindTxt = 'Relevé · ' + planTxt(e);
    }
    if (mode === 'last') { // e4c : « Dernier test » sur le Journal : un bouton à deux lignes qui ouvre l'Historique sur les tests
      return '<button type="button" class="j-h j-lastt" data-k="test" data-act="last-tests" aria-label="Dernier test : ' + esc(kindTxt + ', ' + dayText(e.day, today) + ' à ' + clockOf(e.ts) + ', ' + line) + '. Ouvrir les tests dans Reflet"><span class="r1"><span class="when">' + esc(dayText(e.day, today)) + ' · ' + clockOf(e.ts) + '</span><span class="kind">' +
        esc(kindTxt) + '</span></span><span class="r2"><span class="dot" style="background:' + ph.color + '"></span><span>' + esc(line) + '</span></span><span class="j-more">Tous les tests ' + ICON_CHEV + '</span></button>';
    }
    var act = '';
    if (full) {
      act = pendingDel === e.id
        ? '<div class="act"><span class="j-confirm">Supprimer pour de bon ?</span>' +
          '<button type="button" class="j-link danger" data-act="del-yes" data-id="' + esc(e.id) + '">Oui, supprimer</button>' +
          '<button type="button" class="j-link" data-act="del-no">Annuler</button></div>'
        : '<div class="act">' + (e.kind === 'note' ? (isVal(e)
            ? '<button type="button" class="j-link" data-act="val-undo" data-id="' + esc(e.id) + '" aria-label="Annuler la validation de cette note">Annuler la validation</button>'
            : '<button type="button" class="j-link" data-act="val" data-id="' + esc(e.id) + '" aria-label="Valider cette note">Valider</button>') +
          '<button type="button" class="j-link" data-act="note-from" data-id="' + esc(e.id) + '" aria-label="Créer une note à partir de cette note">Créer à partir de…</button>' : '') +
          (editable ? '<button type="button" class="j-link" data-act="edit" data-id="' + esc(e.id) + '">Modifier</button>' : '') +
          '<button type="button" class="j-link" data-act="del" data-id="' + esc(e.id) + '">Supprimer</button></div>';
    }
    // couleur de la carte (comme la touche qui l'a créée) ; « pas ce moment » : aucune ; ancien relevé combiné : celle du relevé
    var kc = e.kind === 'test' || e.test ? 'test' : e.kind === 'pas' ? '' : e.pvt ? 'releve' : e.kind;
    return '<div class="j-h" data-eid="' + esc(e.id) + '"' + (kc ? ' data-k="' + kc + '"' : '') + '><div class="r1"><span class="when">' + esc(dayText(e.day, today)) + ' · ' + clockOf(e.ts) + '</span><span class="kind' + (kindSty ? ' nt" style="' + kindSty : '') + '">' +
      esc(kindTxt) + '</span></div><div class="r2"><span class="dot" style="background:' + ph.color + '"></span><span>' + esc(line) +
      '</span></div>' + body + act + '</div>';
  }

  /* ---------- Plan des tests : réglages et vue « journée » (morceau 4a) ---------- */
  // Réglages gardés dans « luna.plan » : premier jour (choisi par toi), graine du mélange (tirée une seule fois, jamais changée),
  // étape du PVT-B (chaque changement est gardé avec sa date : [jour de départ, étape, heure du choix]). L'appli ne change jamais l'étape seule.
  // Le « jour du plan » suit la journée du Journal (du réveil au réveil suivant), pas minuit ; un jour sauté reste vide.
  var KEY_PLAN = 'luna.plan';
  var pcfg = { start: null, seed: 0, stages: [] };
  var psel = null, pform = null, pnotice = '';
  function tiSlots(v) { return PL.tbl(v).TEST_R.map(function (h) { for (var i = 0; i < PLAN.length; i++) if (PLAN[i].r === h * 60) return i; return -1; }); } // moment de test -> moment du plan existant (v : 7 avant le 21/11/2026, 5 depuis)
  function stageTxt(s) { return s === 1 ? 'PVT-B aux ' + PL.TEST_R.length + ' moments' : s === 2 ? 'PVT-B à R+2h + 2 moments qui tournent' : 'PVT-B à R+2h seulement'; }

  function pValidDate(v) {
    var d = typeof v === 'string' ? PL.parseISO(v) : null;
    return d && PL.isoOf(d) === v && d.getUTCFullYear() >= 2020 && d.getUTCFullYear() <= 2100 ? d : null;
  }
  // Réglages venant du stockage ou d'un fichier : validation stricte, null si illisible.
  function pClean(o) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
    var seed = int(o.seed, 1, 2147483646);
    if (seed === null) return null;
    var start = null;
    if (o.start !== null && o.start !== undefined) { if (!pValidDate(o.start)) return null; start = o.start; }
    var by = {};
    if (Array.isArray(o.stages)) o.stages.slice(0, 60).forEach(function (s) {
      if (!Array.isArray(s) || !pValidDate(s[0])) return;
      var st = int(s[1], 1, 3), at = Number(s[2]);
      if (st === null || !isFinite(at) || at < 0) return;
      by[s[0]] = [s[0], st, Math.floor(at)];
    });
    return { start: start, seed: seed, stages: Object.keys(by).sort().map(function (k) { return by[k]; }) };
  }
  function pExport() { return { v: 1, start: pcfg.start, seed: pcfg.seed, stages: pcfg.stages.map(function (s) { return s.slice(); }) }; }
  function pSave() { try { localStorage.setItem(KEY_PLAN, JSON.stringify(pExport())); return true; } catch (e) { return false; } }
  function pNewSeed() {
    var n;
    try { var a = new Uint32Array(1); crypto.getRandomValues(a); n = a[0]; } catch (e) { n = Math.floor(Math.random() * 4294967296); }
    return 100000 + n % 900000;
  }
  function pLoad() {
    var raw = null, p = null;
    try { raw = localStorage.getItem(KEY_PLAN); } catch (e) {}
    if (raw) {
      try { p = pClean(JSON.parse(raw)); } catch (e) { p = null; }
      if (!p) { try { localStorage.setItem(KEY_PLAN + '.corrupt', raw); } catch (e2) {} } // illisible : gardé de côté avant d'écrire autre chose par-dessus
    }
    if (p) { pcfg = p; return; }
    pcfg = { start: null, seed: pNewSeed(), stages: [] };
    pSave();
  }
  // Étape du PVT-B en vigueur le jour k : la dernière modification dont le jour de départ est atteint (étape 1 au début).
  function pStageOf(cfg, k) {
    var st = 1;
    cfg.stages.forEach(function (s) { if (s[0] <= k) st = s[1]; });
    return st;
  }
  function pStageOn(k) { return pStageOf(pcfg, k); }
  function pState(tk) {
    if (!pcfg.start) return { s: 'none' };
    var i = PL.daysBetween(PL.parseISO(pcfg.start), PL.parseISO(tk));
    if (i < 0) return { s: 'wait', days: -i };
    if (i >= PL.NDAYS) return { s: 'over', i: i };
    return { s: 'run', i: i };
  }
  function pIndex(ps) { // jour affiché : celui choisi avec les flèches, sinon aujourd'hui (ou le premier / le dernier jour hors recueil)
    var i = psel !== null ? psel : (ps.s === 'run' ? ps.i : (ps.s === 'over' ? PL.NDAYS - 1 : 0));
    return Math.max(0, Math.min(PL.NDAYS - 1, i));
  }
  function pDay(i, tk) { // tout ce qu'il faut pour afficher le jour i du plan
    var key = pcfg.start ? PL.isoOf(PL.addDays(PL.parseISO(pcfg.start), i)) : null;
    var v = PL.ver(key), tb = PL.tbl(v), sl = tiSlots(v); // e4d : un jour avant le 21/11/2026 garde son plan à 7 moments
    var st = pStageOn(key || tk), p = PL.planForDay(i, pcfg.seed), pv = PL.pvtMoments(p, st, v);
    return { i: i, key: key, plan: p, stage: st, v: v, week: PL.weekOf(i), rodage: PL.isRodage(i), sec: PL.daySec(p, st, v), slots: sl,
      moments: tb.TEST_R.map(function (h, ti) {
        return { ti: ti, slot: sl[ti], r: h * 60, pvt: pv.indexOf(ti) >= 0, tests: PL.testOrder(i, ti, p, pcfg.seed, v), sec: PL.momentSec(p, ti, st, v) };
      }) };
  }
  function pDateText(key, long) {
    var d = PL.parseISO(key);
    return d ? d.toLocaleDateString('fr-FR', long ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
  }
  function pDur(sec) { return PL.fmtDur(sec).replace(/ /g, '\u00a0'); } // « 5 min 05 s » ne se coupe pas en fin de ligne
  function pDayMonth(key) { var d = PL.parseISO(key); return d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : ''; }

  // Carte de l'accueil
  function pBoxHtml(info) {
    var ps = pState(info.tk), kick = '<span class="j-kick">PLAN DES TESTS</span>';
    function btn(txt) { return '<div class="btns"><button type="button" class="btn secondary" data-act="plan">' + txt + '</button></div>'; }
    if (ps.s === 'none') {
      return '<div class="j-now">' + kick + '<div class="t1">Premier jour pas encore choisi</div>' +
        '<div class="t2">Le plan donne, pour chaque jour, quels tests à quel moment. Tu choisis son premier jour quand tu es prêt. Tes tests libres restent gardés.</div>' + btn('Régler le plan') + '</div>';
    }
    if (ps.s === 'wait') {
      return '<div class="j-now">' + kick + '<div class="t1">Le recueil commence ' + (ps.days === 1 ? 'demain' : 'le ' + esc(pDateText(pcfg.start, true))) + '</div>' +
        '<div class="t3">' + (ps.days === 1 ? esc(pDateText(pcfg.start, true)) : 'dans ' + ps.days + ' jours') + '</div>' + btn('Voir le plan') + '</div>';
    }
    if (ps.s === 'over') {
      return '<div class="j-now">' + kick + '<div class="t1">Le recueil est terminé</div>' +
        '<div class="t2">' + (PL.NDAYS / 7) + ' semaines depuis le premier jour. Les tests libres restent possibles.</div>' + btn('Voir le plan') + '</div>';
    }
    var d = pDay(ps.i, info.tk);
    return '<div class="j-now">' + kick + '<div class="t1">Jour ' + (ps.i + 1) + ' sur ' + PL.NDAYS + ' · semaine ' + d.week + (d.rodage ? ' · rodage' : '') + '</div>' +
      '<div class="t2">Plan de journée ' + (d.plan + 1) + ' sur 7 · ' + d.moments.length + ' moments de test · ' + pDur(d.sec) + ' en tout</div>' + btn('Voir la journée') + '</div>';
  }

  // Écran « Plan des tests » : la journée choisie (aujourd'hui par défaut)
  function pDayHtml(info) {
    var ps = pState(info.tk), i = pIndex(ps), d = pDay(i, info.tk), tk = info.tk, wake = info.wake;
    var isToday = ps.s === 'run' && i === ps.i, label, sub, state = '';
    if (d.key) {
      var dt = pDateText(d.key), rel = d.key === tk ? 'Aujourd’hui' : (d.key === addDays(tk, 1) ? 'Demain' : (d.key === addDays(tk, -1) ? 'Hier' : ''));
      label = rel || dt; sub = (rel ? dt + ' · ' : '') + 'jour ' + (i + 1) + ' sur ' + PL.NDAYS;
    } else {
      label = 'Jour ' + (i + 1) + ' sur ' + PL.NDAYS; sub = 'Aperçu · premier jour pas encore choisi';
    }
    if (ps.s === 'none') state = 'Le premier jour n’est pas encore choisi : voici un aperçu du plan. Le choix se fait dans « Réglages du plan », plus bas.';
    else if (ps.s === 'wait') state = 'Le recueil commence le ' + pDateText(pcfg.start, true) + ' (' + (ps.days === 1 ? 'demain' : 'dans ' + ps.days + ' jours') + ').';
    else if (ps.s === 'over') state = 'Le recueil est terminé : ' + (PL.NDAYS / 7) + ' semaines se sont écoulées depuis le premier jour.';
    var ms = d.moments.map(function (m) {
      var seq = (m.pvt ? ['<span class="pl-it pl-pvt">PVT-B</span>'] : []).concat(m.tests.map(function (t) { return '<span class="pl-it">' + esc(PL.NAMES[t]) + '</span>'; }));
      return '<li class="pl-m"><div class="pl-t"><b>' + L.fmtClock(wake + m.r) + '</b><span>' + rLabel(m.r) + '</span></div>' +
        '<div class="pl-b"><span class="pl-n">' + esc(PLAN[m.slot].name) + '</span><span class="pl-seq">' + seq.join(' ') + '</span></div>' +
        '<div class="pl-d">' + pDur(m.sec) + '</div></li>';
    }).join('');
    if (d.v === 7 && d.key) state += (state ? ' ' : '') + 'Ce jour suit le plan à 7 moments (jusqu’au ' + pDayMonth(PL.isoOf(PL.addDays(PL.parseISO(PL.FROM5), -1))) + '). Depuis le ' + pDayMonth(PL.FROM5) + ', il n’y a plus de test après R+8h : R+10h et R+11h sont des relevés seuls.';
    return (state ? '<p class="j-p">' + esc(state) + '</p>' : '') +
      '<div class="pl-nav"><button type="button" class="btn secondary" data-act="pl-prev" aria-label="Jour précédent"' + (i <= 0 ? ' disabled' : '') + '>' + ICON_BACK + '</button>' +
      '<div class="pl-navc"><b>' + esc(label) + '</b><span>' + esc(sub) + '</span></div>' +
      '<button type="button" class="btn secondary" data-act="pl-next" aria-label="Jour suivant"' + (i >= PL.NDAYS - 1 ? ' disabled' : '') + '>' + ICON_CHEV + '</button></div>' +
      (ps.s === 'run' && !isToday ? '<button type="button" class="j-link" style="align-self:center" data-act="pl-today">Revenir à aujourd’hui</button>' : '') +
      '<section class="j-card"><div class="chips" style="margin:0"><span class="chip main">Plan de journée ' + (d.plan + 1) + ' sur 7</span>' +
      '<span class="chip hy">Semaine ' + d.week + ' sur ' + (PL.NDAYS / 7) + '</span>' + (d.rodage ? '<span class="chip hy">Rodage</span>' : '') +
      '<span class="chip hy">PVT-B : étape ' + d.stage + '</span></div>' +
      '<ol class="pl-ms">' + ms + '</ol>' +
      '<p class="pl-tot">Journée : ' + pDur(d.sec) + ' en tout, PVT-B compris</p></section>' +
      '<p class="j-p">Heures calées sur ton réveil de ' + L.fmtClock(wake) + ' (R+ = heures depuis le réveil). Chaque moment : le PVT-B s’il est prévu à cette étape, puis 2 tests dans un ordre tiré au hasard. ' +
      'Plan et étapes : décidés le 14/10. Durées : estimées d’après les maquettes (à ajuster), pas encore mesurées sur téléphone.</p>' +
      '<p class="j-ok" role="status">' + esc(ps.s === 'run'
        ? 'Depuis l’accueil, chaque moment de test enchaîne ses tests : un seul bouton « Commencer ». Tu peux t’arrêter entre deux tests ; ce qui est fait est gardé. Un moment passé reste « Passé », sans rattrapage.'
        : 'Tant que le recueil n’a pas commencé (ou s’il est terminé), les moments du Journal ne lancent que le PVT-B ; les autres tests se passent en « Test libre » et sont gardés. Dès le premier jour, chaque moment de test enchaîne ses tests.') + '</p>';
  }
  function pRefreshDay(focusAct) {
    var box = $('pl-top');
    if (!box) return;
    setHtml(box, pDayHtml(todayInfo()));
    if (focusAct) {
      var b = box.querySelector('[data-act="' + focusAct + '"]:not([disabled])') || box.querySelector('[data-act="pl-next"]:not([disabled])') || box.querySelector('[data-act="pl-prev"]:not([disabled])');
      if (b) b.focus({ preventScroll: true });
    }
  }

  // Réglages : premier jour et étape du PVT-B
  function pFormNew() {
    var tk = todayInfo().tk;
    return { start: pcfg.start || '', startConfirm: false, stage: pStageOn(addDays(tk, 1)), stageConfirm: false, open: !pcfg.start };
  }
  function pStartInfo() {
    var f = pform, ok = !!pValidDate(f.start), same = ok && f.start === pcfg.start, need = ok && !same && !!pcfg.start;
    var hint = '';
    if (same) hint = 'Premier jour enregistré : ' + pDateText(pcfg.start, true) + '.';
    else if (f.start && !ok) hint = 'Cette date n’est pas valide.';
    else if (!ok && !pcfg.start) hint = 'Choisis une date, puis enregistre.';
    else if (need && f.startConfirm) hint = 'Changer le premier jour recalcule tous les jours du plan (le mélange garde la même graine). Les passages déjà gardés ne bougent pas.';
    return { ok: ok, same: same, need: need, confirm: need && f.startConfirm, disabled: !ok || same, hint: hint,
             btn: need && f.startConfirm ? 'Oui, changer le premier jour' : (same ? 'Premier jour enregistré' : 'Enregistrer le premier jour') };
  }
  function pStageInfo(tk) {
    var cur = pStageOn(tk), nxt = pStageOn(addDays(tk, 1)), f = pform, same = f.stage === nxt;
    var hint = '';
    if (same) hint = 'Étape en vigueur' + (nxt !== cur ? ' dès demain' : '') + ' : ' + nxt + '.';
    else if (f.stageConfirm) hint = 'À partir de demain, la journée du plan suivra l’étape ' + f.stage + ', jusqu’à un autre choix. Les jours déjà passés gardent la leur.';
    return { cur: cur, nxt: nxt, same: same, hint: hint,
             btn: same ? 'Étape ' + nxt + (nxt !== cur ? ' (dès demain)' : ' en vigueur') : (f.stageConfirm ? 'Oui, passer à l’étape ' + f.stage + ' dès demain' : 'Changer l’étape (dès demain)') };
  }
  function pHistoryHtml(tk) {
    var rows = ['<li>Étape 1 · depuis le début</li>'];
    pcfg.stages.forEach(function (s) {
      rows.push('<li>Étape ' + s[1] + ' · dès le ' + esc(pDayMonth(s[0])) + ' · choisie le ' + esc(dShort(s[2])) + (s[0] > tk ? ' · à venir' : '') + '</li>');
    });
    return '<ul class="pl-hist" aria-label="Historique des étapes">' + rows.join('') + '</ul>';
  }
  function pSettingsHtml(tk) {
    var f = pform, si = pStartInfo(), gi = pStageInfo(tk);
    var opts = [1, 2, 3].map(function (s) { return '<option value="' + s + '"' + (f.stage === s ? ' selected' : '') + '>Étape ' + s + '</option>'; }).join('');
    var list = '<ul class="pl-stages">' + [1, 2, 3].map(function (s) {
      return '<li><b>Étape ' + s + '</b> · ' + stageTxt(s) + ' · ≈ ' + PL.fmtMin(PL.avgDaySec(s, 5)) + ' par jour</li>';
    }).join('') + '</ul>';
    return '<div class="pl-setbody">' +
      '<div class="j-field"><label class="j-lab" for="pl-start">Premier jour du recueil</label>' +
      '<input id="pl-start" class="j-sel" type="date" value="' + esc(f.start) + '">' +
      '<span class="j-fhint">Le jour du plan suit ta journée (du réveil au réveil suivant), pas minuit. Un jour sauté reste vide : rien à rattraper. Les tests libres déjà faits restent gardés, en dehors du recueil.</span></div>' +
      '<div class="pl-quick"><button type="button" class="btn secondary" data-act="pl-start-today">Aujourd’hui</button><button type="button" class="btn secondary" data-act="pl-start-tomorrow">Demain</button></div>' +
      '<button type="button" class="btn primary" id="pl-start-go" data-act="pl-start-go"' + (si.disabled ? ' disabled' : '') + '>' + si.btn + '</button>' +
      '<span class="j-hint left" id="pl-start-hint" role="status" aria-live="polite">' + esc(si.hint) + '</span>' +
      '<hr class="pl-sep">' +
      '<div class="j-field"><label class="j-lab" for="pl-stage">Étape du PVT-B</label>' +
      '<select id="pl-stage" class="j-sel">' + opts + '</select>' + list +
      '<span class="j-fhint">Décidé le 14/10 : étape 1 pendant 4 semaines sans y toucher, puis revue à la semaine 4 ; c’est toi qui choisis la suite. L’appli ne change jamais l’étape toute seule. Durées moyennes : estimées (à ajuster).</span></div>' +
      '<button type="button" class="btn primary" id="pl-stage-go" data-act="pl-stage-go"' + (gi.same ? ' disabled' : '') + '>' + gi.btn + '</button>' +
      '<span class="j-hint left" id="pl-stage-hint" role="status" aria-live="polite">' + esc(gi.hint) + '</span>' +
      pHistoryHtml(tk) +
      '<hr class="pl-sep">' +
      '<p class="j-fhint">Graine du mélange : <b>' + pcfg.seed + '</b>. Tirée une seule fois, jamais changée ; elle est dans le fichier de sauvegarde. Avec la même graine et le même premier jour, on retrouve exactement le même calendrier.</p>' +
      '</div>';
  }
  function vPlan() {
    if (!pform) pform = pFormNew();
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">Kioo Cycle</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Plan des tests</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">' + (PL.NDAYS / 7) + ' semaines · ' + PL.TEST_R.length + ' moments de test par jour' + (pcfg.start && pcfg.start < PL.FROM5 ? ' (7 avant le ' + pDayMonth(PL.FROM5) + ')' : '') + '</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      (pnotice ? '<p class="j-ok" role="status">' + esc(pnotice) + '</p>' : '') +
      '<div id="pl-top" style="display:flex;flex-direction:column;gap:12px"></div>' +
      '<details class="j-det" id="pl-set"' + (pform.open ? ' open' : '') + '><summary>Réglages du plan</summary>' + pSettingsHtml(todayInfo().tk) + '</details></main>';
  }
  function pOpen() { psel = null; pform = pFormNew(); pnotice = ''; go('plan'); }
  function pNav(name) {
    var info = todayInfo(), ps = pState(info.tk), i = pIndex(ps);
    if (name === 'pl-today') psel = null;
    else psel = Math.max(0, Math.min(PL.NDAYS - 1, i + (name === 'pl-next' ? 1 : -1)));
    pRefreshDay(name);
  }
  function pSync() { // met à jour boutons et phrases sans toucher aux champs (une saisie en cours reste intacte)
    if (!pform) return;
    var si = pStartInfo(), gi = pStageInfo(todayInfo().tk);
    var b = $('pl-start-go'), h = $('pl-start-hint'), b2 = $('pl-stage-go'), h2 = $('pl-stage-hint');
    if (b) { b.disabled = si.disabled; b.textContent = si.btn; }
    if (h) h.textContent = si.hint;
    if (b2) { b2.disabled = gi.same; b2.textContent = gi.btn; }
    if (h2) h2.textContent = gi.hint;
  }
  function pOnField(t) {
    if (!pform) return;
    if (t.id === 'pl-start') { pform.start = t.value; pform.startConfirm = false; pSync(); }
    else if (t.id === 'pl-stage') { pform.stage = int(t.value, 1, 3) || 1; pform.stageConfirm = false; pSync(); }
  }
  function pQuickStart(which) {
    var tk = todayInfo().tk;
    pform.start = which === 'tomorrow' ? addDays(tk, 1) : tk; pform.startConfirm = false;
    var inp = $('pl-start');
    if (inp) inp.value = pform.start;
    pSync();
  }
  function pStartGo() {
    var si = pStartInfo();
    if (!si.ok || si.same) return;
    if (si.need && !pform.startConfirm) { pform.startConfirm = true; pSync(); return; }
    pcfg.start = pform.start;
    var saved = pSave();
    pform.startConfirm = false; pform.open = true; psel = null;
    pnotice = 'Premier jour enregistré : ' + pDateText(pcfg.start, true) + '.' + (saved ? '' : ' Attention : l’appareil refuse d’enregistrer ce réglage.');
    render();
  }
  function pStageGo() {
    var tk = todayInfo().tk, gi = pStageInfo(tk);
    if (gi.same) return;
    if (!pform.stageConfirm) { pform.stageConfirm = true; pSync(); return; }
    var tom = addDays(tk, 1), target = pform.stage;
    pcfg.stages = pcfg.stages.filter(function (s) { return s[0] <= tk; }); // un choix à venir est remplacé ; l'historique passé reste
    if (pStageOn(tk) !== target) pcfg.stages.push([tom, target, Date.now()]);
    var saved = pSave();
    pform.stageConfirm = false; pform.stage = pStageOn(tom); pform.open = true;
    pnotice = (pStageOn(tk) === target ? 'Changement annulé : l’étape ' + target + ' reste en vigueur.' : 'Étape ' + target + ' choisie, en vigueur dès demain.') +
      (saved ? '' : ' Attention : l’appareil refuse d’enregistrer ce réglage.');
    render();
  }

  /* ---------- Accueil ---------- */
  function programLine(s) {
    return s.chain ? '<div class="t2"><b>Au programme</b> : ' + (s.needR ? 'Relevé · ' : '') + esc(stepsText(s.chain.todo)) + ' (≈ ' + PL.fmtMin(s.chain.sec) + (s.part ? ', le reste' : '') + ')</div>' : '';
  }
  function momentCard(info, ps) {
    if (ps.open >= 0) {
      var m = PLAN[ps.open], s = ps.list[ps.open];
      return '<div class="j-now"><span class="j-kick">MAINTENANT</span>' +
        '<div class="t1">' + esc(momCardLabel(m, s)) + '</div>' +
        '<div class="t2">' + esc(momCardGoal(m)) + '</div>' + programLine(s) +
        '<div class="t3">Fenêtre ' + s.win + ' · prévu à ' + s.at + '</div>' +
        '<div class="btns"><button type="button" class="btn primary" data-act="moment" data-id="' + ps.open + '">' + actionLabel(s) + '</button>' +
        (s.chain && !s.part && !s.skip ? '<button type="button" class="btn ghost" data-act="skip-open" data-id="' + ps.open + '">Pas ce moment</button>' : '') + '</div></div>';
    }
    if (ps.next >= 0) {
      var n = PLAN[ps.next], sn = ps.list[ps.next];
      return '<div class="j-now"><span class="j-kick">PROCHAIN MOMENT</span>' +
        '<div class="t1">' + esc(momLabel(n, sn)) + '</div>' +
        '<div class="t3">Dès ' + L.fmt(info.wake + n.r - WIN.before) + ' · prévu à ' + sn.at + '</div>' + programLine(sn) +
        '<div class="t2">Rien à faire maintenant. Un relevé libre reste possible à tout moment.</div></div>';
    }
    return '<div class="j-now"><span class="j-kick">AUJOURD’HUI</span><div class="t1">Les moments du jour sont passés</div>' +
      '<div class="t2">Un relevé libre reste possible à tout moment. Il n’y a rien à rattraper.</div>' +
      (ps.list.some(function (x) { return x.canNote; }) ? '<div class="t2">Un moment passé sans test ? Tu peux noter pourquoi dans « Plan du jour », plus bas (facultatif).</div>' : '') + '</div>';
  }
  function actCard(a, info) {
    var min = (info.now.getTime() - a.ts) / 60000;
    return '<div class="j-now act"><span class="j-kick">ACTIVITÉ EN COURS</span><div class="t1">' + esc(a.name) + '</div>' +
      '<div class="t3">Depuis ' + clockOf(a.ts) + ' · ' + durText(min) + '</div>' +
      (min >= LONG_ACT_MIN ? '<div class="t2">Toujours en cours ? Tu peux la terminer à l’heure qui convient.</div>' : '') +
      '<div class="btns"><button type="button" class="btn primary" data-act="act-end">Terminer</button>' +
      '<button type="button" class="btn secondary" data-act="edit" data-id="' + esc(a.id) + '">Modifier</button></div></div>';
  }
  // F2 : la question reste dans le Journal jusqu'à la réponse (Oui : on choisit l'heure du début ; Non : notée tout de suite)
  function qCard(i, s, info) {
    var m = PLAN[i], inWin = info.rel <= m.r + WIN.after;
    return '<div class="j-now creuxq"><span class="j-kick">QUESTION · ' + rLabel(m.r) + '</span><div class="t1">Ressens-tu un creux ?</div>' +
      (isQT(m) && s.needT && inWin ? '<div class="t2">Le test vient juste après.</div>' : '') +
      '<div class="t3">' + (inWin ? 'Prévue à ' + s.at + ' · fenêtre ' + s.win : 'Prévue à ' + s.at + ', restée sans réponse : ta réponse sera notée « tardive »') + '</div>' +
      '<input type="text" class="j-sel" id="j-qnote-' + i + '" maxlength="500" placeholder="Note libre (facultatif)" aria-label="Note libre (facultatif)" value="' + esc(qDraft[i] || '') + '">' +
      '<div class="btns"><button type="button" class="btn primary" data-act="q-yes" data-id="' + i + '">Oui</button>' +
      '<button type="button" class="btn secondary" data-act="q-no" data-id="' + i + '">Non</button></div></div>';
  }
  function qCards(info, ps) {
    if (currentCreux()) return ''; // un creux est ouvert : c'est la carte du creux qui pose la question
    return ps.list.map(function (s, i) { return s.qpend ? qCard(i, s, info) : ''; }).join('');
  }
  function creuxCard(c, info) {
    var min = (info.now.getTime() - c.ts) / 60000, ask = creuxAsk(c);
    return '<div class="j-now creux"><span class="j-kick">CREUX EN COURS</span><div class="t1">Depuis ' + clockOf(c.ts) + '</div>' +
      '<div class="t3">' + durText(min) + ' · début : ' + esc(creuxOriginTxt(c)) + '</div>' +
      '<div class="t3">Terminé automatiquement à ' + clockOf(c.ts + CREUX_MAX) + ' (4 h au maximum)</div>' +
      (ask ? '<div class="t1">' + (min >= CREUX_MIN ? 'Ça fait plus d’une heure. Ton creux est-il terminé ?' : 'Question de ' + rLabel(PLAN[creuxQMoment(c)].r) + ' : ton creux est-il terminé ?') + '</div>' : '') +
      '<div class="btns"><button type="button" class="btn primary" data-act="creux-end">Terminer le creux</button>' +
      (ask ? '<button type="button" class="btn secondary" data-act="creux-later">Pas encore</button>'
           : '<button type="button" class="btn secondary" data-act="edit" data-id="' + esc(c.id) + '">Modifier</button>') + '</div></div>';
  }
  /* ---------- Mon réveil : Ma nuit, Relevé du matin, Mantra (e5, 20/11) ---------- */
  // Un bouton en haut du Journal ouvre un écran à 3 icônes. « Ma nuit » remplace la carte « Coucher » du matin (le coucher de la veille y est demandé s'il n'a pas été noté) et ajoute
  // la qualité du sommeil, « reposé » et le souvenir des rêves : ressenti déclaré, rien de mesuré. « Relevé du matin » lance le relevé de R+30 min (avec la première pensée du matin).
  // « Mantra » affiche le texte de l'utilisateur : il reste sur l'appareil (localStorage + fichier de sauvegarde) et n'est JAMAIS écrit dans le code (le site est public).
  var mantra = '', mForm = null, night = null;
  function loadMantra() { try { var m = localStorage.getItem(KEY_MANTRA); mantra = typeof m === 'string' ? m.slice(0, 10000) : ''; } catch (e) { mantra = ''; } }
  function saveMantra() {
    try { if (mantra) localStorage.setItem(KEY_MANTRA, mantra); else localStorage.removeItem(KEY_MANTRA); return true; } catch (e) { return false; }
  }
  function nightOf(tk) { var r = null; entries.forEach(function (e) { if (e.kind === 'nuit' && e.day === tk && (!r || e.ts > r.ts)) r = e; }); return r; }
  function bedOfDay(day) { // le coucher du soir d'avant le réveil du jour `day`
    var prev = addDays(day, -1), best = null;
    entries.forEach(function (x) { if (x.kind === 'coucher' && x.day === prev && (!best || x.ts > best.ts)) best = x; });
    return best;
  }
  function wakeBtn(info, ps) {
    var bits = [], s0 = ps.list[0];
    if (info.rel < 600) { // le matin seulement (les 10 premières heures, comme l'ancienne carte « Coucher »)
      if (!nightOf(info.tk)) bits.push('ma nuit à noter');
      if (s0 && s0.kind === 'open') bits.push('relevé du matin à faire');
      else if (s0 && s0.kind === 'soon') bits.push('relevé du matin à ' + s0.at);
    }
    var sub = bits.length ? bits.join(' · ') : 'Ma nuit · relevé du matin · mantra';
    return '<button type="button" class="btn secondary j-wakebtn" data-act="wake-open"><span class="j-wk1"><span class="j-wke" aria-hidden="true">☀️</span><span class="j-wkt"><b>Mon réveil</b>' +
      '<span class="j-wks">' + esc(sub.charAt(0).toUpperCase() + sub.slice(1)) + '</span></span></span><span class="j-rk">' + ICON_CHEV + '</span></button>';
  }
  function vWake() {
    var info = todayInfo(), ps = slotStates(info), s0 = ps.list[0], nd = nightOf(info.tk);
    var rel = !s0 ? '' : s0.kind === 'done' ? s0.status : s0.kind === 'open' ? 'À faire maintenant' : s0.kind === 'soon' ? 'Prévu à ' + s0.at : 'Passé · un relevé libre reste possible';
    var tiles = [
      ['night-open', '🌙', 'Ma nuit', nd ? 'Notée · ' + clockOf(nd.ts) : 'À noter'],
      ['morning-releve', '☀️', 'Relevé du matin', rel],
      ['mantra-open', '🙏', 'Mantra', mantra ? 'À lire' : 'À écrire']
    ];
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">Kioo Cycle</span></div>' +
      '<h1 tabindex="-1">Mon réveil</h1><p class="sub">Réveil à ' + L.fmtClock(info.wake) + ' · ta nuit, ton ressenti, ton mantra</p></header>' +
      '<main style="padding-top:14px;gap:14px">' + (notice ? '<p class="j-ok" role="status">' + esc(notice) + '</p>' : '') +
      '<div class="j-tiles">' + tiles.map(function (t) {
        return '<button type="button" class="j-tile" data-act="' + t[0] + '"><span class="ic" aria-hidden="true">' + t[1] + '</span><span class="tn">' + t[2] + '</span><span class="ts">' + esc(t[3]) + '</span></button>';
      }).join('') + '</div>' +
      '<p class="j-p">Ce que tu notes ici est du ressenti déclaré : l’appli le garde tel quel, sans l’interpréter.</p></main>';
  }
  function openWake() { pendingDel = null; ret = 'home'; go('wake'); }
  // « Relevé du matin » : le moment R+30 min s'il est ouvert ; sinon un relevé du matin libre (mêmes questions), sauf s'il est déjà fait.
  function openMorningReleve() {
    var s0 = slotStates(todayInfo()).list[0];
    if (s0 && s0.kind === 'done') { notice = 'Ton relevé du matin est déjà fait (' + s0.status.replace(/^Fait · /, '') + '). Tu peux écrire une note à tout moment.'; render(); return; }
    ret = 'wake';
    if (s0 && s0.kind === 'open' && s0.needR) flow = newFlow({ slot: 0, mode: 'releve' });
    else flow = newFlow({ mode: 'releve', qs: 'morning' });
    go('feel');
  }

  // Ma nuit : un formulaire (aussi pour corriger une nuit depuis Reflet). Le coucher n'est demandé que pour la nuit d'aujourd'hui, et seulement s'il n'est pas déjà noté.
  function openNight(id, from) {
    var info = todayInfo(), e = id ? entries.filter(function (x) { return x.id === id && x.kind === 'nuit'; })[0] : nightOf(info.tk);
    if (id && !e) return;
    var day = e ? e.day : info.tk, c = bedOfDay(day), bedLast = null;
    entries.forEach(function (x) { if (x.kind === 'coucher') bedLast = x; });
    night = { id: e ? e.id : null, day: day, sq: e && e.sq ? String(e.sq) : '', rest: e && e.rest ? String(e.rest) : '', dream: e && e.dream ? String(e.dream) : '', dtext: e && e.dtext ? e.dtext : '',
              bed: '', bedNew: day === info.tk && !c, bedKnown: c, bedHint: bedLast ? clockInput(bedLast.ts) : '', error: '' };
    ret = from === 'history' ? 'history' : 'wake';
    go('night');
  }
  function nightValid() {
    var n = night;
    if (!n) return false;
    if (n.bed && !validClock(n.bed)) return false;
    var has = !!(n.sq || n.rest || n.dream || (n.dtext || '').trim());
    return n.id ? has : (has || !!(n.bedNew && n.bed));
  }
  function nightSelect(q, cur) {
    return '<div class="j-field"><label class="j-lab" for="n-' + q.id + '">' + esc(q.ask) + '</label><select id="n-' + q.id + '" class="j-sel" data-night="' + q.id + '"><option value="">Choisir…</option>' +
      q.opts.map(function (o, i) { return '<option value="' + (i + 1) + '"' + (String(i + 1) === String(cur) ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
  }
  function vNight() {
    var n = night;
    if (!n) { screen = 'wake'; return vWake(); }
    var bed = n.bedKnown ? '<p class="j-fhint" style="font-size:13px">Coucher déjà noté : ' + clockOf(n.bedKnown.ts) + ' (' + esc(bedText(n.bedKnown)) + ').</p>'
      : n.bedNew ? '<div class="j-field"><label class="j-lab" for="n-bed">À quelle heure t’es-tu couché hier soir ?</label>' +
          '<input id="n-bed" class="j-sel" type="time" data-night="bed" value="' + esc(n.bed) + '" aria-label="Heure du coucher hier soir">' +
          '<span class="j-fhint">De mémoire, c’est très bien. Laisse vide si tu ne veux pas le noter' + (n.bedHint ? ' (ton dernier coucher noté : ' + n.bedHint + ')' : '') + '.</span></div>'
      : '<p class="j-fhint" style="font-size:13px">Aucun coucher noté pour cette nuit.</p>';
    return formHeader('Ma nuit', n.id ? 'Corrige ce que tu as noté' : 'Hier soir → ce matin · tout est facultatif') +
      '<main style="padding-top:14px;gap:16px">' + formError() +
      '<section class="j-sec"><h2>COUCHER</h2>' + bed + '</section>' +
      '<section class="j-sec"><h2>SOMMEIL</h2>' + nightSelect(NIGHT_Q[0], n.sq) + nightSelect(NIGHT_Q[1], n.rest) + '</section>' +
      '<section class="j-sec"><h2>RÊVES</h2>' + nightSelect(NIGHT_Q[2], n.dream) +
      '<div class="j-field"><label class="j-lab" for="n-dtext">Ce dont tu te souviens (facultatif)</label>' +
      '<textarea id="n-dtext" class="j-ta mid" maxlength="1000" data-night="dtext" placeholder="Un rêve, une image, une sensation…">' + esc(n.dtext) + '</textarea></div></section>' +
      '<div class="chips"><span class="chip hy">Ressenti déclaré</span></div>' +
      '<p class="j-p">Qualité du sommeil et « reposé » : questions du Consensus Sleep Diary (traduction de Claude, non validée). Souvenir des rêves : tes mots. Le temps passé au lit n’est pas du sommeil mesuré : il comprend le temps pour s’endormir et les éveils de la nuit.</p></main>' +
      formFoot('night-go', n.id ? 'Enregistrer les changements' : 'Enregistrer ma nuit', nightValid());
  }
  function doNight() {
    var n = night;
    if (!n || !nightValid()) return;
    var now = Date.now(), wake = L.getWake(), msgs = [], e;
    if (n.bedNew && n.bed) {
      var bts = tsFromClock(n.bed, now), b = baseEntry('coucher', bts, wake), d = dateOfKey(n.day);
      d.setMinutes(wake);
      b.memo = true; // noté après coup
      if (d.getTime() > bts && d.getTime() - bts < 20 * 3600e3) b.wakeTs = d.getTime(); // le réveil de ce matin
      entries.push(b);
      msgs.push('Coucher noté à ' + clockOf(bts));
    }
    var sq = int(n.sq, 1, 5), rs = int(n.rest, 1, 5), dr = int(n.dream, 1, 4), tx = (n.dtext || '').trim().slice(0, 1000);
    if (sq !== null || rs !== null || dr !== null || tx) {
      e = n.id ? entries.filter(function (x) { return x.id === n.id; })[0] : null;
      if (!e) { e = baseEntry('nuit', now, wake); entries.push(e); }
      ['sq', 'rest', 'dream', 'dtext'].forEach(function (k) { delete e[k]; });
      if (sq !== null) e.sq = sq;
      if (rs !== null) e.rest = rs;
      if (dr !== null) e.dream = dr;
      if (tx) e.dtext = tx;
      msgs.push(n.id ? 'Nuit modifiée' : 'Nuit notée');
    }
    night = null;
    afterSave(msgs.join(' · ') + '.');
  }

  // Mantra : mise en forme à l'affichage seulement, le texte enregistré n'est jamais modifié.
  // Une ligne vide sépare deux groupes (plus d'espace) ; un retour à la ligne = une ligne ; une phrase qui finit par . ! ? … et que suit une majuscule passe à la ligne.
  function mantraHtml(t) {
    var groups = String(t || '').replace(/\r\n?/g, '\n').split(/\n[ \t]*\n+/), out = '';
    for (var i = 0; i < groups.length; i++) {
      var lines = groups[i].replace(/([.!?…])[ \t]+(?=[A-ZÀ-ÖØ-Ý«“"])/g, '$1\n').split('\n'), ps = '';
      for (var k = 0; k < lines.length; k++) { var ln = lines[k].replace(/^\s+|\s+$/g, ''); if (ln) ps += '<p>' + esc(ln) + '</p>'; }
      if (ps) out += '<div class="mg">' + ps + '</div>';
    }
    return out;
  }
  function vMantra() {
    var ed = !!mForm, head = '<header class="subhead"><div class="top">' + back('home', 'Mon réveil') + '<span class="brand">Kioo Cycle</span></div><h1 tabindex="-1">Mantra</h1>';
    if (!ed) {
      return head + '<p class="sub">Ton texte · sur cet appareil seulement</p></header>' +
        '<main style="padding-top:14px;gap:12px">' + (notice ? '<p class="j-ok" role="status">' + esc(notice) + '</p>' : '') +
        '<section class="j-card j-mcard"><div class="j-mantra" id="j-mantra">' + mantraHtml(mantra) + '</div></section>' +
        '<button type="button" class="btn secondary" data-act="mantra-edit" style="margin:0 5px;width:calc(100% - 10px)">Modifier</button></main>';
    }
    return head + '<p class="sub">' + (mantra ? 'Modifie ton texte' : 'Écris ou colle ton texte, une seule fois') + '</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<div class="j-field" style="margin:0 5px"><label class="j-lab" for="m-text">Ton mantra ou ton affirmation</label>' +
      '<textarea id="m-text" class="j-ta" style="margin:0;width:100%;min-height:300px" maxlength="10000" data-mantra="1" placeholder="Colle ici ton mantra…">' + esc(mForm.text) + '</textarea></div>' +
      '<p class="j-p">Il reste sur cet appareil et dans ton fichier de sauvegarde. Il n’est écrit nulle part dans le code de l’appli, qui est public.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="m-go" data-act="mantra-save"' + (mForm.text.trim() ? '' : ' disabled') + '>Enregistrer</button>' +
      '<button type="button" class="btn ghost" data-act="mantra-cancel">Annuler</button></div>';
  }
  function openMantra() { pendingDel = null; ret = 'wake'; mForm = mantra ? null : { text: '' }; go('mantra'); }
  function saveMantraForm() {
    if (!mForm || !mForm.text.trim()) return;
    mantra = mForm.text.trim().slice(0, 10000);
    var ok = saveMantra();
    mForm = null;
    notice = ok ? 'Mantra enregistré sur cet appareil.' : 'Attention : l’appareil refuse d’enregistrer ce texte.';
    go('mantra');
  }

  function setHtml(el, html) { // ne réécrit pas si rien n'a changé (évite de perdre un champ en cours de saisie)
    if (el && el.getAttribute('data-sig') !== html) { el.innerHTML = html; el.setAttribute('data-sig', html); }
  }
  function updateHome() {
    var top = $('j-top');
    if (!top) return;
    var info = todayInfo(), ps = slotStates(info), ca = currentAct(), cc = currentCreux();
    var typing = document.activeElement && top.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
    setHtml($('j-wake'), wakeBtn(info, ps));
    if (!typing) setHtml(top, bkCard(bkInfo()) + qCards(info, ps) + momentCard(info, ps) + (cc ? creuxCard(cc, info) : '') + (ca ? actCard(ca, info) : ''));
    setHtml($('j-planbox'), pBoxHtml(info));

    var nDone = ps.list.filter(function (s) { return s.kind === 'done'; }).length, nShown = 0;
    $('j-plansum').textContent = 'Plan du jour · ' + NPLAN + ' moments · ' + nDone + ' fait' + (nDone > 1 ? 's' : '');
    $('j-points').innerHTML = ps.list.map(function (s, i) {
      if (s.off) return ''; // moment retiré du plan (R+7h) : ni ligne ni numéro
      nShown++;
      var c = s.chain, extra = '';
      if (c) extra += '<span class="j-ptg">' + esc((PLAN[i].kind !== 'test' ? 'Relevé · ' : '') + stepsText(c.steps)) + (s.part ? ' · ' + c.nDone + ' sur ' + c.total + ' faits' : '') + '</span>';
      if (s.qt) extra += '<span class="j-ptg">Question du creux : ' + esc(s.qst) + '</span>';
      if (s.freeQ) extra += '<span class="j-ptg">Compté d’après ton signalement libre du creux</span>';
      if (s.skip && s.skip.text) extra += '<span class="j-ptg j-ptw">« ' + esc(s.skip.text) + ' »</span>';
      if (s.canNote) extra += '<button type="button" class="j-link j-ptl" data-act="skip-open" data-id="' + i + '">Noter pourquoi</button>';
      return '<li class="j-pt ' + s.kind + '"><div class="j-n">' + (s.kind === 'done' ? ICON_CHECK : nShown) + '</div>' +
        '<div class="j-ptx"><span class="j-ptn">' + rLabel(PLAN[i].r) + ' · ' + momKind(PLAN[i], s) + '</span><span class="j-ptg">' + esc(momGoal(PLAN[i])) + '</span>' + extra + '</div>' +
        '<div class="j-pts"><span class="j-st">' + s.status + '</span><span class="j-win">' + s.at + '</span></div></li>';
    }).join('');

    // e4c : plus de 3 dernières entrées ici (elles sont dans l'onglet Historique) ; un bloc « À ranger » (notes sans catégorie, disparaît à 0) et le dernier test
    var nNone = 0, lastT = null, k;
    entries.forEach(function (e) { if (e.kind === 'note' && noteTid(e) === 'none') nNone++; });
    for (k = entries.length - 1; k >= 0; k--) if (entries[k].kind === 'test') { lastT = entries[k]; break; }
    setHtml($('j-hist'),
      (nNone ? '<div class="j-sect j-gap"><span class="j-kick">À RANGER</span></div>' +
        '<button type="button" class="btn secondary j-rank" data-act="rank"><span>' + plural(nNone, 'note sans catégorie', 'notes sans catégorie') + '</span><span class="j-rk">Ranger ' + ICON_CHEV + '</span></button>' : '') +
      (lastT ? '<div class="j-sect j-gap"><span class="j-kick">DERNIER TEST</span></div>' + histCard(lastT, info.tk, false, 'last') : ''));
  }

  /* ---------- Écrans ---------- */
  function back(act, label) { return '<button type="button" class="back" data-act="' + act + '">' + ICON_BACK + label + '</button>'; }

  function vHome() {
    return '<header>' +
      '<div class="top"><span class="brand">Kioo Cycle</span><span class="module">Module Corps</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Journal</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">' + NPLAN + ' moments par jour, calés sur ton réveil (R+ = heures depuis le réveil)</p></header>' +
      '<main>' +
      (storageOk ? '' : '<p class="j-warn" role="alert">Cet appareil refuse d’enregistrer les données (navigation privée ?). Sauvegarde ton fichier avant de quitter.</p>') +
      ((notice || cutMsg) ? '<p class="j-ok" role="status">' + esc(notice || cutMsg) + '</p>' : '') +
      '<div id="j-wake"></div>' +
      '<div id="j-top" style="display:flex;flex-direction:column;gap:10px"></div>' +
      '<div id="j-planbox"></div>' +
      '<details class="j-det" id="j-plan"><summary id="j-plansum"></summary><ol class="j-points" id="j-points"></ol></details>' +
      '<div class="j-sect"><span class="j-kick">À TOUT MOMENT</span></div>' +
      '<div class="j-grid">' +
      '<button type="button" class="btn primary wide" data-act="releve">Relevé libre</button>' +
      '<button type="button" class="btn secondary" data-act="act-start">Activité</button>' +
      '<button type="button" class="btn secondary" data-act="instant">Instant</button>' +
      '<button type="button" class="btn secondary" data-act="test-libre">Test libre</button>' +
      '<button type="button" class="btn secondary" data-act="meal">Repas</button>' +
      '<button type="button" class="btn secondary" data-act="note">' + ICON_PEN + 'Note</button>' +
      '<button type="button" class="btn secondary" data-act="' + (currentCreux() ? 'creux-end' : 'creux-start') + '">' + (currentCreux() ? 'Terminer le creux' : 'Creux') + '</button></div>' +
      '<div id="j-hist"></div>' +
      '<button type="button" class="btn secondary j-small" data-act="bed">Noter un coucher ' + ICON_CHEV + '</button>' +
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
    var d = new Date(), ph = phaseAt(L.mod(minOf(d) - L.getWake())), ok = feelComplete(), qs = qsetOf(flow), defs = qs.map(feel3Def);
    var both = flow.mode === 'both', m = flow.slot != null ? PLAN[flow.slot] : null, ch = flow.chain, single = qs.length === 1;
    var mod = ch ? rLabel(m.r) + ' · relevé puis tests' : (both ? 'Étape 1 sur 2' : (m ? rLabel(m.r) + ' · prévu' : (flow.qs ? 'Relevé du matin' : 'Relevé libre')));
    var corps = defs.filter(function (f) { return f.group === 'corps'; }), esprit = defs.filter(function (f) { return f.group === 'esprit'; });
    var sub = single ? (ch || both ? 'Le test vient juste après.' : 'Une seule question.') : 'Comment te sens-tu là, maintenant (ces 5 dernières minutes) ?'; // une humeur de fond n'est pas « les 5 dernières minutes »
    var morning = flow.slot === 0 || flow.qs === 'morning' && flow.slot == null;
    return '<header class="subhead"><div class="top">' + back('home', ret === 'wake' ? 'Mon réveil' : 'Journal') + '<span class="module">' + mod + '</span></div>' +
      '<h1 tabindex="-1">' + (single ? 'Une seule question' : 'Ressenti') + '</h1><p class="sub">' + sub + '</p>' +
      (single ? '' : '<div class="nowline"><span class="dot" style="background:' + ph.color + '"></span><span>' + L.fmtClock(minOf(d)) + ' · ' + esc(ph.name) + '</span></div>') + '</header>' +
      '<main style="gap:18px;padding-top:14px">' +
      (corps.length ? '<section class="j-sec"><h2>CORPS · LE VAISSEAU</h2>' + corps.map(function (f) { return feelField(f, 'flow'); }).join('') + '</section>' : '') +
      (esprit.length ? '<section class="j-sec"><h2>ESPRIT · LE PILOTE</h2>' + esprit.map(function (f) { return feelField(f, 'flow'); }).join('') + '</section>' : '') +
      '<details class="j-det" id="j-detbox"' + (flow.detail ? ' open' : '') + '><summary>Ajouter un détail (facultatif)</summary>' +
      '<textarea id="j-detail" class="j-ta mid" maxlength="500" placeholder="Ce qui explique ce ressenti : mal dormi, café, douleur…" aria-label="Détail du ressenti">' + esc(flow.detail) + '</textarea></details>' +
      (morning ? '<section class="j-sec"><h2>PREMIÈRE PENSÉE DU MATIN</h2><div class="j-field"><label class="j-lab" for="j-thought">Ce qui t’est venu en premier (facultatif)</label>' +
        '<textarea id="j-thought" class="j-ta mid" maxlength="1000" placeholder="Ta première pensée en te réveillant…" aria-label="Première pensée du matin">' + esc(flow.thought) + '</textarea>' +
        '<span class="j-fhint">Elle est aussi gardée dans tes notes, catégorie « Première pensée ».</span></div></section>' : '') + '</main>' +
      '<div class="foot"><button type="button" class="btn primary" id="j-next" data-act="' + (ch ? 'chain-feel' : (both ? 'intro' : 'save-releve')) + '"' + (ok ? '' : ' disabled') + '>' +
      (ch ? 'Suivant · ' + STEP_NAME[ch.steps[0]] : (both ? 'Suivant : le test' : 'Enregistrer le relevé')) + '</button>' +
      '<span class="j-hint" id="j-feelhint">' + feelHint(ok, both) + '</span></div>';
  }
  function feelHint(ok, both) {
    var n = qsetOf(flow).length;
    return ok ? (flow.chain ? 'Le relevé est gardé, puis viennent les tests' : (both ? 'Étape suivante : 3 minutes de test' : 'Prêt à enregistrer')) : (n === 1 ? 'La réponse est nécessaire' : 'Les ' + n + ' réponses sont nécessaires');
  }

  function vIntro() {
    var m = flow.slot != null ? PLAN[flow.slot] : null, both = flow.mode === 'both';
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : finIntro(false);
    return '<header class="subhead"><div class="top">' + (both ? back('feel', 'Ressenti') : (m ? back('home', 'Journal') : back('tests', 'Tests'))) +
      '<span class="module">' + (both ? 'Étape 2 sur 2' : (m ? slotTag(m) : finTag())) + '</span></div>' +
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
    return '<header><span class="module" style="display:block">' + (both ? 'Étape 2 sur 2 · fin du test' : 'Fin du test' + chainTag()) + '</span>' +
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
        '<p class="lead" style="font-size:14px;line-height:1.5;color:var(--text)">' + esc(feelWords3(flow.feel)) + '</p>' +
        (flow.detail.trim() ? '<p style="font-size:13px;color:var(--muted)">' + esc(flow.detail.trim()) + '</p>' : '') + '</section>' : '') +
      '<p class="j-p">Un seul test ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot">' +
      (enough ? '<button type="button" class="btn primary" data-act="save">' + saveTxt(both ? 'Enregistrer le relevé et le test' : 'Enregistrer le test') + '</button>'
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
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="module">' + finTag() + '</span></div>' +
      '<h1 tabindex="-1">Choisir un test</h1><p class="sub">' + (flow.fin ? 'Pour marquer la fin du creux · enregistré hors des moments du plan' : 'À tout moment · enregistré hors des moments du plan') + '</p></header>' +
      '<main style="padding-top:14px;gap:10px">' +
      (flow.fin && flow.finMsg ? '<p class="j-ok" role="status">' + esc(flow.finMsg) + '</p>' : '') +
      TESTS.map(function (t) {
        var l = lastPass(t.id);
        return '<button type="button" class="j-pick" data-act="test-pick" data-id="' + t.id + '">' +
          '<span class="p1"><span>' + esc(t.name) + '</span><small>' + esc(t.dur) + '</small></span>' +
          '<span class="p2">' + esc(t.cog) + '</span>' +
          '<span class="p3">' + (l ? 'Dernier passage : ' + esc(dayText(l.day, tk)).toLowerCase() + ', ' + clockOf(l.ts) : 'Jamais passé') + '</span></button>';
      }).join('') +
      '<p class="j-p">' + (flow.fin ? 'Un test de fin de creux ne valide aucun moment du plan. Il est gardé avec l’étiquette « fin de creux », à part des tests prévus et libres, et compté dans ton numéro de passage, mais il n’entre ni dans ta référence ni dans la lecture par heure.'
                            : 'Un test libre ne valide aucun moment du plan. Il est gardé et compté dans ton numéro de passage, mais il n’entre ni dans ta référence ni dans la lecture par heure.') + '</p></main>';
  }

  /* ---------- Tests : descripteurs ---------- */
  // Un descripteur par test enregistré (Symbol Search, Rotation span, Hand Swype, Flanker, Memory List). Les écrans de Symbol Search sont écrits à part (version validée le 15/10) ;
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
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : finIntro(true);
    if (!m && L.mod(minOf(new Date()) - L.getWake()) < 120) msg += ' Avant R+2h, il sera noté « avant R+2h » (l’inertie du réveil peut durer 2 à 4 h : Jewett 1999).';
    var demoTop = [0, 3], demoFoil = [0, 5];
    return '<header class="subhead"><div class="top">' + (m ? back('home', 'Journal') : back('tests', 'Tests')) +
      '<span class="module">' + (m ? slotTag(m) : finTag()) + '</span></div>' +
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
      '<div class="chips"><div class="chips" style="margin:0"><span class="chip main">Établi · Hernandez 2023</span><span class="chip hy">À ajuster · symboles et réglages de Kioo Cycle</span></div></div>' +
      '<p class="j-p">Le protocole (20 essais, carte identique à choisir) vient de l’étude lue. Les neuf symboles sont dessinés pour Kioo Cycle : ce ne sont pas ceux de l’étude. Durée de ≈ ' + SS.estSec + ' s estimée d’après l’étude, non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.</p>' +
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
    if (libre) h += '<p>' + finRef() + '</p>';
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
    return '<header><span class="module" style="display:block">Fin du test' + chainTag() + '</span><h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' + clockOf(r.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics"><div><b>' + (r.med === null ? '—' : Math.round(r.med) + '<small> ms</small>') + '</b><span>Temps médian, réponses justes</span></div>' +
      '<div><b>' + r.correct + '<small> / ' + r.n + '</small></b><span>Réponses justes</span></div>' +
      '<div><b>' + r.used + '<small> / ' + r.n + '</small></b><span>Essais comptés dans le temps</span></div></div>' +
      '<p class="j-fhint" style="color:var(--text)"><b>Chiffre principal :</b> le temps médian des réponses justes (le premier chiffre). Plus bas = plus rapide.</p>' +
      '<p class="j-fhint">Durée du passage : ' + ssDur(r.durationMs) + ' (estimée : ≈ ' + SS.estSec + ' s)</p>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, ' + ssPlural(count, 'test', 'tests') + ')</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + (INPUT_TXT[r.input] || r.input) + '</span>' +
      '<span class="chip hy">' + (libre ? finChip() : prevuTxt()) + (early ? ' · avant R+2h' : '') + '</span></div></section>' +
      (r.acc < SS.minAcc ? '<p class="j-ok">Sous 70 % de réponses justes, l’étude lue écartait le passage de ses analyses.</p>' : '') +
      ssRefHtml(r, libre) +
      '<section class="j-card"><dl class="ss-facts" style="margin:0"><div><dt>Justes hors des temps comptés (moins de 0,2 s ou plus de 5 s)</dt><dd>' + r.excluded + '</dd></div></dl></section>' +
      ssTableHtml(r.trials) +
      '<details class="j-det"><summary>Comment lire ce résultat</summary>' +
      '<div class="ss-sec"><h3>Le chiffre qui compte · Établi</h3><p>Temps médian des réponses justes, en ms. Plus bas = plus rapide. L’étude lue suit le temps des réponses justes ; L’appli le résume par la médiane (choix à ajuster). À côté : les réponses justes. Sous 70 % de justes, l’étude écartait le passage.</p></div>' +
      '<div class="ss-sec"><h3>Comparé à quoi · À ajuster</h3><p>À toi-même : la médiane de tes passages précédents sur ce test, faits aux moments du plan, avec les mêmes réglages, sur cet appareil. Les tests libres ne comptent pas. Rien n’est affiché avant 3 passages.</p></div>' +
      '<div class="ss-sec"><h3>Pas de barème · Établi</h3><p>Dans les sources lues, aucune norme ni seuil « bon / mauvais » pour ce test. L’appli n’en invente pas. Aucun seuil de santé non plus : un professionnel décide.</p></div>' +
      '<div class="ss-sec"><h3>Prudence · Établi</h3><p>Un passage seul est bruité. L’ICC de 0,71 classe des personnes entre elles. Pour suivre une même personne, la variation fiable d’un passage à l’autre est de 0,41 à 0,53 (Sliwinski 2018, deux types de tâches confondus, résumé seul). Un passage hors de la fourchette n’est donc pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.</p></div>' +
      '<div class="ss-sec"><h3>Précision · Hypothèse à mesurer</h3><p>Le chronomètre part à l’image où les cartes s’affichent : précision d’une image environ (17 ms), non vérifiée sur ton téléphone.</p></div></details>' +
      '<p class="j-p">Un seul passage ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="ss-save">' + saveTxt('Enregistrer le test') + '</button>' +
      '<button type="button" class="btn ghost" data-act="discard">Ne pas enregistrer</button></div>';
  }

  /* ---------- Écrans communs : Rotation span, Hand Swype, Flanker ---------- */
  // Le déroulé, les consignes, la référence et la lecture du résultat suivent les maquettes du 14/10. Les classes « ss-* » sont les styles partagés des tests.
  function secHtml(title, label, text) { return '<div class="ss-sec"><h3>' + title + ' · ' + label + '</h3><p>' + text + '</p></div>'; }
  function metric(v, label) { return '<div><b>' + v + '</b><span>' + label + '</span></div>'; }
  function factRow(dt, dd) { return '<div><dt>' + dt + '</dt><dd>' + dd + '</dd></div>'; }
  function factsCard(rows) { return '<section class="j-card"><dl class="ss-facts" style="margin:0">' + rows.join('') + '</dl></section>'; }
  function tTable(heads, rows, note, what) {
    return '<details class="j-det"><summary>Voir les ' + (what || 'essais') + ' en tableau</summary><div class="ss-tabwrap"><table class="ss-tab"><thead><tr>' +
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
    chipMain: 'Établi · Hakun 2023', chipHy: 'À ajuster · entraînement et réglages de Kioo Cycle',
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
           above: 'Plus de flèches dans le bon ordre que dans tous tes passages précédents.', below: 'Moins de flèches dans le bon ordre que dans tous tes passages précédents.',
           axLo: '← moins de flèches', axHi: 'plus de flèches →', none: 'Pas de chiffre principal pour ce passage.' },
    mainTxt: 'les flèches dans le bon ordre (le premier chiffre). Plus haut = mieux retenu.',
    metricsCls: 'wrap',
    metrics: function (r) {
      var s = r.sc;
      return metric(s.cp + '<small> / ' + s.max + '</small>', 'Flèches dans le bon ordre') +
        metric(s.dl + '<small> / ' + s.max + '</small>', 'Bon sens, bon ordre, mauvaise taille') +
        metric(s.dp + '<small> / ' + s.max + '</small>', 'Bon sens, bon ordre, taille ignorée') +
        metric(s.ap + '<small> / ' + s.max + '</small>', 'Retrouvées, ordre ignoré') + metric(s.lc + '<small> / ' + s.lt + '</small>', 'Lettres justes');
    },
    facts: function (r) {
      var s = r.sc, rows = r.rec.trials.map(function (t, i) {
        var cells = s.marks[i].map(function (m) {
          return '<i class="rs-m ' + m + '" title="' + (m === 'cp' ? 'dans le bon ordre' : m === 'ap' ? 'retrouvée ailleurs' : 'non retrouvée') + '"></i>';
        }).join('');
        return '<div class="rs-row"><span>Essai ' + (i + 1) + '</span><span class="rs-cells">' + cells + '</span></div>';
      }).join('');
      return '<section class="j-card"><div class="rs-marks">' + rows + '</div>' +
        '<div class="rs-leg"><span><i class="rs-m cp"></i> bon ordre</span><span><i class="rs-m ap"></i> retrouvée ailleurs</span><span><i class="rs-m no"></i> non retrouvée</span></div>' +
        '<dl class="ss-facts" style="margin:0">' + factRow('Temps moyen par lettre', s.avgRt === null ? '·' : (s.avgRt / 1000).toFixed(1).replace('.', ',') + ' s') + '</dl></section>';
    },
    read: function () {
      return secHtml('Le chiffre qui compte', 'Établi', 'Flèches dans le bon ordre (bon sens et bonne taille), sur 15. Plus haut = mieux retenu. C’est le score partiel du protocole. Les autres lignes du résultat sont des repères à côté : flèches de bon sens dans le bon ordre avec une mauvaise taille, puis avec la taille ignorée (ce second compte contient le premier chiffre), flèches retrouvées ailleurs, lettres jugées, temps par lettre. Les deux comptes sur la taille sont des comptes faits par Kioo Cycle à partir de tes réponses : ils ne font pas partie du score du protocole.') +
        readCompare() +
        secHtml('Pas de barème', 'Établi', 'Dans les sources lues, aucune norme ni seuil « bon / mauvais » pour cette version téléphone. L’appli n’en invente pas. Aucun seuil de santé non plus : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Chez les étudiants de l’étude (Hakun 2023), la part de variation d’un passage à l’autre qui est un vrai changement, et non du hasard, est de 0,37 (0,48 d’un jour à l’autre), sur une échelle où 1 = tout est fiable. Environ 57 % de la variation du score vient de l’erreur de mesure. Un passage hors de la fourchette n’est donc pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.') +
        secHtml('Sources', 'Établi', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC9919550/', 'Hakun et al. 2023, version téléphone') + ' · ' + link('https://www.millisecond.com/library/v7/rotationspantask/rotationspantask/rotationspantask.manual', 'Manuel du Rotation Span, Millisecond') + '. Non lus : Kane et al. 2004 et Shah et Miyake 1996, le protocole d’origine.');
    },
    histLine: function (p) {
      // Les passages déjà enregistrés ne sont pas revérifiés au chargement : si les essais manquent ou sont abîmés, on retombe sur les chiffres gardés, sans faire planter l'historique.
      var good = p && Array.isArray(p.trials) && p.trials.length > 0 && p.trials.every(function (t) { return t && Array.isArray(t.a) && Array.isArray(t.s) && Array.isArray(t.l); });
      if (!good) return typeof (p && p.cp) === 'number' && typeof p.max === 'number' ? p.cp + '/' + p.max + ' flèches dans le bon ordre' : 'résultat non lisible';
      var s = rsSummary(p.trials);
      return s.cp + '/' + s.max + ' flèches dans le bon ordre (' + s.dp + '/' + s.max + ' sans la taille)';
    },
    pack: function (r) { return CL.rs(r.rec); } };

  TD.hs = { name: 'Hand Swype', cog: 'Flexibilité', estSec: HS.estSec, pracDur: '≈ 30 s', cfg: HS_CFG,
    chipMain: 'Établi · NeuroUX, Paolillo 2024', chipHy: 'À ajuster · vaisseaux et réglages de Kioo Cycle',
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
    about: 'Le protocole lu (des mains défilent, la consigne « pointent » ou « se déplacent » change, le test s’arrête après 60 s) vient de NeuroUX (Paolillo 2024). La source ne donne ni le nombre d’éléments, ni la vitesse, ni le rythme des changements, ni la distance du balayage, ni la façon de mesurer le temps : ce sont des choix de Kioo Cycle, et les éléments sont des vaisseaux dessinés pour Kioo Cycle (pas des mains). Le temps part de l’image où les éléments s’affichent et comprend le geste : il ne se compare pas à ceux de l’étude. Durée fixe de 60 s. On te compare à toi-même, <b>sur le même appareil et avec la même façon de répondre</b> (doigt, souris ou clavier).',
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
        factRow('Écart : changée moins répétée (lecture de Kioo Cycle)', costTxt(s.swCost)),
        factRow('Façon de répondre', esc(INPUT_TXT[r.input] || r.input))]);
    },
    table: function (r) {
      var rows = hsExpand(r.rec.trials).map(function (t, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + (t.rule === 'point' ? 'pointent' : 'avancent') + '</td><td>' + (i === 0 ? '—' : (t.sw ? 'oui' : 'non')) + '</td><td>' + HS_WORD[t.ans] + '</td><td>' + HS_WORD[t.resp] + '</td><td>' + t.rt + ' ms</td></tr>';
      }).join('');
      return tTable(['#', 'Règle', 'Chgt', 'Attendu', 'Choix', 'Temps'], rows, 'Règle : ce que suit la consigne. Chgt : la consigne a changé depuis l’essai d’avant.');
    },
    read: function () {
      return secHtml('Le chiffre qui compte', 'À ajuster', 'Temps médian des réponses justes, en ms. Plus bas = plus rapide. Le temps part de l’apparition des éléments et s’arrête quand ton doigt a parcouru 28 px (ou à la touche, sur ordinateur). À lire avec les erreurs : la source suit les deux (ICC 0,86 pour le temps, 0,86 pour les erreurs). Un temps plus court avec plus d’erreurs peut vouloir dire que tu as seulement été plus vite, pas plus juste : c’est la lecture de Kioo Cycle, pas un chiffre lu. Pas de score qui les mélange. À côté, pour information : le nombre d’essais faits (la durée est fixe, donc il varie) et l’écart de temps entre un essai où la consigne change et un essai où elle se répète ; ce dernier est la lecture de Kioo Cycle, aucun chiffre lu pour ce test. Dans l’étude, un passage dont le temps médian est sous 0,5 s était écarté (effort supposé faible) ; L’appli le garde, avec ses erreurs.') +
        readCompare(' et avec la même façon de répondre (doigt, souris ou clavier)') +
        secHtml('Pas de barème', 'Établi', 'L’étude lue ne donne ni barème ni seuil pour ce test. Elle écrit que les chercheurs sont invités à utiliser leur propre groupe témoin pour comparer. Ses moyennes par âge décrivent un groupe, pas toi, et ne valent pas pour Kioo Cycle (autre mesure du temps, autres images). Aucun seuil de santé : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Dans l’étude, le temps d’une même personne varie en moyenne de 340 ms (écart-type) d’un passage à l’autre, pour un temps moyen de 1 809 ms. Les ICC (0,86) classent des personnes entre elles : ils ne disent pas si ton propre temps varie de façon fiable. D’un passage à l’autre, les erreurs baissent et le temps monte : les premiers passages peuvent bouger. Dans ce qui a été lu, aucun lien significatif avec l’heure n’est rapporté pour ce test. Un passage hors de la fourchette n’est pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte. Chiffres repris de la page par extraction automatique du texte, pas revérifiés sur les tableaux eux-mêmes.') +
        readPrec('les éléments s’affichent') +
        secHtml('Sources', 'Établi', link('https://www.jmir.org/2024/1/e51978', 'Paolillo et al. 2024, NeuroUX, J Med Internet Res 26:e51978') + '. Non lus : les trois annexes de l’article (fichiers DOCX), ses tableaux et figures vus seulement par extraction du texte, la page de l’éditeur de NeuroUX. Pas de description plus détaillée du protocole de Hand Swype trouvée.');
    },
    histLine: function (p) { return (p.med === null ? 'pas de mesure' : ssMs(p.med)) + ' · ' + ssPlural(p.errors, 'erreur', 'erreurs') + ' · ' + ssPlural(p.n, 'essai', 'essais'); },
    pack: function (r) { return CL.hs(r.rec); } };

  TD.fl = { name: 'Flanker', cog: 'Inhibition', estSec: FL.estSec, pracDur: '≈ 30 s', cfg: FL_CFG,
    chipMain: 'Établi · NIH Toolbox, Zelazo 2014', chipHy: 'À ajuster · réglages de Kioo Cycle',
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
    about: 'Le protocole (flèche du milieu à juger, entourée de flèches qui pointent du même côté ou à l’opposé) vient du NIH Toolbox (Zelazo 2014) ; la fixation, les pauses et l’entraînement viennent du manuel du Flanker ABCD sur téléphone. Le nombre d’essais (40), le temps limite (3 s) et le calcul du temps (médiane des réponses justes de 100 ms ou plus) sont des choix de Kioo Cycle. Durée de ≈ ' + ssDur(FL.estSec * 1000) + ' estimée d’après les pauses, non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.',
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
      return secHtml('Le chiffre qui compte', 'À ajuster', 'Temps médian des essais incongruents, en ms : ceux où les flèches autour pointent à l’opposé de la cible. Plus bas = plus rapide. Seules les réponses justes de 100 ms ou plus comptent. À côté : les réponses justes, et le coût d’interférence (incongruent moins congruent). Ce choix est celui de Kioo Cycle. Le temps incongruent est plus stable (ICC 0,66) mais mêle vitesse générale et inhibition. Le coût isole mieux l’inhibition mais est plus fragile (ICC 0,4). Le chiffre à suivre reste à décider : L’appli garde de quoi calculer les deux.') +
        readCompare() +
        secHtml('Pas de barème', 'Établi', 'Le NIH Toolbox standardise son score (moyenne 10, écart-type 3) avec ses propres normes. Elles situent une personne parmi la population : elles ne disent pas à quelle heure tu es à ton meilleur, et elles ne s’appliquent pas à Kioo Cycle (autres durées, autres images). Aucun autre barème ni seuil dans les sources lues, et aucun seuil de santé : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Les ICC lus (0,83 pour le score NIH) classent des personnes entre elles : ils ne disent pas si ton propre temps varie de façon fiable d’un passage à l’autre, chiffre non lu pour ce test. L’effet d’apprentissage est petit (d = 0,27), mais les premiers passages peuvent bouger. Ces chiffres valent pour la cible au milieu. Un passage hors de la fourchette n’est pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.') +
        readPrec('la cible s’affiche') +
        secHtml('Sources', 'Établi', link('https://pmc.ncbi.nlm.nih.gov/articles/PMC4601803', 'Zelazo et al. 2014, NIH Toolbox') + ' · ' + link('https://www.millisecond.com/library/v7/flankertask/abcdarrowflankertest/abcdarrowflankertest_smartphone/abcdarrowflankertest_smartphone.manual', 'Manuel du Flanker ABCD sur téléphone') + ' · ' + link('https://link.springer.com/article/10.3758/s13428-017-0935-1', 'Hedge, Powell et Sumner 2018') + '. Non lus : Eriksen et Eriksen 1974 (l’origine du test), la figure 2 de Zelazo (les durées), les tableaux de Hedge.');
    },
    histLine: function (p) { return (p.medIncong === null ? 'pas de mesure' : 'incongruent ' + ssMs(p.medIncong)) + ' · ' + p.correct + '/' + p.n + ' justes'; },
    pack: function (r) { return CL.fl(r.rec); } };

  TD.ml = { name: 'Memory List', cog: 'Mémoire épisodique', estSec: ML.estSec, noPractice: true, cfg: ML_CFG,
    chipMain: 'Établi · NeuroUX, Paolillo 2024', chipHy: 'À ajuster · mots et tâche intercalaire de Kioo Cycle',
    demo: function () { return ''; },
    steps: function () {
      return [ML.nT + ' mots s’affichent ensemble pendant ' + (ML.study / 1000) + ' secondes. Retiens-les.',
        'Une courte tâche visuelle de ' + (ML.odd / 1000) + ' secondes : touche la forme différente des trois autres.',
        'Des mots arrivent un par un. Touche « Oui » si le mot était dans la liste, « Non » s’il est nouveau' + (DEVICE === 'ord' ? ' (ou touches ← et →)' : '') + '. La moitié sont nouveaux.',
        'Pas d’entraînement : les mots ne se répètent pas à vide. Une autre liste de mots est utilisée à chaque passage. ' +
          (DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.')];
    },
    about: 'Le protocole (12 mots affichés ensemble pendant 30 s, une autre tâche entre-temps, puis 24 mots à reconnaître, « Oui » ou « Non ») vient de NeuroUX (Paolillo 2024). La source ne donne ni les mots, ni le délai, ni la façon de répondre : les 98 listes de mots, la tâche intercalaire de 30 s (« touche la forme différente »), l’absence de temps limite et la mesure du temps de réponse sont des choix de Kioo Cycle. Les listes ne sont pas appariées selon des normes (fréquence, imagerie). Durée de ≈ ' + ssDur(ML.estSec * 1000) + ' estimée d’après la source (environ 1 min de reconnaissance) et les pauses, non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.',
    introNote: function () {
      var last = mlToday();
      if (!last) return '';
      return 'Tu as déjà vu une liste de mots aujourd’hui (à ' + clockOf(last) + '). Dans l’étude lue, il n’y avait qu’un passage par jour, avec des listes différentes, et le score baissait d’un passage à l’autre (pente de −0,175 mot ; les auteurs évoquent une interférence entre les listes) : un passage de plus peut fausser la mesure. On ne sait pas ce que donnent plusieurs passages par jour. Rien n’est bloqué : une autre liste sera utilisée, et le passage sera noté comme un passage de plus dans la journée.';
    },
    fig: function (r) { return r.sc.score; }, figE: function (p) { return p.score; },
    ref: { fmt: function (v) { return fmtN1(v) + ' / 24'; },
           diff: function (d) { var a = Math.abs(d); return a < 0.05 ? 'aucun écart' : fmtN1(a) + (a >= 2 ? ' mots' : ' mot') + (d > 0 ? ' de plus' : ' de moins'); },
           above: 'Plus de mots bien classés que dans tous tes passages précédents.', below: 'Moins de mots bien classés que dans tous tes passages précédents.',
           axLo: '← moins de mots', axHi: 'plus de mots →', none: 'Pas de chiffre principal pour ce passage.' },
    mainTxt: 'les mots bien classés sur 24 (le premier chiffre) : les mots de la liste reconnus plus les mots nouveaux refusés. Plus haut = mieux reconnu.',
    metrics: function (r) {
      var s = r.sc;
      return metric(s.score + '<small> / ' + s.n + '</small>', 'Mots bien classés') + metric(s.hits + '<small> / ' + s.nT + '</small>', 'Mots de la liste reconnus') +
        metric(s.fa + '<small> / ' + s.nD + '</small>', 'Mots nouveaux acceptés à tort');
    },
    facts: function (r) {
      var s = r.sc, rec = r.rec, forgot = [], falseA = [];
      mlExpand(rec.items).forEach(function (t) { if (!t.ok) (t.target ? forgot : falseA).push(t.word); });
      return '<section class="j-card"><dl class="ss-facts" style="margin:0">' +
        factRow('Mots nouveaux refusés', s.cr + ' / ' + s.nD) +
        factRow('Temps de réponse médian (lecture de Kioo Cycle)', ssMs(s.medRt)) +
        factRow('Tâche intercalaire : formes trouvées (non notée)', rec.odd.ok + ' / ' + rec.odd.n) +
        factRow('Liste de mots utilisée', 'n° ' + rec.listNo + ' sur ' + ML_BANK.length) +
        factRow('Mots déjà vus à un passage précédent', rec.seen + ' / ' + s.n) + '</dl>' +
        '<p class="j-fhint"><b>Mots de la liste non reconnus :</b> ' + (forgot.length ? esc(forgot.join(', ')) : 'aucun') + '</p>' +
        '<p class="j-fhint"><b>Mots nouveaux acceptés à tort :</b> ' + (falseA.length ? esc(falseA.join(', ')) : 'aucun') + '</p>' +
        (rec.seen > 0 ? '<p class="j-fhint">' + (rec.reprise ? 'Toute la banque de listes a déjà servi : cette liste est une reprise. ' : 'Cette liste reprend des mots déjà vus à un passage précédent, chacun dans le même rôle. ') +
          'L’effet sur le score n’est pas connu (hypothèse à mesurer) : le nombre de mots déjà vus est gardé avec le passage pour pouvoir le traiter à part.</p>' : '') + '</section>';
    },
    table: function (r) {
      var rows = mlExpand(r.rec.items).map(function (t, i) {
        return '<tr><td>' + (i + 1) + '</td><td>' + esc(t.word) + '</td><td>' + (t.target ? 'liste' : 'nouveau') + '</td><td>' + (t.resp === 'Y' ? 'oui' : 'non') + '</td><td>' + (t.ok ? 'juste' : 'erreur') + '</td><td>' + t.rt + ' ms</td></tr>';
      }).join('');
      return tTable(['#', 'Mot', 'Type', 'Réponse', 'Résultat', 'Temps'], rows, 'Type : « liste » = un mot de la liste du début, « nouveau » = un mot ajouté.', 'mots');
    },
    read: function () {
      return secHtml('Le chiffre qui compte', 'Établi', 'Le score, sur 24 : les mots de la liste que tu as reconnus (« Oui ») plus les mots nouveaux que tu as refusés (« Non »). C’est le score de la source. Plus haut = mieux reconnu. À côté, pour information : les mots reconnus sur 12, les mots nouveaux acceptés à tort sur 12 et le temps de réponse médian. Ce dernier est la lecture de Kioo Cycle : la source ne le donne pas.') +
        readCompare(', avec des listes de mots qui tournent d’un passage à l’autre (elles comptent comme des versions parallèles, comme dans l’étude)') +
        secHtml('Les listes de mots', 'À ajuster', '98 listes écrites pour Kioo Cycle (12 mots à retenir + 12 mots nouveaux), prises dans l’ordre, une par passage, tests libres compris. Les 68 premières n’ont aucun mot en commun. Les suivantes reprennent 21 à 24 mots déjà vus, chacun dans le même rôle et au moins 48 passages plus tard. Un mot déjà vu garde peut-être un peu de familiarité : l’effet n’est pas connu (aucune source trouvée), c’est pourquoi le nombre de mots déjà vus est gardé avec chaque passage. Les listes ne sont pas appariées selon la fréquence des mots ni leur imagerie. Si un mot ne te dit rien, note-le : il sera remplacé.') +
        secHtml('Pas de barème', 'Établi', 'L’étude lue ne donne ni norme ni seuil pour ce test, et le score n’y est pas lié à l’âge de façon significative. Sa moyenne (19,8 sur 24) décrit un groupe, pas toi, avec d’autres mots : ce n’est pas un objectif. Aucun seuil de santé : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Dans l’étude, le score d’une même personne varie en moyenne de 2,1 mots (écart-type) d’un passage à l’autre : un écart de deux mots d’un moment à l’autre n’a rien d’exceptionnel. Le score baisse aussi au fil des passages (pente de −0,175, unité exacte non revérifiée), ce que les auteurs rapprochent d’une interférence entre les listes successives. Lecture de Kioo Cycle, non sourcée : répété plusieurs fois dans la journée, ce test risque de baisser pour cette seule raison, ce qui ressemblerait à un effet d’heure ; dans l’étude, il n’y avait qu’un passage par jour. Un passage hors de la fourchette n’est pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.') +
        secHtml('Chiffres lus', 'Établi', 'ICC du score 0,762 sur 5 passages avec des listes différentes (type d’ICC non précisé), score moyen 19,8 sur 24, écart-type entre personnes 2,3 ; 393 adultes de 20 à 79 ans. Chiffres repris de la page par extraction automatique du texte, pas revérifiés sur les tableaux eux-mêmes.') +
        readPrec('le mot s’affiche') +
        secHtml('Sources', 'Établi', link('https://www.jmir.org/2024/1/e51978', 'Paolillo et al. 2024, NeuroUX, J Med Internet Res 26:e51978') + '. Non lus : les trois annexes de l’article (fichiers DOCX), ses tableaux et figures vus seulement par extraction du texte, la page de l’éditeur de NeuroUX. Pas de description plus détaillée du protocole de la Memory List trouvée, ni la liste de ses mots.');
    },
    histLine: function (p) { return p.score + '/' + p.n + ' bien classés · ' + p.hits + '/' + ML.nT + ' reconnus · ' + p.fa + '/' + ML.nD + ' faux · liste n° ' + p.listNo; },
    pack: function (r) { return CL.ml(r.rec); } };

  RUN.rs = { practice: rsRunPractice, test: rsRunTest };
  RUN.hs = { practice: hsRunPractice, test: hsRunTest };
  RUN.fl = { practice: flRunPractice, test: flRunTest };
  RUN.ml = { practice: null, test: mlRunTest }; // pas d'entraînement

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
    if (libre) h += '<p>' + finRef() + '</p>';
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
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : finIntro(true);
    if (!m && L.mod(minOf(new Date()) - L.getWake()) < 120) msg += ' Avant R+2h, il sera noté « avant R+2h » (l’inertie du réveil peut durer 2 à 4 h : Jewett 1999).';
    return '<header class="subhead"><div class="top">' + (m ? back('home', 'Journal') : back('tests', 'Tests')) +
      '<span class="module">' + (m ? slotTag(m) : finTag()) + '</span></div>' +
      '<h1 tabindex="-1">' + esc(td.name) + '</h1><p class="sub">' + esc(td.cog) + ' · ≈ ' + est + '</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      (notice ? '<p class="j-warn" role="alert">' + esc(notice) + '</p>' : '') +
      (td.introNote && td.introNote() ? '<p class="j-ok" role="status">' + esc(td.introNote()) + '</p>' : '') +
      td.demo() +
      '<section class="j-card"><h2 class="j-kick">AVANT DE COMMENCER</h2><ol class="j-list">' + td.steps().map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></section>' +
      '<div class="chips"><div class="chips" style="margin:0"><span class="chip main">' + td.chipMain + '</span><span class="chip hy">' + td.chipHy + '</span></div></div>' +
      '<p class="j-p">' + td.about + '</p>' +
      '<p class="j-p">' + esc(msg) + '</p></main>' +
      '<div class="foot">' +
      (td.noPractice
        ? '<button type="button" class="btn primary" data-act="' + id + '-test">Commencer (≈ ' + est + ')</button>'
        : practiced
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
    return '<header><span class="module" style="display:block">Fin du test' + chainTag() + '</span><h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' + clockOf(r.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics' + (td.metricsCls ? ' ' + td.metricsCls : '') + '">' + td.metrics(r) + '</div>' +
      '<p class="j-fhint" style="color:var(--text)"><b>Chiffre principal :</b> ' + td.mainTxt + '</p>' +
      '<p class="j-fhint">Durée du passage : ' + ssDur(r.durationMs) + ' (estimée : ≈ ' + ssDur(td.estSec * 1000) + ')</p>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, ' + ssPlural(count, 'test', 'tests') + ')</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + (INPUT_TXT[r.input] || r.input) + '</span>' +
      '<span class="chip hy">' + (libre ? finChip() : prevuTxt()) + (early ? ' · avant R+2h' : '') + '</span></div></section>' +
      tRefHtml(id, r, libre) +
      td.facts(r) +
      (td.table ? td.table(r) : '') +
      '<details class="j-det"><summary>Comment lire ce résultat</summary>' + td.read() + '</details>' +
      '<p class="j-p">Un seul passage ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="' + id + '-save">' + saveTxt('Enregistrer le test') + '</button>' +
      '<button type="button" class="btn ghost" data-act="discard">Ne pas enregistrer</button></div>';
  }

  // Rappel de la note d'origine sur l'écran « Note libre » quand on crée « à partir de… » (depuis le 19/11, e2).
  function fromOf() { return noteFrom ? entries.filter(function (x) { return x.id === noteFrom && x.kind === 'note'; })[0] || null : null; }
  function fromBox() {
    var o = fromOf();
    if (!o) return '';
    return '<div class="j-from" id="j-from"><div class="alab">À partir de · ' + esc(lkName(o)) + ' · ' + esc(whenText(o.ts)) + '</div><div class="t">' + esc(o.text) + '</div></div>';
  }
  function vNote() {
    var d = new Date(noteTs), ph = phaseAt(relAt(noteTs, L.getWake())), fo = fromOf();
    return '<header class="subhead"><div class="top">' + backHome() + '<span class="brand">Kioo Cycle</span></div>' +
      '<h1 tabindex="-1">Note libre</h1><p class="sub">' + (fo ? 'Une note liée à celle-ci, rangée avec l’heure' : 'Ce qui te vient en tête, rangé avec l’heure') + '</p>' +
      '<div class="nowline"><span class="dot" style="background:' + ph.color + '"></span><span>' + L.fmtClock(minOf(d)) + ' · ' + esc(ph.name) + '</span></div></header>' +
      '<main style="padding-top:14px;gap:8px">' + fromBox() + '<div class="j-nt" id="j-nt">' + noteTypeBlock(noteSel) + '</div><label for="j-note" class="j-lab" style="margin:0 5px">Ta note</label>' +
      '<textarea id="j-note" class="j-ta" placeholder="Écris ce qui te vient…" maxlength="5000">' + esc(noteText) + '</textarea></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="j-notesave" data-act="save-note"' + (noteText.trim() ? '' : ' disabled') + '>Enregistrer la note</button>' +
      '<span class="j-hint">Elle apparaîtra dans Reflet, avec l’heure et la phase</span></div>';
  }

  /* ---------- Formulaires : activité, repas, coucher, modification ---------- */
  function fld(label, inner, hint) {
    return '<div class="j-field"><label class="j-lab">' + label + '</label>' + inner + (hint ? '<span class="j-fhint">' + hint + '</span>' : '') + '</div>';
  }
  function timeIn(field, value, label) {
    return '<input class="j-sel" type="time" data-field="' + field + '" value="' + esc(value || '') + '" aria-label="' + esc(label) + '">';
  }
  function backHome() { return back('home', ret === 'history' ? 'Reflet' : ret === 'wake' ? 'Mon réveil' : 'Journal'); }
  function formHeader(title, sub) {
    return '<header class="subhead"><div class="top">' + backHome() + '<span class="brand">Kioo Cycle</span></div>' +
      '<h1 tabindex="-1">' + title + '</h1><p class="sub">' + sub + '</p></header>';
  }
  function formFoot(act, label, enabled) {
    return '<div class="foot"><button type="button" class="btn primary" id="f-go" data-act="' + act + '"' + (enabled ? '' : ' disabled') + '>' + label + '</button>' +
      '<button type="button" class="btn ghost" data-act="home">Annuler</button></div>';
  }
  function formError() { return form && form.error ? '<p class="j-warn" role="alert">' + esc(form.error) + '</p>' : ''; }

  function selKey(s) { return noteTypeOf(s.id).id + '|' + selSub(s); }
  function formValid() {
    if (!form) return false;
    switch (form.type) {
      case 'act-start': return !!form.name.trim() && validClock(form.time);
      case 'instant': return !!form.name.trim() && validClock(form.time);
      case 'act-end': return validClock(form.time);
      case 'creux-start': return validClock(form.time);
      case 'creux-end': return validClock(form.time);
      case 'meal': return !!form.text.trim() && validClock(form.time);
      case 'bed': return validClock(form.time);
      case 'edit':
        if (form.kind === 'activite') return !!form.name.trim() && validClock(form.time) && (form.end === '' || validClock(form.end));
        if (form.kind === 'repas') return !!form.text.trim() && validClock(form.time);
        if (form.kind === 'instant') return !!form.name.trim() && validClock(form.time);
        if (form.kind === 'creux') return validClock(form.time) && (form.end === '' || validClock(form.end));
        if (form.kind === 'note') return !!form.text.trim() && (form.text.trim() !== form.orig || selKey(form.sel) !== form.selOrig || (form.ans || '').trim() !== form.ansOrig || (form.att || '').trim() !== form.attOrig); // rien à enregistrer tant que le texte, la catégorie, la réponse et la note rattachée n'ont pas changé
        return validClock(form.time);
    }
    return false;
  }

  // Grandes touches : une par motif de la liste, puis « Autre… » (saisie libre, pas gardée dans la liste).
  function pickGrid(names, ph, label) {
    var cur = form.name.trim().toLowerCase();
    var btns = names.map(function (n) {
      var on = !form.other && cur === n.toLowerCase();
      return '<button type="button" class="j-pick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="pick" data-name="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');
    btns += '<button type="button" class="j-pick other' + (form.other ? ' on' : '') + '" aria-pressed="' + !!form.other + '" data-act="pick-other">Autre…</button>';
    return '<div class="j-picks">' + btns + '</div>' +
      (form.other ? '<input id="f-name" class="j-sel" type="text" maxlength="40" data-field="name" placeholder="' + esc(ph) + '" value="' + esc(form.name) + '" aria-label="' + esc(label) + '">' +
        '<span class="j-fhint">Elle n’est pas gardée dans ta liste. Pour la garder, ajoute-la dans Réglages.</span>' : '');
  }

  function vActStart() {
    var cur = currentAct();
    return formHeader('Activité', 'Une seule à la fois · le ressenti est facultatif') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      (cur ? '<p class="j-ok">« ' + esc(cur.name) + ' » est en cours depuis ' + clockOf(cur.ts) + ' : elle sera terminée à l’heure de début ci-dessous.</p>' : '') +
      '<section class="j-sec" style="gap:8px"><h2>QUELLE ACTIVITÉ ?</h2>' +
      (actNames.length ? '' : '<p class="j-fhint">Ta liste est vide. Ajoute des activités dans Réglages, ou écris-en une avec « Autre… ».</p>') +
      pickGrid(actNames, 'Nom de l’activité…', 'Nom de l’activité') + '</section>' +
      '<section class="j-sec">' + fld('Heure de début', timeIn('time', form.time, 'Heure de début'), 'Modifiable si tu as commencé plus tôt.') + '</section>' +
      feelBlock('as', 'Ressenti de début (facultatif)', form.feelOpen, 'f-feel') +
      '</main>' + formFoot('act-start-go', 'Commencer', formValid());
  }

  // Creux : texte « R+6h22 après le réveil de 8h10 » sous l'heure du début, et durée sous l'heure de fin (mis à jour à chaque frappe, sans redessiner l'écran).
  function creuxHint() {
    if (!form || !validClock(form.time)) return '';
    var ts = tsFromClock(form.time, Date.now()), fs = form.qslot == null ? freeSlotAt(ts, L.getWake()) : -1; // B : on prévient si ce signalement libre répondra « oui » à une question
    return rLabel(relAt(ts, L.getWake())) + ' après le réveil de ' + L.fmtClock(L.getWake()) + (fs >= 0 ? ' · compté comme « oui » à la question de ' + rLabel(PLAN[fs].r) : '');
  }
  // Heure de fin saisie -> instant : l'occurrence la plus récente (pas dans le futur) ; si elle tombe avant le début, la première après le début.
  function creuxEndTs(clock, c) {
    if (!c || !validClock(clock)) return null;
    var now = Date.now(), ts = tsFromClock(clock, now);
    if (ts < c.ts) { var alt = tsAfter(clock, c.ts); if (alt <= now + 10 * 60000) ts = alt; }
    return ts;
  }
  function creuxDurTxt() {
    var c = form && creuxById(form.id), ts = creuxEndTs(form && form.time, c);
    return ts === null || ts < c.ts ? '—' : durText((ts - c.ts) / 60000);
  }
  function creuxLive() {
    if (!form) return;
    var el;
    if (form.type === 'creux-start' && (el = $('f-chint'))) el.textContent = creuxHint();
    if (form.type === 'creux-end' && (el = $('f-cdur'))) el.textContent = creuxDurTxt();
  }
  function vCreuxStart() {
    return formHeader('Début du creux', form.qslot != null && PLAN[form.qslot] ? 'Ta réponse « oui » à la question de ' + rLabel(PLAN[form.qslot].r) : 'Un signalement libre, à n’importe quelle heure') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec">' + fld('Heure', timeIn('time', form.time, 'Heure du début du creux'), '<span id="f-chint">' + esc(creuxHint()) + '</span> · modifiable si tu notes après coup') +
      '<div class="j-field"><label class="j-lab" for="f-cnote">Note libre (facultatif)</label>' +
      '<textarea id="f-cnote" class="j-ta mid" data-field="note" maxlength="500" placeholder="Ce que tu ressens…">' + esc(form.note) + '</textarea></div></section>' +
      '<p class="j-p">Le creux reste ouvert jusqu’à ce que tu le termines, 4 h au maximum : au-delà, l’appli le termine toute seule. Après 1 h, elle te demande s’il est fini (dans l’appli, pas par une notification du téléphone). Il servira à comparer le creux ressenti au creux théorique de R+6h et R+7h (moyenne à ajuster). Étiquette : ressenti déclaratif.</p></main>' +
      formFoot('creux-start-go', 'Enregistrer le début', formValid());
  }
  function vCreuxEnd() {
    var c = creuxById(form.id);
    return formHeader('Terminer le creux', c ? 'Début ' + clockOf(c.ts) + ' · ' + esc(creuxOriginTxt(c)) : '') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec">' + fld('Heure de fin', timeIn('time', form.time, 'Heure de fin du creux'), 'Durée : <b id="f-cdur">' + esc(creuxDurTxt()) + '</b>. Fin déclarée, à peu près : tu peux la corriger, on s’en rend compte après coup.') +
      '<div class="j-field"><label class="j-lab" for="f-cnote">Note libre (facultatif)</label>' +
      '<textarea id="f-cnote" class="j-ta mid" data-field="note" maxlength="500" placeholder="Ce qui a changé, ce qui t’a aidé…">' + esc(form.note) + '</textarea></div></section>' +
      '<section class="j-card fin"><p class="lead"><b>Un test pour marquer la fin ?</b></p>' +
      '<p>Étiquette « fin de creux », à part des tests prévus et libres. Tu choisis le test juste après.</p></section></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="f-go2" data-act="creux-end-test"' + (formValid() ? '' : ' disabled') + '>Enregistrer et faire un test</button>' +
      '<button type="button" class="btn secondary" id="f-go" data-act="creux-end-go"' + (formValid() ? '' : ' disabled') + '>Enregistrer sans test</button></div>';
  }

  // Les touches de l'écran Instant : ta liste de Réglages, plus « Joint » s'il n'y est pas déjà (e4f ; rien n'est écrit dans ta liste).
  function instChoices() { return instNames.some(isJoint) ? instNames : instNames.concat([JOINT]); }
  // Rangée « Type du joint » (facultatif) : un seul type, retouché il s'enlève ; masquée tant que le nom n'est pas « Joint » (jtLive).
  function jtBlock() {
    var cur = form.jtype || '';
    return '<section class="j-sec j-jt" id="f-jt" style="gap:8px"' + (isJoint(form.name) ? '' : ' hidden') + '><h2>TYPE DU JOINT · FACULTATIF</h2>' +
      '<div class="j-picks" role="group" aria-label="Type du joint">' + JTYPES.map(function (t) {
        var on = cur === t[0];
        return '<button type="button" class="j-pick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="jtype" data-id="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<span class="j-fhint">Un seul type ; touche-le encore pour l’enlever. C’est ce que tu déclares : l’appli n’en tire aucune conclusion.</span></section>';
  }
  function jtLive() { var el = $('f-jt'); if (el && form) el.hidden = !isJoint(form.name); }
  function vInstant() {
    return formHeader('Instant', 'Un seul moment : une heure, pas de fin') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec" style="gap:8px"><h2>QUEL INSTANT ?</h2>' +
      (instNames.length ? '' : '<p class="j-fhint">Ta liste est vide. Ajoute des instants dans Réglages, ou écris-en un avec « Autre… ».</p>') +
      pickGrid(instChoices(), 'Nom de l’instant…', 'Nom de l’instant') + '</section>' +
      jtBlock() +
      '<section class="j-sec">' + fld('Heure', timeIn('time', form.time, 'Heure de l’instant'), 'Modifiable si tu notes après coup.') + '</section>' +
      '</main>' + formFoot('instant-go', 'Enregistrer', formValid());
  }

  // Réglages : les motifs (activités, instants) que tu veux pouvoir relever.
  function setSection(which, title, sub, names) {
    var rows = names.map(function (n) {
      return '<li class="j-mrow"><span class="n">' + esc(n) + '</span>' +
        '<button type="button" class="j-link" data-act="set-del" data-list="' + which + '" data-name="' + esc(n) + '" aria-label="Retirer ' + esc(n) + ' de la liste">Retirer</button></li>';
    }).join('');
    return '<section class="j-sec" style="gap:8px"><h2>' + title + '</h2><p class="j-p" style="margin:0">' + sub + '</p>' +
      (which === 'nt' && setNotice && setNoticeIn === 'nt' ? '<p class="j-ok" role="status" style="margin:0">' + esc(setNotice) + '</p>' : '') +
      '<div class="j-addrow"><input id="set-' + which + '" class="j-sel" type="text" maxlength="' + (which === 'nt' ? NT_LEN : 40) + '" data-set="' + which + '" placeholder="' + (which === 'nt' ? 'Nouvelle catégorie…' : 'Nouveau motif…') +
      '" value="' + esc(setDraft[which]) + '" aria-label="' + (which === 'nt' ? 'Nouvelle catégorie de note' : 'Nouveau motif, ' + (which === 'act' ? 'activité' : 'instant')) + '">' +
      '<button type="button" class="btn secondary" id="set-add-' + which + '" data-act="set-add" data-list="' + which + '"' + (setDraft[which].trim() ? '' : ' disabled') + '>Ajouter</button></div>' +
      (rows ? '<ul class="j-mlist">' + rows + '</ul>' : '<p class="j-fhint">Liste vide.</p>') + '</section>';
  }
  function styleBlock() {
    var cur = L.getStyle ? L.getStyle() : 'dessine';
    var btns = [['classique', 'Classique'], ['dessine', 'Dessiné']].map(function (t) {
      var on = cur === t[0];
      return '<button type="button" class="j-pick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="style-set" data-style="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    return '<section class="j-sec" style="gap:8px"><h2>STYLE</h2>' +
      '<p class="j-p" style="margin:0">Classique : sobre, traits fins. Dessiné : contours épais, couleurs vives. Ce choix reste sur cet appareil.</p>' +
      '<div class="j-picks">' + btns + '</div></section>';
  }
  function bkBlock() {
    var btns = BK_HOURS.map(function (h) {
      var on = bkHours === h;
      return '<button type="button" class="j-pick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="bk-hours" data-v="' + h + '">' + (h ? h + ' h' : 'Jamais') + '</button>';
    }).join('');
    return '<section class="j-sec" style="gap:8px"><h2>BANNIÈRE DE SAUVEGARDE</h2>' +
      '<p class="j-p" style="margin:0">Une bannière te prévient sur l’écran Cycle et sur le Journal quand ta dernière sauvegarde a plus de ce délai et qu’il y a du nouveau depuis. Les rappels du calendrier (Journal → Rappels) sont à part. Ce choix reste sur cet appareil.</p>' +
      '<div class="j-picks three">' + btns + '</div></section>';
  }
  function themeBlock() {
    var cur = L.getTheme ? L.getTheme() : 'jour';
    var btns = [['jour', 'Jour'], ['nuit', 'Nuit'], ['auto', 'Auto']].map(function (t) {
      var on = cur === t[0];
      return '<button type="button" class="j-pick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="theme-set" data-theme="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
    return '<section class="j-sec" style="gap:8px"><h2>APPARENCE</h2>' +
      '<p class="j-p" style="margin:0">Jour : fond clair. Nuit : fond sombre. Auto : suit le réglage de ton téléphone. Ce choix reste sur cet appareil.</p>' +
      '<div class="j-picks three">' + btns + '</div></section>';
  }
  function vSettings() {
    return '<header><div class="top"><span class="brand">Kioo Cycle</span><span class="module">Module Corps</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Réglages</h1></div>' +
      '<p class="sub">Les motifs et les catégories que tu veux relever</p></header>' +
      '<main>' + (setNotice && setNoticeIn !== 'nt' ? '<p class="j-ok" role="status">' + esc(setNotice) + '</p>' : '') +
      styleBlock() +
      themeBlock() +
      setSection('act', 'ACTIVITÉS · UN DÉBUT, UNE FIN', 'Elles apparaissent dans « Activité » (Journal → À tout moment).', actNames) +
      setSection('inst', 'INSTANTS · UNE SEULE HEURE', 'Ils apparaissent dans « Instant » (Journal → À tout moment). « Joint », avec son type facultatif, y est toujours proposé en plus.', instNames) +
      bkBlock() +
      setSection('nt', 'CATÉGORIES DE NOTE · LES TIENNES', 'Elles s’ajoutent aux catégories de départ (Questionnement, Affirmation, To-do, Constat, Idée, Synchronicité…) quand tu écris ou modifies une note (Journal → Note libre). Les sous-catégories se créent dans la note, avec « Autre sous-catégorie… ». ' + NT_LEN + ' caractères au plus, ' + NT_MAX + ' catégories au plus.', noteTypeNames) +
      '<p class="j-p">Retirer un motif ou une catégorie de la liste ne touche pas à ton historique : les entrées déjà notées gardent leur nom, et les notes déjà classées gardent leur catégorie.</p></main>';
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
      '<p class="j-p">L’appli en déduit ton « temps au lit » : du coucher au réveil. Ce n’est pas du sommeil mesuré (il comprend le temps pour s’endormir et les éveils de la nuit).</p></main>' +
      formFoot('bed-go', 'Enregistrer le coucher', formValid());
  }

  function vEdit() {
    var k = form.kind, title = { activite: 'Modifier l’activité', creux: 'Modifier le creux', repas: 'Modifier le repas', coucher: 'Modifier le coucher', instant: 'Modifier l’instant', note: 'Modifier la note' }[k], inner = '';
    if (k === 'note') {
      var ne = entries.filter(function (x) { return x.id === form.id; })[0];
      inner = '<div class="j-nt" id="j-nt">' + noteTypeBlock(form.sel) + '</div><div class="j-field"><label class="j-lab" for="f-text">Ta note</label>' +
        '<textarea id="f-text" class="j-ta" data-field="text" maxlength="5000">' + esc(form.text) + '</textarea></div>' +
        '<div id="j-ans">' + ansBlock() + '</div><div id="j-att">' + attBlock() + '</div>' +
        (ne ? '<p class="j-p">' + esc(noteDates(ne)) + '<br>L’heure de création ne change pas.</p>' : '');
    } else if (k === 'activite') {
      inner = '<section class="j-sec"><div class="j-field"><label class="j-lab" for="f-name">Activité</label>' +
        '<input id="f-name" class="j-sel" type="text" maxlength="40" data-field="name" value="' + esc(form.name) + '"></div>' +
        fld('Heure de début', timeIn('time', form.time, 'Heure de début')) +
        fld('Heure de fin', timeIn('end', form.end, 'Heure de fin'), 'Laisse vide si l’activité est encore en cours.') +
        '<div class="j-field"><label class="j-lab" for="f-comment">Commentaire</label>' +
        '<textarea id="f-comment" class="j-ta mid" data-field="comment" maxlength="500">' + esc(form.comment) + '</textarea></div></section>' +
        '<p class="j-p">Un ressenti ajouté ici est marqué « noté après coup » : c’est un souvenir, pas ce que tu ressentais à ce moment-là.</p>' +
        feelBlock('as', 'Ressenti de début', form.feelOpen, 'f-feel') + feelBlock('ae', 'Ressenti de fin', form.feelOpen2, 'f-feel2');
    } else if (k === 'creux') {
      inner = '<section class="j-sec">' + fld('Heure de début', timeIn('time', form.time, 'Heure de début du creux')) +
        fld('Heure de fin', timeIn('end', form.end, 'Heure de fin du creux'), 'Laisse vide si le creux est encore en cours. 4 h au maximum. ' + (form.endAuto ? 'Fin automatique : si tu la changes, elle devient une fin déclarée, à peu près.' : 'Fin déclarée, à peu près.')) +
        '<div class="j-field"><label class="j-lab" for="f-cnote">Note de début</label>' +
        '<textarea id="f-cnote" class="j-ta mid" data-field="note" maxlength="500">' + esc(form.note) + '</textarea></div>' +
        '<div class="j-field"><label class="j-lab" for="f-cnote2">Note de fin</label>' +
        '<textarea id="f-cnote2" class="j-ta mid" data-field="endNote" maxlength="500">' + esc(form.endNote) + '</textarea></div></section>';
    } else if (k === 'repas') {
      inner = '<section class="j-sec">' + fld('Heure du repas', timeIn('time', form.time, 'Heure du repas')) +
        '<div class="j-field"><label class="j-lab" for="f-text">Contenu</label>' +
        '<textarea id="f-text" class="j-ta mid" data-field="text" maxlength="1000">' + esc(form.text) + '</textarea></div></section>';
    } else if (k === 'instant') {
      inner = '<section class="j-sec"><div class="j-field"><label class="j-lab" for="f-name">Instant</label>' +
        '<input id="f-name" class="j-sel" type="text" maxlength="40" data-field="name" value="' + esc(form.name) + '"></div>' +
        fld('Heure', timeIn('time', form.time, 'Heure de l’instant')) + '</section>' + jtBlock();
    } else {
      inner = '<section class="j-sec">' + fld('Heure du coucher', timeIn('time', form.time, 'Heure du coucher')) + '</section>';
    }
    return formHeader(title, k === 'note' ? 'Corrige le texte ou la catégorie de ta note, ou ajoute une réponse ou une note rattachée' : 'Corrige l’heure ou le texte') + '<main style="padding-top:14px;gap:14px">' + formError() + inner + '</main>' +
      formFoot('edit-go', 'Enregistrer les changements', formValid());
  }

  function lastBackupText() {
    if (!lastBackup) return 'Dernière sauvegarde : jamais';
    var d = new Date(lastBackup), same = keyOf(d) === keyOf(new Date());
    return 'Dernière sauvegarde : ' + (same ? 'aujourd’hui' : 'le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })) + ', ' + L.fmtClock(minOf(d));
  }

  function vBackup() {
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">Kioo Cycle</span></div>' +
      '<h1 tabindex="-1">Sauvegarde</h1><p class="sub">Un fichier : tout ton Journal, ton réveil et ton plan</p></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' +
      '<p class="lead">Au quotidien, rien à faire : tes relevés, tests, notes, activités, creux, repas et couchers se gardent tout seuls sur cet appareil, d’un jour à l’autre.</p>' +
      '<p>La sauvegarde est une assurance : si l’appli est supprimée, si les données du navigateur sont effacées ou si tu changes d’appareil, le fichier permet de tout retrouver. Le téléphone et l’ordinateur ne se partagent rien : « Restaurer » en mode « Fusionner » réunit leurs données.</p>' +
      '<p>Le fichier garde aussi les réglages du plan (premier jour, graine du mélange, étape du PVT-B), la liste des mots déjà vus à la Memory List, tes nuits et ton mantra. Les fichiers faits avant cette version se restaurent toujours.</p>' +
      '<p>Chaque fichier est complet : seul le plus récent compte, tu peux effacer les anciens.</p>' +
      '<p>Suggestion, pas une règle : une fois par semaine, et plus souvent si tu notes beaucoup (la bannière et les rappels du calendrier t’y aident).</p>' +
      '<p style="font-size:12.5px">Le fichier contient tes notes, tes repas, tes activités et ton mantra : range-le dans un endroit privé.</p>' +
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
    var w = L.getWake(), nP = remPhases().length, gOn = gEnabled();
    function opt(key, title, desc) {
      return '<label class="j-opt' + (rem[key] ? ' on' : '') + '"><input type="checkbox" data-rem="' + key + '"' + (rem[key] ? ' checked' : '') + '>' +
        '<span class="t"><b>' + title + '</b><span class="d">' + desc + '</span></span></label>';
    }
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">Kioo Cycle</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Rappels</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">Ton calendrier te prévient, appli fermée</p></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' +
      '<p class="lead">Chaque matin : entre ton réveil ci-dessus, puis ' + (gOn ? 'envoie les rappels du jour à Google Agenda.' : 'crée le fichier du jour.') + '</p>' +
      '<p>L’appli ne peut pas sonner quand elle est fermée : c’est ton calendrier qui te prévient. Les heures sont calées sur ton réveil : <b id="j-rwake">' + L.fmtClock(w) + '</b>.</p>' +
      '<p>Si un rappel passe, ce n’est pas grave : il n’y a rien à rattraper.</p>' +
      '<div class="chips" style="margin:0"><span class="chip hy">Heures = moyennes à ajuster</span></div></section>' +
      '<section class="j-sec" style="gap:8px"><h2>QUOI RAPPELER ?</h2>' +
      opt('moments', 'Moments du plan · ' + NPLAN + ' par jour', 'Un rappel à l’heure de chaque moment (relevé, test, les deux, ou la question du creux), de ' + rLabel(PLAN[0].r) + ' à ' + rLabel(PLAN[PLAN.length - 1].r) + '. Pour un réveil à 8h10 : 8h40, 10h10, 11h10…') +
      opt('phases', 'Changements de phase · ' + nP + ' par jour', 'Au début de chaque phase, avec son conseil. Pas pour la première (tu viens de te réveiller). Désactivé au départ pour ne pas surcharger.') +
      opt('backups', 'Sauvegardes · 3 par jour', 'Un rappel « Sauvegarder Kioo » à ' + rLabel(BK_REM[0].r) + ' et ' + rLabel(BK_REM[1].r) + ', calés sur ton réveil, puis à 19h00 (heure fixe). Avec ton réveil actuel : <span id="j-rbk">' + esc(bkTimesText(w)) + '</span>. Le rappel sonne ; la sauvegarde reste un geste de ta part.') +
      '<div class="j-field" style="margin-top:4px"><label class="j-lab" for="j-rdays">Pour</label>' +
      '<select id="j-rdays" class="j-sel" data-rem="days">' + [1, 7, 14, 30].map(function (d) {
        return '<option value="' + d + '"' + (rem.days === d ? ' selected' : '') + '>' + (d === 1 ? 'Aujourd’hui seulement' : d + ' jours de suite') + '</option>';
      }).join('') + '</select></div></section>' +
      (gOn ? '<div class="j-actions"><button type="button" class="btn primary" id="j-gk" data-act="send-gcal"' + (gBusy || !remAny() ? ' disabled' : '') + '>Envoyer à Google Agenda</button>' +
        '<span class="j-hint left" id="j-gstatus" role="status" aria-live="polite">' + esc(gStatus) + '</span></div>' +
        '<p class="j-p">Une fenêtre Google s’ouvre pour te connecter la première fois. L’autorisation demandée se limite à créer un agenda « Kioo Cycle » et à y gérer ses événements. Seuls les horaires et les titres des rappels partent chez Google, jamais tes réponses. Pour tout retirer : supprime cet agenda dans Google Agenda.</p>' : '') +
      '<div class="j-actions"><button type="button" class="btn ' + (gOn ? 'secondary' : 'primary') + '" id="j-mk" data-act="make-ics"' + (remAny() ? '' : ' disabled') + '>Créer le fichier calendrier</button>' +
      '<span class="j-hint left" id="j-rstatus" role="status" aria-live="polite">' + esc(remStatus) + '</span></div>' +
      '<details class="j-det"><summary>Comment l’ajouter à mon calendrier ?</summary>' +
      '<p class="j-p" style="margin:0 0 8px"><b>iPhone</b> : lors d’un essai, le Calendrier d’Apple n’a pas reconnu le fichier. Passe plutôt par Gmail : envoie-toi le fichier, ouvre-le dans Gmail et ajoute les rappels à Google Agenda (constaté : ils s’ajoutent d’un coup ; les notifications par ce chemin ne sont pas encore vérifiées).</p>' +
      '<p class="j-p" style="margin:0 0 8px"><b>Google Agenda sur ordinateur</b> : Paramètres → Importer et exporter, puis choisis le fichier et le calendrier de destination. D’après l’aide de Google, l’import se fait sur ordinateur.</p>' +
      '<p class="j-p" style="margin:0 0 8px">Conseil : range-les dans un calendrier à part nommé « Kioo Cycle » ; pour tout retirer d’un coup, il suffit de le supprimer.</p>' +
      '<p class="j-p" style="margin:0 0 8px">Pas encore vérifié : où Chrome sur iPhone range ce fichier, et si ton calendrier garde les notifications d’un fichier importé.</p></details></main>';
  }

  /* ---------- Restauration : affichage ---------- */
  function countsText(list) {
    var n = {};
    list.forEach(function (e) { var k = e.kind === 'releve' && e.pvt ? 'combo' : (e.kind === 'test' && e.test ? e.test : e.kind); n[k] = (n[k] || 0) + 1; });
    var parts = [];
    [['releve', 'relevé', 'relevés'], ['combo', 'relevé + test', 'relevés + tests'], ['test', 'test', 'tests'], ['rs', 'passage Rotation span', 'passages Rotation span'], ['fl', 'passage Flanker', 'passages Flanker'], ['ss', 'passage Symbol Search', 'passages Symbol Search'], ['hs', 'passage Hand Swype', 'passages Hand Swype'], ['ml', 'passage Memory List', 'passages Memory List'], ['activite', 'activité', 'activités'],
     ['creux', 'creux', 'creux'], ['creuxq', 'réponse « non » (creux)', 'réponses « non » (creux)'], ['repas', 'repas', 'repas'], ['coucher', 'coucher', 'couchers'], ['nuit', 'nuit', 'nuits'], ['instant', 'instant', 'instants'], ['note', 'note', 'notes'], ['pas', 'note « pas ce moment »', 'notes « pas ce moment »']].forEach(function (t) {
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

  function restorePlanLine(r) {
    if (r.plan === undefined) return '<p>Sauvegarde d’une ancienne version : sans réglages du plan (ceux de cet appareil sont gardés).</p>';
    if (!r.plan) return '';
    return '<p>Plan : ' + (r.plan.start ? 'premier jour le ' + esc(pDateText(r.plan.start, true)) : 'premier jour pas encore choisi') + ' · étape ' + pStageOf(r.plan, todayInfo().tk) + '</p>';
  }
  function restoreTodoLine(r) { // un fichier d'avant le 19/11 peut contenir des to-do : elles deviennent des notes de catégorie To-do
    if (!r.tds || !r.tds.length) return '';
    var have = {};
    (r.mode === 'replace' ? r.entries : entries.concat(r.entries)).forEach(function (e) { have[e.id] = true; });
    var fresh = r.tds.filter(function (t) { return !have[tdNoteId(t)]; }).length;
    return '<p>' + plural(r.tds.length, 'to-do', 'to-do') + ' · reprises comme notes de catégorie To-do (' + plural(fresh, 'nouvelle', 'nouvelles') + ' pour cet appareil)</p>';
  }
  function restoreWakeLine(r) {
    var m = r.wake ? L.parseWake(r.wake) : null, cur = L.getWake();
    if (m === null) return '<p>Pas d’heure de réveil dans ce fichier : celle de cet appareil (' + esc(L.fmtClock(cur)) + ') est gardée.</p>';
    return '<p>Réveil du fichier : ' + esc(L.fmtClock(m)) + (m === cur ? ' (déjà celui de cet appareil)' : ' · il remplacera celui de cet appareil (' + esc(L.fmtClock(cur)) + ')') + '</p>';
  }
  function vRestore() {
    var r = restore, body = '', btn, canGo = !!r;
    if (r) {
      var s = restoreStats();
      btn = r.mode === 'merge' ? 'Restaurer (fusionner)' : (r.confirm ? 'Oui, remplacer mes données' : 'Restaurer (remplacer)');
      body = '<section class="j-card"><h2 class="j-kick">FICHIER CHOISI</h2>' +
        '<p class="lead" style="font-size:14px;font-weight:700;overflow-wrap:anywhere">' + esc(r.name || 'Texte collé') + '</p>' +
        '<p>' + (r.exportedAt ? 'Sauvegarde du ' + esc(dShort(r.exportedAt)) + ', ' + clockOf(r.exportedAt) : 'Date de sauvegarde inconnue') + '</p>' +
        '<p>' + esc(countsText(r.entries)) + (s.from ? ' · du ' + esc(dShort(s.from)) + ' au ' + esc(dShort(s.to)) : '') + '</p>' +
        restoreWakeLine(r) +
        restorePlanLine(r) +
        restoreTodoLine(r) +
        '<p>' + plural(s.fresh.length, 'élément nouveau', 'éléments nouveaux') + ' pour cet appareil · ' + plural(s.dup, 'déjà présent', 'déjà présents') + '</p></section>' +
        '<section class="j-sec" style="gap:8px"><h2>COMMENT LE RESTAURER ?</h2>' +
        '<label class="j-opt' + (r.mode === 'merge' ? ' on' : '') + '"><input type="radio" name="rmode" value="merge"' + (r.mode === 'merge' ? ' checked' : '') + '>' +
        '<span class="t"><b>Fusionner <small>· recommandé</small></b><span class="d">Ajoute ce qui manque sur cet appareil. Rien n’est effacé, les doublons sont ignorés. Le réveil du fichier est repris. Le plan de cet appareil est gardé, sauf s’il n’a pas encore de premier jour.</span></span></label>' +
        '<label class="j-opt' + (r.mode === 'replace' ? ' on' : '') + '"><input type="radio" name="rmode" value="replace"' + (r.mode === 'replace' ? ' checked' : '') + '>' +
        '<span class="t"><b>Remplacer</b><span class="d">Efface le Journal de cet appareil, et met celui du fichier à la place (réveil' + (r.plan ? ' et plan' : '') + ' compris' + (r.tds ? ' ; les to-do du fichier deviennent des notes' : '') + '). Ce qui a été fait après la sauvegarde est perdu.</span></span></label></section>' +
        (r.mode === 'replace' && r.confirm ? '<p class="j-warn" role="alert">Cela efface le contenu du Journal de cet appareil (' + esc(countsText(entries)) + ') pour mettre celui du fichier à la place.' + (r.plan ? ' Le plan (premier jour, graine, étape) est aussi remplacé.' : '') + '</p>' : '');
    } else {
      btn = 'Restaurer';
      body = '<section class="j-card"><p class="lead">Choisis le fichier <b>kioo-cycle-sauvegarde-….json</b> enregistré plus tôt (les anciens fichiers <b>luna-sauvegarde-….json</b> marchent aussi). L’appli te montre ce qu’il contient avant de toucher à quoi que ce soit.</p>' +
        '<label class="btn secondary" for="j-file" style="width:auto">Choisir un fichier…</label>' +
        '<input id="j-file" type="file" accept=".json,application/json,text/plain" class="sr"></section>' +
        '<details class="j-det"><summary>Ou coller le contenu</summary>' +
        '<textarea id="j-paste" class="j-ta small" aria-label="Contenu de la sauvegarde à coller"></textarea>' +
        '<button type="button" class="btn secondary" data-act="read-paste">Lire ce texte</button></details>';
    }
    return '<header class="subhead"><div class="top">' + back('backup', 'Sauvegarde') + '<span class="brand">Kioo Cycle</span></div>' +
      '<h1 tabindex="-1">Restaurer</h1><p class="sub">' + (r ? 'Vérifie le contenu, puis choisis le mode' : 'Choisis un fichier de sauvegarde') + '</p></header>' +
      '<main style="padding-top:14px;gap:14px">' +
      (restoreError ? '<p class="j-warn" role="alert">' + esc(restoreError) + '</p>' : '') + body + '</main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="restore-go"' + (canGo ? '' : ' disabled') + '>' + btn + '</button>' +
      '<button type="button" class="btn ghost" data-act="backup">Annuler</button></div>';
  }

  /* ---------- Tout l'historique : filtres de genre, catégorie, sous-catégorie, état, tri Date | Événement (depuis le 08/11, c2b ; catégories depuis le 19/11) ---------- */
  // État gardé en mémoire seulement (jamais enregistré) : depuis `e4a` (19/11, demande de Jonathan : « il les garde »), l'Historique se souvient de son filtre et de son tri tant que l'appli n'est pas fermée ;
  // avant, on repartait de « Toutes » à chaque ouverture. Rien ne les remet à zéro, sauf la fermeture de l'appli (et un filtre qui n'a plus de sens, voir `histNorm`).
  // sub : 'all' | 'none' (sans sous-catégorie) | 's:<nom>' ; ans : 'all' | 'no' | 'yes' (questionnement : réponse ; to-do : mise en place) ; dir : 'desc' (plus récentes d'abord) | 'asc' (plus anciennes d'abord).
  var hf = { genre: 'all', ntype: 'all', sub: 'all', ans: 'all', val: 'all', sort: 'date', dir: 'desc' };
  function hfReset() { hf = { genre: 'all', ntype: 'all', sub: 'all', ans: 'all', val: 'all', sort: 'date', dir: 'desc' }; }
  var HG = [['all', 'Toutes'], ['releve', 'Relevés'], ['test', 'Tests'], ['activite', 'Activités'], ['creux', 'Creux'], ['repas', 'Repas'], ['coucher', 'Coucher'], ['nuit', 'Nuits'], ['instant', 'Instants'], ['note', 'Notes'], ['pas', 'Pas ce moment']];
  // Les genres suivent le champ `kind` : un ancien « relevé + test » (avant le 11/10) compte parmi les Relevés.
  function genreOf(e) { return e.kind === 'creuxq' ? 'creux' : e.kind; } // la réponse « non » à la question du creux est rangée avec les creux
  function noteTid(e) { return noteTypeOf(e.ntype).id || 'none'; } // 'none' = sans catégorie
  function histTypeChoices(notes) { // catégories proposées : celles qui ont des notes (ou celle qui est choisie), puis les tiennes (Réglages), puis « Sans catégorie » (toujours là : c'est le lot à trier)
    var cnt = {}, out = [{ id: 'all', label: 'Toutes', n: notes.length }], customs = noteTypeNames.map(function (n) { return noteTypeOf('u:' + n).id; });
    notes.forEach(function (e) { var id = noteTid(e); cnt[id] = (cnt[id] || 0) + 1; });
    Object.keys(cnt).forEach(function (id) { if (id.slice(0, 2) === 'u:' && customs.indexOf(id) < 0) customs.push(id); });
    NOTE_TYPES.slice(1).forEach(function (t) { if (cnt[t.id] || hf.ntype === t.id) out.push({ id: t.id, label: t.name, n: cnt[t.id] || 0 }); });
    customs.forEach(function (id) { out.push({ id: id, label: noteTypeOf(id).name, n: cnt[id] || 0 }); });
    out.push({ id: 'none', label: 'Sans catégorie', n: cnt.none || 0 });
    return out;
  }
  function histSubChoices(notes) { // sous-catégories de la catégorie choisie : seulement celles qui portent des notes ; null s'il n'y en a aucune
    if (hf.ntype === 'all' || hf.ntype === 'none') return null;
    var inCat = notes.filter(function (e) { return noteTid(e) === hf.ntype; }), cnt = {}, none = 0, order = (noteTypeOf(hf.ntype).subs || []).slice();
    inCat.forEach(function (e) { if (e.nsub) { cnt[e.nsub] = (cnt[e.nsub] || 0) + 1; if (order.indexOf(e.nsub) < 0) order.push(e.nsub); } else none++; });
    var out = [{ id: 'all', label: 'Toutes', n: inCat.length }];
    order.forEach(function (n) { if (cnt[n] || hf.sub === 's:' + n) out.push({ id: 's:' + n, label: n, n: cnt[n] || 0 }); });
    if (out.length < 2) return null;
    if (none || hf.sub === 'none') out.push({ id: 'none', label: 'Sans sous-catégorie', n: none });
    return out;
  }
  function histNorm() { // un filtre qui n'a plus de sens (genre changé, catégorie sans note après une suppression) revient à « Toutes »
    if (hf.genre !== 'note') { hf.ntype = 'all'; hf.sub = 'all'; hf.ans = 'all'; hf.val = 'all'; return; }
    var notes = entries.filter(function (e) { return e.kind === 'note'; });
    if (!histTypeChoices(notes).some(function (c) { return c.id === hf.ntype; })) hf.ntype = 'all';
    var sc = histSubChoices(notes);
    if (!sc || !sc.some(function (c) { return c.id === hf.sub; })) hf.sub = 'all';
    if (hf.ntype !== 'questionnement' && hf.ntype !== 'todo') hf.ans = 'all';
  }
  function histFiltered() {
    histNorm();
    var list = hf.dir === 'asc' ? entries.slice() : entries.slice().reverse(); // `entries` est rangé par date de saisie (`ts`) croissante
    if (hf.genre !== 'all') list = list.filter(function (e) { return genreOf(e) === hf.genre; });
    if (hf.genre === 'note') {
      if (hf.ntype !== 'all') list = list.filter(function (e) { return noteTid(e) === hf.ntype; });
      if (hf.sub === 'none') list = list.filter(function (e) { return !e.nsub; });
      else if (hf.sub !== 'all') list = list.filter(function (e) { return e.nsub === hf.sub.slice(2); });
      if (hf.ans !== 'all') list = list.filter(function (e) { return doneOf(e) === (hf.ans === 'yes'); });
      if (hf.val !== 'all') list = list.filter(function (e) { return isVal(e) === (hf.val === 'yes'); }); // e5c : validées / à valider
    }
    return list;
  }
  function histSub() {
    var n = histFiltered().length, tot = entries.length;
    return (n === tot ? plural(tot, 'entrée', 'entrées') : n + ' sur ' + plural(tot, 'entrée', 'entrées')) + ' · ' + (hf.sort === 'event' ? 'groupées par genre' + (hf.dir === 'asc' ? ', les plus anciennes d’abord' : '') : hf.dir === 'asc' ? 'les plus anciennes d’abord' : 'les plus récentes d’abord');
  }
  function hfChips(actName, label, choices, cur) {
    return '<div class="lab">' + label + '</div><div class="j-chips" role="group" aria-label="' + esc(label) + '">' + choices.map(function (c) {
      var on = c.id === cur;
      return '<button type="button" class="j-chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="' + actName + '" data-v="' + esc(c.id) + '"><span>' + esc(c.label) + '</span>' +
        (c.n == null ? '' : '<span class="n">' + c.n + '</span>') + '</button>';
    }).join('') + '</div>';
  }
  function histGroups(list) { // tri « Événement » : un titre par genre ; pour les notes, un sous-titre par type ; le plus récent d'abord dans chaque groupe
    var out = '', tk = todayInfo().tk;
    HG.slice(1).forEach(function (g) {
      var items = list.filter(function (e) { return genreOf(e) === g[0]; });
      if (!items.length) return;
      out += '<h2 class="j-gt">' + esc(g[1]) + ' · ' + items.length + '</h2>';
      if (g[0] !== 'note') { out += items.map(function (e) { return histCard(e, tk, true); }).join(''); return; }
      histTypeChoices(items).slice(1).forEach(function (c) {
        var sub = items.filter(function (e) { return noteTid(e) === c.id; });
        if (!sub.length) return;
        out += '<h3 class="j-gt sub">' + esc(c.label) + ' · ' + sub.length + '</h3>' + sub.map(function (e) { return histCard(e, tk, true); }).join('');
      });
    });
    return out;
  }
  function histBody() {
    lkIdx = lkBuild();
    var list = histFiltered(), tk = todayInfo().tk, cnt = { all: entries.length };
    entries.forEach(function (e) { cnt[genreOf(e)] = (cnt[genreOf(e)] || 0) + 1; });
    var bar = hfChips('hf-genre', 'Genre', HG.map(function (g) { return { id: g[0], label: g[1], n: cnt[g[0]] || 0 }; }), hf.genre);
    if (hf.genre === 'note') {
      var notes = entries.filter(function (e) { return e.kind === 'note'; });
      bar += hfChips('hf-ntype', 'Catégorie', histTypeChoices(notes), hf.ntype);
      var subc = histSubChoices(notes);
      if (subc) bar += hfChips('hf-sub', 'Sous-catégorie', subc, hf.sub);
      if (hf.ntype === 'questionnement' || hf.ntype === 'todo') {
        var isTd = hf.ntype === 'todo', qs = notes.filter(function (e) { return noteTid(e) === hf.ntype; }), yes = qs.filter(doneOf).length;
        bar += hfChips('hf-ans', isTd ? 'Mise en place' : 'Réponse', [{ id: 'all', label: 'Toutes', n: qs.length }, { id: 'no', label: isTd ? 'À mettre en place' : 'Sans réponse', n: qs.length - yes }, { id: 'yes', label: isTd ? 'Mises en place' : 'Avec réponse', n: yes }], hf.ans);
      }
    }
    if (hf.genre === 'note') { // e5c : « Validation » : le décompte suit la catégorie et la sous-catégorie choisies
      var vs = entries.filter(function (e) { return e.kind === 'note'; });
      if (hf.ntype !== 'all') vs = vs.filter(function (e) { return noteTid(e) === hf.ntype; });
      if (hf.sub === 'none') vs = vs.filter(function (e) { return !e.nsub; }); else if (hf.sub !== 'all') vs = vs.filter(function (e) { return e.nsub === hf.sub.slice(2); });
      var nv = vs.filter(isVal).length;
      bar += hfChips('hf-val', 'Validation', [{ id: 'all', label: 'Toutes', n: vs.length }, { id: 'no', label: 'À valider', n: vs.length - nv }, { id: 'yes', label: 'Validées', n: nv }], hf.val);
    }
    bar += hfChips('hf-sort', 'Trier par', [{ id: 'date', label: 'Date' }, { id: 'event', label: 'Événement' }], hf.sort);
    bar += hfChips('hf-dir', 'Ordre', [{ id: 'desc', label: 'Plus récentes d’abord' }, { id: 'asc', label: 'Plus anciennes d’abord' }], hf.dir); // par date de saisie ; avec « Événement », dans chaque groupe
    var body = !entries.length ? '<div class="j-empty">Rien pour l’instant.</div>'
      : !list.length ? '<div class="j-empty">Aucune entrée avec ce filtre.</div>'
      : hf.sort === 'event' ? histGroups(list) : list.map(function (e) { return histCard(e, tk, true); }).join('');
    lkIdx = null;
    return '<div class="j-fbar">' + bar + '</div><div class="j-hist">' + body + '</div>';
  }
  // Met à jour la barre et la liste sans redessiner l'écran : le défilement et le clavier restent où ils sont.
  function histRefresh(focusFn) {
    var w = $('j-hwrap');
    if (!w || screen !== 'history') { render(); return; }
    var hn = $('j-hnotice'); if (hn && hn.parentNode) hn.parentNode.removeChild(hn); // le message de l'enregistrement disparaît au premier geste
    w.innerHTML = histBody();
    var sub = $('j-hsub'); if (sub) sub.textContent = histSub();
    var f = focusFn ? focusFn(w) : null;
    if (f) f.focus({ preventScroll: true });
  }
  function hfBtn(act, v) { return function (w) { return Array.prototype.filter.call(w.querySelectorAll('[data-act="' + act + '"]'), function (b) { return b.getAttribute('data-v') === v; })[0]; }; }
  function hfSet(name, v) {
    if (name === 'hf-genre' && HG.some(function (g) { return g[0] === v; })) { hf.genre = v; hf.ntype = 'all'; hf.sub = 'all'; hf.ans = 'all'; hf.val = 'all'; }
    else if (name === 'hf-ntype') { hf.ntype = v; hf.sub = 'all'; hf.ans = 'all'; }
    else if (name === 'hf-sub') hf.sub = v;
    else if (name === 'hf-ans' && (v === 'all' || v === 'no' || v === 'yes')) hf.ans = v;
    else if (name === 'hf-val' && (v === 'all' || v === 'no' || v === 'yes')) hf.val = v;
    else if (name === 'hf-sort' && (v === 'date' || v === 'event')) hf.sort = v;
    else if (name === 'hf-dir' && (v === 'desc' || v === 'asc')) hf.dir = v;
    else return;
    pendingDel = null;
    histRefresh(hfBtn(name, v));
  }

  function vHistory() { // e4c : un onglet de la barre du bas (comme Réglages) : plus de flèche « Journal »
    return '<header><div class="top"><span class="brand">Kioo Cycle</span><span class="module">Module Corps</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Reflet</h1></div><p class="sub" id="j-hsub" aria-live="polite">' + histSub() + '</p></header>' +
      '<main style="padding-top:14px">' + (notice ? '<p class="j-ok" id="j-hnotice" role="status">' + esc(notice) + '</p>' : '') + '<span id="j-hlive" role="status" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap"></span><div id="j-hwrap">' + histBody() + '</div></main>';
  }

  var VIEWS = { home: vHome, feel: vFeel, intro: vIntro, run: vRun, result: vResult, note: vNote, backup: vBackup, restore: vRestore, history: vHistory,
                reminders: vRemind, plan: vPlan, settings: vSettings, instant: vInstant, 'act-start': vActStart, 'act-end': vActEnd, 'creux-start': vCreuxStart, 'creux-end': vCreuxEnd, meal: vMeal, bed: vBed, edit: vEdit,
                chain: vChain, skip: vSkip,
                tests: vTests, wake: vWake, night: vNight, mantra: vMantra, 'ss-intro': vSsIntro, 'ss-run': vSsRun, 'ss-prac': vSsPrac, 'ss-result': vSsResult,
                'rs-intro': vTIntro, 'rs-run': vTRun, 'rs-prac': vTPrac, 'rs-result': vTResult,
                'hs-intro': vTIntro, 'hs-run': vTRun, 'hs-prac': vTPrac, 'hs-result': vTResult,
                'fl-intro': vTIntro, 'fl-run': vTRun, 'fl-prac': vTPrac, 'fl-result': vTResult,
                'ml-intro': vTIntro, 'ml-run': vTRun, 'ml-result': vTResult };

  function render() {
    var runM = /^(ss|rs|hs|fl|ml)-run$/.exec(screen);
    if (rnRun && !runM) { rnRun.why = 'silent'; rnKill(); } // on quitte l'écran du test : on l'arrête sans rien dire
    root.innerHTML = (VIEWS[screen] || vHome)();
    L.navVisible(screen === 'home' || screen === 'backup' || screen === 'reminders' || screen === 'plan' || screen === 'settings' || screen === 'history');
    if (L.navCurrent) L.navCurrent(screen === 'history' ? 'nav-historique' : screen === 'settings' ? 'nav-reglages' : 'nav-journal');
    if (screen === 'home') { L.bindWake(root.querySelector('.wake-input')); updateHome(); }
    if (screen === 'reminders') { L.bindWake(root.querySelector('.wake-input')); gLoadLib(); }
    if (screen === 'plan') { L.bindWake(root.querySelector('.wake-input')); pRefreshDay(); }
    if (screen === 'run') startPvt();
    if (runM) rnStart(RUN[runM[1]][flow.tMode === 'practice' ? 'practice' : 'test']);
    var focus = screen === 'run' ? $('j-area') : (root.querySelector('h1'));
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
      if (notice && flow.test === 'ml' && flow.mlNo) notice += ' Les mots de la liste n° ' + flow.mlNo + ' ont été montrés : une autre liste sera utilisée au prochain passage.';
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

  /* ---------- Test Memory List ---------- */
  // Déroulé porté de la maquette du 14/10 : « Prêt », les 12 mots pendant 30 s, tâche intercalaire de 30 s (« touche la forme différente »), puis 24 mots à reconnaître
  // (Non / Oui, sans temps limite ni retour juste / erreur). Pas d'entraînement. Rien n'est enregistré si le passage est interrompu.
  var KEY_ML = 'luna.mlUsed';
  // Journal des listes de mots montrées : une liste est « consommée » dès que ses 12 mots s'affichent, même si le passage est interrompu et non enregistré (les mots ont été vus).
  function mlLogRead() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY_ML));
      return Array.isArray(a) ? a.filter(function (x) { return Array.isArray(x) && isFinite(x[0]) && isFinite(x[1]); }) : [];
    } catch (e) { return []; }
  }
  function mlLogAdd(no, ts) {
    try { var a = mlLogRead(); a.push([no, ts]); localStorage.setItem(KEY_ML, JSON.stringify(a.slice(-400))); } catch (e) {}
  }
  function mlUsage() { // numéro de liste → heure de sa dernière fois (journal des listes montrées + passages enregistrés, restaurés compris)
    var u = {};
    mlLogRead().forEach(function (x) { if (!u[x[0]] || x[1] > u[x[0]]) u[x[0]] = x[1]; });
    entries.forEach(function (e) { if (e.test === 'ml' && e.ml && (!u[e.ml.listNo] || e.ts > u[e.ml.listNo])) u[e.ml.listNo] = e.ts; });
    return u;
  }
  // Liste suivante : la première jamais montrée ; si les 98 ont servi, la plus anciennement montrée (jamais une liste déjà montrée le même jour, sauf impossibilité).
  function mlPick(now, wake) {
    var u = mlUsage(), n, N = ML_BANK.length;
    for (n = 1; n <= N; n++) if (!u[n]) return { no: n, seen: ML_SEEN[n], reprise: false };
    var today = dayKey(now, wake), best = 0;
    for (n = 1; n <= N; n++) if (dayKey(u[n], wake) !== today && (!best || u[n] < u[best])) best = n;
    if (!best) for (n = 1; n <= N; n++) if (!best || u[n] < u[best]) best = n;
    return { no: best, seen: ML.nT + ML.nD, reprise: true };
  }
  function mlToday() { // heure de la dernière liste montrée aujourd'hui (journée du Journal : du réveil au réveil), 0 s'il n'y en a pas
    var u = mlUsage(), tk = dayKey(Date.now(), L.getWake()), last = 0;
    Object.keys(u).forEach(function (n) { if (dayKey(u[n], L.getWake()) === tk && u[n] > last) last = u[n]; });
    return last;
  }

  async function mlCountdown(label, ms) { // compte à rebours : la barre avance, le texte change toutes les 250 ms
    var end = performance.now() + ms;
    for (;;) {
      var rem = end - performance.now();
      if (rem <= 0) break;
      rnReadout(label + ' · ' + Math.ceil(rem / 1000) + ' s', 1 - rem / ms);
      await rnSleep(Math.min(250, rem));
    }
  }
  // Tâche intercalaire : une forme différente parmi quatre ; on la touche. Chaque forme attend au plus la fin du temps (deadline).
  async function mlOddOnce(deadline) {
    var host = $('ml-odd');
    if (!host) throw new Error('écran du test absent');
    var t = mlOddMake(Math.random), cells = '';
    for (var i = 0; i < 4; i++) cells += '<button type="button" class="ml-cell" data-i="' + i + '" aria-label="Forme ' + (i + 1) + '">' + mlShapeSvg(i === t.pos ? t.odd : t.base) + '</button>';
    var res = await rnPend(function (done) {
      var armed = true, timer = setTimeout(function () { if (armed) { armed = false; done({ timeout: true }); } }, Math.max(0, deadline - performance.now()));
      host.innerHTML = cells;
      var btns = Array.prototype.slice.call(host.querySelectorAll('.ml-cell'));
      function on(ev) {
        if (ev.type === 'click' && ev.detail !== 0) return; // un « click » sans souris (detail 0) = touche Entrée/Espace sur le bouton
        if (!armed) return;
        armed = false;
        done({ i: Number(ev.currentTarget.getAttribute('data-i')) });
      }
      btns.forEach(function (b) { b.addEventListener('pointerdown', on); b.addEventListener('click', on); });
      return function () { armed = false; clearTimeout(timer); btns.forEach(function (b) { b.removeEventListener('pointerdown', on); b.removeEventListener('click', on); }); };
    });
    host.innerHTML = '';
    if (res.timeout) return null;
    await rnSleep(ML.oddBlank);
    return { ok: res.i === t.pos };
  }
  // Un mot à reconnaître : Non ou Oui, sans temps limite. Le temps part de l'image où le mot s'affiche (comme les autres tests).
  async function mlRecogOnce(item) {
    var w = $('ml-word'), bN = $('ml-n'), bY = $('ml-y');
    if (!w || !bN || !bY) throw new Error('écran du test absent');
    w.textContent = '';
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
      var onN = mk('N'), onY = mk('Y');
      function onKey(ev) {
        if (ev.repeat) return;
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); fin('N', ev, 'clavier'); }
        else if (ev.key === 'ArrowRight') { ev.preventDefault(); fin('Y', ev, 'clavier'); }
      }
      bN.addEventListener('pointerdown', onN); bN.addEventListener('click', onN);
      bY.addEventListener('pointerdown', onY); bY.addEventListener('click', onY);
      document.addEventListener('keydown', onKey);
      w.textContent = item.word;
      raf = requestAnimationFrame(function () { t0 = performance.now(); armed = true; });
      return function () {
        armed = false; cancelAnimationFrame(raf);
        bN.removeEventListener('pointerdown', onN); bN.removeEventListener('click', onN);
        bY.removeEventListener('pointerdown', onY); bY.removeEventListener('click', onY);
        document.removeEventListener('keydown', onKey);
      };
    });
    w.textContent = '';
    var btn = res.resp === 'Y' ? bY : bN;
    btn.classList.add('hit');
    await rnSleep(ML.hit);
    btn.classList.remove('hit');
    await rnSleep(ML.blank - ML.hit);
    return { word: item.word, target: item.target, resp: res.resp, rt: res.rt, inp: res.inp };
  }
  async function mlRunTest() {
    var t0 = performance.now(), inps = {}, oddN = 0, oddOk = 0, i;
    flow.ts = Date.now();
    flow.wake = L.getWake();
    flow.mlNo = 0;
    var pick = mlPick(flow.ts, flow.wake), words = mlList(pick.no);
    rnReadout('Prêt', 0);
    rnStage('<p class="ss-between">Prêt</p><p class="ss-note">' + ML.nT + ' mots à retenir, pendant ' + (ML.study / 1000) + ' secondes.</p>');
    await rnSleep(ML.ready);
    // Étude : la liste est consommée dès que les mots s'affichent
    rnStage('<div class="ml-trial"><p class="ss-cue">Retiens ces ' + ML.nT + ' mots</p><ul class="ml-words">' +
      ssShuffle(words.targets.slice(), Math.random).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>');
    mlLogAdd(pick.no, Date.now());
    flow.mlNo = pick.no;
    await mlCountdown('Étude', ML.study);
    // Tâche intercalaire (non notée)
    rnReadout('Tâche intercalaire', 0);
    rnStage('<p class="ss-between">Autre tâche</p><p class="ss-note">Touche la forme différente des trois autres, le plus vite possible. ' + (ML.odd / 1000) + ' secondes.</p>');
    await rnSleep(ML.gap);
    rnStage('<div class="ml-trial"><p class="ss-cue">Touche la forme différente</p><div class="ml-odd" id="ml-odd" role="group" aria-label="Quatre formes"></div></div>');
    var oddEnd = performance.now() + ML.odd;
    var tick = setInterval(function () { var rem = Math.max(0, oddEnd - performance.now()); rnReadout('Tâche intercalaire · ' + Math.ceil(rem / 1000) + ' s', 1 - rem / ML.odd); }, 250);
    try {
      while (performance.now() < oddEnd) {
        var o = await mlOddOnce(oddEnd);
        if (!o) break;
        oddN++; if (o.ok) oddOk++;
      }
    } finally { clearInterval(tick); }
    // Reconnaissance : les 12 mots de la liste mélangés avec 12 mots nouveaux
    rnReadout('Reconnaissance', 0);
    rnStage('<p class="ss-between">Reconnaissance</p><p class="ss-note">Des mots arrivent un par un. Ce mot était-il dans la liste du début ?</p>');
    await rnSleep(ML.gap);
    rnStage('<div class="ml-trial"><p class="ss-cue">Ce mot était-il dans la liste ?</p><div class="ml-word" id="ml-word" aria-live="polite"></div>' +
      '<div class="ml-resp"><button type="button" class="btn secondary ml-btn" id="ml-n">Non</button><button type="button" class="btn secondary ml-btn" id="ml-y">Oui</button></div>' +
      '<p class="ss-note ml-keys">← Non · Oui →</p></div>');
    var items = mlMake(words.targets, words.foils, Math.random), res = [];
    for (i = 0; i < items.length; i++) {
      rnReadout('Reconnaissance · ' + (i + 1) + ' sur ' + items.length, i / items.length);
      var r = await mlRecogOnce(items[i]);
      res.push(r);
      if (r.inp) inps[r.inp] = true;
    }
    var comp = res.map(mlCompact), kinds = Object.keys(inps), dur = Math.round(performance.now() - t0);
    var rec = { ver: ML.ver, cfg: ML_CFG, listNo: pick.no, seen: pick.seen, reprise: pick.reprise, odd: { n: oddN, ok: oddOk }, durationMs: dur, items: comp };
    flow.result = { cfg: ML_CFG, rec: rec, sc: mlScore(comp), durationMs: dur, device: DEVICE, input: kinds.length === 1 ? kinds[0] : 'mixte', ts: flow.ts, wake: flow.wake };
    rnEnd();
    go('ml-result');
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
    var to = ret; ret = 'home'; // e4c : un formulaire ouvert depuis l'Historique y revient
    go(to);
  }
  function baseEntry(kind, ts, wake) {
    return { id: uid(ts), kind: kind, ts: ts, day: dayKey(ts, wake), wake: wake, rel: relAt(ts, wake) };
  }
  function releveEntry(ts, wake) {
    var f = {}, e = baseEntry('releve', ts, wake);
    qsetOf(flow).forEach(function (id) { f[id] = +flow.feel[id]; });
    e.slot = flow.slot; e.plan = flow.slot != null ? 'prevu' : 'libre'; e.fv = 3; e.feel = f;
    var dt = (flow.detail || '').trim();
    if (dt) e.detail = dt.slice(0, 500);
    return e;
  }
  /* Première pensée du matin (e5) : écrite sur l'écran du relevé du matin ; gardée comme une NOTE (catégorie « Première pensée », une catégorie libre) pour qu'elle se relise avec les notes.
     Elle part avec le relevé, une minute après lui (même identifiant impossible) ; si le relevé n'est pas enregistré, elle ne l'est pas non plus. */
  var THOUGHT_CAT = 'u:Première pensée';
  function pushReleve(ts, wake) {
    entries.push(releveEntry(ts, wake));
    var tx = (flow.thought || '').trim();
    if (!tx) return false;
    var n = baseEntry('note', ts + 1, wake);
    n.text = tx.slice(0, 1000); n.ntype = THOUGHT_CAT;
    entries.push(n);
    return true;
  }
  function saveReleveOnly() {
    if (!feelComplete()) return;
    var ts = flow.feelTs || Date.now(); // relevé + test : heure où le ressenti a été validé
    var th = pushReleve(ts, L.getWake());
    afterSave('Relevé enregistré · ' + clockOf(ts) + (th ? ', première pensée gardée dans tes notes' : '') + '.');
  }
  function saveTest() { // test seul, ou relevé + test
    var r = flow.result, ts = flow.ts, wake = flow.wake;
    if (flow.mode === 'both') pushReleve(flow.feelTs || ts, wake);
    var t = baseEntry('test', ts, wake);
    t.slot = flow.slot; t.plan = planOfFlow(); stampFin(t); t.device = r.device; t.input = r.input;
    t.pvt = { n: r.n, mean: r.mean, lapses: r.lapses, falseStarts: r.falseStarts, timeouts: r.timeouts, rts: r.rts, durationMs: r.durationMs };
    chainStamp(t);
    entries.push(t);
    saved((flow.mode === 'both' ? 'Relevé et test enregistrés · ' : (flow.chain ? 'PVT-B enregistré · ' : 'Test enregistré · ')) + clockOf(ts) + finSuffix() + '.');
  }
  // Un passage de Symbol Search, Rotation span, Hand Swype ou Flanker : un test seul (les moments du plan à plusieurs tests viendront plus tard).
  function saveTestN() {
    var id = flow.test, td = TD[id], r = flow.result;
    if (!r || !td) return;
    var prev = entries.filter(function (x) { return x.test === id; });
    var e = baseEntry('test', r.ts, r.wake);
    e.test = id; e.slot = flow.slot; e.plan = planOfFlow(); stampFin(e); e.device = r.device; e.input = r.input;
    e.nth = prev.length + 1; // n-ième passage de ce test (tous passages, libres compris)
    e.nthDay = prev.filter(function (x) { return x.day === e.day; }).length + 1; // n-ième passage de ce test dans la journée
    e[id] = td.pack(r);
    chainStamp(e);
    entries.push(e);
    saved(td.name + ' enregistré · ' + clockOf(r.ts) + finSuffix() + '.');
  }
  function saveNote() {
    var text = noteText.trim();
    if (!text) return;
    var e = baseEntry('note', noteTs, L.getWake());
    e.text = text;
    var sc = noteTypeOf(noteSel.id).id;
    if (sc) { e.ntype = sc; var ss = selSub(noteSel); if (ss) e.nsub = ss; }
    var fo = fromOf();
    if (fo) e.from = fo.id; // lien vers la note d'origine ; rien n'est écrit sur la note d'origine
    entries.push(e);
    noteText = ''; noteSel = { id: '', sub: '', other: false, txt: '' }; noteFrom = '';
    afterSave(fo ? 'Note enregistrée, liée à la note d’origine.' : 'Note enregistrée.');
  }

  /* ---------- Moment enchaîné : PVT-B puis 2 tests, « Pas ce moment » (morceau 4b) ---------- */
  // Le parcours (`flow.chain`) ne garde que ce qui est décidé au départ (jour du plan, plan, étape, suite des tests). Ce qui reste à faire se relit toujours dans
  // les entrées du jour : rien n'est perdu si l'appli est rechargée, et un moment arrêté se reprend tant que sa fenêtre est ouverte.
  function ordTxt(n) { return n === 1 ? '1er' : n + 'ᵉ'; }
  function pjText(e) {
    var p = e.pj;
    if (!p) return '';
    return (p.k ? ordTxt(p.k) + ' du moment (' + p.n + ' prévus) · ' : '') + 'jour ' + (p.d + 1) + ' du plan · semaine ' + PL.weekOf(p.d) +
      (PL.isRodage(p.d) ? ' · rodage' : '') + ' · PVT-B étape ' + p.st;
  }
  function passBody(e) { // lignes sous un passage dans l'historique : numéro de passage, puis place dans le plan
    var rows = [];
    if (e.nth) rows.push('Passage n° ' + e.nth + (e.nthDay ? ' · ' + ordTxt(e.nthDay) + ' de la journée' : ''));
    var pj = pjText(e);
    if (pj) rows.push(pj);
    if (e.plan === 'creux') { var fc = e.cid ? creuxById(e.cid) : null; rows.push(fc ? 'Marque la fin du creux de ' + clockOf(fc.ts) + (fc.end != null ? ' (fin ' + clockOf(fc.end) + ')' : '') : 'Marque la fin d’un creux'); }
    return rows.map(function (t) { return '<div class="body">' + esc(t) + '</div>'; }).join('');
  }
  function slotTag(m) { // « R+3h · test 2 sur 3 » dans un moment enchaîné, « R+3h · prévu » sinon
    var ch = flow.chain, i = ch ? ch.steps.indexOf(flow.test) : -1;
    return rLabel(m.r) + ' · ' + (i >= 0 ? 'test ' + (i + 1) + ' sur ' + ch.n : 'prévu');
  }
  function chainTag() { return flow.chain && flow.slot != null && PLAN[flow.slot] ? ' · ' + slotTag(PLAN[flow.slot]) : ''; }
  function prevuTxt() { return 'prévu' + (flow.chain && PL.isRodage(flow.chain.d) ? ' · rodage' : ''); }
  // F3 (09/11, f3) : test de fin de creux = un test proposé après « Terminer le creux » (`flow.fin` = id du creux). Étiquette « fin de creux », ni « prévu » ni « libre » :
  // il n'entre pas dans la référence (qui ne prend que les passages « prévus »). Ses textes ne diffèrent de ceux d'un test libre que par l'étiquette.
  function finTag() { return flow.fin ? 'Fin de creux' : 'Test libre'; }
  function finChip() { return flow.fin ? 'fin de creux' : 'test libre'; }
  function finIntro(ref) { return (flow.fin ? 'Test de fin de creux : il sera enregistré avec l’étiquette « fin de creux », hors des moments du plan' : 'Test libre : il sera enregistré, hors des moments du plan') + (ref ? ' et hors de ta référence.' : '.'); }
  function finRef() { return flow.fin ? 'Test de fin de creux : il est comparé à ta référence mais n’y entre pas (« fin de creux : hors référence »).' : 'Test libre : il est comparé à ta référence mais n’y entre pas (« libre : hors référence »).'; }
  function planOfFlow() { return flow.slot != null ? 'prevu' : (flow.fin ? 'creux' : 'libre'); }
  function stampFin(e) { if (flow.slot == null && flow.fin) e.cid = flow.fin; }
  function finSuffix() { return flow.slot == null && flow.fin ? ' · fin de creux' : ''; }
  function chainState() {
    var ch = flow.chain;
    if (!ch) return null;
    var info = todayInfo(), s = slotStates(info).list[ch.slot];
    return s && s.chain ? { ch: ch, info: info, s: s, m: PLAN[ch.slot] } : null;
  }
  function saveTxt(base) {
    var cs = chainState();
    if (!cs) return base;
    return cs.s.chain.todo.some(function (t) { return t !== flow.test; }) ? 'Enregistrer et continuer' : base;
  }
  // Étiquettes du passage dans le plan. Rang = nombre de passages déjà enregistrés dans ce moment + 1 (un passage lancé puis non enregistré n'y figure pas).
  function chainStamp(e) {
    var ch = flow.chain;
    if (!ch) return;
    var k = 1 + entries.filter(function (x) { return x.kind === 'test' && x.slot === ch.slot && x.day === e.day; }).length;
    e.pj = { d: ch.d, p: ch.plan, st: ch.stage, k: Math.min(k, 3), n: ch.n };
  }
  function saved(msg) { if (flow.chain) chainSaved(msg); else afterSave(msg); }
  function chainSaved(msg) {
    entries.sort(byTs);
    if (!persist()) msg += ' Attention : l’appareil refuse d’enregistrer.';
    updateAlert();
    var cs = chainState();
    if (cs && (cs.s.needT || cs.s.needR)) { flow.chainMsg = msg; flow.result = null; go('chain'); return; }
    notice = 'Moment ' + (flow.chain ? rLabel(PLAN[flow.chain.slot].r) : '') + ' terminé. ' + msg;
    flow = newFlow(); form = null; go('home');
  }
  function chainFeel() { // moment « relevé + tests » : le relevé est enregistré tout de suite, puis viennent les tests
    if (!flow.chain || !feelComplete()) return;
    var ts = Date.now();
    flow.feelTs = ts;
    pushReleve(ts, L.getWake());
    entries.sort(byTs);
    var ok = persist();
    updateAlert();
    chainGo();
    if (!ok) { notice = 'Attention : l’appareil refuse d’enregistrer.'; render(); notice = ''; }
  }
  function chainGo() { // ouvre la consigne du prochain test à faire dans le moment
    var ch = flow.chain;
    if (!ch) { go('home'); return; }
    var cs = chainState(), t = cs && cs.s.chain.todo[0];
    if (!t) { notice = 'Moment ' + rLabel(PLAN[ch.slot].r) + ' terminé.'; flow = newFlow(); go('home'); return; }
    flow.test = t; flow.result = null; flow.tMode = 'test'; flow.prac = null; flow.chainMsg = '';
    go(t === 'pvt' ? 'intro' : t + '-intro');
  }
  function chainStop() {
    var cs = chainState(), r = flow.chain ? rLabel(PLAN[flow.chain.slot].r) : '';
    notice = cs && cs.s.kind === 'open'
      ? 'Moment ' + r + ' arrêté : ce qui est fait est gardé. Tu peux le reprendre jusqu’à ' + cs.s.endAt + '.'
      : 'Moment ' + r + ' arrêté : ce qui est fait est gardé ; le moment sera noté « Incomplet ».';
    flow = newFlow(); form = null; go('home');
  }
  function vChain() {
    var cs = chainState();
    if (!cs || !cs.s.needT) { screen = 'home'; flow = newFlow(); return vHome(); }
    var c = cs.s.chain, m = cs.m, d = cs.info.done[cs.ch.slot] || { tests: {} }, next = c.todo[0], open = cs.s.kind === 'open';
    var rows = c.steps.map(function (t, i) {
      var isDone = c.todo.indexOf(t) < 0, ent = t === 'pvt' ? d.test : d.tests[t];
      return '<li class="ch-it' + (isDone ? ' done' : (t === next ? ' next' : '')) + '"><span class="ch-n">' + (isDone ? ICON_CHECK : (i + 1)) + '</span>' +
        '<span class="ch-t">' + esc(STEP_NAME[t]) + '</span><span class="ch-d">' + (isDone && ent ? clockOf(ent.ts) : '≈ ' + (stepSec(t) < 60 ? stepSec(t) + ' s' : pDur(stepSec(t)))) + '</span></li>';
    }).join('');
    var msg = notice || flow.chainMsg;
    return '<header class="subhead"><div class="top">' + back('chain-stop', 'Journal') + '<span class="module">' + rLabel(m.r) + ' · ' + (c.steps.length - c.todo.length) + ' sur ' + c.steps.length + ' faits</span></div>' +
      '<h1 tabindex="-1">Suite du moment</h1><p class="sub">' + esc(m.name) + '</p></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      (msg ? '<p class="j-ok" role="status">' + esc(msg) + '</p>' : '') +
      '<section class="j-card"><h2 class="j-kick">DANS CE MOMENT</h2><ol class="ch-list">' + rows + '</ol></section>' +
      '<p class="j-p">Continue quand tu es prêt. Tu peux aussi t’arrêter ici : ce qui est enregistré est gardé' +
      (open ? ', et tu peux reprendre depuis l’accueil jusqu’à ' + cs.s.endAt : ' ; le moment sera noté « Incomplet »') + '.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="chain-go">Continuer · ' + esc(STEP_NAME[next]) + '</button>' +
      '<button type="button" class="btn ghost" data-act="chain-stop">Arrêter ici</button></div>';
  }

  // « Pas ce moment » : un mot libre, facultatif, gardé avec la journée (pour savoir si un trou vient d'une occupation ou d'un creux). Aucun rattrapage.
  function skipOpen(i) {
    var s = slotStates(todayInfo()).list[i];
    if (!s || !s.chain || s.skip || (s.kind !== 'open' && s.kind !== 'past')) return;
    form = { type: 'skip', slot: i, text: '' };
    go('skip');
  }
  function doSkip() {
    if (!form || form.type !== 'skip') return;
    var info = todayInfo(), s = slotStates(info).list[form.slot];
    if (!s || !s.chain || s.skip) { form = null; go('home'); return; }
    var e = baseEntry('pas', Date.now(), L.getWake()), tx = form.text.trim().slice(0, 300), r = rLabel(PLAN[form.slot].r);
    e.slot = form.slot;
    if (tx) e.text = tx;
    e.pj = { d: s.chain.d, p: s.chain.plan, st: s.chain.stage };
    entries.push(e);
    afterSave('Noté pour ' + r + ' : pas ce moment. Rien à rattraper.');
  }
  function vSkip() {
    var m = form && form.type === 'skip' ? PLAN[form.slot] : null;
    if (!m) { screen = 'home'; return vHome(); }
    return formHeader('Pas ce moment', esc(rLabel(m.r)) + ' · ' + esc(m.name)) +
      '<main style="padding-top:14px;gap:10px">' +
      '<label for="j-skiptext" class="j-lab" style="margin:0 5px">Ce qui se passe (facultatif)</label>' +
      '<textarea id="j-skiptext" class="j-ta mid" maxlength="300" placeholder="Réunion, déplacement, pas envie, fatigué…" aria-label="Pourquoi pas ce moment">' + esc(form.text) + '</textarea>' +
      '<p class="j-p">Rien à rattraper : le moment reste « Passé », jamais « Manqué ». Ton mot est gardé avec ta journée et aide à relire tes résultats : un trou dû à une occupation n’a pas le même sens qu’un trou dû à un creux.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="skip-go">Noter</button>' +
      '<button type="button" class="btn ghost" data-act="home">Annuler</button></div>';
  }

  /* ---------- Activités ---------- */
  function openActStart() {
    form = { type: 'act-start', name: '', other: !actNames.length, time: clockInput(Date.now()), feelStart: {}, feelOpen: false, error: '' };
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

  /* ---------- Creux (depuis le 09/11, f1) ---------- */
  function openCreuxStart() {
    if (currentCreux()) { openCreuxEnd(); return; } // un seul creux à la fois : le bouton sert alors à le terminer
    form = { type: 'creux-start', time: clockInput(Date.now()), note: '', error: '' };
    go('creux-start');
  }
  // Question du creux (F2) : « Oui » ouvre l'écran de début (heure proposée = maintenant, modifiable) ; « Non » est noté tout de suite.
  function qNoteNow(i) { var el = $('j-qnote-' + i); return (el ? el.value : (qDraft[i] || '')).trim().slice(0, 500); }
  function openQYes(i) {
    var info = todayInfo(), s = slotStates(info).list[i];
    if (!PLAN[i] || !PLAN[i].q || !s || !s.qpend) { go('home'); return; } // déjà répondue
    if (currentCreux()) { openCreuxEnd(); return; }
    form = { type: 'creux-start', time: clockInput(Date.now()), note: qNoteNow(i), error: '', qslot: i, qans: Date.now() };
    go('creux-start');
  }
  function doQNo(i) {
    var info = todayInfo(), s = slotStates(info).list[i];
    if (!PLAN[i] || !PLAN[i].q || !s || !s.qpend) { go('home'); return; }
    var now = Date.now(), e = baseEntry('creuxq', now, L.getWake()), nt = qNoteNow(i);
    e.slot = i; e.ans = 'non';
    if (nt) e.note = nt;
    delete qDraft[i];
    entries.push(e);
    afterSave('Réponse « non » notée à ' + clockOf(now) + ' pour la question de ' + rLabel(PLAN[i].r) + (qLate(e) ? ' (réponse tardive).' : '.'));
  }
  function doCreuxStart() {
    if (!form || form.type !== 'creux-start' || !formValid()) return;
    var ts = tsFromClock(form.time, Date.now()), ov = creuxOverlap(ts, null, '');
    if (ov) { form.error = 'Cette heure tombe pendant un autre creux (' + clockOf(ov.ts) + (ov.end == null ? ', en cours' : ' → ' + clockOf(ov.end)) + ').'; render(); return; }
    var e = baseEntry('creux', ts, L.getWake()), nt = form.note.trim().slice(0, 500);
    e.end = null; e.origin = 'libre';
    if (form.qslot != null && PLAN[form.qslot] && PLAN[form.qslot].q) { e.origin = 'question'; e.slot = form.qslot; e.ansTs = form.qans; delete qDraft[form.qslot]; }
    if (nt) e.note = nt;
    entries.push(e);
    var fsl = creuxFreeSlot(e);
    afterSave('Creux noté à ' + clockOf(ts) + (e.origin === 'question' ? ' (réponse « oui » à la question de ' + rLabel(PLAN[e.slot].r) + (qLate(e) ? ', réponse tardive' : '') + ')' : (fsl >= 0 ? ' (compté comme « oui » à la question de ' + rLabel(PLAN[fsl].r) + ')' : '')) + '. Il reste ouvert jusqu’à ce que tu le termines (4 h au maximum).');
  }
  function openCreuxEnd() {
    var c = currentCreux();
    if (!c) { go('home'); return; }
    form = { type: 'creux-end', id: c.id, time: clockInput(Date.now()), note: c.endNote || '', error: '' };
    go('creux-end');
  }
  function doCreuxEnd(withTest) { // withTest (F3) : la fin est enregistrée tout de suite, puis on propose de choisir un test « fin de creux »
    if (!form || form.type !== 'creux-end' || !formValid()) return;
    var c = creuxById(form.id);
    if (!c) return;
    var ts = creuxEndTs(form.time, c);
    if (ts === null || ts < c.ts) { form.error = 'L’heure de fin est avant le début (' + clockOf(c.ts) + ').'; render(); return; }
    if (ts - c.ts > CREUX_MAX) { form.error = 'Un creux dure 4 h au maximum : vérifie l’heure de fin.'; render(); return; }
    var ov = creuxOverlap(c.ts, ts, c.id);
    if (ov) { form.error = 'Ce creux chevaucherait un autre creux (' + clockOf(ov.ts) + (ov.end == null ? ', en cours' : ' → ' + clockOf(ov.end)) + ').'; render(); return; }
    c.end = ts; delete c.endAuto;
    var nt = form.note.trim().slice(0, 500);
    if (nt) c.endNote = nt; else delete c.endNote;
    var endMsg = 'Creux terminé à ' + clockOf(ts) + ' (' + durText((ts - c.ts) / 60000) + ').';
    if (!withTest) { afterSave(endMsg); return; }
    entries.sort(byTs);
    if (!persist()) endMsg += ' Attention : l’appareil refuse d’enregistrer.';
    flow = newFlow({ mode: 'test', fin: c.id, finMsg: endMsg + ' Choisis un test pour en marquer la fin.', finDone: endMsg });
    form = null; updateAlert(); go('tests');
  }

  /* ---------- Instants ---------- */
  function openInstant() {
    form = { type: 'instant', name: '', other: false, jtype: '', time: clockInput(Date.now()), error: '' };
    go('instant');
  }
  function doInstant() {
    if (!form || !formValid()) return;
    var name = form.name.trim().slice(0, 40), ts = tsFromClock(form.time, Date.now()), e = baseEntry('instant', ts, L.getWake());
    e.name = name;
    if (isJoint(name) && jtypeOk(form.jtype)) e.jtype = form.jtype;
    entries.push(e);
    afterSave('« ' + name + (e.jtype ? ' · ' + jtLabel(e.jtype).toLowerCase() : '') + ' » noté à ' + clockOf(ts) + '.');
  }
  // Type du joint : touche = choisi, retouche = enlevé (écran Instant ou « Modifier » d'un instant).
  function pickJt(id) {
    if (!form || !(form.type === 'instant' || (form.type === 'edit' && form.kind === 'instant')) || !jtypeOk(id)) return;
    form.jtype = form.jtype === id ? '' : id;
    render();
    var b = root.querySelector('[data-act="jtype"][data-id="' + id + '"]'); if (b) b.focus({ preventScroll: true });
  }
  // Choix d'un motif sur les grandes touches (activité ou instant).
  function pickName(name) {
    if (!form || (form.type !== 'act-start' && form.type !== 'instant')) return;
    form.name = name; form.other = false;
    if (!isJoint(name)) form.jtype = '';
    render();
  }
  function pickOther() {
    if (!form || (form.type !== 'act-start' && form.type !== 'instant')) return;
    if (!form.other) { form.other = true; form.name = ''; render(); }
    var inp = $('f-name'); if (inp) inp.focus({ preventScroll: true });
  }

  /* ---------- Réglages : listes de motifs ---------- */
  function setAdd(which) {
    if (which !== 'act' && which !== 'inst' && which !== 'nt') return;
    setNoticeIn = which === 'nt' ? 'nt' : '';
    if (which === 'nt') { // type de note libre : la section est tout en bas, on reste où l'on est (comme pour setDel)
      var tn = typeName(setDraft.nt), tr = tn ? addTypeName(tn) : 'vide';
      if (tr === 'ok') { saveNoteTypeNames(); setDraft.nt = ''; setNotice = '« ' + tn + ' » ajoutée aux catégories de note.'; }
      else if (tr === 'doublon') setNotice = '« ' + tn + ' » est déjà dans la liste.';
      else if (tr === 'reserve') setNotice = '« ' + tn + ' » existe déjà : c’est l’une des catégories de départ.';
      else if (tr === 'pleine') setNotice = 'La liste est pleine (' + NT_MAX + ' catégories) : retires-en une d’abord.';
      else setNotice = 'Écris un nom de ' + NT_LEN + ' caractères au plus.';
      renderKeepScroll();
      var ti = $('set-nt'); if (ti) ti.focus({ preventScroll: true });
      return;
    }
    var list = which === 'act' ? actNames : instNames, name = (setDraft[which] || '').trim().slice(0, 40);
    if (!name) return;
    var r = addToList(list, name);
    if (r === 'ok') { if (which === 'act') saveActNames(); else saveInstNames(); setDraft[which] = ''; setNotice = '« ' + name + ' » ajouté.'; }
    else if (r === 'doublon') setNotice = '« ' + name + ' » est déjà dans la liste.';
    else setNotice = 'La liste est pleine (30 motifs) : retires-en un d’abord.';
    render();
    var inp = $('set-' + which); if (inp) inp.focus({ preventScroll: true });
  }
  function renderKeepScroll() { // render() remonte en haut ; ici on revient à la position de l'écran (liste en bas de Réglages)
    var m0 = root.querySelector('main'), top = m0 ? m0.scrollTop : 0;
    render();
    var m1 = root.querySelector('main');
    if (m1) m1.scrollTop = top;
  }
  function setDel(which, name) {
    setNoticeIn = which === 'nt' ? 'nt' : '';
    if (which === 'act') { actNames = actNames.filter(function (n) { return n !== name; }); saveActNames(); }
    else if (which === 'inst') { instNames = instNames.filter(function (n) { return n !== name; }); saveInstNames(); }
    else if (which === 'nt') { noteTypeNames = noteTypeNames.filter(function (n) { return n !== name; }); saveNoteTypeNames(); }
    else return;
    setNotice = which === 'nt' ? '« ' + name + ' » retirée des catégories de note. Les notes déjà classées gardent cette catégorie.' : '« ' + name + ' » retiré de la liste. Ton historique n’est pas modifié.';
    if (which === 'nt') renderKeepScroll(); else render();
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
  function openNoteFrom(id) { // « Créer à partir de… » : l'écran « Note libre », avec la note d'origine rappelée
    var o = entries.filter(function (x) { return x.id === id && x.kind === 'note'; })[0];
    if (!o) return;
    pendingDel = null; ret = screen === 'history' ? 'history' : 'home';
    noteText = ''; noteSel = { id: '', sub: '', other: false, txt: '' }; noteFrom = o.id; noteTs = Date.now();
    go('note');
  }
  function linkGo(id) { // « Voir » : l'historique des notes sans filtre, la note visée au milieu de l'écran et au clavier
    pendingDel = null;
    var keepDir = hf.dir; hfReset(); hf.genre = 'note'; hf.dir = keepDir; // l'ordre choisi par Jonathan est gardé (il ne change pas ce qui est visible)
    histRefresh();
    var t = null;
    Array.prototype.forEach.call(root.querySelectorAll('[data-eid]'), function (x) { if (x.getAttribute('data-eid') === id) t = x; });
    if (!t) return;
    t.classList.add('hl'); t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
    t.scrollIntoView({ block: 'center' });
  }
  function openEdit(id) {
    var e = entries.filter(function (x) { return x.id === id; })[0];
    if (e && e.kind === 'nuit') { openNight(id, screen === 'history' ? 'history' : 'wake'); return; } // une nuit se corrige sur l'écran « Ma nuit »
    if (!e || ['activite', 'creux', 'repas', 'coucher', 'instant', 'note'].indexOf(e.kind) < 0) return;
    ret = screen === 'history' ? 'history' : 'home';
    form = { type: 'edit', id: id, kind: e.kind, time: clockInput(e.ts), error: '' };
    if (e.kind === 'note') {
      form.text = e.text; form.orig = e.text.trim();
      form.sel = { id: noteTypeOf(e.ntype).id, sub: noteTypeOf(e.ntype).id && e.nsub ? e.nsub : '', other: false, txt: '' }; form.selOrig = selKey(form.sel);
      form.ans = ansAnswered(e) ? e.ans : ''; form.ansOrig = form.ans.trim();
      form.att = attFilled(e) ? e.att : ''; form.attOrig = form.att.trim();
    }
    if (e.kind === 'activite') {
      form.name = e.name; form.end = e.end == null ? '' : clockInput(e.end); form.comment = e.comment || '';
      form.feelStart = Object.assign({}, e.feelStart || {}); form.feelEnd = Object.assign({}, e.feelEnd || {});
      form.feelOpen = !!e.feelStart; form.feelOpen2 = !!e.feelEnd;
    }
    if (e.kind === 'creux') { form.end = e.end == null ? '' : clockInput(e.end); form.note = e.note || ''; form.endNote = e.endNote || ''; form.endAuto = !!e.endAuto; }
    if (e.kind === 'repas') form.text = e.text;
    if (e.kind === 'instant') { form.name = e.name; form.jtype = jtypeOk(e.jtype) ? e.jtype : ''; }
    go('edit');
  }
  function doEdit() {
    if (!form || !formValid()) return;
    var e = entries.filter(function (x) { return x.id === form.id; })[0];
    if (!e) return;
    if (e.kind === 'note') { // le texte, le type et la réponse peuvent changer ; `ts` (création) ne bouge pas ; `modTs` ne bouge que si le TEXTE change (classer une note ou y répondre ne la « modifie » pas : la réponse a sa propre heure, `ansTs`)
      var nt = form.text.trim().slice(0, 5000), textCh = nt !== e.text, nid = noteTypeOf(form.sel.id).id, nsb = selSub(form.sel), typeCh = selKey(form.sel) !== (noteTypeOf(e.ntype).id + '|' + (noteTypeOf(e.ntype).id ? e.nsub || '' : ''));
      var na = (form.ans || '').trim().slice(0, 5000), oa = ansAnswered(e) ? e.ans.trim() : '', ansCh = na !== oa;
      var nat = (form.att || '').trim().slice(0, 5000), oat = attFilled(e) ? e.att.trim() : '', attCh = nat !== oat;
      if (!textCh && !typeCh && !ansCh && !attCh) { afterSave('Rien n’a changé.'); return; }
      if (typeCh) { if (nid) e.ntype = nid; else delete e.ntype; if (nid && nsb) e.nsub = nsb; else delete e.nsub; e.catTs = Math.max(Date.now(), e.ts + 1); } // `catTs` : heure du classement, pour la bannière de sauvegarde (classer 100 notes, c'est du travail à ne pas perdre)
      if (textCh) { e.text = nt; e.modTs = Math.max(Date.now(), e.ts + 1); }
      if (ansCh) {
        if (na) { e.ans = na; if (!oa) e.ansTs = Math.max(Date.now(), e.ts + 1); } // l'heure de la première réponse est gardée quand on la corrige
        else { delete e.ans; delete e.ansTs; }
      }
      if (attCh) { // note rattachée : même règle que la réponse (l'heure de la première fois est gardée)
        if (nat) { e.att = nat; if (!oat) e.attTs = Math.max(Date.now(), e.ts + 1); }
        else { delete e.att; delete e.attTs; }
      }
      afterSave(textCh && ansCh && attCh ? 'Note et ajouts enregistrés.' : textCh && ansCh ? 'Note et réponse enregistrées.' : textCh && attCh ? 'Note et note rattachée enregistrées.' : textCh ? 'Note modifiée.' : ansCh && !attCh ? (na ? (oa ? 'Réponse modifiée.' : 'Réponse enregistrée.') : 'Réponse retirée.') :
        attCh && !ansCh ? (nat ? (oat ? 'Note rattachée modifiée.' : 'Note rattachée enregistrée.') : 'Note rattachée retirée.') : ansCh && attCh ? 'Réponse et note rattachée enregistrées.' : 'Catégorie de la note changée.');
      return;
    }
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
    } else if (e.kind === 'creux') {
      var cend = null;
      if (form.end) {
        cend = tsAfter(form.end, ts);
        if (cend - ts > CREUX_MAX) { form.error = 'Un creux dure 4 h au maximum : vérifie l’heure de fin.'; render(); return; }
      } else {
        var oc = currentCreux();
        if (oc && oc.id !== e.id) { form.error = 'Un autre creux est déjà en cours (depuis ' + clockOf(oc.ts) + ') : un seul à la fois. Indique une heure de fin.'; render(); return; }
      }
      var ovl = creuxOverlap(ts, cend, e.id);
      if (ovl) { form.error = 'Ce creux chevaucherait un autre creux (' + clockOf(ovl.ts) + (ovl.end == null ? ', en cours' : ' → ' + clockOf(ovl.end)) + ').'; render(); return; }
      var keepAuto = !!e.endAuto && cend !== null && e.end != null && Math.floor(cend / 60000) === Math.floor(e.end / 60000); // fin automatique inchangée : elle reste « automatique »
      e.ts = ts; e.end = cend;
      if (keepAuto) e.endAuto = true; else delete e.endAuto;
      var cn1 = form.note.trim().slice(0, 500), cn2 = form.endNote.trim().slice(0, 500);
      if (cn1) e.note = cn1; else delete e.note;
      if (cn2 && cend !== null) e.endNote = cn2; else delete e.endNote;
    } else if (e.kind === 'repas') {
      e.text = form.text.trim().slice(0, 1000); e.ts = ts;
    } else if (e.kind === 'instant') {
      e.name = form.name.trim().slice(0, 40); e.ts = ts;
      if (isJoint(e.name) && jtypeOk(form.jtype)) e.jtype = form.jtype; else delete e.jtype;
    } else {
      e.ts = ts;
      if (e.wakeTs && !(e.wakeTs > ts && e.wakeTs - ts < 20 * 3600e3)) delete e.wakeTs;
    }
    e.day = dayKey(e.ts, e.wake); e.rel = relAt(e.ts, e.wake);
    normalizeActs(); creuxSweep();
    afterSave('Modifié.');
  }

  /* ---------- Sauvegarde ---------- */
  // Journal des listes de mots (Memory List) rapporté d'un fichier : fusionné (sans doublon) ou, en mode « Remplacer », mis à la place de celui de l'appareil.
  function mlLogRestore(list, replace) {
    var all = replace ? [] : mlLogRead(), seen = {}, out = [];
    all.concat(list).forEach(function (x) { var k = x[0] + '|' + x[1]; if (!seen[k]) { seen[k] = true; out.push([x[0], x[1]]); } });
    out.sort(function (a, b) { return a[1] - b[1]; });
    try { localStorage.setItem(KEY_ML, JSON.stringify(out.slice(-400))); } catch (e) {}
  }
  // Format v5 (e5, 20/11) : + entrées « nuit », relevés à questions partielles (`fv` 3) et le mantra. Une appli d'avant e5 refuse un fichier v5 (« version plus récente ») au lieu de perdre ces données en silence.
  // (v4 : liste des instants et entrées « instant ». v3 : réglages du plan + journal des listes de mots.) Les fichiers v1 à v4 restent lisibles.
  function buildBackup() {
    return JSON.stringify({ app: 'Kioo Cycle', v: 5, exportedAt: Date.now(), wake: L.wakeStr(L.getWake()), activities: actNames, instants: instNames, noteTypes: noteTypeNames, entries: entries, plan: pExport(), mlUsed: mlLogRead(), mantra: mantra || undefined });
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
    var name = 'kioo-cycle-sauvegarde-' + keyOf(new Date()) + '.json';
    setStatus('');
    shareOrDownload(buildBackup(), name, 'application/json', 'Sauvegarde Kioo Cycle', {
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
  // Rappels « Sauvegarder Kioo » (depuis le 09/11) : R+5h10 et R+8h15 suivent le réveil, 19h00 est une heure d'horloge fixe (choix de Jonathan, 04/11).
  var BK_REM = [{ r: 310 }, { r: 495 }, { fixed: 19 * 60 }];
  function remAny() { return !!(rem.moments || rem.phases || rem.backups); }
  function bkTimesText(w) { return L.fmt(w + BK_REM[0].r) + ', ' + L.fmt(w + BK_REM[1].r) + ' et 19h00'; }
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

  // Les rappels du jour, définis UNE seule fois : le fichier calendrier (.ics) et l'envoi à Google Agenda les utilisent tous les deux.
  // `key` (m0, p2…) sert à fabriquer des identifiants stables ; `start` est une date locale ; `dur` est en minutes.
  function remEvents(o, now) {
    var wake = L.getWake(), ev = [];
    function at(total) { return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, total, 0); }
    var wk = L.fmtClock(wake);
    if (o.moments) PLAN.forEach(function (m, i) {
      if (m.off) return; // moment retiré du plan (R+7h) : pas de rappel
      ev.push({ key: 'm' + pad(i), uid: 'luna-moment-' + i, start: at(wake + m.r), dur: 15, summary: 'Kioo Cycle · ' + momLabel(m),
        desc: 'Moment prévu à ' + L.fmt(wake + m.r) + ' (' + rLabel(m.r) + ', calé sur ton réveil de ' + wk + '). ' + momGoal(m) + (/[?!.]$/.test(momGoal(m)) ? '' : '.') +
          ' Fenêtre : de ' + L.fmt(wake + m.r - WIN.before) + ' à ' + L.fmt(wake + m.r + WIN.after) + '. Si ce moment passe, ce n’est pas grave.' });
    });
    if (o.phases) remPhases().forEach(function (p, i) {
      ev.push({ key: 'p' + pad(i), uid: 'luna-phase-' + i, start: at(wake + p.s), dur: 5, summary: 'Kioo Cycle · Nouvelle phase · ' + p.name,
        desc: 'Début vers ' + L.fmt(wake + p.s) + ' (moyenne calée sur ton réveil de ' + wk + '). ' + p.advice +
          ' Étiquette : ' + p.status + (p.durLabel ? ' · durée : ' + p.durLabel.toLowerCase() : '') + '.' });
    });
    if (o.backups) BK_REM.forEach(function (b, i) {
      var t = b.fixed != null ? b.fixed : wake + b.r;
      ev.push({ key: 'b' + pad(i), uid: 'luna-backup-' + i, start: at(t), dur: 5, summary: 'Sauvegarder Kioo',
        desc: 'Rappel de sauvegarde à ' + L.fmt(t) + (b.fixed != null ? ' (heure fixe)' : ' (' + rLabel(b.r) + ', calé sur ton réveil de ' + wk + ')') +
          '. Ouvre Kioo Cycle, puis Journal, Sauvegarder / Restaurer, Sauvegarder (fichier). Chaque fichier est complet : seul le plus récent compte, tu peux effacer les anciens. Si ce moment passe, ce n’est pas grave.' });
    });
    return ev;
  }

  // Heures « flottantes » (sans fuseau) : le calendrier les lit à l'heure locale de l'appareil.
  function buildIcs(o) {
    var now = new Date(), ev = [];
    var seq = Math.max(0, Math.floor((now.getTime() - Date.UTC(2026, 9, 1)) / 60000)); // monte à chaque nouvelle version du fichier
    // Un seul jour : identifiants datés (refaire le fichier le même jour met les rappels à jour ; un autre jour en crée de nouveaux).
    var dayTag = o.days === 1 ? '-' + keyOf(now).replace(/-/g, '') : '';
    remEvents(o, now).forEach(function (r) {
      var s = r.start, e = new Date(s.getTime() + r.dur * 60000);
      var lines = ['BEGIN:VEVENT', 'UID:' + r.uid + dayTag + '@luna.local', 'DTSTAMP:' + icsUtc(now), 'SEQUENCE:' + seq,
        'DTSTART:' + icsLocal(s), 'DTEND:' + icsLocal(e)];
      if (o.days > 1) lines.push('RRULE:FREQ=DAILY;COUNT=' + o.days);
      ev.push(lines.concat(['SUMMARY:' + icsEsc(r.summary), 'DESCRIPTION:' + icsEsc(r.desc), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(r.summary), 'TRIGGER:-PT0M', 'END:VALARM', 'END:VEVENT']));
    });
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kioo Cycle//Rappels//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Kioo Cycle'];
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
    if (!remAny()) return;
    var out = buildIcs(rem), name = 'kioo-cycle-rappels-' + keyOf(new Date()) + '.ics';
    var what = rem.days === 1 ? plural(out.count, 'rappel', 'rappels') + ' pour aujourd’hui'
                                : plural(out.count, 'rappel', 'rappels') + ' par jour, pendant ' + rem.days + ' jours';
    setRStatus('');
    shareOrDownload(out.text, name, 'text/calendar', 'Rappels Kioo Cycle', {
      shared: function () { setRStatus('Fichier « ' + name + ' » partagé (' + what + '). Ouvre-le avec ton calendrier pour l’ajouter.'); },
      downloaded: function () { setRStatus('Fichier « ' + name + ' » téléchargé (' + what + '). Ouvre-le pour l’ajouter à ton calendrier.'); },
      aborted: function () { setRStatus('Envoi annulé.'); },
      failed: function () { setRStatus('Le téléchargement a échoué.'); }
    });
  }

  /* ---------- Rappels : envoi direct à Google Agenda ---------- */
  // Un bouton envoie les rappels du jour dans un agenda « Kioo Cycle » à part, sur le compte Google de l'utilisateur.
  // Tout part du navigateur de l'utilisateur vers Google : aucun serveur de l'appli, aucune donnée chez nous.
  // Seule autorisation demandée : créer cet agenda et y gérer des événements (calendar.app.created) ; le reste de l'agenda reste inaccessible.
  // Actif seulement si kioo-config.js contient un identifiant client Google ; sinon le bouton n'existe pas.
  var G_SCOPE = 'https://www.googleapis.com/auth/calendar.app.created';
  var G_API = 'https://www.googleapis.com/calendar/v3';
  var KEY_GCAL = 'kioo.gcal.id', KEY_GSENT = 'kioo.gcal.sent'; // agenda créé sur cet appareil ; derniers identifiants envoyés (pour ne pas laisser de doublons)
  var gStatus = '', gBusy = false, gLibTried = false;
  var G_AUTH_MSG = {
    lib: 'Connexion à Google impossible pour le moment (pas de réseau ?). Réessaie dans un instant.',
    closed: 'Connexion à Google annulée. Rien n’a été envoyé.',
    popup: 'Le navigateur a bloqué la fenêtre de connexion Google. Autorise-la, puis réessaie.',
    denied: 'Accès refusé : rien n’a été envoyé.',
    scope: 'Google n’a pas accordé l’accès demandé. Rien n’a été envoyé.',
    other: 'La connexion à Google a échoué. Rien n’a été envoyé.'
  };

  function gClientId() { var c = window.KIOO_CONFIG; return c && typeof c.googleClientId === 'string' ? c.googleClientId.trim() : ''; }
  function gEnabled() { return gClientId() !== ''; }
  function gReady() { return !!(window.google && window.google.accounts && window.google.accounts.oauth2); }
  // La bibliothèque de connexion de Google se charge dès l'affichage de l'écran Rappels (jamais avant) : au clic, la fenêtre doit pouvoir s'ouvrir tout de suite.
  function gLoadLib() {
    if (!gEnabled() || gReady() || gLibTried || navigator.onLine === false) return;
    gLibTried = true;
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onerror = function () { gLibTried = false; if (s.parentNode) s.parentNode.removeChild(s); };
    document.head.appendChild(s);
  }
  function gCalGet() { try { return localStorage.getItem(KEY_GCAL) || ''; } catch (e) { return ''; } }
  function gCalSet(id) { try { if (id) localStorage.setItem(KEY_GCAL, id); else localStorage.removeItem(KEY_GCAL); } catch (e) {} }
  function gSentGet() { try { var o = JSON.parse(localStorage.getItem(KEY_GSENT)); return o && Array.isArray(o.ids) ? o : null; } catch (e) { return null; } }
  function gSentSet(o) { try { if (o) localStorage.setItem(KEY_GSENT, JSON.stringify(o)); else localStorage.removeItem(KEY_GSENT); } catch (e) {} }
  function gTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
  // Heure locale au format RFC 3339 ; avec le décalage seulement si le nom du fuseau est inconnu.
  function gLocal(d, withOffset) {
    var s = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
    if (!withOffset) return s;
    var off = -d.getTimezoneOffset(), sg = off < 0 ? '-' : '+';
    off = Math.abs(off);
    return s + sg + pad(Math.floor(off / 60)) + ':' + pad(off % 60);
  }
  function setGStatus(msg) {
    gStatus = msg;
    var el = $('j-gstatus');
    if (el) el.textContent = msg;
  }
  function gPaint() { var b = $('j-gk'); if (b) b.disabled = gBusy || !remAny(); }

  // Jeton d'accès de courte durée (Google Identity Services, « token model »). À appeler directement depuis le clic : sinon le navigateur bloque la fenêtre.
  // cb(code) en cas d'échec (clés de G_AUTH_MSG), cb(null, jeton) en cas de succès.
  function gToken(cb) {
    if (!gReady()) { cb('lib'); return; }
    var done = false;
    function fin(err, tok) { if (done) return; done = true; cb(err, tok); }
    try {
      var oa = window.google.accounts.oauth2;
      var c = oa.initTokenClient({
        client_id: gClientId(), scope: G_SCOPE, prompt: '',
        callback: function (r) {
          if (!r || r.error || !r.access_token) fin(r && r.error === 'access_denied' ? 'denied' : 'other');
          else if (oa.hasGrantedAllScopes && !oa.hasGrantedAllScopes(r, G_SCOPE)) fin('scope');
          else fin(null, r.access_token);
        },
        error_callback: function (e) { fin(e && e.type === 'popup_closed' ? 'closed' : e && e.type === 'popup_failed_to_open' ? 'popup' : 'other'); }
      });
      c.requestAccessToken();
    } catch (e) { fin('other'); }
  }

  function gSleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // Appel à l'API Google Agenda. Limite de débit (429, ou 403 « rateLimit ») : jusqu'à 3 nouvelles tentatives, de plus en plus espacées.
  function gCall(tok, method, path, body, n) {
    n = n || 0;
    var h = { 'Authorization': 'Bearer ' + tok };
    if (body) h['Content-Type'] = 'application/json';
    return fetch(G_API + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if ((r.status === 429 || (r.status === 403 && /rateLimit|quotaExceeded/i.test(t))) && n < 3) {
          return gSleep(600 * Math.pow(2, n)).then(function () { return gCall(tok, method, path, body, n + 1); });
        }
        return { status: r.status, json: j };
      });
    }, function () { var e = new Error('net'); e.gNet = true; throw e; });
  }
  function gReason(res) {
    try { var e = res.json.error; return (e.errors && e.errors[0] && e.errors[0].reason) || e.status || ''; } catch (x) { return ''; }
  }
  function gTail(sent) {
    return sent > 0 ? ' ' + plural(sent, 'rappel est déjà parti', 'rappels sont déjà partis') + ' : renvoie, ils seront mis à jour sans doublon.' : ' Rien n’a été envoyé.';
  }
  function gHttpErr(res, sent) {
    var st = res.status, why = gReason(res), m;
    if (st === 401) m = 'L’accès à Google a expiré. Touche de nouveau le bouton.';
    else if (st === 403) m = 'Google a refusé la demande (403' + (why ? ' · ' + why : '') + '). Vérifie la configuration : identifiant client, API Google Agenda activée.';
    else if (st >= 500) m = 'Google a un souci en ce moment (' + st + '). Réessaie un peu plus tard.';
    else m = 'Google n’a pas accepté la demande (' + st + (why ? ' · ' + why : '') + ').';
    var e = new Error(m); e.gBase = m; e.gSent = sent; return e;
  }

  // Agenda « Kioo Cycle » à part : créé une fois, son identifiant est gardé sur l'appareil. Supprimer cet agenda retire tous les rappels d'un coup.
  function gEnsureCal(tok, tz) {
    var id = gCalGet();
    if (id) return Promise.resolve(id);
    var body = { summary: 'Kioo Cycle', description: 'Rappels créés par l’appli Kioo Cycle. Supprime cet agenda pour tout retirer.' };
    if (tz) body.timeZone = tz;
    return gCall(tok, 'POST', '/calendars', body).then(function (res) {
      if (res.status >= 200 && res.status < 300 && res.json && res.json.id) { gCalSet(res.json.id); return res.json.id; }
      throw gHttpErr(res, 0);
    });
  }
  // Identifiant stable (lettres a–v et chiffres, comme l'exige Google) : renvoyer le même jour met à jour au lieu de doubler.
  function gEventId(e, o, now) { return 'kioo' + (o.days > 1 ? 's' : '') + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + e.key; }
  function gBody(e, o, tz) {
    var end = new Date(e.start.getTime() + e.dur * 60000), off = !tz;
    var b = { summary: e.summary, description: e.desc, status: 'confirmed', transparency: 'transparent',
      start: { dateTime: gLocal(e.start, off) }, end: { dateTime: gLocal(end, off) },
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 0 }] } }; // alarme à l'heure exacte, comme dans le fichier .ics
    if (tz) { b.start.timeZone = tz; b.end.timeZone = tz; }
    if (o.days > 1) b.recurrence = ['RRULE:FREQ=DAILY;COUNT=' + o.days];
    return b;
  }
  function gUpsert(tok, calId, id, body) {
    var base = '/calendars/' + encodeURIComponent(calId) + '/events', withId = { id: id };
    Object.keys(body).forEach(function (k) { withId[k] = body[k]; });
    return gCall(tok, 'POST', base, withId).then(function (res) {
      if (res.status === 409) return gCall(tok, 'PUT', base + '/' + id, withId); // l'identifiant existe déjà (ou a été supprimé plus tôt) : mise à jour
      return res;
    });
  }

  // Envoie les rappels du jour. Renvoie une promesse ; en cas d'échec, l'erreur porte le message à afficher (gMsg).
  function gSend(tok) {
    var now = new Date(), o = { moments: rem.moments, phases: rem.phases, backups: rem.backups, days: rem.days }, tz = gTz();
    var evs = remEvents(o, now), ids = evs.map(function (e) { return gEventId(e, o, now); });
    var dateTag = keyOf(now), prev = gSentGet(), retried = false, progress = 0;
    function attempt() {
      progress = 0;
      return gEnsureCal(tok, tz).then(function (calId) {
        var i = 0;
        function next() {
          if (i >= evs.length) return Promise.resolve();
          var k = i++;
          setGStatus('Envoi… ' + (k + 1) + ' sur ' + evs.length);
          return gUpsert(tok, calId, ids[k], gBody(evs[k], o, tz)).then(function (res) {
            if (res.status === 404) { var c = new Error('cal'); c.gCal = true; throw c; } // l'agenda a été supprimé : on le recrée
            if (res.status < 200 || res.status >= 300) throw gHttpErr(res, progress);
            progress++;
            return gSleep(120).then(next);
          });
        }
        return next().then(function () {
          // rappels envoyés plus tôt le même jour et plus voulus maintenant (case décochée, un autre nombre de jours) : on les retire
          var stale = prev && prev.cal === calId && prev.date === dateTag ? prev.ids.filter(function (id) { return ids.indexOf(id) < 0; }) : [];
          return stale.reduce(function (p, id) {
            return p.then(function () { return gCall(tok, 'DELETE', '/calendars/' + encodeURIComponent(calId) + '/events/' + id).then(function () {}, function () {}); });
          }, Promise.resolve());
        }).then(function () { gSentSet({ cal: calId, date: dateTag, ids: ids }); return evs.length; });
      }).catch(function (e) {
        if (e && e.gCal && !retried) { retried = true; gCalSet(''); gSentSet(null); prev = null; return attempt(); }
        throw e;
      });
    }
    return attempt().catch(function (e) {
      if (e && e.gNet) e.gMsg = 'Pas de connexion : l’envoi s’est arrêté.' + gTail(progress);
      else if (e && e.gBase) e.gMsg = e.gBase + gTail(progress);
      else if (e && e.gCal) e.gMsg = 'Google ne trouve pas l’agenda « Kioo Cycle ». Réessaie.';
      throw e;
    });
  }
  function doGcal() {
    if (gBusy || !gEnabled() || !remAny()) return;
    gBusy = true; gPaint(); setGStatus('');
    function end(msg) { gBusy = false; gPaint(); setGStatus(msg); }
    gToken(function (err, tok) { // appelé tout de suite, dans le clic
      if (err) { if (err === 'lib') gLoadLib(); end(G_AUTH_MSG[err] || G_AUTH_MSG.other); return; }
      setGStatus('Connecté. Envoi…');
      gSend(tok).then(function (n) {
        end(plural(n, 'rappel envoyé', 'rappels envoyés') + ' à Google Agenda, dans l’agenda « Kioo Cycle ». Renvoyer le même jour met à jour, sans doublon.');
      }, function (e) {
        end(e && e.gMsg ? e.gMsg : 'L’envoi à Google a échoué. Réessaie.');
      });
    });
  }

  /* ---------- Restauration ---------- */
  function parseBackup(text, name) {
    var o;
    if (typeof text !== 'string' || text.length > 20e6) return 'Ce fichier est trop gros ou illisible.';
    try { o = JSON.parse(text); } catch (e) { return 'Ce fichier n’est pas une sauvegarde Kioo Cycle (texte illisible).'; }
    if (!o || (o.app !== 'Kioo Cycle' && o.app !== 'LUNA') || !Array.isArray(o.entries)) return 'Ce fichier n’est pas une sauvegarde Kioo Cycle.'; // « LUNA » = nom des sauvegardes faites avant le 26/10/2026 : elles se restaurent toujours
    if (Number(o.v) > 5) return 'Cette sauvegarde vient d’une version plus récente de Kioo Cycle : mets d’abord l’appli à jour.';
    if (o.entries.length > 50000) return 'Ce fichier contient trop d’entrées.';
    var list = o.entries.map(clean).filter(Boolean);
    var seen = {};
    list = list.filter(function (e) { if (seen[e.id]) return false; seen[e.id] = true; return true; }).sort(byTs);
    var skipped = o.entries.length - list.length;
    var acts = cleanNames(o.activities);
    var insts = Array.isArray(o.instants) ? cleanNames(o.instants) : undefined; // undefined = fichier sans liste d'instants (v1 à v3)
    var nts = Array.isArray(o.noteTypes) ? cleanTypeNames(o.noteTypes) : undefined; // undefined = fichier sans types de note libres (avant le 08/11)
    var tds = Array.isArray(o.todos) ? cleanTodos(o.todos) : undefined; // undefined = fichier sans to-do (avant le 09/11)
    var tdSkipped = tds ? o.todos.filter(function (x) { return !cleanTodo(x); }).length : 0; // illisibles (les doublons ne comptent pas)
    // plan : undefined = fichier sans plan (v1, v2) ; null = réglages illisibles (ignorés) ; sinon réglages validés
    var pl = o.plan === undefined ? undefined : pClean(o.plan);
    var mlu = Array.isArray(o.mlUsed) ? o.mlUsed.filter(function (x) { return Array.isArray(x) && int(x[0], 1, ML_BANK.length) !== null && isFinite(x[1]) && x[1] > 0; })
      .map(function (x) { return [Number(x[0]), Math.floor(x[1])]; }).slice(-400) : undefined;
    return { name: name, entries: list, wake: typeof o.wake === 'string' ? o.wake : null, exportedAt: Number(o.exportedAt) > 0 ? Number(o.exportedAt) : 0,
             acts: acts, insts: insts, nts: nts, tds: tds, tdSkipped: tdSkipped, mode: 'merge', confirm: false, skipped: skipped, plan: pl, mlUsed: mlu,
             mantra: typeof o.mantra === 'string' && o.mantra.trim() ? o.mantra.trim().slice(0, 10000) : undefined };
  }
  function loadRestore(text, name) {
    var r = parseBackup(text, name);
    if (typeof r === 'string') { restore = null; restoreError = r; }
    else if (!r.entries.length && !(r.tds && r.tds.length)) { restore = null; restoreError = 'Cette sauvegarde ne contient aucune entrée.'; }
    else {
      restore = r; restoreError = r.skipped ? plural(r.skipped, 'entrée illisible ignorée', 'entrées illisibles ignorées') + '.' : '';
      if (r.tdSkipped) restoreError += (restoreError ? ' ' : '') + plural(r.tdSkipped, 'to-do illisible ignorée', 'to-do illisibles ignorées') + '.';
      if (r.plan === null) restoreError += (restoreError ? ' ' : '') + 'Les réglages du plan de ce fichier sont illisibles : ils sont ignorés.';
    }
    render();
  }
  function applyRestore() {
    var r = restore, s = restoreStats(), msg;
    if (r.mode === 'merge') {
      entries = entries.concat(s.fresh).sort(byTs);
      msg = 'Restauré. Ajouté : ' + countsText(s.fresh) + ' ; ' + plural(s.dup, 'était déjà présent', 'étaient déjà présents') + '.';
    } else {
      entries = r.entries.slice().sort(byTs);
      msg = 'Restauré : cet appareil contient maintenant ' + countsText(r.entries) + ' du fichier.';
    }
    // heure du réveil du fichier : reprise dans les deux modes (demande du 06/11 ; avant, seul « Remplacer » la reprenait)
    var wkFile = r.wake ? L.parseWake(r.wake) : null;
    if (wkFile !== null) {
      var wkBefore = L.getWake();
      L.setWake(r.wake, null);
      msg += ' Réveil repris du fichier : ' + L.fmtClock(wkFile) + (wkBefore !== wkFile ? ' (avant : ' + L.fmtClock(wkBefore) + ')' : '') + '.';
    }
    // journal des listes de mots et réglages du plan (sauvegardes v3) : le plan de l'appareil n'est remplacé que s'il n'a pas encore de premier jour, ou en mode « Remplacer »
    if (r.mlUsed) mlLogRestore(r.mlUsed, r.mode === 'replace');
    if (r.plan) {
      if (r.mode === 'replace' || !pcfg.start) {
        pcfg = r.plan; pSave();
        if (r.plan.start) msg += ' Plan : premier jour, graine et étape repris du fichier.';
      } else if (r.plan.start !== pcfg.start || r.plan.seed !== pcfg.seed) msg += ' Le plan de cet appareil est gardé.';
    }
    pform = null; psel = null;
    // les listes de motifs du fichier rejoignent celles de l'appareil (rien n'est retiré) ; en mode « Remplacer », la liste d'instants du fichier prend la place de l'autre
    r.acts.forEach(function (n) { addToList(actNames, n); });
    saveActNames();
    if (r.insts) {
      if (r.mode === 'replace') instNames = r.insts.slice(); else r.insts.forEach(function (n) { addToList(instNames, n); });
      saveInstNames();
    }
    if (r.nts) { // types de note libres du fichier : ils rejoignent ceux de l'appareil ; en mode « Remplacer », la liste du fichier prend la place
      if (r.mode === 'replace') noteTypeNames = r.nts.slice(); else r.nts.forEach(function (n) { addTypeName(n); });
      saveNoteTypeNames();
    }
    if (r.tds) { // to-do d'un fichier d'avant le 19/11 : reprises comme notes de catégorie To-do (celles qui existent déjà comme notes sont sautées)
      var tdAdded = moveTodos(r.tds);
      msg += ' To-do : ' + plural(tdAdded, 'reprise', 'reprises') + ' comme notes.';
    }
    if (r.mantra) { // mantra du fichier : repris s'il n'y en a pas sur l'appareil, ou en mode « Remplacer » ; sinon celui de l'appareil est gardé
      if (r.mode === 'replace' || !mantra) { mantra = r.mantra; saveMantra(); msg += ' Mantra repris du fichier.'; }
      else if (r.mantra !== mantra) msg += ' Le mantra de cet appareil est gardé.';
    }
    normalizeActs(); creuxSweep();
    if (!persist()) msg += ' Attention : l’appareil refuse d’enregistrer ces données.';
    restore = null; restoreError = '';
    backupStatus = msg;
    updateAlert();
    go('backup');
  }

  /* ---------- Événements ---------- */
  function act(name, el) {
    var id = el.getAttribute('data-id');
    notice = ''; cutMsg = '';
    if (name !== 'set-add' && name !== 'set-del') setNotice = '';
    var tm = /^(ss|rs|hs|fl|ml)-(intro|practice|test|save)$/.exec(name); // écrans communs à tous les tests (sauf PVT-B)
    if (tm) {
      flow.test = tm[1];
      if (tm[2] === 'intro') go(tm[1] + '-intro');
      else if (tm[2] === 'practice') { flow.tMode = 'practice'; go(tm[1] + '-run'); }
      else if (tm[2] === 'test') { flow.tMode = 'test'; go(tm[1] + '-run'); }
      else saveTestN();
      return;
    }
    switch (name) {
      case 'home': var toH = ret; ret = 'home'; pendingDel = null; form = null; night = null; mForm = null; if (flow.fin && flow.finDone) notice = flow.finDone + ' Pas de test enregistré.'; flow = newFlow(); go(toH); break;
      case 'releve': flow = newFlow({ mode: 'releve' }); go('feel'); break;
      case 'test-libre': flow = newFlow({ mode: 'test' }); go('tests'); break;
      case 'tests': flow = newFlow({ mode: 'test', fin: flow.fin, finMsg: flow.finMsg, finDone: flow.finDone }); go('tests'); break;
      case 'test-pick':
        var tid = TESTS.some(function (t) { return t.id === id; }) ? id : 'pvt';
        flow = newFlow({ mode: 'test', test: tid, fin: flow.fin, finMsg: flow.finMsg, finDone: flow.finDone }); go(tid === 'pvt' ? 'intro' : tid + '-intro'); break;
      case 'run-stop': rnStop(); break;
      case 'moment': startMoment(Number(id)); break;
      case 'feel': go('feel'); break;
      case 'intro': if (screen === 'feel') flow.feelTs = Date.now(); go('intro'); break;
      case 'run': go('run'); break;
      case 'stop': if (pvt) pvt.finish('stop'); break;
      case 'save': saveTest(); break;
      case 'save-releve': saveReleveOnly(); break;
      case 'discard':
        if (flow.chain) { flow.result = null; notice = 'Ce passage n’est pas enregistré. Tu peux le refaire ou arrêter ici.'; go('chain'); }
        else { if (flow.fin && flow.finDone) notice = flow.finDone + ' Pas de test enregistré.'; flow = newFlow(); go('home'); }
        break;
      case 'chain-feel': chainFeel(); break;
      case 'chain-go': chainGo(); break;
      case 'chain-stop': chainStop(); break;
      case 'skip-open': skipOpen(Number(id)); break;
      case 'skip-go': doSkip(); break;
      case 'note': noteText = ''; noteSel = { id: '', sub: '', other: false, txt: '' }; noteFrom = ''; noteTs = Date.now(); go('note'); break;
      case 'note-from': openNoteFrom(id); break;
      case 'link-go': linkGo(id); break;
      case 'save-note': saveNote(); break;
      case 'act-start': openActStart(); break;
      case 'pick': pickName(el.getAttribute('data-name') || ''); break;
      case 'jtype': pickJt(el.getAttribute('data-id') || ''); break;
      case 'pick-other': pickOther(); break;
      case 'instant': openInstant(); break;
      case 'instant-go': doInstant(); break;
      case 'theme-set': if (L.setTheme) { L.setTheme(el.getAttribute('data-theme')); render(); } break;
      case 'style-set': if (L.setStyle) { L.setStyle(el.getAttribute('data-style')); render(); } break;
      case 'set-add': setAdd(el.getAttribute('data-list')); break;
      case 'set-del': setDel(el.getAttribute('data-list'), el.getAttribute('data-name') || ''); break;
      case 'act-start-go': doActStart(); break;
      case 'act-end': openActEnd(); break;
      case 'act-end-go': doActEnd(); break;
      case 'q-yes': openQYes(Number(id)); break;
      case 'q-no': doQNo(Number(id)); break;
      case 'creux-start': openCreuxStart(); break;
      case 'creux-start-go': doCreuxStart(); break;
      case 'creux-end': openCreuxEnd(); break;
      case 'creux-end-go': doCreuxEnd(); break;
      case 'creux-end-test': doCreuxEnd(true); break;
      case 'creux-later': // « Pas encore » : la question revient dans 1 h (en mémoire seulement)
        var cl = currentCreux();
        if (cl) { creuxSnooze[cl.id] = Date.now() + 3600e3; updateAlert(); if (screen === 'home') updateHome(); var hc = root.querySelector('h1'); if (hc) hc.focus({ preventScroll: true }); }
        break;
      case 'meal': openMeal(); break;
      case 'meal-go': doMeal(); break;
      case 'bed': openBed(); break;
      case 'bed-go': doBed(); break;
      case 'wake-open': openWake(); break;
      case 'night-open': openNight(null, 'wake'); break;
      case 'night-go': doNight(); break;
      case 'morning-releve': openMorningReleve(); break;
      case 'mantra-open': openMantra(); break;
      case 'mantra-edit': mForm = { text: mantra }; go('mantra'); break;
      case 'mantra-save': saveMantraForm(); break;
      case 'mantra-cancel': mForm = null; if (!mantra) { ret = 'home'; go('wake'); } else go('mantra'); break;
      case 'edit': openEdit(id); break;
      case 'edit-go': doEdit(); break;
      case 'backup': restore = null; restoreError = ''; go('backup'); break;
      case 'do-backup': doBackup(); break;
      case 'plan': pOpen(); break;
      case 'pl-prev': case 'pl-next': case 'pl-today': pNav(name); break;
      case 'pl-start-today': pQuickStart('today'); break;
      case 'pl-start-tomorrow': pQuickStart('tomorrow'); break;
      case 'pl-start-go': pStartGo(); break;
      case 'pl-stage-go': pStageGo(); break;
      case 'remind': remStatus = ''; if (!gBusy) gStatus = ''; go('reminders'); break;
      case 'make-ics': doIcs(); break;
      case 'send-gcal': doGcal(); break;
      case 'copy': doCopy(); break;
      case 'restore': restore = null; restoreError = ''; go('restore'); break;
      case 'read-paste': var ta = $('j-paste'); loadRestore(ta ? ta.value : '', ''); break;
      case 'restore-go':
        if (!restore) break;
        if (restore.mode === 'replace' && !restore.confirm) { restore.confirm = true; render(); }
        else applyRestore();
        break;
      // To-do : liste, nouvelle, modifier, cocher, supprimer (avec confirmation « Garder / Supprimer »)
      case 'bk-go': pendingDel = null; form = null; flow = newFlow(); go('backup'); break;
      case 'bk-later': bkSnooze = Date.now() + 3600e3; updateAlert(); if (screen === 'home') updateHome(); var hh = root.querySelector('h1'); if (hh) hh.focus({ preventScroll: true }); break;
      case 'bk-hours':
        var bhv = Number(el.getAttribute('data-v'));
        if (BK_HOURS.indexOf(bhv) < 0) break;
        bkHours = bhv; bkSnooze = 0; saveBkHours(); updateAlert(); renderKeepScroll(); break;
      case 'rank': // e4c : « À ranger » : l'Historique sur Notes › Sans catégorie, plus anciennes d'abord (une note à la fois)
        pendingDel = null; hf.genre = 'note'; hf.ntype = 'none'; hf.sub = 'all'; hf.ans = 'all'; hf.val = 'all'; hf.sort = 'date'; hf.dir = 'asc'; go('history'); break;
      case 'last-tests': // e4c : « Dernier test » : l'Historique sur les tests, plus récents d'abord
        pendingDel = null; hf.genre = 'test'; hf.ntype = 'all'; hf.sub = 'all'; hf.ans = 'all'; hf.val = 'all'; hf.sort = 'date'; hf.dir = 'desc'; go('history'); break;
      case 'history': pendingDel = null; go('history'); break; // e4a : le filtre et le tri sont gardés en mémoire (plus de remise à zéro à l'ouverture)
      case 'hf-genre': case 'hf-ntype': case 'hf-sub': case 'hf-ans': case 'hf-val': case 'hf-sort': case 'hf-dir': hfSet(name, el.getAttribute('data-v') || ''); break;
      // Supprimer : on reste où l'on est dans la liste (render() remontait tout en haut)
      case 'del': pendingDel = id; histRefresh(function (w) { return Array.prototype.filter.call(w.querySelectorAll('[data-act="del-yes"]'), function (b) { return b.getAttribute('data-id') === id; })[0]; }); break;
      case 'del-no': var was = pendingDel; pendingDel = null; histRefresh(function (w) { return Array.prototype.filter.call(w.querySelectorAll('[data-act="del"]'), function (b) { return b.getAttribute('data-id') === was; })[0]; }); break;
      case 'val': case 'val-undo': { // e5c : valider une note (ou annuler) : immédiat, réversible, ne change ni le texte ni `modTs`
        var ve = entries.filter(function (x) { return x.id === id; })[0];
        if (!ve || ve.kind !== 'note') break;
        pendingDel = null;
        if (name === 'val') { if (!isVal(ve)) ve.valTs = Math.max(Date.now(), ve.ts + 1); } else delete ve.valTs;
        persist(); updateAlert();
        histRefresh(function (w) {
          var other = name === 'val' ? 'val-undo' : 'val';
          return Array.prototype.filter.call(w.querySelectorAll('[data-act="' + other + '"]'), function (b) { return b.getAttribute('data-id') === id; })[0] || root.querySelector('h1'); // la note a pu quitter la liste (filtre « À valider »)
        });
        var lv = $('j-hlive'); if (lv) lv.textContent = name === 'val' ? 'Note validée.' : 'Validation annulée.';
        break;
      }
      case 'del-yes':
        entries = entries.filter(function (e) { return e.id !== id; });
        pendingDel = null; persist(); updateAlert(); histRefresh(function () { return root.querySelector('h1'); }); break;
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
    var b = $('f-go'), b2 = $('f-go2');
    if (b) b.disabled = !formValid();
    if (b2) b2.disabled = !formValid();
    creuxLive();
    if (f === 'name') jtLive();
  }
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute && t.getAttribute('data-nt')) { // menus Catégorie / Sous-catégorie d'une note
      var wnt = t.getAttribute('data-nt');
      if (wnt === 'cat') setNoteType(t.value); else if (wnt === 'sub') setNoteSub(t.value); else if (wnt === 'subother') setNoteSubText(t.value);
    } else if (t.getAttribute && t.getAttribute('data-night')) { // « Ma nuit » : un champ modifié
      if (night) { night[t.getAttribute('data-night')] = t.value; var gn = $('f-go'); if (gn) gn.disabled = !nightValid(); }
    } else if (t.getAttribute && t.getAttribute('data-feel')) {
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
      if (mk) mk.disabled = !remAny();
      gPaint();
    } else if (t.id === 'pl-start' || t.id === 'pl-stage') {
      pOnField(t);
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
    if (t.getAttribute && t.getAttribute('data-nt') === 'subother') {
      setNoteSubText(t.value);
    } else if (t.id === 'j-note') {
      noteText = t.value;
      var b = $('j-notesave');
      if (b) b.disabled = !noteText.trim();
    } else if (t.id && t.id.indexOf('j-qnote-') === 0) {
      qDraft[Number(t.id.slice(8))] = t.value;
    } else if (t.id === 'j-detail') {
      flow.detail = t.value;
    } else if (t.id === 'j-thought') {
      flow.thought = t.value;
    } else if (t.getAttribute && t.getAttribute('data-night')) {
      if (night) { night[t.getAttribute('data-night')] = t.value; var gn2 = $('f-go'); if (gn2) gn2.disabled = !nightValid(); }
    } else if (t.getAttribute && t.getAttribute('data-mantra')) {
      if (mForm) { mForm.text = t.value; var mg = $('m-go'); if (mg) mg.disabled = !mForm.text.trim(); }
    } else if (t.id === 'j-skiptext') {
      if (form && form.type === 'skip') form.text = t.value;
    } else if (t.id === 'pl-start') {
      pOnField(t);
    } else if (t.getAttribute && t.getAttribute('data-set')) {
      var wh = t.getAttribute('data-set');
      if (wh === 'act' || wh === 'inst' || wh === 'nt') {
        setDraft[wh] = t.value;
        var ab = $('set-add-' + wh);
        if (ab) ab.disabled = !t.value.trim();
      }
    } else if (t.getAttribute && t.getAttribute('data-field')) {
      onField(t);
    }
  });
  // Entrée dans le champ « Nouveau motif » = Ajouter
  root.addEventListener('keydown', function (e) {
    var t = e.target;
    if (e.key === 'Enter' && t && t.getAttribute && t.getAttribute('data-set')) { e.preventDefault(); setAdd(t.getAttribute('data-set')); }
  });
  root.addEventListener('toggle', function (e) {
    var t = e.target;
    if (!t || !t.id) return;
    if (t.id === 'j-det' && t.open) { var ta = $('j-copy'); if (ta) ta.value = buildBackup(); }
    else if (t.id === 'f-feel' && form) form.feelOpen = t.open;
    else if (t.id === 'f-feel2' && form) form.feelOpen2 = t.open;
    else if (t.id === 'pl-set' && pform) pform.open = t.open;
  }, true);

  /* ---------- Alerte sur la Roue : activité en cours depuis longtemps ---------- */
  function updateAlert() {
    if (!L.setAlert) return;
    var a = currentAct(), min = a ? (Date.now() - a.ts) / 60000 : 0, cx = currentCreux();
    if (cx && creuxAsk(cx)) L.setAlert({ title: 'Creux en cours · depuis ' + clockOf(cx.ts), sub: durText((Date.now() - cx.ts) / 60000) + ' · le terminer ?' });
    else if (a && min >= LONG_ACT_MIN) L.setAlert({ title: 'Activité en cours · ' + a.name, sub: 'Depuis ' + durText(min) + ' · la terminer ?' });
    else L.setAlert(null);
    if (L.setBackupBanner) L.setBackupBanner(bkInfo());
  }

  /* ---------- Branchement sur l'appli ---------- */
  function maybeUpdate() {
    var cutT = creuxSweep();
    if (cutT) { cutMsg = creuxCutText(cutT); persist(); if (!root.hidden && screen === 'home') render(); }
    updateAlert();
    if (root.hidden) return;
    if (screen === 'home') updateHome();
    if (screen === 'plan') pRefreshDay();
    if (screen === 'reminders') { var w = $('j-rwake'); if (w) w.textContent = L.fmtClock(L.getWake()); var wb = $('j-rbk'); if (wb) wb.textContent = bkTimesText(L.getWake()); }
  }
  L.on('tick', maybeUpdate);
  L.on('wake', maybeUpdate);
  L.journal = {
    bkLater: function () { bkSnooze = Date.now() + 3600e3; updateAlert(); },
    // target : 'settings' ouvre les Réglages (onglet du bas) ; sinon on revient au Journal
    onShow: function (target) {
      notice = ''; setNotice = ''; ret = 'home';
      if (target === 'settings') { flow = newFlow(); form = null; screen = 'settings'; }
      else if (target === 'backup') { flow = newFlow(); form = null; screen = 'backup'; }
      else if (target === 'history') { flow = newFlow(); form = null; screen = 'history'; } // onglet Historique : le filtre, le tri et l'ordre sont gardés (en mémoire)
      else if (['home', 'backup', 'reminders', 'plan'].indexOf(screen) < 0) { flow = newFlow(); form = null; screen = 'home'; } // onglet Journal : jamais l'Historique (il a son onglet)
      render();
    }
  };
  readAll();
  pLoad();
  updateAlert();
})();
