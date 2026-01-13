import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import {
    FieldTile,
    BOUNDARY_WALL_HEIGHT_PERCENT,
} from "../GameConst";
import {
    findBestEVBall,
    getScoringLocation,
    isInTeamZone,
} from "../StrategyUtils";

export class RoadblockScoringStrategy extends ActiveScoringStrategy {
    id = "roadblock_scoring";
    name = "Roadblock Scorer";
    actionTime = 1.0;
    description = "Positions itself in front of the goal and attempts to catch incoming balls to score.";
    private roadblockTicks = 0;
    private maxRoadblockTicks = 60; // ~3 seconds at 20Hz (BASE_TICK_RATE)

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        if (robot.ballCount > 0) {
            this.roadblockTicks = 0;
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
                    return {
                        x: scoreLoc.x + 0.5,
                        y: scoreLoc.y + 0.5,
                    };
                } else {
                    this.status = "Returning to zone";
                    const safeZoneX =
                        robot.team === "RED"
                            ? field.leftBoundaryX - 0.5
                            : field.rightBoundaryX + 1.5;
                    return { x: safeZoneX, y: robot.y };
                }
            }
        }

        // After scoring, consider roadblocking the OPPONENT choke point
        if (robot.ballCount === 0 && this.roadblockTicks < this.maxRoadblockTicks) {
            const opponentBoundaryX =
                robot.team === "RED" ? field.rightBoundaryX : field.leftBoundaryX;

            // Calculate gap positions
            const innerHeight = field.height - 2;
            const blockedRows = Math.round(
                BOUNDARY_WALL_HEIGHT_PERCENT * innerHeight,
            );
            const topSkip = Math.floor((innerHeight - blockedRows) / 2);

            const topGapY = (1 + topSkip) / 2;
            const bottomGapY = (1 + topSkip + blockedRows + field.height - 1) / 2;

            // Pick gap closest to robot
            const targetY = robot.y < field.height / 2 ? topGapY : bottomGapY;
            const targetPos = { x: opponentBoundaryX + 0.5, y: targetY };

            const dx = robot.x - targetPos.x;
            const dy = robot.y - targetPos.y;
            const distToGapSq = dx * dx + dy * dy;

            if (distToGapSq < 1.0) {
                this.roadblockTicks++;
                this.status = "Roadblocking opponent";
                return null; // Stay put
            } else {
                this.status = "Moving to roadblock";
                return targetPos;
            }
        }

        const { ball: bestBall } = findBestEVBall(
            field,
            robot,
            undefined,
            undefined,
            undefined,
            "ABSOLUTE"
        );
        if (bestBall) {
            this.status = "Foraging for balls";
            return bestBall;
        }
        this.status = "Idle";
        return null;
    }

    decideAction(robot: Robot, field: Field): Action | null {
        if (robot.ballCount > 0) {
            const targetLoc = field.scoringLocations.find(
                (sl) => sl.team === robot.team,
            );
            if (targetLoc) {
                const inZone = isInTeamZone(robot.x, robot.team);
                if (inZone) {
                    const dx = targetLoc.tileX + 0.5 - robot.x;
                    const dy = targetLoc.tileY + 0.5 - robot.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist <= robot.maxShootDistance) {
                        const angle = Math.atan2(dy, dx);
                        return { type: "SHOOT", distance: dist, angle: angle };
                    }
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
