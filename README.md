<div align="center">

# ⚔️ JDR Mapping

**Créateur de cartes de combat pour jeux de rôle, en 2D semi-3D, pensé pour le MJ.**

Construis ta carte en quelques clics, pose les figurines, et fais jouer le combat en direct :
relief, portées de déplacement et d'attaque, animations d'attaque.

*Aucune installation : ouvre `index.html` dans ton navigateur.*

![Éditeur de carte](docs/images/editeur.png)

</div>

---

## Sommaire

- [Démarrage rapide](#-démarrage-rapide)
- [L'éditeur de carte](#️-léditeur-de-carte)
- [Presets de carte](#-presets-de-carte)
- [Le relief](#️-le-relief)
- [Jouer la carte](#-jouer-la-carte)
- [Portées de déplacement et d'attaque](#-portées-de-déplacement-et-dattaque)
- [Attaques animées](#-attaques-animées)
- [Caractéristiques des figurines (fichier TXT)](#-caractéristiques-des-figurines--datacaracteristiquestxt)
- [Raccourcis](#️-raccourcis)
- [Structure du projet](#-structure-du-projet)
- [Ajouter du contenu](#-ajouter-du-contenu)

---

## 🚀 Démarrage rapide

1. Télécharge ou clone le dépôt :

   ```bash
   git clone https://github.com/PhD-90/JDR_MAPPING.git
   ```

2. Double-clique sur **`index.html`** (Chrome, Edge ou Firefox).
3. Choisis un **preset** (Forêt, Donjon...) ou dessine ta carte, puis passe dans l'onglet **🎲 Jouer la carte**.

La carte est sauvegardée automatiquement dans le navigateur. Tu peux aussi l'exporter en `.json`
(pour la recharger plus tard) ou en `.png` (pour la montrer aux joueurs).

---

## 🛠️ L'éditeur de carte

| Outil | Utilisation |
| --- | --- |
| 🖐 **Sélection** | Déplacer, redimensionner (poignée orange), pivoter un élément |
| 🖌 **Sol** | Peindre le sol au pinceau (1 à 5 cases) : 14 types de sol |
| 📦 **Élément** | Poser murs, maisons, rochers, arbres, colonnes, tonneaux, tables, coffres, escaliers... |
| ⛰ **Relief** | Monter / descendre le terrain (voir plus bas) |
| 🧽 **Gomme** | Effacer les éléments |

Chaque élément a une **largeur**, une **profondeur**, une **hauteur**, une **couleur** et un **nom** réglables.
Le curseur **Effet 3D** règle la force du relief à l'écran.

---

## 🗺 Presets de carte

Dix décors générés aléatoirement : **chaque clic donne une nouvelle variante**. Décoche
« Ajouter le décor » pour ne garder que le sol et les murs.

![Presets de carte](docs/images/presets.png)

---

## ⛰️ Le relief

Chaque case a un **niveau de hauteur de 0 à 8** (1 niveau ≈ 1,5 m), dessiné en plateaux et falaises.
Avec l'outil **Relief** : clic gauche pour monter, clic droit pour descendre, glisser pour étendre au même niveau.
Les éléments et les figurines posés sur une case surélevée montent avec elle.

<div align="center">

![Outil relief](docs/images/relief.png)

</div>

---

## 🎲 Jouer la carte

Le deuxième onglet sert pendant la partie : le **MJ place et déplace les figurines** en direct.

![Onglet Jouer](docs/images/jouer.png)

**10 figurines en pixel art**, socle bleu pour les personnages et rouge pour les monstres :

<div align="center">

![Figurines](docs/images/figurines.png)

</div>

- **Hauteur** : une figurine se tient sur le relief ou **sur un élément** (caisse, table, rocher...).
  Sa hauteur s'affiche au-dessus d'elle (`▲2`), et le panneau indique qui **domine** qui.
- **Déroulement d'un combat** :
  1. **Préparation** : place les figurines où tu veux.
  2. **⚔ Commencer le combat** : les positions actuelles deviennent les positions de départ.
  3. **▶ Tour suivant** à chaque tour (les déplacements repartent de zéro).
  4. **↺ Recommencer** : retour aux positions de départ, tour 1.
     **⏹ Nouveau combat** : retour aux positions de départ, en préparation.

---

## 🟩 Portées de déplacement et d'attaque

Sélectionne ou survole une figurine :
**en vert** les cases où elle peut aller ce tour-ci, **en rouge** celles qu'elle peut attaquer.
Les ennemis à portée sont marqués **⚔**.

<div align="center">

![Portées](docs/images/portees.png)

</div>

Le calcul tient compte :

- du **relief** : monter **et** descendre coûtent 1 case de plus par niveau, et on ne grimpe que jusqu'à la valeur `saut` de la figurine ;
- des **diagonales** : une diagonale coûte 2 cases (tout droit puis à gauche ou à droite) ;
- des **sols** (boue, neige, glace : 2 cases ; eau : seulement pour les nageurs ; lave et vide : infranchissables) ;
- des **obstacles** (arbres, murs, maisons, colonnes) et des **ennemis**, qui bloquent le passage (les alliés se traversent) ;
- de la **hauteur pour l'attaque** : +1 case de portée à distance par niveau au-dessus de la cible ; pas de corps à corps si l'écart dépasse 1 niveau.

Le mode **Toutes** affiche les zones de toutes les figurines à la fois.

> ℹ️ La ligne de vue n'est pas calculée : c'est au MJ de juger si un mur bloque un tir.

---

## 💥 Attaques animées

Figurine sélectionnée → **⚔ Attaquer** (ou touche **A**) → clic sur la cible.
Chaque figurine a sa propre animation, et l'attaque est notée dans le **journal de combat**.

<div align="center">

![Animations d'attaque](docs/images/attaques.gif)

</div>

| Figurine | Attaque | Effet |
| --- | --- | --- |
| Guerrier | Coup d'épée | Bond en avant, arc d'épée lumineux |
| Clerc | Masse sacrée | Onde dorée et rayons de lumière |
| Mage | Projectile magique | Orbe bleu avec traînée, explosion |
| Rôdeuse | Flèche | Flèche en cloche, plantée dans la cible |
| Gobelin | Coups de dague | Deux estocades rapides |
| Squelette | Lame rouillée | Arc d'épée verdâtre |
| Orc | Coup de hache | Grand arc vertical, poussière, tremblement de l'écran |
| Loup | Morsure | Trois griffures rouges |
| Slime | Crachat d'acide | Boule verte, éclaboussures, flaque |
| Dragon | Souffle de feu | Flot de flammes, cible en feu, tremblement de l'écran |

---

## 📄 Caractéristiques des figurines : `data/caracteristiques.txt`

Toutes les règles de déplacement sont dans un **fichier texte commenté**, facile à modifier :

```ini
[regles]
deplacement_diagonal = non   # une diagonale coûte 2 cases
attaque_diagonale    = oui   # une case en diagonale est à 1 case de portée
cout_montee          = 1     # +1 case par niveau monté
cout_descente        = 1     # +1 case par niveau descendu
bonus_portee_hauteur = 1     # +1 case de portée à distance par niveau au-dessus de la cible

[terrain]
boue = 2
eau  = 2    # seulement pour les nageurs
lave = x    # x = infranchissable
mur  = x

[Rôdeuse]
deplacement = 6
attaque     = 8      # arc long
saut        = 2      # grimpe facilement
vol         = non
nage        = oui
```

- Appli ouverte en **double-cliquant** : le navigateur interdit de lire un fichier tout seul. Après modification,
  onglet **Jouer** → **📄 Charger un .txt** (les valeurs sont mémorisées ; **↺ Défaut** pour revenir aux valeurs d'origine).
- Appli servie par un **serveur local** (ex. extension VS Code *Live Server*) : le fichier est lu automatiquement au démarrage.
- Les champs **Dépl.** et **Portée** du panneau permettent aussi de modifier **une seule figurine** (un orc chef plus rapide...).

---

## ⌨️ Raccourcis

| Éditeur | | Jouer | |
| --- | --- | --- | --- |
| Clic gauche | Poser / peindre | Glisser | Déplacer une figurine |
| Clic droit | Supprimer | Clic droit | Retirer une figurine |
| R | Pivoter | A | Attaquer |
| Ctrl+D | Dupliquer | Flèches | Déplacer d'une case |
| Suppr | Effacer | Échap | Annuler l'action en cours |
| Ctrl+Z | Annuler | Ctrl+Z | Annuler |
| Molette | Zoom | Espace + glisser | Déplacer la vue |

---

## 📁 Structure du projet

```text
index.html                 Page et panneaux de l'interface
css/style.css              Styles
data/caracteristiques.txt  Caractéristiques des figurines et règles de déplacement
docs/images/               Images de ce README
js/config.js               Sols (FLOORS) et éléments (OBJECTS)
js/utils.js                Couleurs, bruit, aléatoire
js/state.js                État global (carte, caméra, mode, outil, sélection)
js/terrain.js              Relief : niveaux des cases, hauteur des éléments et figurines
js/sprites.js              Personnages et monstres en pixel art
js/stats.js                Lecture des caractéristiques (copie intégrée du fichier TXT)
js/ranges.js               Calcul et affichage des portées
js/anims.js                Animations d'attaque
js/render.js               Rendu de la carte en semi-3D
js/editor.js               Ajout/suppression, pinceau, annulation
js/presets.js              Génération procédurale des presets
js/play.js                 Onglet « Jouer » : figurines, tours, attaques
js/input.js                Souris et clavier
js/ui.js                   Panneaux, palettes, réglages de carte
js/io.js                   Sauvegarde, chargement, export PNG
js/main.js                 Démarrage
```

Les scripts sont chargés dans cet ordre par `index.html`. Ce sont des scripts classiques (pas de modules),
pour que l'appli fonctionne en double-cliquant le fichier, sans serveur.

---

## 🧩 Ajouter du contenu

| Ajouter... | Où |
| --- | --- |
| Un sol | Entrée dans `FLOORS` (`js/config.js`) |
| Un élément | Entrée dans `OBJECTS` (`js/config.js`) et, si nouvelle forme, un `case` dans `drawObj` (`js/render.js`) |
| Une figurine | Entrée dans `SPRITES` (`js/sprites.js`) : dessin 16×16, une lettre par couleur. Puis sa section dans `data/caracteristiques.txt` et son style dans `ATTACKS` (`js/anims.js`) |
| Un preset | Entrée dans `PRESETS` (`js/presets.js`) avec une fonction `gen(g, deco)` |
| Une règle de déplacement | Section `[regles]` de `data/caracteristiques.txt`, lue dans `js/ranges.js` |
