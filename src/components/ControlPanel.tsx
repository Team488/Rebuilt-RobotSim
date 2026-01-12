import React from "react";
import { Engine } from "../simulation/Engine";

interface ControlPanelProps {
  engine: Engine;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUpdate: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  engine,
  isRunning,
  onStart,
  onStop,
  onReset,
  onUpdate,
}) => {
  const isFinished = engine.time >= 220; // GAME_DURATION

  const handleMuchSlower = () => {
    engine.playbackSpeed = Math.max(0.1, engine.playbackSpeed - 1.0);
    onUpdate();
  };

  const handleSlower = () => {
    engine.playbackSpeed = Math.max(0.1, engine.playbackSpeed - 0.1);
    onUpdate();
  };

  const handleFaster = () => {
    engine.playbackSpeed = Math.min(20, engine.playbackSpeed + 0.1);
    onUpdate();
  };

  const handleMuchFaster = () => {
    engine.playbackSpeed = Math.min(20, engine.playbackSpeed + 1.0);
    onUpdate();
  };

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <div
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          marginBottom: "15px",
        }}
      >
        <div style={{ color: "#ff4d4d", fontWeight: "bold" }}>
          Red Score: {engine.scoreRed}
        </div>
        <div style={{ color: "#4d79ff", fontWeight: "bold" }}>
          Blue Score: {engine.scoreBlue}
        </div>
        <div>Time: {engine.time.toFixed(1)}s</div>
        <div style={{ fontWeight: "600" }}>
          Mode: {engine.currentScoringTeam === "RED" ? "🔴 RED" : "🔵 BLUE"}{" "}
          SCORING
        </div>
      </div>

      <div style={{ display: "flex", gap: "15px", justifyContent: "center", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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

        <div style={{ width: "2px", height: "24px", background: "#eee" }}></div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#555" }}>
            Sim Speed: {engine.playbackSpeed.toFixed(1)}x
          </span>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={handleMuchSlower}
              title="Much Slower"
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              {"<<"}
            </button>
            <button
              onClick={handleSlower}
              title="Slower"
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              {"<"}
            </button>
            <button
              onClick={handleFaster}
              title="Faster"
              style={{ padding: "4px 10px", fontSize: "12px" }}
            >
              {">"}
            </button>
            <button
              onClick={handleMuchFaster}
              title="Much Faster"
              style={{ padding: "4px 8px", fontSize: "12px" }}
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
