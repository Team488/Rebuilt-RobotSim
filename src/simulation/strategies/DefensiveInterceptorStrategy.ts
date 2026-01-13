import { Robot, InactiveScoringStrategy } from "../Robot";
import type { Action } from "../Robot";
import { Field } from "../Field";

export class DefensiveInterceptorStrategy extends InactiveScoringStrategy {
    id = "defensive_interceptor";
    name = "Defensive Interceptor";
    actionTime = 0.5;
    description = "Stays near the center line or home zone and tries to block opponent robots or balls from reaching the scoring area.";

    decideMove(robot: Robot, field: Field): { x: number; y: number } | null {
        // Find the opponent robot that is closest to our scoring zone and has balls
        const opponentTeam = robot.team === "RED" ? "BLUE" : "RED";
        // Actually, in Inactive mode, the CURRENT scoring team is the OPPONENT.
        // So we want to guard our goal.
        const ourGoal = field.scoringLocations.find((sl) => sl.team === robot.team);
        if (!ourGoal) return null;

        const dangerousOpponent = field.engine?.robots
            .filter((r: any) => r.team === opponentTeam && r.ballCount > 0)
            .sort((a: any, b: any) => {
                const da = Math.sqrt(Math.pow(a.x - ourGoal.tileX, 2) + Math.pow(a.y - ourGoal.tileY, 2));
                const db = Math.sqrt(Math.pow(b.x - ourGoal.tileX, 2) + Math.pow(b.y - ourGoal.tileY, 2));
                return da - db;
            })[0];

        if (dangerousOpponent) {
            this.status = `Shadowing ${dangerousOpponent.id}`;
            // Interpose between opponent and our goal
            const targetX = (dangerousOpponent.x + ourGoal.tileX + 0.5) / 2;
            const targetY = (dangerousOpponent.y + ourGoal.tileY + 0.5) / 2;

            return { x: targetX, y: targetY };
        }

        this.status = "Guarding territory";
        // Default to standing in front of goal
        const guardX = robot.team === "RED" ? 5 : field.grid[0].length - 5;
        const guardY = ourGoal.tileY + 0.5;
        return { x: guardX, y: guardY };
    }

    decideAction(_robot: Robot, _field: Field): Action | null {
        // In many games, defensive robots might try to hit balls away if they could,
        // but the current Engine doesn't have an "interfere" action easily.
        // We'll just focus on movement for now.
        return null;
    }
}
