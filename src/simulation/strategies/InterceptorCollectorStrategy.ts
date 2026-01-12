import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile, FIELD_WIDTH, FIELD_HEIGHT } from "../GameConst";
import {
  findBestEVBall,
  getPathTarget,
  getStagingLocation,
} from "../StrategyUtils";

export class InterceptorCollectorStrategy extends InactiveScoringStrategy {
  id = "interceptor_collector";
  name = "Neutral Interceptor";
  actionTime = 0.4;
  isDelivering = false;
  patience = 0;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount >= robot.maxBalls) {
      this.isDelivering = true;
    } else if (robot.ballCount === 0) {
      this.isDelivering = false;
    }

    if (this.isDelivering) {
      this.status = "Returning to staging";
      const stagingLoc = getStagingLocation(field, robot.team);
      if (stagingLoc) {
        const target = getPathTarget(field, robot, {
          x: stagingLoc.x + 0.5,
          y: stagingLoc.y + 0.5,
        });
        if (target) {
          this.patience = 0;
          return target;
        }
      }
    }

    // Collection: Prioritize balls in NEUTRAL zone
    const { ball: neutralBall } = findBestEVBall(
      field,
      robot,
      robot,
      1.0,
      (_, c) => {
        const ratio = (c + 0.5) / FIELD_WIDTH;
        return ratio > 0.35 && ratio < 0.65;
      },
    );

    if (neutralBall) {
      const target = getPathTarget(field, robot, neutralBall);
      if (target) {
        this.patience = 0;
        this.status = "Intercepting in neutral zone";
        return target;
      }
    }

    // Unstick/Patrol logic
    this.patience++;
    if (this.patience > 5) {
      this.status = "Patrolling & searching";
      if (this.patience > 20) this.patience = 0;
      // Patrol the center line with some vertical variance
      const centerX = FIELD_WIDTH / 2;
      const targetY = robot.y + (Math.random() - 0.5) * 10;
      return getPathTarget(field, robot, { x: centerX, y: Math.max(1, Math.min(FIELD_HEIGHT - 2, targetY)) });
    }

    this.status = "Patrolling the midline";
    const centerX = FIELD_WIDTH / 2;
    return getPathTarget(field, robot, { x: centerX, y: robot.y });
  }

  decideAction(robot: Robot, field: Field): Action | null {
    const r = Math.floor(robot.y);
    const c = Math.floor(robot.x);

    if (!this.isDelivering) {
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
    } else {
      const stagingLoc = getStagingLocation(field, robot.team);
      if (stagingLoc) {
        const dx = stagingLoc.x + 0.5 - robot.x;
        const dy = stagingLoc.y + 0.5 - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= robot.maxShootDistance && dist > 1.0) {
          return { type: "SHOOT", distance: dist, angle: Math.atan2(dy, dx) };
        }
        if (dist <= 1.0 && field.grid[r][c] === FieldTile.EMPTY) {
          return { type: "DROP" };
        }
      }
    }
    return null;
  }
}
