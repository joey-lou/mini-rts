import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { TileDebugScene } from './scenes/TileDebugScene';
import { TileTestScene } from './scenes/TileTestScene';
import { MapEditorScene } from './scenes/MapEditorScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#2d2d44',
  disableContextMenu: true,
  dom: { createContainer: true },
  scene: [PreloadScene, MenuScene, GameScene, HUDScene, TileDebugScene, TileTestScene, MapEditorScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

export default game;
