import Phaser from 'phaser';
import type { SavedMapData } from '../terrain';

export class MenuScene extends Phaser.Scene {
  private loadMapErrorText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor('#1a2a1a');

    this.loadMapErrorText = this.add
      .text(width / 2, height - 60, '', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#cc6666',
        backgroundColor: '#2a1a1a',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Decorative frame
    const frameW = 460;
    const frameH = 520;
    const frameX = width / 2;
    const frameY = height / 2;

    const frameBg = this.add.rectangle(frameX, frameY, frameW, frameH, 0x1e2e1e, 0.7);
    frameBg.setStrokeStyle(2, 0x4a5a3a, 0.8);

    const innerFrame = this.add.rectangle(frameX, frameY, frameW - 12, frameH - 12);
    innerFrame.setStrokeStyle(1, 0x3a4a2a, 0.5);

    // Layout: vertically centered content inside the frame
    const topY = frameY - frameH / 2;
    const titleY = topY + 80;
    const subtitleY = titleY + 50;
    const divider1Y = subtitleY + 40;
    const btnStartY = divider1Y + 44;
    const btnLoadY = btnStartY + 52;
    const divider2Y = btnLoadY + 50;
    const btnTileY = divider2Y + 40;
    const btnEditorY = btnTileY + 52;
    const hintY = frameY + frameH / 2 - 36;

    // Title
    this.add.text(frameX, titleY, 'MEDIEVAL KEEP', {
      fontSize: '48px',
      fontFamily: 'Georgia',
      color: '#e8d4a0',
      stroke: '#2c1810',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(frameX, subtitleY, 'A strategy demo', {
      fontSize: '20px',
      fontFamily: 'Georgia',
      color: '#8a9a6a',
    }).setOrigin(0.5);

    // Divider
    this.drawDivider(frameX, divider1Y, 200);

    // Button style helper
    const btnStyle = {
      fontSize: '22px',
      fontFamily: 'Georgia',
      color: '#c4a454',
      backgroundColor: '#2e3e22',
      padding: { x: 28, y: 10 },
    };
    const btnHover = { color: '#f0e0b0', backgroundColor: '#3e4e2e' };
    const btnNormal = { color: '#c4a454', backgroundColor: '#2e3e22' };

    const secondaryStyle = {
      fontSize: '20px',
      fontFamily: 'Georgia',
      color: '#8a9a6a',
      backgroundColor: '#263226',
      padding: { x: 24, y: 8 },
    };
    const secHover = { color: '#c4b484', backgroundColor: '#344434' };
    const secNormal = { color: '#8a9a6a', backgroundColor: '#263226' };

    // Start Demo button
    const startButton = this.createButton(frameX, btnStartY, 'START DEMO', btnStyle, btnHover, btnNormal, () => {
      this.scene.start('GameScene');
    });

    // Load Map button
    const loadMapButton = this.createButton(frameX, btnLoadY, 'LOAD MAP & PLAY', btnStyle, btnHover, btnNormal, () => {
      this.promptLoadMap();
    });

    // Divider between game and tools
    this.drawDivider(frameX, divider2Y, 140);

    // Tile Test button
    const tileTestButton = this.createButton(frameX, btnTileY, 'TILE TEST', secondaryStyle, secHover, secNormal, () => {
      this.scene.start('TileTestScene');
    });

    // Map Editor button
    const mapEditorButton = this.createButton(frameX, btnEditorY, 'MAP EDITOR', secondaryStyle, secHover, secNormal, () => {
      this.scene.start('MapEditorScene');
    });

    // Hint text
    this.add.text(frameX, hintY, 'Select units \u2022 Right-click to move', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#5a6a4a',
    }).setOrigin(0.5);

    // Corner decorations
    const cornerSize = 12;
    const cColor = 0x6a7a5a;
    const cAlpha = 0.5;
    for (const [cx, cy] of [
      [frameX - frameW / 2 + 10, frameY - frameH / 2 + 10],
      [frameX + frameW / 2 - 10, frameY - frameH / 2 + 10],
      [frameX - frameW / 2 + 10, frameY + frameH / 2 - 10],
      [frameX + frameW / 2 - 10, frameY + frameH / 2 - 10],
    ] as [number, number][]) {
      const corner = this.add.graphics();
      corner.lineStyle(2, cColor, cAlpha);
      const isLeft = cx < frameX;
      const isTop = cy < frameY;
      const dx = isLeft ? cornerSize : -cornerSize;
      const dy = isTop ? cornerSize : -cornerSize;
      corner.beginPath();
      corner.moveTo(cx + dx, cy);
      corner.lineTo(cx, cy);
      corner.lineTo(cx, cy + dy);
      corner.strokePath();
    }
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
    hoverStyle: Record<string, string>,
    normalStyle: Record<string, string>,
    onClick: () => void,
  ): Phaser.GameObjects.Text {
    const btn = this.add
      .text(x, y, label, style)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle(hoverStyle));
    btn.on('pointerout', () => btn.setStyle(normalStyle));
    btn.on('pointerdown', onClick);
    return btn;
  }

  private drawDivider(x: number, y: number, halfWidth: number): void {
    const g = this.add.graphics();
    g.lineStyle(1, 0x4a5a3a, 0.6);
    g.beginPath();
    g.moveTo(x - halfWidth, y);
    g.lineTo(x - 8, y);
    g.moveTo(x + 8, y);
    g.lineTo(x + halfWidth, y);
    g.strokePath();
    const diamond = this.add.graphics();
    diamond.lineStyle(1, 0x6a7a5a, 0.5);
    diamond.beginPath();
    diamond.moveTo(x, y - 4);
    diamond.lineTo(x + 4, y);
    diamond.lineTo(x, y + 4);
    diamond.lineTo(x - 4, y);
    diamond.closePath();
    diamond.strokePath();
  }

  private promptLoadMap(): void {
    if (this.loadMapErrorText) this.loadMapErrorText.setVisible(false);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';
    document.body.appendChild(input);

    const onChange = (): void => {
      const file = input.files?.[0];
      input.removeEventListener('change', onChange);
      document.body.removeChild(input);

      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const parsed = JSON.parse(text) as unknown;
          if (!this.isValidSavedMapData(parsed)) {
            this.showLoadMapError('Invalid map format: need width, height, and cells (array of arrays of numbers).');
            return;
          }
          this.registry.set('savedMapData', parsed as SavedMapData);
          this.scene.start('GameScene');
        } catch {
          this.showLoadMapError('Invalid JSON or file error.');
        }
      };
      reader.onerror = () => this.showLoadMapError('Could not read file.');
      reader.readAsText(file);
    };

    input.addEventListener('change', onChange);
    input.click();
  }

  private isValidSavedMapData(obj: unknown): obj is SavedMapData {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    if (typeof o.width !== 'number' || typeof o.height !== 'number') return false;
    if (!Array.isArray(o.cells) || o.cells.length !== o.height) return false;
    for (let r = 0; r < (o.height as number); r++) {
      const row = o.cells[r];
      if (!Array.isArray(row) || row.length !== (o.width as number)) return false;
      for (let c = 0; c < row.length; c++) {
        if (typeof row[c] !== 'number') return false;
      }
    }
    return true;
  }

  private showLoadMapError(message: string): void {
    if (this.loadMapErrorText) {
      this.loadMapErrorText.setText(message).setVisible(true);
      this.time.delayedCall(4000, () => {
        if (this.loadMapErrorText) this.loadMapErrorText.setVisible(false);
      });
    }
  }
}
