import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
  findBestEVBall,
  getPathTarget,
  getStagingLocation,
} from "../StrategyUtils";

export class StagingCollectorStrategy extends InactiveScoringStrategy {
  id = "staging_collector";
  name = "Staging Collector";
  actionTime = 0.6;
  isDelivering = false;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount >= robot.maxBalls) {
      this.isDelivering = true;
    } else if (robot.ballCount === 0) {
      this.isDelivering = false;
    }

    const stagingLoc = getStagingLocation(field, robot.team);
    if (!stagingLoc) return null;

    if (this.isDelivering) {
      this.status = "Moving to staging area";
      return getPathTarget(field, robot, {
        x: stagingLoc.x + 0.5,
        y: stagingLoc.y + 0.5,
      });
    }

    const { ball } = findBestEVBall(
      field,
      robot,
      { x: stagingLoc.x + 0.5, y: stagingLoc.y + 0.5 },
      1.0,
    );
    if (ball) {
      this.status = "Collecting for staging";
      return getPathTarget(field, robot, ball);
    }

    this.status = "Monitoring field";
    return null;
  }

  decideAction(robot: Robot, field: Field): Action | null {
    const r = Math.floor(robot.y);
    const c = Math.floor(robot.x);

    if (this.isDelivering) {
      const stagingLoc = getStagingLocation(field, robot.team);
      if (stagingLoc) {
        const dx = robot.x - (stagingLoc.x + 0.5);
        const dy = robot.y - (stagingLoc.y + 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If close to staging or IN range to shoot it there
        if (dist <= robot.maxShootDistance && dist > 1.5) {
          return {
            type: "SHOOT",
            distance: dist,
            angle: Math.atan2(
              stagingLoc.y + 0.5 - robot.y,
              stagingLoc.x + 0.5 - robot.x,
            ),
          };
        }

        if (dist <= 1.5 && field.grid[r][c] === FieldTile.EMPTY) {
          return { type: "DROP" };
        }
      }
    } else {
      if (
        r >= 0 &&
        r < field.grid.length &&
        c >= 0 &&
        c < field.grid[0].length
      ) {
        if (
          field.grid[r][c] === FieldTile.BALL &&
          robot.ballCount < robot.maxBalls
        ) {
          return { type: "COLLECT" };
        }
      }
    }
    return null;
  }
}
