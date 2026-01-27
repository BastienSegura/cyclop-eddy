# Manifeste du Projet : Cyclop Eddy - Visualisation des Connaissances

## 1. La Vision

Ce projet vise à transformer une liste linéaire et aride de concepts informatiques en une **constellation navigable et organique**. L'objectif n'est pas seulement de définir des termes, mais de révéler les liens invisibles qui les unissent, permettant à l'utilisateur de "voyager" de concept en concept par proximité sémantique.

## 2. Philosophie de Développement : Le Kaizen

Nous rejetons la complexité monolithique. Ce projet se construit brique par brique.

* **Petits pas :** Chaque fonctionnalité est atomique (User Stories granulaires).
* **Validation immédiate :** Chaque étape doit produire un résultat tangible (un fichier texte, un log console, un point sur un écran) avant de passer à la suivante.
* **Pragmatisme :** On ne réinvente pas la roue (utilisation de Wikipédia, `sentence-transformers`, GitHub Pages).

## 3. Architecture Technique : "Static Intelligence"

Nous adoptons une architecture asymétrique pour garantir la performance web.

### A. Le "Cerveau" (Backend / Python) - *Offline*

L'intelligence lourde ne tourne pas dans le navigateur de l'utilisateur. Elle est pré-calculée.

* **Rôle :** Extraction, nettoyage et calcul mathématique.
* **Mécanique :** Scraping de Wikipédia -> NLP (Embeddings) -> Calcul de similarité (Cosinus).
* **Livrable :** Un artefact statique unique et optimisé (`graph_data.json`).

### B. Le "Visage" (Frontend / JS) - *Online*

Le client est léger, rapide et agnostique.

* **Rôle :** Rendu graphique et interaction.
* **Mécanique :** Pas de base de données, pas d'API serveur complexe. Le navigateur charge le JSON et dessine la constellation.
* **Expérience :** Fluidité maximale, hébergement gratuit (Static Hosting).

## 4. Les Piliers Fonctionnels

### Le Mining (La Récolte)

La vérité se trouve dans les données brutes. Nous constituons un corpus "propre" en filtrant le bruit (pages techniques Wikipédia) et en enrichissant les données avec les standards de l'industrie (TIOBE, GitHub).

### La Vectorisation (Le Sens)

Le lien entre deux concepts n'est pas manuel, il est mathématique. Nous transformons les mots en vecteurs pour laisser les mathématiques décider que "Python" est proche de "Django" mais loin de "Microprocesseur".

### La Navigation (Le Voyage)

L'interface est une invitation à la sérendipité. L'utilisateur entre par un mot-clé (Recherche) mais reste pour le voyage (Navigation de nœud en nœud). L'interface s'efface au profit du graphe.

## 5. Feuille de Route Macro

1. **Extraction :** Obtenir la matière première (`concepts_list.txt`).
2. **Enrichissement :** Associer définitions et vecteurs (`raw_data.json`).
3. **Topologie :** Calculer le graphe des voisins (`graph_data.json`).
4. **Squelette Web :** Afficher les données brutes dans le navigateur.
5. **Constellation :** Remplacer le texte par des nœuds et des liens graphiques.
6. **Interaction :** Ajouter la recherche, le zoom et le détail au clic.
