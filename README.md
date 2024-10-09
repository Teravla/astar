
# OpenStra
<span style="color: gray; font-style: italic;">v1.0.0</span>


Ce projet est une application de cartographie interactive qui utilise **l'API Overpass** pour récupérer des données de cartographie et implémente l'algorithme de **Dijkstra** pour calculer le chemin le plus court entre deux points sur une carte centrée sur *Genté, FR*. L'application permet aux utilisateurs de cliquer sur la carte pour sélectionner des points de départ et d'arrivée, puis de visualiser le chemin le plus court entre ces deux points.

---

## Table des Matières
- [Fonctionnalités](#fonctionnalités)
- [Technologies Utilisées](#technologies-utilisées)
- [Configuration du Projet](#configuration-du-projet)
- [Utilisation](#utilisation)
- [Contribuer](#contribuer)
- [Licence](#licence)

---

## Fonctionnalités
- **Visualisation de Carte** : Affiche une carte interactive avec OpenStreetMap.
- **Sélection de Points** : Permet aux utilisateurs de sélectionner des points de départ et d'arrivée en cliquant sur la carte.
- **Calcul de Chemin** : Utilise l'algorithme de Dijkstra pour calculer et afficher le chemin le plus court entre deux points.
- **Données en Temps Réel** : Récupère les données de routes et de nœuds via l'API Overpass.
- **Affichage des Nœuds et Segments** : Affiche les nœuds et segments des routes sur la carte.

## Technologies Utilisées
- [Leaflet](https://leafletjs.com/) : Bibliothèque JavaScript pour les cartes interactives.
- [OpenStreetMap](https://www.openstreetmap.org/) : Source de données géographiques.
- [Overpass API](https://overpass-api.de/) : API pour interroger les données OpenStreetMap.
- [JavaScript](https://www.javascript.com/) : Langage de programmation utilisé pour le développement.

## Configuration du Projet
1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/Teravla/astar.git
   cd astar
   npm i
   node ./server.js
   ```

2. **Ouvrir le fichier HTML** : 
   Ouvrez [localhost:5478](localhost:5478) et porofitez :)

3. **Dépendances** :
   Aucune dépendance supplémentaire n'est requise, mais assurez-vous que vous avez accès à Internet pour charger les bibliothèques Leaflet et les données de l'API Overpass.

## Utilisation
- **Sélectionner le Point de Départ** : Cliquez sur la carte pour définir le point de départ.
- **Sélectionner le Point d'Arrivée** : Cliquez à nouveau sur la carte pour définir le point d'arrivée.
- **Visualiser le Chemin** : L'application affichera le chemin le plus court entre les deux points sélectionnés.


## Contribuer
Les contributions sont les bienvenues ! Veuillez suivre ces étapes :
1. Fork ce dépôt.
2. Créez votre branche (`git checkout -b feature/{username}-{feature}`).
3. Commitez vos modifications (`git commit -m 'Ajout d\'une nouvelle fonctionnalité'`).
4. Poussez vers la branche (`git push origin feature/{username}-{feature}`).
5. Ouvrez une Pull Request.

---

## Licence
Ce projet est sous la licence CC BY-SA 4.0. Consulter [https://creativecommons.org/licenses/by-sa/4.0/](https://creativecommons.org/licenses/by-sa/4.0/) pour en savoir plus.

---
