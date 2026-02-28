import Phaser from "phaser";
import { Unit, UnitType, ICombatScene } from "../entities/Unit";
import { Building, BuildingType } from "../entities/Building";
import { Pathfinding } from "../systems/Pathfinding";
import { EconomyManager } from "../systems/EconomyManager";
import { ProductionQueue } from "../systems/ProductionQueue";
import { TerrainMap, TerrainRenderer, generateTerrain, TILE_SIZE, TerrainLevel, SavedMapData } from "../terrain";

/** Set to true or ?tileDebug=1 to log terrain generation details. */
const DEBUG_TERRAIN =
	typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tileDebug") === "1";
/** World dimensions */
const WORLD_COLS = 60;
const WORLD_ROWS = 40;
const DETECTION_RANGE = 400;
const EDGE_PAN_MARGIN = 40;
const EDGE_PAN_SPEED = 480;
const KEYBOARD_PAN_SPEED = 400;

export class GameScene extends Phaser.Scene implements ICombatScene {
	public units: Unit[] = [];
	private selectedUnits: Unit[] = [];
	private selectionBox: Phaser.GameObjects.Rectangle | null = null;
	private selectionStart: Phaser.Math.Vector2 | null = null;
	private isSelecting = false;
	private pathfinding!: Pathfinding;
	public economy!: EconomyManager;
	private buildings: Building[] = [];
	private terrain!: TerrainMap;
	private terrainRenderer!: TerrainRenderer;
	// Build mode state
	private buildMode = false;
	private buildPreview: Phaser.GameObjects.Sprite | null = null;
	private selectedBuildingType: string | null = null;
	private buildModeWorker: Unit | null = null;
	private buildingUnderConstruction: {
		building: Building;
		worker: Unit;
		progress: number;
		duration: number;
		progressBar: Phaser.GameObjects.Graphics;
	} | null = null;
	private cursorKeys?: Phaser.Types.Input.Keyboard.CursorKeys;
	private wasdKeys?: {
		W: Phaser.Input.Keyboard.Key;
		A: Phaser.Input.Keyboard.Key;
		S: Phaser.Input.Keyboard.Key;
		D: Phaser.Input.Keyboard.Key;
	};
	private static readonly BUILD_DURATION_MS = 4000;
	private static readonly BUILD_SITE_RADIUS = 80;

	constructor() {
		super({ key: "GameScene" });
	}

	create(): void {
		const savedMap = this.registry.get("savedMapData") as SavedMapData | undefined;
		const mapWidth = savedMap ? savedMap.width : WORLD_COLS;
		const mapHeight = savedMap ? savedMap.height : WORLD_ROWS;
		this.pathfinding = new Pathfinding(mapWidth * TILE_SIZE, mapHeight * TILE_SIZE, TILE_SIZE);
		this.economy = new EconomyManager(this.events, 200, 2);

		this.createTerrain();
		if (savedMap?.entities != null) {
			this.spawnEntitiesFromData(savedMap.entities);
		} else {
			this.placeBuildings();
			this.spawnDemoUnits();
			this.spawnEnemyUnits();
		}
		this.setupInput();
		this.setupCameraZoom();
		this.bindEvents();

		this.scene.launch("HUDScene");

		if (new URLSearchParams(window.location.search).get("tileDebug") === "1") {
			this.scene.pause();
			this.scene.launch("TileDebugScene");
		}
	}

	private setupCameraZoom(): void {
		const cam = this.cameras.main;
		const worldWidth = this.terrain.width * TILE_SIZE;
		const worldHeight = this.terrain.height * TILE_SIZE;

		/** Zoom at which the entire map fits in view; we disallow going past this (stay strictly zoomed in). */
		const computeFitZoom = (): number => {
			return Math.max(cam.width / worldWidth, cam.height / worldHeight);
		};

		const MAX_ZOOM = 2.5;
		const MIN_ZOOM_MULTIPLIER = 2; // Strictly > 1 so we never show the full map

		cam.setBounds(0, 0, worldWidth, worldHeight);

		const getMinZoom = (): number => computeFitZoom() * MIN_ZOOM_MULTIPLIER;
		const getMaxZoom = (): number => MAX_ZOOM;

		const applyZoom = (newZoom: number): void => {
			cam.setZoom(Phaser.Math.Clamp(newZoom, getMinZoom(), getMaxZoom()));
		};

		applyZoom(getMinZoom());

		this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
			const rate = 1 - dy * 0.001;
			applyZoom(cam.zoom * rate);
		});

		this.scale.on("resize", () => {
			applyZoom(cam.zoom);
		});
	}

	private createTerrain(): void {
		const savedMap = this.registry.get('savedMapData') as SavedMapData | undefined;
		if (savedMap) {
			this.terrain = TerrainMap.fromData(savedMap);
			this.registry.remove('savedMapData');
		} else {
			// Generate terrain using Tiny Swords-style procedural generation
			this.terrain = generateTerrain(WORLD_COLS, WORLD_ROWS, {
				waterRatio: 0.12,
				elevatedRegions: 4,
				createLakes: true,
				createCoast: true,
				seed: Math.floor(Math.random() * 100000),
			});
		}

		if (DEBUG_TERRAIN) {
			console.log("[DEBUG_TERRAIN] Terrain map:");
			this.terrain.debugPrint();
		}

		this.terrainRenderer = new TerrainRenderer(this, this.terrain);
		this.terrainRenderer.render();

		this.updatePathfindingFromTerrain();
	}

	private updatePathfindingFromTerrain(): void {
		const rows = this.terrain.height;
		const cols = this.terrain.width;
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const level = this.terrain.getLevel(row, col);
				this.pathfinding.setTerrainLevel(col, row, level);
			}
		}
	}

	private static readonly BUILDING_DISPLAY: Record<
		BuildingType,
		{ textureKey: string; width: number; height: number }
	> = {
		castle: { textureKey: "building-castle", width: 160, height: 128 },
		barracks: { textureKey: "building-barracks", width: 96, height: 128 },
		archery: { textureKey: "building-archery", width: 96, height: 128 },
		tower: { textureKey: "building-tower", width: 64, height: 128 },
		monastery: { textureKey: "building-monastery", width: 96, height: 128 },
	};

	private spawnEntitiesFromData(
		entities: NonNullable<SavedMapData["entities"]>,
	): void {
		const d = 50;
		for (const u of entities.units) {
			const x = this.terrain.toPixelX(u.col) + TILE_SIZE / 2;
			const y = this.terrain.toPixelY(u.row) + TILE_SIZE / 2;
			if (this.terrain.getLevel(u.row, u.col) >= TerrainLevel.FLAT) {
				this.createUnit(x, y, u.type as UnitType, u.team);
			}
		}
		for (const b of entities.buildings) {
			const type = b.type as BuildingType;
			const cfg = GameScene.BUILDING_DISPLAY[type];
			if (!cfg || !this.textures.exists(cfg.textureKey)) continue;
			const x = this.terrain.toPixelX(b.col) + TILE_SIZE / 2;
			const y = this.terrain.toPixelY(b.row) + TILE_SIZE / 2;
			const building = new Building(this, x, y, cfg.textureKey, type, null);
			building.setDisplaySize(cfg.width, cfg.height).setDepth(d);
			this.buildings.push(building);
			this.pathfinding.markBuildingBlocked(x, y, cfg.width, cfg.height);
		}
	}

	/** Check if a position is on walkable terrain (not water). */
	isWalkable(worldX: number, worldY: number): boolean {
		const col = Math.floor(worldX / TILE_SIZE);
		const row = Math.floor(worldY / TILE_SIZE);
		const level = this.terrain?.getLevel(row, col) ?? TerrainLevel.FLAT;
		return level >= TerrainLevel.FLAT;
	}

	/** Get terrain level at world position. */
	getTerrainLevel(worldX: number, worldY: number): TerrainLevel {
		const col = Math.floor(worldX / TILE_SIZE);
		const row = Math.floor(worldY / TILE_SIZE);
		return this.terrain?.getLevel(row, col) ?? TerrainLevel.FLAT;
	}

	/** Find a valid spawn position on walkable terrain near the given coordinates. */
	private findValidSpawnPosition(idealX: number, idealY: number, radius = 5): { x: number; y: number } | null {
		const idealCol = Math.floor(idealX / TILE_SIZE);
		const idealRow = Math.floor(idealY / TILE_SIZE);

		// Spiral search outward from ideal position
		for (let r = 0; r <= radius; r++) {
			for (let dr = -r; dr <= r; dr++) {
				for (let dc = -r; dc <= r; dc++) {
					if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue; // Only check perimeter
					const row = idealRow + dr;
					const col = idealCol + dc;
					if (row < 0 || row >= this.terrain.height || col < 0 || col >= this.terrain.width) continue;
					if (this.terrain.getLevel(row, col) >= TerrainLevel.FLAT) {
						return {
							x: col * TILE_SIZE + TILE_SIZE / 2,
							y: row * TILE_SIZE + TILE_SIZE / 2,
						};
					}
				}
			}
		}
		return null;
	}

	/** Place medieval buildings on valid terrain. */
	private placeBuildings(): void {
		const d = 50;

		// Find valid positions for buildings (away from water)
		const castlePos = this.findValidSpawnPosition(6 * TILE_SIZE, 6 * TILE_SIZE, 8);
		if (castlePos && this.textures.exists("building-castle")) {
			const castle = new Building(this, castlePos.x, castlePos.y, "building-castle", "castle", null);
			castle.setDisplaySize(160, 128).setDepth(d);
			this.buildings.push(castle);
			this.pathfinding.markBuildingBlocked(castlePos.x, castlePos.y, 160, 128);
		}

		const barPos = this.findValidSpawnPosition(2 * TILE_SIZE, 6 * TILE_SIZE, 8);
		if (barPos && this.textures.exists("building-barracks")) {
			const barQueue = new ProductionQueue(this, this.economy, (type, team) =>
				this.createUnit(barPos.x, barPos.y + 80, type, team),
			);
			const bar = new Building(this, barPos.x, barPos.y, "building-barracks", "barracks", barQueue);
			bar.setDisplaySize(96, 128).setDepth(d);
			this.buildings.push(bar);
			this.pathfinding.markBuildingBlocked(barPos.x, barPos.y, 96, 128);
		}

		const archPos = this.findValidSpawnPosition(10 * TILE_SIZE, 6 * TILE_SIZE, 8);
		if (archPos && this.textures.exists("building-archery")) {
			const archQueue = new ProductionQueue(this, this.economy, (type, team) =>
				this.createUnit(archPos.x, archPos.y + 80, type, team),
			);
			const arch = new Building(this, archPos.x, archPos.y, "building-archery", "archery", archQueue);
			arch.setDisplaySize(96, 128).setDepth(d);
			this.buildings.push(arch);
			this.pathfinding.markBuildingBlocked(archPos.x, archPos.y, 96, 128);
		}

		const towerPos = this.findValidSpawnPosition(14 * TILE_SIZE, 5 * TILE_SIZE, 8);
		if (towerPos && this.textures.exists("building-tower")) {
			const tower = new Building(this, towerPos.x, towerPos.y, "building-tower", "tower", null);
			tower.setDisplaySize(64, 128).setDepth(d);
			this.buildings.push(tower);
			this.pathfinding.markBuildingBlocked(towerPos.x, towerPos.y, 64, 128);
		}
	}

	/** Spawn player army on valid terrain. */
	private spawnDemoUnits(): void {
		const cx = 6 * TILE_SIZE;
		const cy = 9 * TILE_SIZE;

		const spawnUnit = (offsetX: number, offsetY: number, type: UnitType): void => {
			const pos = this.findValidSpawnPosition(cx + offsetX, cy + offsetY, 5);
			if (pos) this.createUnit(pos.x, pos.y, type, "player");
		};

		spawnUnit(-80, 0, "knight");
		spawnUnit(-40, 20, "knight");
		spawnUnit(0, -20, "footman");
		spawnUnit(50, 0, "footman");
		spawnUnit(90, 15, "footman");
		spawnUnit(-60, 70, "archer");
		spawnUnit(30, 70, "archer");
		spawnUnit(120, 60, "peasant");
		spawnUnit(160, 80, "peasant");
	}

	/** Spawn enemy units on valid terrain (opposite side of map). */
	private spawnEnemyUnits(): void {
		const ex = (this.terrain.width - 15) * TILE_SIZE;
		const ey = (this.terrain.height / 2) * TILE_SIZE;

		const spawnUnit = (offsetX: number, offsetY: number, type: UnitType): void => {
			const pos = this.findValidSpawnPosition(ex + offsetX, ey + offsetY, 8);
			if (pos) this.createUnit(pos.x, pos.y, type, "enemy");
		};

		spawnUnit(0, 0, "knight");
		spawnUnit(60, 30, "knight");
		spawnUnit(120, -20, "footman");
		spawnUnit(180, 10, "footman");
		spawnUnit(80, 80, "archer");
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
			(u) =>
				u.active &&
				u.team !== unit.team &&
				Phaser.Math.Distance.Between(unit.x, unit.y, u.x, u.y) <= unit.getAttackRange(),
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
		this.input.mouse?.disableContextMenu();
		const canvas = this.sys.game.canvas;
		if (canvas) {
			canvas.addEventListener("contextmenu", (e: MouseEvent) => {
				e.preventDefault();
				this.onRightClick(canvas, e);
			});
		}

		const keyboard = this.input.keyboard;
		if (keyboard) {
			this.cursorKeys = keyboard.createCursorKeys();
			this.wasdKeys = keyboard.addKeys("W,A,S,D") as {
				W: Phaser.Input.Keyboard.Key;
				A: Phaser.Input.Keyboard.Key;
				S: Phaser.Input.Keyboard.Key;
				D: Phaser.Input.Keyboard.Key;
			};
		}

		this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			if (pointer.leftButtonDown()) {
				if (this.buildMode) {
					this.placeBuilding(pointer.worldX, pointer.worldY);
				} else {
					this.startSelection(pointer);
				}
			}

			const isRightClick = pointer.button === 2 || pointer.rightButtonDown() || (pointer.buttons & 2) !== 0;
			if (isRightClick) {
				if (this.buildMode) {
					this.cancelBuildMode();
				} else {
					this.tryMoveSelectedUnitsTo(pointer.worldX, pointer.worldY);
				}
			}
		});

		this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
			if (this.buildMode && this.buildPreview) {
				this.buildPreview.setPosition(pointer.worldX, pointer.worldY);
				this.updateBuildPreviewValidity(pointer.worldX, pointer.worldY);
			}
			if (this.isSelecting && pointer.leftButtonDown()) {
				this.updateSelectionBox(pointer);
			}
		});

		this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
			if (pointer.leftButtonReleased()) {
				if (!this.buildMode) {
					this.endSelection(pointer);
				}
			}
		});
	}

	private bindEvents(): void {
		// Listen for unit-action events from HUDScene
		this.events.on("unit-action", (data: { unit: Unit; action: string }) => {
			switch (data.action) {
				case "build":
					this.enterBuildMode(data.unit);
					break;
				case "stop":
					data.unit.setChaseTarget(null);
					data.unit.setWaypoints([]);
					break;
				case "attack":
					// Attack nearest enemy — unit combat loop handles this automatically
					break;
				case "patrol":
				case "harvest":
				case "move":
					// Patrol/harvest/move require a target point — handled via right-click or future UI
					break;
			}
		});
		// Listen for building-type-selected events from HUDScene
		this.events.on("building-type-selected", (buildingType: string) => {
			this.selectedBuildingType = buildingType;
			if (this.buildPreview && this.textures.exists(buildingType)) {
				this.buildPreview.setTexture(buildingType);
			}
		});
	}

	private enterBuildMode(unit: Unit): void {
		this.buildMode = true;
		this.buildModeWorker = unit;
		this.selectedBuildingType = "building-barracks"; // Default building type

		// Notify HUDScene to show building type panel
		this.events.emit("build-mode-entered");

		// Create preview sprite
		if (this.textures.exists(this.selectedBuildingType)) {
			this.buildPreview = this.add.sprite(0, 0, this.selectedBuildingType);
			this.buildPreview.setAlpha(0.6).setDepth(200);
			this.buildPreview.setDisplaySize(96, 128);
			this.updateBuildPreviewValidity(0, 0);
		}
	}

	private cancelBuildMode(): void {
		this.buildMode = false;
		this.buildModeWorker = null;
		if (this.buildPreview) {
			this.buildPreview.destroy();
			this.buildPreview = null;
		}
		this.selectedBuildingType = null;
		this.events.emit("build-mode-exited");
	}

	private updateBuildPreviewValidity(x: number, y: number): void {
		if (!this.buildPreview) return;

		const isValid = this.isValidBuildLocation(x, y);
		if (isValid) {
			this.buildPreview.setTint(0x00ff00); // Green for valid
		} else {
			this.buildPreview.setTint(0xff0000); // Red for invalid
		}
	}

	private isValidBuildLocation(x: number, y: number): boolean {
		const buildingWidth = 96;
		const buildingHeight = 128;
		const worldW = this.terrain.width * TILE_SIZE;
		const worldH = this.terrain.height * TILE_SIZE;
		if (
			x < buildingWidth / 2 ||
			x > worldW - buildingWidth / 2 ||
			y < buildingHeight / 2 ||
			y > worldH - buildingHeight / 2
		) {
			return false;
		}

		// Check terrain is walkable (not water)
		if (!this.isWalkable(x, y)) return false;

		// Check if overlapping with existing buildings
		const overlapsBuilding = this.buildings.some((b) => {
			const dist = Phaser.Math.Distance.Between(x, y, b.x, b.y);
			return dist < 100; // Minimum spacing
		});
		if (overlapsBuilding) return false;

		// Check if overlapping with units
		const overlapsUnit = this.units.some((u) => {
			const dist = Phaser.Math.Distance.Between(x, y, u.x, u.y);
			return dist < 80; // Minimum spacing from units
		});
		if (overlapsUnit) return false;

		return true;
	}

	private placeBuilding(x: number, y: number): void {
		if (!this.buildMode || !this.selectedBuildingType) return;
		if (!this.isValidBuildLocation(x, y)) return;

		const worker = this.buildModeWorker;
		if (!worker || !worker.active) {
			this.cancelBuildMode();
			return;
		}

		if (!this.textures.exists(this.selectedBuildingType)) return;

		const buildingType = this.selectedBuildingType.replace(/^building-/, "") as BuildingType;
		const building = new Building(this, x, y, this.selectedBuildingType, buildingType, null);
		building.setDisplaySize(96, 128).setDepth(50).setAlpha(0.5);
		this.buildings.push(building);
		// Pathfinding blocked only when construction completes

		const progressBar = this.add.graphics();
		progressBar.setDepth(51);

		this.buildingUnderConstruction = {
			building,
			worker,
			progress: 0,
			duration: GameScene.BUILD_DURATION_MS,
			progressBar,
		};

		const path = this.pathfinding.findPathSmooth(worker.x, worker.y, x, y);
		if (path.length > 0) {
			worker.setWaypoints(path);
		} else {
			worker.commandMove(x, y);
		}

		this.cancelBuildMode();
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

	/** Called from contextmenu (fallback when pointerdown doesn't fire for right-click). */
	private onRightClick(canvas: HTMLCanvasElement, e: MouseEvent): void {
		const rect = canvas.getBoundingClientRect();
		const gameX = ((e.clientX - rect.left) / rect.width) * this.scale.width;
		const gameY = ((e.clientY - rect.top) / rect.height) * this.scale.height;
		const world = this.cameras.main.getWorldPoint(gameX, gameY);
		this.tryMoveSelectedUnitsTo(world.x, world.y);
	}

	private tryMoveSelectedUnitsTo(worldX: number, worldY: number): void {
		if (this.buildMode) {
			this.cancelBuildMode();
			return;
		}
		const playerUnits = this.selectedUnits.filter((u) => u.team === "player" && u.active);
		if (playerUnits.length > 0) {
			this.moveSelectedUnits(worldX, worldY);
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
		// Snapshot to prevent mid-loop mutation if a unit dies or deselects
		const units = [...this.selectedUnits].filter((u) => u.team === "player" && u.active);
		if (units.length === 0) return;

		const spacing = TILE_SIZE;
		const unitsPerRow = Math.ceil(Math.sqrt(units.length));
		const totalRows = Math.ceil(units.length / unitsPerRow);

		units.forEach((unit, index) => {
			const row = Math.floor(index / unitsPerRow);
			const col = index % unitsPerRow;

			const offsetX = (col - (unitsPerRow - 1) / 2) * spacing;
			const offsetY = (row - (totalRows - 1) / 2) * spacing;

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

	update(time: number, delta: number): void {
		this.economy.update(delta);
		this.buildings.forEach((b) => b.getQueue()?.update(delta));
		this.updateBuildingUnderConstruction(delta);

		this.units.forEach((u) => {
			if (u.active) u.update(time, delta);
		});

		this.updateEdgePan(delta);
		this.updateKeyboardPan(delta);
		this.runEnemyAI();
		this.runCombat();
	}

	private updateEdgePan(delta: number): void {
		const pointer = this.input.activePointer;
		const cam = this.cameras.main;
		const worldWidth = this.terrain.width * TILE_SIZE;
		const worldHeight = this.terrain.height * TILE_SIZE;
		const visibleW = cam.width / cam.zoom;
		const visibleH = cam.height / cam.zoom;
		const maxScrollX = Math.max(0, worldWidth - visibleW);
		const maxScrollY = Math.max(0, worldHeight - visibleH);

		const move = (delta / 1000) * EDGE_PAN_SPEED;
		let dx = 0;
		let dy = 0;
		if (pointer.x < EDGE_PAN_MARGIN) dx = -move;
		else if (pointer.x > cam.width - EDGE_PAN_MARGIN) dx = move;
		if (pointer.y < EDGE_PAN_MARGIN) dy = -move;
		else if (pointer.y > cam.height - EDGE_PAN_MARGIN) dy = move;

		if (dx !== 0 || dy !== 0) {
			cam.setScroll(
				Phaser.Math.Clamp(cam.scrollX + dx, 0, maxScrollX),
				Phaser.Math.Clamp(cam.scrollY + dy, 0, maxScrollY),
			);
		}
	}

	private updateKeyboardPan(delta: number): void {
		if (!this.cursorKeys || !this.wasdKeys) return;

		const cam = this.cameras.main;
		const worldWidth = this.terrain.width * TILE_SIZE;
		const worldHeight = this.terrain.height * TILE_SIZE;
		const visibleW = cam.width / cam.zoom;
		const visibleH = cam.height / cam.zoom;
		const maxScrollX = Math.max(0, worldWidth - visibleW);
		const maxScrollY = Math.max(0, worldHeight - visibleH);

		const move = (delta / 1000) * KEYBOARD_PAN_SPEED;
		let dx = 0;
		let dy = 0;
		if (this.cursorKeys.left?.isDown || this.wasdKeys.A.isDown) dx = -move;
		else if (this.cursorKeys.right?.isDown || this.wasdKeys.D.isDown) dx = move;
		if (this.cursorKeys.up?.isDown || this.wasdKeys.W.isDown) dy = -move;
		else if (this.cursorKeys.down?.isDown || this.wasdKeys.S.isDown) dy = move;

		if (dx !== 0 || dy !== 0) {
			cam.setScroll(
				Phaser.Math.Clamp(cam.scrollX + dx, 0, maxScrollX),
				Phaser.Math.Clamp(cam.scrollY + dy, 0, maxScrollY),
			);
		}
	}

	private updateBuildingUnderConstruction(delta: number): void {
		const uc = this.buildingUnderConstruction;
		if (!uc) return;

		const { building, worker, progressBar } = uc;
		if (!worker.active) {
			progressBar.destroy();
			this.buildingUnderConstruction = null;
			building.destroy();
			return;
		}

		const ratio = Math.min(1, uc.progress / uc.duration);
		const barW = 80;
		const barH = 8;
		progressBar.setPosition(building.x, building.y - 80);
		progressBar.clear();
		progressBar.fillStyle(0x333333, 0.9);
		progressBar.fillRect(-barW / 2, 0, barW, barH);
		progressBar.fillStyle(0x44aa44, 1);
		progressBar.fillRect(-barW / 2, 0, barW * ratio, barH);

		const dist = Phaser.Math.Distance.Between(worker.x, worker.y, building.x, building.y);
		if (dist <= GameScene.BUILD_SITE_RADIUS) {
			uc.progress += delta * 1000;
			worker.playBuildAnimation();
			if (uc.progress >= uc.duration) {
				progressBar.destroy();
				building.setAlpha(1);
				this.pathfinding.markBuildingBlocked(building.x, building.y, 96, 128);
				worker.stopBuildAnimation();
				this.buildingUnderConstruction = null;
			}
		} else {
			worker.stopBuildAnimation();
		}
	}

	private runEnemyAI(): void {
		const playerUnits = this.units.filter((u) => u.active && u.team === "player");
		if (playerUnits.length === 0) return;

		this.units.forEach((unit) => {
			if (!unit.active || unit.team !== "enemy") return;

			// Find closest player unit
			const closest = playerUnits.reduce((a, b) =>
				Phaser.Math.Distance.Between(unit.x, unit.y, a.x, a.y) < Phaser.Math.Distance.Between(unit.x, unit.y, b.x, b.y)
					? a
					: b,
			);

			const dist = Phaser.Math.Distance.Between(unit.x, unit.y, closest.x, closest.y);

			if (dist <= unit.getAttackRange()) {
				// Already in range — combat loop handles attack
				// Clear chase target if in range
				if (unit.hasChaseTarget()) {
					unit.setChaseTarget(null);
				}
			} else if (dist <= DETECTION_RANGE) {
				// Aggression triggered - use pathfinding for movement
				// Use pathfinding to set waypoints for proper pathfinding behavior
				const path = this.pathfinding.findPathSmooth(unit.x, unit.y, closest.x, closest.y);
				if (path && path.length > 0) {
					// Clear chase target when using waypoints (setWaypoints doesn't clear it automatically)
					if (unit.hasChaseTarget()) {
						unit.setChaseTarget(null);
					}
					unit.setWaypoints(path);
				} else {
					// Fallback: if pathfinding returns empty path, use chase target for direct movement
					if (!unit.hasChaseTarget()) {
						unit.setChaseTarget(closest);
					}
				}
			} else {
				// Out of detection range, clear chase target
				if (unit.hasChaseTarget()) {
					unit.setChaseTarget(null);
				}
			}
		});
	}

	private runCombat(): void {
		this.units.forEach((unit) => {
			if (!unit.active || !unit.attackCooldownReady) return;
			const enemies = this.getEnemiesInRange(unit);
			if (enemies.length === 0) return;
			const closest = enemies.reduce((a, b) =>
				Phaser.Math.Distance.Between(unit.x, unit.y, a.x, a.y) < Phaser.Math.Distance.Between(unit.x, unit.y, b.x, b.y)
					? a
					: b,
			);
			unit.attack(closest);
		});
	}
}
