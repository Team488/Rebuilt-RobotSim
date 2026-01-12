import React from "react";
import { Engine } from "../simulation/Engine";

interface ControlPanelProps {
  engine: Engine;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  engine,
  isRunning,
  onStart,
  onStop,
  onReset,
}) => {
  const isFinished = engine.time >= 1500;

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginBottom: "10px",
        }}
      >
        <div style={{ color: "red", fontWeight: "bold" }}>
          Red Score: {engine.scoreRed}
        </div>
        <div style={{ color: "blue", fontWeight: "bold" }}>
          Blue Score: {engine.scoreBlue}
        </div>
        <div>Time: {engine.time.toFixed(1)}s</div>
        <div>Mode: {engine.currentScoringTeam} SCORING</div>
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        {isFinished ? (
          <button
            onClick={() => {
              onReset();
              onStart();
            }}
          >
            Restart
          </button>
        ) : !isRunning ? (
          <button onClick={onStart}>Start Simulation</button>
        ) : (
          <button onClick={onStop}>Pause</button>
        )}
        {!isFinished && <button onClick={onReset}>Reset</button>}
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Robots</h3>
        <ul
          style={{
            listStyle: "none",
            textAlign: "left",
            display: "inline-block",
          }}
        >
          {engine.robots.map((r) => (
            <li key={r.id}>
              {r.id} ({r.team}) [{r.currentMode}] -{" "}
              {r.ballCount > 0 ? "BALL" : "___"} - Pos: ({r.x.toFixed(1)},{" "}
              {r.y.toFixed(1)})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
