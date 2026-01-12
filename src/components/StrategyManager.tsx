import React, { useMemo } from "react";
import { Engine } from "../simulation/Engine";
import {
  ALL_ACTIVE_STRATEGIES,
  ALL_INACTIVE_STRATEGIES,
} from "../simulation/strategies";

interface StrategyManagerProps {
  engine: Engine;
  onUpdate: () => void;
}

export const StrategyManager: React.FC<StrategyManagerProps> = ({
  engine,
  onUpdate,
}) => {
  // Pre-instantiate to get names for the dropdowns once
  const activeOptions = useMemo(
    () => ALL_ACTIVE_STRATEGIES.map((S) => new S()),
    [],
  );
  const inactiveOptions = useMemo(
    () => ALL_INACTIVE_STRATEGIES.map((S) => new S()),
    [],
  );

  return (
    <div className="strategy-manager-panel">
      <h3 className="panel-title">Robot Configurations</h3>
      <div className="robot-grid">
        {engine.robots.map((robot) => (
          <div
            key={robot.id}
            className={`robot-card ${robot.team === "RED" ? "team-red" : "team-blue"}`}
          >
            <div className="robot-header">Robot {robot.id}</div>

            <div className="robot-params">
              {/* Strategy Selection Row */}
              <div className="params-row">
                <div className="input-group">
                  <label>Active Strat</label>
                  <select
                    value={robot.scoringStrategy.name}
                    onChange={(e) => {
                      const StratClass = ALL_ACTIVE_STRATEGIES.find(
                        (S) => new S().name === e.target.value,
                      );
                      if (StratClass) {
                        robot.scoringStrategy = new StratClass();
                        engine.saveConfigs();
                        onUpdate();
                      }
                    }}
                  >
                    {activeOptions.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label>Inactive Strat</label>
                  <select
                    value={robot.collectionStrategy.name}
                    onChange={(e) => {
                      const StratClass = ALL_INACTIVE_STRATEGIES.find(
                        (S) => new S().name === e.target.value,
                      );
                      if (StratClass) {
                        robot.collectionStrategy = new StratClass();
                        engine.saveConfigs();
                        onUpdate();
                      }
                    }}
                  >
                    {inactiveOptions.map((opt) => (
                      <option key={opt.name} value={opt.name}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Robot Constants Rows */}
              <div className="params-row">
                <div className="input-group">
                  <label>Speed (m/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={robot.moveSpeed}
                    onChange={(e) => {
                      robot.moveSpeed = parseFloat(e.target.value) || 0;
                      engine.saveConfigs();
                      onUpdate();
                    }}
                  />
                </div>
                <div className="input-group">
                  <label>Max Balls</label>
                  <input
                    type="number"
                    value={robot.maxBalls}
                    onChange={(e) => {
                      robot.maxBalls = parseInt(e.target.value) || 0;
                      engine.saveConfigs();
                      onUpdate();
                    }}
                  />
                </div>
              </div>

              <div className="params-row">
                <div className="input-group">
                  <label>Shot Delay</label>
                  <input
                    type="number"
                    value={robot.baseShotCooldown}
                    onChange={(e) => {
                      robot.baseShotCooldown = parseInt(e.target.value) || 0;
                      engine.saveConfigs();
                      onUpdate();
                    }}
                  />
                </div>
                <div className="input-group">
                  <label>Range (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={robot.maxShootDistance}
                    onChange={(e) => {
                      robot.maxShootDistance = parseFloat(e.target.value) || 0;
                      engine.saveConfigs();
                      onUpdate();
                    }}
                  />
                </div>
              </div>

              <div className="params-row">
                <div className="input-group">
                  <label>Acc Min</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={robot.accuracyMin}
                    onChange={(e) => {
                      robot.accuracyMin = parseFloat(e.target.value) || 0;
                      engine.saveConfigs();
                      onUpdate();
                    }}
                  />
                </div>
                <div className="input-group">
                  <label>Acc Max</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={robot.accuracyMax}
                    onChange={(e) => {
                      robot.accuracyMax = parseFloat(e.target.value) || 0;
                      engine.saveConfigs();
                      onUpdate();
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
