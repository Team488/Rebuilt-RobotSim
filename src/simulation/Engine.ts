import { Field, StartingField } from "./Field";
import { Robot } from "./Robot";
import { BasicScoringStrategy } from "./strategies/BasicScoringStrategy";
import { BasicCollectorNoShootStrategy } from "./strategies/BasicCollectorNoShootStrategy";
import {
  BASE_TICK_RATE,
  SECONDS_PER_TICK,
  GAME_DURATION,
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
const TEAM_STORAGE_KEY = "saved_team_configs_v1";
const TEAM_NAMES_STORAGE_KEY = "team_names_v1";

const isCustomName = (name: string | undefined): boolean => {
  if (!name) return false;
  return !/^(Red|Blue) [1-3]$/i.test(name);
};

interface RobotConfig {
  id: string;
  name?: string;
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

  playbackSpeed: number = 1.0;
  onTick: ((engine: Engine) => void) | null = null;
  onGameEnd: ((result: GameResult) => void) | null = null;

  scoreRed: number = 0;
  scoreBlue: number = 0;

  currentScoringTeam: Team = TEAM_BLUE; // Default start
  modeTimer: number = 0;

  redTeamName: string = "Default Red";
  blueTeamName: string = "Default Blue";

  constructor() {
    this.field = new StartingField();
    this.field.engine = this;
    this.robots = [];
    this.loadTeamNames();
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

    const startPositions = Field.getRobotStartingPositions(team);

    for (let i = 0; i < ROBOTS_PER_TEAM; i++) {
      const pos = startPositions[i % startPositions.length];
      const startX = pos.x;
      const startY = pos.y;
      const id = `${team === TEAM_RED ? "R" : "B"}${i + 1}`;
      const defaultName = `${team === TEAM_RED ? "Red" : "Blue"} ${i + 1}`;

      // Create robot with default strategies and default values from Robot class
      const robot = new Robot(
        id,
        startX,
        startY,
        team,
        new BasicScoringStrategy(),
        new BasicCollectorNoShootStrategy(),
        defaultName,
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
            (S) => new S().id === config.scoringStrategy,
          );
          if (ActiveClass) robot.scoringStrategy = new ActiveClass();

          const InactiveClass = ALL_INACTIVE_STRATEGIES.find(
            (S) => new S().id === config.collectionStrategy,
          );
          if (InactiveClass) robot.collectionStrategy = new InactiveClass();

          if (config.moveSpeed !== undefined) robot.moveSpeed = config.moveSpeed;
          if (config.maxBalls !== undefined) robot.maxBalls = config.maxBalls;
          if (config.baseShotCooldown !== undefined)
            robot.baseShotCooldown = config.baseShotCooldown;
          if (config.maxShootDistance !== undefined)
            robot.maxShootDistance = config.maxShootDistance;
          if (config.accuracyMin !== undefined)
            robot.accuracyMin = config.accuracyMin;
          if (config.accuracyMax !== undefined)
            robot.accuracyMax = config.accuracyMax;
          if (config.name && isCustomName(config.name)) robot.name = config.name;
        }
      }

      this.robots.push(robot);
    }
  }

  saveConfigs() {
    try {
      const configs: RobotConfig[] = this.robots.map((r) => {
        const config: RobotConfig = {
          id: r.id,
          scoringStrategy: r.scoringStrategy.id,
          collectionStrategy: r.collectionStrategy.id,
          moveSpeed: r.moveSpeed,
          maxBalls: r.maxBalls,
          baseShotCooldown: r.baseShotCooldown,
          maxShootDistance: r.maxShootDistance,
          accuracyMin: r.accuracyMin,
          accuracyMax: r.accuracyMax,
        };
        if (isCustomName(r.name)) {
          config.name = r.name;
        }
        return config;
      });
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

  getRobotConfig(robot: Robot): RobotConfig {
    const config: RobotConfig = {
      id: robot.id,
      scoringStrategy: robot.scoringStrategy.id,
      collectionStrategy: robot.collectionStrategy.id,
      moveSpeed: robot.moveSpeed,
      maxBalls: robot.maxBalls,
      baseShotCooldown: robot.baseShotCooldown,
      maxShootDistance: robot.maxShootDistance,
      accuracyMin: robot.accuracyMin,
      accuracyMax: robot.accuracyMax,
    };

    if (isCustomName(robot.name)) {
      config.name = robot.name;
    }

    return config;
  }

  applyRobotConfig(robot: Robot, config: RobotConfig) {
    const ActiveClass = ALL_ACTIVE_STRATEGIES.find(
      (S) => new S().id === config.scoringStrategy,
    );
    if (ActiveClass) robot.scoringStrategy = new ActiveClass();

    const InactiveClass = ALL_INACTIVE_STRATEGIES.find(
      (S) => new S().id === config.collectionStrategy,
    );
    if (InactiveClass) robot.collectionStrategy = new InactiveClass();

    if (config.moveSpeed !== undefined) robot.moveSpeed = config.moveSpeed;
    if (config.maxBalls !== undefined) robot.maxBalls = config.maxBalls;
    if (config.baseShotCooldown !== undefined)
      robot.baseShotCooldown = config.baseShotCooldown;
    if (config.maxShootDistance !== undefined)
      robot.maxShootDistance = config.maxShootDistance;
    if (config.accuracyMin !== undefined)
      robot.accuracyMin = config.accuracyMin;
    if (config.accuracyMax !== undefined)
      robot.accuracyMax = config.accuracyMax;

    if (config.name && isCustomName(config.name)) {
      robot.name = config.name;
    } else {
      // Set default name based on team and index-like ID
      const teamPrefix = robot.team === TEAM_RED ? "Red" : "Blue";
      const idNum = robot.id.substring(1);
      robot.name = `${teamPrefix} ${idNum}`;
    }
  }

  getSavedTeams(): { name: string; robots: RobotConfig[] }[] {
    try {
      const stored = localStorage.getItem(TEAM_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to load team configs", e);
    }
    return [];
  }

  saveTeam(team: Team, name: string) {
    const teamRobots = this.robots.filter((r) => r.team === team);
    const teamConfigs = teamRobots.map((r) => this.getRobotConfig(r));

    const savedTeams = this.getSavedTeams();
    const existingIndex = savedTeams.findIndex((t) => t.name === name);

    if (existingIndex >= 0) {
      savedTeams[existingIndex].robots = teamConfigs;
    } else {
      savedTeams.push({ name, robots: teamConfigs });
    }

    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(savedTeams));
  }

  loadTeam(targetTeam: Team, name: string) {
    const savedTeams = this.getSavedTeams();
    const teamToLoad = savedTeams.find((t) => t.name === name);

    if (teamToLoad) {
      if (targetTeam === TEAM_RED) {
        this.redTeamName = name;
      } else {
        this.blueTeamName = name;
      }
      this.saveTeamNames();

      const targetRobots = this.robots.filter((r) => r.team === targetTeam);
      targetRobots.forEach((robot, index) => {
        // Find config in the saved team for the corresponding robot index
        // Or match by relative ID (e.g., R1, R2, R3)
        // Let's match by index since teams are 3 robots.
        if (teamToLoad.robots[index]) {
          this.applyRobotConfig(robot, teamToLoad.robots[index]);
        }
      });
      this.saveConfigs(); // Update current session cache
    }
  }

  saveTeamNames() {
    localStorage.setItem(TEAM_NAMES_STORAGE_KEY, JSON.stringify({
      red: this.redTeamName,
      blue: this.blueTeamName
    }));
  }

  loadTeamNames() {
    try {
      const stored = localStorage.getItem(TEAM_NAMES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.redTeamName = parsed.red || "Default Red";
        this.blueTeamName = parsed.blue || "Default Blue";
      }
    } catch (e) {
      console.error("Failed to load team names", e);
    }
  }

  deleteTeam(name: string) {
    const savedTeams = this.getSavedTeams();
    const filtered = savedTeams.filter((t) => t.name !== name);
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(filtered));
  }

  importTeams(newTeams: { name: string; robots: RobotConfig[] }[]) {
    const savedTeams = this.getSavedTeams();

    newTeams.forEach(newTeam => {
      const existingIndex = savedTeams.findIndex(t => t.name === newTeam.name);
      if (existingIndex >= 0) {
        savedTeams[existingIndex] = newTeam;
      } else {
        savedTeams.push(newTeam);
      }
    });

    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(savedTeams));
  }


  private lastTime: number = 0;
  private accumulator: number = 0;
  private animationFrameId: number | null = null;

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.lastTime = performance.now();
    this.accumulator = 0;

    const gameLoop = (currentTime: number) => {
      if (!this.isRunning) return;

      const dtReal = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Cap delta time to prevent spiral of death after tab regains focus
      const cappedDt = Math.min(dtReal, 0.1); // Max 100ms worth of simulation per frame

      // The user wants ticks per second to scale with playbackSpeed.
      // So target ticks per real-second is BASE_TICK_RATE * playbackSpeed.
      this.accumulator += cappedDt * (BASE_TICK_RATE * this.playbackSpeed);

      // Process accumulated ticks (capped to prevent freezing on slow frames)
      const maxTicksPerFrame = BASE_TICK_RATE * 2; // Cap at 2 seconds worth of ticks
      let ticksProcessed = 0;

      while (this.accumulator >= 1 && this.isRunning && ticksProcessed < maxTicksPerFrame) {
        this.tick();
        this.accumulator -= 1;
        ticksProcessed++;
      }

      // If we hit the cap, reset accumulator to prevent infinite catch-up
      if (ticksProcessed >= maxTicksPerFrame) {
        this.accumulator = 0;
      }

      if (this.onTick) {
        this.onTick(this);
      }

      // Schedule next frame
      this.animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Start the loop
    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset() {
    this.stop();
    this.initializeGame(true); // Preserve configs on reset
    if (this.onTick) this.onTick(this);
  }

  tick() {
    if (!this.isRunning) return;
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

    this.time += SECONDS_PER_TICK;
    this.modeTimer++;

    // Optimize collision checks
    this.field.updateRobotMap();

    // Switch modes
    if (this.modeTimer >= SCORING_INTERVAL) {
      this.modeTimer = 0;
      this.currentScoringTeam =
        this.currentScoringTeam === TEAM_RED ? TEAM_BLUE : TEAM_RED;
      this.updateRobotModes();
    }

    // Update Flying Balls
    for (let i = this.field.flyingBalls.length - 1; i >= 0; i--) {
      const ball = this.field.flyingBalls[i];

      // Move ball
      const dx = ball.targetX - ball.x;
      const dy = ball.targetY - ball.y;
      const distSq = dx * dx + dy * dy;
      const step = ball.speed;
      const stepSq = step * step;

      if (stepSq >= distSq) {
        // Landed
        ball.x = ball.targetX;
        ball.y = ball.targetY;

        // Landing Logic
        const scoringLoc = this.field.getScoringLocationAt(ball.x, ball.y);
        let placed = false;

        if (scoringLoc) {
          // Check if shot originated from team's zone
          const validOrigin = isInTeamZone(ball.originX, scoringLoc.team, this.field);

          if (scoringLoc.active && validOrigin) {
            // SCORING LOGIC
            if (scoringLoc.team === TEAM_RED) {
              this.scoreRed++;
            } else {
              this.scoreBlue++;
            }

            // Ball is consumed/scored. Do not place on grid.
            // Optionally respawn a new ball elsewhere?
            this.field.respawnBall();
            placed = true; // Handled
          } else {
            // Inactive OR Invalid Origin -> Treat as occupied.
            // Fall through to findNearestOpenNode
          }
        } else {
          // Check if landing on empty tile logic
          if (this.field.getTileAt(ball.x, ball.y) === FieldTile.EMPTY) {
            placed = this.field.setTileAt(ball.x, ball.y, FieldTile.BALL);
          }
        }

        if (!placed) {
          // It landed on an inactive goal, or a wall, or another ball.
          // Find nearest open square.
          const landingNode = this.field.findNearestOpenNode(ball.x, ball.y);
          if (landingNode) {
            this.field.setTileAt(landingNode.x, landingNode.y, FieldTile.BALL);
          }
          // If no open node found, ball is lost/destroyed? Or piles up?
          // For now, if no open spot, it disappears.
        }

        this.field.flyingBalls.splice(i, 1);
      } else {
        // Move towards target
        const dist = Math.sqrt(distSq);
        ball.x += (dx / dist) * step;
        ball.y += (dy / dist) * step;
      }
    }

    this.robots.forEach((robot) => {
      if (robot.shotCooldown > 0) robot.shotCooldown--;
      robot.move(this.field);

      // Robot Action Decision Phase
      const action = robot.currentStrategy.decideAction(robot, this.field);

      if (action?.type === "COLLECT") {
        if (
          this.field.getTileAt(robot.x, robot.y) === FieldTile.BALL &&
          robot.ballCount < robot.maxBalls
        ) {
          this.field.setTileAt(robot.x, robot.y, FieldTile.EMPTY);
          robot.ballCount++;
        }
      } else if (action?.type === "SHOOT") {
        if (robot.ballCount > 0 && robot.shotCooldown <= 0) {
          robot.ballCount--;

          const dist = action.distance;
          const angle = action.angle;

          // Calculate Accuracy Percentage (Lerp)
          const distRatio = Math.min(Math.max(dist / robot.maxShootDistance, 0), 1);
          const percentage = robot.accuracyMax - distRatio * (robot.accuracyMax - robot.accuracyMin);

          // Continuous spread based on accuracy
          const spread = (1 - percentage) * 2.0;
          const rg1 = roughGaussian();
          const rg2 = roughGaussian();

          let targetX = robot.x + Math.cos(angle) * dist + rg1 * spread;
          let targetY = robot.y + Math.sin(angle) * dist + rg2 * spread;

          if (isNaN(targetX) || isNaN(targetY)) {
            console.error(`Shooting Error: Invalid target. Defaulting to perfect shot.`);
            targetX = robot.x + Math.cos(angle) * dist;
            targetY = robot.y + Math.sin(angle) * dist;
          }

          this.field.flyingBalls.push({
            x: robot.x,
            y: robot.y,
            targetX,
            targetY,
            speed: BALL_SPEED,
            id: `ball-${Date.now()}-${Math.random()}`,
            originX: robot.x,
            originY: robot.y,
          });

          robot.shotCooldown = robot.baseShotCooldown;
        }
      } else if (action?.type === "DROP") {
        if (robot.ballCount > 0) {
          if (this.field.getTileAt(robot.x, robot.y) === FieldTile.EMPTY) {
            if (this.field.setTileAt(robot.x, robot.y, FieldTile.BALL)) {
              robot.ballCount--;
            }
          }
        }
      }
    });

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
