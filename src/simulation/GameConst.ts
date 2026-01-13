export const BASE_TICK_RATE = 20; // Ticks per second
export const SECONDS_PER_TICK = 1 / BASE_TICK_RATE;
export const GAME_DURATION = 220; // Seconds

// Field Dimensions and Layout
export const FIELD_WIDTH = 100;
export const FIELD_HEIGHT = 60;
export const NUM_BALLS = 400;

export const TEAM_RED = "RED";
export const TEAM_BLUE = "BLUE";
export type Team = typeof TEAM_RED | typeof TEAM_BLUE;

// Zone Definitions (Ratios of Total Width)
export const ZONE_RATIO_LEFT = 1 / 3;
export const ZONE_RATIO_RIGHT = 2 / 3;
export const BOUNDARY_WALL_HEIGHT_PERCENT = 0.7;

export const SCORING_INTERVAL = 20 * BASE_TICK_RATE;
export const BALL_SPEED = 1 / 20 * BASE_TICK_RATE;
export const ROBOTS_PER_TEAM = 3;

export const FieldTile = {
  EMPTY: 0,
  WALL: 1,
  BALL: 2,
  GOAL: 3,
} as const;
export type FieldTile = (typeof FieldTile)[keyof typeof FieldTile];

// EV Constants
export const EV_OWN_ZONE = 0.9;
export const EV_NEUTRAL_ZONE = 0.3;
export const EV_OPPONENT_ZONE = 0.1;
export const DIST_EV_COST = 0.01;
