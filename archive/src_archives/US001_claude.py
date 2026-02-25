#!/usr/bin/env python3
"""
US001 - Script de récupération des titres de pages Wikipédia
Catégorie : Informatique

Ce script utilise l'API MediaWiki pour récupérer la liste de tous les titres
de pages appartenant à la catégorie "Informatique" sur Wikipédia francophone.

- Utilise l'API officielle MediaWiki avec les en-têtes User-Agent requis
- Gère la pagination automatique pour récupérer toutes les pages
- Sauvegarde les résultats dans `concepts_list.txt`
- Affiche la progression et un échantillon des résultats

"""

import requests
import json
from typing import Generator

# Configuration de l'API Wikipédia
WIKIPEDIA_API_URL = "https://fr.wikipedia.org/w/api.php"
CATEGORY_NAME = "Catégorie:Informatique"
OUTPUT_FILE = "concepts_list.txt"

# En-têtes HTTP requis par l'API Wikipédia
HEADERS = {
    "User-Agent": "CyclopEddy/1.0 (https://github.com/BastienSegura/cyclop-eddy; educational project)",
    "Accept": "application/json"
}


def fetch_category_members(
    category: str,
    cmtype: str = "page|subcat",
    cmlimit: int = 500
) -> Generator[dict, None, None]:
    """
    Générateur qui récupère les membres d'une catégorie Wikipédia.
    
    Args:
        category: Nom de la catégorie (avec le préfixe "Catégorie:")
        cmtype: Type de membres à récupérer (page, subcat, file)
        cmlimit: Nombre maximum de résultats par requête (max 500)
    
    Yields:
        Dictionnaires contenant les informations de chaque page
    """
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": category,
        "cmtype": cmtype,
        "cmlimit": cmlimit,
        "format": "json"
    }
    
    while True:
        response = requests.get(WIKIPEDIA_API_URL, params=params, headers=HEADERS, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Récupérer les membres de la catégorie
        members = data.get("query", {}).get("categorymembers", [])
        for member in members:
            yield member
        
        # Vérifier s'il y a une suite (pagination)
        if "continue" in data:
            params["cmcontinue"] = data["continue"]["cmcontinue"]
        else:
            break


def get_category_page_titles(category: str, pages_only: bool = True) -> list[str]:
    """
    Récupère tous les titres de pages d'une catégorie.
    
    Args:
        category: Nom de la catégorie
        pages_only: Si True, récupère uniquement les pages (pas les sous-catégories)
    
    Returns:
        Liste des titres de pages
    """
    cmtype = "page" if pages_only else "page|subcat"
    titles = []
    
    print(f"Récupération des pages de la catégorie '{category}'...")
    
    for member in fetch_category_members(category, cmtype=cmtype):
        title = member.get("title", "")
        titles.append(title)
        
        # Affichage de la progression
        if len(titles) % 100 == 0:
            print(f"  {len(titles)} titres récupérés...")
    
    return titles


def save_titles_to_file(titles: list[str], filepath: str) -> None:
    """
    Sauvegarde la liste des titres dans un fichier texte.
    
    Args:
        titles: Liste des titres à sauvegarder
        filepath: Chemin du fichier de sortie
    """
    with open(filepath, "w", encoding="utf-8") as f:
        for title in titles:
            f.write(f"{title}\n")
    
    print(f"Fichier sauvegardé : {filepath} ({len(titles)} titres)")


def main():
    """Fonction principale."""
    print("=" * 60)
    print("US001 - Extraction des titres Wikipédia")
    print(f"Catégorie cible : {CATEGORY_NAME}")
    print("=" * 60)
    
    # Récupération des titres
    titles = get_category_page_titles(CATEGORY_NAME, pages_only=True)
    
    print(f"\nTotal : {len(titles)} pages trouvées")
    
    # Sauvegarde dans un fichier
    save_titles_to_file(titles, OUTPUT_FILE)
    
    # Affichage d'un échantillon
    print("\nÉchantillon des 10 premiers titres :")
    for i, title in enumerate(titles[:10], 1):
        print(f"  {i}. {title}")
    
    return titles


if __name__ == "__main__":
    main()
