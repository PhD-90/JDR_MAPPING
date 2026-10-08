// Caractéristiques des figurines (déplacement, attaque...) et règles, au format de data/caracteristiques.txt.
// Ordre de priorité : fichier lu via serveur local > fichier chargé avec le bouton (mémorisé) > copie intégrée.

const DEFAULT_STATS_TXT = `# =====================================================================
#  Caractéristiques des figurines - Créateur de Map JDR
# =====================================================================
#  Modifie ce fichier puis, dans l'onglet « Jouer la carte », clique sur
#  « Charger un .txt » et choisis-le (les valeurs sont mémorisées).
#  Si l'appli est ouverte via un serveur local, il est lu automatiquement.
#
#  Distances en cases (1 case = 1,5 m). Hauteurs en niveaux (1 niveau = 1,5 m).
#  Syntaxe : cle = valeur      # commentaire
#  Valeurs : nombre, oui / non, x (= infranchissable)
# =====================================================================

[regles]
deplacement_diagonal = non   # non : une diagonale coûte 2 cases (tout droit puis à gauche/droite)
attaque_diagonale    = oui   # oui : une case en diagonale est à 1 case de portée (corps à corps en diagonale)
cout_montee          = 1     # cases en plus par niveau monté   (ex. passer du niveau 1 au 2 : +1)
cout_descente        = 1     # cases en plus par niveau descendu (ex. passer du niveau 2 au 1 : +1)
bonus_portee_hauteur = 1     # attaque à distance : +1 case de portée par niveau au-dessus de la cible
melee_hauteur_max    = 1     # corps à corps impossible si la cible est plus haute/basse de plus de N niveaux
ligne_de_vue         = oui   # attaques à distance bloquées par les murs, maisons, arbres et colonnes

[terrain]
# Coût en cases pour entrer sur une case de ce sol. Sol non listé = 1.
boue  = 2
neige = 2
glace = 2
sable = 1
eau   = 2    # seulement pour les figurines qui nagent (nage = oui), sinon infranchissable
lave  = x
vide  = x

# Éléments posés sur la carte (nom affiché dans l'éditeur). Non listé = 1, et on peut
# monter dessus si la figurine saute assez haut (caisse, table, rocher, tonneau...).
arbre   = x
mur     = x
maison  = x
colonne = x

# ---------------------------------------------------------------------
#  Figurines (le nom entre crochets = le nom affiché dans l'appli)
#  deplacement = cases par tour
#  attaque     = portée d'attaque en cases (1 = corps à corps, plus = à distance)
#  saut        = niveaux qu'elle peut monter d'une case à la suivante
#  vol         = oui : ignore le relief, les sols et les obstacles
#  nage        = oui : peut traverser l'eau
#  --- combat (suivi des PV et jets automatiques) ---
#  pv          = points de vie
#  ca          = classe d'armure (le jet d'attaque doit l'égaler ou la dépasser)
#  toucher     = bonus au jet d'attaque (d20 + toucher)
#  degats      = dés de dégâts (ex. 1d8+3, 2d6)
#  init        = bonus d'initiative (d20 + init)
#  xp          = expérience gagnée par le groupe quand le monstre est vaincu
#  --- bloc de statistiques complet (sauvegardes, simulation, IA) ---
#  niveau          = niveau (débloque certaines capacités)
#  carac           = FOR DEX CON INT SAG CHA
#  sauvegardes     = caractéristiques maîtrisées aux jets de sauvegarde (ex. dex con)
#  maitrise        = bonus de maîtrise (2 par défaut)
#  type_degats     = tranchant, perforant, contondant, feu, froid, acide, poison, foudre, force, necrotique, radiant
#  resistances / immunites / vulnerabilites = types de dégâts (moitié / aucun / double)
#  multiattaque    = nombre d'attaques par action
#  traits          = meute (avantage si un allié est au contact de la cible), renversement (cible à terre),
#                    fuite_agile (se désengage en action bonus), agressif (fonce en action bonus), sans_peur (ne fuit jamais)
#  Les fiches créées dans l'onglet « Personnages » ont leurs propres valeurs.
# ---------------------------------------------------------------------

# ----- Personnages -----

[Guerrier]
deplacement = 5
attaque     = 1
saut        = 1
vol         = non
nage        = non
pv          = 28
ca          = 18
toucher     = +5
degats      = 1d8+3
init        = +1
niveau          = 3
carac           = 16 13 14 8 12 10
sauvegardes     = for con
type_degats     = tranchant

[Mage]
deplacement = 5
attaque     = 6      # sorts à distance
saut        = 1
vol         = non
nage        = non
pv          = 16
ca          = 12
toucher     = +5
degats      = 1d10
init        = +2
niveau          = 3
carac           = 8 14 13 16 12 10
sauvegardes     = int sag
type_degats     = feu

[Rôdeuse]
deplacement = 6
attaque     = 8      # arc long
saut        = 2      # grimpe facilement
vol         = non
nage        = oui
pv          = 24
ca          = 15
toucher     = +6
degats      = 1d8+3
init        = +3
niveau          = 3
carac           = 12 16 13 10 14 8
sauvegardes     = for dex
type_degats     = perforant

[Clerc]
deplacement = 5
attaque     = 1
saut        = 1
vol         = non
nage        = non
pv          = 22
ca          = 18
toucher     = +4
degats      = 1d6+2
init        = +0
niveau          = 3
carac           = 14 10 13 10 16 12
sauvegardes     = sag cha
type_degats     = contondant

# ----- Monstres -----

[Gobelin]
deplacement = 6
attaque     = 1
saut        = 1
vol         = non
nage        = non
pv          = 7
ca          = 15
toucher     = +4
degats      = 1d6+2
init        = +2
xp          = 50
carac           = 8 14 10 10 8 8
type_degats     = tranchant
traits          = fuite_agile

[Squelette]
deplacement = 5
attaque     = 1
saut        = 1
vol         = non
nage        = non
pv          = 13
ca          = 13
toucher     = +4
degats      = 1d6+2
init        = +2
xp          = 50
carac           = 10 14 15 6 8 5
type_degats     = perforant
vulnerabilites  = contondant
immunites       = poison

[Slime]
deplacement = 3
attaque     = 1
saut        = 0      # ne peut pas grimper
vol         = non
nage        = oui
pv          = 22
ca          = 8
toucher     = +3
degats      = 1d6+1
init        = -2
xp          = 100
carac           = 12 6 16 1 6 2
type_degats     = acide
immunites       = acide
resistances     = feu froid

[Orc]
deplacement = 6
attaque     = 1
saut        = 1
vol         = non
nage        = non
pv          = 15
ca          = 13
toucher     = +5
degats      = 1d12+3
init        = +1
xp          = 100
carac           = 16 12 16 7 11 10
type_degats     = tranchant
traits          = agressif

[Loup]
deplacement = 8
attaque     = 1
saut        = 1
vol         = non
nage        = oui
pv          = 11
ca          = 13
toucher     = +4
degats      = 2d4+2
init        = +2
xp          = 50
carac           = 12 15 12 3 12 6
type_degats     = perforant
traits          = meute renversement

[Dragon]
deplacement = 8
attaque     = 3      # souffle
saut        = 2
vol         = oui
nage        = oui
pv          = 75
ca          = 17
toucher     = +7
degats      = 2d10+4
init        = +0
xp          = 2300
carac           = 19 10 17 12 11 15
sauvegardes     = dex con sag cha
maitrise        = 3
type_degats     = perforant
immunites       = feu
multiattaque    = 2
traits          = sans_peur
`;

let STATS = null, statsSource = '';

// Lit le texte : sections [nom], lignes « cle = valeur », commentaires après #
function parseStats(txt) {
  const out = { rules: {}, terrain: {}, units: {} };
  let cur = null;
  txt.split(/\r?\n/).forEach(raw => {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) return;
    const sec = line.match(/^\[(.+)\]$/);
    if (sec) {
      const n = norm(sec[1]);
      if (n === 'regles') cur = out.rules;
      else if (n === 'terrain') cur = out.terrain;
      else {
        const key = Object.keys(SPRITES).find(k => norm(k) === n || norm(SPRITES[k].name) === n);
        cur = key ? (out.units[key] = {}) : null;   // section inconnue : ignorée
      }
      return;
    }
    const kv = line.match(/^([^=]+)=(.*)$/);
    if (!kv || !cur) return;
    const v = norm(kv[2]);
    cur[norm(kv[1])] = v === 'oui' ? true : v === 'non' ? false
      : (v === 'x' || v === 'infranchissable') ? Infinity
      : /^[+-]?\d+([.,]\d+)?$/.test(v) ? parseFloat(v.replace(',', '.')) : v;   // « 1d8+3 » reste du texte
  });
  const r = out.rules;   // ancien réglage « diagonales » : s'applique aux deux si les nouveaux sont absents
  out.rules = { deplacement_diagonal: r.diagonales ?? false, attaque_diagonale: r.diagonales ?? true,
                cout_montee: 1, cout_descente: 1, bonus_portee_hauteur: 1, melee_hauteur_max: 1, ...r };
  return out;
}

function loadStats(txt, source) { STATS = parseStats(txt); statsSource = source; invalidateZones(); }

// Caractéristiques de déplacement effectives d'une figurine
// (valeurs propres à la figurine > fichier de caractéristiques ; un état « Étourdi » ou « Entravé » bloque le déplacement)
function unitStats(u) {
  const b = (STATS && STATS.units[u.sprite]) || {};
  const stuck = (u.conds || []).some(k => condOf(k)?.move0) || (u.hp !== undefined && u.hp <= 0);
  let dep = u.mov ?? b.deplacement ?? 5;
  if (u.act && u.act.standUp) dep = Math.floor(dep / 2);   // se relever coûte la moitié du déplacement
  if (u.act && u.act.dash) dep *= 2;                       // foncer double le déplacement
  return { deplacement: stuck ? 0 : dep, attaque: u.atk ?? b.attaque ?? 1,
           saut: u.saut ?? b.saut ?? 1, vol: u.vol ?? !!b.vol, nage: u.nage ?? !!b.nage };
}
// Statistiques de combat par défaut d'un type de figurine (fichier de caractéristiques)
function spriteCombat(key) {
  const b = (STATS && STATS.units[key]) || {};
  const ab = {}, cs = listOf(b.carac).map(Number);
  AB_KEYS.forEach((k, i) => { ab[k] = cs[i] || 10; });
  return { hpMax: b.pv ?? 10, ca: b.ca ?? 12, toucher: b.toucher ?? 3, degats: String(b.degats ?? '1d6+1'), init: b.init ?? 0, xp: b.xp ?? 0,
           ab, saveProf: listOf(b.sauvegardes), prof: b.maitrise ?? 2, dmgType: b.type_degats || '', lvl: b.niveau ?? 1,
           resist: listOf(b.resistances), immun: listOf(b.immunites), vuln: listOf(b.vulnerabilites), multi: b.multiattaque || 1, traits: listOf(b.traits) };
}
const listOf = v => v === undefined || v === null || v === false ? [] : String(v).split(/[\s,;]+/).filter(Boolean);
// Camp d'une figurine : 'hero' (personnages) ou 'monster'
const unitKind = u => u.camp || (SPRITES[u.sprite] || {}).kind || 'monster';
const isKO = u => u.hp !== undefined && u.hp <= 0;

// Coût pour entrer sur une case de ce sol (Infinity = infranchissable)
function floorCost(floorKey, st) {
  if (floorKey === 'water' && !st.nage) return Infinity;
  const t = STATS.terrain, name = norm((FLOORS[floorKey] || FLOORS.void).name);
  return t[name] ?? t[floorKey] ?? 1;
}

function initStats() {
  let saved = null;
  try { saved = localStorage.getItem('jdr-stats'); } catch (e) {}
  loadStats(saved || DEFAULT_STATS_TXT, saved ? 'fichier chargé' : 'valeurs par défaut');
  // servie par un serveur local : on lit directement data/caracteristiques.txt
  if (location.protocol.startsWith('http'))
    fetch('data/caracteristiques.txt', { cache: 'no-store' })
      .then(r => r.ok ? r.text() : Promise.reject())
      .then(t => { loadStats(t, 'data/caracteristiques.txt'); syncPlayUI(); redraw(); })
      .catch(() => {});
}
