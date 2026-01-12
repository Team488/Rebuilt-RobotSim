import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile, FIELD_WIDTH } from "../GameConst";
import {
  findBestEVBall,
  findNearestEmptyTile,
  getPathTarget,
  isInTeamZone,
} from "../StrategyUtils";

export class ThiefCollectorStrategy extends InactiveScoringStrategy {
  id = "thief_collector";
  name = "Opponent Thief";
  actionTime = 0.5;
  isDelivering = false;

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount >= robot.maxBalls) {
      this.isDelivering = true;
    } else if (robot.ballCount === 0) {
      this.isDelivering = false;
    }

    const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
    if (!goal) return null;

    if (this.isDelivering) {
      this.status = "Stealthily returning loot";
      const nearestEmpty = findNearestEmptyTile(
        field,
        { x: goal.tileX, y: goal.tileY },
        4,
        { x: goal.tileX, y: goal.tileY },
      );
      if (nearestEmpty) return getPathTarget(field, robot, nearestEmpty);
    }

    // Collection: Prioritize balls in OPPONENT zone
    const { ball: opponentBall } = findBestEVBall(
      field,
      robot,
      { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
      1.0,
      (_, c) => {
        // Is it in opponent's side of the field?
        return (
          !isInTeamZone(c + 0.5, robot.team) &&
          (robot.team === "RED" ? c > FIELD_WIDTH * 0.6 : c < FIELD_WIDTH * 0.4)
        );
      },
    );

    if (opponentBall) {
      this.status = "Infiltrating opponent territory";
      return getPathTarget(field, robot, opponentBall);
    }

    const { ball: anyBall } = findBestEVBall(
      field,
      robot,
      { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
      1.0,
    );
    if (anyBall) {
      this.status = "Scavenging for any balls";
      return getPathTarget(field, robot, anyBall);
    }

    this.status = "Lurking";
    return null;
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
      const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
      if (goal) {
        const dx = robot.x - (goal.tileX + 0.5);
        const dy = robot.y - (goal.tileY + 0.5);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= 4 && field.grid[r][c] === FieldTile.EMPTY) {
          return { type: "DROP" };
        }
      }
    }
    return null;
  }
}
