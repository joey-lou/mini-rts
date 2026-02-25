import { UnitType } from "../entities/Unit";

export interface UnitActionConfig {
  action: string;
  /** Phaser asset key — preloaded in PreloadScene as ui-icon-N */
  iconKey: string;
  label: string;
  tooltip?: string;
}

/**
 * Icon key mapping:
 *   ui-icon-1  → sword/attack
 *   ui-icon-2  → move/boots
 *   ui-icon-3  → stop/shield
 *   ui-icon-4  → build/hammer
 *   ui-icon-5  → patrol/flag
 *   ui-icon-6  → harvest/axe
 *   ui-icon-7  → general action
 *   ui-icon-8  → general action
 */
export const UNIT_ACTION_CONFIGS: Record<UnitType, UnitActionConfig[]> = {
  footman: [
    { action: "move",   iconKey: "ui-icon-2", label: "MOVE",   tooltip: "Right-click to move" },
    { action: "attack", iconKey: "ui-icon-1", label: "ATTACK", tooltip: "Attack nearest enemy" },
    { action: "stop",   iconKey: "ui-icon-3", label: "STOP",   tooltip: "Stop current action" },
    { action: "build",  iconKey: "ui-icon-4", label: "BUILD",  tooltip: "Construct a building" },
  ],
  archer: [
    { action: "move",   iconKey: "ui-icon-2", label: "MOVE",    tooltip: "Right-click to move" },
    { action: "attack", iconKey: "ui-icon-1", label: "ATTACK",  tooltip: "Ranged attack" },
    { action: "stop",   iconKey: "ui-icon-3", label: "STOP",    tooltip: "Stop current action" },
    { action: "patrol", iconKey: "ui-icon-5", label: "PATROL",  tooltip: "Patrol between points" },
  ],
  peasant: [
    { action: "move",    iconKey: "ui-icon-2", label: "MOVE",    tooltip: "Right-click to move" },
    { action: "build",   iconKey: "ui-icon-4", label: "BUILD",   tooltip: "Construct a building" },
    { action: "harvest", iconKey: "ui-icon-6", label: "HARVEST", tooltip: "Gather resources" },
    { action: "stop",    iconKey: "ui-icon-3", label: "STOP",    tooltip: "Stop current action" },
  ],
  knight: [
    { action: "move",   iconKey: "ui-icon-2", label: "MOVE",   tooltip: "Right-click to move" },
    { action: "attack", iconKey: "ui-icon-1", label: "ATTACK", tooltip: "Melee attack" },
    { action: "stop",   iconKey: "ui-icon-3", label: "STOP",   tooltip: "Stop current action" },
  ],
  lancer: [
    { action: "move",   iconKey: "ui-icon-2", label: "MOVE",   tooltip: "Right-click to move" },
    { action: "attack", iconKey: "ui-icon-1", label: "ATTACK", tooltip: "Lance charge" },
    { action: "stop",   iconKey: "ui-icon-3", label: "STOP",   tooltip: "Stop current action" },
    { action: "patrol", iconKey: "ui-icon-5", label: "PATROL", tooltip: "Patrol between points" },
  ],
};
