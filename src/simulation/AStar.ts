import { Field } from "./Field";
import { FieldTile } from "./GameConst";

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

export class AStar {
  static findPath(
    field: Field,
    start: { x: number; y: number },
    target: { x: number; y: number },
  ): { x: number; y: number }[] | null {
    // Convert to grid coordinates
    const startX = Math.floor(start.x);
    const startY = Math.floor(start.y);
    const targetX = Math.floor(target.x);
    const targetY = Math.floor(target.y);

    // Bounds check
    if (!this.isValid(field, targetX, targetY)) {
      // If target is an obstacle, try to find nearest valid tile
      const nearest = this.findNearestValidTile(field, targetX, targetY);
      if (!nearest) return null;
      return this.findPath(field, start, nearest);
    }

    const openList: Node[] = [];
    const closedSet = new Set<string>();

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, targetX, targetY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openList.splice(currentIndex, 1)[0];
      const posKey = `${current.x},${current.y}`;

      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      closedSet.add(posKey);

      // Neighbors (8-way connectivity)
      const neighbors = [
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        // Diagonals
        { x: current.x - 1, y: current.y - 1, dist: 1.414 },
        { x: current.x + 1, y: current.y - 1, dist: 1.414 },
        { x: current.x - 1, y: current.y + 1, dist: 1.414 },
        { x: current.x + 1, y: current.y + 1, dist: 1.414 },
      ];

      for (const neighbor of neighbors) {
        if (!this.isValid(field, neighbor.x, neighbor.y)) continue;
        if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;

        // For diagonals, check if "squeezing" through obstacles
        if (
          Math.abs(neighbor.x - current.x) === 1 &&
          Math.abs(neighbor.y - current.y) === 1
        ) {
          if (
            !this.isValid(field, current.x, neighbor.y) ||
            !this.isValid(field, neighbor.x, current.y)
          ) {
            continue; // Can't move diagonally if both adjacent tiles are blocked
          }
        }

        const moveCost = (neighbor as any).dist || 1;
        const gScore = current.g + moveCost;

        let neighborNode = openList.find(
          (n) => n.x === neighbor.x && n.y === neighbor.y,
        );

        if (!neighborNode) {
          neighborNode = {
            x: neighbor.x,
            y: neighbor.y,
            g: gScore,
            h: this.heuristic(neighbor.x, neighbor.y, targetX, targetY),
            f: 0,
            parent: current,
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openList.push(neighborNode);
        } else if (gScore < neighborNode.g) {
          neighborNode.g = gScore;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    return null; // Path not found
  }

  private static heuristic(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number {
    // Octile distance (better for 8-way movement than Manhattan)
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx + dy + (1.414 - 2) * Math.min(dx, dy);
  }

  private static isValid(field: Field, x: number, y: number): boolean {
    if (x < 0 || x >= field.width || y < 0 || y >= field.height) return false;
    return field.grid[y][x] !== FieldTile.WALL;
  }

  private static reconstructPath(node: Node): { x: number; y: number }[] {
    const path: { x: number; y: number }[] = [];
    let curr: Node | null = node;
    while (curr) {
      path.push({ x: curr.x + 0.5, y: curr.y + 0.5 }); // Target center of tile
      curr = curr.parent;
    }
    return path.reverse();
  }

  private static findNearestValidTile(
    field: Field,
    x: number,
    y: number,
  ): { x: number; y: number } | null {
    // Simple BFS to find nearest non-obstacle tile if target is in obstacle
    const queue: { x: number; y: number }[] = [{ x, y }];
    const visited = new Set<string>();
    visited.add(`${x},${y}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;

      if (
        curr.x >= 0 &&
        curr.x < field.width &&
        curr.y >= 0 &&
        curr.y < field.height
      ) {
        if (field.grid[curr.y][curr.x] !== FieldTile.WALL) {
          return { x: curr.x + 0.5, y: curr.y + 0.5 };
        }
      }

      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 },
      ];

      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key)) {
          visited.add(key);
          // Don't search too far away
          if (Math.abs(n.x - x) < 5 && Math.abs(n.y - y) < 5) {
            queue.push(n);
          }
        }
      }
    }
    return null;
  }
}
