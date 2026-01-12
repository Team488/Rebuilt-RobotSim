export const TICK_RATE = 20; // Ticks per second
export const GAME_DURATION = 220; // Seconds

// Field Dimensions and Layout
// '#' = Obstacle, '.' = Empty, 'O' = Ball
export const INITIAL_FIELD_LAYOUT = [
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
  "..............OOOO..............",
  "..............OOOO..............",
  "..............OOOO..............",
  "..............OOOO..............",
  "..............OOOO..............",
  "..............OOOO..............",
  "................................",
  "................................",
  "................................",
  "................................",
  "................................",
];

export const FIELD_WIDTH = INITIAL_FIELD_LAYOUT[0].length;
export const FIELD_HEIGHT = INITIAL_FIELD_LAYOUT.length;

export const TEAM_RED = "RED";
export const TEAM_BLUE = "BLUE";
export type Team = typeof TEAM_RED | typeof TEAM_BLUE;

// Zone Definitions (Ratios of Total Width)
export const ZONE_RATIO_LEFT = 1 / 3;
export const ZONE_RATIO_RIGHT = 2 / 3;
export const BOUNDARY_WALL_HEIGHT_PERCENT = 0.7;

export const SCORING_INTERVAL = 300;
export const BALL_SPEED = 15;
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
export const EV_OPPONENT_ZONE = -0.2;
export const EV_SCORED = 1.0;
export const DIST_EV_COST = 0.01;
