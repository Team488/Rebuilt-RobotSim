import { BasicScoringStrategy } from "./strategies/BasicScoringStrategy";
import { BasicCollectorStrategy } from "./strategies/BasicCollectorStrategy";
import { ActiveScoringStrategy, InactiveScoringStrategy } from "./Robot";

export const ALL_ACTIVE_STRATEGIES: (new () => ActiveScoringStrategy)[] = [
    BasicScoringStrategy,
];

export const ALL_INACTIVE_STRATEGIES: (new () => InactiveScoringStrategy)[] = [
    BasicCollectorStrategy,
];
