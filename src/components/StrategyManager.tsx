import React, { useMemo, useState } from "react";
import { Engine } from "../simulation/Engine";
import {
    ALL_ACTIVE_STRATEGIES,
    ALL_INACTIVE_STRATEGIES,
} from "../simulation/strategies";
import JSZip from "jszip";

interface StrategyManagerProps {
    engine: Engine;
    onUpdate: () => void;
}

export const StrategyManager: React.FC<StrategyManagerProps> = ({
    engine,
    onUpdate,
}) => {
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [teamName, setTeamName] = useState("");
    const [teamToSave, setTeamToSave] = useState<"RED" | "BLUE">("RED");
    const [teamToLoad, setTeamToLoad] = useState<string | null>(null);
    const [loadAsTeam, setLoadAsTeam] = useState<"RED" | "BLUE">("RED");

    // Pre-instantiate to get names for the dropdowns once
    const activeOptions = useMemo(
        () => ALL_ACTIVE_STRATEGIES.map((S) => new S()),
        [],
    );
    const inactiveOptions = useMemo(
        () => ALL_INACTIVE_STRATEGIES.map((S) => new S()),
        [],
    );

    const handleSaveTeam = () => {
        if (!teamName.trim()) return;
        engine.saveTeam(teamToSave, teamName.trim());
        setTeamName("");
        setShowSaveModal(false);
    };

    const handleLoadTeam = () => {
        if (!teamToLoad) return;
        engine.loadTeam(loadAsTeam, teamToLoad);
        setShowLoadModal(false);
        onUpdate();
    };

    const handleExportTeams = async () => {
        const zip = new JSZip();
        const savedTeams = engine.getSavedTeams();

        savedTeams.forEach(team => {
            zip.file(`${team.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`, JSON.stringify(team, null, 2));
        });

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = "robot_teams_export.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const zip = await JSZip.loadAsync(file);
            const teamConfigs: any[] = [];

            for (const filename of Object.keys(zip.files)) {
                if (filename.endsWith(".json")) {
                    const content = await zip.files[filename].async("text");
                    try {
                        const team = JSON.parse(content);
                        if (team.name && team.robots) {
                            teamConfigs.push(team);
                        }
                    } catch (err) {
                        console.error(`Failed to parse ${filename}`, err);
                    }
                }
            }

            if (teamConfigs.length > 0) {
                engine.importTeams(teamConfigs);
                onUpdate();
                alert(`Successfully imported ${teamConfigs.length} team(s)!`);
            }
        } catch (err) {
            console.error("Failed to load zip file", err);
            alert("Failed to load zip file. Make sure it's a valid robot teams export.");
        }

        // Reset input
        e.target.value = "";
    };

    const savedTeams = engine.getSavedTeams();

    return (
        <div className="strategy-manager-panel">
            <h3 className="panel-title">Robot Configurations</h3>

            <div className="team-management-header">
                <button onClick={() => setShowSaveModal(true)} className="secondary-button">
                    <span>💾</span> Save Team Config
                </button>
                <button onClick={() => { setTeamToLoad(null); setShowLoadModal(true); }} className="secondary-button">
                    <span>📂</span> Load Team Config
                </button>
                <button onClick={handleExportTeams} className="secondary-button">
                    <span>📥</span> Export All (.zip)
                </button>
                <button
                    onClick={() => document.getElementById('zip-import-input')?.click()}
                    className="secondary-button"
                >
                    <span>📤</span> Import Zip
                </button>
                <input
                    id="zip-import-input"
                    type="file"
                    accept=".zip"
                    style={{ display: 'none' }}
                    onChange={handleImportZip}
                />
            </div>

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
                                        value={robot.scoringStrategy.id}
                                        onChange={(e) => {
                                            const StratClass = ALL_ACTIVE_STRATEGIES.find(
                                                (S) => new S().id === e.target.value,
                                            );
                                            if (StratClass) {
                                                robot.scoringStrategy = new StratClass();
                                                engine.saveConfigs();
                                                onUpdate();
                                            }
                                        }}
                                    >
                                        {activeOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label>Inactive Strat</label>
                                    <select
                                        value={robot.collectionStrategy.id}
                                        onChange={(e) => {
                                            const StratClass = ALL_INACTIVE_STRATEGIES.find(
                                                (S) => new S().id === e.target.value,
                                            );
                                            if (StratClass) {
                                                robot.collectionStrategy = new StratClass();
                                                engine.saveConfigs();
                                                onUpdate();
                                            }
                                        }}
                                    >
                                        {inactiveOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}>
                                                {opt.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Robot Constants Rows */}
                            <div className="params-row">
                                <div className="input-group">
                                    <label>Speed (u/tick)</label>
                                    <input
                                        type="number"
                                        step="0.05"
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
                                    <label>Shot Delay (ticks)</label>
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

            {/* Save Modal */}
            {showSaveModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4 className="modal-title">Save Team Configuration</h4>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Team Name</label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="e.g. Aggressive Offense"
                                />
                            </div>
                            <div className="input-group">
                                <label>Save Which Team?</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className={`secondary-button ${teamToSave === 'RED' ? 'selected' : ''}`}
                                        onClick={() => setTeamToSave('RED')}
                                        style={{ flex: 1, borderColor: teamToSave === 'RED' ? '#ff4d4f' : '#eee' }}
                                    >
                                        Red Team
                                    </button>
                                    <button
                                        className={`secondary-button ${teamToSave === 'BLUE' ? 'selected' : ''}`}
                                        onClick={() => setTeamToSave('BLUE')}
                                        style={{ flex: 1, borderColor: teamToSave === 'BLUE' ? '#1890ff' : '#eee' }}
                                    >
                                        Blue Team
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowSaveModal(false)}>Cancel</button>
                            <button
                                className="primary-button"
                                onClick={handleSaveTeam}
                                disabled={!teamName.trim()}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Load Modal */}
            {showLoadModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h4 className="modal-title">Load Team Configuration</h4>
                        <div className="modal-body">
                            <div className="input-group">
                                <label>Select Team</label>
                                <div className="team-list">
                                    {savedTeams.length === 0 && (
                                        <div className="empty-log">No saved teams yet</div>
                                    )}
                                    {savedTeams.map(t => (
                                        <div
                                            key={t.name}
                                            className={`team-list-item ${teamToLoad === t.name ? 'selected' : ''}`}
                                            onClick={() => setTeamToLoad(t.name)}
                                        >
                                            <span>{t.name}</span>
                                            <button
                                                className="team-delete-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    engine.deleteTeam(t.name);
                                                    if (teamToLoad === t.name) setTeamToLoad(null);
                                                    onUpdate();
                                                }}
                                                title="Delete Config"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Load As?</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        className={`secondary-button ${loadAsTeam === 'RED' ? 'selected' : ''}`}
                                        onClick={() => setLoadAsTeam('RED')}
                                        style={{ flex: 1, borderColor: loadAsTeam === 'RED' ? '#ff4d4f' : '#eee' }}
                                    >
                                        Red Team
                                    </button>
                                    <button
                                        className={`secondary-button ${loadAsTeam === 'BLUE' ? 'selected' : ''}`}
                                        onClick={() => setLoadAsTeam('BLUE')}
                                        style={{ flex: 1, borderColor: loadAsTeam === 'BLUE' ? '#1890ff' : '#eee' }}
                                    >
                                        Blue Team
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setShowLoadModal(false)}>Cancel</button>
                            <button
                                className="primary-button"
                                onClick={handleLoadTeam}
                                disabled={!teamToLoad}
                            >
                                Load
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
