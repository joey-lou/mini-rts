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
      // Pawn (idle, run, optional work/build)
      this.load.spritesheet(`unit-pawn-idle-${color}`, `${U}/Pawn/Pawn_Idle.png`, FRAME);
      this.load.spritesheet(`unit-pawn-run-${color}`, `${U}/Pawn/Pawn_Run.png`, FRAME);
      // Optional worker build animation: add Pawn_Work.png under assets/sprites/units/{color}/Pawn/ then uncomment:
      // this.load.spritesheet(`unit-pawn-work-${color}`, `${U}/Pawn/Pawn_Work.png`, FRAME);
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
    // Optional terrain tiles: created as placeholders in create() if files are missing

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
    // Optional UI: created as placeholders in create() if files are missing

    // ============================================
    // EFFECTS (no load here to avoid 404; createPlaceholderSpriteSheets() in create() provides placeholders)
    // ============================================
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
    if (this.textures.exists('effect-explosion') && this.getFrameCount('effect-explosion') > 0) {
      this.anims.create({
        key: 'explosion',
        frames: this.safeFrameNumbers('effect-explosion', 7),
        frameRate: 15,
        repeat: 0
      });
    }

    if (this.textures.exists('effect-muzzle') && this.getFrameCount('effect-muzzle') > 0) {
      this.anims.create({
        key: 'muzzle-flash',
        frames: this.safeFrameNumbers('effect-muzzle', 3),
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
    this.anims.create({ key: `pawn-idle-${color}`, frames: this.safeFrameNumbers(`unit-pawn-idle-${color}`, 7), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `pawn-run-${color}`, frames: this.safeFrameNumbers(`unit-pawn-run-${color}`, 5), frameRate: 12, repeat: -1 });
    this.anims.create({ key: `pawn-attack-${color}`, frames: this.safeFrameNumbers(`unit-pawn-run-${color}`, 5), frameRate: 14, repeat: 0 });
    if (this.textures.exists(`unit-pawn-work-${color}`)) {
      this.anims.create({ key: `pawn-work-${color}`, frames: this.safeFrameNumbers(`unit-pawn-work-${color}`, 7), frameRate: 8, repeat: -1 });
    }
  }

  private getFrameCount(key: string): number {
    if (!this.textures.exists(key)) return 0;
    const tex = this.textures.get(key);
    const names = tex.getFrameNames?.();
    return names?.length ?? 0;
  }

  private safeFrameNumbers(key: string, maxEnd: number): Phaser.Types.Animations.AnimationFrame[] {
    const end = Math.min(maxEnd, Math.max(0, this.getFrameCount(key) - 1));
    return this.anims.generateFrameNumbers(key, { start: 0, end });
  }

  private registerWarriorAnims(color: string): void {
    if (!this.textures.exists(`unit-warrior-idle-${color}`)) return;
    this.anims.create({ key: `warrior-idle-${color}`, frames: this.safeFrameNumbers(`unit-warrior-idle-${color}`, 7), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `warrior-run-${color}`, frames: this.safeFrameNumbers(`unit-warrior-run-${color}`, 5), frameRate: 12, repeat: -1 });

    if (this.textures.exists(`unit-warrior-attack1-${color}`) && this.textures.exists(`unit-warrior-attack2-${color}`)) {
      const frames = [
        ...this.safeFrameNumbers(`unit-warrior-attack1-${color}`, 5),
        ...this.safeFrameNumbers(`unit-warrior-attack2-${color}`, 5)
      ];
      if (frames.length > 0) {
        this.anims.create({ key: `warrior-attack-${color}`, frames, frameRate: 14, repeat: 0 });
      } else {
        this.anims.create({ key: `warrior-attack-${color}`, frames: this.safeFrameNumbers(`unit-warrior-run-${color}`, 5), frameRate: 12, repeat: 0 });
      }
    } else {
      this.anims.create({ key: `warrior-attack-${color}`, frames: this.safeFrameNumbers(`unit-warrior-run-${color}`, 5), frameRate: 12, repeat: 0 });
    }

    if (this.textures.exists(`unit-warrior-guard-${color}`)) {
      this.anims.create({ key: `warrior-guard-${color}`, frames: this.safeFrameNumbers(`unit-warrior-guard-${color}`, 5), frameRate: 16, repeat: 0 });
    } else {
      this.anims.create({ key: `warrior-guard-${color}`, frames: this.safeFrameNumbers(`unit-warrior-idle-${color}`, 3), frameRate: 16, repeat: 0 });
    }
  }

  private registerArcherAnims(color: string): void {
    if (!this.textures.exists(`unit-archer-idle-${color}`)) return;
    this.anims.create({ key: `archer-idle-${color}`, frames: this.safeFrameNumbers(`unit-archer-idle-${color}`, 5), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `archer-run-${color}`, frames: this.safeFrameNumbers(`unit-archer-run-${color}`, 3), frameRate: 12, repeat: -1 });

    if (this.textures.exists(`unit-archer-shoot-${color}`)) {
      this.anims.create({ key: `archer-attack-${color}`, frames: this.safeFrameNumbers(`unit-archer-shoot-${color}`, 11), frameRate: 14, repeat: 0 });
    } else {
      this.anims.create({ key: `archer-attack-${color}`, frames: this.safeFrameNumbers(`unit-archer-run-${color}`, 3), frameRate: 14, repeat: 0 });
    }
  }

  private registerLancerAnims(color: string): void {
    if (!this.textures.exists(`unit-lancer-idle-${color}`)) return;
    this.anims.create({ key: `lancer-idle-${color}`, frames: this.safeFrameNumbers(`unit-lancer-idle-${color}`, 5), frameRate: 8, repeat: -1 });
    this.anims.create({ key: `lancer-run-${color}`, frames: this.safeFrameNumbers(`unit-lancer-run-${color}`, 5), frameRate: 12, repeat: -1 });
    if (this.textures.exists(`unit-lancer-attack-${color}`)) {
      this.anims.create({ key: `lancer-attack-${color}`, frames: this.safeFrameNumbers(`unit-lancer-attack-${color}`, 5), frameRate: 14, repeat: 0 });
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
