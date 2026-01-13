import { BasicScoringStrategy } from "./strategies/BasicScoringStrategy";
import { HomeZoneScoringStrategy } from "./strategies/HomeZoneScoringStrategy";
import { StagingScoringStrategy } from "./strategies/StagingScoringStrategy";
import { AggressiveStrikerStrategy } from "./strategies/AggressiveStrikerStrategy";
import { LongRangeSniperStrategy } from "./strategies/LongRangeSniperStrategy";
import { RapidCycleStrategy } from "./strategies/RapidCycleStrategy";
import { RoadblockScoringStrategy } from "./strategies/RoadblockScoringStrategy";

import { BasicCollectorNoShootStrategy } from "./strategies/BasicCollectorNoShootStrategy";
import { BasicCollectorShootStrategy } from "./strategies/BasicCollectorShootStrategy";
import { ThiefCollectorStrategy } from "./strategies/ThiefCollectorStrategy";
import { StagingCollectorStrategy } from "./strategies/StagingCollectorStrategy";
import { InterceptorCollectorStrategy } from "./strategies/InterceptorCollectorStrategy";
import { DefensiveInterceptorStrategy } from "./strategies/DefensiveInterceptorStrategy";
import { ChaosSniperStrategy } from "./strategies/ChaosSniperStrategy";
import { BullyCollectorStrategy } from "./strategies/BullyCollectorStrategy";

import { ActiveScoringStrategy, InactiveScoringStrategy } from "./Robot";

export const ALL_ACTIVE_STRATEGIES: (new () => ActiveScoringStrategy)[] = [
  BasicScoringStrategy,
  HomeZoneScoringStrategy,
  StagingScoringStrategy,
  AggressiveStrikerStrategy,
  LongRangeSniperStrategy,
  RapidCycleStrategy,
  RoadblockScoringStrategy,
];

export const ALL_INACTIVE_STRATEGIES: (new () => InactiveScoringStrategy)[] = [
  BasicCollectorNoShootStrategy,
  BasicCollectorShootStrategy,
  ThiefCollectorStrategy,
  StagingCollectorStrategy,
  InterceptorCollectorStrategy,
  DefensiveInterceptorStrategy,
  ChaosSniperStrategy,
  BullyCollectorStrategy,
];
