import { Robot, ActiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
    findBestEVBall,
    isInTeamZone,
} from "../StrategyUtils";

export class RapidCycleStrategy extends ActiveScoringStrategy {
    id = "rapid_cycle";
    name = "Rapid Cycle";
    actionTime = 0.5;
    description = "Collects only 1-2 balls and scores them immediately to keep the scoring pressure high.";

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        if (robot.ballCount >= 1) {
            this.status = "Quick delivery";
            const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
            if (!goal) return null;

            // Just get close enough to shoot
            const targetX = robot.team === "RED" ? goal.tileX + 5 : goal.tileX - 5;
            const targetY = goal.tileY + 0.5;

            const dx = targetX - robot.x;
            const dy = targetY - robot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 2) {
                return { x: targetX, y: targetY };
            }
        } else {
            this.status = "Snatching ball";
            const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
            if (!goal) return null;

            const { ball } = findBestEVBall(
                field,
                robot,
                { x: goal.tileX + 0.5, y: goal.tileY + 0.5 },
                1.5
            );
            if (ball) return ball;
        }

        return null;
    }

    decideAction(robot: Robot, field: Field): Action | null {
        if (robot.ballCount >= 1) {
            const goal = field.scoringLocations.find((sl) => sl.team === robot.team);
            if (goal) {
                const targetX = goal.tileX + 0.5;
                const targetY = goal.tileY + 0.5;
                const dx = targetX - robot.x;
                const dy = targetY - robot.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);

                if (dist <= robot.maxShootDistance && isInTeamZone(robot.x, robot.team)) {
                    return { type: "SHOOT", distance: dist, angle };
                }
            }
        } else {
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
        }
        return null;
    }
}
