import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
    getBallEV,
    findBestEVBall,
    getPathTarget,
    getScoringLocation,
} from "../StrategyUtils";

export class BasicCollectorShootStrategy extends InactiveScoringStrategy {
    id = "basic_collector_shoot";
    name = "Basic Collector (Shoot)";
    actionTime = 0.5;

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        const scoreLoc = getScoringLocation(field, robot.team);
        if (!scoreLoc) return null;

        const goalPos = { x: scoreLoc.x + 0.5, y: scoreLoc.y + 0.5 };
        const targetEV = getBallEV(goalPos.x, goalPos.y, robot.team, field);

        // Fill tank first
        if (robot.ballCount < robot.maxBalls) {
            this.status = `Filling tank (${robot.ballCount}/${robot.maxBalls})`;
            const { ball: bestBall } = findBestEVBall(
                field,
                robot,
                goalPos,
                targetEV,
            );
            if (bestBall) {
                return getPathTarget(field, robot, bestBall);
            }
        }

        // If tank is full or no balls found, go shoot position
        if (robot.ballCount > 0) {
            const dx = goalPos.x - robot.x;
            const dy = goalPos.y - robot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= robot.maxShootDistance * 0.9) {
                this.status = "In range, shooting to slots...";
                return null;
            }

            this.status = "Moving to shooting range";
            return getPathTarget(field, robot, goalPos);
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

        // Shoot if in range and has balls
        if (robot.ballCount > 0) {
            const scoreLoc = getScoringLocation(field, robot.team);
            if (scoreLoc) {
                const dx = scoreLoc.x + 0.5 - robot.x;
                const dy = scoreLoc.y + 0.5 - robot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= robot.maxShootDistance) {
                    const angle = Math.atan2(dy, dx);
                    // Shoot towards the slots (next to the scoring loc)
                    // We can just aim for the scoring loc, the spread and landing logic handles the "next to" part
                    // if it lands on a goal it might score if active, but these are collector robots working during inactive mode.
                    // Wait, inactive scoring locs land balls nearby if they attempt to land there.
                    return { type: "SHOOT", distance: dist, angle: angle };
                }
            }
        }

        return null;
    }
}
