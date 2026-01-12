import { useEffect, useRef } from "react";
import { Engine } from "../simulation/Engine";
import { FieldTile } from "../simulation/GameConst";
import { FIELD_WIDTH, FIELD_HEIGHT } from "../simulation/GameConst";

interface FieldViewProps {
  engine: Engine;
}

export const FieldView: React.FC<FieldViewProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Scale factor: Tiles to Pixels
  // Field is roughly 32x16. Let's aim for ~800px width. 800/32 = 25.
  const SCALE = 30;

  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Field Grid
      // Draw background
      ctx.fillStyle = "#333";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Tiles (Balls, Obstacles)
      const grid = engine.field.grid;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[0].length; c++) {
          const tile = grid[r][c];
          const x = c * SCALE;
          const y = r * SCALE;

          if (tile === FieldTile.WALL) {
            ctx.fillStyle = "#555";
            ctx.fillRect(x, y, SCALE, SCALE);
          } else {
            // Color empty squares (and background of balls) based on zone
            if (c < FIELD_WIDTH / 3) {
              ctx.fillStyle = "rgba(255, 0, 0, 0.15)"; // Red Zone
            } else if (c >= (2 * FIELD_WIDTH) / 3) {
              ctx.fillStyle = "rgba(0, 0, 255, 0.15)"; // Blue Zone
            } else {
              ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; // Neutral Zone
            }
            ctx.fillRect(x, y, SCALE, SCALE);

            if (tile === FieldTile.BALL) {
              ctx.fillStyle = "orange";
              ctx.beginPath();
              ctx.arc(
                x + 0.5 * SCALE,
                y + 0.5 * SCALE,
                0.3 * SCALE,
                0,
                2 * Math.PI,
              );
              ctx.fill();
            }
          }

          // Optional: Draw grid lines for debugging
          ctx.strokeStyle = "#444";
          ctx.strokeRect(x, y, SCALE, SCALE);
        }
      }

      // Draw Scoring Zones
      engine.field.scoringLocations.forEach((sl) => {
        const x = sl.tileX * SCALE;
        const y = sl.tileY * SCALE;
        ctx.fillStyle =
          sl.team === "RED" ? "rgba(255, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
        ctx.fillRect(x, y, SCALE, SCALE);
        // Border
        ctx.strokeStyle = sl.team === "RED" ? "red" : "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, SCALE, SCALE);
        ctx.strokeRect(x, y, SCALE, SCALE);
      });

      // Draw Flying Balls
      engine.field.flyingBalls.forEach((ball) => {
        const x = ball.x * SCALE;
        const y = ball.y * SCALE;

        // Shadow (simulate height by offsetting shadow)
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.arc(x + 5, y + 5, 0.2 * SCALE, 0, 2 * Math.PI);
        ctx.fill();

        // Ball
        ctx.fillStyle = "#ffcc00"; // Brighter orange for visibility
        ctx.beginPath();
        ctx.arc(x, y, 0.25 * SCALE, 0, 2 * Math.PI);
        ctx.fill();

        // Highlight/Sheen
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(
          x - 0.08 * SCALE,
          y - 0.08 * SCALE,
          0.08 * SCALE,
          0,
          2 * Math.PI,
        );
        ctx.fill();
      });

      // Draw Robots
      engine.robots.forEach((robot) => {
        // Robot x,y are tile coordinates (floats for smooth movement)
        const x = robot.x * SCALE;
        const y = robot.y * SCALE;

        // Robot Body (centered on tile coord)
        // If robot.x = 5.5, it's at middle of tile 5? No, previous logic was index based.
        // Robot aims for x.5. So drawing at x*SCALE centers it if x is center.
        // Let's assume robot x is the center of the robot.
        // We want to draw a box centered at x,y.
        ctx.fillStyle = robot.team === "RED" ? "#ff4444" : "#4444ff";
        ctx.fillRect(
          x - 0.4 * SCALE,
          y - 0.4 * SCALE,
          0.8 * SCALE,
          0.8 * SCALE,
        );

        // ID
        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(robot.id, x, y - 0.5 * SCALE);

        // Has Ball Indicator (Count)
        if (robot.ballCount > 0) {
          ctx.fillStyle = "orange";
          ctx.beginPath();
          ctx.arc(x, y, 0.2 * SCALE, 0, 2 * Math.PI);
          ctx.fill();

          // Count text
          ctx.fillStyle = "black";
          ctx.font = "8px Arial";
          ctx.fillText(robot.ballCount.toString(), x, y + 3);
        }
      });

      // Draw Time
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.textAlign = "left";
      ctx.fillText(`Time: ${engine.time.toFixed(1)}s`, 10, 30);

      // Draw Scores
      ctx.textAlign = "right";
      ctx.fillStyle = "#ff4444";
      ctx.fillText(`Red: ${engine.scoreRed}`, canvas.width - 10, 30);
      ctx.fillStyle = "#4444ff";
      ctx.fillText(`Blue: ${engine.scoreBlue}`, canvas.width - 10, 55);
    };

    render();
    // Hook into animation frame if needed or rely on parent updates
  }, [engine, engine.time]); // dependence on engine.time triggers re-render if parent updates prop

  return (
    <canvas
      ref={canvasRef}
      width={FIELD_WIDTH * SCALE}
      height={FIELD_HEIGHT * SCALE}
      style={{ border: "2px solid #666", background: "#222" }}
    />
  );
};
