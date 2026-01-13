import { Field } from "./Field";

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

// Simple fast binary heap for A*
class MinHeap {
  content: Node[] = [];

  push(element: Node) {
    this.content.push(element);
    this.bubbleUp(this.content.length - 1);
  }

  pop(): Node | undefined {
    const result = this.content[0];
    const end = this.content.pop();
    if (this.content.length > 0 && end) {
      this.content[0] = end;
      this.sinkDown(0);
    }
    return result;
  }

  size() {
    return this.content.length;
  }

  rescoreElement(node: Node) {
    this.sinkDown(this.content.indexOf(node));
  }

  private bubbleUp(n: number) {
    const element = this.content[n];
    const score = element.f;
    while (n > 0) {
      const parentN = Math.floor((n + 1) / 2) - 1;
      const parent = this.content[parentN];
      if (score >= parent.f) break;
      this.content[parentN] = element;
      this.content[n] = parent;
      n = parentN;
    }
  }

  private sinkDown(n: number) {
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = element.f;

    while (true) {
      const child2N = (n + 1) * 2;
      const child1N = child2N - 1;
      let swap: number | null = null;
      let child1Score!: number;

      if (child1N < length) {
        const child1 = this.content[child1N];
        child1Score = child1.f;
        if (child1Score < elemScore) swap = child1N;
      }

      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = child2.f;
        if (child2Score < (swap === null ? elemScore : child1Score)) swap = child2N;
      }

      if (swap === null) break;

      this.content[n] = this.content[swap];
      this.content[swap] = element;
      n = swap;
    }
  }
}

export class AStar {
  // Pre-calculated diagonal cost adjustment
  private static readonly OCTILE_ADJ = 1.41421356237 - 2;

  // Directions for neighbors: [dx, dy, cost]
  private static readonly NEIGHBORS = [
    [0, -1, 1],
    [0, 1, 1],
    [-1, 0, 1],
    [1, 0, 1],
    [-1, -1, 1.41421356237],
    [1, -1, 1.41421356237],
    [-1, 1, 1.41421356237],
    [1, 1, 1.41421356237],
  ];

  static findPath(
    field: Field,
    start: { x: number; y: number },
    target: { x: number; y: number },
    robotIdToIgnore?: string,
  ): { x: number; y: number }[] | null {
    // Convert to grid coordinates
    const startX = Math.floor(start.x);
    const startY = Math.floor(start.y);
    const targetX = Math.floor(target.x);
    const targetY = Math.floor(target.y);

    // Initial passability check for target
    // We pass 'false' for ignoreRobots to respect obstacles, unless robotIdToIgnore is set to 'IGNORE_ALL_ROBOTS'
    const ignoreAll = robotIdToIgnore === "IGNORE_ALL_ROBOTS";

    // Bounds check
    if (!field.isPassable(targetY, targetX, ignoreAll, ignoreAll ? undefined : robotIdToIgnore)) {
      // If target is an obstacle, try to find nearest valid tile
      const nearest = this.findNearestValidTile(field, targetX, targetY, robotIdToIgnore);
      if (!nearest) return null;
      return this.findPath(field, start, nearest, robotIdToIgnore);
    }

    const openHeap = new MinHeap();
    const openMap = new Map<number, Node>(); // Key -> Node
    const closedSet = new Set<number>();
    const fieldWidth = field.width;

    const startNode: Node = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, targetX, targetY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openHeap.push(startNode);
    openMap.set(startY * fieldWidth + startX, startNode);

    while (openHeap.size() > 0) {
      const current = openHeap.pop()!;
      const posKey = current.y * fieldWidth + current.x;
      openMap.delete(posKey);

      if (current.x === targetX && current.y === targetY) {
        return this.reconstructPath(current);
      }

      closedSet.add(posKey);

      for (const [dx, dy, cost] of AStar.NEIGHBORS) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        // Skip if out of bounds (implicit in isPassable but cheaper to check basic range if needed, though isPassable handles it)
        if (!field.isPassable(ny, nx, ignoreAll, ignoreAll ? undefined : robotIdToIgnore)) continue;

        const neighborKey = ny * fieldWidth + nx;
        if (closedSet.has(neighborKey)) continue;

        // Diagonal squeeze check
        if (cost > 1) {
          if (!field.isPassable(current.y, nx, ignoreAll, ignoreAll ? undefined : robotIdToIgnore) ||
            !field.isPassable(ny, current.x, ignoreAll, ignoreAll ? undefined : robotIdToIgnore)) {
            continue;
          }
        }

        const gScore = current.g + cost;
        let neighborNode = openMap.get(neighborKey);

        if (!neighborNode) {
          neighborNode = {
            x: nx,
            y: ny,
            g: gScore,
            h: this.heuristic(nx, ny, targetX, targetY),
            f: 0,
            parent: current,
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openHeap.push(neighborNode);
          openMap.set(neighborKey, neighborNode);
        } else if (gScore < neighborNode.g) {
          neighborNode.g = gScore;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
          // In a proper D-ary heap we decrease key. With this simple heap, we can lazy update or just re-push.
          // Re-pushing causes duplicates.
          // Rescoring is expensive with native array search.
          // For now, simpler optimization: existing handle.
          openHeap.rescoreElement(neighborNode);
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
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    return dx + dy + this.OCTILE_ADJ * Math.min(dx, dy);
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
    robotIdToIgnore?: string,
  ): { x: number; y: number } | null {
    // Determine ignore flag
    const ignoreAll = robotIdToIgnore === "IGNORE_ALL_ROBOTS";
    const ignoreId = ignoreAll ? undefined : robotIdToIgnore;

    const queue: { x: number; y: number }[] = [{ x, y }];
    const visited = new Set<number>();
    visited.add(Math.floor(y) * field.width + Math.floor(x));

    while (queue.length > 0) {
      const curr = queue.shift()!;

      if (field.isPassable(curr.y, curr.x, ignoreAll, ignoreId)) {
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
          if (Math.abs(n.x - x) < 5 && Math.abs(n.y - y) < 5) {
            queue.push(n);
          }
        }
      }
    }
    return null;
  }
}
