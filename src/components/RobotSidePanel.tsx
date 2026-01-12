import React from "react";
import { Engine } from "../simulation/Engine";

interface RobotSidePanelProps {
    engine: Engine;
}

export const RobotSidePanel: React.FC<RobotSidePanelProps> = ({ engine }) => {
    return (
        <div
            style={{
                padding: "15px",
                borderLeft: "1px solid #eee",
                width: "280px",
                height: "100%",
                overflowY: "auto",
                background: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(10px)",
            }}
        >
            <h3 style={{ marginTop: 0, borderBottom: "2px solid #333", paddingBottom: "10px" }}>
                Robot Intelligence
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {engine.robots.map((r) => (
                    <div
                        key={r.id}
                        style={{
                            padding: "10px",
                            borderRadius: "8px",
                            background: r.team === "RED" ? "#fff5f5" : "#f5f8ff",
                            border: `1px solid ${r.team === "RED" ? "#ffcccc" : "#ccd9ff"}`,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        }}
                    >
                        <div style={{ fontWeight: "bold", fontSize: "14px", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
                            <span>{r.id}</span>
                            <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: "#333", color: "#fff" }}>
                                {r.currentStrategy.name}
                            </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>
                            Pos: ({r.x.toFixed(1)}, {r.y.toFixed(1)})
                        </div>
                        <div style={{ fontSize: "14px", marginTop: "4px", fontWeight: "600" }}>
                            Balls: {r.ballCount} / {r.maxBalls}
                        </div>
                        <div style={{ fontSize: "11px", marginTop: "6px", fontStyle: "italic", color: "#444" }}>
                            S: {r.scoringStrategy.name}
                        </div>
                        <div style={{ fontSize: "11px", fontStyle: "italic", color: "#444" }}>
                            C: {r.collectionStrategy.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
