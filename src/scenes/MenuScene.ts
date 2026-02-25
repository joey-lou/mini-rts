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
      .text(width / 2, height - 120, '', {
        fontSize: '16px',
        fontFamily: 'Arial',
        color: '#cc6666',
        backgroundColor: '#2a1a1a',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Title
    this.add.text(width / 2, height / 3, 'MEDIEVAL KEEP', {
      fontSize: '56px',
      fontFamily: 'Georgia',
      color: '#e8d4a0',
      stroke: '#2c1810',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 3 + 70, 'A strategy demo', {
      fontSize: '22px',
      fontFamily: 'Georgia',
      color: '#8a9a6a'
    }).setOrigin(0.5);

    // Start button
    const startButton = this.add.text(width / 2, height / 2 + 40, '[  START DEMO  ]', {
      fontSize: '28px',
      fontFamily: 'Georgia',
      color: '#c4a454',
      backgroundColor: '#3d4a2a',
      padding: { x: 24, y: 12 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on('pointerover', () => {
      startButton.setStyle({ color: '#e8d4a0', backgroundColor: '#4a5a32' });
    });

    startButton.on('pointerout', () => {
      startButton.setStyle({ color: '#c4a454', backgroundColor: '#3d4a2a' });
    });

    startButton.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Load Map & Play button
    const loadMapButton = this.add.text(width / 2, height / 2 + 80, '[  LOAD MAP & PLAY  ]', {
      fontSize: '20px',
      fontFamily: 'Georgia',
      color: '#8a9a6a',
      backgroundColor: '#2a3a2a',
      padding: { x: 18, y: 8 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    loadMapButton.on('pointerover', () => {
      loadMapButton.setStyle({ color: '#c4b484', backgroundColor: '#3a4a32' });
    });

    loadMapButton.on('pointerout', () => {
      loadMapButton.setStyle({ color: '#8a9a6a', backgroundColor: '#2a3a2a' });
    });

    loadMapButton.on('pointerdown', () => {
      this.promptLoadMap();
    });

    // Tile Test button
    const tileTestButton = this.add.text(width / 2, height / 2 + 110, '[  TILE TEST  ]', {
      fontSize: '20px',
      fontFamily: 'Georgia',
      color: '#8a9a6a',
      backgroundColor: '#2a3a2a',
      padding: { x: 18, y: 8 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    tileTestButton.on('pointerover', () => {
      tileTestButton.setStyle({ color: '#c4b484', backgroundColor: '#3a4a32' });
    });

    tileTestButton.on('pointerout', () => {
      tileTestButton.setStyle({ color: '#8a9a6a', backgroundColor: '#2a3a2a' });
    });

    tileTestButton.on('pointerdown', () => {
      this.scene.start('TileTestScene');
    });

    // Map Editor button
    const mapEditorButton = this.add.text(width / 2, height / 2 + 180, '[  MAP EDITOR  ]', {
      fontSize: '20px',
      fontFamily: 'Georgia',
      color: '#8a9a6a',
      backgroundColor: '#2a3a2a',
      padding: { x: 18, y: 8 }
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    mapEditorButton.on('pointerover', () => {
      mapEditorButton.setStyle({ color: '#c4b484', backgroundColor: '#3a4a32' });
    });

    mapEditorButton.on('pointerout', () => {
      mapEditorButton.setStyle({ color: '#8a9a6a', backgroundColor: '#2a3a2a' });
    });

    mapEditorButton.on('pointerdown', () => {
      this.scene.start('MapEditorScene');
    });

    this.add.text(width / 2, height - 80, 'Select units • Right-click to move', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#6a7a5a'
    }).setOrigin(0.5);
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
