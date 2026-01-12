import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import {
  FieldTile,
  EV_SCORED,
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
    // If has ball, check if in zone to score or need to move
    if (robot.ballCount > 0) {
      const inZone = isInTeamZone(robot.x, robot.team);
      const scoreLoc = getScoringLocation(field, robot.team);

      if (scoreLoc) {
        if (inZone) {
          // If in zone and within shooting range, stop moving to avoid overshooting
          const dx = scoreLoc.x + 0.5 - robot.x;
          const dy = scoreLoc.y + 0.5 - robot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= robot.maxShootDistance * 0.9) {
            this.status = "Aiming for goal";
            return null;
          }

          // In zone: Go to Goal
          this.status = "Positioning for shot";
          return getPathTarget(field, robot, {
            x: scoreLoc.x + 0.5,
            y: scoreLoc.y + 0.5,
          });
        } else {
          this.status = "Returning to zone";
          // Not in zone: Must move into zone
          // For Red: x < FIELD_WIDTH / 3. For Blue: x >= 2 * FIELD_WIDTH / 3.
          const safeZoneX =
            robot.team === "RED"
              ? Math.floor(FIELD_WIDTH * ZONE_RATIO_LEFT) - 0.5
              : Math.floor(FIELD_WIDTH * ZONE_RATIO_RIGHT) + 1.5;
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
      this.status = "Foraging for balls";
      return getPathTarget(field, robot, bestBall);
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
