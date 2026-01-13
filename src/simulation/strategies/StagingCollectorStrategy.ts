import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
  findBestEVBall,
  findNearestEmptyTile,
  getPathTarget,
  getStagingLocation,
} from "../StrategyUtils";

export class StagingCollectorStrategy extends InactiveScoringStrategy {
  id = "staging_collector";
  name = "Staging Collector";
  actionTime = 0.5;
  description = "Collects balls and drops them off in a pile just outside the home zone for easier retrieval.";
  isDelivering = false;
  patience = 0;

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
      // Find nearest empty tile AROUND staging location to avoid getting stuck
      const dropPos = findNearestEmptyTile(
        field,
        { x: stagingLoc.x, y: stagingLoc.y },
        5, // Wider search
      );

      if (dropPos) {
        const target = getPathTarget(field, robot, dropPos);
        if (target) {
          this.patience = 0;
          return target;
        }
      }
    }

    const { ball } = findBestEVBall(
      field,
      robot,
      { x: stagingLoc.x + 0.5, y: stagingLoc.y + 0.5 },
      1.0,
    );
    if (ball) {
      const target = getPathTarget(field, robot, ball);
      if (target) {
        this.patience = 0;
        this.status = "Collecting for staging";
        return target;
      }
    }

    // Unstick logic
    this.patience++;
    if (this.patience > 15) {
      this.status = "Monitoring & repositioning";
      if (this.patience > 30) this.patience = 0;
      return {
        x: robot.x + (Math.random() - 0.5) * 5,
        y: robot.y + (Math.random() - 0.5) * 5,
      };
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
        if (dist <= robot.maxShootDistance && dist > 2.0) {
          // Check if the target tile is actually empty before shooting
          if (field.getTileAt(stagingLoc.x + 0.5, stagingLoc.y + 0.5) === FieldTile.EMPTY) {
            return {
              type: "SHOOT",
              distance: dist,
              angle: Math.atan2(
                stagingLoc.y + 0.5 - robot.y,
                stagingLoc.x + 0.5 - robot.x,
              ),
            };
          }
        }

        if (dist <= 2.5 && field.grid[r][c] === FieldTile.EMPTY) {
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
