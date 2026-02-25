# Asset Generation Guide

This guide tells you exactly what assets to generate and where to put them.
The game will use colored placeholder shapes until you add the real sprites.

## Quick Start

1. Go to [SpriteLab](https://sprite-lab.com) or [SpriteCook](https://spritecook.ai)
2. Use the prompts below to generate each asset
3. Download as PNG (transparent background)
4. Save to the correct folder with the exact filename

---

## Units (`assets/sprites/units/`)

Team variants: **blue** (player) and **red** (enemy). Each team has its own sprite set.

Layout:
- `units/blue/Pawn/` — Pawn_Idle.png, Pawn_Run.png
- `units/blue/Warrior/` — Warrior_Idle.png, Warrior_Run.png, Warrior_Attack1/2.png, Warrior_Guard.png
- `units/blue/Archer/` — Archer_Idle.png, Archer_Run.png, Archer_Shoot.png
- `units/blue/Lancer/` — Lancer_Idle.png, Lancer_Run.png, Lancer_*_Attack.png, etc.
- `units/red/` — same structure

Frame size: **192×192** per frame (horizontal strip).

**Tips:**
- Top-down perspective (looking from above)
- Transparent background is essential
- Use the same filenames in `blue/` and `red/` so animations stay in sync

---

## Buildings (`assets/sprites/buildings/`)

| Filename | Size | AI Prompt |
|----------|------|-----------|
| `base.png` | 96x96 | "top-down military command center building, pixel art, 96x96, concrete bunker style, transparent background" |
| `barracks.png` | 64x64 | "top-down military barracks building, pixel art, 64x64, produces infantry, transparent background" |
| `factory.png` | 80x64 | "top-down tank factory building, pixel art, 80x64, industrial military, transparent background" |
| `refinery.png` | 80x64 | "top-down ore refinery building, pixel art, 80x64, processing plant with silos, transparent background" |

---

## Terrain Tiles (`assets/sprites/terrain/`)

The terrain system follows the [Tiny Swords Tilemap Guide](https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide).

### Layer Order (bottom to top)

1. **BG Color** - Water fill (teal background)
2. **Water Foam** - Animated waves at water edges
3. **Flat Ground** - Lowest walkable terrain
4. **Shadow + Elevated Ground** - Repeated for each elevation level

### Tileset Files

| Filename | Size | Description |
|----------|------|-------------|
| `Tilemap_color1.png` | 576×384 | Green grass tileset (9×6 grid, 64×64 tiles) |
| `Tilemap_color2.png` | 576×384 | Alternate color variant |
| `Tilemap_color3.png` | 576×384 | Third color variant |
| `water.png` | 64×64 | Water background tile |

### Tileset Layout (9×6 grid = 54 frames)

The tileset is divided into TWO main sections:

**LEFT SECTION (cols 0-3): Flat Ground**

Forms island/platform shapes on water level.

```
Frame Index = col + row × 9

     Col0   Col1   Col2   Col3
Row0:  0      1      2      3     ← Corners/Top (TL, T, TR, ?)
Row1:  9     10     11     12     ← Edges/Center (L, C, R, ?)
Row2: 18     19     20     21     ← Bottom (BL, B, BR, ?)
Row3: 27     28     29     30     ← Strips/extensions
Row4: 36     37     38     39     ← Stairs/variations
Row5: 45     46     47     48     ← More variations
```

**Column 4: Spacer** (frames 4, 13, 22, 31, 40, 49 are empty)

**RIGHT SECTION (cols 5-8): Elevated Terrain**

Has two parts: grass surface (rows 0-2) and cliff faces (rows 3-5).

```
     Col5   Col6   Col7   Col8
Row0:  5      6      7      8     ← Elevated surface (TL, T, TR)
Row1: 14     15     16     17     ← Elevated surface (L, C, R)
Row2: 23     24     25     26     ← Elevated surface (BL, B, BR)
Row3: 32     33     34     35     ← Cliff faces (top)
Row4: 41     42     43     44     ← Cliff faces (middle)
Row5: 50     51     52     53     ← Cliff faces (bottom)
```

### Tile Usage

**Flat Ground (3×3 island):**
- Frame 0: Top-Left corner
- Frame 1: Top edge
- Frame 2: Top-Right corner
- Frame 9: Left edge
- Frame 10: Center (interior)
- Frame 11: Right edge
- Frame 18: Bottom-Left corner
- Frame 19: Bottom edge
- Frame 20: Bottom-Right corner

**Elevated Surface (same pattern, offset by +5 cols):**
- Frames 5, 6, 7, 14, 15, 16, 23, 24, 25

**Cliff Faces (below elevated terrain):**
- Frame 41: Cliff left
- Frame 42: Cliff center
- Frame 43: Cliff right

### Tile Test Scene

Access via Menu → "TILE TEST" or add `?tileTest=1` to URL.
- Press 1-5 to switch between test maps
- Test 5 shows the complete tileset with frame indices

### Shadows

Per the Tiny Swords guide, shadows are 128×128 sprites placed on 64×64 grid, shifted down one tile to create depth illusion for elevated terrain.

---

## UI Elements (`assets/sprites/ui/`)

| Filename | Size | AI Prompt |
|----------|------|-----------|
| `panel.png` | 200x400 | "game UI panel, sci-fi military style, dark metal frame, pixel art, vertical sidebar" |
| `button.png` | 80x30 | "game UI button, sci-fi military style, metallic, pixel art, rectangular" |
| `minimap-frame.png` | 150x150 | "minimap frame border, sci-fi military style, square with corner details, pixel art" |

---

## Effects (`assets/sprites/effects/`) - Animated Sprite Sheets

Animations use **sprite sheets**: one image with multiple frames arranged horizontally.

```
┌────┬────┬────┬────┬────┬────┬────┬────┐
│ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │  ← 8 frames
└────┴────┴────┴────┴────┴────┴────┴────┘
```

| Filename | Frame Size | Frames | Total Image Size | AI Prompt |
|----------|------------|--------|------------------|-----------|
| `explosion.png` | 64x64 | 8 | 512x64 | "explosion animation sprite sheet, 8 frames horizontal strip, pixel art, 64x64 per frame, fire and smoke, transparent background, game effect" |
| `muzzle-flash.png` | 32x32 | 4 | 128x32 | "muzzle flash animation sprite sheet, 4 frames horizontal strip, pixel art, 32x32 per frame, yellow orange flash, transparent background" |

### How Sprite Sheets Work

1. All frames must be the **same size**
2. Frames arranged **horizontally** (left to right)
3. Frame 0 is leftmost, frame N is rightmost
4. Total image width = frameWidth × frameCount
5. **Transparent background** is essential

### Animation Prompts for Units (Optional)

For walking/moving animations:

| Filename | Frame Size | Frames | AI Prompt |
|----------|------------|--------|-----------|
| `infantry-walk.png` | 32x32 | 8 | "soldier walking animation sprite sheet, 8 frames horizontal, top-down pixel art, 32x32 per frame, military uniform, transparent background" |
| `tank-move.png` | 32x32 | 4 | "tank tracks moving animation sprite sheet, 4 frames horizontal, top-down pixel art, 32x32 per frame, transparent background" |

---

## Audio (`assets/audio/`) - Optional

You can add sound effects later. Recommended formats: `.wav` or `.mp3`

- `shoot.wav` - Gun/cannon fire
- `explosion.wav` - Unit destruction
- `select.wav` - Unit selected
- `move.wav` - Move command acknowledged
- `build.wav` - Building placed

---

## Testing Your Assets

1. Save the file to the correct location
2. Refresh the browser (the dev server hot-reloads)
3. The placeholder should be replaced with your sprite

If something looks wrong:
- Check the filename matches exactly (case-sensitive)
- Verify transparent background (no white box around sprite)
- Confirm dimensions match the expected size

---

## Recommended AI Tools

**Free & Easy:**
- [SpriteLab](https://sprite-lab.com) - Best for quick sprites
- [SpriteCook](https://spritecook.ai) - Consistent pixel art style

**More Control:**
- [Leonardo.ai](https://leonardo.ai) - Higher quality, more options
- [Scenario.gg](https://scenario.gg) - Can train on your style

**Professional:**
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Local, full control

---

## Free Asset Resources

| Site | Best For |
|------|----------|
| [itch.io Game Assets](https://itch.io/game-assets) | Huge variety, many free packs |
| [OpenGameArt.org](https://opengameart.org) | Free CC0/CC-BY sprites, tiles, sounds |
| [Kenney.nl](https://kenney.nl/assets) | High-quality CC0 asset packs |
| [The Spriters Resource](https://www.spriters-resource.com) | Ripped game sprites (reference/learning) |

---

## Credits

This project uses the **Tiny Swords** asset pack by **Pixel Frog**:

> **[Tiny Swords by Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords)**
>
> A medieval RTS asset pack including units (Warrior, Archer, Lancer, Monk, Pawn), buildings, terrain tiles, UI elements, and particle FX. Available in 5 faction colors (blue, red, purple, yellow, black).
>
> - **Free Pack**: Human units, buildings, resources, terrain, decorations, UI
> - **Enemy Pack** (paid): 16 enemy characters + boat
> - **License**: Free for personal and commercial use; credit appreciated but not required; no redistribution
> - **Tilemap grid**: 64×64 pixels
> - **Animation speed**: 10 fps (100 ms per frame)
