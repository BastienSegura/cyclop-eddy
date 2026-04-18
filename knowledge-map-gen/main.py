from __future__ import annotations

import argparse

from km_generator import KMGenerator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a small knowledge map from a root concept.",
        epilog='Example: python main.py --root "Computer Science"',
    )
    parser.add_argument("--root", default="Computer Science", help="Root concept to expand.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generator = KMGenerator()
    print(generator.expand_map(args.root))
