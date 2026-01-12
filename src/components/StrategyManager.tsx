import React, { useMemo } from "react";
import { Engine } from "../simulation/Engine";
import { ALL_ACTIVE_STRATEGIES, ALL_INACTIVE_STRATEGIES } from "../simulation/strategies";

interface StrategyManagerProps {
    engine: Engine;
    onUpdate: () => void;
}

export const StrategyManager: React.FC<StrategyManagerProps> = ({ engine, onUpdate }) => {
    // Pre-instantiate to get names for the dropdowns once
    const activeOptions = useMemo(() => ALL_ACTIVE_STRATEGIES.map(S => new S()), []);
    const inactiveOptions = useMemo(() => ALL_INACTIVE_STRATEGIES.map(S => new S()), []);

    return (
        <div
            style={{
                padding: "20px",
                background: "#f9f9f9",
                borderTop: "1px solid #ddd",
                width: "100%",
                boxSizing: "border-box",
            }}
        >
            <h3 style={{ marginTop: 0, marginBottom: "20px", textAlign: "center", color: "#333" }}>
                Robot Manager
            </h3>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "20px",
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                {engine.robots.map((robot) => (
                    <div
                        key={robot.id}
                        style={{
                            background: "#fff",
                            padding: "15px",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                            border: `1px solid ${robot.team === "RED" ? "#ff4d4d33" : "#4d79ff33"}`,
                            borderLeft: `6px solid ${robot.team === "RED" ? "#ff4d4d" : "#4d79ff"}`,
                        }}
                    >
                        <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "12px", borderBottom: "1px solid #eee", paddingBottom: "8px" }}>
                            Robot {robot.id}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {/* Strategy Selection Row */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                        Active Strat
                                    </label>
                                    <select
                                        style={{ width: "100%", padding: "6px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px" }}
                                        value={robot.scoringStrategy.name}
                                        onChange={(e) => {
                                            const StratClass = ALL_ACTIVE_STRATEGIES.find(S => new S().name === e.target.value);
                                            if (StratClass) {
                                                robot.scoringStrategy = new StratClass();
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

                                <div>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                        Inactive Strat
                                    </label>
                                    <select
                                        style={{ width: "100%", padding: "6px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px" }}
                                        value={robot.collectionStrategy.name}
                                        onChange={(e) => {
                                            const StratClass = ALL_INACTIVE_STRATEGIES.find(S => new S().name === e.target.value);
                                            if (StratClass) {
                                                robot.collectionStrategy = new StratClass();
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

                            {/* Robot Constants Row 1 */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "5px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                        Move Speed (m/s)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        style={{ width: "100%", padding: "6px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", boxSizing: "border-box" }}
                                        value={robot.moveSpeed}
                                        onChange={(e) => {
                                            robot.moveSpeed = parseFloat(e.target.value) || 0;
                                            onUpdate();
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                        Max Balls
                                    </label>
                                    <input
                                        type="number"
                                        style={{ width: "100%", padding: "6px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", boxSizing: "border-box" }}
                                        value={robot.maxBalls}
                                        onChange={(e) => {
                                            robot.maxBalls = parseInt(e.target.value) || 0;
                                            onUpdate();
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Robot Constants Row 2 */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                        Shot Delay (Ticks)
                                    </label>
                                    <input
                                        type="number"
                                        style={{ width: "100%", padding: "6px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", boxSizing: "border-box" }}
                                        value={robot.baseShotCooldown}
                                        onChange={(e) => {
                                            robot.baseShotCooldown = parseInt(e.target.value) || 0;
                                            onUpdate();
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: "11px", fontWeight: "bold", color: "#666", marginBottom: "4px" }}>
                                        Shot Range (m)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        style={{ width: "100%", padding: "6px", borderRadius: "5px", border: "1px solid #ddd", fontSize: "12px", boxSizing: "border-box" }}
                                        value={robot.maxShootDistance}
                                        onChange={(e) => {
                                            robot.maxShootDistance = parseFloat(e.target.value) || 0;
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
