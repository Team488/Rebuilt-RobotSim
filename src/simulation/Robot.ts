import { Field } from "./Field";
import { AStar } from "./AStar";
import { BASE_TICK_RATE } from "./GameConst";
import type { Team } from "./GameConst";

export type Action =
  | { type: "SHOOT"; distance: number; angle: number }
  | { type: "COLLECT" }
  | { type: "DROP" };

export interface RobotStrategy {
  id: string;
  name: string;
  status: string;
  actionTime: number; // Seconds

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null;
  decideAction(robot: Robot, field: Field): Action | null;
}

export abstract class BaseStrategy implements RobotStrategy {
  abstract id: string;
  abstract name: string;
  status: string = "";
  abstract actionTime: number;

  abstract decideMove(
    robot: Robot,
    field: Field,
  ): { x: number; y: number } | null;
  abstract decideAction(robot: Robot, field: Field): Action | null;
}

export abstract class ActiveScoringStrategy extends BaseStrategy { }
export abstract class InactiveScoringStrategy extends BaseStrategy { }

export class Robot {
  id: string;
  x: number;
  y: number;
  team: Team;
  ballCount: number = 0;
  maxBalls: number = 5;
  moveSpeed: number = 0.5 * BASE_TICK_RATE;
  shotCooldown: number = 0;
  baseShotCooldown: number = 1 / 4 * BASE_TICK_RATE;
  maxShootDistance: number = 100;
  accuracyMin: number = 0.3;
  accuracyMax: number = 0.9;

  scoringStrategy: RobotStrategy;
  collectionStrategy: RobotStrategy;
  currentMode: "SCORING" | "COLLECTING" = "COLLECTING";

  // Performance Cache
  private lastStrategyTarget: { x: number; y: number } | null = null;
  private cachedPath: { x: number; y: number }[] | null = null;
  private lastX: number = 0;
  private lastY: number = 0;
  private stuckTicks: number = 0;

  constructor(
    id: string,
    x: number,
    y: number,
    team: Team,
    scoringStrategy: RobotStrategy,
    collectionStrategy: RobotStrategy,
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.team = team;
    this.scoringStrategy = scoringStrategy;
    this.collectionStrategy = collectionStrategy;
  }

  setMode(mode: "SCORING" | "COLLECTING") {
    this.currentMode = mode;
  }

  get currentStrategy(): RobotStrategy {
    return this.currentMode === "SCORING"
      ? this.scoringStrategy
      : this.collectionStrategy;
  }

  move(field: Field) {
    const target = this.currentStrategy.decideMove(this, field);
    if (!target) {
      this.cachedPath = null;
      this.lastStrategyTarget = null;
      return;
    }

    // Check if we need to re-path
    const targetChanged =
      !this.lastStrategyTarget ||
      Math.abs(target.x - this.lastStrategyTarget.x) > 0.1 ||
      Math.abs(target.y - this.lastStrategyTarget.y) > 0.1;

    // Stuck detection
    const dxLast = this.x - this.lastX;
    const dyLast = this.y - this.lastY;
    const distMoved = Math.sqrt(dxLast * dxLast + dyLast * dyLast);
    if (distMoved < 0.05) {
      this.stuckTicks++;
    } else {
      this.stuckTicks = 0;
    }

    const isStuck = this.stuckTicks > 10;

    if (targetChanged || isStuck || !this.cachedPath || this.cachedPath.length === 0) {
      const path = AStar.findPath(field, { x: this.x, y: this.y }, target);
      if (path && path.length > 1) {
        this.cachedPath = path.slice(1); // Skip current tile
      } else {
        this.cachedPath = path;
      }
      this.lastStrategyTarget = target;
      if (isStuck) this.stuckTicks = 0;
    }

    this.lastX = this.x;
    this.lastY = this.y;

    if (this.cachedPath && this.cachedPath.length > 0) {
      const nextPoint = this.cachedPath[0];
      const dx = nextPoint.x - this.x;
      const dy = nextPoint.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        const step = this.moveSpeed;
        const moveAttempt = Math.min(step, dist);
        this.x += (dx / dist) * moveAttempt;
        this.y += (dy / dist) * moveAttempt;
      } else {
        // Reached waypoint
        this.cachedPath.shift();
      }
    }
  }

  do(_field: Field) {
    // Decision logic handled by Engine/Strategy directly for performance
  }
}
