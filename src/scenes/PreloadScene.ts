import Phaser from 'phaser';

/** Frame dimensions for 192×192 unit sprite sheets. */
export const FRAME = { frameWidth: 192, frameHeight: 192 };

/**
 * Preloader scene - loads all game assets with a progress bar.
 * This runs before the menu, ensuring all assets are ready.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor('#1a1a2e');

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const progressBarBg = this.add.rectangle(width / 2, height / 2, 400, 30, 0x222244);
    progressBarBg.setStrokeStyle(2, 0x4444aa);

    const progressBar = this.add.rectangle(width / 2 - 195, height / 2, 0, 22, 0x44aa44);
    progressBar.setOrigin(0, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff'
    }).setOrigin(0.5);

    const assetText = this.add.text(width / 2, height / 2 + 40, '', {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#888888'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.width = 390 * value;
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      assetText.setText(`Loading: ${file.key}`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Complete!');
      assetText.setText('');
    });

    // ============================================
    // UNITS (192×192 sprite sheets, blue/red by team)
    // ============================================
    const unitsBase = 'assets/sprites/units';
    for (const color of ['blue', 'red']) {
      const U = `${unitsBase}/${color}`;
      // Pawn
      this.load.spritesheet(`unit-pawn-idle-${color}`, `${U}/Pawn/Pawn_Idle.png`, FRAME);
      this.load.spritesheet(`unit-pawn-run-${color}`, `${U}/Pawn/Pawn_Run.png`, FRAME);
      // Warrior (idle, run, attack1, attack2, guard)
      this.load.spritesheet(`unit-warrior-idle-${color}`, `${U}/Warrior/Warrior_Idle.png`, FRAME);
      this.load.spritesheet(`unit-warrior-run-${color}`, `${U}/Warrior/Warrior_Run.png`, FRAME);
      this.load.spritesheet(`unit-warrior-attack1-${color}`, `${U}/Warrior/Warrior_Attack1.png`, FRAME);
      this.load.spritesheet(`unit-warrior-attack2-${color}`, `${U}/Warrior/Warrior_Attack2.png`, FRAME);
      this.load.spritesheet(`unit-warrior-guard-${color}`, `${U}/Warrior/Warrior_Guard.png`, FRAME);
      // Archer (idle, run, shoot)
      this.load.spritesheet(`unit-archer-idle-${color}`, `${U}/Archer/Archer_Idle.png`, FRAME);
      this.load.spritesheet(`unit-archer-run-${color}`, `${U}/Archer/Archer_Run.png`, FRAME);
      this.load.spritesheet(`unit-archer-shoot-${color}`, `${U}/Archer/Archer_Shoot.png`, FRAME);
      // Lancer (idle, run)
      this.load.spritesheet(`unit-lancer-idle-${color}`, `${U}/Lancer/Lancer_Idle.png`, FRAME);
      this.load.spritesheet(`unit-lancer-run-${color}`, `${U}/Lancer/Lancer_Run.png`, FRAME);
      this.load.spritesheet(`unit-lancer-attack-${color}`, `${U}/Lancer/Lancer_Right_Attack.png`, FRAME);
    }

    // ============================================
    // BUILDINGS
    // ============================================
    const BLD = 'assets/sprites/buildings';
    this.load.image('building-castle', `${BLD}/Castle.png`);
    this.load.image('building-barracks', `${BLD}/Barracks.png`);
    this.load.image('building-archery', `${BLD}/Archery.png`);
    this.load.image('building-tower', `${BLD}/Tower.png`);
    this.load.image('building-monastery', `${BLD}/Monastery.png`);

    // ============================================
    // TERRAIN
    // ============================================
    const TER = 'assets/sprites/terrain';
    this.load.spritesheet('terrain-tileset1', `${TER}/Tilemap_color1.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('terrain-tileset2', `${TER}/Tilemap_color2.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('terrain-tileset3', `${TER}/Tilemap_color3.png`, { frameWidth: 64, frameHeight: 64 });
    this.load.image('terrain-water', `${TER}/water.png`);
    this.loadAsset('tile-grass', 'assets/sprites/terrain/grass');
    this.loadAsset('tile-sand', 'assets/sprites/terrain/sand');
    this.loadAsset('tile-concrete', 'assets/sprites/terrain/concrete');
    this.loadAsset('tile-ore', 'assets/sprites/terrain/ore');

    // ============================================
    // UI ELEMENTS
    // ============================================
    const UI = 'assets/sprites/ui';
    this.load.image('ui-bigbar-base', `${UI}/BigBar_Base.png`);
    this.load.image('ui-bigbar-fill', `${UI}/BigBar_Fill.png`);
    this.load.image('ui-smallbar-base', `${UI}/SmallBar_Base.png`);
    this.load.image('ui-smallbar-fill', `${UI}/SmallBar_Fill.png`);
    this.load.image('ui-btn-blue', `${UI}/BigBlueButton_Regular.png`);
    this.load.image('ui-btn-blue-pressed', `${UI}/BigBlueButton_Pressed.png`);
    this.load.image('ui-btn-red', `${UI}/BigRedButton_Regular.png`);
    this.load.image('ui-btn-red-pressed', `${UI}/BigRedButton_Pressed.png`);
    for (let i = 1; i <= 12; i++) {
      const n = i.toString().padStart(2, '0');
      this.load.image(`ui-icon-${i}`, `${UI}/Icon_${n}.png`);
    }
    this.loadAsset('ui-panel', 'assets/sprites/ui/panel');
    this.loadAsset('ui-button', 'assets/sprites/ui/button');
    this.loadAsset('ui-minimap-frame', 'assets/sprites/ui/minimap-frame');

    // ============================================
    // EFFECTS
    // ============================================
    this.load.spritesheet('effect-explosion', 'assets/sprites/effects/explosion.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('effect-muzzle', 'assets/sprites/effects/muzzle-flash.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create(): void {
    this.createPlaceholderTextures();
    this.createPlaceholderSpriteSheets();
    this.createAnimations();

    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }

  private createAnimations(): void {
    if (this.textures.exists('effect-explosion')) {
      this.anims.create({
        key: 'explosion',
        frames: this.anims.generateFrameNumbers('effect-explosion', { start: 0, end: 7 }),
        frameRate: 15,
        repeat: 0
      });
    }

    if (this.textures.exists('effect-muzzle')) {
      this.anims.create({
        key: 'muzzle-flash',
        frames: this.anims.generateFrameNumbers('effect-muzzle', { start: 0, end: 3 }),
        frameRate: 20,
        repeat: 0
      });
    }

    for (const color of ['blue', 'red']) {
      this.registerPawnAnims(color);
      this.registerWarriorAnims(color);
      this.registerArcherAnims(color);
      this.registerLancerAnims(color);
    }
  }

  private registerPawnAnims(color: string): void {
    if (!this.textures.exists(`unit-pawn-idle-${color}`)) return;
    this.anims.create({ key: `pawn-idle-${color}`, frames: this.anims.generateFrameNumbers(`unit-pawn-idle-${color}`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `pawn-run-${color}`, frames: this.anims.generateFrameNumbers(`unit-pawn-run-${color}`, { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: `pawn-attack-${color}`, frames: this.anims.generateFrameNumbers(`unit-pawn-run-${color}`, { start: 0, end: 5 }), frameRate: 14, repeat: 0 });
  }

  private registerWarriorAnims(color: string): void {
    if (!this.textures.exists(`unit-warrior-idle-${color}`)) return;
    this.anims.create({ key: `warrior-idle-${color}`, frames: this.anims.generateFrameNumbers(`unit-warrior-idle-${color}`, { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `warrior-run-${color}`, frames: this.anims.generateFrameNumbers(`unit-warrior-run-${color}`, { start: 0, end: 5 }), frameRate: 12, repeat: -1 });

    if (this.textures.exists(`unit-warrior-attack1-${color}`) && this.textures.exists(`unit-warrior-attack2-${color}`)) {
      const frames = [
        ...this.anims.generateFrameNumbers(`unit-warrior-attack1-${color}`, { start: 0, end: 5 }),
        ...this.anims.generateFrameNumbers(`unit-warrior-attack2-${color}`, { start: 0, end: 5 })
      ];
      this.anims.create({ key: `warrior-attack-${color}`, frames, frameRate: 14, repeat: 0 });
    } else {
      this.anims.create({ key: `warrior-attack-${color}`, frames: this.anims.generateFrameNumbers(`unit-warrior-run-${color}`, { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
    }

    if (this.textures.exists(`unit-warrior-guard-${color}`)) {
      this.anims.create({ key: `warrior-guard-${color}`, frames: this.anims.generateFrameNumbers(`unit-warrior-guard-${color}`, { start: 0, end: 5 }), frameRate: 16, repeat: 0 });
    } else {
      this.anims.create({ key: `warrior-guard-${color}`, frames: this.anims.generateFrameNumbers(`unit-warrior-idle-${color}`, { start: 0, end: 3 }), frameRate: 16, repeat: 0 });
    }
  }

  private registerArcherAnims(color: string): void {
    if (!this.textures.exists(`unit-archer-idle-${color}`)) return;
    this.anims.create({ key: `archer-idle-${color}`, frames: this.anims.generateFrameNumbers(`unit-archer-idle-${color}`, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `archer-run-${color}`, frames: this.anims.generateFrameNumbers(`unit-archer-run-${color}`, { start: 0, end: 3 }), frameRate: 12, repeat: -1 });

    if (this.textures.exists(`unit-archer-shoot-${color}`)) {
      this.anims.create({ key: `archer-attack-${color}`, frames: this.anims.generateFrameNumbers(`unit-archer-shoot-${color}`, { start: 0, end: 11 }), frameRate: 14, repeat: 0 });
    } else {
      this.anims.create({ key: `archer-attack-${color}`, frames: this.anims.generateFrameNumbers(`unit-archer-run-${color}`, { start: 0, end: 3 }), frameRate: 14, repeat: 0 });
    }
  }

  private registerLancerAnims(color: string): void {
    if (!this.textures.exists(`unit-lancer-idle-${color}`)) return;
    this.anims.create({ key: `lancer-idle-${color}`, frames: this.anims.generateFrameNumbers(`unit-lancer-idle-${color}`, { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `lancer-run-${color}`, frames: this.anims.generateFrameNumbers(`unit-lancer-run-${color}`, { start: 0, end: 5 }), frameRate: 12, repeat: -1 });
    if (this.textures.exists(`unit-lancer-attack-${color}`)) {
      this.anims.create({ key: `lancer-attack-${color}`, frames: this.anims.generateFrameNumbers(`unit-lancer-attack-${color}`, { start: 0, end: 5 }), frameRate: 14, repeat: 0 });
    }
  }

  private createPlaceholderSpriteSheets(): void {
    if (!this.textures.exists('effect-explosion')) {
      this.createAnimatedPlaceholder('effect-explosion', 64, 64, 8, [
        0xff4400, 0xff6600, 0xff8800, 0xffaa00,
        0xffcc00, 0xffaa00, 0xff6600, 0x442200
      ]);
    }

    if (!this.textures.exists('effect-muzzle')) {
      this.createAnimatedPlaceholder('effect-muzzle', 32, 32, 4, [
        0xffff00, 0xffcc00, 0xff8800, 0x442200
      ]);
    }
  }

  private createAnimatedPlaceholder(
    key: string,
    frameWidth: number,
    frameHeight: number,
    frameCount: number,
    colors: number[]
  ): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const totalWidth = frameWidth * frameCount;

    for (let i = 0; i < frameCount; i++) {
      const color = colors[i % colors.length];
      const x = i * frameWidth;
      graphics.fillStyle(color, 0.8);
      graphics.fillCircle(x + frameWidth / 2, frameHeight / 2, frameWidth * (0.4 - i * 0.03));
      graphics.lineStyle(1, 0x333333, 0.3);
      graphics.strokeRect(x, 0, frameWidth, frameHeight);
    }

    graphics.generateTexture(key, totalWidth, frameHeight);
    graphics.destroy();

    const texture = this.textures.get(key);
    if (texture && texture.source) {
      for (let i = 0; i < frameCount; i++) {
        texture.add(i, 0, i * frameWidth, 0, frameWidth, frameHeight);
      }
    }
  }

  private createPlaceholderTextures(): void {
    const placeholders: { key: string; width: number; height: number; color: number }[] = [
      { key: 'tile-grass', width: 32, height: 32, color: 0x3a6a3a },
      { key: 'tile-sand', width: 32, height: 32, color: 0xc4a43a },
      { key: 'tile-concrete', width: 32, height: 32, color: 0x6a6a6a },
      { key: 'tile-ore', width: 32, height: 32, color: 0x8a5a2a },
      { key: 'ui-panel', width: 200, height: 400, color: 0x2a2a3a },
      { key: 'ui-button', width: 80, height: 30, color: 0x3a3a5a },
      { key: 'ui-minimap-frame', width: 150, height: 150, color: 0x1a1a2a },
    ];

    for (const { key, width, height, color } of placeholders) {
      if (!this.textures.exists(key)) {
        this.createPlaceholder(key, width, height, color);
      }
    }
  }

  private createPlaceholder(key: string, width: number, height: number, color: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.lineStyle(2, 0x000000, 0.5);
    graphics.strokeRect(1, 1, width - 2, height - 2);
    graphics.lineStyle(1, 0xffffff, 0.3);
    graphics.lineBetween(0, 0, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  private loadAsset(key: string, basePath: string, ext: string = 'png'): void {
    this.load.image(key, `${basePath}.${ext}`);
  }
}
