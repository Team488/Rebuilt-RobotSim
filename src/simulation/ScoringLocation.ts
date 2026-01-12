import { Robot } from "./Robot";
import type { Team } from "./GameConst";

export class ScoringLocation {
  tileX: number;
  tileY: number;
  team: Team;
  active: boolean = true;

  constructor(tileX: number, tileY: number, team: Team) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.team = team;
  }

  checkScore(robot: Robot): boolean {
    if (!this.active) return false;
    // Strict tile check
    return (
      Math.floor(robot.x) === this.tileX && Math.floor(robot.y) === this.tileY
    );
  }

  contains(x: number, y: number): boolean {
    return Math.floor(x) === this.tileX && Math.floor(y) === this.tileY;
  }
}
