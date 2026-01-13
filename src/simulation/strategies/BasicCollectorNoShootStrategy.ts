import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
    getBallEV,
    findBestEVBall,
    findNearestEmptyTile,
    getPathTarget,
    getScoringLocation,
} from "../StrategyUtils";

export class BasicCollectorNoShootStrategy extends InactiveScoringStrategy {
    id = "basic_collector_no_shoot";
    name = "Basic Collector (No Shoot)";
    actionTime = 0.5;

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        const scoreLoc = getScoringLocation(field, robot.team);
        if (!scoreLoc) return null;

        const goalPos = { x: scoreLoc.x + 0.5, y: scoreLoc.y + 0.5 };
        const targetEV = getBallEV(goalPos.x, goalPos.y, robot.team, field);

        // Fill tank first
        if (robot.ballCount < robot.maxBalls) {
            this.status = `Filling tank (${robot.ballCount}/${robot.maxBalls})`;
            const { ball: bestBall, maxScore } = findBestEVBall(
                field,
                robot,
                goalPos,
                targetEV,
            );
            if (bestBall && maxScore > 0) {
                return getPathTarget(field, robot, bestBall);
            }
        }

        // If tank is full or no balls found, go deliver
        if (robot.ballCount > 0) {
            this.status = "Delivering balls (No Shoot)";
            const nearestEmpty = findNearestEmptyTile(
                field,
                { x: scoreLoc.x, y: scoreLoc.y },
                6,
                { x: scoreLoc.x, y: scoreLoc.y },
            );

            if (nearestEmpty) {
                return getPathTarget(field, robot, nearestEmpty);
            }
        }

        this.status = "Idle";
        return null;
    }

    decideAction(robot: Robot, field: Field): Action | null {
        const r = Math.floor(robot.y);
        const c = Math.floor(robot.x);

        // Collect if on a ball and filling tank
        if (robot.ballCount < robot.maxBalls) {
            if (field.getTileAt(c, r) === FieldTile.BALL) {
                return { type: "COLLECT" };
            }
        }

        // Drop if on an empty tile near goal
        if (robot.ballCount > 0) {
            const scoreLoc = getScoringLocation(field, robot.team);
            if (scoreLoc) {
                const dx = robot.x - (scoreLoc.x + 0.5);
                const dy = robot.y - (scoreLoc.y + 0.5);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= 6 && field.getTileAt(c, r) === FieldTile.EMPTY) {
                    return { type: "DROP" };
                }
            }
        }

        return null;
    }
}
