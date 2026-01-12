import { Field, StartingField } from "./Field";
import { Robot, type RobotStrategy } from "./Robot";
import { BasicScoringStrategy } from "./strategies/BasicScoringStrategy";
import { BasicCollectorStrategy } from "./strategies/BasicCollectorStrategy";
import {
  TICK_RATE,
  GAME_DURATION,
  FIELD_WIDTH,
  TEAM_RED,
  TEAM_BLUE,
  SCORING_INTERVAL,
  ROBOTS_PER_TEAM,
  BALL_SPEED,
  FieldTile,
} from "./GameConst";
import type { Team } from "./GameConst";
import { isInTeamZone } from "./StrategyUtils";
import { ALL_ACTIVE_STRATEGIES, ALL_INACTIVE_STRATEGIES } from "./strategies";

const STORAGE_KEY = "robot_configs_v1";

interface RobotConfig {
  id: string;
  scoringStrategy: string;
  collectionStrategy: string;
  moveSpeed: number;
  maxBalls: number;
  baseShotCooldown: number;
  maxShootDistance: number;
}

export interface GameResult {
  winner: Team | "TIE";
  scoreRed: number;
  scoreBlue: number;
}

export class Engine {
  field: Field;
  robots: Robot[];
  time: number = 0;
  isRunning: boolean = false;
  intervalId: number | null = null;
  playbackSpeed: number = 1.0;
  onTick: ((engine: Engine) => void) | null = null;
  onGameEnd: ((result: GameResult) => void) | null = null;

  scoreRed: number = 0;
  scoreBlue: number = 0;

  currentScoringTeam: Team = TEAM_BLUE; // Default start
  modeTimer: number = 0;

  constructor() {
    this.field = new StartingField();
    this.robots = [];
    this.initializeGame(false); // Initial load, don't preserve (but will load from cache)
  }

  initializeGame(preserveConfigs: boolean = false) {
    this.field = new StartingField();
    const oldRobots = [...this.robots];
    this.robots = [];
    this.time = 0;
    this.scoreRed = 0;
    this.scoreBlue = 0;
    this.currentScoringTeam = TEAM_BLUE;
    this.modeTimer = 0;

    // Initialize Teams
    this.initializeTeam(TEAM_RED, preserveConfigs ? oldRobots : undefined);
    this.initializeTeam(TEAM_BLUE, preserveConfigs ? oldRobots : undefined);

    this.updateRobotModes();
  }

  initializeTeam(team: Team, oldRobots?: Robot[]) {
    const cachedConfigs = this.loadConfigs();

    for (let i = 0; i < ROBOTS_PER_TEAM; i++) {
      const startX = team === TEAM_RED ? 1 + i : FIELD_WIDTH - 2 - i;
      const startY = 1 + i * 2;
      const id = `${team === TEAM_RED ? "R" : "B"}${i + 1}`;

      let scoringStrat: RobotStrategy = new BasicScoringStrategy();
      let collectionStrat: RobotStrategy = new BasicCollectorStrategy();
      let moveSpeed = 3.5;
      let maxBalls = 3;
      let baseShotCooldown = 5;
      let maxShootDistance = 10;

      // Priority 1: Preserve from current session if requested
      const oldRobot = oldRobots?.find((r) => r.id === id);
      if (oldRobot) {
        scoringStrat = oldRobot.scoringStrategy;
        collectionStrat = oldRobot.collectionStrategy;
        moveSpeed = oldRobot.moveSpeed;
        maxBalls = oldRobot.maxBalls;
        baseShotCooldown = oldRobot.baseShotCooldown;
        maxShootDistance = oldRobot.maxShootDistance;
      } else {
        // Priority 2: Load from cache
        const config = cachedConfigs.find((c) => c.id === id);
        if (config) {
          const ActiveClass = ALL_ACTIVE_STRATEGIES.find((S) => new S().name === config.scoringStrategy);
          if (ActiveClass) scoringStrat = new ActiveClass();

          const InactiveClass = ALL_INACTIVE_STRATEGIES.find((S) => new S().name === config.collectionStrategy);
          if (InactiveClass) collectionStrat = new InactiveClass();

          moveSpeed = config.moveSpeed;
          maxBalls = config.maxBalls;
          baseShotCooldown = config.baseShotCooldown;
          maxShootDistance = config.maxShootDistance;
        }
      }

      const robot = new Robot(
        id,
        startX,
        startY,
        team,
        scoringStrat,
        collectionStrat
      );
      robot.moveSpeed = moveSpeed;
      robot.maxBalls = maxBalls;
      robot.baseShotCooldown = baseShotCooldown;
      robot.maxShootDistance = maxShootDistance;

      this.robots.push(robot);
    }
  }

  saveConfigs() {
    try {
      const configs: RobotConfig[] = this.robots.map((r) => ({
        id: r.id,
        scoringStrategy: r.scoringStrategy.name,
        collectionStrategy: r.collectionStrategy.name,
        moveSpeed: r.moveSpeed,
        maxBalls: r.maxBalls,
        baseShotCooldown: r.baseShotCooldown,
        maxShootDistance: r.maxShootDistance,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    } catch (e) {
      console.error("Failed to save configs", e);
    }
  }

  loadConfigs(): RobotConfig[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load configs", e);
    }
    return [];
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 1000 / TICK_RATE);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.initializeGame(true); // Preserve configs on reset
    if (this.onTick) this.onTick(this);
  }

  tick() {
    if (this.time >= GAME_DURATION) {
      this.stop();
      if (this.onGameEnd) {
        const winner =
          this.scoreRed > this.scoreBlue
            ? TEAM_RED
            : this.scoreBlue > this.scoreRed
              ? TEAM_BLUE
              : "TIE";
        this.onGameEnd({
          winner,
          scoreRed: this.scoreRed,
          scoreBlue: this.scoreBlue,
        });
      }
      if (this.onTick) this.onTick(this); // Update one last time
      return;
    }

    const dt = (1.0 / TICK_RATE) * this.playbackSpeed;
    this.time += dt;
    this.modeTimer += this.playbackSpeed;

    // Switch modes
    if (this.modeTimer >= SCORING_INTERVAL) {
      this.modeTimer = 0;
      this.currentScoringTeam =
        this.currentScoringTeam === TEAM_RED ? TEAM_BLUE : TEAM_RED;
      this.updateRobotModes();
      console.log(`Switched Scoring Team to ${this.currentScoringTeam}`);
    }

    // Update Flying Balls
    for (let i = this.field.flyingBalls.length - 1; i >= 0; i--) {
      const ball = this.field.flyingBalls[i];

      // Move ball
      const dist = Math.sqrt(
        Math.pow(ball.targetX - ball.x, 2) + Math.pow(ball.targetY - ball.y, 2),
      );
      const step = ball.speed * dt;

      if (step >= dist) {
        // Landed
        ball.x = ball.targetX;
        ball.y = ball.targetY;

        // Landing Logic
        const scoringLoc = this.field.getScoringLocationAt(ball.x, ball.y);
        let placed = false;

        if (scoringLoc) {
          // Check if shot originated from team's zone
          const validOrigin = isInTeamZone(ball.originX, scoringLoc.team);

          if (scoringLoc.active && validOrigin) {
            // SCORING LOGIC
            if (scoringLoc.team === TEAM_RED) {
              this.scoreRed++;
            } else {
              this.scoreBlue++;
            }
            console.log(
              `GOAL! ${scoringLoc.team} scores! Total: Red ${this.scoreRed} - Blue ${this.scoreBlue}`,
            );

            // Ball is consumed/scored. Do not place on grid.
            // Optionally respawn a new ball elsewhere?
            this.field.respawnBall();
            placed = true; // Handled
          } else {
            // Inactive OR Invalid Origin -> Treat as occupied.
            // Fall through to findNearestOpenNode
            if (!validOrigin && scoringLoc.active) {
              console.log(`Shot INVALID (Wrong Zone) for ${scoringLoc.team}`);
            }
          }
        } else {
          // Check if landing on empty tile logic
          const tile = this.field.getTileAt(ball.x, ball.y);
          if (tile === FieldTile.EMPTY) {
            // Place it here
            const r = Math.floor(ball.y);
            const c = Math.floor(ball.x);
            if (
              r >= 0 &&
              r < this.field.grid.length &&
              c >= 0 &&
              c < this.field.grid[0].length
            ) {
              this.field.grid[r][c] = FieldTile.BALL;
              placed = true;
            }
          }
        }

        if (!placed) {
          // It landed on an inactive goal, or a wall, or another ball.
          // Find nearest open square.
          const landingNode = this.field.findNearestOpenNode(ball.x, ball.y);
          if (landingNode) {
            const r = Math.floor(landingNode.y);
            const c = Math.floor(landingNode.x);
            if (
              r >= 0 &&
              r < this.field.grid.length &&
              c >= 0 &&
              c < this.field.grid[0].length
            ) {
              this.field.grid[r][c] = FieldTile.BALL;
            }
          }
          // If no open node found, ball is lost/destroyed? Or piles up?
          // For now, if no open spot, it disappears.
        }

        this.field.flyingBalls.splice(i, 1);
      } else {
        // Move towards target
        const angle = Math.atan2(ball.targetY - ball.y, ball.targetX - ball.x);
        ball.x += Math.cos(angle) * step;
        ball.y += Math.sin(angle) * step;
      }
    }

    this.robots.forEach((robot) => {
      if (robot.shotCooldown > 0) robot.shotCooldown--;
      robot.move(this.field, dt);

      // Robot Action Decision Phase
      const action = robot.currentStrategy.decideAction(robot, this.field);

      if (action?.type === "COLLECT") {
        const r = Math.floor(robot.y);
        const c = Math.floor(robot.x);
        if (
          r >= 0 &&
          r < this.field.grid.length &&
          c >= 0 &&
          c < this.field.grid[0].length
        ) {
          if (
            this.field.grid[r][c] === FieldTile.BALL &&
            robot.ballCount < robot.maxBalls
          ) {
            this.field.grid[r][c] = FieldTile.EMPTY;
            robot.ballCount++;
            console.log(
              `${robot.id} collected ball. Count: ${robot.ballCount}`,
            );
          }
        }
      } else if (action?.type === "SHOOT") {
        if (robot.ballCount > 0 && robot.shotCooldown <= 0) {
          // Check if scoring first (immediate score if at goal?)
          // The request says: "Once the robot calls into to do shoot, it will loose that ball and the ball will be in shooting state."
          // "It will go in that dir and land at the nearest grid point... Find the nearest open grid point."
          // Actually, if it lands in a goal, does it score? The request implies shooting is a mechanic to move the ball, but user also said "Ability for robots to shoot the ball".
          // "In their strategy should consider whether shooting is the best option or not."
          // Wait, usually shooting is to SCORE.
          // "Animate this... and land at the nearest grid point after moving the distance and angle."
          // If the landing point is a GOAL, then it should score?
          // Strategy calculates shoot viability.
          // Let's implement generic shooting ball behavior. Scoring is checked if it lands in goal zone?
          // BasicScoringStrategy directs it to the goal.

          robot.ballCount--;

          const dist = action.distance;
          const angle = action.angle;

          const targetX = robot.x + Math.cos(angle) * dist;
          const targetY = robot.y + Math.sin(angle) * dist;

          // Check if lands in scoring location?
          // The prompt: "It will go in that dir and land at the nearest grid point."
          // If it lands in a scoring location, we should count it?
          // Existing logic used checkScore called on robot.
          // Now we shoot. If the target is the scoring, we need to detect that.

          // Simple logic: Is targetX/Y inside a scoring location?
          // const scoringLoc = this.field.scoringLocations.find(loc => loc.team === robot.team);
          // Check if target is 'close enough' to goal center?
          // Or let's just spawn the ball and let it fly.
          // But if it flies to valid goal, we should process score on landing?
          // OR: if the strategy says SHOOT, usually it intends to score.
          // Let's defer score check to "On Land" above?
          // OR: check now if it WILL land in goal.

          // Actually, existing checkScore checks if robot is AT the location.
          // New requirement: Robot shoots with dist/angle.
          // If target is goal, it scores.

          // Let's create the flying ball.
          this.field.flyingBalls.push({
            x: robot.x,
            y: robot.y,
            targetX: targetX,
            targetY: targetY,
            vx: Math.cos(angle) * BALL_SPEED,
            vy: Math.sin(angle) * BALL_SPEED,
            speed: BALL_SPEED,
            id: `ball-${Date.now()}-${Math.random()}`,
            originX: robot.x,
            originY: robot.y,
          });

          robot.shotCooldown = robot.baseShotCooldown;
          console.log(`${robot.id} SHOT ball.`);
        }
      } else if (action?.type === "DROP") {
        if (robot.ballCount > 0) {
          const r = Math.floor(robot.y);
          const c = Math.floor(robot.x);
          if (
            r >= 0 &&
            r < this.field.grid.length &&
            c >= 0 &&
            c < this.field.grid[0].length
          ) {
            if (this.field.grid[r][c] === FieldTile.EMPTY) {
              this.field.grid[r][c] = FieldTile.BALL;
              robot.ballCount--;
              console.log(`${robot.id} dropped ball.`);
            }
          }
        }
      }
    });

    if (this.onTick) {
      this.onTick(this);
    }
  }

  updateRobotModes() {
    // Toggle scoring locations
    this.field.scoringLocations.forEach((loc) => {
      loc.active = loc.team === this.currentScoringTeam;
    });

    this.robots.forEach((robot) => {
      if (robot.team === this.currentScoringTeam) {
        robot.setMode("SCORING");
      } else {
        robot.setMode("COLLECTING");
      }
    });
  }
}
