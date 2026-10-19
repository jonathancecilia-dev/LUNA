/* LUNA — module Journal (écran 2 du module Corps).
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
  var KEY = 'luna.journal', KEY_BK = 'luna.journal.lastBackup', KEY_ACTS = 'luna.activities', KEY_BEDSKIP = 'luna.bedSkip', KEY_PRAC = 'luna.practiced', KEY_INST = 'luna.instants';

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
  var INST_DEFAULT = ['popo']; // premier instant déjà créé ; tu peux le retirer ou en ajouter dans Réglages
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
    '.j-grid{margin:0 5px;display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.j-grid .btn{padding:0 8px;font-size:14px;min-height:46px}',
    '.j-grid .btn.wide{grid-column:1 / -1}',
    '.j-now{margin:0 5px;background:var(--card);border:1px solid var(--line2);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px}',
    '.j-now.act{border-left:4px solid var(--teal)}',
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
    '.j-runhint{font-size:14px;line-height:1.4;text-align:center;color:var(--muted)}',
    '.j-metrics{display:flex;gap:8px}',
    '.j-metrics>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.j-metrics b{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}',
    '.j-metrics b small{font-size:13px;font-weight:600;color:var(--muted)}',
    '.j-metrics span{font-size:12px;color:var(--muted)}',
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
  // Reprise mot pour mot de `Annexe-plan-logique` (14/10, conversation « Tests cognitifs »), vérifiée là-bas par 4 506 contrôles. Ne pas modifier sans le dire :
  // le calendrier (7 plans, ordre des semaines, ordre des tests) doit rester le même que dans les maquettes. Seuls l'enveloppe et l'export sont ajoutés.
  var PL = (function () {
/* pure:start */
const DUR = { RS: 90, FL: 110, HS: 60, ML: 120, SS: 45 };   // secondes, estimées d'après les maquettes (À ajuster)
const PVT = 180;                                             // PVT-B : 3 min
const NAMES = { RS: 'Rotation span', FL: 'Flanker', HS: 'Hand Swype', ML: 'Memory List', SS: 'Symbol Search' };
const TEST_R = [2, 3, 4, 5, 8, 10, 11];                      // R+X des 7 moments de test
// 7 plans de journée : pour chacun, les 2 tests des 7 moments (calendrier vérifié par calcul le 14/10)
const PLANS = [[["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["RS", "ML"], ["RS", "HS"], ["RS", "HS"], ["FL", "SS"]], [["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["HS", "SS"], ["FL", "SS"], ["RS", "ML"], ["FL", "SS"]], [["RS", "HS"], ["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["HS", "ML"], ["FL", "SS"], ["RS", "HS"]], [["HS", "ML"], ["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["FL", "SS"], ["FL", "SS"], ["RS", "HS"]], [["RS", "HS"], ["FL", "SS"], ["HS", "ML"], ["FL", "SS"], ["RS", "SS"], ["FL", "HS"], ["RS", "SS"]], [["FL", "SS"], ["HS", "ML"], ["RS", "FL"], ["HS", "SS"], ["RS", "FL"], ["RS", "HS"], ["FL", "SS"]], [["FL", "SS"], ["RS", "HS"], ["FL", "SS"], ["RS", "HS"], ["FL", "HS"], ["FL", "SS"], ["HS", "ML"]]];
// Étape 2 du PVT-B : en plus de R+2h, 2 moments (index dans TEST_R) qui tournent selon le plan
const PVT2 = [[1, 4], [2, 5], [3, 6], [1, 5], [2, 6], [3, 4], [2, 4]];
const NDAYS = 98;                                            // 14 semaines
// Les 13 moments de la journée (plan codé du 11/10) : relevé seul, test, ou test + relevé
const SLOTS = [
  { r: 0.5, kind: 'rel' },
  { r: 2, kind: 'test', ti: 0 }, { r: 3, kind: 'test', ti: 1 }, { r: 4, kind: 'test', ti: 2 }, { r: 5, kind: 'test', ti: 3 },
  { r: 6, kind: 'rel' }, { r: 7, kind: 'rel' },
  { r: 8, kind: 'testrel', ti: 4 }, { r: 9, kind: 'rel' },
  { r: 10, kind: 'testrel', ti: 5 }, { r: 11, kind: 'testrel', ti: 6 },
  { r: 12, kind: 'rel' }, { r: 13, kind: 'rel' }
];

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
function pvtMoments(plan, stage) {
  if (stage === 1) return [0, 1, 2, 3, 4, 5, 6];
  if (stage === 2) return [0].concat(PVT2[plan]);
  return [0];
}
function momentSec(plan, ti, stage) {
  const tests = PLANS[plan][ti].reduce((a, t) => a + DUR[t], 0);
  return tests + (pvtMoments(plan, stage).indexOf(ti) >= 0 ? PVT : 0);
}
function daySec(plan, stage) {
  let s = 0;
  for (let ti = 0; ti < 7; ti++) s += momentSec(plan, ti, stage);
  return s;
}
function avgDaySec(stage) {
  let s = 0;
  for (let p = 0; p < 7; p++) s += daySec(p, stage);
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
function testOrder(i, ti, plan, seed) {
  const pair = PLANS[plan][ti];
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
    return { DUR: DUR, PVT: PVT, NAMES: NAMES, TEST_R: TEST_R, PLANS: PLANS, PVT2: PVT2, NDAYS: NDAYS, SLOTS: SLOTS, fmtDur: fmtDur, fmtMin: fmtMin, fmtR: fmtR, clockStr: clockStr,
             parseHM: parseHM, pvtMoments: pvtMoments, momentSec: momentSec, daySec: daySec, avgDaySec: avgDaySec, mulberry32: mulberry32, weekOrder: weekOrder,
             planForDay: planForDay, testOrder: testOrder, weekOf: weekOf, isRodage: isRodage, parseISO: parseISO, addDays: addDays, daysBetween: daysBetween,
             isoOf: isoOf, milestone: milestone };
  })();

  /* ---------- Données ---------- */
  var entries = [], storageOk = true, lastBackup = null, actNames = ACTS_DEFAULT.slice(), instNames = INST_DEFAULT.slice();
  var KINDS = ['releve', 'test', 'note', 'activite', 'repas', 'coucher', 'pas', 'instant'];

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
      if (Array.isArray(a)) actNames = cleanNames(a);
    } catch (e) {}
    try { // jamais enregistrée : la liste de départ ; enregistrée vide : elle reste vide (tu l'as vidée)
      var ai = JSON.parse(localStorage.getItem(KEY_INST));
      if (Array.isArray(ai)) instNames = cleanNames(ai);
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
  function saveInstNames() { try { localStorage.setItem(KEY_INST, JSON.stringify(instNames)); } catch (e) {} }
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
    if (k === 'instant') { // un seul moment, sans fin : seul le nom et l'heure comptent
      var iname = typeof e.name === 'string' ? e.name.trim().slice(0, 40) : '';
      if (!iname) return null;
      o.name = iname;
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
  var flow = newFlow();
  var form = null;          // formulaire en cours : activité, repas, coucher, modification
  var noteText = '', noteTs = 0;
  var pendingDel = null, notice = '';
  var backupStatus = '';
  var rem = { moments: true, phases: false, days: 1 }, remStatus = '';
  var restore = null, restoreError = '';
  var setDraft = { act: '', inst: '' }, setNotice = ''; // Réglages : texte en cours de saisie, message

  function newFlow(o) {
    o = o || {};
    return { mode: o.mode || 'releve', test: o.test || 'pvt', slot: o.slot == null ? null : o.slot, feel: {}, detail: '', feelTs: 0, ts: 0, wake: 0, result: null,
             tMode: 'test', prac: null, chain: null, chainMsg: '' };
  }

  /* ---------- Aujourd'hui : moments du plan ---------- */
  // Quand le recueil est en cours (plan « run »), les 7 moments de test du plan sont des moments ENCHAÎNÉS : le PVT-B (selon l'étape),
  // puis 2 tests dans l'ordre du jour (PL.testOrder). Avant le premier jour et après la fin, un moment garde son rôle d'avant (PVT-B seul).
  // Fenêtre : le moment doit être COMMENCÉ dans sa fenêtre (−10 / +30 min) ; une fois commencé, l'enchaînement peut la dépasser (choix de Claude, À ajuster).
  var STEP_NAME = { pvt: 'PVT-B', rs: 'Rotation span', fl: 'Flanker', hs: 'Hand Swype', ml: 'Memory List', ss: 'Symbol Search' };
  function stepSec(t) { return t === 'pvt' ? PL.PVT : PL.DUR[t.toUpperCase()]; }
  function stepsText(list) { return list.map(function (t) { return STEP_NAME[t]; }).join(' · '); }

  function todayInfo() {
    var now = new Date(), wake = L.getWake(), tk = dayKey(now.getTime(), wake), done = {}, skip = {};
    entries.forEach(function (e) {
      if (e.day !== tk || e.slot == null) return;
      if (e.kind === 'pas') { if (!skip[e.slot] || e.ts > skip[e.slot].ts) skip[e.slot] = e; return; }
      if (e.kind !== 'releve' && e.kind !== 'test') return;
      var d = done[e.slot] || (done[e.slot] = { tests: {} });
      if (e.test) { if (!d.tests[e.test] || e.ts < d.tests[e.test].ts) d.tests[e.test] = e; return; } // les autres tests ne comptent que dans un moment enchaîné
      if (!d[e.kind] || e.ts < d[e.kind].ts) d[e.kind] = e;
    });
    return { now: now, wake: wake, tk: tk, rel: L.mod(minOf(now) - wake), done: done, skip: skip };
  }
  function slotStates(info) {
    var open = -1, next = -1, ps = pState(info.tk), pd = ps.s === 'run' ? pDay(ps.i, info.tk) : null;
    var list = PLAN.map(function (m, i) {
      var d = info.done[i] || { tests: {} }, sk = info.skip[i] || null, s = m.r - WIN.before, e = m.r + WIN.after, kind, status;
      var ti = pd ? TI_SLOT.indexOf(i) : -1, ch = null, part, needR, needT, last;
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
      return { kind: kind, status: status, needR: needR, needT: needT, part: part, chain: ch, skip: sk, canNote: kind === 'past' && !!ch && !sk,
               win: L.fmt(info.wake + s) + ' – ' + L.fmt(info.wake + e), at: L.fmtClock(info.wake + m.r), endAt: L.fmt(info.wake + e) };
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
  var KIND_LABEL = { releve: 'Relevé', test: 'Test', note: 'Note', activite: 'Activité', repas: 'Repas', coucher: 'Coucher', pas: 'Pas ce moment', instant: 'Instant' };
  function planTxt(e) {
    if (e.plan !== 'prevu') return 'libre';
    var m = PLAN[e.slot];
    return 'prévu' + (m ? ' · ' + rLabel(m.r) : '') + (e.pj && PL.isRodage(e.pj.d) ? ' · rodage' : '');
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
    } else if (e.kind === 'instant') {
      line = e.name; editable = true;
    } else if (e.kind === 'activite') {
      editable = true;
      var endTxt = e.end == null ? 'en cours depuis ' + durText((nowMs - e.ts) / 60000) : clockOf(e.end) + ' (' + durText((e.end - e.ts) / 60000) + ')';
      line = e.name + ' · ' + clockOf(e.ts) + (e.end == null ? ' · ' : ' → ') + endTxt;
      body = (e.comment ? '<div class="body note' + (full ? '' : ' clamp') + '">' + esc(e.comment) + '</div>' : '') +
        (e.feelStart ? '<div class="body">Début : ' + esc(feelShort(e.feelStart)) + (e.feelStartLate ? ' (noté après coup)' : '') + '</div>' : '') +
        (e.feelEnd ? '<div class="body">Fin : ' + esc(feelShort(e.feelEnd)) + (e.feelEndLate ? ' (noté après coup)' : '') + '</div>' : '');
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
    // couleur de la carte (comme la touche qui l'a créée) ; « pas ce moment » : aucune ; ancien relevé combiné : celle du relevé
    var kc = e.kind === 'test' || e.test ? 'test' : e.kind === 'pas' ? '' : e.pvt ? 'releve' : e.kind;
    return '<div class="j-h"' + (kc ? ' data-k="' + kc + '"' : '') + '><div class="r1"><span class="when">' + esc(dayText(e.day, today)) + ' · ' + clockOf(e.ts) + '</span><span class="kind">' +
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
  var TI_SLOT = PL.TEST_R.map(function (h) { for (var i = 0; i < PLAN.length; i++) if (PLAN[i].r === h * 60) return i; return -1; }); // moment de test -> moment du plan existant
  var STAGE_TXT = { 1: 'PVT-B aux 7 moments', 2: 'PVT-B à R+2h + 2 moments qui tournent', 3: 'PVT-B à R+2h seulement' };

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
    var st = pStageOn(key || tk), p = PL.planForDay(i, pcfg.seed), pv = PL.pvtMoments(p, st);
    return { i: i, key: key, plan: p, stage: st, week: PL.weekOf(i), rodage: PL.isRodage(i), sec: PL.daySec(p, st),
      moments: PL.TEST_R.map(function (h, ti) {
        return { ti: ti, slot: TI_SLOT[ti], r: h * 60, pvt: pv.indexOf(ti) >= 0, tests: PL.testOrder(i, ti, p, pcfg.seed), sec: PL.momentSec(p, ti, st) };
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
      '<div class="t2">Plan de journée ' + (d.plan + 1) + ' sur 7 · 7 moments de test · ' + pDur(d.sec) + ' en tout</div>' + btn('Voir la journée') + '</div>';
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
      return '<li><b>Étape ' + s + '</b> · ' + STAGE_TXT[s] + ' · ≈ ' + PL.fmtMin(PL.avgDaySec(s)) + ' par jour</li>';
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
      '<span class="j-fhint">Décidé le 14/10 : étape 1 pendant 4 semaines sans y toucher, puis revue à la semaine 4 ; c’est toi qui choisis la suite. LUNA ne change jamais l’étape toute seule. Durées moyennes : estimées (à ajuster).</span></div>' +
      '<button type="button" class="btn primary" id="pl-stage-go" data-act="pl-stage-go"' + (gi.same ? ' disabled' : '') + '>' + gi.btn + '</button>' +
      '<span class="j-hint left" id="pl-stage-hint" role="status" aria-live="polite">' + esc(gi.hint) + '</span>' +
      pHistoryHtml(tk) +
      '<hr class="pl-sep">' +
      '<p class="j-fhint">Graine du mélange : <b>' + pcfg.seed + '</b>. Tirée une seule fois, jamais changée ; elle est dans le fichier de sauvegarde. Avec la même graine et le même premier jour, on retrouve exactement le même calendrier.</p>' +
      '</div>';
  }
  function vPlan() {
    if (!pform) pform = pFormNew();
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="brand">LUNA</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Plan des tests</h1>' +
      '<label class="wake">Réveil <input class="wake-input" type="time" aria-label="Heure de réveil" required></label></div>' +
      '<p class="sub">' + (PL.NDAYS / 7) + ' semaines · 7 moments de test par jour</p></header>' +
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
        '<div class="t1">' + esc(momTitle(m)) + '</div>' +
        '<div class="t2">' + esc(m.goal) + '</div>' + programLine(s) +
        '<div class="t3">Fenêtre ' + s.win + ' · prévu à ' + s.at + '</div>' +
        '<div class="btns"><button type="button" class="btn primary" data-act="moment" data-id="' + ps.open + '">' + actionLabel(s) + '</button>' +
        (s.chain && !s.part && !s.skip ? '<button type="button" class="btn ghost" data-act="skip-open" data-id="' + ps.open + '">Pas ce moment</button>' : '') + '</div></div>';
    }
    if (ps.next >= 0) {
      var n = PLAN[ps.next], sn = ps.list[ps.next];
      return '<div class="j-now"><span class="j-kick">PROCHAIN MOMENT</span>' +
        '<div class="t1">' + esc(momTitle(n)) + '</div>' +
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
    setHtml($('j-planbox'), pBoxHtml(info));

    var nDone = ps.list.filter(function (s) { return s.kind === 'done'; }).length;
    $('j-plansum').textContent = 'Plan du jour · ' + PLAN.length + ' moments · ' + nDone + ' fait' + (nDone > 1 ? 's' : '');
    $('j-points').innerHTML = ps.list.map(function (s, i) {
      var c = s.chain, extra = '';
      if (c) extra += '<span class="j-ptg">' + esc((PLAN[i].kind !== 'test' ? 'Relevé · ' : '') + stepsText(c.steps)) + (s.part ? ' · ' + c.nDone + ' sur ' + c.total + ' faits' : '') + '</span>';
      if (s.skip && s.skip.text) extra += '<span class="j-ptg j-ptw">« ' + esc(s.skip.text) + ' »</span>';
      if (s.canNote) extra += '<button type="button" class="j-link j-ptl" data-act="skip-open" data-id="' + i + '">Noter pourquoi</button>';
      return '<li class="j-pt ' + s.kind + '"><div class="j-n">' + (s.kind === 'done' ? ICON_CHECK : (i + 1)) + '</div>' +
        '<div class="j-ptx"><span class="j-ptn">' + rLabel(PLAN[i].r) + ' · ' + KIND_TXT[PLAN[i].kind] + '</span><span class="j-ptg">' + esc(PLAN[i].goal) + '</span>' + extra + '</div>' +
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
      '<div id="j-planbox"></div>' +
      '<details class="j-det" id="j-plan"><summary id="j-plansum"></summary><ol class="j-points" id="j-points"></ol></details>' +
      '<div class="j-sect"><span class="j-kick">À TOUT MOMENT</span></div>' +
      '<div class="j-grid">' +
      '<button type="button" class="btn primary wide" data-act="releve">Relevé libre</button>' +
      '<button type="button" class="btn secondary" data-act="act-start">Activité</button>' +
      '<button type="button" class="btn secondary" data-act="instant">Instant</button>' +
      '<button type="button" class="btn secondary" data-act="test-libre">Test libre</button>' +
      '<button type="button" class="btn secondary" data-act="meal">Repas</button>' +
      '<button type="button" class="btn secondary wide" data-act="note">' + ICON_PEN + 'Note</button></div>' +
      '<div class="j-sect j-gap"><span class="j-kick">HISTORIQUE</span><span class="j-aside" id="j-hnote"></span></div>' +
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
    var d = new Date(), ph = phaseAt(L.mod(minOf(d) - L.getWake())), ok = feelComplete();
    var both = flow.mode === 'both', m = flow.slot != null ? PLAN[flow.slot] : null, ch = flow.chain;
    var mod = ch ? rLabel(m.r) + ' · relevé puis tests' : (both ? 'Étape 1 sur 2' : (m ? rLabel(m.r) + ' · prévu' : 'Relevé libre'));
    return '<header class="subhead"><div class="top">' + back('home', 'Journal') + '<span class="module">' + mod + '</span></div>' +
      '<h1 tabindex="-1">Ressenti</h1><p class="sub">Comment te sens-tu là, maintenant (ces 5 dernières minutes) ?</p>' +
      '<div class="nowline"><span class="dot" style="background:' + ph.color + '"></span><span>' + L.fmtClock(minOf(d)) + ' · ' + esc(ph.name) + '</span></div></header>' +
      '<main style="gap:18px;padding-top:14px">' +
      '<section class="j-sec"><h2>CORPS · LE VAISSEAU</h2>' + feelField(FEEL[0], 'flow') + feelField(FEEL[1], 'flow') + feelField(FEEL[2], 'flow') + '</section>' +
      '<section class="j-sec"><h2>ESPRIT · LE PILOTE</h2>' + feelField(FEEL[3], 'flow') + feelField(FEEL[4], 'flow') + '</section>' +
      '<details class="j-det" id="j-detbox"' + (flow.detail ? ' open' : '') + '><summary>Ajouter un détail (facultatif)</summary>' +
      '<textarea id="j-detail" class="j-ta mid" maxlength="500" placeholder="Ce qui explique ce ressenti : mal dormi, café, douleur…" aria-label="Détail du ressenti">' + esc(flow.detail) + '</textarea></details></main>' +
      '<div class="foot"><button type="button" class="btn primary" id="j-next" data-act="' + (ch ? 'chain-feel' : (both ? 'intro' : 'save-releve')) + '"' + (ok ? '' : ' disabled') + '>' +
      (ch ? 'Suivant · ' + STEP_NAME[ch.steps[0]] : (both ? 'Suivant · test de vigilance' : 'Enregistrer le relevé')) + '</button>' +
      '<span class="j-hint" id="j-feelhint">' + feelHint(ok, both) + '</span></div>';
  }
  function feelHint(ok, both) { return ok ? (flow.chain ? 'Le relevé est gardé, puis viennent les tests' : (both ? 'Étape suivante : 3 minutes de test' : 'Prêt à enregistrer')) : 'Les 5 réponses sont nécessaires'; }

  function vIntro() {
    var m = flow.slot != null ? PLAN[flow.slot] : null, both = flow.mode === 'both';
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : 'Test libre : il sera enregistré, hors des moments du plan.';
    return '<header class="subhead"><div class="top">' + (both ? back('feel', 'Ressenti') : (m ? back('home', 'Journal') : back('tests', 'Tests'))) +
      '<span class="module">' + (both ? 'Étape 2 sur 2' : (m ? slotTag(m) : 'Test libre')) + '</span></div>' +
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
        '<p class="lead" style="font-size:14px;line-height:1.5;color:var(--text)">' + esc(feelWords(flow.feel, false)) + '</p>' +
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
    var msg = m ? 'Ce test comptera pour le moment « ' + momTitle(m) + ' ».' : 'Test libre : il sera enregistré, hors des moments du plan et hors de ta référence.';
    if (!m && L.mod(minOf(new Date()) - L.getWake()) < 120) msg += ' Avant R+2h, il sera noté « avant R+2h » (l’inertie du réveil peut durer 2 à 4 h : Jewett 1999).';
    var demoTop = [0, 3], demoFoil = [0, 5];
    return '<header class="subhead"><div class="top">' + (m ? back('home', 'Journal') : back('tests', 'Tests')) +
      '<span class="module">' + (m ? slotTag(m) : 'Test libre') + '</span></div>' +
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
    return '<header><span class="module" style="display:block">Fin du test' + chainTag() + '</span><h1 tabindex="-1" style="margin-top:4px">Résultat</h1></header>' +
      '<main style="padding-top:14px;gap:12px">' +
      '<section class="j-card"><div class="nowline" style="margin:0"><span class="dot" style="background:' + ph.color + '"></span><span>' + clockOf(r.ts) + ' · ' + esc(ph.name) + '</span></div>' +
      '<div class="j-metrics"><div><b>' + (r.med === null ? '—' : Math.round(r.med) + '<small> ms</small>') + '</b><span>Temps médian, réponses justes</span></div>' +
      '<div><b>' + r.correct + '<small> / ' + r.n + '</small></b><span>Réponses justes</span></div>' +
      '<div><b>' + r.used + '<small> / ' + r.n + '</small></b><span>Essais comptés dans le temps</span></div></div>' +
      '<p class="j-fhint" style="color:var(--text)"><b>Chiffre principal :</b> le temps médian des réponses justes (le premier chiffre). Plus bas = plus rapide.</p>' +
      '<p class="j-fhint">Durée du passage : ' + ssDur(r.durationMs) + ' (estimée : ≈ ' + SS.estSec + ' s)</p>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, ' + ssPlural(count, 'test', 'tests') + ')</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + (INPUT_TXT[r.input] || r.input) + '</span>' +
      '<span class="chip hy">' + (libre ? 'test libre' : prevuTxt()) + (early ? ' · avant R+2h' : '') + '</span></div></section>' +
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

  TD.ml = { name: 'Memory List', cog: 'Mémoire épisodique', estSec: ML.estSec, noPractice: true, cfg: ML_CFG,
    chipMain: 'Établi · NeuroUX, Paolillo 2024', chipHy: 'À ajuster · mots et tâche intercalaire de LUNA',
    demo: function () { return ''; },
    steps: function () {
      return [ML.nT + ' mots s’affichent ensemble pendant ' + (ML.study / 1000) + ' secondes. Retiens-les.',
        'Une courte tâche visuelle de ' + (ML.odd / 1000) + ' secondes : touche la forme différente des trois autres.',
        'Des mots arrivent un par un. Touche « Oui » si le mot était dans la liste, « Non » s’il est nouveau' + (DEVICE === 'ord' ? ' (ou touches ← et →)' : '') + '. La moitié sont nouveaux.',
        'Pas d’entraînement : les mots ne se répètent pas à vide. Une autre liste de mots est utilisée à chaque passage. ' +
          (DEVICE === 'tel' ? 'Téléphone posé, même main, mode silencieux.' : 'Même souris ou trackpad, notifications coupées.')];
    },
    about: 'Le protocole (12 mots affichés ensemble pendant 30 s, une autre tâche entre-temps, puis 24 mots à reconnaître, « Oui » ou « Non ») vient de NeuroUX (Paolillo 2024). La source ne donne ni les mots, ni le délai, ni la façon de répondre : les 98 listes de mots, la tâche intercalaire de 30 s (« touche la forme différente »), l’absence de temps limite et la mesure du temps de réponse sont des choix de LUNA. Les listes ne sont pas appariées selon des normes (fréquence, imagerie). Durée de ≈ ' + ssDur(ML.estSec * 1000) + ' estimée d’après la source (environ 1 min de reconnaissance) et les pauses, non mesurée ici : la durée mesurée s’affiche à la fin. On te compare à toi-même, <b>sur le même appareil</b>.',
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
        factRow('Temps de réponse médian (lecture de LUNA)', ssMs(s.medRt)) +
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
      return secHtml('Le chiffre qui compte', 'Établi', 'Le score, sur 24 : les mots de la liste que tu as reconnus (« Oui ») plus les mots nouveaux que tu as refusés (« Non »). C’est le score de la source. Plus haut = mieux reconnu. À côté, pour information : les mots reconnus sur 12, les mots nouveaux acceptés à tort sur 12 et le temps de réponse médian. Ce dernier est la lecture de LUNA : la source ne le donne pas.') +
        readCompare(', avec des listes de mots qui tournent d’un passage à l’autre (elles comptent comme des versions parallèles, comme dans l’étude)') +
        secHtml('Les listes de mots', 'À ajuster', '98 listes écrites pour LUNA (12 mots à retenir + 12 mots nouveaux), prises dans l’ordre, une par passage, tests libres compris. Les 68 premières n’ont aucun mot en commun. Les suivantes reprennent 21 à 24 mots déjà vus, chacun dans le même rôle et au moins 48 passages plus tard. Un mot déjà vu garde peut-être un peu de familiarité : l’effet n’est pas connu (aucune source trouvée), c’est pourquoi le nombre de mots déjà vus est gardé avec chaque passage. Les listes ne sont pas appariées selon la fréquence des mots ni leur imagerie. Si un mot ne te dit rien, note-le : il sera remplacé.') +
        secHtml('Pas de barème', 'Établi', 'L’étude lue ne donne ni norme ni seuil pour ce test, et le score n’y est pas lié à l’âge de façon significative. Sa moyenne (19,8 sur 24) décrit un groupe, pas toi, avec d’autres mots : ce n’est pas un objectif. Aucun seuil de santé : un professionnel décide.') +
        secHtml('Prudence', 'Établi', 'Un passage seul est bruité. Dans l’étude, le score d’une même personne varie en moyenne de 2,1 mots (écart-type) d’un passage à l’autre : un écart de deux mots d’un moment à l’autre n’a rien d’exceptionnel. Le score baisse aussi au fil des passages (pente de −0,175, unité exacte non revérifiée), ce que les auteurs rapprochent d’une interférence entre les listes successives. Lecture de LUNA, non sourcée : répété plusieurs fois dans la journée, ce test risque de baisser pour cette seule raison, ce qui ressemblerait à un effet d’heure ; dans l’étude, il n’y avait qu’un passage par jour. Un passage hors de la fourchette n’est pas un signal : c’est la répétition, à la même heure R+X, sur plusieurs jours, qui compte.') +
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
      '<span class="module">' + (m ? slotTag(m) : 'Test libre') + '</span></div>' +
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
      '<div class="j-metrics">' + td.metrics(r) + '</div>' +
      '<p class="j-fhint" style="color:var(--text)"><b>Chiffre principal :</b> ' + td.mainTxt + '</p>' +
      '<p class="j-fhint">Durée du passage : ' + ssDur(r.durationMs) + ' (estimée : ≈ ' + ssDur(td.estSec * 1000) + ')</p>' +
      '<div class="chips" style="margin:0"><span class="chip main">Mesuré (toi, ' + ssPlural(count, 'test', 'tests') + ')</span><span class="chip hy">' + DEVICE_TXT[r.device] + ' · ' + (INPUT_TXT[r.input] || r.input) + '</span>' +
      '<span class="chip hy">' + (libre ? 'test libre' : prevuTxt()) + (early ? ' · avant R+2h' : '') + '</span></div></section>' +
      tRefHtml(id, r, libre) +
      td.facts(r) +
      (td.table ? td.table(r) : '') +
      '<details class="j-det"><summary>Comment lire ce résultat</summary>' + td.read() + '</details>' +
      '<p class="j-p">Un seul passage ne dit presque rien : c’est la répétition sur plusieurs jours qui compte. Pas de seuil de santé ici.</p></main>' +
      '<div class="foot"><button type="button" class="btn primary" data-act="' + id + '-save">' + saveTxt('Enregistrer le test') + '</button>' +
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
      case 'instant': return !!form.name.trim() && validClock(form.time);
      case 'act-end': return validClock(form.time);
      case 'meal': return !!form.text.trim() && validClock(form.time);
      case 'bed': return validClock(form.time);
      case 'edit':
        if (form.kind === 'activite') return !!form.name.trim() && validClock(form.time) && (form.end === '' || validClock(form.end));
        if (form.kind === 'repas') return !!form.text.trim() && validClock(form.time);
        if (form.kind === 'instant') return !!form.name.trim() && validClock(form.time);
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

  function vInstant() {
    return formHeader('Instant', 'Un seul moment : une heure, pas de fin') +
      '<main style="padding-top:14px;gap:14px">' + formError() +
      '<section class="j-sec" style="gap:8px"><h2>QUEL INSTANT ?</h2>' +
      (instNames.length ? '' : '<p class="j-fhint">Ta liste est vide. Ajoute des instants dans Réglages, ou écris-en un avec « Autre… ».</p>') +
      pickGrid(instNames, 'Nom de l’instant…', 'Nom de l’instant') + '</section>' +
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
      '<div class="j-addrow"><input id="set-' + which + '" class="j-sel" type="text" maxlength="40" data-set="' + which + '" placeholder="Nouveau motif…" value="' + esc(setDraft[which]) + '" aria-label="Nouveau motif, ' + (which === 'act' ? 'activité' : 'instant') + '">' +
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
    return '<header><div class="top"><span class="brand">LUNA</span><span class="module">Module Corps</span></div>' +
      '<div class="titlerow"><h1 tabindex="-1">Réglages</h1></div>' +
      '<p class="sub">Les motifs que tu veux relever</p></header>' +
      '<main>' + (setNotice ? '<p class="j-ok" role="status">' + esc(setNotice) + '</p>' : '') +
      styleBlock() +
      themeBlock() +
      setSection('act', 'ACTIVITÉS · UN DÉBUT, UNE FIN', 'Elles apparaissent dans « Activité » (Journal → À tout moment).', actNames) +
      setSection('inst', 'INSTANTS · UNE SEULE HEURE', 'Ils apparaissent dans « Instant » (Journal → À tout moment).', instNames) +
      '<p class="j-p">Retirer un motif de la liste ne touche pas à ton historique : les entrées déjà notées gardent leur nom.</p></main>';
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
    var k = form.kind, title = { activite: 'Modifier l’activité', repas: 'Modifier le repas', coucher: 'Modifier le coucher', instant: 'Modifier l’instant' }[k], inner = '';
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
    } else if (k === 'instant') {
      inner = '<section class="j-sec"><div class="j-field"><label class="j-lab" for="f-name">Instant</label>' +
        '<input id="f-name" class="j-sel" type="text" maxlength="40" data-field="name" value="' + esc(form.name) + '"></div>' +
        fld('Heure', timeIn('time', form.time, 'Heure de l’instant')) + '</section>';
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
      '<h1 tabindex="-1">Sauvegarde</h1><p class="sub">Un fichier : tout ton Journal, ton réveil et ton plan</p></header>' +
      '<main style="padding-top:14px;gap:12px"><section class="j-card">' +
      '<p class="lead">Au quotidien, rien à faire : tes relevés, tests, notes, activités, repas et couchers se gardent tout seuls sur cet appareil, d’un jour à l’autre.</p>' +
      '<p>La sauvegarde est une assurance : si l’appli est supprimée, si les données du navigateur sont effacées ou si tu changes d’appareil, le fichier permet de tout retrouver. Le téléphone et l’ordinateur ne se partagent rien : « Restaurer » en mode « Fusionner » réunit leurs données.</p>' +
      '<p>Le fichier garde aussi les réglages du plan (premier jour, graine du mélange, étape du PVT-B) et la liste des mots déjà vus à la Memory List. Les fichiers faits avant cette version se restaurent toujours.</p>' +
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
    [['releve', 'relevé', 'relevés'], ['combo', 'relevé + test', 'relevés + tests'], ['test', 'test', 'tests'], ['rs', 'passage Rotation span', 'passages Rotation span'], ['fl', 'passage Flanker', 'passages Flanker'], ['ss', 'passage Symbol Search', 'passages Symbol Search'], ['hs', 'passage Hand Swype', 'passages Hand Swype'], ['ml', 'passage Memory List', 'passages Memory List'], ['activite', 'activité', 'activités'],
     ['repas', 'repas', 'repas'], ['coucher', 'coucher', 'couchers'], ['instant', 'instant', 'instants'], ['note', 'note', 'notes'], ['pas', 'note « pas ce moment »', 'notes « pas ce moment »']].forEach(function (t) {
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
  function vRestore() {
    var r = restore, body = '', btn, canGo = !!r;
    if (r) {
      var s = restoreStats();
      btn = r.mode === 'merge' ? 'Restaurer (fusionner)' : (r.confirm ? 'Oui, remplacer mes données' : 'Restaurer (remplacer)');
      body = '<section class="j-card"><h2 class="j-kick">FICHIER CHOISI</h2>' +
        '<p class="lead" style="font-size:14px;font-weight:700;overflow-wrap:anywhere">' + esc(r.name || 'Texte collé') + '</p>' +
        '<p>' + (r.exportedAt ? 'Sauvegarde du ' + esc(dShort(r.exportedAt)) + ', ' + clockOf(r.exportedAt) : 'Date de sauvegarde inconnue') + '</p>' +
        '<p>' + esc(countsText(r.entries)) + (s.from ? ' · du ' + esc(dShort(s.from)) + ' au ' + esc(dShort(s.to)) : '') + '</p>' +
        restorePlanLine(r) +
        '<p>' + plural(s.fresh.length, 'élément nouveau', 'éléments nouveaux') + ' pour cet appareil · ' + plural(s.dup, 'déjà présent', 'déjà présents') + '</p></section>' +
        '<section class="j-sec" style="gap:8px"><h2>COMMENT LE RESTAURER ?</h2>' +
        '<label class="j-opt' + (r.mode === 'merge' ? ' on' : '') + '"><input type="radio" name="rmode" value="merge"' + (r.mode === 'merge' ? ' checked' : '') + '>' +
        '<span class="t"><b>Fusionner <small>· recommandé</small></b><span class="d">Ajoute ce qui manque sur cet appareil. Rien n’est effacé, les doublons sont ignorés, ton réveil actuel est gardé. Le plan de cet appareil est gardé, sauf s’il n’a pas encore de premier jour.</span></span></label>' +
        '<label class="j-opt' + (r.mode === 'replace' ? ' on' : '') + '"><input type="radio" name="rmode" value="replace"' + (r.mode === 'replace' ? ' checked' : '') + '>' +
        '<span class="t"><b>Remplacer</b><span class="d">Efface le Journal de cet appareil, et met celui du fichier à la place (réveil' + (r.plan ? ' et plan' : '') + ' compris). Ce qui a été fait après la sauvegarde est perdu.</span></span></label></section>' +
        (r.mode === 'replace' && r.confirm ? '<p class="j-warn" role="alert">Cela efface le contenu du Journal de cet appareil (' + esc(countsText(entries)) + ') pour mettre celui du fichier à la place.' + (r.plan ? ' Le plan (premier jour, graine, étape) est aussi remplacé.' : '') + '</p>' : '');
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
                reminders: vRemind, plan: vPlan, settings: vSettings, instant: vInstant, 'act-start': vActStart, 'act-end': vActEnd, meal: vMeal, bed: vBed, edit: vEdit,
                chain: vChain, skip: vSkip,
                tests: vTests, 'ss-intro': vSsIntro, 'ss-run': vSsRun, 'ss-prac': vSsPrac, 'ss-result': vSsResult,
                'rs-intro': vTIntro, 'rs-run': vTRun, 'rs-prac': vTPrac, 'rs-result': vTResult,
                'hs-intro': vTIntro, 'hs-run': vTRun, 'hs-prac': vTPrac, 'hs-result': vTResult,
                'fl-intro': vTIntro, 'fl-run': vTRun, 'fl-prac': vTPrac, 'fl-result': vTResult,
                'ml-intro': vTIntro, 'ml-run': vTRun, 'ml-result': vTResult };

  function render() {
    var runM = /^(ss|rs|hs|fl|ml)-run$/.exec(screen);
    if (rnRun && !runM) { rnRun.why = 'silent'; rnKill(); } // on quitte l'écran du test : on l'arrête sans rien dire
    root.innerHTML = (VIEWS[screen] || vHome)();
    L.navVisible(screen === 'home' || screen === 'backup' || screen === 'reminders' || screen === 'plan' || screen === 'settings');
    if (screen === 'home') { L.bindWake(root.querySelector('.wake-input')); updateHome(); }
    if (screen === 'reminders') L.bindWake(root.querySelector('.wake-input'));
    if (screen === 'plan') { L.bindWake(root.querySelector('.wake-input')); pRefreshDay(); }
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
    chainStamp(t);
    entries.push(t);
    saved((flow.mode === 'both' ? 'Relevé et test enregistrés · ' : (flow.chain ? 'PVT-B enregistré · ' : 'Test enregistré · ')) + clockOf(ts) + '.');
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
    chainStamp(e);
    entries.push(e);
    saved(td.name + ' enregistré · ' + clockOf(r.ts) + '.');
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
    return rows.map(function (t) { return '<div class="body">' + esc(t) + '</div>'; }).join('');
  }
  function slotTag(m) { // « R+3h · test 2 sur 3 » dans un moment enchaîné, « R+3h · prévu » sinon
    var ch = flow.chain, i = ch ? ch.steps.indexOf(flow.test) : -1;
    return rLabel(m.r) + ' · ' + (i >= 0 ? 'test ' + (i + 1) + ' sur ' + ch.n : 'prévu');
  }
  function chainTag() { return flow.chain && flow.slot != null && PLAN[flow.slot] ? ' · ' + slotTag(PLAN[flow.slot]) : ''; }
  function prevuTxt() { return 'prévu' + (flow.chain && PL.isRodage(flow.chain.d) ? ' · rodage' : ''); }
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
    entries.push(releveEntry(ts, L.getWake()));
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

  /* ---------- Instants ---------- */
  function openInstant() {
    form = { type: 'instant', name: '', other: !instNames.length, time: clockInput(Date.now()), error: '' };
    go('instant');
  }
  function doInstant() {
    if (!form || !formValid()) return;
    var name = form.name.trim().slice(0, 40), ts = tsFromClock(form.time, Date.now()), e = baseEntry('instant', ts, L.getWake());
    e.name = name;
    entries.push(e);
    afterSave('« ' + name + ' » noté à ' + clockOf(ts) + '.');
  }
  // Choix d'un motif sur les grandes touches (activité ou instant).
  function pickName(name) {
    if (!form || (form.type !== 'act-start' && form.type !== 'instant')) return;
    form.name = name; form.other = false; render();
  }
  function pickOther() {
    if (!form || (form.type !== 'act-start' && form.type !== 'instant')) return;
    if (!form.other) { form.other = true; form.name = ''; render(); }
    var inp = $('f-name'); if (inp) inp.focus({ preventScroll: true });
  }

  /* ---------- Réglages : listes de motifs ---------- */
  function setAdd(which) {
    if (which !== 'act' && which !== 'inst') return;
    var list = which === 'act' ? actNames : instNames, name = (setDraft[which] || '').trim().slice(0, 40);
    if (!name) return;
    var r = addToList(list, name);
    if (r === 'ok') { if (which === 'act') saveActNames(); else saveInstNames(); setDraft[which] = ''; setNotice = '« ' + name + ' » ajouté.'; }
    else if (r === 'doublon') setNotice = '« ' + name + ' » est déjà dans la liste.';
    else setNotice = 'La liste est pleine (30 motifs) : retires-en un d’abord.';
    render();
    var inp = $('set-' + which); if (inp) inp.focus({ preventScroll: true });
  }
  function setDel(which, name) {
    if (which === 'act') { actNames = actNames.filter(function (n) { return n !== name; }); saveActNames(); }
    else if (which === 'inst') { instNames = instNames.filter(function (n) { return n !== name; }); saveInstNames(); }
    else return;
    setNotice = '« ' + name + ' » retiré de la liste. Ton historique n’est pas modifié.';
    render();
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
    if (!e || ['activite', 'repas', 'coucher', 'instant'].indexOf(e.kind) < 0) return;
    form = { type: 'edit', id: id, kind: e.kind, time: clockInput(e.ts), error: '' };
    if (e.kind === 'activite') {
      form.name = e.name; form.end = e.end == null ? '' : clockInput(e.end); form.comment = e.comment || '';
      form.feelStart = Object.assign({}, e.feelStart || {}); form.feelEnd = Object.assign({}, e.feelEnd || {});
      form.feelOpen = !!e.feelStart; form.feelOpen2 = !!e.feelEnd;
    }
    if (e.kind === 'repas') form.text = e.text;
    if (e.kind === 'instant') form.name = e.name;
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
    } else if (e.kind === 'repas') {
      e.text = form.text.trim().slice(0, 1000); e.ts = ts;
    } else if (e.kind === 'instant') {
      e.name = form.name.trim().slice(0, 40); e.ts = ts;
    } else {
      e.ts = ts;
      if (e.wakeTs && !(e.wakeTs > ts && e.wakeTs - ts < 20 * 3600e3)) delete e.wakeTs;
    }
    e.day = dayKey(e.ts, e.wake); e.rel = relAt(e.ts, e.wake);
    normalizeActs();
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
  // Format v4 : + liste des instants et entrées « instant ». (v3 : réglages du plan + journal des listes de mots.) Les fichiers v1, v2 et v3 restent lisibles.
  function buildBackup() {
    return JSON.stringify({ app: 'LUNA', v: 4, exportedAt: Date.now(), wake: L.wakeStr(L.getWake()), activities: actNames, instants: instNames, entries: entries, plan: pExport(), mlUsed: mlLogRead() });
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
    if (Number(o.v) > 4) return 'Cette sauvegarde vient d’une version plus récente de LUNA : mets d’abord l’appli à jour.';
    if (o.entries.length > 50000) return 'Ce fichier contient trop d’entrées.';
    var list = o.entries.map(clean).filter(Boolean);
    var seen = {};
    list = list.filter(function (e) { if (seen[e.id]) return false; seen[e.id] = true; return true; }).sort(byTs);
    var skipped = o.entries.length - list.length;
    var acts = cleanNames(o.activities);
    var insts = Array.isArray(o.instants) ? cleanNames(o.instants) : undefined; // undefined = fichier sans liste d'instants (v1 à v3)
    // plan : undefined = fichier sans plan (v1, v2) ; null = réglages illisibles (ignorés) ; sinon réglages validés
    var pl = o.plan === undefined ? undefined : pClean(o.plan);
    var mlu = Array.isArray(o.mlUsed) ? o.mlUsed.filter(function (x) { return Array.isArray(x) && int(x[0], 1, ML_BANK.length) !== null && isFinite(x[1]) && x[1] > 0; })
      .map(function (x) { return [Number(x[0]), Math.floor(x[1])]; }).slice(-400) : undefined;
    return { name: name, entries: list, wake: typeof o.wake === 'string' ? o.wake : null, exportedAt: Number(o.exportedAt) > 0 ? Number(o.exportedAt) : 0,
             acts: acts, insts: insts, mode: 'merge', confirm: false, skipped: skipped, plan: pl, mlUsed: mlu };
  }
  function loadRestore(text, name) {
    var r = parseBackup(text, name);
    if (typeof r === 'string') { restore = null; restoreError = r; }
    else if (!r.entries.length) { restore = null; restoreError = 'Cette sauvegarde ne contient aucune entrée.'; }
    else {
      restore = r; restoreError = r.skipped ? plural(r.skipped, 'entrée illisible ignorée', 'entrées illisibles ignorées') + '.' : '';
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
      if (r.wake && L.parseWake(r.wake) !== null) L.setWake(r.wake, null);
      msg = 'Restauré : cet appareil contient maintenant ' + countsText(r.entries) + ' du fichier.';
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
      case 'home': pendingDel = null; form = null; flow = newFlow(); go('home'); break;
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
      case 'discard':
        if (flow.chain) { flow.result = null; notice = 'Ce passage n’est pas enregistré. Tu peux le refaire ou arrêter ici.'; go('chain'); }
        else { flow = newFlow(); go('home'); }
        break;
      case 'chain-feel': chainFeel(); break;
      case 'chain-go': chainGo(); break;
      case 'chain-stop': chainStop(); break;
      case 'skip-open': skipOpen(Number(id)); break;
      case 'skip-go': doSkip(); break;
      case 'note': noteText = ''; noteTs = Date.now(); go('note'); break;
      case 'save-note': saveNote(); break;
      case 'act-start': openActStart(); break;
      case 'pick': pickName(el.getAttribute('data-name') || ''); break;
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
      case 'plan': pOpen(); break;
      case 'pl-prev': case 'pl-next': case 'pl-today': pNav(name); break;
      case 'pl-start-today': pQuickStart('today'); break;
      case 'pl-start-tomorrow': pQuickStart('tomorrow'); break;
      case 'pl-start-go': pStartGo(); break;
      case 'pl-stage-go': pStageGo(); break;
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
    if (t.id === 'j-note') {
      noteText = t.value;
      var b = $('j-notesave');
      if (b) b.disabled = !noteText.trim();
    } else if (t.id === 'j-detail') {
      flow.detail = t.value;
    } else if (t.id === 'j-skiptext') {
      if (form && form.type === 'skip') form.text = t.value;
    } else if (t.id === 'pl-start') {
      pOnField(t);
    } else if (t.getAttribute && t.getAttribute('data-set')) {
      var wh = t.getAttribute('data-set');
      if (wh === 'act' || wh === 'inst') {
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
    var a = currentAct(), min = a ? (Date.now() - a.ts) / 60000 : 0;
    if (a && min >= LONG_ACT_MIN) L.setAlert({ title: 'Activité en cours · ' + a.name, sub: 'Depuis ' + durText(min) + ' · la terminer ?' });
    else L.setAlert(null);
  }

  /* ---------- Branchement sur l'appli ---------- */
  function maybeUpdate() {
    updateAlert();
    if (root.hidden) return;
    if (screen === 'home') updateHome();
    if (screen === 'plan') pRefreshDay();
    if (screen === 'reminders') { var w = $('j-rwake'); if (w) w.textContent = L.fmtClock(L.getWake()); }
  }
  L.on('tick', maybeUpdate);
  L.on('wake', maybeUpdate);
  L.journal = {
    // target : 'settings' ouvre les Réglages (onglet du bas) ; sinon on revient au Journal
    onShow: function (target) {
      notice = ''; setNotice = '';
      if (target === 'settings') { flow = newFlow(); form = null; screen = 'settings'; }
      else if (['home', 'backup', 'history', 'reminders', 'plan'].indexOf(screen) < 0) { flow = newFlow(); form = null; screen = 'home'; }
      render();
    }
  };
  readAll();
  pLoad();
  updateAlert();
})();
