#!/usr/bin/env python3
"""
US-002 : Nettoyage du corpus de concepts.
Objectif : Filtrer les pages qui ne sont pas des concepts informatiques purs 
(événements datés, listes, pages de maintenance, etc.).
"""
import os
import re

# Configuration des chemins
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(BASE_DIR, "../../data/concepts.txt")
OUTPUT_FILE = os.path.join(BASE_DIR, "../../data/concepts_filtered.txt")

def is_concept(title):
    """
    Retourne True si le titre semble être un concept informatique valide,
    False si c'est un événement, une liste, ou une page méta.
    """
    # 1. Filtres de préfixes (Listes, Méta-wiki, etc.)
    prefixes_to_exclude = (
        "List of", "Timeline of", "Comparison of", "Index of", "Outline of",
        "Glossary of", "Bibliography of", "Category:", "Template:", "Wikipedia:",
        "Help:", "Portal:", "Draft:", "User:", "File:", "MediaWiki:", "Module:",
        "Gadget:", "Topic:", "Book:", "Special:"
    )
    if title.startswith(prefixes_to_exclude):
        return False

    # 2. Filtres d'événements datés (ex: "2020 Twitter account hijacking")
    # On cible les années 19xx et 20xx suivies d'un espace.
    # Cela évite de supprimer "10 Gigabit Ethernet" ou "3D printing" qui commencent par un chiffre.
    if re.match(r'^(19|20)\d{2}\s', title):
        return False

    # 3. Filtres sémantiques basés sur des mots-clés
    title_lower = title.lower()
    
    # Articles historiques, critiques ou controverses
    if title.startswith(("History of", "Criticism of", "Controversy", "Impact of")):
        return False
        
    # Articles géographiques (ex: "Internet in Andorra")
    if title_lower.startswith("internet in "):
        return False
        
    # Articles de fiction/culture pop (ex: "Artificial intelligence in fiction")
    if title_lower.endswith((" in fiction", " in popular culture")):
        return False

    return True

def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Erreur : Le fichier d'entrée {INPUT_FILE} n'existe pas.")
        return

    print(f"Lecture de {INPUT_FILE}...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    # Application du filtrage
    concepts = [line for line in lines if is_concept(line)]
    
    # Tri alphabétique insensible à la casse pour une liste propre
    concepts.sort(key=str.casefold)

    # Sauvegarde du résultat
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(concepts))

    print(f"✅ Nettoyage terminé !")
    print(f"   - Entrée : {len(lines)} lignes")
    print(f"   - Sortie : {len(concepts)} lignes")
    print(f"   - Rejetés : {len(lines) - len(concepts)} lignes (événements, listes, etc.)")
    print(f"   - Fichier généré : {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
