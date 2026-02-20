/**
 * Manages gold resource with passive income and per-building income bonuses.
 * Pure TS class — no Phaser dependency beyond the event emitter reference.
 */
export class EconomyManager {
  private gold: number;
  private incomePerSecond: number;
  private accumulatedTime: number = 0;
  private readonly eventEmitter: Phaser.Events.EventEmitter;

  constructor(eventEmitter: Phaser.Events.EventEmitter, startingGold = 200, baseIncomePerSecond = 2) {
    this.gold = startingGold;
    this.incomePerSecond = baseIncomePerSecond;
    this.eventEmitter = eventEmitter;
  }

  update(delta: number): void {
    this.accumulatedTime += delta / 1000;
    if (this.accumulatedTime >= 1) {
      const ticks = Math.floor(this.accumulatedTime);
      this.accumulatedTime -= ticks;
      this.addGold(this.incomePerSecond * ticks);
    }
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.eventEmitter.emit('gold-changed', this.gold);
  }

  /** Returns false and does nothing if insufficient gold. */
  spendGold(cost: number): boolean {
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.eventEmitter.emit('gold-changed', this.gold);
    return true;
  }

  getGold(): number {
    return this.gold;
  }

  /** Add a building income bonus (e.g. +1 gold/sec per monastery). */
  addIncomeBuilding(bonus: number): void {
    this.incomePerSecond += bonus;
  }
}
