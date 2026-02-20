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

These should tile seamlessly (edges match up when placed next to each other).

| Filename | Size | AI Prompt |
|----------|------|-----------|
| `grass.png` | 32x32 | "grass terrain tile, top-down, pixel art, 32x32, seamless tileable texture, game asset" |
| `sand.png` | 32x32 | "desert sand terrain tile, top-down, pixel art, 32x32, seamless tileable texture, game asset" |
| `concrete.png` | 32x32 | "concrete floor tile, top-down, pixel art, 32x32, seamless tileable texture, military base" |
| `ore.png` | 32x32 | "ore deposit terrain tile, top-down, pixel art, 32x32, crystals or minerals, harvestable resource" |

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
