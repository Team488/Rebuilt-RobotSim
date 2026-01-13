import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import {
  FieldTile,
  FIELD_WIDTH,
  ZONE_RATIO_LEFT,
  ZONE_RATIO_RIGHT,
} from "../GameConst";
import {
  findBestEVBall,
  getScoringLocation,
  getPathTarget,
  isInTeamZone,
} from "../StrategyUtils";

export class BasicScoringStrategy extends ActiveScoringStrategy {
  id = "basic_scoring";
  name = "Basic Scoring";
  actionTime = 1.0;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    const scoreLoc = getScoringLocation(field, robot.team);
    if (!scoreLoc) return null;

    const goalPos = { x: scoreLoc.x + 0.5, y: scoreLoc.y + 0.5 };

    // Fill tank first
    if (robot.ballCount < robot.maxBalls) {
      this.status = `Filling tank (${robot.ballCount}/${robot.maxBalls})`;
      const { ball: bestBall } = findBestEVBall(
        field,
        robot,
        undefined,
        undefined,
        undefined,
        "ABSOLUTE"
      );
      if (bestBall) {
        return getPathTarget(field, robot, bestBall);
      }
    }

    // If tank is full or no balls found, go score
    if (robot.ballCount > 0) {
      const inZone = isInTeamZone(robot.x, robot.team);

      if (inZone) {
        const dx = goalPos.x - robot.x;
        const dy = goalPos.y - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= robot.maxShootDistance * 0.9) {
          this.status = "In range, scoring...";
          return null;
        }

        this.status = "Positioning for shot";
        return getPathTarget(field, robot, goalPos);
      } else {
        this.status = "Returning to zone to score";
        const safeZoneX =
          robot.team === "RED"
            ? Math.floor(FIELD_WIDTH * ZONE_RATIO_LEFT) - 0.5
            : Math.floor(FIELD_WIDTH * ZONE_RATIO_RIGHT) + 1.5;
        return getPathTarget(field, robot, { x: safeZoneX, y: robot.y });
      }
    }

    this.status = "Idle";
    return null;
  }

  decideAction(robot: Robot, field: Field): Action | null {
    // Shoot if has ball and IN ZONE
    if (robot.ballCount > 0) {
      const targetLoc = field.scoringLocations.find(
        (sl) => sl.team === robot.team,
      );
      if (targetLoc) {
        const inZone = isInTeamZone(robot.x, robot.team);

        if (inZone) {
          // Standard Scoring Logic
          const dx = targetLoc.tileX + 0.5 - robot.x;
          const dy = targetLoc.tileY + 0.5 - robot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= robot.maxShootDistance) {
            const angle = Math.atan2(dy, dx);
            return { type: "SHOOT", distance: dist, angle: angle };
          }
        }
      }
    }

    // Collect if empty and at ball
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
