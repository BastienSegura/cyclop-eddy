### MODULE 1 : La Récolte de Données (Data Mining)

*Le but : Obtenir une liste brute de concepts informatiques propres.*

**Epic 1.1 : Constitution du corpus de base**

1. **US-001 :** En tant que dev, je veux un script Python capable de récupérer une liste de tous les titres de pages de la catégorie "Informatique" sur Wikipédia.
2. **US-002 :** En tant que dev, je veux filtrer cette liste pour retirer les pages "techniques" de Wikipédia (ex: "Modèle:...", "Catégorie:...", "Discussion:...").
3. **US-003 :** En tant que dev, je veux enrichir ma liste avec les 100 langages de programmation les plus populaires (via une liste GitHub ou TIOBE).
4. **US-004 :** En tant que dev, je veux nettoyer les doublons et les caractères spéciaux bizarres des titres récupérés.
5. **US-005 :** En tant que dev, je veux stocker cette liste "propre" dans un fichier `concepts_list.txt` (un concept par ligne).

**Epic 1.2 : Récupération des définitions**
6.  **US-006 :** En tant que dev, je veux un script qui interroge l'API Wikipédia pour récupérer le résumé (abstract) du premier concept de ma liste.
7.  **US-007 :** En tant que dev, je veux implémenter une boucle pour faire ça sur toute la liste, avec un délai (ex: 0.5s) pour ne pas me faire bannir par l'API Wikipédia.
8.  **US-008 :** En tant que dev, je veux nettoyer le texte des résumés (retirer les balises HTML, les références `[1]`, `[2]`).
9.  **US-009 :** En tant que dev, je veux gérer les erreurs (si une page n'existe plus ou pas de résumé) sans que le script ne plante.
10. **US-010 :** En tant que dev, je veux sauvegarder le tout dans un fichier `raw_data.json` structuré `{ "concept": "définition" }`.

---

### MODULE 2 : L'Intelligence du Graphe (Embeddings)

*Le but : Créer les liens mathématiques entre les concepts sur ton PC.*

**Epic 2.1 : Vectorisation**
11. **US-011 :** En tant que dev, je veux installer et charger un modèle léger (ex: `all-MiniLM-L6-v2`) via la librairie `sentence-transformers`.
12. **US-012 :** En tant que dev, je veux transformer le mot "Python" en un vecteur (une liste de chiffres) et l'afficher dans ma console pour vérifier que ça marche.
13. **US-013 :** En tant que dev, je veux générer les vecteurs pour l'ensemble de mes concepts présents dans `raw_data.json`.

**Epic 2.2 : Calcul des voisins (Le graphe)**
14. **US-014 :** En tant que dev, je veux calculer la "similitude cosinus" entre deux vecteurs pour obtenir un score de proximité (entre 0 et 1).
15. **US-015 :** En tant que dev, je veux, pour un concept donné, trouver les 10 concepts ayant le score de proximité le plus élevé.
16. **US-016 :** En tant que dev, je veux exclure le concept lui-même de sa liste de voisins (le voisin n°1 de "Java" est "Java", il faut le retirer).
17. **US-017 :** En tant que dev, je veux filtrer les voisins qui ont un score trop bas (ex: inférieur à 0.4) pour éviter les liens non pertinents.

**Epic 2.3 : Exportation**
18. **US-018 :** En tant que dev, je veux générer le fichier final `graph_data.json` qui contient pour chaque clé : la définition + la liste des 10 voisins (ID).
19. **US-019 :** En tant que dev, je veux minifier ce JSON pour qu'il soit le plus léger possible à charger sur le web.

---

### MODULE 3 : Le Squelette Web (Frontend)

*Le but : Avoir une page blanche qui charge tes données.*

**Epic 3.1 : Mise en place**
20. **US-020 :** En tant que dev, je veux initialiser un projet vide (HTML/CSS/JS standard ou via Vite.js).
21. **US-021 :** En tant que dev, je veux placer mon fichier `graph_data.json` dans le dossier public.
22. **US-022 :** En tant que dev, je veux écrire une fonction JS `loadData()` qui récupère le fichier JSON au chargement de la page.
23. **US-023 :** En tant que dev, je veux afficher "Chargement des connaissances..." pendant que le fichier JSON est téléchargé.
24. **US-024 :** En tant que dev, je veux vérifier dans la console du navigateur que le JSON est bien chargé et accessible en mémoire.

---

### MODULE 4 : La Constellation (Visualisation)

*Le but : Dessiner les points et les lignes.*

**Epic 4.1 : Le moteur graphique (ex: avec D3.js ou Vis.js)**
25. **US-025 :** En tant que dev, je veux installer/importer la librairie de visualisation choisie.
26. **US-026 :** En tant que dev, je veux définir une zone de dessin (Canvas ou SVG) qui prend 100% de l'écran.
27. **US-027 :** En tant que dev, je veux créer une fonction `renderConcept(conceptName)` qui prépare les données pour UN concept et ses 10 voisins (le "mini-graphe").

**Epic 4.2 : Le Rendu visuel**
28. **US-028 :** En tant qu'utilisateur, je veux voir un point central (le concept choisi) au milieu de l'écran.
29. **US-029 :** En tant qu'utilisateur, je veux voir 10 points satellites autour du point central.
30. **US-030 :** En tant qu'utilisateur, je veux voir des lignes relier le point central à ses satellites.
31. **US-031 :** En tant qu'utilisateur, je veux voir le nom des concepts écrit à côté de chaque point.
32. **US-032 :** En tant qu'utilisateur, je veux que les points ne se chevauchent pas (système de forces/répulsion physique).

---

### MODULE 5 : L'Expérience Utilisateur (Interaction)

*Le but : Rendre l'application utilisable et navigable.*

**Epic 5.1 : La Recherche initiale**
33. **US-033 :** En tant qu'utilisateur, je veux voir une barre de recherche au centre de l'écran si aucun concept n'est sélectionné.
34. **US-034 :** En tant qu'utilisateur, quand je tape des lettres, je veux voir des suggestions (autocomplétion) basées sur les clés de ton JSON.
35. **US-035 :** En tant qu'utilisateur, quand je valide un terme, la barre de recherche disparaît (ou se déplace) et la constellation apparaît.

**Epic 5.2 : La Navigation (Le "Voyage")**
36. **US-036 :** En tant qu'utilisateur, quand je survole un point (node), il doit grossir ou changer de couleur (feedback).
37. **US-037 :** En tant qu'utilisateur, quand je clique sur un point satellite, il devient le nouveau point central.
38. **US-038 :** En tant qu'utilisateur, je veux voir une animation fluide lors de la transition entre l'ancien centre et le nouveau centre.

**Epic 5.3 : L'Information (La Définition)**
39. **US-039 :** En tant qu'utilisateur, je veux voir un panneau latéral (ou une modale) qui affiche la définition du concept central actuel.
40. **US-040 :** En tant qu'utilisateur, je veux pouvoir fermer ou masquer ce panneau pour mieux voir le graphe.

---

### MODULE 6 : Finitions & Mise en ligne

*Le but : Partager ton œuvre.*

41. **US-041 :** En tant qu'utilisateur mobile, je veux que la taille des textes et des points soit adaptée à mon petit écran.
42. **US-042 :** En tant qu'utilisateur, je veux un bouton "Au hasard" pour découvrir un concept aléatoire.
43. **US-043 :** En tant que dev, je veux héberger mon site statique (HTML + JS + JSON) sur GitHub Pages ou Vercel.