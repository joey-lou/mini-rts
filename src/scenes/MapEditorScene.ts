/**
 * Map editor: paint terrain on a grid, place entities, save to JSON, load in game.
 * Sidebar UI lives in external HTML #map-editor-sidebar so zoom/pan do not affect it.
 */

import Phaser from 'phaser';
import { TILE_SIZE, TerrainLevel } from '../terrain/TerrainTypes';
import {
  TerrainMap,
  SavedMapData,
  SavedUnitType,
  SavedTeam,
  SavedBuildingType,
} from '../terrain/TerrainMap';
import { TerrainRenderer } from '../terrain/TerrainRenderer';

const DEFAULT_WIDTH = 60;
const DEFAULT_HEIGHT = 40;
const MIN_SIZE = 16;
const MAX_SIZE = 128;
const SIDE_PANEL_WIDTH = 220;

const SIDEBAR_ID = 'map-editor-sidebar';

type EditorBrush =
  | { mode: 'terrain'; level: TerrainLevel }
  | { mode: 'unit'; type: SavedUnitType; team: SavedTeam }
  | { mode: 'building'; type: SavedBuildingType };

const UNIT_TEXTURE: Record<SavedUnitType, string> = {
  knight: 'unit-warrior-idle',
  footman: 'unit-pawn-idle',
  archer: 'unit-archer-idle',
  peasant: 'unit-pawn-idle',
  lancer: 'unit-lancer-idle',
};

const BUILDING_TEXTURE: Record<SavedBuildingType, string> = {
  castle: 'building-castle',
  barracks: 'building-barracks',
  archery: 'building-archery',
  tower: 'building-tower',
  monastery: 'building-monastery',
};

export class MapEditorScene extends Phaser.Scene {
  private map!: TerrainMap;
  private terrainRenderer!: TerrainRenderer;
  private brush: EditorBrush = { mode: 'terrain', level: TerrainLevel.FLAT };
  private isDragging = false;
  private widthInput!: HTMLInputElement;
  private heightInput!: HTMLInputElement;
  private sidebarEl!: HTMLElement;
  private editorEntities: NonNullable<SavedMapData['entities']> = { units: [], buildings: [] };
  private entitySprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: 'MapEditorScene' });
  }

  create(): void {
    this.map = new TerrainMap(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    this.terrainRenderer = new TerrainRenderer(this, this.map);
    this.terrainRenderer.render();

    this.sidebarEl = document.getElementById(SIDEBAR_ID)!;
    this.sidebarEl.style.display = 'flex';
    this.sidebarEl.style.flexDirection = 'column';
    this.sidebarEl.style.gap = '12px';
    this.buildSidebarContent();
    this.bindSidebarHandlers();

    this.setupCameraViewport();
    this.setupPaintInput();
    this.setupCamera();
    this.refreshEntitySprites();
    this.input.mouse?.disableContextMenu();
  }

  shutdown(): void {
    const el = document.getElementById(SIDEBAR_ID);
    if (el) el.style.display = 'none';
  }

  private buildSidebarContent(): void {
    this.sidebarEl.innerHTML = '';

    const brushLabel = document.createElement('div');
    brushLabel.textContent = 'Brush:';
    brushLabel.style.fontSize = '16px';
    brushLabel.style.color = '#ffffff';
    this.sidebarEl.appendChild(brushLabel);

    const brushOptions: { label: string; level: TerrainLevel }[] = [
      { label: 'Water', level: TerrainLevel.WATER },
      { label: 'Flat', level: TerrainLevel.FLAT },
      { label: 'Elevated 1', level: TerrainLevel.ELEVATED_1 },
      { label: 'Elevated 2', level: TerrainLevel.ELEVATED_2 },
      { label: 'Ramp', level: TerrainLevel.RAMP },
    ];

    const brushContainer = document.createElement('div');
    brushContainer.style.display = 'flex';
    brushContainer.style.flexDirection = 'column';
    brushContainer.style.gap = '6px';
    brushOptions.forEach(({ label, level }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.dataset.brush = `terrain:${level}`;
      btn.style.cssText =
        'font-size:14px; padding:8px 12px; text-align:left; cursor:pointer; background:#2a2a2a; color:#aaaaaa; border:1px solid #3a3a3a; border-radius:4px;';
      brushContainer.appendChild(btn);
    });
    this.sidebarEl.appendChild(brushContainer);

    const entitiesLabel = document.createElement('div');
    entitiesLabel.textContent = 'Entities:';
    entitiesLabel.style.fontSize = '16px';
    entitiesLabel.style.color = '#ffffff';
    entitiesLabel.style.marginTop = '12px';
    this.sidebarEl.appendChild(entitiesLabel);

    const unitLabel = document.createElement('div');
    unitLabel.textContent = 'Units (team: player / enemy)';
    unitLabel.style.fontSize = '12px';
    unitLabel.style.color = '#aaaaaa';
    unitLabel.style.marginTop = '4px';
    this.sidebarEl.appendChild(unitLabel);

    const unitTypes: SavedUnitType[] = ['knight', 'footman', 'archer', 'peasant', 'lancer'];
    const teams: SavedTeam[] = ['player', 'enemy'];
    const unitContainer = document.createElement('div');
    unitContainer.style.display = 'flex';
    unitContainer.style.flexDirection = 'column';
    unitContainer.style.gap = '4px';
    for (const type of unitTypes) {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '6px';
      row.style.alignItems = 'center';
      for (const team of teams) {
        const btn = document.createElement('button');
        btn.textContent = `${type} (${team})`;
        btn.dataset.brush = `unit:${type}:${team}`;
        btn.style.cssText =
          'font-size:12px; padding:6px 10px; cursor:pointer; background:#2a2a2a; color:#aaaaaa; border:1px solid #3a3a3a; border-radius:4px;';
        row.appendChild(btn);
      }
      unitContainer.appendChild(row);
    }
    this.sidebarEl.appendChild(unitContainer);

    const buildingLabel = document.createElement('div');
    buildingLabel.textContent = 'Buildings';
    buildingLabel.style.fontSize = '12px';
    buildingLabel.style.color = '#aaaaaa';
    buildingLabel.style.marginTop = '8px';
    this.sidebarEl.appendChild(buildingLabel);

    const buildingTypes: SavedBuildingType[] = ['castle', 'barracks', 'archery', 'tower', 'monastery'];
    const buildingContainer = document.createElement('div');
    buildingContainer.style.display = 'flex';
    buildingContainer.style.flexWrap = 'wrap';
    buildingContainer.style.gap = '6px';
    buildingTypes.forEach((type) => {
      const btn = document.createElement('button');
      btn.textContent = type;
      btn.dataset.brush = `building:${type}`;
      btn.style.cssText =
        'font-size:12px; padding:6px 10px; cursor:pointer; background:#2a2a2a; color:#aaaaaa; border:1px solid #3a3a3a; border-radius:4px;';
      buildingContainer.appendChild(btn);
    });
    this.sidebarEl.appendChild(buildingContainer);

    const mapSizeLabel = document.createElement('div');
    mapSizeLabel.textContent = 'Map size:';
    mapSizeLabel.style.fontSize = '16px';
    mapSizeLabel.style.color = '#ffffff';
    mapSizeLabel.style.marginTop = '8px';
    this.sidebarEl.appendChild(mapSizeLabel);

    const sizeRow = document.createElement('div');
    sizeRow.style.display = 'flex';
    sizeRow.style.flexDirection = 'column';
    sizeRow.style.gap = '8px';
    sizeRow.style.fontSize = '14px';

    const widthRow = document.createElement('div');
    widthRow.style.display = 'flex';
    widthRow.style.alignItems = 'center';
    widthRow.style.gap = '8px';
    const widthLabel = document.createElement('label');
    widthLabel.textContent = 'Width:';
    this.widthInput = document.createElement('input');
    this.widthInput.type = 'number';
    this.widthInput.min = String(MIN_SIZE);
    this.widthInput.max = String(MAX_SIZE);
    this.widthInput.value = String(DEFAULT_WIDTH);
    this.widthInput.style.width = '64px';
    widthRow.appendChild(widthLabel);
    widthRow.appendChild(this.widthInput);
    sizeRow.appendChild(widthRow);

    const heightRow = document.createElement('div');
    heightRow.style.display = 'flex';
    heightRow.style.alignItems = 'center';
    heightRow.style.gap = '8px';
    const heightLabel = document.createElement('label');
    heightLabel.textContent = 'Height:';
    this.heightInput = document.createElement('input');
    this.heightInput.type = 'number';
    this.heightInput.min = String(MIN_SIZE);
    this.heightInput.max = String(MAX_SIZE);
    this.heightInput.value = String(DEFAULT_HEIGHT);
    this.heightInput.style.width = '64px';
    heightRow.appendChild(heightLabel);
    heightRow.appendChild(this.heightInput);
    sizeRow.appendChild(heightRow);
    this.sidebarEl.appendChild(sizeRow);

    const newMapBtn = document.createElement('button');
    newMapBtn.textContent = 'New map';
    newMapBtn.dataset.action = 'new-map';
    newMapBtn.style.cssText =
      'font-size:14px; padding:8px 14px; cursor:pointer; background:#2a3a2a; color:#9ab86a; border:1px solid #3a4a32; border-radius:4px; margin-top:4px;';
    this.sidebarEl.appendChild(newMapBtn);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.dataset.action = 'save';
    saveBtn.style.cssText =
      'font-size:16px; padding:10px 16px; cursor:pointer; background:#3d4a2a; color:#c4a454; border:1px solid #4a5a32; border-radius:4px; margin-top:8px;';
    this.sidebarEl.appendChild(saveBtn);

    const exitBtn = document.createElement('button');
    exitBtn.textContent = 'Exit to Menu';
    exitBtn.dataset.action = 'exit';
    exitBtn.style.cssText =
      'font-size:14px; padding:8px 14px; cursor:pointer; background:#2a3a2a; color:#8a9a6a; border:1px solid #3a4a32; border-radius:4px;';
    this.sidebarEl.appendChild(exitBtn);

    this.updateBrushHighlight();
  }

  private updateBrushHighlight(): void {
    const selectedBgFor = (brushValue: string): string => {
      if (brushValue === `terrain:${TerrainLevel.ELEVATED_1}`) return '#3a4a2a';
      if (brushValue === `terrain:${TerrainLevel.ELEVATED_2}`) return '#4a3a4a';
      return '#2a3a3a';
    };
    const toBrushValue = (data: string): string => {
      if (data.startsWith('terrain:')) return data;
      if (data.startsWith('unit:')) return data;
      if (data.startsWith('building:')) return data;
      return '';
    };
    const currentValue =
      this.brush.mode === 'terrain'
        ? `terrain:${this.brush.level}`
        : this.brush.mode === 'unit'
          ? `unit:${this.brush.type}:${this.brush.team}`
          : `building:${this.brush.type}`;
    this.sidebarEl.querySelectorAll<HTMLButtonElement>('[data-brush]').forEach((btn) => {
      const brushValue = btn.dataset.brush ? toBrushValue(btn.dataset.brush) : '';
      const isSelected = brushValue === currentValue;
      btn.style.background = isSelected ? selectedBgFor(currentValue) : '#2a2a2a';
      btn.style.color = isSelected ? '#ffff00' : '#aaaaaa';
    });
  }

  private bindSidebarHandlers(): void {
    this.sidebarEl.querySelectorAll<HTMLButtonElement>('[data-brush]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const data = btn.dataset.brush ?? '';
        if (data.startsWith('terrain:')) {
          this.brush = { mode: 'terrain', level: Number(data.slice(8)) as TerrainLevel };
        } else if (data.startsWith('unit:')) {
          const [, type, team] = data.split(':');
          this.brush = { mode: 'unit', type: type as SavedUnitType, team: team as SavedTeam };
        } else if (data.startsWith('building:')) {
          this.brush = { mode: 'building', type: data.slice(9) as SavedBuildingType };
        }
        this.updateBrushHighlight();
      });
    });

    this.sidebarEl.querySelector<HTMLButtonElement>('[data-action="new-map"]')?.addEventListener('click', () => this.createNewMap());
    this.sidebarEl.querySelector<HTMLButtonElement>('[data-action="save"]')?.addEventListener('click', () => this.saveMap());
    this.sidebarEl.querySelector<HTMLButtonElement>('[data-action="exit"]')?.addEventListener('click', () => this.scene.start('MenuScene'));
  }

  private createNewMap(): void {
    const w = Phaser.Math.Clamp(
      parseInt(this.widthInput.value, 10) || DEFAULT_WIDTH,
      MIN_SIZE,
      MAX_SIZE
    );
    const h = Phaser.Math.Clamp(
      parseInt(this.heightInput.value, 10) || DEFAULT_HEIGHT,
      MIN_SIZE,
      MAX_SIZE
    );
    this.terrainRenderer.destroy();
    this.map = new TerrainMap(w, h);
    this.terrainRenderer = new TerrainRenderer(this, this.map);
    this.terrainRenderer.render();
    this.editorEntities = { units: [], buildings: [] };
    this.refreshEntitySprites();
    this.cameras.main.setBounds(0, 0, w * TILE_SIZE, h * TILE_SIZE);
    this.scale.emit('resize');
  }

  private saveMap(): void {
    const data: SavedMapData = this.map.toData(this.editorEntities);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  private refreshEntitySprites(): void {
    this.entitySprites.forEach((s) => s.destroy());
    this.entitySprites = [];
    const depth = 50;
    const unitSize = 52;
    const buildingSizes: Record<SavedBuildingType, { w: number; h: number }> = {
      castle: { w: 80, h: 64 },
      barracks: { w: 48, h: 64 },
      archery: { w: 48, h: 64 },
      tower: { w: 32, h: 64 },
      monastery: { w: 48, h: 64 },
    };
    for (const u of this.editorEntities.units) {
      const color = u.team === 'player' ? 'blue' : 'red';
      const key = `${UNIT_TEXTURE[u.type]}-${color}`;
      if (!this.textures.exists(key)) continue;
      const x = this.map.toPixelX(u.col) + TILE_SIZE / 2;
      const y = this.map.toPixelY(u.row) + TILE_SIZE / 2;
      const sprite = this.add.sprite(x, y, key);
      sprite.setDisplaySize(unitSize, unitSize).setDepth(depth);
      this.entitySprites.push(sprite);
    }
    for (const b of this.editorEntities.buildings) {
      const key = BUILDING_TEXTURE[b.type];
      if (!this.textures.exists(key)) continue;
      const x = this.map.toPixelX(b.col) + TILE_SIZE / 2;
      const y = this.map.toPixelY(b.row) + TILE_SIZE / 2;
      const sizes = buildingSizes[b.type];
      const sprite = this.add.sprite(x, y, key);
      sprite.setDisplaySize(sizes.w, sizes.h).setDepth(depth);
      this.entitySprites.push(sprite);
    }
  }

  private removeEntityAt(worldX: number, worldY: number): void {
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    const idxU = this.editorEntities.units.findIndex((u) => u.col === col && u.row === row);
    if (idxU >= 0) {
      this.editorEntities.units.splice(idxU, 1);
      this.refreshEntitySprites();
      return;
    }
    const idxB = this.editorEntities.buildings.findIndex((b) => b.col === col && b.row === row);
    if (idxB >= 0) {
      this.editorEntities.buildings.splice(idxB, 1);
      this.refreshEntitySprites();
    }
  }

  private setupCameraViewport(): void {
    this.cameras.main.setViewport(
      SIDE_PANEL_WIDTH,
      0,
      this.scale.width - SIDE_PANEL_WIDTH,
      this.scale.height
    );
  }

  private setupPaintInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < SIDE_PANEL_WIDTH) return;
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;
      const col = Math.floor(worldX / TILE_SIZE);
      const row = Math.floor(worldY / TILE_SIZE);

      if (pointer.rightButtonDown()) {
        this.removeEntityAt(worldX, worldY);
        return;
      }
      if (!pointer.leftButtonDown()) return;

      if (this.brush.mode === 'terrain') {
        this.isDragging = true;
        this.paintAt(worldX, worldY);
        return;
      }
      if (this.brush.mode === 'unit' || this.brush.mode === 'building') {
        if (row < 0 || row >= this.map.height || col < 0 || col >= this.map.width) return;
        if (this.brush.mode === 'unit') {
          this.editorEntities.units.push({ col, row, type: this.brush.type, team: this.brush.team });
        } else {
          this.editorEntities.buildings.push({ col, row, type: this.brush.type });
        }
        this.refreshEntitySprites();
      }
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < SIDE_PANEL_WIDTH) return;
      if (!this.isDragging || !pointer.leftButtonDown()) return;
      this.paintAt(pointer.worldX, pointer.worldY);
    });
    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.input.keyboard?.on('keydown-DELETE', () => {
      const p = this.input.activePointer;
      if (p.x >= SIDE_PANEL_WIDTH) this.removeEntityAt(p.worldX, p.worldY);
    });
    this.input.keyboard?.on('keydown-BACKSPACE', () => {
      const p = this.input.activePointer;
      if (p.x >= SIDE_PANEL_WIDTH) this.removeEntityAt(p.worldX, p.worldY);
    });
  }

  private paintAt(worldX: number, worldY: number): void {
    if (this.brush.mode !== 'terrain') return;
    const col = Math.floor(worldX / TILE_SIZE);
    const row = Math.floor(worldY / TILE_SIZE);
    if (row < 0 || row >= this.map.height || col < 0 || col >= this.map.width) return;
    if (this.map.getLevel(row, col) === this.brush.level) return;

    this.map.set(row, col, this.brush.level, 0);
    this.refreshTerrain();
  }

  private refreshTerrain(): void {
    this.terrainRenderer.destroy();
    this.terrainRenderer = new TerrainRenderer(this, this.map);
    this.terrainRenderer.render();
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.map.width * TILE_SIZE, this.map.height * TILE_SIZE);

    const computeFitZoom = (): number =>
      Math.max(cam.width / (this.map.width * TILE_SIZE), cam.height / (this.map.height * TILE_SIZE));
    const MIN_ZOOM_MULTIPLIER = 2;
    const MAX_ZOOM = 2.5;
    const getMinZoom = (): number => computeFitZoom() * MIN_ZOOM_MULTIPLIER;
    const getMaxZoom = (): number => MAX_ZOOM;

    const applyZoom = (newZoom: number): void => {
      cam.setZoom(Phaser.Math.Clamp(newZoom, getMinZoom(), getMaxZoom()));
    };

    applyZoom(getMinZoom());

    this.input.on('wheel', (_p: unknown, _g: unknown, _dx: number, dy: number) => {
      applyZoom(cam.zoom * (1 - dy * 0.001));
    });

    this.scale.on('resize', () => {
      this.setupCameraViewport();
      applyZoom(cam.zoom);
    });
  }
}
