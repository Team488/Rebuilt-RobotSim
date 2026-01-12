import { useEffect, useState, useRef, useCallback } from "react";
import "./index.css";
import { Engine, type GameResult } from "./simulation/Engine";
import { FieldView } from "./components/FieldView";
import { ControlPanel } from "./components/ControlPanel";
import { GameLog } from "./components/GameLog";
import { RobotSidePanel } from "./components/RobotSidePanel";
import { StrategyManager } from "./components/StrategyManager";

function App() {
  const engineRef = useRef<Engine>(new Engine());
  const [, setTick] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);

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
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {/* Left Sidebar: Game Log - Full Height */}
      <GameLog results={gameResults} onReset={clearLog} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        overflow: "hidden"
      }}>
        <header style={{
          padding: "15px 30px",
          background: "#ffffff",
          color: "#1a1a1a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 1px 5px rgba(0,0,0,0.1)",
          flexShrink: 0,
          borderBottom: "1px solid #eee"
        }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "800", letterSpacing: "0.5px" }}>FRC 2026 REBUILT SIM</h1>
        </header>

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
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            borderRadius: "12px",
            overflow: "hidden",
            background: "#000",
            padding: "10px",
            flexShrink: 0
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

      {/* Right Sidebar: Robot Info - Full Height */}
      <RobotSidePanel engine={engineRef.current} />
    </div>
  );
}

export default App;
