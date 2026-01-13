import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import { findBestEVBall, isInTeamZone } from "../StrategyUtils";

export class LongRangeSniperStrategy extends ActiveScoringStrategy {
  id = "long_range_sniper";
  name = "Long-Range Sniper";
  actionTime = 1.0;
  description =
    "Attempts to score from the edge of the zone to minimize travel distance. High risk, high reward.";

  decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
    if (robot.ballCount === 0) {
      this.status = "Hunting for ammo";
      const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
      if (!goal) return null;

      const { ball } = findBestEVBall(
        field,
        robot,
        { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
        1.0,
        (_, c) => isInTeamZone(c + 0.5, robot.team), // Prefer home zone balls
      );

      if (ball) return ball;

      // If no home zone balls, look everywhere
      const { ball: anyBall } = findBestEVBall(
        field,
        robot,
        { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
        1.0,
      );
      if (anyBall) return anyBall;
    } else {
      this.status = "Positioning for long-distance shot";
      const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
      if (!goal) return null;

      // Stay just barely inside the team zone for maximum distance
      const margin = 2; // 2 tiles inside zone
      let targetX: number;
      if (robot.team === "RED") {
        targetX = field.grid[0].length * 0.35 - margin;
      } else {
        targetX = field.grid[0].length * 0.65 + margin;
      }

      const targetY = goal.tileY + 0.5;

      const dx = targetX - robot.x;
      const dy = targetY - robot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        return { x: targetX, y: targetY };
      }
    }

    return null;
  }

  decideAction(robot: Robot, field: Field): Action | null {
    if (robot.ballCount === 0) {
      const r = Math.floor(robot.y);
      const c = Math.floor(robot.x);
      if (
        r >= 0 &&
        r < field.grid.length &&
        c >= 0 &&
        c < field.grid[0].length &&
        field.grid[r][c] === FieldTile.BALL
      ) {
        return { type: "COLLECT" };
      }
    } else {
      const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
      if (goal) {
        const targetX = goal.tileX + 0.5;
        const targetY = goal.tileY + 0.5;
        const dx = targetX - robot.x;
        const dy = targetY - robot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        if (
          dist <= robot.maxShootDistance &&
          isInTeamZone(robot.x, robot.team)
        ) {
          this.status = `Sniper shot! Dist: ${dist.toFixed(1)}`;
          return { type: "SHOOT", distance: dist, angle };
        }
      }
    }
    return null;
  }
}
