import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import {
  FieldTile,
  EV_SCORED,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  ZONE_RATIO_LEFT,
  ZONE_RATIO_RIGHT,
} from "../GameConst";
import {
  findBestEVBall,
  getScoringLocation,
  getPathTarget,
  isInTeamZone,
} from "../StrategyUtils";

export class HomeZoneScoringStrategy extends ActiveScoringStrategy {
  name = "Home Zone Specialist";
  actionTime = 1.0;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount > 0) {
      const inZone = isInTeamZone(robot.x, robot.team);
      const scoreLoc = getScoringLocation(field, robot.team);

      if (scoreLoc) {
        if (inZone) {
          const dx = scoreLoc.x + 0.5 - robot.x;
          const dy = scoreLoc.y + 0.5 - robot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= robot.maxShootDistance * 0.9) {
            this.status = "Aiming for goal";
            return null;
          }

          this.status = "Positioning for shot";
          return getPathTarget(field, robot, {
            x: scoreLoc.x + 0.5,
            y: scoreLoc.y + 0.5,
          });
        } else {
          this.status = "Returning to home zone";
          // If somehow outside, rush back
          const safeZoneX =
            robot.team === "RED"
              ? Math.floor(FIELD_WIDTH * ZONE_RATIO_LEFT) - 0.5
              : Math.floor(FIELD_WIDTH * ZONE_RATIO_RIGHT) + 1.5;
          return getPathTarget(field, robot, { x: safeZoneX, y: robot.y });
        }
      }
    }

    // Find ball ONLY in home zone
    const { ball: bestBall } = findBestEVBall(
      field,
      robot,
      robot, // Target current pos to stay local
      EV_SCORED,
      (_, c) => isInTeamZone(c + 0.5, robot.team),
    );

    if (bestBall) {
      this.status = "Collecting in zone";
      return getPathTarget(field, robot, bestBall);
    }

    // Default: Return to center of home zone if idle
    this.status = "Waiting for balls";
    const homeCenterX =
      robot.team === "RED" ? FIELD_WIDTH * 0.15 : FIELD_WIDTH * 0.85;
    return getPathTarget(field, robot, { x: homeCenterX, y: FIELD_HEIGHT / 2 });
  }

  decideAction(robot: Robot, field: Field): Action | null {
    if (robot.ballCount > 0) {
      const targetLoc = field.scoringLocations.find(
        (sl) => sl.team === robot.team,
      );
      if (targetLoc && isInTeamZone(robot.x, robot.team)) {
        const dx = targetLoc.tileX + 0.5 - robot.x;
        const dy = targetLoc.tileY + 0.5 - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= robot.maxShootDistance) {
          const angle = Math.atan2(dy, dx);
          return { type: "SHOOT", distance: dist, angle: angle };
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
        if (
          field.grid[r][c] === FieldTile.BALL &&
          isInTeamZone(c + 0.5, robot.team)
        ) {
          return { type: "COLLECT" };
        }
      }
    }
    return null;
  }
}
