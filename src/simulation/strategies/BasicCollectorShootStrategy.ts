import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
    getBallEV,
    findBestEVBall,
    getScoringLocation,
} from "../StrategyUtils";

export class BasicCollectorShootStrategy extends InactiveScoringStrategy {
    id = "basic_collector_shoot";
    name = "Basic Collector (Shoot)";
    actionTime = 0.5;
    description = "Collects balls and periodically shoots them towards the home zone to clear space.";

    private isDelivering = false;

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        const scoreLoc = getScoringLocation(field, robot.team);
        if (!scoreLoc) return null;

        const goalPos = { x: scoreLoc.x + 0.5, y: scoreLoc.y + 0.5 };
        const targetEV = getBallEV(goalPos.x, goalPos.y, robot.team, field);

        // State machine: Deliver until empty, then collect until full
        if (robot.ballCount >= robot.maxBalls) {
            this.isDelivering = true;
        } else if (robot.ballCount === 0) {
            this.isDelivering = false;
        }

        // Mode 1: Collection
        if (!this.isDelivering) {
            this.status = `Filling tank (${robot.ballCount}/${robot.maxBalls})`;
            const { ball: bestBall, maxScore } = findBestEVBall(
                field,
                robot,
                goalPos,
                targetEV,
            );
            if (bestBall && maxScore > 0) {
                return bestBall;
            } else if (robot.ballCount > 0) {
                // If no more good balls and we have some, go deliver
                this.isDelivering = true;
            }
        }

        // Mode 2: Delivery
        if (this.isDelivering && robot.ballCount > 0) {
            const dx = goalPos.x - robot.x;
            const dy = goalPos.y - robot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= robot.maxShootDistance * 0.9) {
                this.status = "In range, shooting to slots...";
                return null;
            }

            this.status = "Moving to shooting range";
            return goalPos;
        }

        this.status = "Idle";
        return null;
    }

    decideAction(robot: Robot, field: Field): Action | null {
        const r = Math.floor(robot.y);
        const c = Math.floor(robot.x);

        // Mode 1: Collection
        if (!this.isDelivering && robot.ballCount < robot.maxBalls) {
            if (field.getTileAt(c, r) === FieldTile.BALL) {
                return { type: "COLLECT" };
            }
        }

        // Mode 2: Delivery
        if (this.isDelivering && robot.ballCount > 0) {
            const scoreLoc = getScoringLocation(field, robot.team);
            if (scoreLoc) {
                const dx = scoreLoc.x + 0.5 - robot.x;
                const dy = scoreLoc.y + 0.5 - robot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= robot.maxShootDistance) {
                    const angle = Math.atan2(dy, dx);
                    return { type: "SHOOT", distance: dist, angle: angle };
                }
            }
        }

        return null;
    }
}
