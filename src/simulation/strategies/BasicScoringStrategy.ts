import type { RobotStrategy, Action } from "../Robot";
import { Robot } from "../Robot";
import { Field } from "../Field";
import { FieldTile, EV_SCORED, FIELD_WIDTH } from "../GameConst";
import {
  findBestEVBall,
  getScoringLocation,
  getPathTarget,
  isInTeamZone,
} from "../StrategyUtils";

export class BasicScoringStrategy implements RobotStrategy {
  moveSpeed = 3.0; // m/s
  actionTime = 1.0;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    // If has ball, check if in zone to score or need to move
    if (robot.ballCount > 0) {
      const inZone = isInTeamZone(robot.x, robot.team);
      const scoreLoc = getScoringLocation(field, robot.team);

      if (scoreLoc) {
        if (inZone) {
          // In zone: Go to Goal
          return getPathTarget(field, robot, {
            x: scoreLoc.x + 0.5,
            y: scoreLoc.y + 0.5,
          });
        } else {
          // Not in zone: Must move into zone
          // For Red: x < FIELD_WIDTH / 3. For Blue: x >= 2 * FIELD_WIDTH / 3.
          const safeZoneX =
            robot.team === "RED"
              ? FIELD_WIDTH / 3 - 1
              : (2 * FIELD_WIDTH) / 3 + 1;
          return getPathTarget(field, robot, { x: safeZoneX, y: robot.y }); // Move towards zone boundary
        }
      }
    }

    // Else, find ball to reload
    const scoreLoc = getScoringLocation(field, robot.team);
    const targetPos = scoreLoc
      ? { x: scoreLoc.x + 0.5, y: scoreLoc.y + 0.5 }
      : { x: robot.x, y: robot.y };

    const { ball: bestBall } = findBestEVBall(
      field,
      robot,
      targetPos,
      EV_SCORED,
    );
    if (bestBall) {
      return getPathTarget(field, robot, bestBall);
    }
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
