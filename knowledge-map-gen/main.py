from __future__ import annotations

import argparse
import json
import sys

from km_generator import KMGenerator


def print_progress(current: int, estimated_total: int, concept: str) -> None:
    bar_width = 32
    filled = int(bar_width * min(current, estimated_total) / estimated_total) if estimated_total else bar_width
    bar = "#" * filled + "-" * (bar_width - filled)
    short_concept = concept if len(concept) <= 40 else f"{concept[:37]}..."
    message = f"[{bar}] generated {current}/est. {estimated_total} latest: {short_concept}"
    print(f"\r{message:<110}", end="", file=sys.stderr, flush=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a small knowledge map from a root concept.",
        epilog=(
            'Examples:\n'
            '  python main.py --root "Computer Science" --children 10 --depth 2\n'
            '  python main.py --root "Computer Science" --children 10 --descendant-children 4 --depth 2\n'
            "  python main.py --list\n"
            '  python main.py --show "Computer Science"\n'
            '  python main.py --clear "Computer Science"'
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--root", default="Computer Science", help="Root concept to expand.")
    parser.add_argument("--children", type=int, default=10, help="Number of child concepts to generate.")
    parser.add_argument(
        "--descendant-children",
        type=int,
        help="Number of children to generate for non-root concepts. Defaults to --children.",
    )
    parser.add_argument("--depth", type=int, default=1, help="Number of levels to expand.")
    parser.add_argument("--list", action="store_true", help="List saved knowledge maps.")
    parser.add_argument("--show", help="Display a saved knowledge map by root concept.")
    parser.add_argument("--clear", help="Delete a saved knowledge map by root concept.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generator = KMGenerator()

    if args.list:
        for name in generator.list_maps():
            print(name)
    elif args.show:
        print(json.dumps(generator.load_map(args.show), indent=2))
    elif args.clear:
        if generator.clear_map(args.clear):
            print(f"Deleted knowledge map: {args.clear}")
        else:
            print(f"Knowledge map not found: {args.clear}", file=sys.stderr)
    else:
        try:
            knowledge_map = generator.generate_map(
                args.root,
                children=args.children,
                descendant_children=args.descendant_children,
                depth=args.depth,
                progress_callback=print_progress,
            )
            print(file=sys.stderr)
            for message in generator.messages:
                print(message, file=sys.stderr)
            print(json.dumps(knowledge_map, indent=2))
        except Exception as exc:
            print(f"\nError: {exc}", file=sys.stderr)
            sys.exit(1)
