import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
  findBestEVBall,
  getScoringLocation,
  getStagingLocation,
  isInTeamZone,
} from "../StrategyUtils";

export class StagingScoringStrategy extends ActiveScoringStrategy {
  id = "staging_scoring";
  name = "Staging Scoring";
  actionTime = 1.0;
  description =
    "Collects balls and positions itself at a 'sweet spot' distance before scoring rapidly.";

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount > 0) {
      // If in home zone, go score
      if (isInTeamZone(robot.x, robot.team)) {
        this.status = "Moving to score";
        const scoreLoc = getScoringLocation(field, robot.team);
        if (scoreLoc) {
          return {
            x: scoreLoc.x + 0.5,
            y: scoreLoc.y + 0.5,
          };
        }
      }

      // If in neutral/opponent zone, move to staging area or boundary
      const stagingLoc = getStagingLocation(field, robot.team);
      if (stagingLoc) {
        this.status = "Moving to staging";
        return {
          x: stagingLoc.x + 0.5,
          y: stagingLoc.y + 0.5,
        };
      }
    }

    const { ball: bestBall } = findBestEVBall(
      field,
      robot,
      undefined,
      undefined,
      undefined,
      "ABSOLUTE",
    );
    if (bestBall) {
      this.status = "Collecting high-value balls";
      return bestBall;
    }
    this.status = "Awaiting targets";
    return null;
  }

  decideAction(robot: Robot, field: Field): Action | null {
    if (robot.ballCount > 0) {
      const scoringLoc = getScoringLocation(field, robot.team);
      const stagingLoc = getStagingLocation(field, robot.team);

      if (isInTeamZone(robot.x, robot.team) && scoringLoc) {
        const dx = scoringLoc.x + 0.5 - robot.x;
        const dy = scoringLoc.y + 0.5 - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= robot.maxShootDistance) {
          return { type: "SHOOT", distance: dist, angle: Math.atan2(dy, dx) };
        }
      } else if (stagingLoc) {
        // Shoot towards staging from outside
        const dx = stagingLoc.x + 0.5 - robot.x;
        const dy = stagingLoc.y + 0.5 - robot.y;
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
