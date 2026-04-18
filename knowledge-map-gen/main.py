from __future__ import annotations

import argparse
import json

from km_generator import KMGenerator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a small knowledge map from a root concept.",
        epilog=(
            'Examples:\n'
            '  python main.py --root "Computer Science"\n'
            "  python main.py --list\n"
            '  python main.py --show "Computer Science"'
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--root", default="Computer Science", help="Root concept to expand.")
    parser.add_argument("--children", type=int, default=10, help="Number of child concepts to generate.")
    parser.add_argument("--list", action="store_true", help="List saved knowledge maps.")
    parser.add_argument("--show", help="Display a saved knowledge map by root concept.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generator = KMGenerator()

    if args.list:
        for name in generator.list_maps():
            print(name)
    elif args.show:
        print(json.dumps(generator.load_map(args.show), indent=2))
    else:
        print(generator.expand_map(args.root, children=args.children))
