import { Field } from "./Field";
import type { Team } from "./GameConst";

export interface RobotStrategy {
  moveSpeed: number; // Meters per second
  actionTime: number; // Seconds

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null;
  decideAction(robot: Robot, field: Field): Action | null;
}

export type Action =
  | { type: "SHOOT"; distance: number; angle: number }
  | { type: "COLLECT" }
  | { type: "DROP" };

export class Robot {
  id: string;
  x: number;
  y: number;
  team: Team;
  ballCount: number = 0;
  maxBalls: number = 3;
  shotCooldown: number = 0;
  maxShootDistance: number = 10; // Default max shoot distance

  scoringStrategy: RobotStrategy;
  collectionStrategy: RobotStrategy;
  currentMode: "SCORING" | "COLLECTING" = "COLLECTING";

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

  move(field: Field, dt: number) {
    const moveTarget = this.currentStrategy.decideMove(this, field);
    if (moveTarget) {
      const dx = moveTarget.x - this.x;
      const dy = moveTarget.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.1) {
        const step = this.currentStrategy.moveSpeed * dt;
        this.x += (dx / dist) * Math.min(step, dist);
        this.y += (dy / dist) * Math.min(step, dist);
      }
    }
  }

  do(field: Field) {
    const action = this.currentStrategy.decideAction(this, field);
    if (action?.type === "SHOOT" && this.ballCount > 0) {
      console.log(`${this.id} Shooting!`);
      // Note: Actual scoring handled by Engine/Field check,
      // but here we mark ball as gone from robot.
      // Ideally Engine checks collisions.
      // Let's just consume ball for now from robot state.
      // This is a backup if Engine doesn't catch it, but Engine should handle scoring.
      // PROMPT UPDATE: Engine handles actual score/ball removal?
      // Engine line 133: robot.hasBall = false; -> Needs update to ballCount--
      // We will let Engine handle the logic of modifying ballCount for SHOOT/COLLECT to avoid double counting.
      // But we can log intent here.
    } else if (action?.type === "COLLECT" && this.ballCount < this.maxBalls) {
      console.log(`${this.id} Collecting!`);
      // Engine update handles adding ball to robot
    }
  }
}
