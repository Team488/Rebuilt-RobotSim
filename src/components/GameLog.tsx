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
        <div className="game-log-panel">
            <div className="log-header">
                <h3>Match History</h3>
                <button
                    onClick={onReset}
                    className="clear-btn"
                >
                    Clear
                </button>
            </div>
            <div className="log-content">
                {results.length === 0 && (
                    <div className="empty-log">
                        No matches recorded yet.
                    </div>
                )}
                {[...results].reverse().map((r, i) => (
                    <div
                        key={results.length - i}
                        className={`log-item win-${r.winner.toLowerCase()}`}
                    >
                        <div className="log-item-header">
                            Match #{results.length - i}
                        </div>
                        <div className="log-item-score">
                            <span className="scores">
                                <span className="red-score">{r.scoreRed}</span> - <span className="blue-score">{r.scoreBlue}</span>
                            </span>
                            <span className="winner-label">
                                {r.winner === "TIE" ? "DRAW" : `${r.winner} WIN`}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="log-stats">
                <h4>Stats</h4>
                <div className="stats-grid">
                    <div className="stat-row">
                        <span>Red Wins:</span>
                        <span className="red-val">{redWins}</span>
                    </div>
                    <div className="stat-row">
                        <span>Blue Wins:</span>
                        <span className="blue-val">{blueWins}</span>
                    </div>
                    <div className="stat-row">
                        <span>Ties:</span>
                        <span className="tie-val">{ties}</span>
                    </div>
                    <div className="stat-row total">
                        <span>Total:</span>
                        <span>{results.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
