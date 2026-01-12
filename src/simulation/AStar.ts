import { Field } from "./Field";

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
    // Bounds check
    if (!field.isPassable(targetY, targetX)) {
      // If target is an obstacle, try to find nearest valid tile
      const nearest = this.findNearestValidTile(field, targetX, targetY);
      if (!nearest) return null;
      return this.findPath(field, start, nearest);
    }

    const openList: Node[] = [];
    const openMap = new Map<number, Node>();
    const closedSet = new Set<number>();

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
    openMap.set(startY * field.width + startX, startNode);

    while (openList.length > 0) {
      // Find node with lowest f
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openList.splice(currentIndex, 1)[0];
      const posKey = current.y * field.width + current.x;
      openMap.delete(posKey);

      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      closedSet.add(posKey);

      // Neighbors (8-way connectivity)
      const neighbors = [
        { x: current.x - 1, y: current.y, dist: 1 },
        { x: current.x + 1, y: current.y, dist: 1 },
        { x: current.x, y: current.y - 1, dist: 1 },
        { x: current.x, y: current.y + 1, dist: 1 },
        // Diagonals
        { x: current.x - 1, y: current.y - 1, dist: 1.414 },
        { x: current.x + 1, y: current.y - 1, dist: 1.414 },
        { x: current.x - 1, y: current.y + 1, dist: 1.414 },
        { x: current.x + 1, y: current.y + 1, dist: 1.414 },
      ];

      for (const neighbor of neighbors) {
        if (!field.isPassable(neighbor.y, neighbor.x)) continue;
        const neighborKey = neighbor.y * field.width + neighbor.x;
        if (closedSet.has(neighborKey)) continue;

        // For diagonals, check if "squeezing" through obstacles
        if (neighbor.dist > 1) {
          if (!field.isPassable(current.y, neighbor.x) || !field.isPassable(neighbor.y, current.x)) {
            continue; // Can't move diagonally if both adjacent tiles are blocked
          }
        }

        const gScore = current.g + neighbor.dist;
        let neighborNode = openMap.get(neighborKey);

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
          openMap.set(neighborKey, neighborNode);
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
    const visited = new Set<number>();
    visited.add(y * field.width + x);

    while (queue.length > 0) {
      const curr = queue.shift()!;

      if (field.isPassable(curr.y, curr.x)) {
        return { x: curr.x + 0.5, y: curr.y + 0.5 };
      }

      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 },
      ];

      for (const n of neighbors) {
        if (n.x < 0 || n.x >= field.width || n.y < 0 || n.y >= field.height) continue;
        const key = n.y * field.width + n.x;
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
