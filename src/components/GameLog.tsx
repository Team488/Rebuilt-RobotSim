import React from "react";
import type { GameResult } from "../simulation/Engine";

interface GameLogProps {
    results: GameResult[];
    onReset: () => void;
}

export const GameLog: React.FC<GameLogProps> = ({ results, onReset }) => {
    const redWins = results.filter((r) => r.winner === "RED").length;
    const blueWins = results.filter((r) => r.winner === "BLUE").length;
    const ties = results.filter((r) => r.winner === "TIE").length;

    return (
        <div
            style={{
                padding: "15px",
                borderRight: "1px solid #eee",
                width: "100%",
                height: "100%",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                background: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(10px)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                    borderBottom: "2px solid #333",
                    paddingBottom: "10px",
                }}
            >
                <h3 style={{ margin: 0 }}>Match History</h3>
                <button
                    onClick={onReset}
                    style={{
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Clear
                </button>
            </div>
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    overflowY: "auto",
                }}
            >
                {results.length === 0 && (
                    <div style={{ color: "#999", fontSize: "13px", textAlign: "center", marginTop: "20px" }}>
                        No matches recorded yet.
                    </div>
                )}
                {[...results].reverse().map((r, i) => (
                    <div
                        key={results.length - i}
                        style={{
                            fontSize: "13px",
                            padding: "8px",
                            borderRadius: "6px",
                            background: "#fff",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            borderLeft: `4px solid ${r.winner === "RED" ? "#ff4d4d" : r.winner === "BLUE" ? "#4d79ff" : "#999"
                                }`,
                        }}
                    >
                        <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
                            Match #{results.length - i}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>
                                <span style={{ color: "#ff4d4d", fontWeight: "bold" }}>{r.scoreRed}</span> -{" "}
                                <span style={{ color: "#4d79ff", fontWeight: "bold" }}>{r.scoreBlue}</span>
                            </span>
                            <span style={{ fontWeight: "bold" }}>
                                {r.winner === "TIE" ? "DRAW" : `${r.winner} WIN`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div
                style={{
                    marginTop: "15px",
                    paddingTop: "15px",
                    borderTop: "2px solid #eee",
                }}
            >
                <h4 style={{ margin: "0 0 10px 0" }}>Cumulative Stats</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Red Wins:</span>
                        <span style={{ fontWeight: "bold", color: "#ff4d4d" }}>{redWins}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Blue Wins:</span>
                        <span style={{ fontWeight: "bold", color: "#4d79ff" }}>{blueWins}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Ties:</span>
                        <span style={{ fontWeight: "bold", color: "#666" }}>{ties}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px", borderTop: "1px solid #eee", paddingTop: "5px" }}>
                        <span>Total Matches:</span>
                        <span style={{ fontWeight: "bold" }}>{results.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
