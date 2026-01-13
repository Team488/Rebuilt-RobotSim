import React from "react";
import { Engine } from "../simulation/Engine";
import { GAME_DURATION } from "../simulation/GameConst";

interface ControlPanelProps {
  engine: Engine;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onUpdate: () => void;
  playAgain: boolean;
  setPlayAgain: (val: boolean) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  engine,
  isRunning,
  onStart,
  onStop,
  onReset,
  onUpdate,
  playAgain,
  setPlayAgain,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const isFinished = engine.time >= GAME_DURATION;

  const handleMuchSlower = () => {
    engine.playbackSpeed = Math.max(0.1, engine.playbackSpeed - 1.0);
    onUpdate();
  };

  const handleSlower = () => {
    engine.playbackSpeed = Math.max(0.1, engine.playbackSpeed - 0.1);
    onUpdate();
  };

  const handleFaster = () => {
    engine.playbackSpeed = Math.min(3, engine.playbackSpeed + 0.1);
    onUpdate();
  };

  const handleMuchFaster = () => {
    engine.playbackSpeed = Math.min(3, engine.playbackSpeed + 1.0);
    onUpdate();
  };

  return (
    <div className="control-panel-container">
      <div className="score-display">
        <div className="score-item red-score">Red: {engine.scoreRed}</div>
        <div className="score-item blue-score">Blue: {engine.scoreBlue}</div>
        <div className="score-item time">Time: {engine.time.toFixed(1)}s</div>
        <div
          className={`score-item mode-status ${engine.currentScoringTeam === "RED" ? "red" : "blue"}`}
        >
          {engine.currentScoringTeam === "RED" ? "🔴 RED" : "🔵 BLUE"} SCORING
        </div>
      </div>

      <div className="controls-group">
        <div className="action-buttons">
          {isFinished ? (
            <button
              className="primary-button"
              onClick={() => {
                onReset();
                onStart();
              }}
            >
              Restart
            </button>
          ) : !isRunning ? (
            <button className="primary-button" onClick={onStart}>
              Start Simulation
            </button>
          ) : (
            <button className="secondary-button" onClick={onStop}>
              Pause
            </button>
          )}
          {!isFinished && (
            <button className="reset-button" onClick={onReset}>
              Reset
            </button>
          )}

          <div className="divider"></div>

          <button
            className={`play-again-toggle ${playAgain ? "active" : ""}`}
            onClick={() => setPlayAgain(!playAgain)}
            title="Automatically restart when the game ends"
          >
            {playAgain ? "🔄 Play Again: ON" : "🔄 Play Again: OFF"}
          </button>

          <button
            className="theme-toggle speed-btn"
            onClick={onToggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            style={{ fontSize: '1.2rem', padding: '0 8px' }}
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="divider"></div>

        <div className="speed-controls">
          <span className="speed-label">
            Speed: {engine.playbackSpeed.toFixed(1)}x
          </span>
          <div className="speed-buttons">
            <button
              onClick={handleMuchSlower}
              title="Much Slower"
              className="speed-btn"
            >
              {"<<"}
            </button>
            <button onClick={handleSlower} title="Slower" className="speed-btn">
              {"<"}
            </button>
            <button onClick={handleFaster} title="Faster" className="speed-btn">
              {">"}
            </button>
            <button
              onClick={handleMuchFaster}
              title="Much Faster"
              className="speed-btn"
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
