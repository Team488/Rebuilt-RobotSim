import {
  TEAM_RED,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  EV_OWN_ZONE,
  EV_NEUTRAL_ZONE,
  EV_OPPONENT_ZONE,
  DIST_EV_COST,
  FieldTile,
} from "./GameConst";
import type { Team } from "./GameConst";
// import { FieldTile } from './Field'; // Removed
import type { Field } from "./Field";
import type { Robot } from "./Robot";
import { AStar } from "./AStar";

export function getBallEV(
  x: number,
  y: number,
  team: Team,
  field: Field,
): number {
  const ratio = x / FIELD_WIDTH;
  let baseEV = 0;

  // Continuous EV Logic
  // Control Points at center of each zone (1/6, 3/6, 5/6)
  const cpLeftX = 1 / 6;
  const cpMidX = 3 / 6;
  const cpRightX = 5 / 6;

  let evLeft, evMid, evRight;

  if (team === TEAM_RED) {
    // Red owns Left side
    evLeft = EV_OWN_ZONE;
    evMid = EV_NEUTRAL_ZONE;
    evRight = EV_OPPONENT_ZONE;
  } else {
    // Blue owns Right side
    evLeft = EV_OPPONENT_ZONE;
    evMid = EV_NEUTRAL_ZONE;
    evRight = EV_OWN_ZONE;
  }

  // Linear Interpolation
  // We clamp the ratio to be within field bounds effectively by clamping the result
  // to the nearest control point if we are near the edge.
  // Actually, simple lerp between segments:

  if (ratio <= cpLeftX) {
    baseEV = evLeft;
  } else if (ratio >= cpRightX) {
    baseEV = evRight;
  } else if (ratio < cpMidX) {
    // Between Left and Mid
    const t = (ratio - cpLeftX) / (cpMidX - cpLeftX);
    baseEV = evLeft + t * (evMid - evLeft);
  } else {
    // Between Mid and Right
    const t = (ratio - cpMidX) / (cpRightX - cpMidX);
    baseEV = evMid + t * (evRight - evMid);
  }

  // Add proximity bonus gradient
  const scoreLoc = field.scoringLocations.find((sl) => sl.team === team);
  if (scoreLoc) {
    const dx = x - (scoreLoc.tileX + 0.5);
    const dy = y - (scoreLoc.tileY + 0.5);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxFieldDist = Math.sqrt(
      FIELD_WIDTH * FIELD_WIDTH + FIELD_HEIGHT * FIELD_HEIGHT,
    );

    // Bonus increases as ball gets closer to score location
    // 0.09 ensures we don't accidentally exceed the next zone's step (usually 0.1-0.3)
    const proximityBonus = 0.09 * (1 - Math.min(dist / maxFieldDist, 1));
    return baseEV + proximityBonus;
  }

  return baseEV;
}

export function calculateSelectionScore(
  start: { x: number; y: number },
  ball: { x: number; y: number },
  target: { x: number; y: number },
  currentEV: number,
  targetEV: number,
): number {
  const distToBall = Math.sqrt(
    Math.pow(ball.x - start.x, 2) + Math.pow(ball.y - start.y, 2),
  );
  const distToTarget = Math.sqrt(
    Math.pow(target.x - ball.x, 2) + Math.pow(target.y - ball.y, 2),
  );

  // Total distance cost
  const totalDist = distToBall + distToTarget;

  // Avoid division by zero
  if (totalDist < 0.001) return Infinity;

  // Gain
  const evGain = targetEV - currentEV;

  // Score: Heavily weight Gain (e.g. 1 point of gain is worth 100m of travel)
  // We want to maximize this score.
  // Logic: If I gain 1.0 EV, I am willing to travel 100 tiles.
  // If I gain 0.0, I am willing to travel 0 tiles.
  return evGain - totalDist * DIST_EV_COST;
}

export function getStagingLocation(
  field: Field,
  team: Team,
): { x: number; y: number } | null {
  const teamScoringLoc = field.scoringLocations.find((sl) => sl.team === team);
  if (!teamScoringLoc) return null;

  const offsetX = teamScoringLoc.team === TEAM_RED ? 2 : -2;
  return {
    x: teamScoringLoc.tileX + offsetX,
    y: teamScoringLoc.tileY,
  };
}

export function getScoringLocation(
  field: Field,
  team: Team,
): { x: number; y: number } | null {
  const teamScoringLoc = field.scoringLocations.find((sl) => sl.team === team);
  if (!teamScoringLoc) return null;
  return {
    x: teamScoringLoc.tileX,
    y: teamScoringLoc.tileY,
  };
}

export function findBestEVBall(
  field: Field,
  robot: Robot,
  targetPos: { x: number; y: number },
  targetEV: number,
  filterFn?: (r: number, c: number) => boolean,
): { ball: { x: number; y: number } | null; ballsOnField: number } {
  let bestBall: { x: number; y: number } | null = null;
  let maxScore = -Infinity;
  let ballsOnField = 0;

  for (let r = 0; r < field.grid.length; r++) {
    for (let c = 0; c < field.grid[0].length; c++) {
      if (field.grid[r][c] === FieldTile.BALL) {
        if (filterFn && !filterFn(r, c)) continue;

        ballsOnField++;

        const bx = c + 0.5;
        const by = r + 0.5;
        const ballPos = { x: bx, y: by };
        const currentEV = getBallEV(bx, by, robot.team, field);

        const score = calculateSelectionScore(
          robot,
          ballPos,
          targetPos,
          currentEV,
          targetEV,
        );

        if (score > maxScore) {
          maxScore = score;
          bestBall = ballPos;
        }
      }
    }
  }

  return { ball: bestBall, ballsOnField };
}

export function getCollectionVector(
  field: Field,
  robot: Robot,
  stagingLoc: { x: number; y: number },
  stagingEV: number,
  excludeBall?: { x: number; y: number },
): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;

  // Iterate over all balls
  for (let r = 0; r < field.grid.length; r++) {
    for (let c = 0; c < field.grid[0].length; c++) {
      if (field.grid[r][c] === FieldTile.BALL) {
        // Check if this is the excluded ball (approximate float match)
        if (
          excludeBall &&
          Math.abs(c - excludeBall.x) < 0.1 &&
          Math.abs(r - excludeBall.y) < 0.1
        ) {
          continue;
        }

        const ballX = c + 0.5;
        const ballY = r + 0.5;

        // 1. Calculate Potential Gain
        // How much do we gain by moving this ball to staging?
        const currentEV = getBallEV(ballX, ballY, robot.team, field);
        const gain = stagingEV - currentEV;

        // If gain is negative or negligible, ignore (ball is already good)
        if (gain <= 0.01) continue;

        // 2. Calculate Cost (Total Distance)
        const distToBall = Math.sqrt(
          Math.pow(ballX - robot.x, 2) + Math.pow(ballY - robot.y, 2),
        );
        const distToStaging = Math.sqrt(
          Math.pow(stagingLoc.x - ballX, 2) + Math.pow(stagingLoc.y - ballY, 2),
        );
        const totalDist = distToBall + distToStaging;

        if (totalDist < 0.001) continue;

        // 3. Force Magnitude = Gain / Cost^2
        // We square cost to make local options stronger, but Gain is the multiplier.
        // Adjustable: Power of 1.5 or 2.
        // Using 2.0 to strongly discourage infinite travel for marginal gains
        const force = gain / Math.pow(totalDist, 2.0);

        // 4. Direction (Robot -> Ball)
        // We only care about the direction TO the ball
        if (distToBall > 0.001) {
          const dirX = (ballX - robot.x) / distToBall;
          const dirY = (ballY - robot.y) / distToBall;

          sumX += dirX * force;
          sumY += dirY * force;
        }
      }
    }
  }

  // Normalize if significant
  const mag = Math.sqrt(sumX * sumX + sumY * sumY);
  if (mag > 0.001) {
    return { x: sumX / mag, y: sumY / mag };
  }

  return { x: 0, y: 0 };
}

export function findNearestEmptyTile(
  field: Field,
  center: { x: number; y: number }, // Integer coordinates
  radius: number,
  excludePos?: { x: number; y: number }, // Integer coordinates
): { x: number; y: number } | null {
  let nearestEmpty: { x: number; y: number } | null = null;
  let nearestEmptyDist = Infinity;

  const cx = center.x;
  const cy = center.y;

  for (
    let r = Math.max(0, cy - radius);
    r <= Math.min(field.grid.length - 1, cy + radius);
    r++
  ) {
    for (
      let c = Math.max(0, cx - radius);
      c <= Math.min(field.grid[0].length - 1, cx + radius);
      c++
    ) {
      if (excludePos && c === excludePos.x && r === excludePos.y) continue;

      if (field.grid[r][c] === FieldTile.EMPTY) {
        // Return CENTER of tile
        const ex = c + 0.5;
        const ey = r + 0.5;
        // Heuristic: check dist from center of search area
        const d = Math.abs(c - cx) + Math.abs(r - cy);

        if (d < nearestEmptyDist) {
          nearestEmptyDist = d;
          nearestEmpty = { x: ex, y: ey };
        }
      }
    }
  }
  return nearestEmpty;
}

export function getPathTarget(
  field: Field,
  robot: Robot,
  target: { x: number; y: number },
): { x: number; y: number } | null {
  const path = AStar.findPath(field, { x: robot.x, y: robot.y }, target);
  if (!path) return null;
  if (path.length < 2) return target;

  // The first point in path is the center of the current tile or the start position.
  // We want the NEXT point to move towards.
  // If we're already very close to path[0], path[1] is the next target.
  // However, AStar.findPath returns path[0] as the center of the START tile.

  // Check if we are already at path[0]'s tile
  const currentTileX = Math.floor(robot.x);
  const currentTileY = Math.floor(robot.y);
  const path0TileX = Math.floor(path[0].x);
  const path0TileY = Math.floor(path[0].y);

  if (currentTileX === path0TileX && currentTileY === path0TileY) {
    return path[1];
  }

  return path[0];
}

export function calculateHeading(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function isInTeamZone(x: number, team: Team): boolean {
  if (team === TEAM_RED) {
    return x < FIELD_WIDTH / 3;
  } else {
    return x >= (2 * FIELD_WIDTH) / 3;
  }
}
