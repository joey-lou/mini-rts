import { Unit, UnitType, Team } from '../entities/Unit';
import { EconomyManager } from './EconomyManager';

/** Gold cost per unit type. */
export const UnitCost: Record<UnitType, number> = {
  knight: 100,
  footman: 50,
  archer: 75,
  peasant: 25,
  lancer: 120,
};

/** Training time in seconds per unit type. */
export const TrainTime: Record<UnitType, number> = {
  knight: 8,
  footman: 5,
  archer: 6,
  peasant: 3,
  lancer: 10,
};

interface QueueEntry {
  unitType: UnitType;
  team: Team;
  timeRemaining: number;
  totalTime: number;
}

/**
 * Manages a building's unit production queue.
 * Checks gold, deducts it on enqueue, and calls spawnFn when training completes.
 */
export class ProductionQueue {
  private queue: QueueEntry[] = [];
  private readonly maxQueue = 5;
  private readonly scene: Phaser.Scene;
  private readonly economy: EconomyManager;
  private readonly spawnFn: (unitType: UnitType, team: Team) => Unit;

  constructor(
    scene: Phaser.Scene,
    economy: EconomyManager,
    spawnFn: (unitType: UnitType, team: Team) => Unit
  ) {
    this.scene = scene;
    this.economy = economy;
    this.spawnFn = spawnFn;
  }

  /**
   * Enqueue a unit for production. Returns false if gold insufficient or queue full.
   */
  enqueue(unitType: UnitType, team: Team, goldCost: number, trainTimeSec: number): boolean {
    if (this.queue.length >= this.maxQueue) return false;
    if (!this.economy.spendGold(goldCost)) return false;

    this.queue.push({
      unitType,
      team,
      timeRemaining: trainTimeSec * 1000,
      totalTime: trainTimeSec * 1000,
    });
    this.scene.events.emit('queue-changed', this.getQueueState());
    return true;
  }

  update(delta: number): void {
    if (this.queue.length === 0) return;

    const entry = this.queue[0];
    entry.timeRemaining -= delta;

    if (entry.timeRemaining <= 0) {
      this.queue.shift();
      const unit = this.spawnFn(entry.unitType, entry.team);
      this.scene.events.emit('unit-trained', unit);
      this.scene.events.emit('queue-changed', this.getQueueState());
    }
  }

  cancelAll(): void {
    this.queue = [];
    this.scene.events.emit('queue-changed', this.getQueueState());
  }

  getQueueState(): { queue: QueueEntry[]; progress: number } {
    const progress = this.queue.length > 0
      ? 1 - this.queue[0].timeRemaining / this.queue[0].totalTime
      : 0;
    return { queue: [...this.queue], progress };
  }

  getLength(): number {
    return this.queue.length;
  }

  getCurrentProgress(): number {
    if (this.queue.length === 0) return 0;
    return 1 - this.queue[0].timeRemaining / this.queue[0].totalTime;
  }
}
