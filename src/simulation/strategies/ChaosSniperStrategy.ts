import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";
import { FieldTile } from "../GameConst";
import {
    findBestEVBall,
    getPathTarget,
    isInTeamZone,
} from "../StrategyUtils";

export class ChaosSniperStrategy extends InactiveScoringStrategy {
    id = "chaos_sniper";
    name = "Chaos Sniper";
    actionTime = 0.6;

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        if (robot.ballCount >= 1) {
            this.status = "Denying opponent balls";
            // Aim for the center or towards our own zone
            return null; // Stand still and shoot
        } else {
            this.status = "Hunting in enemy territory";
            const opponentGoal = field.scoringLocations.find((sl) => sl.team !== robot.team);
            if (!opponentGoal) return null;

            // Find balls NEAR the opponent goal
            const { ball } = findBestEVBall(
                field,
                robot,
                { x: opponentGoal.tileX + 0.5, y: opponentGoal.tileY + 0.5 },
                2.0, // Higher weighting for balls near THEIR goal
                (_, c) => !isInTeamZone(c + 0.5, robot.team)
            );
            if (ball) return getPathTarget(field, robot, ball);
        }

        return null;
    }

    decideAction(robot: Robot, field: Field): Action | null {
        if (robot.ballCount >= 1) {
            // Shoot towards the center
            const centerX = field.grid[0].length / 2;
            const centerY = field.grid.length / 2;
            const dx = centerX - robot.x;
            const dy = centerY - robot.y;
            const angle = Math.atan2(dy, dx);
            const dist = Math.min(robot.maxShootDistance, Math.sqrt(dx * dx + dy * dy));

            return { type: "SHOOT", distance: dist, angle };
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
