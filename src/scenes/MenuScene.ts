import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor('#1a2a1a');

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

    this.add.text(width / 2, height - 80, 'Select units • Right-click to move', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#6a7a5a'
    }).setOrigin(0.5);
  }
}
