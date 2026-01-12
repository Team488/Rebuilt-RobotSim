import {
  FIELD_WIDTH,
  FIELD_HEIGHT,
  TEAM_RED,
  TEAM_BLUE,
  INITIAL_FIELD_LAYOUT,
  FieldTile,
} from "./GameConst";
import { ScoringLocation } from "./ScoringLocation";

export interface FlyingBall {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
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

  constructor(width: number = FIELD_WIDTH, height: number = FIELD_HEIGHT) {
    this.width = width;
    this.height = height;
    this.grid = this.initializeGrid();
    this.scoringLocations = this.initializeScoringLocations();
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

  private initializeGrid(): FieldTile[][] {
    const rows = this.height;
    const cols = this.width;

    const grid = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(FieldTile.EMPTY));

    // Load INITIAL_FIELD_LAYOUT
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = INITIAL_FIELD_LAYOUT[r][c];
        if (char === "#") {
          grid[r][c] = FieldTile.WALL;
        } else if (char === ".") {
          grid[r][c] = FieldTile.EMPTY;
        } else if (char === "O") {
          grid[r][c] = FieldTile.BALL;
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
    const leftBoundaryX = Math.floor(cols / 3 - 0.001); // Rightmost of Red
    const rightBoundaryX = Math.ceil((2 * cols) / 3 - 0.001); // Leftmost of Blue

    const innerHeight = rows - 2;
    const blockedRows = Math.round(0.7 * innerHeight);
    const topSkip = Math.floor((innerHeight - blockedRows) / 2);

    for (let r = 1 + topSkip; r < 1 + topSkip + blockedRows; r++) {
      if (r > 0 && r < rows - 1) {
        grid[r][leftBoundaryX] = FieldTile.WALL;
        grid[r][rightBoundaryX] = FieldTile.WALL;
      }
    }

    return grid;
  }

  respawnBall() {
    // Collect all empty slots in the neutral zone
    const leftBoundaryX = Math.floor(this.width / 3 - 0.001);
    const rightBoundaryX = Math.ceil((2 * this.width) / 3 - 0.001);

    const minX = leftBoundaryX + 1;
    const maxX = rightBoundaryX - 1;

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
      this.grid[r][c] = FieldTile.BALL;
    } else {
      console.warn("No open slots found in neutral zone for ball respawn!");
    }
  }

  // Helper to get tile at coordinates (flooring)
  getTileAt(x: number, y: number): FieldTile {
    const r = Math.floor(y);
    const c = Math.floor(x);
    if (r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length) {
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

  findNearestOpenNode(x: number, y: number): { x: number; y: number } | null {
    const startC = Math.max(0, Math.min(this.width - 1, Math.floor(x)));
    const startR = Math.max(0, Math.min(this.height - 1, Math.floor(y)));
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }];
    const visited = new Set<string>();
    visited.add(`${startR},${startC}`);

    // Breadth-first search for nearest empty or ball tile

    while (queue.length > 0) {
      const { r, c } = queue.shift()!;

      // Check bounds
      if (r >= 0 && r < this.grid.length && c >= 0 && c < this.grid[0].length) {
        const isScoringLocation = this.getScoringLocationAt(c, r);

        if (this.grid[r][c] === FieldTile.EMPTY && !isScoringLocation) {
          return { x: c + 0.5, y: r + 0.5 }; // Return center of tile
        }

        // Add neighbors
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
  constructor() {
    super();
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
