import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
  getBallEV,
  findBestEVBall,
  findNearestEmptyTile,
  getPathTarget,
} from "../StrategyUtils";

export class BasicCollectorStrategy extends InactiveScoringStrategy {
  id = "basic_collector";
  name = "Basic Collector";
  actionTime = 0.5; // Fast pickup
  isDelivering = false;
  lastDropLocation: { x: number; y: number } | null = null;
  patience = 0;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    // Target the Goal directly for maximum efficiency
    const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
    if (!goal) return null;

    const goalPos = { x: goal.tileX + 0.5, y: goal.tileY + 0.5 };
    const goalEV = getBallEV(goalPos.x, goalPos.y, robot.team, field);

    // State Machine logic
    if (robot.ballCount >= robot.maxBalls) {
      this.isDelivering = true;
    } else if (robot.ballCount === 0) {
      this.isDelivering = false;
    }

    // Mode 2: Delivery (if currently delivering or full)
    if (this.isDelivering && robot.ballCount > 0) {
      this.status = `Delivering ${robot.ballCount} balls`;
      // Find the NEAREST empty tile to the scoring location
      // Increased radius to 6 to find a spot even if crowded
      const nearestEmpty = findNearestEmptyTile(
        field,
        { x: goal.tileX, y: goal.tileY },
        6,
        { x: goal.tileX, y: goal.tileY }, // Exclude the goal tile itself
      );
      if (nearestEmpty) {
        const nextTarget = getPathTarget(field, robot, nearestEmpty);
        if (nextTarget) {
          this.patience = 0;
          return nextTarget;
        }
      }
    }

    // Mode 1: Collection
    if (!this.isDelivering && robot.ballCount < robot.maxBalls) {
      this.status = `Searching for balls (${robot.ballCount}/${robot.maxBalls})`;
      const { ball } = findBestEVBall(
        field,
        robot,
        goalPos,
        goalEV,
        (r, c) =>
          (!this.lastDropLocation ||
            c !== this.lastDropLocation.x ||
            r !== this.lastDropLocation.y) &&
          // Avoid balls very close to robots that might be "contested" or blocked
          true,
      );

      if (ball) {
        const nextTarget = getPathTarget(field, robot, ball);
        if (nextTarget) {
          this.patience = 0;
          return nextTarget;
        }
      }
    }

    // Unstick logic: move randomly if idle/stuck
    this.patience++;
    if (this.patience > 15) {
      this.status = "Unsticking... moving randomly";
      if (this.patience > 30) this.patience = 0;
      return {
        x: robot.x + (Math.random() - 0.5) * 4,
        y: robot.y + (Math.random() - 0.5) * 4,
      };
    }

    this.status = "Waiting for path";
    return null;
  }

  decideAction(robot: Robot, field: Field): Action | null {
    const r = Math.floor(robot.y);
    const c = Math.floor(robot.x);

    const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
    if (!goal) return null;

    const goalPos = { x: goal.tileX + 0.5, y: goal.tileY + 0.5 };

    // Collect if on a ball and it's worth moving
    if (
      !this.isDelivering &&
      r >= 0 &&
      r < field.grid.length &&
      c >= 0 &&
      c < field.grid[0].length
    ) {
      if (
        field.grid[r][c] === FieldTile.BALL &&
        robot.ballCount < robot.maxBalls
      ) {
        const currentEV = getBallEV(c + 0.5, r + 0.5, robot.team, field);
        const goalEV = getBallEV(goalPos.x, goalPos.y, robot.team, field);

        // Only collect if there is meaningful gain moving it to the goal
        if (goalEV - currentEV > 0.01) {
          return { type: "COLLECT" };
        }
      }
    }

    // Drop if "close enough" to Goal and tile is empty
    if (robot.ballCount > 0 && this.isDelivering) {
      const dx = robot.x - goalPos.x;
      const dy = robot.y - goalPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isGoal = goal.tileX === c && goal.tileY === r;

      // Drop if within range (4) of goal and on an empty tile
      if (dist <= 4 && field.grid[r][c] === FieldTile.EMPTY && !isGoal) {
        this.lastDropLocation = { x: c, y: r };
        return { type: "DROP" };
      }
    }

    return null;
  }
}
