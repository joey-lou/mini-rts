import Phaser from "phaser";
import { TILESET } from "../terrain/TerrainTypes";

/**
 * Debug scene: renders all tileset frames with index labels.
 * Launch via URL param ?tileDebug=1 — for visual frame mapping only.
 * Not exported; registered in main.ts scene list.
 */
export class TileDebugScene extends Phaser.Scene {
  constructor() {
    super({ key: "TileDebugScene" });
  }

  preload(): void {
    this.load.spritesheet(
      "terrain-debug",
      "assets/sprites/terrain/Tilemap_color1.png",
      { frameWidth: 64, frameHeight: 64 }
    );
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x222222);

    const { cols, rows, totalFrames } = TILESET;
    const tileSize = 64;
    const labelOffset = 2;
    const padding = 4;
    const cellSize = tileSize + padding;

    const tilesetKey = this.textures.exists("terrain-debug")
      ? "terrain-debug"
      : "terrain-tileset1";

    for (let i = 0; i < totalFrames; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellSize + padding;
      const y = row * cellSize + padding;

      if (this.textures.exists(tilesetKey)) {
        const img = this.add.image(x, y, tilesetKey, i);
        img.setOrigin(0, 0);
      } else {
        const placeholder = this.add.rectangle(x, y, tileSize, tileSize, 0x444466, 1);
        placeholder.setOrigin(0, 0);
      }

      this.add
        .text(x + labelOffset, y + labelOffset, String(i), {
          fontSize: "10px",
          fontFamily: "monospace",
          color: "#ffff00",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setDepth(10);
    }

    // Instructions overlay
    this.add
      .text(10, totalFrames > 0 ? Math.ceil(totalFrames / cols) * cellSize + 10 : 10,
        `TileDebugScene — ${totalFrames} frames (${cols} cols). Press ESC to return.`,
        { fontSize: "14px", fontFamily: "Arial", color: "#ffffff", backgroundColor: "#000000aa", padding: { x: 6, y: 4 } }
      )
      .setScrollFactor(0)
      .setDepth(20);

    this.input.keyboard?.on("keydown-ESC", () => {
      this.scene.stop();
      this.scene.resume("GameScene");
    });
  }
}
