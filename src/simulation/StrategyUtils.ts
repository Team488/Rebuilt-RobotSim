import {
  TEAM_RED,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  EV_OWN_ZONE,
  EV_NEUTRAL_ZONE,
  EV_OPPONENT_ZONE,
  DIST_EV_COST,
  FieldTile,
  ZONE_RATIO_LEFT,
  ZONE_RATIO_RIGHT,
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
  // Control Points at center of each zone
  const cpLeftX = ZONE_RATIO_LEFT / 2;
  const cpMidX = (ZONE_RATIO_LEFT + ZONE_RATIO_RIGHT) / 2;
  const cpRightX = (ZONE_RATIO_RIGHT + 1) / 2;

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

  // Non-linear transition to keep EV flatter within zones and steeper at borders
  const transition = (t: number) => {
    return t < 0.5
      ? 0.5 * Math.pow(2 * t, 4) // Power of 4 for stronger weighting
      : 1 - 0.5 * Math.pow(2 * (1 - t), 4);
  };

  if (ratio <= cpLeftX) {
    baseEV = evLeft;
  } else if (ratio >= cpRightX) {
    baseEV = evRight;
  } else if (ratio < cpMidX) {
    // Between Left and Mid
    const t = (ratio - cpLeftX) / (cpMidX - cpLeftX);
    baseEV = evLeft + transition(t) * (evMid - evLeft);
  } else {
    // Between Mid and Right
    const t = (ratio - cpMidX) / (cpRightX - cpMidX);
    baseEV = evMid + transition(t) * (evRight - evMid);
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
  const dxToBall = ball.x - start.x;
  const dyToBall = ball.y - start.y;
  const distToBall = Math.sqrt(dxToBall * dxToBall + dyToBall * dyToBall);

  const dxToTarget = target.x - ball.x;
  const dyToTarget = target.y - ball.y;
  const distToTarget = Math.sqrt(dxToTarget * dxToTarget + dyToTarget * dyToTarget);

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
  targetPos?: { x: number; y: number },
  targetEV?: number,
  filterFn?: (r: number, c: number) => boolean,
  mode: "GAIN" | "ABSOLUTE" = "GAIN",
): { ball: { x: number; y: number } | null; ballsOnField: number; maxScore: number } {
  let bestBall: { x: number; y: number } | null = null;
  let maxScore = -Infinity;
  let ballsOnField = 0;

  field.ballPositions.forEach((pos) => {
    const c = pos % field.width;
    const r = Math.floor(pos / field.width);

    if (filterFn && !filterFn(r, c)) return;

    ballsOnField++;

    const bx = c + 0.5;
    const by = r + 0.5;
    const ballPos = { x: bx, y: by };
    const currentEV = getBallEV(bx, by, robot.team, field);

    let score: number;
    if (mode === "GAIN" && targetPos !== undefined && targetEV !== undefined) {
      score = calculateSelectionScore(
        robot,
        ballPos,
        targetPos,
        currentEV,
        targetEV,
      );
    } else {
      // ABSOLUTE Mode: Prefer balls that already have high EV and are close
      // Or fallback if GAIN is requested without targets
      const dxToBall = bx - robot.x;
      const dyToBall = by - robot.y;
      const distToBall = Math.sqrt(dxToBall * dxToBall + dyToBall * dyToBall);
      score = currentEV - distToBall * DIST_EV_COST;
    }

    if (score > maxScore) {
      maxScore = score;
      bestBall = ballPos;
    }
  });

  return { ball: bestBall, ballsOnField, maxScore };
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

  // Iterate over indexed ball positions
  field.ballPositions.forEach((pos) => {
    const c = pos % field.width;
    const r = Math.floor(pos / field.width);

    // Check if this is the excluded ball (approximate float match)
    if (
      excludeBall &&
      Math.abs(c - excludeBall.x) < 0.1 &&
      Math.abs(r - excludeBall.y) < 0.1
    ) {
      return;
    }

    const ballX = c + 0.5;
    const ballY = r + 0.5;

    // 1. Calculate Potential Gain
    const currentEV = getBallEV(ballX, ballY, robot.team, field);
    const gain = stagingEV - currentEV;

    if (gain <= 0.01) return;

    // 2. Calculate Cost (Total Distance)
    const dxToBall = ballX - robot.x;
    const dyToBall = ballY - robot.y;
    const distToBallSq = dxToBall * dxToBall + dyToBall * dyToBall;
    const distToBall = Math.sqrt(distToBallSq);

    const dxToStaging = stagingLoc.x - ballX;
    const dyToStaging = stagingLoc.y - ballY;
    const distToStaging = Math.sqrt(dxToStaging * dxToStaging + dyToStaging * dyToStaging);
    const totalDist = distToBall + distToStaging;

    if (totalDist < 0.001) return;

    // 3. Force Magnitude = Gain / Cost^2
    const force = gain / (totalDist * totalDist);

    // 4. Direction (Robot -> Ball)
    if (distToBall > 0.001) {
      const dirX = dxToBall / distToBall;
      const dirY = dyToBall / distToBall;

      sumX += dirX * force;
      sumY += dirY * force;
    }
  });

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
  // 1. Try standard pathfinding (avoiding walls AND robots)
  let path = AStar.findPath(field, { x: robot.x, y: robot.y }, target, robot.id);

  // 2. Fallback: Try path avoiding ONLY walls if blocked by robots
  if (!path) {
    // We pass true for 'ignoreRobots' indirectly by not passing robot.id
    // But wait, AStar.ts findPath has robotIdToIgnore.
    // Let's check AStar.findPath signature: (field, start, target, robotIdToIgnore?)
    // If we want to IGNORE ALL ROBOTS, we need to modify AStar or use a flag.
    // Looking at AStar.ts: if (ignoreRobots) is passed to isPassable.
    // Actually, AStar.findPath calls isPassable(..., false, robotIdToIgnore).
    // Let's check AStar.ts again.

    // I will try to find a path that ignores robots entirely to at least move in the right direction.
    path = AStar.findPath(field, { x: robot.x, y: robot.y }, target, "IGNORE_ALL_ROBOTS");
  }

  if (!path) return null;
  if (path.length < 2) return target;

  // The first point in path is the center of the current tile or the start position.
  // We want the NEXT point to move towards.
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

export function isInTeamZone(x: number, team: Team, field?: Field): boolean {
  if (team === TEAM_RED) {
    const boundary = field ? field.leftBoundaryX : Math.floor(FIELD_WIDTH * ZONE_RATIO_LEFT);
    return x < boundary;
  } else {
    const boundary = field ? field.rightBoundaryX : Math.floor(FIELD_WIDTH * ZONE_RATIO_RIGHT);
    return x >= boundary + 1;
  }
}

/**
 * Returns a random number with a rough gaussian distribution.
 * Uses the sum of uniform random variables (Central Limit Theorem).
 * Mean is 0, standard deviation is approximately 1.
 */
export function roughGaussian(): number {
  return (
    (Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random() +
      Math.random() -
      3) /
    0.707
  );
}
