#!/usr/bin/env python3
"""
US-001 : Récupération des titres de pages de la catégorie Computer science.
Objectif : Constituer le corpus de base pour Cyclop Eddy.
"""

import requests
import sys

# Configuration
WIKI_API_URL = "https://en.wikipedia.org/w/api.php"
TARGET_CATEGORY = "Category:Computer science"
OUTPUT_FILE = "concepts.txt"
USER_AGENT = "CyclopEddy/1.0 (Educational Project; +https://github.com/BastienSegura/cyclop-eddy)"
MAX_DEPTH = 2  # Profondeur de recherche dans les sous-catégories

def fetch_category_titles(root_category: str, max_depth: int = MAX_DEPTH) -> list[str]:
    """
    Récupère les titres de pages en parcourant récursivement les sous-catégories.
    Utilise une approche itérative (BFS) pour explorer l'arbre des catégories.
    """
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    collected_titles = set()
    visited_categories = set()
    # File d'attente : (nom_categorie, profondeur_actuelle)
    queue = [(root_category, 0)]

    print(f"🚀 Démarrage de l'extraction pour : {root_category} (Profondeur max: {max_depth})")

    while queue:
        current_cat, depth = queue.pop(0)
        
        if current_cat in visited_categories:
            continue
        visited_categories.add(current_cat)

        # Paramètres pour l'API
        params = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": current_cat,
            "cmtype": "page|subcat", # On récupère pages ET sous-catégories
            "cmlimit": 500,
            "format": "json"
        }

        print(f"   📂 Exploration niveau {depth}: {current_cat}")

        while True:
            try:
                response = session.get(WIKI_API_URL, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()

                members = data.get("query", {}).get("categorymembers", [])
                
                for member in members:
                    title = member["title"]
                    ns = member["ns"]

                    # Namespace 0 = Page
                    if ns == 0:
                        collected_titles.add(title)
                    
                    # Namespace 14 = Catégorie
                    elif ns == 14 and depth < max_depth:
                        if title not in visited_categories:
                            queue.append((title, depth + 1))

                # Gestion de la pagination (s'il y a plus de résultats)
                if "continue" in data:
                    params["cmcontinue"] = data["continue"]["cmcontinue"]
                else:
                    break

            except requests.RequestException as e:
                print(f"❌ Erreur réseau sur {current_cat} : {e}", file=sys.stderr)
                break

    return sorted(list(collected_titles))

if __name__ == "__main__":
    pages = fetch_category_titles(TARGET_CATEGORY)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(pages))
    
    print(f"✅ Terminé ! {len(pages)} titres sauvegardés dans '{OUTPUT_FILE}'.")