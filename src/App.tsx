import { useEffect, useState, useRef } from "react";
import "./index.css"; // Ensure styles are loaded
import { Engine } from "./simulation/Engine";
import { FieldView } from "./components/FieldView";
import { ControlPanel } from "./components/ControlPanel";

function App() {
  const engineRef = useRef<Engine>(new Engine());
  const [, setTick] = useState(0); // Used to force update
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Hook into engine tick
    engineRef.current.onTick = (eng) => {
      setTick(eng.time); // Force re-render
    };

    return () => {
      engineRef.current.stop();
    };
  }, []);

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
    setTick(0);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <h1>FRC 2026 Simulation</h1>
      <FieldView engine={engineRef.current} />
      <ControlPanel
        engine={engineRef.current}
        isRunning={isRunning}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
