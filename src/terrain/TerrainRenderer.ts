/**
 * Terrain renderer following Tiny Swords tilemap guide layer order.
 * @see https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide
 *
 * Render order (bottom to top):
 * 1. Water background color
 * 2. Water foam (animated, 128×128 overlapping at water edges)
 * 3. Flat ground tiles
 * 4. For each elevation level: Shadow (shifted down) + Cliff faces + Elevated ground surface
 */

import Phaser from 'phaser';
import { TerrainMap } from './TerrainMap';
import { TILE_SIZE, TerrainLevel, getTerrainYOffset, isElevated, N, E, S, W } from './TerrainTypes';
import {
  FLAT,
  ELEVATED_TOP,
  CLIFF,
  TilePosition,
  determineTilePosition,
  getRampFrames,
} from './TinySwordsTiles';

/** Depth layers for proper rendering order */
const DEPTH = {
  WATER_BG: 0,
  WATER_TILES: 0.5,
  WATER_FOAM: 1,
  FLAT_GROUND: 2,
  RAMP_GROUND: 3,
  SHADOW_BASE: 10,
  CLIFF_BASE: 11,
  ELEVATED_BASE: 12,
} as const;

/** Water color matching Tiny Swords style */
const WATER_COLOR = 0x4db3a8;

export class TerrainRenderer {
  private scene: Phaser.Scene;
  private map: TerrainMap;
  private container: Phaser.GameObjects.Container | null = null;
  private foamTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, map: TerrainMap) {
    this.scene = scene;
    this.map = map;
  }

  render(): void {
    this.container = this.scene.add.container(0, 0);
    this.renderWaterBackground();
    this.renderWaterTiles();
    this.renderWaterFoam();
    this.renderFlatGround();
    this.renderRampTiles();
    this.renderElevatedTerrain();
  }

  private renderWaterBackground(): void {
    const { width, height } = this.map;
    const worldW = width * TILE_SIZE;
    const worldH = height * TILE_SIZE;

    const bg = this.scene.add.rectangle(worldW / 2, worldH / 2, worldW, worldH, WATER_COLOR);
    bg.setDepth(DEPTH.WATER_BG);
    this.container!.add(bg);
  }

  private renderWaterTiles(): void {
    const { width, height } = this.map;
    const hasTexture = this.scene.textures.exists('terrain-water');

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (this.map.getLevel(row, col) !== TerrainLevel.WATER) continue;

        const x = this.map.toPixelX(col);
        const y = this.map.toPixelY(row);
        if (hasTexture) {
          const tile = this.scene.add.sprite(x, y, 'terrain-water', 0);
          tile.setOrigin(0, 0).setDepth(DEPTH.WATER_TILES);
          this.container!.add(tile);
        } else {
          const rect = this.scene.add.rectangle(
            x + TILE_SIZE / 2,
            y + TILE_SIZE / 2,
            TILE_SIZE,
            TILE_SIZE,
            WATER_COLOR
          );
          rect.setDepth(DEPTH.WATER_TILES);
          this.container!.add(rect);
        }
      }
    }
  }

  private renderWaterFoam(): void {
    const foamTiles = this.map.getFoamTiles();
    const foamGraphics: Phaser.GameObjects.Graphics[] = [];

    for (const { row, col, mask } of foamTiles) {
      const x = this.map.toPixelX(col);
      const y = this.map.toPixelY(row);

      const foam = this.scene.add.graphics();
      foam.setDepth(DEPTH.WATER_FOAM);
      foam.lineStyle(4, 0xffffff, 0.6);

      if (mask & N) this.drawFoamLine(foam, x, y, x + TILE_SIZE, y);
      if (mask & E) this.drawFoamLine(foam, x + TILE_SIZE, y, x + TILE_SIZE, y + TILE_SIZE);
      if (mask & S) this.drawFoamLine(foam, x, y + TILE_SIZE, x + TILE_SIZE, y + TILE_SIZE);
      if (mask & W) this.drawFoamLine(foam, x, y, x, y + TILE_SIZE);

      this.container!.add(foam);
      foamGraphics.push(foam);
    }

    if (foamGraphics.length > 0) {
      this.foamTimer = this.scene.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          for (const foam of foamGraphics) {
            if (!foam.active) continue;
            foam.setAlpha(0.4 + Math.random() * 0.3);
          }
        },
      });
    }
  }

  private drawFoamLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number): void {
    const segments = 4;
    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    const perpX = -dy * 0.1;
    const perpY = dx * 0.1;

    g.beginPath();
    g.moveTo(x1, y1);
    for (let i = 1; i <= segments; i++) {
      const wave = Math.sin(i * Math.PI) * 3;
      const px = x1 + dx * i + perpX * wave;
      const py = y1 + dy * i + perpY * wave;
      g.lineTo(px, py);
    }
    g.strokePath();

    g.lineStyle(2, 0xffffff, 0.3);
    g.beginPath();
    g.moveTo(x1 + perpX * 5, y1 + perpY * 5);
    for (let i = 1; i <= segments; i++) {
      const wave = Math.sin(i * Math.PI + 0.5) * 2;
      const px = x1 + dx * i + perpX * (5 + wave);
      const py = y1 + dy * i + perpY * (5 + wave);
      g.lineTo(px, py);
    }
    g.strokePath();
  }

  /**
   * Render flat ground tiles using the correct Tiny Swords tile frames.
   */
  private renderFlatGround(): void {
    const { width, height } = this.map;
    const tilesetKey = 'terrain-tileset1';

    if (!this.scene.textures.exists(tilesetKey)) {
      this.renderFlatGroundFallback();
      return;
    }

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const level = this.map.getLevel(row, col);
        if (level < TerrainLevel.FLAT) continue;

        const x = this.map.toPixelX(col);
        const y = this.map.toPixelY(row);

        const frame = this.getFlatFrame(row, col);
        const tile = this.scene.add.sprite(x, y, tilesetKey, frame);
        tile.setOrigin(0, 0).setDepth(DEPTH.FLAT_GROUND);
        this.container!.add(tile);
      }
    }
  }

  /**
   * Get the correct flat ground frame based on neighboring tiles.
   */
  private getFlatFrame(row: number, col: number): number {
    const hasN = this.map.getLevel(row - 1, col) >= TerrainLevel.FLAT;
    const hasE = this.map.getLevel(row, col + 1) >= TerrainLevel.FLAT;
    const hasS = this.map.getLevel(row + 1, col) >= TerrainLevel.FLAT;
    const hasW = this.map.getLevel(row, col - 1) >= TerrainLevel.FLAT;

    const position = determineTilePosition(hasN, hasE, hasS, hasW);
    return this.flatPositionToFrame(position);
  }

  /**
   * Map tile position to flat ground frame index.
   */
  private flatPositionToFrame(position: TilePosition): number {
    const frames: Record<TilePosition, number> = {
      [TilePosition.TOP_LEFT]: FLAT.TOP_LEFT,
      [TilePosition.TOP]: FLAT.TOP,
      [TilePosition.TOP_RIGHT]: FLAT.TOP_RIGHT,
      [TilePosition.LEFT]: FLAT.LEFT,
      [TilePosition.CENTER]: FLAT.CENTER,
      [TilePosition.RIGHT]: FLAT.RIGHT,
      [TilePosition.BOTTOM_LEFT]: FLAT.BOTTOM_LEFT,
      [TilePosition.BOTTOM]: FLAT.BOTTOM,
      [TilePosition.BOTTOM_RIGHT]: FLAT.BOTTOM_RIGHT,
    };
    return frames[position];
  }

  /**
   * Render ramp tiles for cells with level RAMP.
   * Ramp frame is chosen from elevation neighbors (high = ELEVATED_1/ELEVATED_2) so slope goes low→high.
   */
  /**
   * Render ramp/stair tiles as vertically-paired composites (upper + lower frame).
   */
  private renderRampTiles(): void {
    const { width, height } = this.map;
    const tilesetKey = 'terrain-tileset1';
    if (!this.scene.textures.exists(tilesetKey)) return;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (this.map.getLevel(row, col) !== TerrainLevel.RAMP) continue;

        const x = this.map.toPixelX(col);
        const y = this.map.toPixelY(row);
        const highN = isElevated(this.map.getLevel(row - 1, col));
        const highE = isElevated(this.map.getLevel(row, col + 1));
        const highS = isElevated(this.map.getLevel(row + 1, col));
        const highW = isElevated(this.map.getLevel(row, col - 1));
        const [upperFrame, lowerFrame] = getRampFrames(highN, highE, highS, highW);

        const upper = this.scene.add.sprite(x, y, tilesetKey, upperFrame);
        upper.setOrigin(0, 0).setDepth(DEPTH.RAMP_GROUND);
        this.container!.add(upper);

        const lower = this.scene.add.sprite(x, y + TILE_SIZE, tilesetKey, lowerFrame);
        lower.setOrigin(0, 0).setDepth(DEPTH.RAMP_GROUND);
        this.container!.add(lower);
      }
    }
  }

  private renderFlatGroundFallback(): void {
    const { width, height } = this.map;

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const level = this.map.getLevel(row, col);
        if (level < TerrainLevel.FLAT) continue;

        const x = this.map.toPixelX(col);
        const y = this.map.toPixelY(row);

        const rect = this.scene.add.rectangle(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          TILE_SIZE - 2,
          TILE_SIZE - 2,
          0x4a7c4a
        );
        rect.setDepth(DEPTH.FLAT_GROUND);
        this.container!.add(rect);
      }
    }
  }

  /**
   * Render elevated terrain. Surface tiles at grid position (no Y offset).
   * Cliff body tiles placed in the ROW BELOW south-boundary elevated cells
   * to create the height illusion.
   */
  private renderElevatedTerrain(): void {
    const { width, height } = this.map;
    const tilesets = ['terrain-tileset1', 'terrain-tileset2', 'terrain-tileset3'];

    for (const level of [TerrainLevel.ELEVATED_1, TerrainLevel.ELEVATED_2]) {
      const tilesetKey = tilesets[(level - 1) % tilesets.length];
      const hasTexture = this.scene.textures.exists(tilesetKey);

      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const cellLevel = this.map.getLevel(row, col);
          if (!isElevated(cellLevel) || cellLevel < level) continue;

          const x = this.map.toPixelX(col);
          const y = this.map.toPixelY(row);
          const depthCliff = DEPTH.CLIFF_BASE + level * 3;
          const depthElevated = DEPTH.ELEVATED_BASE + level * 3;

          // Elevated surface at grid position
          if (hasTexture) {
            const frame = this.getElevatedFrame(row, col, level);
            const tile = this.scene.add.sprite(x, y, tilesetKey, frame);
            tile.setOrigin(0, 0).setDepth(depthElevated);
            this.container!.add(tile);
          } else {
            const colors = [0x5a8a5a, 0x6a9a6a, 0x7aaa7a];
            const color = colors[(level - 1) % colors.length];
            const rect = this.scene.add.rectangle(
              x + TILE_SIZE / 2, y + TILE_SIZE / 2,
              TILE_SIZE - 2, TILE_SIZE - 2, color,
            );
            rect.setDepth(depthElevated);
            this.container!.add(rect);
          }

          // Cliff body in the ROW BELOW for south-boundary cells
          const southLevel = this.map.getLevel(row + 1, col);
          const southIsElevated = isElevated(southLevel) && southLevel >= level;
          if (!southIsElevated && hasTexture) {
            const cliffFrame = this.getCliffFrame(row, col, level);
            const cliffY = this.map.toPixelY(row + 1);
            const cliff = this.scene.add.sprite(x, cliffY, tilesetKey, cliffFrame);
            cliff.setOrigin(0, 0).setDepth(depthCliff);
            this.container!.add(cliff);
          }
        }
      }
    }
  }

  /**
   * Select the cliff body frame for an elevated cell using the 3×3 cliff pattern.
   * L/C/R determined by same-level elevated neighbors to the west/east.
   */
  private getCliffFrame(row: number, col: number, level: TerrainLevel): number {
    const atLevel = (l: TerrainLevel): boolean => isElevated(l) && l >= level;
    const elevW = atLevel(this.map.getLevel(row, col - 1));
    const elevE = atLevel(this.map.getLevel(row, col + 1));

    if (!elevW && !elevE) return CLIFF.TOP;      // isolated
    if (!elevW && elevE) return CLIFF.TOP_LEFT;   // left edge
    if (elevW && !elevE) return CLIFF.TOP_RIGHT;  // right edge
    return CLIFF.TOP;                             // center
  }

  /**
   * Get the correct elevated surface frame based on neighboring tiles.
   */
  private getElevatedFrame(row: number, col: number, level: TerrainLevel): number {
    const atLevel = (l: TerrainLevel): boolean => isElevated(l) && l >= level;
    const hasN = atLevel(this.map.getLevel(row - 1, col));
    const hasE = atLevel(this.map.getLevel(row, col + 1));
    const hasS = atLevel(this.map.getLevel(row + 1, col));
    const hasW = atLevel(this.map.getLevel(row, col - 1));

    const position = determineTilePosition(hasN, hasE, hasS, hasW);
    return this.elevatedPositionToFrame(position);
  }

  /**
   * Map tile position to elevated surface frame index.
   */
  private elevatedPositionToFrame(position: TilePosition): number {
    const frames: Record<TilePosition, number> = {
      [TilePosition.TOP_LEFT]: ELEVATED_TOP.TOP_LEFT,
      [TilePosition.TOP]: ELEVATED_TOP.TOP,
      [TilePosition.TOP_RIGHT]: ELEVATED_TOP.TOP_RIGHT,
      [TilePosition.LEFT]: ELEVATED_TOP.LEFT,
      [TilePosition.CENTER]: ELEVATED_TOP.CENTER,
      [TilePosition.RIGHT]: ELEVATED_TOP.RIGHT,
      [TilePosition.BOTTOM_LEFT]: ELEVATED_TOP.BOTTOM_LEFT,
      [TilePosition.BOTTOM]: ELEVATED_TOP.BOTTOM,
      [TilePosition.BOTTOM_RIGHT]: ELEVATED_TOP.BOTTOM_RIGHT,
    };
    return frames[position];
  }


  destroy(): void {
    if (this.foamTimer) {
      this.foamTimer.destroy();
      this.foamTimer = null;
    }
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }
}
