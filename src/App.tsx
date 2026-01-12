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

  const [leftOpen, setLeftOpen] = useState(window.innerWidth > 1024);
  const [rightOpen, setRightOpen] = useState(window.innerWidth > 1024);

  // Close sidebars on mobile when clicking outside
  const closeSidebars = () => {
    if (window.innerWidth <= 1024) {
      setLeftOpen(false);
      setRightOpen(false);
    }
  };

  const forceUpdate = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setLeftOpen(true);
        setRightOpen(true);
      } else {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    <div className={`app-container ${(leftOpen || rightOpen) ? "sidebar-open" : ""}`}>
      {/* Mobile Overlay */}
      {(leftOpen || rightOpen) && window.innerWidth <= 1024 && (
        <div
          className="mobile-overlay-actual"
          onClick={closeSidebars}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 45,
            background: 'transparent'
          }}
        />
      )}

      {/* Left Sidebar: Game Log */}
      <div className={`sidebar left-sidebar ${!leftOpen ? "closed-mobile" : ""}`} style={{
        width: leftOpen ? "320px" : "0px",
      }}>
        <div className="sidebar-content" style={{ opacity: leftOpen ? 1 : 0 }}>
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

      <div className="main-content">
        <main className="main-scroll-area">
          <div className="field-container" style={{
            boxShadow: `0 10px 40px ${engineRef.current.currentScoringTeam === "RED" ? "rgba(255, 77, 79, 0.2)" : "rgba(24, 144, 255, 0.2)"}`,
            border: `4px solid ${engineRef.current.currentScoringTeam === "RED" ? "#ff4d4f" : "#1890ff"}`,
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

          <div className="strategy-manager-container">
            <StrategyManager engine={engineRef.current} onUpdate={forceUpdate} />
          </div>
        </main>
      </div>

      {/* Right Sidebar: Robot Info */}
      <div className={`sidebar right-sidebar ${!rightOpen ? "closed-mobile" : ""}`} style={{
        width: rightOpen ? "320px" : "0px",
      }}>
        <div className="sidebar-content" style={{ opacity: rightOpen ? 1 : 0 }}>
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

      {/* Mobile Menu Toggle Floating Buttons */}
      <div className="mobile-menu-toggle">
        <button
          onClick={() => {
            setLeftOpen(!leftOpen);
            setRightOpen(false);
          }}
          style={{ backgroundColor: leftOpen ? "#333" : "#fff", color: leftOpen ? "#fff" : "#333" }}
        >
          Log {leftOpen ? "×" : "≡"}
        </button>
        <button
          onClick={() => {
            setRightOpen(!rightOpen);
            setLeftOpen(false);
          }}
          style={{ backgroundColor: rightOpen ? "#333" : "#fff", color: rightOpen ? "#fff" : "#333" }}
        >
          Intell {rightOpen ? "×" : "≡"}
        </button>
      </div>
    </div>
  );
}

export default App;
