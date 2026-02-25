import Phaser from "phaser";
import { Unit } from "../entities/Unit";
import { Building } from "../entities/Building";
import { UnitCost, TrainTime } from "../systems/ProductionQueue";
import { UnitActionConfig, UNIT_ACTION_CONFIGS } from "../data/unitActions";

export type { UnitActionConfig };

const HUD_HEIGHT = 120;
const BAR_COLOR = 0x1a1a2e;
const BAR_ALPHA = 0.85;
const PANEL_BG = 0x111122;
const PANEL_ALPHA = 0.92;
const BTN_COLOR = 0x224488;
const BTN_HOVER = 0x3366aa;
const BTN_SELECTED = 0x2a5588;
const BTN_BORDER_SELECTED = 0x44aaff;
const SPACING = 10;
const GOLD_Y_OFFSET = 12;
const MINIMAP_W = 180;
const MINIMAP_H = 100;
const MINIMAP_INSET = 10;

/**
 * Maps unit types to the sprite sheet key prefix used in PreloadScene.
 * knight and footman both use the "warrior" sprite sheet.
 */
const UNIT_SPRITE_PREFIX: Record<string, string> = {
  knight:  "warrior",
  footman: "warrior",
  archer:  "archer",
  lancer:  "lancer",
  peasant: "pawn",
};

export class HUDScene extends Phaser.Scene {
	private goldText!: Phaser.GameObjects.Text;
	private unitInfoText!: Phaser.GameObjects.Text;
	private hudBar!: Phaser.GameObjects.Rectangle;

	// Production panel
	private productionPanel: Phaser.GameObjects.Container | null = null;
	private progressBar: Phaser.GameObjects.Graphics | null = null;
	private activeBuilding: Building | null = null;

	// Unit action panel
	private unitActionPanel: Phaser.GameObjects.Container | null = null;
	
	// Building type selection panel (shown in build mode)
	private buildingTypePanel: Phaser.GameObjects.Container | null = null;
	
	// Available building types
	private readonly AVAILABLE_BUILDINGS = [
		{ type: "building-castle", name: "Castle" },
		{ type: "building-barracks", name: "Barracks" },
		{ type: "building-archery", name: "Archery" },
		{ type: "building-tower", name: "Tower" },
		{ type: "building-monastery", name: "Monastery" }
	];

	constructor() {
		super({ key: "HUDScene" });
	}

	create(): void {
		const { width, height } = this.cameras.main;
		const barY = height - HUD_HEIGHT;

		this.hudBar = this.add.rectangle(0, barY, width, HUD_HEIGHT, BAR_COLOR, BAR_ALPHA);
		this.hudBar.setOrigin(0, 0).setScrollFactor(0).setDepth(300);

		this.goldText = this.add.text(SPACING * 2, barY + GOLD_Y_OFFSET, "Gold: 200", {
			fontSize: "20px",
			fontFamily: "Arial",
			color: "#ffd700",
			fontStyle: "bold",
		});
		this.goldText.setScrollFactor(0).setDepth(301);

		this.unitInfoText = this.add.text(width / 2, barY + GOLD_Y_OFFSET, "", {
			fontSize: "16px",
			fontFamily: "Arial",
			color: "#ffffff",
			align: "center",
		});
		this.unitInfoText.setScrollFactor(0).setDepth(301).setOrigin(0.5, 0);

		const mmX = width - MINIMAP_W - MINIMAP_INSET;
		const mmY = height - MINIMAP_H - MINIMAP_INSET;
		const minimap = this.add.rectangle(mmX, mmY, MINIMAP_W, MINIMAP_H, 0x224422, 0.9);
		minimap.setOrigin(0, 0).setScrollFactor(0).setDepth(301);
		const mmLabel = this.add.text(mmX + MINIMAP_W / 2, mmY + MINIMAP_H / 2, "Minimap", {
			fontSize: "12px",
			fontFamily: "Arial",
			color: "#88cc88",
		});
		mmLabel.setScrollFactor(0).setDepth(302).setOrigin(0.5, 0.5);

		this.bindEvents();
	}

	private bindEvents(): void {
		const gameScene = this.scene.get("GameScene");

		gameScene.events.on("gold-changed", (amount: number) => {
			this.goldText.setText(`Gold: ${Math.floor(amount)}`);
		});

		gameScene.events.on("selection-changed", (selected: Unit[]) => {
			if (selected.length === 0) {
				this.unitInfoText.setText("");
				this.hideUnitActionPanel();
			} else if (selected.length === 1) {
				const u = selected[0];
				this.unitInfoText.setText(`${u.unitType.toUpperCase()}  HP: ${u.getCurrentHealth()}/${u.getMaxHealth()}`);
				this.showUnitActionPanel(selected);
			} else {
				this.unitInfoText.setText(`${selected.length} units selected`);
				this.showUnitActionPanel(selected);
			}
		});

		gameScene.events.on("building-clicked", (building: Building) => {
			this.showProductionPanel(building);
		});

		gameScene.events.on("queue-changed", () => {
			this.refreshProgressBar();
		});

		gameScene.events.on("build-mode-entered", () => {
			this.showBuildingTypePanel();
		});

		gameScene.events.on("build-mode-exited", () => {
			this.hideBuildingTypePanel();
		});
	}

	private showProductionPanel(building: Building): void {
		if (this.productionPanel) {
			this.productionPanel.destroy();
			this.productionPanel = null;
			this.progressBar = null;
			if (this.activeBuilding === building) {
				this.activeBuilding = null;
				return;
			}
		}

		this.activeBuilding = building;
		const { width, height } = this.cameras.main;
		const panelW = 340;
		const panelH = 220;
		const panelX = width / 2 - panelW / 2;
		const panelY = height - HUD_HEIGHT - panelH - SPACING;

		const container = this.add.container(panelX, panelY);
		container.setScrollFactor(0).setDepth(400);

		const bg = this.add.rectangle(0, 0, panelW, panelH, PANEL_BG, PANEL_ALPHA);
		bg.setOrigin(0, 0);
		container.add(bg);

		const title = this.add.text(panelW / 2, 10, building.buildingType.toUpperCase(), {
			fontSize: "18px",
			fontFamily: "Arial",
			color: "#ffffff",
			fontStyle: "bold",
		});
		title.setOrigin(0.5, 0);
		container.add(title);

		const producible = building.getProducibleUnits();
		producible.forEach((unitType, i) => {
			const cost = UnitCost[unitType];
			const time = TrainTime[unitType];
			const btnX = SPACING + i * 100;
			const btnY = 45;

			const btn = this.add.rectangle(btnX, btnY, 90, 60, BTN_COLOR, 1);
			btn.setOrigin(0, 0).setInteractive({ useHandCursor: true });
			btn.on("pointerover", () => btn.setFillStyle(BTN_HOVER));
			btn.on("pointerout", () => btn.setFillStyle(BTN_COLOR));
			btn.on("pointerdown", () => {
				building.getQueue()?.enqueue(unitType, "player", cost, time);
				this.refreshProgressBar();
			});

			const lbl = this.add.text(btnX + 45, btnY + 15, `${unitType}\n${cost}g ${time}s`, {
				fontSize: "12px",
				fontFamily: "Arial",
				color: "#ffffff",
				align: "center",
			});
			lbl.setOrigin(0.5, 0);

			container.add(btn);
			container.add(lbl);
		});

		// Progress bar background
		const pbBg = this.add.rectangle(10, 130, panelW - 20, 18, 0x333333, 1);
		pbBg.setOrigin(0, 0);
		container.add(pbBg);

		this.progressBar = this.add.graphics();
		container.add(this.progressBar);

		// Close button
		const closeBtn = this.add.text(panelW - 10, 5, "✕", {
			fontSize: "16px",
			fontFamily: "Arial",
			color: "#ff6666",
		});
		closeBtn.setOrigin(1, 0).setInteractive({ useHandCursor: true });
		closeBtn.on("pointerdown", () => {
			this.productionPanel?.destroy();
			this.productionPanel = null;
			this.progressBar = null;
			this.activeBuilding = null;
		});
		container.add(closeBtn);

		// Queue size label
		const queueLabel = this.add.text(panelW / 2, 155, "", {
			fontSize: "12px",
			fontFamily: "Arial",
			color: "#aaaaaa",
			align: "center",
		});
		queueLabel.setOrigin(0.5, 0).setName("queueLabel");
		container.add(queueLabel);

		this.productionPanel = container;
		this.refreshProgressBar();
	}

	private refreshProgressBar(): void {
		if (!this.progressBar || !this.activeBuilding) return;
		const queue = this.activeBuilding.getQueue();
		if (!queue) return;

		const progress = queue.getCurrentProgress();
		const panelW = 340;
		const barW = (panelW - 20) * progress;

		this.progressBar.clear();
		if (barW > 0) {
			this.progressBar.fillStyle(0x44aa44, 1);
			this.progressBar.fillRect(10, 130, barW, 18);
		}

		const qLen = queue.getLength();
		const labelObj = this.productionPanel?.getByName("queueLabel") as Phaser.GameObjects.Text | undefined;
		if (labelObj) {
			labelObj.setText(qLen > 0 ? `Training... (${qLen} in queue)` : "Queue empty");
		}
	}

	private showUnitActionPanel(units: Unit[]): void {
		const playerUnits = units.filter((u) => u.team === "player");
		if (playerUnits.length === 0) return;

		this.hideUnitActionPanel();

		// Derive shared actions across all selected player units
		const actionSets = playerUnits.map((u) => {
			const cfgArr = UNIT_ACTION_CONFIGS[u.unitType] ?? [];
			return cfgArr.map((c) => c.action);
		});
		const sharedActions = actionSets[0].filter((a) => actionSets.every((set) => set.includes(a)));

		const isSingle = playerUnits.length === 1;
		const unit = playerUnits[0];
		const cfgArr = UNIT_ACTION_CONFIGS[unit.unitType] ?? [];

		const { width, height } = this.cameras.main;
		const panelW = 300;
		const panelH = 110;
		const panelX = width / 2 - panelW / 2;
		const panelY = height - HUD_HEIGHT - panelH - SPACING;

		const container = this.add.container(panelX, panelY);
		container.setScrollFactor(0).setDepth(400);

		const bg = this.add.rectangle(0, 0, panelW, panelH, PANEL_BG, PANEL_ALPHA);
		bg.setOrigin(0, 0);
		container.add(bg);

		// Portrait / count area (left side, 80px wide)
		const portraitSize = 64;
		const portraitX = 8;
		const portraitY = (panelH - portraitSize) / 2;

		if (isSingle) {
			// Single unit: show sprite portrait
			const portraitBg = this.add.rectangle(portraitX, portraitY, portraitSize, portraitSize, 0x223344, 1);
			portraitBg.setOrigin(0, 0);
			container.add(portraitBg);

			const color = unit.team === "player" ? "blue" : "red";
			const spritePrefix = UNIT_SPRITE_PREFIX[unit.unitType] ?? unit.unitType;
			const idleKey = `unit-${spritePrefix}-idle-${color}`;
			if (this.textures.exists(idleKey)) {
				const portrait = this.add.sprite(portraitX + portraitSize / 2, portraitY + portraitSize / 2, idleKey, 0);
				portrait.setDisplaySize(portraitSize - 4, portraitSize - 4);
				container.add(portrait);
			}

			// HP bar using ui-smallbar assets
			const barY = portraitY + portraitSize + 4;
			const barW = portraitSize;
			const hpRatio = unit.getCurrentHealth() / unit.getMaxHealth();

			if (this.textures.exists("ui-smallbar-base")) {
				const barBase = this.add.image(portraitX, barY, "ui-smallbar-base");
				barBase.setOrigin(0, 0).setDisplaySize(barW, 10);
				container.add(barBase);
			} else {
				const barBg = this.add.rectangle(portraitX, barY, barW, 10, 0x333333, 1);
				barBg.setOrigin(0, 0);
				container.add(barBg);
			}

			if (this.textures.exists("ui-smallbar-fill")) {
				const barFill = this.add.image(portraitX, barY, "ui-smallbar-fill");
				barFill.setOrigin(0, 0).setDisplaySize(Math.max(1, barW * hpRatio), 10);
				container.add(barFill);
			} else {
				const fillColor = hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.25 ? 0xcccc44 : 0xcc4444;
				const barFill = this.add.rectangle(portraitX, barY, Math.max(1, barW * hpRatio), 10, fillColor, 1);
				barFill.setOrigin(0, 0);
				container.add(barFill);
			}
		} else {
			// Multi-unit: show count badge
			const countBg = this.add.rectangle(portraitX, portraitY, portraitSize, portraitSize, 0x223344, 1);
			countBg.setOrigin(0, 0);
			container.add(countBg);

			const countText = this.add.text(portraitX + portraitSize / 2, portraitY + portraitSize / 2, `×${playerUnits.length}`, {
				fontSize: "22px",
				fontFamily: "Arial",
				color: "#ffffff",
				fontStyle: "bold",
			});
			countText.setOrigin(0.5, 0.5);
			container.add(countText);
		}

		// Unit type label
		const labelText = isSingle ? unit.unitType.toUpperCase() : "MIXED";
		const typeLabel = this.add.text(portraitX + portraitSize / 2, 6, labelText, {
			fontSize: "11px",
			fontFamily: "Arial",
			color: "#aaddff",
		});
		typeLabel.setOrigin(0.5, 0);
		container.add(typeLabel);

		// Action buttons (right side)
		const btnAreaX = portraitX + portraitSize + 12;
		const btnSize = 48;
		const btnSpacing = 8;

		sharedActions.forEach((action, i) => {
			const actionCfg = cfgArr.find((c) => c.action === action);
			const iconKey = actionCfg?.iconKey ?? `ui-icon-${i + 1}`;
			const label = actionCfg?.label ?? action.toUpperCase();
			const btnX = btnAreaX + i * (btnSize + btnSpacing);
			const btnY = (panelH - btnSize) / 2;

			const btn = this.add.rectangle(btnX, btnY, btnSize, btnSize, BTN_COLOR, 1);
			btn.setOrigin(0, 0).setInteractive({ useHandCursor: true });
			btn.setData("action", action);
			btn.on("pointerover", () => {
				btn.setFillStyle(BTN_HOVER);
				btn.setStrokeStyle(2, BTN_BORDER_SELECTED, 0.6);
			});
			btn.on("pointerout", () => {
				btn.setFillStyle(BTN_COLOR);
				btn.setStrokeStyle(0, 0, 0);
			});
			btn.on("pointerdown", () => {
				const gameScene = this.scene.get("GameScene");
				playerUnits.forEach((u) => gameScene.events.emit("unit-action", { unit: u, action }));
			});
			container.add(btn);

			if (this.textures.exists(iconKey)) {
				const icon = this.add.image(btnX + btnSize / 2, btnY + btnSize / 2 - 6, iconKey);
				icon.setDisplaySize(28, 28);
				container.add(icon);
			}

			const lbl = this.add.text(btnX + btnSize / 2, btnY + btnSize - 12, label, {
				fontSize: "9px",
				fontFamily: "Arial",
				color: "#ffffff",
				align: "center",
			});
			lbl.setOrigin(0.5, 0);
			container.add(lbl);
		});

		this.unitActionPanel = container;
	}

	private hideUnitActionPanel(): void {
		if (this.unitActionPanel) {
			this.unitActionPanel.destroy();
			this.unitActionPanel = null;
		}
	}

	private showBuildingTypePanel(): void {
		this.hideBuildingTypePanel();

		const { width, height } = this.cameras.main;
		const panelW = Math.min(600, width - 2 * SPACING);
		const panelH = 100;
		const panelX = width / 2 - panelW / 2;
		// Above unit action panel (110 + spacing) so build and production panels don't overlap
		const panelY = height - HUD_HEIGHT - panelH - 110 - SPACING * 2;

		const container = this.add.container(panelX, panelY);
		container.setScrollFactor(0).setDepth(400);

		const bg = this.add.rectangle(0, 0, panelW, panelH, PANEL_BG, PANEL_ALPHA);
		bg.setOrigin(0, 0);
		container.add(bg);

		const title = this.add.text(panelW / 2, 10, "Select Building Type", {
			fontSize: "16px",
			fontFamily: "Arial",
			color: "#ffffff",
			fontStyle: "bold",
		});
		title.setOrigin(0.5, 0);
		container.add(title);

		const buttonWidth = 90;
		const buttonHeight = 70;
		const startX = (panelW - (this.AVAILABLE_BUILDINGS.length * (buttonWidth + SPACING) - SPACING)) / 2;

		this.AVAILABLE_BUILDINGS.forEach((building, i) => {
			const btnX = startX + i * (buttonWidth + SPACING);
			const btnY = 35;

			const btn = this.add.rectangle(btnX, btnY, buttonWidth, buttonHeight, BTN_COLOR, 1);
			btn.setOrigin(0, 0).setInteractive({ useHandCursor: true });
			btn.on("pointerover", () => btn.setFillStyle(BTN_HOVER));
			btn.on("pointerout", () => btn.setFillStyle(BTN_COLOR));
			btn.on("pointerdown", () => {
				const gameScene = this.scene.get("GameScene");
				gameScene.events.emit("building-type-selected", building.type);
			});
			container.add(btn);

			// Icon on top of btn
			let icon: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
			if (this.textures.exists(building.type)) {
				icon = this.add.sprite(btnX + buttonWidth / 2, btnY + 20, building.type);
				icon.setDisplaySize(40, 40);
			} else {
				icon = this.add.text(btnX + buttonWidth / 2, btnY + 20, "🏰", {
					fontSize: "24px",
				});
			}
			icon.setOrigin(0.5, 0.5);
			container.add(icon);

			const lbl = this.add.text(btnX + buttonWidth / 2, btnY + 55, building.name, {
				fontSize: "11px",
				fontFamily: "Arial",
				color: "#ffffff",
				align: "center",
			});
			lbl.setOrigin(0.5, 0);
			container.add(lbl);
		});

		this.buildingTypePanel = container;
	}

	private hideBuildingTypePanel(): void {
		if (this.buildingTypePanel) {
			this.buildingTypePanel.destroy();
			this.buildingTypePanel = null;
		}
	}
}
