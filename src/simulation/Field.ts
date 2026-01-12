import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  TEAM_RED,
  TEAM_BLUE,
  NUM_BALLS,
  FieldTile,
  ZONE_RATIO_LEFT,
  ZONE_RATIO_RIGHT,
  BOUNDARY_WALL_HEIGHT_PERCENT,
} from "./GameConst";
import type { Team } from "./GameConst";
import { ScoringLocation } from "./ScoringLocation";

export interface EngineInterface {
  robots: any[];
}

export interface FlyingBall {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  id: string; // Unique ID to track it if needed
  originX: number;
  originY: number;
}

export class Field {
  width: number;
  height: number;
  grid: FieldTile[][];
  scoringLocations: ScoringLocation[];
  flyingBalls: FlyingBall[] = [];
  ballPositions: Set<number> = new Set();
  engine?: EngineInterface;

  readonly leftBoundaryX: number;
  readonly rightBoundaryX: number;

  constructor(
    width: number = FIELD_WIDTH,
    height: number = FIELD_HEIGHT,
    numBalls: number = NUM_BALLS,
  ) {
    this.width = width;
    this.height = height;
    this.leftBoundaryX = Math.floor(width * ZONE_RATIO_LEFT);
    this.rightBoundaryX = Math.floor(width * ZONE_RATIO_RIGHT);
    this.grid = this.initializeGrid(numBalls);
    this.scoringLocations = this.initializeScoringLocations();
  }

  isValidTile(r: number, c: number): boolean {
    return r >= 0 && r < this.height && c >= 0 && c < this.width;
  }

  isPassable(r: number, c: number, ignoreRobots: boolean = false): boolean {
    if (!this.isValidTile(r, c)) return false;
    if (this.grid[r][c] === FieldTile.WALL) return false;

    if (!ignoreRobots && this.engine) {
      // Check if any robot is in this tile
      for (const robot of this.engine.robots) {
        if (Math.floor(robot.y) === r && Math.floor(robot.x) === c) {
          return false;
        }
      }
    }

    return true;
  }

  setTileAt(x: number, y: number, tile: FieldTile): boolean {
    const r = Math.floor(y);
    const c = Math.floor(x);
    if (this.isValidTile(r, c)) {
      const oldTile = this.grid[r][c];
      const pos = r * this.width + c;

      if (oldTile === FieldTile.BALL && tile !== FieldTile.BALL) {
        this.ballPositions.delete(pos);
      } else if (oldTile !== FieldTile.BALL && tile === FieldTile.BALL) {
        this.ballPositions.add(pos);
      }

      this.grid[r][c] = tile;
      return true;
    }
    return false;
  }

  private initializeScoringLocations(): ScoringLocation[] {
    // Integer coordinates for scoring zones
    return [
      new ScoringLocation(
        Math.floor(this.width / 4) - 1,
        Math.floor(this.height / 2),
        TEAM_RED,
      ),
      new ScoringLocation(
        Math.floor((3 * this.width) / 4),
        Math.floor(this.height / 2),
        TEAM_BLUE,
      ),
    ];
  }

  private initializeGrid(numBalls: number): FieldTile[][] {
    const rows = this.height;
    const cols = this.width;

    const grid = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(FieldTile.EMPTY));

    // Automated Ball Placement (Center Rectangle)
    const blockWidth = Math.ceil(Math.sqrt(numBalls));
    const blockHeight = Math.ceil(numBalls / blockWidth);

    const startC = Math.floor((cols - blockWidth) / 2);
    const startR = Math.floor((rows - blockHeight) / 2);

    let ballsPlaced = 0;
    for (let r = 0; r < blockHeight; r++) {
      for (let c = 0; c < blockWidth; c++) {
        if (ballsPlaced < numBalls) {
          const gridR = startR + r;
          const gridC = startC + c;
          if (gridR >= 0 && gridR < rows && gridC >= 0 && gridC < cols) {
            grid[gridR][gridC] = FieldTile.BALL;
            ballsPlaced++;
          }
        }
      }
    }

    // 1. Add Edge Borders
    for (let r = 0; r < rows; r++) {
      grid[r][0] = FieldTile.WALL;
      grid[r][cols - 1] = FieldTile.WALL;
    }
    for (let c = 0; c < cols; c++) {
      grid[0][c] = FieldTile.WALL;
      grid[rows - 1][c] = FieldTile.WALL;
    }

    // 2. Add Team Boundary Borders (70% centered)
    // Red zone: x < width / 3
    // Blue zone: x >= 2 * width / 3
    const leftBoundaryX = this.leftBoundaryX;
    const rightBoundaryX = this.rightBoundaryX;

    const innerHeight = rows - 2;
    const blockedRows = Math.round(BOUNDARY_WALL_HEIGHT_PERCENT * innerHeight);
    const topSkip = Math.floor((innerHeight - blockedRows) / 2);

    for (let r = 1 + topSkip; r < 1 + topSkip + blockedRows; r++) {
      if (r > 0 && r < rows - 1) {
        grid[r][leftBoundaryX] = FieldTile.WALL;
        grid[r][rightBoundaryX] = FieldTile.WALL;
      }
    }

    // Initialize ballPositions
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === FieldTile.BALL) {
          this.ballPositions.add(r * cols + c);
        }
      }
    }

    return grid;
  }

  respawnBall() {
    // Collect all empty slots in the neutral zone
    const minX = this.leftBoundaryX + 1;
    const maxX = this.rightBoundaryX - 1;

    const openSlots: { r: number; c: number }[] = [];

    for (let r = 1; r < this.height - 1; r++) {
      for (let c = minX; c <= maxX; c++) {
        if (
          this.grid[r][c] === FieldTile.EMPTY &&
          !this.getScoringLocationAt(c, r)
        ) {
          openSlots.push({ r, c });
        }
      }
    }

    if (openSlots.length > 0) {
      const randomIndex = Math.floor(Math.random() * openSlots.length);
      const { r, c } = openSlots[randomIndex];
      this.setTileAt(c, r, FieldTile.BALL);
    }
  }

  getTileAt(x: number, y: number): FieldTile {
    const r = Math.floor(y);
    const c = Math.floor(x);
    if (this.isValidTile(r, c)) {
      return this.grid[r][c];
    }
    return FieldTile.WALL;
  }

  getScoringLocationAt(x: number, y: number): ScoringLocation | undefined {
    const r = Math.floor(y);
    const c = Math.floor(x);
    return this.scoringLocations.find(
      (loc) => loc.tileX === c && loc.tileY === r,
    );
  }

  static getRobotStartingPositions(team: Team): { x: number; y: number }[] {
    const isRed = team === TEAM_RED;
    const centerX = isRed
      ? (FIELD_WIDTH * ZONE_RATIO_LEFT) / 2
      : (FIELD_WIDTH * (1 + ZONE_RATIO_RIGHT)) / 2;

    return [
      { x: centerX, y: FIELD_HEIGHT / 3 },
      { x: centerX, y: FIELD_HEIGHT / 2 },
      { x: centerX, y: (2 * FIELD_HEIGHT) / 3 },
    ];
  }

  findNearestOpenNode(x: number, y: number): { x: number; y: number } | null {
    const startC = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    const startR = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }];
    const visited = new Set<string>();
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const { r, c } = queue.shift()!;

      if (this.isValidTile(r, c)) {
        const isScoringLocation = this.getScoringLocationAt(c, r);

        if (this.grid[r][c] === FieldTile.EMPTY && !isScoringLocation) {
          return { x: c + 0.5, y: r + 0.5 };
        }

        const neighbors = [
          { r: r + 1, c: c },
          { r: r - 1, c: c },
          { r: r, c: c + 1 },
          { r: r, c: c - 1 },
          { r: r + 1, c: c + 1 },
          { r: r - 1, c: c - 1 },
          { r: r + 1, c: c - 1 },
          { r: r - 1, c: c + 1 },
        ];

        for (const n of neighbors) {
          const key = `${n.r},${n.c}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push(n);
          }
        }
      }
    }
    return null;
  }
}

export class StartingField extends Field {
  constructor(numBalls: number = NUM_BALLS) {
    super(FIELD_WIDTH, FIELD_HEIGHT, numBalls);
    // Configure start positions here if needed, or methods to set them
  }

  addBall(x: number, y: number) {
    const r = Math.floor(y);
    const c = Math.floor(x);
    if (r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length) {
      this.grid[r][c] = FieldTile.BALL;
    }
  }
}
