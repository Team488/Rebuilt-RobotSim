import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile, EV_SCORED } from "../GameConst";
import {
  findBestEVBall,
  getScoringLocation,
  getPathTarget,
  isInTeamZone,
} from "../StrategyUtils";

export class AggressiveStrikerStrategy extends ActiveScoringStrategy {
  name = "Aggressive Striker";
  actionTime = 0.5; // Very aggressive/fast

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount >= robot.maxBalls) {
      this.status = "Rushing to score";
      const scoreLoc = getScoringLocation(field, robot.team);
      if (scoreLoc) {
        return getPathTarget(field, robot, {
          x: scoreLoc.x + 0.5,
          y: scoreLoc.y + 0.5,
        });
      }
    }

    // Prioritize balls deep in the neutral or opponent zone
    const { ball: deepBall } = findBestEVBall(
      field,
      robot,
      robot,
      EV_SCORED,
      (_, c) => {
        // Ball is NOT in our zone
        return !isInTeamZone(c + 0.5, robot.team);
      },
    );

    if (deepBall) {
      this.status = "Hunting deep balls";
      return getPathTarget(field, robot, deepBall);
    }

    const { ball: anyBall } = findBestEVBall(field, robot, robot, EV_SCORED);
    if (anyBall) {
      this.status = "Scanning for targets";
      return getPathTarget(field, robot, anyBall);
    }

    this.status = "Patrolling field";
    return null;
  }

  decideAction(robot: Robot, field: Field): Action | null {
    if (robot.ballCount > 0) {
      const scoringLoc = getScoringLocation(field, robot.team);
      if (isInTeamZone(robot.x, robot.team) && scoringLoc) {
        const dx = scoringLoc.x + 0.5 - robot.x;
        const dy = scoringLoc.y + 0.5 - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= robot.maxShootDistance) {
          return { type: "SHOOT", distance: dist, angle: Math.atan2(dy, dx) };
        }
      }
    }

    if (robot.ballCount < robot.maxBalls) {
      const r = Math.floor(robot.y);
      const c = Math.floor(robot.x);
      if (
        r >= 0 &&
        r < field.grid.length &&
        c >= 0 &&
        c < field.grid[0].length
      ) {
        if (field.grid[r][c] === FieldTile.BALL) {
          return { type: "COLLECT" };
        }
      }
    }
    return null;
  }
}
