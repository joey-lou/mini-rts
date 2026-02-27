/**
 * Manual tile testing scene.
 * Creates manually specified terrain maps to verify correct tile usage.
 *
 * Based on the Tiny Swords Tilemap Guide:
 * @see https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide
 *
 * Key concepts:
 * 1. FLAT GROUND: Lowest terrain, forms islands on water
 * 2. ELEVATED GROUND: Has a grass top surface + cliff faces below
 * 3. SHADOWS: 128×128 sprites shifted down one tile for depth
 * 4. WATER FOAM: Animated waves at water edges
 */

import Phaser from 'phaser';
import { TILE_SIZE } from '../terrain/TerrainTypes';
import {
  FLAT,
  ELEVATED_TOP,
  CLIFF,
  RAMP,
  TilePosition,
  getFlatFrame,
  getElevatedTopFrame,
  determineTilePosition,
} from '../terrain/TinySwordsTiles';

const WATER_COLOR = 0x4db3a8;

/** Depth layers */
const DEPTH = {
  WATER: 0,
  FOAM: 1,
  FLAT: 2,
  SHADOW: 9,
  CLIFF: 10,
  ELEVATED: 11,
  UI: 100,
} as const;

export class TileTestScene extends Phaser.Scene {
  private currentTest = 1;

  constructor() {
    super({ key: 'TileTestScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // Water background
    const bg = this.add.rectangle(width / 2, height / 2, width * 2, height * 2, WATER_COLOR);
    bg.setDepth(DEPTH.WATER);

    // UI
    this.add.text(20, 20, 'Tile Test Scene - Manual Terrain Placement', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333aa',
      padding: { x: 10, y: 5 },
    }).setDepth(DEPTH.UI).setScrollFactor(0);

    const instructions = this.add.text(20, 60, '', {
      fontSize: '14px',
      color: '#cccccc',
    }).setDepth(DEPTH.UI).setScrollFactor(0);

    this.updateInstructions(instructions);

    // Render initial test
    this.renderTest(1);

    // Keyboard controls
    this.input.keyboard?.on('keydown-ONE', () => this.switchTest(1, instructions));
    this.input.keyboard?.on('keydown-TWO', () => this.switchTest(2, instructions));
    this.input.keyboard?.on('keydown-THREE', () => this.switchTest(3, instructions));
    this.input.keyboard?.on('keydown-FOUR', () => this.switchTest(4, instructions));
    this.input.keyboard?.on('keydown-FIVE', () => this.switchTest(5, instructions));
    this.input.keyboard?.on('keydown-SIX', () => this.switchTest(6, instructions));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));

    // Camera
    const cam = this.cameras.main;
    cam.setZoom(1);

    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (1 - dy * 0.001), 0.5, 3));
    });

    // Pan with arrow keys
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const speed = 50;
      if (event.key === 'ArrowLeft') cam.scrollX -= speed;
      if (event.key === 'ArrowRight') cam.scrollX += speed;
      if (event.key === 'ArrowUp') cam.scrollY -= speed;
      if (event.key === 'ArrowDown') cam.scrollY += speed;
    });
  }

  private updateInstructions(text: Phaser.GameObjects.Text): void {
    text.setText(`Test ${this.currentTest} | Keys: 1-6 switch tests | Arrow keys pan | Scroll zoom | ESC menu`);
  }

  private switchTest(testNum: number, instructions: Phaser.GameObjects.Text): void {
    this.currentTest = testNum;
    this.updateInstructions(instructions);

    // Clear existing tiles
    this.children.list
      .filter(child => {
        const obj = child as unknown as { depth?: number };
        return obj.depth !== undefined && obj.depth > DEPTH.WATER && obj.depth < DEPTH.UI;
      })
      .forEach(child => child.destroy());

    this.renderTest(testNum);
  }

  private renderTest(testNum: number): void {
    switch (testNum) {
      case 1: this.renderTest1_FlatIsland(); break;
      case 2: this.renderTest2_LargerIsland(); break;
      case 3: this.renderTest3_ElevatedPlatform(); break;
      case 4: this.renderTest4_MixedTerrain(); break;
      case 5: this.renderTest5_TilesetReference(); break;
      case 6: this.renderTest6_RampStairs(); break;
    }
  }

  /**
   * Test 1: Simple 3×3 flat island
   * Demonstrates basic corner, edge, and center tile usage.
   */
  private renderTest1_FlatIsland(): void {
    const startX = 300;
    const startY = 200;

    this.addLabel(startX, startY - 30, 'Test 1: 3×3 Flat Island');

    // 3×3 island: each tile manually specified
    // Row 0: TL, T, TR
    this.placeTile(startX + 0 * TILE_SIZE, startY + 0 * TILE_SIZE, FLAT.TOP_LEFT, DEPTH.FLAT);
    this.placeTile(startX + 1 * TILE_SIZE, startY + 0 * TILE_SIZE, FLAT.TOP, DEPTH.FLAT);
    this.placeTile(startX + 2 * TILE_SIZE, startY + 0 * TILE_SIZE, FLAT.TOP_RIGHT, DEPTH.FLAT);

    // Row 1: L, C, R
    this.placeTile(startX + 0 * TILE_SIZE, startY + 1 * TILE_SIZE, FLAT.LEFT, DEPTH.FLAT);
    this.placeTile(startX + 1 * TILE_SIZE, startY + 1 * TILE_SIZE, FLAT.CENTER, DEPTH.FLAT);
    this.placeTile(startX + 2 * TILE_SIZE, startY + 1 * TILE_SIZE, FLAT.RIGHT, DEPTH.FLAT);

    // Row 2: BL, B, BR
    this.placeTile(startX + 0 * TILE_SIZE, startY + 2 * TILE_SIZE, FLAT.BOTTOM_LEFT, DEPTH.FLAT);
    this.placeTile(startX + 1 * TILE_SIZE, startY + 2 * TILE_SIZE, FLAT.BOTTOM, DEPTH.FLAT);
    this.placeTile(startX + 2 * TILE_SIZE, startY + 2 * TILE_SIZE, FLAT.BOTTOM_RIGHT, DEPTH.FLAT);

    // Add frame labels for reference
    this.addFrameLabel(startX + 0 * TILE_SIZE, startY + 0 * TILE_SIZE, FLAT.TOP_LEFT);
    this.addFrameLabel(startX + 1 * TILE_SIZE, startY + 0 * TILE_SIZE, FLAT.TOP);
    this.addFrameLabel(startX + 2 * TILE_SIZE, startY + 0 * TILE_SIZE, FLAT.TOP_RIGHT);
    this.addFrameLabel(startX + 0 * TILE_SIZE, startY + 1 * TILE_SIZE, FLAT.LEFT);
    this.addFrameLabel(startX + 1 * TILE_SIZE, startY + 1 * TILE_SIZE, FLAT.CENTER);
    this.addFrameLabel(startX + 2 * TILE_SIZE, startY + 1 * TILE_SIZE, FLAT.RIGHT);
    this.addFrameLabel(startX + 0 * TILE_SIZE, startY + 2 * TILE_SIZE, FLAT.BOTTOM_LEFT);
    this.addFrameLabel(startX + 1 * TILE_SIZE, startY + 2 * TILE_SIZE, FLAT.BOTTOM);
    this.addFrameLabel(startX + 2 * TILE_SIZE, startY + 2 * TILE_SIZE, FLAT.BOTTOM_RIGHT);
  }

  /**
   * Test 2: Larger 5×4 flat island
   * Shows how center tiles repeat for larger areas.
   */
  private renderTest2_LargerIsland(): void {
    const startX = 200;
    const startY = 200;
    const cols = 5;
    const rows = 4;

    this.addLabel(startX, startY - 30, 'Test 2: 5×4 Flat Island');

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = startX + col * TILE_SIZE;
        const y = startY + row * TILE_SIZE;

        // Determine position type
        let frame: number;
        if (row === 0 && col === 0) frame = FLAT.TOP_LEFT;
        else if (row === 0 && col === cols - 1) frame = FLAT.TOP_RIGHT;
        else if (row === rows - 1 && col === 0) frame = FLAT.BOTTOM_LEFT;
        else if (row === rows - 1 && col === cols - 1) frame = FLAT.BOTTOM_RIGHT;
        else if (row === 0) frame = FLAT.TOP;
        else if (row === rows - 1) frame = FLAT.BOTTOM;
        else if (col === 0) frame = FLAT.LEFT;
        else if (col === cols - 1) frame = FLAT.RIGHT;
        else frame = FLAT.CENTER;

        this.placeTile(x, y, frame, DEPTH.FLAT);
        this.addFrameLabel(x, y, frame);
      }
    }
  }

  /**
   * Test 3: Elevated platform with cliffs
   * Shows: flat base + elevated top surface + cliff faces
   */
  private renderTest3_ElevatedPlatform(): void {
    const startX = 150;
    const startY = 150;

    this.addLabel(startX, startY - 30, 'Test 3: Elevated Platform with Cliffs');

    // First layer: flat ground base (6×5)
    const baseCols = 6;
    const baseRows = 5;

    for (let row = 0; row < baseRows; row++) {
      for (let col = 0; col < baseCols; col++) {
        const x = startX + col * TILE_SIZE;
        const y = startY + row * TILE_SIZE;

        let frame: number;
        if (row === 0 && col === 0) frame = FLAT.TOP_LEFT;
        else if (row === 0 && col === baseCols - 1) frame = FLAT.TOP_RIGHT;
        else if (row === baseRows - 1 && col === 0) frame = FLAT.BOTTOM_LEFT;
        else if (row === baseRows - 1 && col === baseCols - 1) frame = FLAT.BOTTOM_RIGHT;
        else if (row === 0) frame = FLAT.TOP;
        else if (row === baseRows - 1) frame = FLAT.BOTTOM;
        else if (col === 0) frame = FLAT.LEFT;
        else if (col === baseCols - 1) frame = FLAT.RIGHT;
        else frame = FLAT.CENTER;

        this.placeTile(x, y, frame, DEPTH.FLAT);
      }
    }

    // Second layer: elevated top surface (3×2) - offset by 1 tile
    const elevStartX = startX + TILE_SIZE * 1.5;
    const elevStartY = startY + TILE_SIZE * 0.5;
    const elevCols = 3;
    const elevRows = 2;

    for (let row = 0; row < elevRows; row++) {
      for (let col = 0; col < elevCols; col++) {
        const x = elevStartX + col * TILE_SIZE;
        const y = elevStartY + row * TILE_SIZE;

        let frame: number;
        if (row === 0 && col === 0) frame = ELEVATED_TOP.TOP_LEFT;
        else if (row === 0 && col === elevCols - 1) frame = ELEVATED_TOP.TOP_RIGHT;
        else if (row === elevRows - 1 && col === 0) frame = ELEVATED_TOP.BOTTOM_LEFT;
        else if (row === elevRows - 1 && col === elevCols - 1) frame = ELEVATED_TOP.BOTTOM_RIGHT;
        else if (row === 0) frame = ELEVATED_TOP.TOP;
        else if (row === elevRows - 1) frame = ELEVATED_TOP.BOTTOM;
        else if (col === 0) frame = ELEVATED_TOP.LEFT;
        else if (col === elevCols - 1) frame = ELEVATED_TOP.RIGHT;
        else frame = ELEVATED_TOP.CENTER;

        this.placeTile(x, y, frame, DEPTH.ELEVATED);
      }
    }

    // Third layer: cliff faces below elevated area
    const cliffY = elevStartY + elevRows * TILE_SIZE;
    this.placeTile(elevStartX + 0 * TILE_SIZE, cliffY, CLIFF.LEFT, DEPTH.CLIFF);
    this.placeTile(elevStartX + 1 * TILE_SIZE, cliffY, CLIFF.CENTER, DEPTH.CLIFF);
    this.placeTile(elevStartX + 2 * TILE_SIZE, cliffY, CLIFF.RIGHT, DEPTH.CLIFF);
  }

  /**
   * Test 4: Mixed terrain showing water, flat, and elevated.
   */
  private renderTest4_MixedTerrain(): void {
    const startX = 100;
    const startY = 100;

    this.addLabel(startX, startY - 30, 'Test 4: Mixed Terrain (Manual Map)');

    // Define terrain map: 0=water, 1=flat, 2=elevated
    // This creates an island with an elevated hill on it
    const terrain: number[][] = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 1, 1, 1, 2, 2, 1, 1, 0, 0],
      [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
      [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];

    const rows = terrain.length;
    const cols = terrain[0].length;

    // First pass: render flat ground
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (terrain[row][col] >= 1) {
          const x = startX + col * TILE_SIZE;
          const y = startY + row * TILE_SIZE;

          // Check neighbors for flat tiles
          const hasN = row > 0 && terrain[row - 1][col] >= 1;
          const hasE = col < cols - 1 && terrain[row][col + 1] >= 1;
          const hasS = row < rows - 1 && terrain[row + 1][col] >= 1;
          const hasW = col > 0 && terrain[row][col - 1] >= 1;

          const position = determineTilePosition(hasN, hasE, hasS, hasW);
          const frame = getFlatFrame(position);

          this.placeTile(x, y, frame, DEPTH.FLAT);
        }
      }
    }

    // Second pass: render elevated terrain on top
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (terrain[row][col] >= 2) {
          const x = startX + col * TILE_SIZE;
          const y = startY + row * TILE_SIZE;

          // Check neighbors for elevated tiles
          const hasN = row > 0 && terrain[row - 1][col] >= 2;
          const hasE = col < cols - 1 && terrain[row][col + 1] >= 2;
          const hasS = row < rows - 1 && terrain[row + 1][col] >= 2;
          const hasW = col > 0 && terrain[row][col - 1] >= 2;

          const position = determineTilePosition(hasN, hasE, hasS, hasW);
          const frame = getElevatedTopFrame(position);

          this.placeTile(x, y, frame, DEPTH.ELEVATED);

          // Add cliff below if there's no elevated terrain to the south
          if (!hasS) {
            // Determine cliff position (left/center/right)
            let cliffFrame: number = CLIFF.CENTER;
            if (!hasW && hasE) cliffFrame = CLIFF.LEFT;
            else if (hasW && !hasE) cliffFrame = CLIFF.RIGHT;

            this.placeTile(x, y + TILE_SIZE, cliffFrame, DEPTH.CLIFF);
          }
        }
      }
    }
  }

  /**
   * Test 5: Full tileset reference
   * Shows all 54 tiles with their frame indices.
   */
  private renderTest5_TilesetReference(): void {
    const startX = 50;
    const startY = 100;
    const tilesetKey = 'terrain-tileset1';

    if (!this.textures.exists(tilesetKey)) {
      this.addLabel(startX, startY, 'ERROR: Tileset not loaded!');
      return;
    }

    this.addLabel(startX, startY - 40, 'Test 5: Complete Tileset Reference (9×6 grid)');
    this.addLabel(startX, startY - 20, 'Frame# = col + row × 9');

    // Section labels
    this.add.text(startX + TILE_SIZE * 1, startY - 5, 'FLAT', {
      fontSize: '12px',
      color: '#88ff88',
    }).setDepth(DEPTH.UI);

    this.add.text(startX + TILE_SIZE * 6, startY - 5, 'ELEVATED', {
      fontSize: '12px',
      color: '#88ff88',
    }).setDepth(DEPTH.UI);

    // Row labels
    const rowLabels = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5'];
    for (let r = 0; r < 6; r++) {
      this.add.text(startX - 30, startY + r * (TILE_SIZE + 20) + TILE_SIZE / 2, rowLabels[r], {
        fontSize: '10px',
        color: '#888888',
      }).setOrigin(0.5).setDepth(DEPTH.UI);
    }

    // Render all tiles
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 9; col++) {
        const frame = col + row * 9;
        const x = startX + col * (TILE_SIZE + 8);
        const y = startY + row * (TILE_SIZE + 20);

        // Tile
        const tile = this.add.sprite(x, y, tilesetKey, frame);
        tile.setOrigin(0, 0).setDepth(5);

        // Frame number
        this.add.text(x + TILE_SIZE / 2, y + TILE_SIZE + 2, `${frame}`, {
          fontSize: '11px',
          color: '#ffff00',
        }).setOrigin(0.5, 0).setDepth(DEPTH.UI);

        // Highlight spacer column (col 4)
        if (col === 4) {
          const highlight = this.add.rectangle(
            x + TILE_SIZE / 2,
            y + TILE_SIZE / 2,
            TILE_SIZE + 4,
            TILE_SIZE + 4,
            0xff0000,
            0.2
          );
          highlight.setDepth(4);
        }
      }
    }

    // Legend
    const legendY = startY + 6 * (TILE_SIZE + 20) + 20;
    this.add.text(startX, legendY, 'Legend:', {
      fontSize: '14px',
      color: '#ffffff',
    }).setDepth(DEPTH.UI);
    this.add.text(startX, legendY + 20, '• Cols 0-3: Flat ground tiles', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setDepth(DEPTH.UI);
    this.add.text(startX, legendY + 36, '• Col 4: Spacer (highlighted red)', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setDepth(DEPTH.UI);
    this.add.text(startX, legendY + 52, '• Cols 5-8: Elevated terrain (rows 0-2 = grass top, rows 3-5 = cliff)', {
      fontSize: '12px',
      color: '#aaaaaa',
    }).setDepth(DEPTH.UI);
  }

  /**
   * Test 6: Elevation compositing + Ramp/stair paired tiles.
   * Shows how elevated surface + cliff face stack to create height,
   * and how stair pairs (upper+lower) create transitions.
   */
  private renderTest6_RampStairs(): void {
    const startX = 50;
    const startY = 100;
    const tilesetKey = 'terrain-tileset1';
    const HEIGHT_OFFSET = 24;

    if (!this.textures.exists(tilesetKey)) {
      this.addLabel(startX, startY, 'ERROR: Tileset not loaded!');
      return;
    }

    this.addLabel(startX, startY - 40, 'Test 6: Elevation Compositing + Stair Pairs');

    // Section A: Cliff body only at south boundary of elevated area
    this.addLabel(startX, startY, 'A) Cliff body on south-boundary tiles only:');
    const compY = startY + 20;
    // Flat ground base
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        this.placeTile(startX + c * TILE_SIZE, compY + r * TILE_SIZE, FLAT.CENTER, DEPTH.FLAT);
      }
    }
    // Top elevated row: surface only (no cliff, interior row)
    for (let c = 0; c < 3; c++) {
      const cx = startX + c * TILE_SIZE;
      const surfF = c === 0 ? ELEVATED_TOP.TOP_LEFT : c === 2 ? ELEVATED_TOP.TOP_RIGHT : ELEVATED_TOP.TOP;
      this.placeTile(cx, compY - HEIGHT_OFFSET, surfF, DEPTH.ELEVATED);
    }
    // Bottom elevated row: cliff body + surface (south boundary)
    for (let c = 0; c < 3; c++) {
      const cx = startX + c * TILE_SIZE;
      const cliffF = c === 0 ? CLIFF.TOP_LEFT : c === 2 ? CLIFF.TOP_RIGHT : CLIFF.TOP;
      this.placeTile(cx, compY + TILE_SIZE, cliffF, DEPTH.CLIFF);
      const surfF = c === 0 ? ELEVATED_TOP.BOTTOM_LEFT : c === 2 ? ELEVATED_TOP.BOTTOM_RIGHT : ELEVATED_TOP.BOTTOM;
      this.placeTile(cx, compY + TILE_SIZE - HEIGHT_OFFSET, surfF, DEPTH.ELEVATED);
    }

    // Section B: Show stair pairs
    const pairY = compY + TILE_SIZE * 3 + 40;
    this.addLabel(startX, pairY - 20, 'B) Stair pairs (upper + lower stacked):');

    // Pair A: frames 36 + 45
    this.addLabel(startX, pairY, 'Pair A (36+45):');
    this.placeTile(startX, pairY + 16, RAMP.A_UPPER, DEPTH.ELEVATED - 1);
    this.placeTile(startX, pairY + 16 + TILE_SIZE, RAMP.A_LOWER, DEPTH.ELEVATED - 1);
    this.addFrameLabel(startX, pairY + 16, RAMP.A_UPPER);
    this.addFrameLabel(startX, pairY + 16 + TILE_SIZE, RAMP.A_LOWER);

    // Pair B: frames 37 + 46
    const pairBX = startX + TILE_SIZE + 60;
    this.addLabel(pairBX, pairY, 'Pair B (37+46):');
    this.placeTile(pairBX, pairY + 16, RAMP.B_UPPER, DEPTH.ELEVATED - 1);
    this.placeTile(pairBX, pairY + 16 + TILE_SIZE, RAMP.B_LOWER, DEPTH.ELEVATED - 1);
    this.addFrameLabel(pairBX, pairY + 16, RAMP.B_UPPER);
    this.addFrameLabel(pairBX, pairY + 16 + TILE_SIZE, RAMP.B_LOWER);

    // Section C: Full composed scene with elevation + stairs
    const sceneX = startX + TILE_SIZE * 4 + 20;
    const sceneY = startY + 20;
    this.addLabel(sceneX, sceneY - 20, 'C) Composed scene:');

    // Flat ground (5×5)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const pos = determineTilePosition(r > 0, c < 4, r < 4, c > 0);
        this.placeTile(sceneX + c * TILE_SIZE, sceneY + r * TILE_SIZE, getFlatFrame(pos), DEPTH.FLAT);
      }
    }
    // Elevated (2×2): cliff body only on bottom row (south boundary)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const gx = sceneX + (c + 2) * TILE_SIZE;
        const gy = sceneY + (r + 1) * TILE_SIZE;
        const isSouthBoundary = r === 1;
        if (isSouthBoundary) {
          const cliffF = c === 0 ? CLIFF.TOP_LEFT : CLIFF.TOP_RIGHT;
          this.placeTile(gx, gy, cliffF, DEPTH.CLIFF);
        }
        const pos = determineTilePosition(r > 0, c < 1, r < 1, c > 0);
        this.placeTile(gx, gy - HEIGHT_OFFSET, getElevatedTopFrame(pos), DEPTH.ELEVATED);
      }
    }
    // Stair pair next to elevated
    this.placeTile(sceneX + 1 * TILE_SIZE, sceneY + 1 * TILE_SIZE, RAMP.A_UPPER, DEPTH.ELEVATED - 1);
    this.placeTile(sceneX + 1 * TILE_SIZE, sceneY + 2 * TILE_SIZE, RAMP.A_LOWER, DEPTH.ELEVATED - 1);
  }

  /**
   * Place a single tile at the given position.
   */
  private placeTile(x: number, y: number, frame: number, depth: number, tileset = 1): void {
    const tilesetKey = `terrain-tileset${tileset}`;
    if (!this.textures.exists(tilesetKey)) {
      // Fallback: colored rectangle
      const color = depth === DEPTH.ELEVATED ? 0x5a8a5a : depth === DEPTH.CLIFF ? 0x6a6a7a : 0x4a7c4a;
      const rect = this.add.rectangle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE - 2, TILE_SIZE - 2, color);
      rect.setDepth(depth);
      return;
    }

    const tile = this.add.sprite(x, y, tilesetKey, frame);
    tile.setOrigin(0, 0).setDepth(depth);
  }

  /**
   * Add a text label.
   */
  private addLabel(x: number, y: number, text: string): void {
    this.add.text(x, y, text, {
      fontSize: '14px',
      color: '#ffffff',
    }).setDepth(DEPTH.UI);
  }

  /**
   * Add a small frame number label.
   */
  private addFrameLabel(x: number, y: number, frame: number): void {
    this.add.text(x + TILE_SIZE - 4, y + 4, `${frame}`, {
      fontSize: '10px',
      color: '#ffff00',
      backgroundColor: '#00000088',
      padding: { x: 2, y: 1 },
    }).setOrigin(1, 0).setDepth(DEPTH.UI);
  }
}
