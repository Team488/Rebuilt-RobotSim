import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile, FIELD_WIDTH } from "../GameConst";
import {
    findBestEVBall,
    findNearestEmptyTile,
    getPathTarget,
} from "../StrategyUtils";

export class BullyCollectorStrategy extends InactiveScoringStrategy {
    id = "bully_collector";
    name = "Bully Collector";
    actionTime = 0.5;
    description = "Prioritizes collecting balls that are near opponent robots to disrupt their paths.";
    isDelivering = false;
    patience = 0;

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        if (robot.ballCount >= robot.maxBalls) {
            this.isDelivering = true;
        } else if (robot.ballCount === 0) {
            this.isDelivering = false;
        }

        const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
        if (!goal) return null;

        if (this.isDelivering) {
            this.status = "Returning with loot";
            const nearestEmpty = findNearestEmptyTile(
                field,
                { x: goal.tileX, y: goal.tileY },
                6, // Wider search
                { x: goal.tileX, y: goal.tileY },
            );
            if (nearestEmpty) {
                const target = getPathTarget(field, robot, nearestEmpty);
                if (target) {
                    this.patience = 0;
                    return target;
                }
            }
        }

        // Collection: Prioritize balls near opponent neutral zone
        const opponentTeam = robot.team === "RED" ? "BLUE" : "RED";

        // Find closest opponent robot
        const opponents = (field.engine?.robots || []).filter((r: any) => r.team === opponentTeam);
        const nearestOpponent = opponents.sort((a: any, b: any) => {
            const da = (a.x - robot.x) ** 2 + (a.y - robot.y) ** 2;
            const db = (b.x - robot.x) ** 2 + (b.y - robot.y) ** 2;
            return da - db;
        })[0];

        // Try to find balls that are in the "aggressive" half of the neutral zone
        const { ball: targetBall } = findBestEVBall(
            field,
            robot,
            { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
            1.0,
            (_, c) => {
                // Prefer balls in the half of neutral zone closer to opponent
                const boundary = robot.team === "RED" ? FIELD_WIDTH * 0.6 : FIELD_WIDTH * 0.4;
                return robot.team === "RED" ? c > boundary : c < boundary;
            }
        );

        if (targetBall) {
            const target = getPathTarget(field, robot, targetBall);
            if (target) {
                this.patience = 0;
                this.status = "Aggressive scavenging";
                return target;
            }
        }

        // If no good balls, try to "shadow" or block the nearest opponent
        if (nearestOpponent) {
            this.status = `Bullying opponent`;
            const targetX = (robot.x + nearestOpponent.x) / 2;
            const targetY = (robot.y + nearestOpponent.y) / 2;
            const target = getPathTarget(field, robot, { x: targetX, y: targetY });
            if (target) {
                this.patience = 0;
                return target;
            }
        }

        const { ball: anyBall } = findBestEVBall(
            field,
            robot,
            { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
            1.0,
        );
        if (anyBall) {
            const target = getPathTarget(field, robot, anyBall);
            if (target) {
                this.patience = 0;
                this.status = "Collecting";
                return target;
            }
        }

        // Unstick logic
        this.patience++;
        if (this.patience > 10) {
            this.status = "Hunting & repositioning";
            if (this.patience > 30) this.patience = 0;
            return {
                x: robot.x + (Math.random() - 0.5) * 5,
                y: robot.y + (Math.random() - 0.5) * 5,
            };
        }

        this.status = "Hunting";
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
                if (dist <= 5 && field.grid[r][c] === FieldTile.EMPTY) {
                    return { type: "DROP" };
                }
            }
        }
        return null;
    }
}
