export const TICK_RATE = 20; // Ticks per second
export const GAME_DURATION = 1500; // Seconds

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

export const SCORING_INTERVAL = 300; // Ticks before switching scoring/collecting focus
export const BALL_SPEED = 15; // Meters per second
export const ROBOTS_PER_TEAM = 3;
export const SHOT_COOLDOWN_TICKS = 40; // 2 seconds between shots

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
