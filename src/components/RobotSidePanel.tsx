import React from "react";
import { Engine } from "../simulation/Engine";

interface RobotSidePanelProps {
  engine: Engine;
}

export const RobotSidePanel: React.FC<RobotSidePanelProps> = ({ engine }) => {
  return (
    <div className="robot-side-panel">
      <h3 className="sidebar-title">Robot Intelligence</h3>
      <div className="robot-list">
        {engine.robots.map((r) => (
          <div
            key={r.id}
            className={`robot-info-card team-${r.team.toLowerCase()}`}
          >
            <div className="info-card-header">
              <span className="robot-id">{r.id}</span>
              <span className="strategy-tag">{r.currentStrategy.name}</span>
            </div>
            <div className="robot-pos">
              ({r.x.toFixed(1)}, {r.y.toFixed(1)})
            </div>
            <div className="robot-status-banner">
              <span
                className={`status-dot team-${r.team.toLowerCase()}`}
              ></span>
              <span className="status-text">
                {r.currentStrategy.status || "Analyzing field..."}
              </span>
            </div>
            <div className="robot-ball-stats">
              Balls:{" "}
              <span className="ball-count">
                {r.ballCount} / {r.maxBalls}
              </span>
            </div>
            <div className="assigned-strategies">
              <div className="strategy-row">
                <span className="label">S:</span> {r.scoringStrategy.name}
              </div>
              <div className="strategy-row">
                <span className="label">C:</span> {r.collectionStrategy.name}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
