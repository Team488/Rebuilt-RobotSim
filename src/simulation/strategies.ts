import { BasicScoringStrategy } from "./strategies/BasicScoringStrategy";
import { HomeZoneScoringStrategy } from "./strategies/HomeZoneScoringStrategy";
import { StagingScoringStrategy } from "./strategies/StagingScoringStrategy";
import { AggressiveStrikerStrategy } from "./strategies/AggressiveStrikerStrategy";
import { LongRangeSniperStrategy } from "./strategies/LongRangeSniperStrategy";
import { RapidCycleStrategy } from "./strategies/RapidCycleStrategy";

import { BasicCollectorStrategy } from "./strategies/BasicCollectorStrategy";
import { ThiefCollectorStrategy } from "./strategies/ThiefCollectorStrategy";
import { StagingCollectorStrategy } from "./strategies/StagingCollectorStrategy";
import { InterceptorCollectorStrategy } from "./strategies/InterceptorCollectorStrategy";
import { DefensiveInterceptorStrategy } from "./strategies/DefensiveInterceptorStrategy";
import { ChaosSniperStrategy } from "./strategies/ChaosSniperStrategy";

import { ActiveScoringStrategy, InactiveScoringStrategy } from "./Robot";

export const ALL_ACTIVE_STRATEGIES: (new () => ActiveScoringStrategy)[] = [
  BasicScoringStrategy,
  HomeZoneScoringStrategy,
  StagingScoringStrategy,
  AggressiveStrikerStrategy,
  LongRangeSniperStrategy,
  RapidCycleStrategy,
];

export const ALL_INACTIVE_STRATEGIES: (new () => InactiveScoringStrategy)[] = [
  BasicCollectorStrategy,
  ThiefCollectorStrategy,
  StagingCollectorStrategy,
  InterceptorCollectorStrategy,
  DefensiveInterceptorStrategy,
  ChaosSniperStrategy,
];
