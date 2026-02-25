import Phaser from "phaser";

/** Medieval unit types. */
export type UnitType = "knight" | "footman" | "archer" | "peasant" | "lancer";

/** Scene interface for combat effects (slash, arrow) so Unit does not depend on GameScene. */
export interface ICombatScene {
	showSlash(attacker: Unit, target: Unit): void;
	spawnArrow(attacker: Unit, target: Unit, damage: number): void;
}

/** Base texture/anim keys per unit type (suffix -blue or -red by team). buildAnim optional; if missing, build uses idle. */
const UNIT_MAP: Record<
	UnitType,
	{ sheet: string; idleAnim: string; runAnim: string; attackAnim: string; hitAnim: string; buildAnim?: string }
> = {
	knight: { sheet: "unit-warrior-idle", idleAnim: "warrior-idle", runAnim: "warrior-run", attackAnim: "warrior-attack", hitAnim: "warrior-guard" },
	footman: { sheet: "unit-pawn-idle", idleAnim: "pawn-idle", runAnim: "pawn-run", attackAnim: "pawn-attack", hitAnim: "pawn-idle" },
	archer: { sheet: "unit-archer-idle", idleAnim: "archer-idle", runAnim: "archer-run", attackAnim: "archer-attack", hitAnim: "archer-idle" },
	peasant: { sheet: "unit-pawn-idle", idleAnim: "pawn-idle", runAnim: "pawn-run", attackAnim: "pawn-idle", hitAnim: "pawn-idle", buildAnim: "pawn-work" },
	lancer: { sheet: "unit-lancer-idle", idleAnim: "lancer-idle", runAnim: "lancer-run", attackAnim: "lancer-attack", hitAnim: "lancer-idle" },
};

/** Stats per unit type */
const UNIT_CONFIG: Record<
	UnitType,
	{ speed: number; size: number; health: number; attackRange: number; attackDamage: number; attackCooldownMs: number }
> = {
	knight: { speed: 100, size: 40, health: 120, attackRange: 50, attackDamage: 25, attackCooldownMs: 800 },
	footman: { speed: 90, size: 32, health: 80, attackRange: 40, attackDamage: 15, attackCooldownMs: 600 },
	archer: { speed: 85, size: 32, health: 50, attackRange: 180, attackDamage: 12, attackCooldownMs: 700 },
	peasant: { speed: 70, size: 32, health: 40, attackRange: 0, attackDamage: 0, attackCooldownMs: 0 },
	lancer: { speed: 110, size: 40, health: 100, attackRange: 55, attackDamage: 20, attackCooldownMs: 900 },
};

/** Display size for 192×192 unit sprite sheets. */
const UNIT_SPRITE_DISPLAY_SIZE = 104;

export type Team = "player" | "enemy";

export class Unit extends Phaser.GameObjects.Container {
	private sprite: Phaser.GameObjects.Sprite;
	private healthBar: Phaser.GameObjects.Graphics;
	private isSelected = false;
	private targetPosition: Phaser.Math.Vector2 | null = null;
	private moveSpeed: number;
	private maxHealth: number;
	private currentHealth: number;
	public readonly unitType: UnitType;
	public readonly team: Team;
	private _displayHeight: number;
	private idleAnim: string;
	private runAnim: string;
	private attackAnim: string;
	private hitAnim: string;
	private buildAnim: string;
	private _wasMoving: boolean = false;
	private _playingAttack = false;

	private attackRange: number;
	private attackDamage: number;
	private attackCooldownMs: number;
	private _attackCooldownRemaining = 0;

	/** Live-tracking enemy target set by AI or player command-attack. */
	private _chaseTarget: Unit | null = null;

	/** A* waypoints; index advances as each waypoint is reached. */
	private _waypoints: Phaser.Math.Vector2[] = [];
	private _waypointIndex = 0;

	/** When true, unit is playing build/work animation at a construction site. */
	private _playingBuild = false;

	constructor(scene: Phaser.Scene, x: number, y: number, unitType: UnitType = "knight", team: Team = "player") {
		super(scene, x, y);
		this.unitType = unitType;
		this.team = team;

		const config = UNIT_CONFIG[unitType];
		this.moveSpeed = config.speed;
		this.maxHealth = config.health;
		this.currentHealth = config.health;
		this.attackRange = config.attackRange;
		this.attackDamage = config.attackDamage;
		this.attackCooldownMs = config.attackCooldownMs;

		const color: "blue" | "red" = team === "player" ? "blue" : "red";
		const base = UNIT_MAP[unitType];
		const sheet = `${base.sheet}-${color}`;
		if (scene.textures.exists(sheet)) {
			this._displayHeight = UNIT_SPRITE_DISPLAY_SIZE;
			this.idleAnim = `${base.idleAnim}-${color}`;
			this.runAnim = `${base.runAnim}-${color}`;
			this.attackAnim = `${base.attackAnim}-${color}`;
			this.hitAnim = `${base.hitAnim}-${color}`;
			this.buildAnim = base.buildAnim ? `${base.buildAnim}-${color}` : "";
			this.sprite = scene.add.sprite(0, 0, sheet);
			this.sprite.play(this.idleAnim);
			this.sprite.setDisplaySize(this._displayHeight, this._displayHeight);
		} else {
			this._displayHeight = config.size;
			this.idleAnim = "";
			this.runAnim = "";
			this.attackAnim = "";
			this.hitAnim = "";
			this.buildAnim = "";
			this.sprite = scene.add.sprite(0, 0, `unit-${unitType}`);
			this.sprite.setDisplaySize(this._displayHeight, this._displayHeight);
		}
		this.add(this.sprite);
		if (scene.sys?.updateList) scene.sys.updateList.add(this.sprite);

		scene.add.existing(this);

		this.healthBar = scene.add.graphics();
		this.add(this.healthBar);
		this.updateHealthBar();

		scene.physics.add.existing(this);
		const physicsBody = this.body as Phaser.Physics.Arcade.Body;
		const bodySize = this._displayHeight * 0.6;
		if (physicsBody) {
			physicsBody.setCollideWorldBounds(true);
			physicsBody.setSize(bodySize, bodySize);
		}
	}

	private updateHealthBar(): void {
		const barWidth = 40;
		const barHeight = 5;
		const yOffset = -this._displayHeight * 0.6;

		this.healthBar.clear();

		this.healthBar.fillStyle(0x440000, 0.8);
		this.healthBar.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);

		const healthPercent = this.currentHealth / this.maxHealth;
		const fillColor = healthPercent > 0.5 ? 0x44aa44 : healthPercent > 0.25 ? 0xaaaa44 : 0xaa4444;
		this.healthBar.fillStyle(fillColor, 1);
		this.healthBar.fillRect(-barWidth / 2, yOffset, barWidth * healthPercent, barHeight);

		this.healthBar.lineStyle(this.isSelected ? 2 : 1, this.isSelected ? 0x44ff44 : 0x000000, this.isSelected ? 1 : 0.5);
		this.healthBar.strokeRect(-barWidth / 2, yOffset, barWidth, barHeight);

		this.healthBar.setVisible(this.isSelected || this.currentHealth < this.maxHealth);
	}

	/** Apply damage to this unit. Returns true if unit died. */
	takeDamage(amount: number): boolean {
		this.currentHealth = Math.max(0, this.currentHealth - amount);
		this.updateHealthBar();

		if (this.hitAnim && this.scene.anims.exists(this.hitAnim)) {
			this.sprite.play(this.hitAnim);
			this.sprite.once("animationcomplete", () => {
				if (this.active && this.idleAnim) this.sprite.play(this.idleAnim);
			});
		}
		this.sprite.setTint(0xff0000);
		this.scene.time.delayedCall(100, () => {
			if (!this.active) return;
			this.sprite.clearTint();
		});

		if (this.currentHealth <= 0) {
			this.die();
			return true;
		}
		return false;
	}

	private die(): void {
		this.playExplosion();
		this.destroy();
	}

	private playExplosion(): void {
		const explosion = this.scene.add.sprite(this.x, this.y, 'effect-explosion');
		explosion.setDisplaySize(64, 64);
		explosion.play('explosion');
		explosion.on('animationcomplete', () => explosion.destroy());
	}

	select(): void {
		this.isSelected = true;
		this.updateHealthBar();
	}

	deselect(): void {
		this.isSelected = false;
		this.updateHealthBar();
	}

	/** Command unit to move to a specific world position (player override — clears waypoints and chase). */
	commandMove(x: number, y: number): void {
		this._waypoints = [];
		this._waypointIndex = 0;
		this._chaseTarget = null;
		this.targetPosition = new Phaser.Math.Vector2(x, y);
	}

	/**
	 * Set a multi-waypoint path from A*.
	 * Unit advances through waypoints automatically.
	 */
	setWaypoints(path: Phaser.Math.Vector2[]): void {
		this._waypoints = path;
		this._waypointIndex = 0;
		this.targetPosition = path.length > 0 ? path[0] : null;
	}

	/**
	 * Set a live-tracking chase target (enemy AI or attack-move).
	 * Clears waypoints so position is updated every frame.
	 */
	setChaseTarget(unit: Unit | null): void {
		this._chaseTarget = unit;
		this._waypoints = [];
		this._waypointIndex = 0;
		if (unit) {
			this.targetPosition = new Phaser.Math.Vector2(unit.x, unit.y);
		}
	}

	get attackCooldownReady(): boolean {
		return this._attackCooldownRemaining <= 0 && this.attackCooldownMs > 0;
	}

	hasChaseTarget(): boolean {
		return this._chaseTarget !== null && this._chaseTarget.active;
	}

	getAttackRange(): number {
		return this.attackRange;
	}

	/** Attack a target; resets cooldown, clears move order, and triggers combat visuals. */
	attack(target: Unit): void {
		if (!target.active) return;
		this.sprite.setFlipX(target.x < this.x);
		this._attackCooldownRemaining = this.attackCooldownMs;
		this.targetPosition = null;

		const combat = this.scene as unknown as ICombatScene;
		if (typeof combat.spawnArrow !== "function" || typeof combat.showSlash !== "function") {
			target.takeDamage(this.attackDamage);
			return;
		}

		const playAttackThenIdle = (): void => {
			if (this.attackAnim && this.scene.anims.exists(this.attackAnim)) {
				this._playingAttack = true;
				this.sprite.off("animationcomplete", this._onAttackAnimComplete, this);
				this.sprite.once("animationcomplete", this._onAttackAnimComplete, this);
				this.sprite.play(this.attackAnim);
			} else if (this.runAnim && this.idleAnim) {
				this.sprite.play(this.runAnim);
				this.scene.time.delayedCall(250, () => {
					if (this.active) this.sprite.play(this.idleAnim);
				});
			}
		};

		if (this.unitType === "archer") {
			playAttackThenIdle();
			combat.spawnArrow(this, target, this.attackDamage);
			return;
		}

		playAttackThenIdle();
		combat.showSlash(this, target);
		this.scene.time.delayedCall(280, () => {
			if (target.active) target.takeDamage(this.attackDamage);
		});
	}

	private _onAttackAnimComplete = (): void => {
		this._playingAttack = false;
		this.sprite.off("animationcomplete", this._onAttackAnimComplete, this);
		if (this.active && this.idleAnim) this.sprite.play(this.idleAnim);
	};

	update(time: number, delta: number): void {
		if (this._attackCooldownRemaining > 0) {
			this._attackCooldownRemaining = Math.max(0, this._attackCooldownRemaining - delta);
		}

		// Live-track chase target position
		if (this._chaseTarget && this._chaseTarget.active) {
			const dist = Phaser.Math.Distance.Between(this.x, this.y, this._chaseTarget.x, this._chaseTarget.y);
			if (dist > this.attackRange * 1.1) {
				this.targetPosition = new Phaser.Math.Vector2(this._chaseTarget.x, this._chaseTarget.y);
			}
		} else if (this._chaseTarget && !this._chaseTarget.active) {
			this._chaseTarget = null;
		}

		const moving = this.targetPosition !== null;

		if (this._playingAttack) {
			// Keep idle/attack animation running uninterrupted
		} else if (this.runAnim && this.idleAnim && moving !== this._wasMoving) {
			this._wasMoving = moving;
			this.sprite.play(moving ? this.runAnim : this.idleAnim);
		}

		if (moving && !this._playingAttack) {
			const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetPosition!.x, this.targetPosition!.y);
			this.sprite.setFlipX(Math.cos(angle) < 0);
		}

		if (!this.targetPosition) {
			this.applyPhysicsVelocity(0, 0);
			this.applySeparation(delta / 1000);
			return;
		}

		const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetPosition.x, this.targetPosition.y);

		if (distance < 5) {
			// Advance to next waypoint if available
			if (this._waypoints.length > 0 && this._waypointIndex < this._waypoints.length - 1) {
				this._waypointIndex++;
				this.targetPosition = this._waypoints[this._waypointIndex];
			} else {
				this._waypoints = [];
				this._waypointIndex = 0;
				this.targetPosition = null;
				this.applyPhysicsVelocity(0, 0);
			}
			this.applySeparation(delta / 1000);
			return;
		}

		const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetPosition.x, this.targetPosition.y);
		const vx = Math.cos(angle) * this.moveSpeed;
		const vy = Math.sin(angle) * this.moveSpeed;
		this.applyPhysicsVelocity(vx, vy);

		this.applySeparation(delta / 1000);
	}

	private applyPhysicsVelocity(vx: number, vy: number): void {
		const body = this.body as Phaser.Physics.Arcade.Body | null;
		if (body) {
			body.setVelocity(vx, vy);
		} else {
			// Fallback for containers without physics
			if (vx !== 0 || vy !== 0) {
				const dt = 1 / 60;
				this.x += vx * dt;
				this.y += vy * dt;
			}
		}
	}

	/** Set by GameScene each frame. Used for separation so units don't overlap. */
	public otherUnits: Unit[] = [];

	private static readonly SEPARATION_RADIUS = 55;
	private static readonly SEPARATION_STRENGTH = 90;

	private applySeparation(deltaSec: number): void {
		if (this.otherUnits.length === 0) return;
		let dx = 0;
		let dy = 0;
		for (const other of this.otherUnits) {
			if (!other.active || other === this) continue;
			const dist = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
			if (dist < Unit.SEPARATION_RADIUS && dist > 0) {
				const push = (1 - dist / Unit.SEPARATION_RADIUS) * Unit.SEPARATION_STRENGTH * deltaSec;
				dx += (this.x - other.x) / dist * push;
				dy += (this.y - other.y) / dist * push;
			}
		}
		this.x += dx;
		this.y += dy;
	}

	/** Play build/work animation at construction site. Uses dedicated buildAnim if present (e.g. from asset pack), else idle. */
	playBuildAnimation(): void {
		if (this._playingBuild) return;
		this._playingBuild = true;
		const anim = this.buildAnim && this.scene.anims.exists(this.buildAnim) ? this.buildAnim : this.idleAnim;
		if (anim && this.scene.anims.exists(anim)) {
			this.sprite.play(anim);
		}
	}

	/** Stop build animation and return to idle. */
	stopBuildAnimation(): void {
		if (!this._playingBuild) return;
		this._playingBuild = false;
		if (this.idleAnim && this.scene.anims.exists(this.idleAnim)) {
			this.sprite.play(this.idleAnim);
		}
	}

	getIsSelected(): boolean {
		return this.isSelected;
	}

	getCurrentHealth(): number {
		return this.currentHealth;
	}

	getMaxHealth(): number {
		return this.maxHealth;
	}
}
