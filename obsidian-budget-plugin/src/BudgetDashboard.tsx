import React, { useEffect, useState } from "react";
import { App } from "obsidian";
import { loadTransactions, buildWeeklySnapshot } from "./dataService";
import { WeeklySnapshot, resolveDataFolder } from "./models";
import BudgetPlugin from "./main";

interface BudgetDashboardProps {
    app: App;
    plugin: BudgetPlugin;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ app, plugin }) => {
    const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    
    // Read initial settings from the plugin instance
    const [env, setEnv] = useState<"production" | "testing">(plugin.settings.environment);
    const [activeScenario, setActiveScenario] = useState<string>(plugin.settings.activeScenario);
    const [scenarios, setScenarios] = useState<string[]>([]);

    const loadData = async (currentEnv = env, currentScenario = activeScenario) => {
        setLoading(true);
        // Resolve the active folder path locally via the pure utility
        const folderPath = resolveDataFolder({
            environment: currentEnv,
            activeScenario: currentScenario,
            prodDataFolder: plugin.settings.prodDataFolder,
            testDataFolder: plugin.settings.testDataFolder
        });
        const txs = await loadTransactions(app.vault, folderPath);
        const snap = buildWeeklySnapshot(txs);
        setSnapshot(snap);
        setLoading(false);
    };

    const loadScenariosList = async () => {
        const list = await plugin.scanScenarios();
        setScenarios(list);
    };

    useEffect(() => {
        loadData();
        loadScenariosList();
    }, []);

    const handleEnvChange = async (newEnv: "production" | "testing") => {
        setEnv(newEnv);
        plugin.settings.environment = newEnv;
        await plugin.saveSettings();
        await plugin.refreshDashboard(); // Syncs Obsidian markdown dashboards
        await loadData(newEnv, activeScenario);
    };

    const handleScenarioChange = async (newScenario: string) => {
        setActiveScenario(newScenario);
        plugin.settings.activeScenario = newScenario;
        await plugin.saveSettings();
        await plugin.refreshDashboard(); // Syncs Obsidian markdown dashboards
        await loadData(env, newScenario);
    };

    const handleManualRefresh = async () => {
        await plugin.refreshDashboard(); // Run backend markdown updates
        await loadData(env, activeScenario); // Reload local state
    };

    // When settings panel is opened, re-scan scenarios on-the-fly to ensure sync
    const toggleSettings = async () => {
        if (!showSettings) {
            await loadScenariosList();
        }
        setShowSettings(!showSettings);
    };

    if (loading && !snapshot) {
        return <div style={{ padding: 16 }}>Loading transactions...</div>;
    }

    return (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
            {/* Header with Settings Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>Budget Tracker</h3>
                <button
                    onClick={toggleSettings}
                    style={{
                        background: "none",
                        border: "none",
                        fontSize: 18,
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background 0.2s",
                    }}
                    title="Toggle Environment & Settings"
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--background-modifier-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                    ⚙️
                </button>
            </div>

            {/* Settings Drawer */}
            {showSettings && (
                <div style={{
                    background: "var(--background-secondary)",
                    border: "1px solid var(--background-modifier-border)",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 16,
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}>
                    <h5 style={{ marginTop: 0, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Plugin Settings</span>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>v2.0</span>
                    </h5>
                    
                    {/* Environment Toggle */}
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 4 }}>Environment</label>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button 
                                onClick={() => handleEnvChange("production")}
                                style={{
                                    flex: 1,
                                    padding: "6px 8px",
                                    fontSize: 12,
                                    background: env === "production" ? "var(--interactive-success)" : "var(--background-primary)",
                                    color: env === "production" ? "#fff" : "var(--text-muted)",
                                    border: "1px solid var(--background-modifier-border)",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontWeight: env === "production" ? "bold" : "normal",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                Production
                            </button>
                            <button 
                                onClick={() => handleEnvChange("testing")}
                                style={{
                                    flex: 1,
                                    padding: "6px 8px",
                                    fontSize: 12,
                                    background: env === "testing" ? "var(--interactive-accent)" : "var(--background-primary)",
                                    color: env === "testing" ? "#fff" : "var(--text-muted)",
                                    border: "1px solid var(--background-modifier-border)",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    fontWeight: env === "testing" ? "bold" : "normal",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                Testing
                            </button>
                        </div>
                    </div>

                    {/* Scenario Selection (Only shown if testing env is active) */}
                    {env === "testing" && (
                        <div style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 11, fontWeight: "bold", display: "block", marginBottom: 4 }}>Active Scenario</label>
                            <select
                                value={activeScenario}
                                onChange={(e) => handleScenarioChange(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: 6,
                                    fontSize: 12,
                                    borderRadius: 4,
                                    background: "var(--background-primary)",
                                    color: "var(--text-normal)",
                                    border: "1px solid var(--background-modifier-border)",
                                    outline: "none"
                                }}
                            >
                                <option value="none">None (Root Test Folder)</option>
                                {scenarios.map((scen) => (
                                    <option key={scen} value={scen}>
                                        {scen}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Active Mode Status Badge */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
                <span style={{
                    fontSize: 9,
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: env === "production" ? "var(--interactive-success)" : "var(--interactive-accent)",
                    color: "#fff"
                }}>
                    {env}
                </span>
                {env === "testing" && (
                    <span style={{ fontSize: 11, opacity: 0.7 }}>
                        Scenario: <strong>{activeScenario === "none" ? "None" : activeScenario}</strong>
                    </span>
                )}
            </div>

            {/* Snapshot Render */}
            {!snapshot || snapshot.buckets.length === 0 ? (
                <div style={{ padding: "12px 0" }}>
                    <p style={{ fontSize: 13, opacity: 0.7 }}>No transactions found for this week in the active folder.</p>
                    <button onClick={handleManualRefresh} style={{ width: "100%", padding: 8 }}>
                        ↻ Refresh Data
                    </button>
                </div>
            ) : (
                <>
                    <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0, marginBottom: 8 }}>
                        Week: {snapshot.weekStart} → {snapshot.weekEnd}
                    </p>

                    <div style={{
                        background: "var(--background-modifier-form-field)",
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 12,
                    }}>
                        <div style={{ fontSize: 24, fontWeight: "bold" }}>
                            ${snapshot.totalSpent.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Total Spent This Week</div>
                    </div>

                    <h4 style={{ margin: "12px 0 6px 0" }}>By Category</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                        {snapshot.buckets.map((b) => (
                            <li
                                key={b.category}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    padding: "6px 0",
                                    borderBottom: "1px solid var(--background-modifier-border)",
                                }}
                            >
                                <span>{b.category}</span>
                                <span style={{ fontWeight: "bold" }}>
                                    ${b.total.toFixed(2)}{" "}
                                    <span style={{ fontSize: 11, opacity: 0.5 }}>
                                        ({b.count})
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={handleManualRefresh}
                        style={{ marginTop: 16, width: "100%", padding: 8 }}
                    >
                        ↻ Refresh Data
                    </button>
                </>
            )}
        </div>
    );
};
