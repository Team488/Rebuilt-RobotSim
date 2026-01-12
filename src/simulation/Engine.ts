import { Field, StartingField } from "./Field";
import { Robot } from "./Robot";
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
import { isInTeamZone, roughGaussian } from "./StrategyUtils";
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
  accuracyMin: number;
  accuracyMax: number;
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

      // Create robot with default strategies and default values from Robot class
      // Note: Robot class defaults (moveSpeed=10, maxBalls=3, etc.) will be used
      const robot = new Robot(
        id,
        startX,
        startY,
        team,
        new BasicScoringStrategy(),
        new BasicCollectorStrategy(),
      );

      // Priority 1: Preserve from current session if requested
      const oldRobot = oldRobots?.find((r) => r.id === id);
      if (oldRobot) {
        robot.scoringStrategy = oldRobot.scoringStrategy;
        robot.collectionStrategy = oldRobot.collectionStrategy;
        robot.moveSpeed = oldRobot.moveSpeed;
        robot.maxBalls = oldRobot.maxBalls;
        robot.baseShotCooldown = oldRobot.baseShotCooldown;
        robot.maxShootDistance = oldRobot.maxShootDistance;
        robot.accuracyMin = oldRobot.accuracyMin;
        robot.accuracyMax = oldRobot.accuracyMax;
      } else {
        // Priority 2: Load from cache
        const config = cachedConfigs.find((c) => c.id === id);
        if (config) {
          const ActiveClass = ALL_ACTIVE_STRATEGIES.find(
            (S) => new S().name === config.scoringStrategy,
          );
          if (ActiveClass) robot.scoringStrategy = new ActiveClass();

          const InactiveClass = ALL_INACTIVE_STRATEGIES.find(
            (S) => new S().name === config.collectionStrategy,
          );
          if (InactiveClass) robot.collectionStrategy = new InactiveClass();

          if (config.moveSpeed !== undefined)
            robot.moveSpeed = config.moveSpeed;
          if (config.maxBalls !== undefined) robot.maxBalls = config.maxBalls;
          if (config.baseShotCooldown !== undefined)
            robot.baseShotCooldown = config.baseShotCooldown;
          if (config.maxShootDistance !== undefined)
            robot.maxShootDistance = config.maxShootDistance;
          if (config.accuracyMin !== undefined)
            robot.accuracyMin = config.accuracyMin;
          if (config.accuracyMax !== undefined)
            robot.accuracyMax = config.accuracyMax;
        }
      }

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
        accuracyMin: r.accuracyMin,
        accuracyMax: r.accuracyMax,
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
    if (this.time === 0) console.log("Engine Tick Started");
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
          robot.ballCount--;

          const dist = action.distance;
          const angle = action.angle;

          // Calculate Accuracy Percentage (Lerp)
          const distRatio = Math.min(
            Math.max(dist / robot.maxShootDistance, 0),
            1,
          );
          const percentage =
            robot.accuracyMax -
            distRatio * (robot.accuracyMax - robot.accuracyMin);

          // Continuous spread based on accuracy (0 to 1)
          const spreadScale = 2.0;
          const spread = (1 - percentage) * spreadScale;

          const rg1 = roughGaussian();
          const rg2 = roughGaussian();

          const realTargetX = robot.x + Math.cos(angle) * dist + rg1 * spread;
          const realTargetY = robot.y + Math.sin(angle) * dist + rg2 * spread;

          if (isNaN(realTargetX) || isNaN(realTargetY)) {
            console.error(
              `Shooting Error: Invalid target. Defaulting to perfect shot.`,
            );
            // Fallback to perfect shot
            const newBall = {
              x: robot.x,
              y: robot.y,
              targetX: robot.x + Math.cos(angle) * dist,
              targetY: robot.y + Math.sin(angle) * dist,
              vx: Math.cos(angle) * BALL_SPEED,
              vy: Math.sin(angle) * BALL_SPEED,
              speed: BALL_SPEED,
              id: `ball-${Date.now()}-${Math.random()}`,
              originX: robot.x,
              originY: robot.y,
            };
            this.field.flyingBalls.push(newBall);
            robot.shotCooldown = robot.baseShotCooldown;
          } else {
            const newBall = {
              x: robot.x,
              y: robot.y,
              targetX: realTargetX,
              targetY: realTargetY,
              vx: Math.cos(angle) * BALL_SPEED,
              vy: Math.sin(angle) * BALL_SPEED,
              speed: BALL_SPEED,
              id: `ball-${Date.now()}-${Math.random()}`,
              originX: robot.x,
              originY: robot.y,
            };

            this.field.flyingBalls.push(newBall);

            robot.shotCooldown = robot.baseShotCooldown;
            console.log(
              `${robot.id} SHOT ball with ${Math.round(percentage * 100)}% accuracy. Target: ${realTargetX.toFixed(1)}, ${realTargetY.toFixed(1)}`,
            );
          }
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
