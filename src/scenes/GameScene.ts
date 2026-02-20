import Phaser from "phaser";
import { Unit, UnitType, ICombatScene } from "../entities/Unit";
import { Building } from "../entities/Building";
import { Pathfinding } from "../systems/Pathfinding";
import { EconomyManager } from "../systems/EconomyManager";
import { ProductionQueue } from "../systems/ProductionQueue";

/** Tile size in pixels */
const TILE_SIZE = 64;
/** World dimensions */
const WORLD_COLS = 60;
const WORLD_ROWS = 40;
const DETECTION_RANGE = 400;

export class GameScene extends Phaser.Scene implements ICombatScene {
	public units: Unit[] = [];
	private selectedUnits: Unit[] = [];
	private selectionBox: Phaser.GameObjects.Rectangle | null = null;
	private selectionStart: Phaser.Math.Vector2 | null = null;
	private isSelecting = false;
	private unitCountText!: Phaser.GameObjects.Text;
	private pathfinding!: Pathfinding;
	public economy!: EconomyManager;
	private buildings: Building[] = [];

	constructor() {
		super({ key: "GameScene" });
	}

	create(): void {
		this.pathfinding = new Pathfinding(WORLD_COLS * TILE_SIZE, WORLD_ROWS * TILE_SIZE, TILE_SIZE);
		this.economy = new EconomyManager(this.events, 200, 2);

		this.createTerrain();
		this.placeBuildings();
		this.spawnDemoUnits();
		this.spawnEnemyUnits();
		this.setupInput();
		this.setupCameraZoom();
		this.createUI();

		this.scene.launch("HUDScene");
	}

	private static readonly MIN_ZOOM = 0.4;
	private static readonly MAX_ZOOM = 2.0;

	private setupCameraZoom(): void {
		this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _go: unknown, _dx: number, _dy: number, dz: number) => {
			const cam = this.cameras.main;
			const rate = 1 - dz * 0.001;
			const newZoom = Phaser.Math.Clamp(cam.zoom * rate, GameScene.MIN_ZOOM, GameScene.MAX_ZOOM);
			cam.setZoom(newZoom);
		});
	}

	private createUI(): void {
		const instructions = this.add.text(10, 10, "Left-click: Select | Right-click: Move | Scroll: Zoom", {
			fontSize: "14px",
			fontFamily: "Arial",
			color: "#ffffff",
			backgroundColor: "#000000",
			padding: { x: 5, y: 5 },
		});
		instructions.setDepth(200).setScrollFactor(0);

		this.unitCountText = this.add.text(10, 45, "", {
			fontSize: "14px",
			fontFamily: "Arial",
			color: "#ffffff",
		});
		this.unitCountText.setDepth(200).setScrollFactor(0);
		this.updateUnitCountText();
	}

	private updateUnitCountText(): void {
		const player = this.units.filter((u) => u.team === "player").length;
		const enemy = this.units.filter((u) => u.team === "enemy").length;
		this.unitCountText.setText(`Your units: ${player}  Enemies: ${enemy}`);
	}

	private createTerrain(): void {
		this.cameras.main.setBackgroundColor(0x3d5a3d);
	}

	/** Place medieval buildings. Uses Building instances with ProductionQueue where applicable. */
	private placeBuildings(): void {
		const d = 50;

		const castleX = 6 * TILE_SIZE;
		const castleY = 6 * TILE_SIZE;
		if (this.textures.exists("building-castle")) {
			const castle = new Building(this, castleX, castleY, "building-castle", "castle", null);
			castle.setDisplaySize(160, 128).setDepth(d);
			this.buildings.push(castle);
			this.pathfinding.markBuildingBlocked(castleX, castleY, 160, 128);
		}

		const barX = 2 * TILE_SIZE;
		const barY = 6 * TILE_SIZE;
		if (this.textures.exists("building-barracks")) {
			const barQueue = new ProductionQueue(this, this.economy, (type, team) =>
				this.createUnit(barX, barY + 80, type, team)
			);
			const bar = new Building(this, barX, barY, "building-barracks", "barracks", barQueue);
			bar.setDisplaySize(96, 128).setDepth(d);
			this.buildings.push(bar);
			this.pathfinding.markBuildingBlocked(barX, barY, 96, 128);
		}

		const archX = 10 * TILE_SIZE;
		const archY = 6 * TILE_SIZE;
		if (this.textures.exists("building-archery")) {
			const archQueue = new ProductionQueue(this, this.economy, (type, team) =>
				this.createUnit(archX, archY + 80, type, team)
			);
			const arch = new Building(this, archX, archY, "building-archery", "archery", archQueue);
			arch.setDisplaySize(96, 128).setDepth(d);
			this.buildings.push(arch);
			this.pathfinding.markBuildingBlocked(archX, archY, 96, 128);
		}

		const towerX = 14 * TILE_SIZE;
		const towerY = 5 * TILE_SIZE;
		if (this.textures.exists("building-tower")) {
			const tower = new Building(this, towerX, towerY, "building-tower", "tower", null);
			tower.setDisplaySize(64, 128).setDepth(d);
			this.buildings.push(tower);
			this.pathfinding.markBuildingBlocked(towerX, towerY, 64, 128);
		}
	}

	/** Spawn player army. */
	private spawnDemoUnits(): void {
		const cx = 6 * TILE_SIZE;
		const cy = 9 * TILE_SIZE;
		this.createUnit(cx - 80, cy, "knight", "player");
		this.createUnit(cx - 40, cy + 20, "knight", "player");
		this.createUnit(cx, cy - 20, "footman", "player");
		this.createUnit(cx + 50, cy, "footman", "player");
		this.createUnit(cx + 90, cy + 15, "footman", "player");
		this.createUnit(cx - 60, cy + 70, "archer", "player");
		this.createUnit(cx + 30, cy + 70, "archer", "player");
		this.createUnit(cx + 120, cy + 60, "peasant", "player");
		this.createUnit(cx + 160, cy + 80, "peasant", "player");
	}

	/** Spawn enemy units. */
	private spawnEnemyUnits(): void {
		const ex = 20 * TILE_SIZE;
		const ey = 8 * TILE_SIZE;
		this.createUnit(ex, ey, "knight", "enemy");
		this.createUnit(ex + 60, ey + 30, "knight", "enemy");
		this.createUnit(ex + 120, ey - 20, "footman", "enemy");
		this.createUnit(ex + 180, ey + 10, "footman", "enemy");
		this.createUnit(ex + 80, ey + 80, "archer", "enemy");
	}

	public createUnit(x: number, y: number, unitType: UnitType = "knight", team: "player" | "enemy" = "player"): Unit {
		const unit = new Unit(this, x, y, unitType, team);
		unit.setDepth(100);
		this.units.push(unit);
		return unit;
	}

	/** Get enemy units within a given unit's attack range. */
	getEnemiesInRange(unit: Unit): Unit[] {
		return this.units.filter(
			(u) => u.active && u.team !== unit.team && Phaser.Math.Distance.Between(unit.x, unit.y, u.x, u.y) <= unit.getAttackRange()
		);
	}

	/** Melee slash effect between attacker and target (team-colored). */
	showSlash(attacker: Unit, target: Unit): void {
		const color = attacker.team === "player" ? 0xffdd44 : 0xdd6644;
		const g = this.add.graphics();
		g.setDepth(110);
		g.lineStyle(6, color, 0.9);
		g.lineBetween(attacker.x, attacker.y, target.x, target.y);
		this.time.delayedCall(120, () => g.destroy());
	}

	/** Spawn team-colored arrow from attacker to target; applies damage when it hits. */
	spawnArrow(attacker: Unit, target: Unit, damage: number): void {
		const isPlayer = attacker.team === "player";
		const shaftColor = isPlayer ? 0x2a5a9e : 0x6b2a2a;
		const tipColor = isPlayer ? 0x1a3a6e : 0x3a1a1a;

		if (this.textures.exists("effect-muzzle")) {
			const muzzle = this.add.sprite(attacker.x, attacker.y, "effect-muzzle");
			muzzle.setDepth(106).setDisplaySize(28, 28);
			muzzle.play("muzzle-flash");
			muzzle.once("animationcomplete", () => muzzle.destroy());
		}

		const arrow = this.add.graphics();
		arrow.setDepth(105);
		const len = 24;
		const w = 4;
		arrow.fillStyle(shaftColor, 1);
		arrow.fillRect(-len / 2, -w / 2, len, w);
		arrow.fillStyle(tipColor, 1);
		arrow.fillTriangle(len / 2 - 4, 0, len / 2, -6, len / 2, 6);
		arrow.setPosition(attacker.x, attacker.y);
		const angle = Phaser.Math.Angle.Between(attacker.x, attacker.y, target.x, target.y);
		arrow.setRotation(angle);

		this.tweens.add({
			targets: arrow,
			x: target.x,
			y: target.y,
			duration: 220,
			ease: "Linear",
			onComplete: () => {
				arrow.destroy();
				if (target.active) target.takeDamage(damage);
			},
		});
	}

	private setupInput(): void {
		this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			if (pointer.leftButtonDown()) {
				this.startSelection(pointer);
			}
		});

		this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
			if (this.isSelecting && pointer.leftButtonDown()) {
				this.updateSelectionBox(pointer);
			}
		});

		this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
			if (pointer.leftButtonReleased()) {
				this.endSelection(pointer);
			}
		});

		this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			if (pointer.rightButtonDown()) {
				this.moveSelectedUnits(pointer.worldX, pointer.worldY);
			}
		});

		this.input.mouse?.disableContextMenu();
	}

	private startSelection(pointer: Phaser.Input.Pointer): void {
		this.isSelecting = true;
		this.selectionStart = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
		this.selectionBox = this.add.rectangle(pointer.worldX, pointer.worldY, 0, 0, 0x44ff44, 0.2);
		this.selectionBox.setStrokeStyle(2, 0x44ff44).setOrigin(0, 0).setDepth(150);
	}

	private updateSelectionBox(pointer: Phaser.Input.Pointer): void {
		if (!this.selectionBox || !this.selectionStart) return;

		const width = pointer.worldX - this.selectionStart.x;
		const height = pointer.worldY - this.selectionStart.y;

		if (width < 0) {
			this.selectionBox.x = pointer.worldX;
			this.selectionBox.width = Math.abs(width);
		} else {
			this.selectionBox.x = this.selectionStart.x;
			this.selectionBox.width = width;
		}

		if (height < 0) {
			this.selectionBox.y = pointer.worldY;
			this.selectionBox.height = Math.abs(height);
		} else {
			this.selectionBox.y = this.selectionStart.y;
			this.selectionBox.height = height;
		}
	}

	private endSelection(pointer: Phaser.Input.Pointer): void {
		this.selectedUnits.forEach((unit) => unit.deselect());
		this.selectedUnits = [];

		if (this.selectionBox && this.selectionStart) {
			const boxBounds = this.selectionBox.getBounds();

			if (boxBounds.width < 5 && boxBounds.height < 5) {
				const clickedUnit = this.getUnitAtPosition(pointer.worldX, pointer.worldY);
				if (clickedUnit && clickedUnit.team === "player") {
					clickedUnit.select();
					this.selectedUnits.push(clickedUnit);
				}
			} else {
				this.units.forEach((unit) => {
					if (unit.team === "player" && boxBounds.contains(unit.x, unit.y)) {
						unit.select();
						this.selectedUnits.push(unit);
					}
				});
			}

			this.selectionBox.destroy();
			this.selectionBox = null;
		}

		this.isSelecting = false;
		this.selectionStart = null;

		// Notify HUD of selected units
		const hudScene = this.scene.get("HUDScene") as Phaser.Scene | null;
		if (hudScene) {
			this.events.emit("selection-changed", this.selectedUnits);
		}
	}

	private getUnitAtPosition(x: number, y: number): Unit | null {
		for (const unit of this.units) {
			if (Phaser.Math.Distance.Between(x, y, unit.x, unit.y) < 45) {
				return unit;
			}
		}
		return null;
	}

	private moveSelectedUnits(targetX: number, targetY: number): void {
		const spacing = TILE_SIZE;
		const unitsPerRow = Math.ceil(Math.sqrt(this.selectedUnits.length));
		this.selectedUnits = this.selectedUnits.filter((u) => u.team === "player");

		this.selectedUnits.forEach((unit, index) => {
			const row = Math.floor(index / unitsPerRow);
			const col = index % unitsPerRow;

			const offsetX = (col - (unitsPerRow - 1) / 2) * spacing;
			const offsetY = (row - (Math.ceil(this.selectedUnits.length / unitsPerRow) - 1) / 2) * spacing;

			const destX = targetX + offsetX;
			const destY = targetY + offsetY;

			const path = this.pathfinding.findPathSmooth(unit.x, unit.y, destX, destY);
			if (path.length > 0) {
				unit.setWaypoints(path);
			} else {
				unit.commandMove(destX, destY);
			}
		});
	}

	preUpdate(): void {
		this.units = this.units.filter((u) => u.active);
		this.selectedUnits = this.selectedUnits.filter((u) => u.active);
		this.units.forEach((u) => (u.otherUnits = this.units.filter((o) => o !== u)));
	}

	update(_time: number, delta: number): void {
		this.economy.update(delta);
		this.buildings.forEach((b) => b.getQueue()?.update(delta));

		this.runEnemyAI();
		this.runCombat();
		this.updateUnitCountText();
	}

	private runEnemyAI(): void {
		const playerUnits = this.units.filter((u) => u.active && u.team === "player");
		if (playerUnits.length === 0) return;

		this.units.forEach((unit) => {
			if (!unit.active || unit.team !== "enemy") return;
			if (unit.hasChaseTarget()) return;

			const closest = playerUnits.reduce((a, b) =>
				Phaser.Math.Distance.Between(unit.x, unit.y, a.x, a.y) <
				Phaser.Math.Distance.Between(unit.x, unit.y, b.x, b.y)
					? a
					: b
			);

			const dist = Phaser.Math.Distance.Between(unit.x, unit.y, closest.x, closest.y);
			if (dist <= unit.getAttackRange()) {
				// Already in range — combat loop handles attack
			} else if (dist <= DETECTION_RANGE) {
				unit.setChaseTarget(closest);
			}
		});
	}

	private runCombat(): void {
		this.units.forEach((unit) => {
			if (!unit.active || !unit.attackCooldownReady) return;
			const enemies = this.getEnemiesInRange(unit);
			if (enemies.length === 0) return;
			const closest = enemies.reduce((a, b) =>
				Phaser.Math.Distance.Between(unit.x, unit.y, a.x, a.y) <
				Phaser.Math.Distance.Between(unit.x, unit.y, b.x, b.y)
					? a
					: b
			);
			unit.attack(closest);
		});
	}
}
