<div align="center">

# ⚔️ JDR Mapping

**L'atelier du maître du jeu : carte du monde, cartes de combat en 2D semi-3D, fiches de personnages
et suivi des combats en direct.**

Génère le monde de ta campagne, suis le groupe de ville en donjon, construis les cartes de combat,
puis fais jouer l'affrontement : initiative, points de vie, sorts, jets de dés, brouillard de guerre,
écran pour les joueurs, animations, sons, expérience et montée de niveau.

*Aucune installation, aucun compte, aucun serveur : ouvre `index.html` dans ton navigateur.*

![Suivi du combat](docs/images/suivi.png)

</div>

---

## ✨ Aperçu

<table>
<tr>
<td width="33%" align="center"><a href="#-le-monde"><img src="docs/images/monde.png" alt="Carte du monde"></a><br><b>Carte du monde</b><br><sub>royaumes, villes, donjons, voyages</sub></td>
<td width="33%" align="center"><a href="#-léditeur-de-carte"><img src="docs/images/editeur.png" alt="Éditeur"></a><br><b>Éditeur de carte</b><br><sub>sols, éléments, relief, 10 presets</sub></td>
<td width="33%" align="center"><a href="#-les-personnages"><img src="docs/images/personnages.png" alt="Fiches de personnages"></a><br><b>Fiches de personnages</b><br><sub>races, classes, caractéristiques</sub></td>
</tr>
<tr>
<td align="center"><a href="#-portées-de-déplacement-et-dattaque"><img src="docs/images/portees.png" alt="Portées"></a><br><b>Portées</b><br><sub>déplacement et attaque selon le relief</sub></td>
<td align="center"><a href="#-capacités-et-sorts"><img src="docs/images/sorts-explosion.png" alt="Sorts"></a><br><b>Capacités et sorts</b><br><sub>boule de feu, soins, bénédiction...</sub></td>
<td align="center"><a href="#-attaques-animées"><img src="docs/images/attaques.gif" alt="Attaques animées"></a><br><b>Attaques animées</b><br><sub>une animation par figurine</sub></td>
</tr>
<tr>
<td align="center"><a href="#-écran-des-joueurs-et-brouillard-de-guerre"><img src="docs/images/ecran-joueurs.png" alt="Écran des joueurs"></a><br><b>Écran des joueurs</b><br><sub>brouillard de guerre, figurines cachées</sub></td>
<td align="center"><a href="#-onglet-outils-mj"><img src="docs/images/outils-mj.png" alt="Outils MJ"></a><br><b>Outils du MJ</b><br><sub>rencontres, PNJ, trésors, quêtes...</sub></td>
<td align="center"><a href="#-monstres-automatiques"><img src="docs/images/ia-monstres.png" alt="IA"></a><br><b>Monstres automatiques</b><br><sub>déplacement et attaque seuls</sub></td>
</tr>
</table>

---

## 📚 Sommaire

1. [Démarrage rapide](#-démarrage-rapide)
2. [Ta première partie, pas à pas](#-ta-première-partie-pas-à-pas)
3. [Les onglets](#-les-onglets)
4. [🌍 Le monde](#-le-monde)
5. [🛠 L'éditeur de carte](#-léditeur-de-carte)
6. [🧙 Les personnages](#-les-personnages)
7. [🎲 Jouer un combat](#-jouer-un-combat)
   - [Placer les figurines](#placer-les-figurines) · [Portées](#-portées-de-déplacement-et-dattaque) · [Déroulement](#déroulement-dun-combat)
   - [Attaques](#-attaques-animées) · [Capacités et sorts](#-capacités-et-sorts) · [États](#-états) · [Jets contre la mort](#-jets-contre-la-mort)
   - [Monstres automatiques](#-monstres-automatiques) · [Panneau de suivi](#-le-panneau-de-suivi) · [Fin du combat](#-fin-du-combat-et-expérience)
8. [🎭 Outils du MJ](#-outils-du-mj)
9. [🔊 Sons](#-sons)
10. [📄 Le fichier de caractéristiques](#-le-fichier-de-caractéristiques)
11. [💾 Sauvegardes et fichiers](#-sauvegardes-et-fichiers)
12. [⌨️ Raccourcis](#️-raccourcis)
13. [❓ Questions fréquentes](#-questions-fréquentes)
14. [🧩 Pour aller plus loin (code)](#-pour-aller-plus-loin-code)

---

## 🚀 Démarrage rapide

1. Télécharge le dépôt (bouton **Code → Download ZIP** sur GitHub) ou clone-le :

   ```bash
   git clone https://github.com/PhD-90/JDR_MAPPING.git
   ```

2. Ouvre **`index.html`** dans Chrome, Edge ou Firefox (double-clic).
3. C'est tout. Tout est enregistré automatiquement dans le navigateur.

> 💡 Pour profiter de tout (lecture automatique du fichier de caractéristiques, écran des joueurs le plus fiable),
> tu peux aussi servir le dossier avec un petit serveur local, par exemple l'extension VS Code **Live Server**
> ou `python -m http.server` dans le dossier, puis ouvrir `http://localhost:8000`.

---

## 🧭 Ta première partie, pas à pas

| | Étape | Où |
| --- | --- | --- |
| 1 | Crée les héros : nom, race, classe, caractéristiques. Quatre héros d'exemple sont déjà prêts. | 🧙 Personnages |
| 2 | Ouvre la carte du monde : le groupe attend dans une capitale. | 🌍 Monde |
| 3 | Sélectionne le groupe (**👥 Sélectionner tout le groupe**) puis fais un **clic droit** sur un donjon : le voyage est noté avec sa durée. | 🌍 Monde |
| 4 | Clique sur le donjon puis **⚔ Générer la carte de combat** : une carte adaptée au lieu est créée et ouverte dans l'éditeur. | 🌍 Monde → 🛠 Éditeur |
| 5 | Ajuste la carte si besoin : murs, relief, pièges... | 🛠 Éditeur |
| 6 | Pose les héros (**Mes personnages**) et les monstres, ou génère une **rencontre équilibrée** et clique **➕ Poser sur la carte de combat**. | 🎲 Jouer / 📜 Outils MJ |
| 7 | Active le **🌫 brouillard de guerre** et ouvre l'**📺 écran des joueurs** sur la télé. | 🎲 Jouer |
| 8 | **⚔ Commencer le combat** : l'initiative est lancée, chacun joue à son tour (déplacement, **⚔ Attaquer**, sorts). | 🎲 Jouer |
| 9 | Laisse les monstres jouer seuls (**🤖**) ou joue-les toi-même. | 🎲 Jouer |
| 10 | **🏁 Terminer** : l'XP est partagée, les PV sont enregistrés sur les fiches, et on peut monter de niveau. | 🎲 Jouer → 🧙 Personnages |

---

## 🗂 Les onglets

| Onglet | Rôle |
| --- | --- |
| 🌍 **Monde** | Carte du monde générée, lieux, position des personnages, voyages, calendrier, sauvegarde de campagne |
| 🛠 **Éditeur** | Construire la carte de combat : sols, éléments, relief, presets |
| 🎲 **Jouer la carte** | Le combat : figurines, initiative, PV, attaques, sorts, brouillard, écran des joueurs |
| 🧙 **Personnages** | Fiches de personnages et de PNJ, progression |
| 📜 **Outils MJ** | Générateurs (rencontres, PNJ, trésors, quêtes...), notes de session, aide-mémoire |

En haut à droite : **🔊** pour couper ou activer le son, et **📍 nom du lieu** quand la carte de combat ouverte
appartient à un lieu du monde (un clic y ramène).

---

## 🌍 Le monde

![Carte du monde](docs/images/monde.png)

### Génération

Le monde est créé à partir d'une **graine** : la même graine redonne toujours le même monde. Trois formes au choix :
**Continent**, **Archipel**, **Grand continent**.

1. **Relief** : bruit fractal (fBm) et crêtes pour dessiner des chaînes de montagnes ; océan sur les bords.
2. **Mer et lacs** : le niveau de la mer est réglé pour obtenir la part de terres voulue ; les cuvettes forment des lacs.
3. **Rivières** : elles descendent selon la plus forte pente depuis les hauteurs jusqu'à la mer.
4. **Climat** : humidité (distance à l'eau) et température (latitude et altitude).
5. **Biomes** : 19 terrains (prairie, forêt, jungle, désert, savane, steppe, taïga, toundra, marais, collines,
   montagnes, sommets, neiges éternelles, côtes...).
6. **Royaumes** : chaque terre est rattachée à la capitale la plus proche ; montagnes et grands fleuves font frontière.
7. **Lieux** nommés et décrits : 🏰 capitales, 🏘️ villes et ⚓ ports (sur les côtes et les rivières), 🏠 villages,
   💀 donjons, 🏛️ ruines, 🕳️ grottes, 🗼 tours, ⛩️ temples.

La méthode s'inspire de [Red Blob Games](https://www.redblobgames.com/maps/polygon-map-generation/) et de
[Azgaar's Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator/wiki/Quick-Start-Tutorial).

### Utilisation

| Action | Comment |
| --- | --- |
| Se déplacer sur la carte | Glisser, molette pour zoomer, **Voir tout le monde** |
| Sélectionner un personnage | Clic sur sa figurine ; **Maj+clic** pour former un groupe |
| Voyager | **Clic droit** sur la carte ou sur un lieu. Durée selon la distance et le terrain (forêt ×1,5, montagne ×2,5, marais ×2...), bateau pour traverser la mer |
| Préparer un trajet | Survoler la carte avec un personnage sélectionné : l'infobulle donne la distance et le nombre de jours |
| Déplacer librement | Glisser une figurine ou un lieu |
| Inspecter un lieu | Clic : nom, type, royaume, terrain, population, description et **notes du MJ** modifiables, personnages présents |
| Créer un lieu | Choisir un type puis **📍 Ajouter** et cliquer sur la carte |
| Faire passer le temps | **+1 jour**, **🛏 Repos long** (le groupe récupère tous ses PV) ; le jour avance aussi avec les voyages |
| Affichage | Royaumes, rivières, montagnes et forêts, noms, **style parchemin** |

Chaque trajet est noté dans le **journal de voyage** (jour, départ, arrivée, distance, terrain traversé).

<div align="center">

| Lieu sélectionné, groupe arrivé | Style parchemin |
| --- | --- |
| ![Lieu et voyage](docs/images/monde-lieu.png) | ![Style parchemin](docs/images/monde-parchemin.png) |

</div>

### Cartes de combat liées aux lieux

Chaque lieu peut avoir **sa propre carte de combat** :

- **⚔ Générer la carte de combat** : le preset est choisi selon le lieu et le terrain (donjon, ruines et tours → donjon,
  grotte → grotte, ville → ville, village → taverne, forêt → forêt, désert, neige, marais...) ;
- **✏ Éditer** / **🎲 Jouer** pour l'ouvrir ; toutes les modifications sont enregistrées dans le lieu ;
- **📌 Lier la carte de combat actuelle** pour rattacher une carte faite à la main ; **⟳ Regénérer**, **✖ Délier**.

Sur la carte du monde, un **⚔** à côté d'un lieu indique qu'il a une carte de combat.

---

## 🛠 L'éditeur de carte

![Éditeur de carte](docs/images/editeur.png)

| Outil | Utilisation |
| --- | --- |
| 🖐 **Sélection** | Déplacer un élément, le redimensionner (poignée orange), le pivoter (**R**), le dupliquer (**Ctrl+D**) |
| 🖌 **Sol** | Peindre au pinceau (1 à 5 cases) |
| 📦 **Élément** | Poser un élément ; les murs se tracent en glissant |
| ⛰ **Relief** | Clic gauche monte, clic droit descend, glisser étend au même niveau |
| 🧽 **Gomme** | Effacer des éléments (clic droit efface aussi avec les autres outils) |

- **14 sols** : pierre, dalles, herbe, terre, sable, parquet, eau, lave, neige, pavés, roche, boue, glace, vide.
- **Éléments** : mur, maison, caisse, rocher, arbre, colonne, tonneau, table, coffre, escalier, et des pions simples.
  Chacun a une largeur, une profondeur, une **hauteur**, une couleur et un nom réglables.
- **Carte** : nombre de colonnes et de lignes, **Effet 3D** (force du relief), grille, remplir, aplanir.
- **Fichier** : nouvelle carte, sauvegarder / charger en `.json`, **exporter en PNG**.

### Presets

Dix décors générés aléatoirement, avec du relief : **chaque clic donne une nouvelle variante**
(décocher « Ajouter le décor » pour ne garder que le sol et les murs).

![Presets de carte](docs/images/presets.png)

### Relief

Chaque case a un **niveau de 0 à 8** (1 niveau ≈ 1,5 m), dessiné en plateaux et falaises. Les éléments et les figurines
montent avec le terrain. Une figurine peut aussi se tenir **sur** une caisse, une table ou un rocher : sa hauteur s'additionne.

<div align="center">

![Outil relief](docs/images/relief.png)

</div>

---

## 🧙 Les personnages

![Création de personnage](docs/images/personnages.png)

Une fiche contient l'identité (nom, **camp** joueur ou ennemi/PNJ, race, classe, niveau 1 à 20, figurine),
les caractéristiques, les valeurs de combat, la progression, l'équipement et des notes.
Quatre héros d'exemple sont créés au premier lancement : Aldric, Lyra, Brom et Ysolde.

### Caractéristiques

FOR, DEX, CON, INT, SAG, CHA, avec trois méthodes :

- **Répartition de 27 points** (valeurs de 8 à 15, compteur de points restants) ;
- **Tableau standard** 15, 14, 13, 12, 10, 8 ;
- **🎲 Lancer 4d6** en gardant les 3 meilleurs dés (le détail des jets est affiché).

Les valeurs sont réparties automatiquement selon la classe (la meilleure sur la caractéristique principale, encadrée),
puis ajustables avec − / +. Les bonus de race s'ajoutent.

### Races

| Race | Bonus | Déplacement |
| --- | --- | --- |
| Humain | +1 à tout | 6 cases (9 m) |
| Elfe | DEX +2, SAG +1 | 7 cases |
| Nain | CON +2, FOR +1 | 5 cases |
| Halfelin | DEX +2, CHA +1 | 5 cases |
| Demi-orc | FOR +2, CON +1 | 6 cases |
| Gnome | INT +2, CON +1 | 5 cases |
| Tieffelin | CHA +2, INT +1 | 6 cases |
| Drakéide | FOR +2, CHA +1 | 6 cases |

### Classes

| Classe | Dé de vie | Armure (CA) | Arme | Portée | Capacités |
| --- | --- | --- | --- | --- | --- |
| Guerrier | d10 | 18 (cotte de mailles + bouclier) | Épée longue 1d8 (FOR) | 1 | 💪 Second souffle |
| Barbare | d12 | 10 + DEX + CON | Hache à deux mains 1d12 (FOR) | 1 | 😡 Rage |
| Paladin | d10 | 18 | Marteau de guerre 1d8 (FOR) | 1 | 🙌 Imposition des mains, 🌟 Bénédiction |
| Rôdeur | d10 | 12 + DEX | Arc long 1d8 (DEX) | 8 | 🏹 Volée de flèches · escalade 2, nage |
| Voleur | d8 | 11 + DEX | Rapière 1d8 (DEX) | 1 | 🗡 Attaque sournoise · escalade 2 |
| Mage | d6 | 10 + DEX | Trait de feu 1d10 (sort) | 6 | ✨ Projectile magique, 🔥 Boule de feu |
| Clerc | d8 | 18 | Masse d'armes 1d6 (FOR) | 1 | 💚 Soins, 🗣 Mot de guérison, 🌟 Bénédiction |

### Valeurs de combat calculées

| Valeur | Calcul |
| --- | --- |
| Points de vie | dé de vie + mod. CON au niveau 1, puis (moitié du dé + 1 + mod. CON) par niveau |
| Maîtrise | +2 au niveau 1, +1 tous les 4 niveaux |
| Bonus de toucher | maîtrise + mod. de la caractéristique d'attaque |
| Dégâts | dé de l'arme + mod. (sans mod. pour un sort) |
| Initiative | mod. DEX |
| Déplacement, portée, escalade, nage, vol | selon la race et la classe |

Chaque valeur peut être **modifiée à la main** (bordure violette, valeur calculée rappelée) ; **↺ Recalculer** revient au calcul.

### Progression

![Progression](docs/images/progression.png)

- **XP** avec barre de progression vers le niveau suivant (table de D&D 5e : 300, 900, 2 700, 6 500... XP)
  et bouton **⬆ Passer niveau X** (les PV maximum augmentent) ;
- **PV actuels**, conservés d'un combat à l'autre ; **🛏 Repos long** les remet au maximum ;
- **pièces d'or** et **inventaire** ;
- pour une fiche **ennemi / PNJ**, le champ XP indique l'expérience rapportée quand il est vaincu.

Boutons : **➕ Placer sur la carte**, **↻ Mettre à jour les figurines sur la carte** (après une modification de la fiche),
**⧉ Dupliquer**, **🗑 Supprimer**, **💾 Exporter / 📂 Importer** les fiches.

---

## 🎲 Jouer un combat

![Onglet Jouer](docs/images/jouer.png)

### Placer les figurines

À gauche : **Mes personnages** (les fiches), puis les **personnages** et **monstres** de base. Choisis une figurine puis
clique sur la carte (**Maj+clic** pour en poser plusieurs). Glisser pour déplacer, clic droit pour retirer.

<div align="center">

![Figurines](docs/images/figurines.png)

</div>

Socle **bleu** pour les personnages, **rouge** pour les monstres. Au-dessus de chaque figurine : barre de PV, nom,
hauteur (`▲2`) et états. Quand une figurine est sélectionnée, les autres affichent leur hauteur relative
(`▲ +1` / `▼ −2`) et le panneau indique qui **domine** qui.

**Statistiques des figurines de base** (modifiables dans [le fichier de caractéristiques](#-le-fichier-de-caractéristiques)) :

| Figurine | Dépl. | Portée | PV | CA | Toucher | Dégâts | Init. | XP | Particularités |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guerrier | 5 | 1 | 28 | 18 | +5 | 1d8+3 | +1 | | |
| Mage | 5 | 6 | 16 | 12 | +5 | 1d10 | +2 | | |
| Rôdeuse | 6 | 8 | 24 | 15 | +6 | 1d8+3 | +3 | | escalade 2, nage |
| Clerc | 5 | 1 | 22 | 18 | +4 | 1d6+2 | +0 | | |
| Gobelin | 6 | 1 | 7 | 15 | +4 | 1d6+2 | +2 | 50 | |
| Squelette | 5 | 1 | 13 | 13 | +4 | 1d6+2 | +2 | 50 | |
| Slime | 3 | 1 | 22 | 8 | +3 | 1d6+1 | −2 | 100 | ne grimpe pas, nage |
| Orc | 6 | 1 | 15 | 13 | +5 | 1d12+3 | +1 | 100 | |
| Loup | 8 | 1 | 11 | 13 | +4 | 2d4+2 | +2 | 50 | nage |
| Dragon | 8 | 3 | 75 | 17 | +7 | 2d10+4 | +0 | 2 300 | 2×2 cases, vol, 🐉 souffle de feu |

### 🟩 Portées de déplacement et d'attaque

Sélectionne ou survole une figurine : **en vert** les cases où elle peut aller ce tour-ci, **en rouge** celles
qu'elle peut attaquer après s'être déplacée. Les ennemis à portée sont entourés de rouge et marqués **⚔**.

<div align="center">

![Portées](docs/images/portees.png)

</div>

Le calcul tient compte :

- des **diagonales** : une diagonale coûte 2 cases (tout droit puis à gauche ou à droite) ;
- du **relief** : monter **et** descendre coûtent 1 case de plus par niveau, et on ne grimpe que jusqu'à sa valeur d'**escalade** ;
- des **sols** : boue, neige, glace coûtent 2 cases ; l'eau est réservée aux nageurs ; lave et vide sont infranchissables ;
- des **obstacles** (arbres, murs, maisons, colonnes) et des **ennemis**, qui bloquent ; les alliés et les figurines KO se traversent ;
- pour l'attaque : **+1 case de portée à distance par niveau au-dessus de la cible**, corps à corps impossible si l'écart
  de hauteur dépasse 1 niveau, et **ligne de vue** pour les tirs (murs, maisons, arbres et colonnes la bloquent).

Le mode **Toutes** affiche les zones de toutes les figurines. Le déplacement part de la position en **début de tour**
(affichée en pointillés) ; le panneau indique les cases utilisées (« 3 / 5 cases »).

### Déroulement d'un combat

1. **Préparation** : place les figurines librement.
2. **⚔ Commencer le combat** : chaque figurine lance son **initiative** (d20 + bonus) ; l'ordre s'affiche dans le suivi.
3. La figurine active a un **anneau doré** et une flèche ; sa zone de déplacement repart de zéro.
4. **⏭ Fin du tour** (ou **Entrée**) passe à la suivante ; après la dernière, un nouveau **round** commence.
5. Fin : **🏁 Terminer** (XP et PV enregistrés), **↺ Recommencer** (positions de départ, PV pleins, nouvelle initiative)
   ou **⏹ Nouveau combat** (retour en préparation).

Une figurine ajoutée en cours de combat lance son initiative et prend sa place dans l'ordre.

### 💥 Attaques animées

Figurine sélectionnée → **⚔ Attaquer** (ou **A**) → clic sur la cible. Le viseur affiche la **chance de toucher**
et prévient si la cible est hors de portée ou sans ligne de vue.

<div align="center">

![Animations d'attaque](docs/images/attaques.gif)

</div>

Avec les **🎲 jets automatiques** (activés par défaut) : **d20 + toucher contre la CA**. Un 20 naturel est un
**critique** (dés de dégâts doublés), un 1 naturel rate toujours. Les dégâts s'appliquent à l'impact de l'animation,
le chiffre s'envole au-dessus de la cible ; une attaque ratée la fait **esquiver**.

| Figurine | Attaque | Animation |
| --- | --- | --- |
| Guerrier | Coup d'épée | Bond en avant, arc d'épée lumineux |
| Clerc | Masse sacrée | Onde dorée et rayons de lumière |
| Mage | Projectile magique | Orbe avec traînée, explosion |
| Rôdeuse | Flèche | Flèche en cloche, plantée dans la cible |
| Gobelin | Coups de dague | Deux estocades rapides |
| Squelette | Lame rouillée | Arc d'épée verdâtre |
| Orc | Coup de hache | Grand arc vertical, poussière, tremblement de l'écran |
| Loup | Morsure | Trois griffures rouges |
| Slime | Crachat d'acide | Boule verte, éclaboussures, flaque |
| Dragon | Souffle de feu | Flot de flammes, cible en feu, tremblement de l'écran |

### 🔮 Capacités et sorts

Les capacités de la classe apparaissent sous **⚔ Attaquer**, avec leurs **utilisations restantes pour ce combat**.

| Capacité | Effet | Utilisations |
| --- | --- | --- |
| 💪 Second souffle | Récupère 1d10 + niveau PV | 1 |
| 😡 Rage | +2 aux dégâts jusqu'à la fin du combat | 2 |
| 🙌 Imposition des mains | Soigne 5 × niveau PV à un allié au contact | 1 |
| 🏹 Volée de flèches | Zone de 3×3 cases à 8 cases, 1d8 + mod. | 1 |
| 🗡 Attaque sournoise | Attaque avec (niveau ÷ 2) d6 de dégâts en plus | 1 |
| ✨ Projectile magique | 3 traits qui touchent toujours, 1d4+1 chacun | 3 |
| 🔥 Boule de feu | Zone de 2 cases de rayon à 8 cases, (2 + niveau ÷ 2) d6 | 2 |
| 💚 Soins | Soigne 1d8 + mod. à un allié au contact | 2 |
| 🗣 Mot de guérison | Soigne 1d4 + mod. à un allié à 6 cases | 2 |
| 🌟 Bénédiction | Les alliés dans la zone gagnent +1d4 à leurs attaques | 1 |
| 🐉 Souffle de feu (dragon) | Zone de 2 cases de rayon, 6d6, DD 14 | 1 |

Les sorts de zone affichent un **gabarit** : portée du lanceur, zone, figurines touchées, et un avertissement
si des **alliés** sont dedans. Chaque cible fait un **jet de sauvegarde de DEX** contre le DD du lanceur
(8 + bonus de toucher) : moitié des dégâts si elle réussit.

<div align="center">

| Visée | Impact |
| --- | --- |
| ![Visée d'une boule de feu](docs/images/sorts-visee.png) | ![Explosion](docs/images/sorts-explosion.png) |

</div>

### 🧪 États

Cliquables dans le panneau de la figurine ; leurs icônes s'affichent au-dessus d'elle.

| État | Effet appliqué automatiquement |
| --- | --- |
| 🤢 Empoisonné | Désavantage à ses attaques |
| 💫 Étourdi | Passe son prochain tour, ne bouge pas ; on l'attaque avec avantage |
| ⛓️ Entravé | Ne bouge pas ; on l'attaque avec avantage |
| ⤵️ À terre | Désavantage à ses attaques ; avantage au contact contre lui, désavantage de loin |
| 🙈 Aveuglé | Désavantage à ses attaques ; on l'attaque avec avantage |
| 😱 Effrayé | Désavantage à ses attaques |
| 🔥 En feu | 1d6 dégâts au début de son tour |
| 👻 Invisible | Avantage à ses attaques ; désavantage contre lui |
| 🧠 Concentration | Rappel visuel (sort maintenu) |
| 🌟 Béni | +1d4 à ses jets d'attaque |
| 😡 Rage | +2 aux dégâts |

**Avantage / désavantage** : on lance 2d20 et on garde le meilleur ou le pire ; ils s'annulent. Le journal indique
les deux dés et la raison. Une figurine **cachée** qui attaque se révèle.

### 💀 Jets contre la mort

Un personnage à 0 PV tombe **inconscient** (couché, grisé) au lieu de mourir. Au début de chacun de ses tours,
il lance un d20 :

- **10 ou plus** : réussite ; **moins de 10** : échec ; **1** : deux échecs ; **20** : il se relève avec 1 PV ;
- **3 réussites** : stabilisé 🩹 ; **3 échecs** : mort ⚰ ;
- chaque coup reçu à terre est un échec (deux sur un critique), et une attaque **au contact** contre lui est un critique ;
- un soin le relève immédiatement.

Le suivi affiche ses jets (`✔✖✖`). Les monstres à 0 PV sont simplement hors de combat.

### 🤖 Monstres automatiques

**🤖 Jouer le tour de ce monstre** (ou l'option **Les monstres jouent seuls** pour enchaîner) fait agir le monstre actif :

1. s'il peut toucher **au moins deux ennemis sans allié** avec une capacité de zone (souffle du dragon), il l'utilise ;
2. sinon il choisit la meilleure case de sa zone verte d'où il peut attaquer, en visant les **cibles affaiblies**
   et en **gardant ses distances** s'il attaque de loin, puis attaque ;
3. si personne n'est à portée, il se rapproche de l'ennemi le plus proche.

![Tour automatique d'un monstre et jet contre la mort](docs/images/ia-monstres.png)

### 📊 Le panneau de suivi

<div align="center">

| Ordre d'initiative | Figurine sélectionnée | Dés, bilan, journal |
| --- | --- | --- |
| ![Suivi](docs/images/panneau-suivi.png) | ![Figurine](docs/images/panneau-figurine.png) | ![Journal](docs/images/panneau-des-journal.png) |

</div>

- **Suivi du combat** : ordre d'initiative, figurine active, PV, CA, états, jets contre la mort. Survoler une ligne
  donne les statistiques de la figurine.
- **Figurine sélectionnée** : PV (**💥 Dégâts**, **💚 Soin**, **❤️ PV au max**), CA, initiative, toucher, dégâts, états,
  **🙈 Cachée aux joueurs**, statistiques (infligés, subis, soignés, touches, KO), hauteur, déplacement utilisé,
  attaque, capacités, **↺ Retour au départ du tour**, hauteur relative face aux ennemis.
- **Lancer de dés** : formule libre (`2d6+3`, `1d8+1d6-1`), d4 à d100, d20 avec avantage ou désavantage.
- **Bilan** : dégâts infligés et subis, touches, KO par figurine.
- **Journal de combat** : initiative, jets détaillés, dégâts, sauvegardes, soins, états, KO, victoire ; **💾 Exporter (.txt)**.

### 🏁 Fin du combat et expérience

**🏁 Terminer** partage l'**XP des ennemis vaincus** entre les personnages, enregistre leurs **PV** (et leur mort
éventuelle) sur les fiches, et signale ceux qui peuvent **monter de niveau**. La **🏆 victoire** est annoncée quand
tous les ennemis sont hors de combat.

---

## 🎭 Outils du MJ

### 📺 Écran des joueurs et brouillard de guerre

**📺 Ouvrir l'écran des joueurs** ouvre une seconde fenêtre à placer sur la télé ou un 2ᵉ écran. Elle se met à jour
en direct (déplacements, PV, animations, dégâts, sons) et **ne montre que ce que les joueurs doivent voir**.

<div align="center">

| Vue du MJ | Écran des joueurs |
| --- | --- |
| ![Brouillard côté MJ](docs/images/brouillard-mj.png) | ![Écran des joueurs](docs/images/ecran-joueurs.png) |

</div>

| Outil | Détail |
| --- | --- |
| 🌫 **Brouillard de guerre** | Pinceau **🔦 Révéler / 🌫 Cacher** (clic droit = l'inverse), **Tout révéler / Tout cacher** |
| 👁 **Vision automatique** | Révèle ce que voient les personnages selon leur **vision** (en cases) et la **ligne de vue** |
| 🙈 **Figurines cachées** | Transparentes pour le MJ, invisibles pour les joueurs : idéal pour les embuscades |
| 📌 **Marqueurs secrets** | ⚠️ piège, 💰 trésor, 🚪 passage secret, 🔍 indice, ☠️ danger, 📝 note, avec un texte. MJ seulement |
| 👁 **Voir comme les joueurs** | Aperçu, dans la fenêtre du MJ, de l'écran des joueurs |

Côté joueurs : brouillard opaque, rien de ce qui s'y trouve n'est dessiné, figurines cachées invisibles, PV des monstres,
zones de portée et marqueurs masqués, et un bandeau « lieu · round · tour de... ». On y déplace et zoome la vue ; **F** recentre.

### 📜 Onglet Outils MJ

![Outils du MJ](docs/images/outils-mj.png)

| Générateur | Résultat |
| --- | --- |
| ⚔ **Rencontre aléatoire** | Monstres équilibrés selon le nombre et le niveau des personnages (seuils d'XP du Guide du maître, multiplicateur selon le nombre de monstres) et le terrain (proposé selon le lieu de la carte). **➕ Poser sur la carte de combat** les place loin du groupe, **cachés** si on veut une embuscade |
| 🧑 **PNJ** | Nom, race, métier, signe distinctif, caractère, motivation et secret ; **📜 Créer sa fiche** |
| 💰 **Trésor** | Or et objets selon le niveau ; **➗ Partager l'or** entre les fiches des personnages |
| 📜 **Quête** | Commanditaire, objectif, lieu de ton monde, complication, récompense |
| 🗣 **Rumeur** | Vraie ou fausse (indiqué au MJ seulement) |
| 🍺 **Taverne** | Nom, tenancier, spécialité, prix, rumeur entendue |
| 🌦 **Météo** | Selon le climat et la saison, avec ses effets en jeu |

Chaque résultat va dans l'**historique** (📋 copier, 📝 ajouter aux notes). Le panneau de droite contient les
**notes de session** (🕒 horodatage avec le jour du monde, export `.txt`) et un **aide-mémoire** : degrés de difficulté,
actions en combat, abri, avantage, états, rythme de voyage, repos.

![Rencontre posée sur la carte](docs/images/rencontre.png)

---

## 🔊 Sons

Effets synthétisés par le navigateur (aucun fichier audio) : coups, critiques, ratés, sorts, soins, flèches,
bénédiction, dés, début de tour, KO, mort, victoire, montée de niveau. Ils sont aussi joués sur l'écran des joueurs.
Bouton **🔊** en haut à droite pour les couper. Le navigateur n'active le son qu'après un premier clic dans la page.

---

## 📄 Le fichier de caractéristiques

`data/caracteristiques.txt` est un fichier texte commenté qui contient les **règles de déplacement** et les
**statistiques des figurines de base**. Le nom entre crochets est celui affiché dans l'appli.

```ini
[regles]
deplacement_diagonal = non   # non : une diagonale coûte 2 cases
attaque_diagonale    = oui   # une case en diagonale est à 1 case de portée
cout_montee          = 1     # +1 case par niveau monté
cout_descente        = 1     # +1 case par niveau descendu
bonus_portee_hauteur = 1     # +1 case de portée à distance par niveau au-dessus de la cible
melee_hauteur_max    = 1     # corps à corps impossible au-delà de cet écart de hauteur
ligne_de_vue         = oui   # tirs bloqués par murs, maisons, arbres, colonnes

[terrain]
boue = 2        # coût en cases ; sol non listé = 1
eau  = 2        # seulement pour les nageurs
lave = x        # x = infranchissable
mur  = x        # éléments aussi : arbre, mur, maison, colonne...

[Rôdeuse]
deplacement = 6
attaque     = 8      # portée en cases (1 = corps à corps)
saut        = 2      # niveaux d'escalade
vol         = non
nage        = oui
pv          = 24
ca          = 15
toucher     = +6
degats      = 1d8+3
init        = +3
xp          = 0      # XP gagnée par le groupe quand la figurine est vaincue
```

| Clé | Rôle |
| --- | --- |
| `deplacement` | Cases par tour |
| `attaque` | Portée d'attaque en cases (1 = corps à corps) |
| `saut` | Niveaux qu'on peut escalader d'une case à l'autre |
| `vol` / `nage` | `oui` / `non` |
| `pv`, `ca`, `toucher`, `degats`, `init` | Statistiques de combat |
| `xp` | Expérience rapportée par un monstre vaincu |

**Charger le fichier modifié** :

- appli ouverte en **double-cliquant** : le navigateur interdit de lire un fichier tout seul ; onglet **Jouer** →
  **📄 Charger un .txt** (les valeurs sont mémorisées ; **↺ Défaut** pour revenir aux valeurs d'origine) ;
- appli servie par un **serveur local** : le fichier est lu automatiquement au démarrage.

Les fiches de l'onglet Personnages ont leurs propres valeurs, et les champs **Dépl.** et **Portée** du panneau
modifient une seule figurine.

---

## 💾 Sauvegardes et fichiers

Tout est enregistré **automatiquement dans le navigateur** (stockage local). Pour garder une copie ou changer d'ordinateur :

| Fichier | Contenu | Où |
| --- | --- | --- |
| **Campagne** `.json` | Monde, lieux et leurs cartes de combat, fiches, carte en cours, caractéristiques | 🌍 Monde → 💾 Exporter / 📂 Importer |
| Carte `.json` | Une carte de combat (avec figurines, brouillard, marqueurs) | 🛠 Éditeur → Sauvegarder / Charger |
| Carte `.png` | Image de la carte | 🛠 Éditeur → Exporter PNG |
| Personnages `.json` | Toutes les fiches | 🧙 Personnages → Exporter / Importer |
| Journal `.txt` | Journal de combat | 🎲 Jouer → Exporter |
| Notes `.txt` | Notes de session | 📜 Outils MJ → Exporter |
| Caractéristiques `.txt` | Règles et figurines de base | `data/caracteristiques.txt` |

> ⚠️ Le stockage du navigateur est limité (environ 5 Mo) : exporte la campagne régulièrement.
> Une alerte prévient s'il est plein.

---

## ⌨️ Raccourcis

**Éditeur et Jouer** : molette = zoom · glisser avec le clic molette (ou **Espace** + glisser) = déplacer la vue · **Ctrl+Z** = annuler.

| 🛠 Éditeur | | 🎲 Jouer | |
| --- | --- | --- | --- |
| Clic gauche | Poser / peindre | Glisser | Déplacer une figurine |
| Clic droit | Supprimer | Clic droit | Retirer une figurine |
| **R** | Pivoter l'élément | **A** | Attaquer |
| **Ctrl+D** | Dupliquer | **Entrée** / **N** | Fin du tour |
| **Suppr** | Effacer l'élément | **Suppr** | Retirer la figurine |
| Flèches | Déplacer d'une case | Flèches | Déplacer d'une case |
| **Échap** | Outil Sélection | **Échap** | Annuler le ciblage ou l'outil en cours |

| 🌍 Monde | | 📺 Écran des joueurs | |
| --- | --- | --- | --- |
| Clic | Sélectionner | Glisser | Déplacer la vue |
| **Maj+clic** | Ajouter au groupe | Molette | Zoom |
| Clic droit | Voyager | **F** | Recentrer |
| **Suppr** | Supprimer le lieu sélectionné | | |
| **Échap** | Désélectionner | | |

---

## ❓ Questions fréquentes

<details>
<summary><b>J'ai modifié <code>data/caracteristiques.txt</code> mais rien ne change.</b></summary>

En ouvrant `index.html` par double-clic, le navigateur interdit de lire le fichier. Utilise **📄 Charger un .txt**
(onglet Jouer), ou ouvre l'appli via un serveur local (Live Server, `python -m http.server`).
</details>

<details>
<summary><b>L'écran des joueurs ne s'ouvre pas.</b></summary>

Le navigateur a bloqué la fenêtre : autorise les pop-ups pour cette page (icône dans la barre d'adresse).
</details>

<details>
<summary><b>L'écran des joueurs ne se met pas à jour.</b></summary>

Il se synchronise par le stockage du navigateur. Ouvre les deux fenêtres dans le **même navigateur** ; si besoin,
sers l'appli avec un serveur local, ce qui rend la synchronisation plus fiable.
</details>

<details>
<summary><b>Je n'entends aucun son.</b></summary>

Vérifie le bouton **🔊** en haut à droite, et clique une fois dans la page : le navigateur n'active le son qu'après
une interaction. Sur l'écran des joueurs, clique aussi une fois dans la fenêtre.
</details>

<details>
<summary><b>Comment changer de monde sans perdre mes personnages ?</b></summary>

**🎲 Nouveau monde** (onglet Monde) remplace les lieux et le journal de voyage mais **garde les fiches**.
Exporte la campagne avant si tu veux pouvoir revenir à l'ancien monde.
</details>

<details>
<summary><b>Une figurine posée ne reflète pas les changements de sa fiche.</b></summary>

Une figurine garde une copie des valeurs de sa fiche. Clique **↻ Mettre à jour les figurines sur la carte** dans la fiche.
</details>

<details>
<summary><b>Le jeu suit-il exactement les règles de D&D ?</b></summary>

Il s'en inspire fortement (caractéristiques, classes, avantage, jets contre la mort, table d'XP...) avec des simplifications
pour rester rapide à jouer : les capacités ont des utilisations par combat, les sauvegardes de zone utilisent le bonus
d'initiative, la ligne de vue est calculée case par case. Tout reste modifiable à la main par le MJ.
</details>

---

## 🧩 Pour aller plus loin (code)

L'appli est en **HTML / CSS / JavaScript sans dépendance**, en scripts classiques (pas de modules) pour fonctionner
en double-cliquant le fichier. Les scripts sont chargés dans cet ordre par `index.html` :

```text
index.html                 Page, onglets et panneaux
css/style.css              Styles
data/caracteristiques.txt  Règles de déplacement et statistiques des figurines de base
docs/images/               Images de ce README

js/config.js     Sols (FLOORS) et éléments (OBJECTS)
js/utils.js      Couleurs, bruit, aléatoire
js/state.js      État global (carte, caméra, mode, outil, sélection), format des cartes
js/terrain.js    Relief : niveaux des cases, hauteur des éléments et des figurines
js/sprites.js    Personnages et monstres en pixel art (16×16)
js/stats.js      Lecture du fichier de caractéristiques (copie intégrée)
js/ranges.js     Zones de déplacement et d'attaque, ligne de vue
js/anims.js      Animations d'attaque et de zone, chiffres qui s'envolent
js/rules.js      Règles : caractéristiques, races, classes, états, dés, table d'XP
js/render.js     Rendu de la carte en 2D semi-3D
js/editor.js     Ajout / suppression, pinceau, annulation
js/presets.js    Presets de carte générés
js/play.js       Onglet Jouer : figurines, rendu, souris, panneau de la figurine
js/combat.js     Initiative, PV, attaques, états, jets contre la mort, journal, dés
js/chars.js      Onglet Personnages : fiches et progression
js/fog.js        Brouillard de guerre, marqueurs secrets, écran des joueurs
js/sfx.js        Effets sonores synthétisés
js/actions.js    Capacités et sorts, ciblage, monstres automatiques
js/gmtools.js    Onglet Outils MJ : générateurs, notes, aide-mémoire
js/worldgen.js   Génération du monde : relief, rivières, climat, biomes, royaumes, lieux
js/world.js      Onglet Monde : affichage, voyages, lieux, cartes liées, campagne
js/input.js      Souris et clavier (éditeur)
js/ui.js         Panneaux, palettes, réglages de carte
js/io.js         Sauvegarde, chargement, export PNG
js/main.js       Démarrage
```

| Ajouter... | Où |
| --- | --- |
| Un sol | `FLOORS` (`js/config.js`) |
| Un élément | `OBJECTS` (`js/config.js`) et, si nouvelle forme, un `case` dans `drawObj` (`js/render.js`) |
| Une figurine | `SPRITES` (`js/sprites.js`, dessin 16×16, une lettre par couleur), sa section dans `data/caracteristiques.txt`, son animation dans `ATTACKS` (`js/anims.js`) |
| Une race / une classe | `RACES` / `CLASSES` (`js/rules.js`) ; capacités de la classe dans `CLASS_ACTIONS` (`js/actions.js`) |
| Une capacité / un sort | `ACTIONS` (`js/actions.js`) |
| Un état | `CONDITIONS` (`js/rules.js`) ; son effet dans `attackMods` (`js/combat.js`) |
| Un preset | `PRESETS` (`js/presets.js`) avec une fonction `gen(g, deco)` |
| Un type de lieu | `LOC_TYPES` (`js/worldgen.js`) et son preset de combat dans `LOC_PRESET` (`js/world.js`) |
| Un biome | `BIOMES` (`js/worldgen.js`) avec sa couleur et son coût de voyage |
| Un générateur du MJ | `js/gmtools.js` (carte dans `buildGmTab`) |
| Une règle de déplacement | Section `[regles]` de `data/caracteristiques.txt`, lue dans `js/ranges.js` |

---

<div align="center">

*Fait pour les maîtres du jeu qui veulent passer moins de temps à préparer et plus de temps à raconter.* 🐉

</div>
