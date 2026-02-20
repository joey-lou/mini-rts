import Phaser from 'phaser';
import { UnitType } from './Unit';
import { ProductionQueue } from '../systems/ProductionQueue';

export type BuildingType = 'castle' | 'barracks' | 'archery' | 'monastery' | 'tower';

/** Unit types producible per building type. */
const PRODUCIBLE: Partial<Record<BuildingType, UnitType[]>> = {
  barracks: ['knight', 'footman', 'lancer'],
  archery: ['archer'],
};

/**
 * A placeable building that optionally holds a production queue.
 * Emits 'building-clicked' on the scene event bus when clicked.
 */
export class Building extends Phaser.GameObjects.Image {
  readonly buildingType: BuildingType;
  private _queue: ProductionQueue | null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    textureKey: string,
    buildingType: BuildingType,
    queue: ProductionQueue | null = null
  ) {
    super(scene, x, y, textureKey);
    this.buildingType = buildingType;
    this._queue = queue;

    scene.add.existing(this);

    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      scene.events.emit('building-clicked', this);
    });
  }

  getQueue(): ProductionQueue | null {
    return this._queue;
  }

  getProducibleUnits(): UnitType[] {
    return PRODUCIBLE[this.buildingType] ?? [];
  }

  startTraining(unitType: UnitType): boolean {
    if (!this._queue) return false;
    const producible = this.getProducibleUnits();
    if (!producible.includes(unitType)) return false;
    return true;
  }
}
