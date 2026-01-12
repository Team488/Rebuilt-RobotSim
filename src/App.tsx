import { useEffect, useState, useRef, useCallback } from "react";
import "./index.css";
import { Engine, type GameResult } from "./simulation/Engine";
import { FieldView } from "./components/FieldView";
import { ControlPanel } from "./components/ControlPanel";
import { GameLog } from "./components/GameLog";
import { RobotSidePanel } from "./components/RobotSidePanel";
import { StrategyManager } from "./components/StrategyManager";

function App() {
  const [engine] = useState(() => new Engine());
  const engineRef = useRef<Engine>(engine);
  const [, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  const forceUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    // Hook into engine tick
    engineRef.current.onTick = () => {
      forceUpdate();
    };

    engineRef.current.onGameEnd = (result) => {
      setGameResults((prev) => [...prev, result]);
      setIsRunning(false);
    };

    return () => {
      engineRef.current.stop();
    };
  }, [forceUpdate]);

  const handleStart = () => {
    engineRef.current.start();
    setIsRunning(true);
  };

  const handleStop = () => {
    engineRef.current.stop();
    setIsRunning(false);
  };

  const handleReset = () => {
    engineRef.current.reset();
    setIsRunning(false);
    forceUpdate();
  };

  const clearLog = () => {
    setGameResults([]);
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      width: "100vw",
      overflow: "hidden",
      backgroundColor: "#f0f2f5",
      fontFamily: "'Outfit', sans-serif"
    }}>
      {/* Left Sidebar: Game Log */}
      <div style={{
        width: leftOpen ? "320px" : "0px",
        height: "100%",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "visible",
        flexShrink: 0,
        backgroundColor: "#fff",
        borderRight: leftOpen ? "1px solid #eee" : "none"
      }}>
        <div style={{
          width: "320px",
          height: "100%",
          opacity: leftOpen ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
          pointerEvents: leftOpen ? "auto" : "none"
        }}>
          <GameLog results={gameResults} onReset={clearLog} />
        </div>
        <button
          onClick={() => setLeftOpen(!leftOpen)}
          className={`side-panel-toggle ${!leftOpen ? "closed" : ""}`}
          style={{
            position: "absolute",
            left: "100%",
            top: "10px",
            zIndex: 100,
            borderLeft: "none",
            borderRadius: "0 4px 4px 0"
          }}
          title={leftOpen ? "Collapse Log" : "Expand Log"}
        >
          {leftOpen ? "←" : "→"}
        </button>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden",
        position: "relative"
      }}>
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px",
          overflowY: "auto",
          backgroundColor: "#fff"
        }}>
          <div style={{
            boxShadow: `0 10px 40px ${engineRef.current.currentScoringTeam === "RED" ? "rgba(255, 77, 79, 0.2)" : "rgba(24, 144, 255, 0.2)"}`,
            borderRadius: "16px",
            overflow: "hidden",
            background: "#000",
            padding: "8px",
            flexShrink: 0,
            border: `4px solid ${engineRef.current.currentScoringTeam === "RED" ? "#ff4d4f" : "#1890ff"}`,
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "translateZ(0)"
          }}>
            <FieldView engine={engineRef.current} />
          </div>

          <ControlPanel
            engine={engineRef.current}
            isRunning={isRunning}
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
            onUpdate={forceUpdate}
          />

          <div style={{ width: "100%", marginTop: "30px", borderTop: "2px solid #eee" }}>
            <StrategyManager engine={engineRef.current} onUpdate={forceUpdate} />
          </div>
        </main>
      </div>

      {/* Right Sidebar: Robot Info */}
      <div style={{
        width: rightOpen ? "320px" : "0px",
        height: "100%",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflow: "visible",
        flexShrink: 0,
        backgroundColor: "#fff",
        borderLeft: rightOpen ? "1px solid #eee" : "none"
      }}>
        <div style={{
          width: "320px",
          height: "100%",
          opacity: rightOpen ? 1 : 0,
          transition: "opacity 0.2s ease-in-out",
          pointerEvents: rightOpen ? "auto" : "none"
        }}>
          <RobotSidePanel engine={engineRef.current} />
        </div>
        <button
          onClick={() => setRightOpen(!rightOpen)}
          className={`side-panel-toggle ${!rightOpen ? "closed" : ""}`}
          style={{
            position: "absolute",
            right: "100%",
            top: "10px",
            zIndex: 100,
            borderRight: "none",
            borderRadius: "4px 0 0 4px"
          }}
          title={rightOpen ? "Collapse Intelligence" : "Expand Intelligence"}
        >
          {rightOpen ? "→" : "←"}
        </button>
      </div>
    </div>
  );
}

export default App;
