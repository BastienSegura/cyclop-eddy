# Cyclop Eddy Color Palette

## Source Palette (provided)

- `#131862` - deep night (main background)
- `#2E4482` - indigo blue (secondary backgrounds / panels)
- `#546BAB` - steel blue (borders, frames, UI elements)
- `#BEA9DE` - misty violet (nebula / soft glow)
- `#14E81E` - aurora green (strong energetic accent)
- `#00EA8D` - aurora teal (accent / glow)
- `#017ED5` - aurora blue (links, highlights, active states)
- `#E5CD8A` - pale gold starlight (stars, badges, premium highlights)

## Node Rendering Variants

To keep random node colors readable and sky-consistent on the deep-night graph background, three node-palette substitutions are applied:

- `#131862` -> `#3B4A8F` (contrast-safe node variant)
- `#2E4482` -> `#4A5FA8` (contrast-safe node variant)
- `#14E81E` -> `#5B3FA8` (deep-purple variant; more celestial than neon green)
- `#00EA8D` -> `#1F5BD8` (deep-blue variant; avoids green/teal star tones)

All other palette colors are used directly.
