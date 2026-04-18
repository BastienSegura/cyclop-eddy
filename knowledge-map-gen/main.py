from __future__ import annotations

import argparse

from km_generator import KMGenerator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a small knowledge map from a root concept.",
        epilog='Example: python main.py --root "Computer Science"',
    )
    parser.add_argument("--root", default="Computer Science", help="Root concept to expand.")
    parser.add_argument("--ollama-url", default="http://localhost:11434", help="Ollama server URL.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generator = KMGenerator(ollama_url=args.ollama_url)
    print(generator.expand_map(args.root))
