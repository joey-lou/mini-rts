import Phaser from "phaser";
import { Unit } from "../entities/Unit";
import { Building } from "../entities/Building";
import { UnitCost, TrainTime } from "../systems/ProductionQueue";

const HUD_HEIGHT = 120;
const BAR_COLOR = 0x1a1a2e;
const BAR_ALPHA = 0.85;

export class HUDScene extends Phaser.Scene {
	private goldText!: Phaser.GameObjects.Text;
	private unitInfoText!: Phaser.GameObjects.Text;
	private hudBar!: Phaser.GameObjects.Rectangle;

	// Production panel
	private productionPanel: Phaser.GameObjects.Container | null = null;
	private progressBar: Phaser.GameObjects.Graphics | null = null;
	private activeBuilding: Building | null = null;

	constructor() {
		super({ key: "HUDScene" });
	}

	create(): void {
		const { width, height } = this.cameras.main;

		this.hudBar = this.add.rectangle(0, height - HUD_HEIGHT, width * 2, HUD_HEIGHT * 2, BAR_COLOR, BAR_ALPHA);
		this.hudBar.setOrigin(0, 0).setScrollFactor(0).setDepth(300);

		this.goldText = this.add.text(20, height - HUD_HEIGHT + 12, "Gold: 200", {
			fontSize: "20px",
			fontFamily: "Arial",
			color: "#ffd700",
			fontStyle: "bold",
		});
		this.goldText.setScrollFactor(0).setDepth(301);

		this.unitInfoText = this.add.text(width / 2, height - HUD_HEIGHT + 12, "", {
			fontSize: "16px",
			fontFamily: "Arial",
			color: "#ffffff",
			align: "center",
		});
		this.unitInfoText.setScrollFactor(0).setDepth(301).setOrigin(0.5, 0);

		// Minimap placeholder (bottom-right)
		const mmW = 180;
		const mmH = 100;
		const mmX = width - mmW - 10;
		const mmY = height - mmH - 10;
		const minimap = this.add.rectangle(mmX, mmY, mmW, mmH, 0x224422, 0.9);
		minimap.setOrigin(0, 0).setScrollFactor(0).setDepth(301);
		const mmLabel = this.add.text(mmX + mmW / 2, mmY + mmH / 2, "Minimap", {
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
			} else if (selected.length === 1) {
				const u = selected[0];
				this.unitInfoText.setText(`${u.unitType.toUpperCase()}  HP: ${u.getCurrentHealth()}/${u.getMaxHealth()}`);
			} else {
				this.unitInfoText.setText(`${selected.length} units selected`);
			}
		});

		gameScene.events.on("building-clicked", (building: Building) => {
			this.showProductionPanel(building);
		});

		gameScene.events.on("queue-changed", () => {
			this.refreshProgressBar();
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
		const panelY = height - HUD_HEIGHT - panelH - 10;

		const container = this.add.container(panelX, panelY);
		container.setScrollFactor(0).setDepth(400);

		const bg = this.add.rectangle(0, 0, panelW, panelH, 0x111122, 0.92);
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
			const btnX = 10 + i * 100;
			const btnY = 45;

			const btn = this.add.rectangle(btnX, btnY, 90, 60, 0x224488, 1);
			btn.setOrigin(0, 0).setInteractive({ useHandCursor: true });
			btn.on("pointerover", () => btn.setFillStyle(0x3366aa));
			btn.on("pointerout", () => btn.setFillStyle(0x224488));
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
}
