import React, { useEffect, useState } from "react";
import { App } from "obsidian";
import { 
    loadTransactions, 
    buildWeeklySnapshot, 
    loadBudgetConfig, 
    BudgetConfig, 
    getExperiencesSubTagBreakdown, 
    calculateSpendingAnalytics 
} from "./components/dataService";
import { WeeklySnapshot, resolveDataFolder, Transaction } from "./models";
import BudgetPlugin from "./main";
import { SolarSystemMap } from "./components/SolarSystemMap";

interface BudgetDashboardProps {
    app: App;
    plugin: BudgetPlugin;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ app, plugin }) => {
    const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
    const [config, setConfig] = useState<BudgetConfig | null>(null);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    
    // Read initial settings from the plugin instance
    const [env, setEnv] = useState<"production" | "testing">(plugin.settings.environment);
    const [activeScenario, setActiveScenario] = useState<string>(plugin.settings.activeScenario);
    const [activeWeekDate, setActiveWeekDate] = useState<string>(plugin.settings.activeWeekDate || "current");
    const [scenarios, setScenarios] = useState<string[]>([]);
    const [isSettingsHovered, setIsSettingsHovered] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "map">("map");
    const [activeTab, setActiveTab] = useState<"spending" | "analytics">("spending");
    const [expandedExperiences, setExpandedExperiences] = useState(false);

    const loadData = async (currentEnv = env, currentScenario = activeScenario, currentWeekDate = activeWeekDate) => {
        setLoading(true);
        // Resolve the active folder path locally via the pure utility
        const folderPath = resolveDataFolder({
            environment: currentEnv,
            activeScenario: currentScenario,
            prodDataFolder: plugin.settings.prodDataFolder,
            testDataFolder: plugin.settings.testDataFolder,
            activeWeekDate: currentWeekDate
        });
        const txs = await loadTransactions(app.vault, folderPath);
        setAllTransactions(txs);
        const cfg = await loadBudgetConfig(app.vault);
        setConfig(cfg);

        let targetDate = new Date();
        if (currentWeekDate && currentWeekDate !== "current") {
            targetDate = new Date(currentWeekDate + "T00:00:00");
        }

        const snap = buildWeeklySnapshot(txs, cfg, targetDate);
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
        await loadData(newEnv, activeScenario, activeWeekDate);
    };

    const handleScenarioChange = async (newScenario: string) => {
        setActiveScenario(newScenario);
        plugin.settings.activeScenario = newScenario;
        await plugin.saveSettings();
        await plugin.refreshDashboard(); // Syncs Obsidian markdown dashboards
        await loadData(env, newScenario, activeWeekDate);
    };

    const handlePrevWeek = async () => {
        if (!snapshot) return;
        const date = new Date(snapshot.weekStart + "T00:00:00");
        date.setDate(date.getDate() - 7);
        const prevWeekStr = date.toISOString().slice(0, 10);
        
        setActiveWeekDate(prevWeekStr);
        plugin.settings.activeWeekDate = prevWeekStr;
        await plugin.saveSettings();
        await plugin.refreshDashboard();
        await loadData(env, activeScenario, prevWeekStr);
    };

    const handleNextWeek = async () => {
        if (!snapshot) return;
        const date = new Date(snapshot.weekStart + "T00:00:00");
        date.setDate(date.getDate() + 7);
        const nextWeekStr = date.toISOString().slice(0, 10);
        
        setActiveWeekDate(nextWeekStr);
        plugin.settings.activeWeekDate = nextWeekStr;
        await plugin.saveSettings();
        await plugin.refreshDashboard();
        await loadData(env, activeScenario, nextWeekStr);
    };

    const handleResetWeek = async () => {
        const currentWeekStr = "current";
        setActiveWeekDate(currentWeekStr);
        plugin.settings.activeWeekDate = currentWeekStr;
        await plugin.saveSettings();
        await plugin.refreshDashboard();
        await loadData(env, activeScenario, currentWeekStr);
    };

    const handleManualRefresh = async () => {
        await plugin.refreshDashboard(); // Run backend markdown updates
        await loadData(env, activeScenario, activeWeekDate); // Reload local state
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
        <div className="budget-dashboard-container" style={{ padding: 16, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", fontFamily: "var(--font-interface)" }}>
            {/* Header with Settings Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-normal)" }}>Budget Tracker</div>
                <div
                    onClick={toggleSettings}
                    style={{
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    title="Toggle Environment & Settings"
                    onMouseEnter={() => setIsSettingsHovered(true)}
                    onMouseLeave={() => setIsSettingsHovered(false)}
                >
                    <svg 
                        viewBox="0 0 24 24" 
                        width="14" 
                        height="14" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        fill="none" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        style={{ 
                            opacity: 0.6,
                            transition: "transform 0.4s ease",
                            transform: isSettingsHovered ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                    >
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                </div>
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

            {/* Week Navigation Selector */}
            {snapshot && (
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--background-secondary)",
                    border: "1px solid var(--background-modifier-border)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    marginBottom: "12px"
                }}>
                    <button
                        onClick={handlePrevWeek}
                        style={{
                            padding: "3px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            fontWeight: "bold"
                        }}
                    >
                        ◀ Prev
                    </button>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-normal)" }}>
                            {snapshot.weekStart} to {snapshot.weekEnd}
                        </span>
                        {activeWeekDate !== "current" && (
                            <span 
                                onClick={handleResetWeek}
                                style={{ 
                                    fontSize: "9px", 
                                    color: "var(--text-accent)", 
                                    cursor: "pointer", 
                                    textDecoration: "underline",
                                    marginTop: "2px"
                                }}
                            >
                                Reset to Current Week
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleNextWeek}
                        style={{
                            padding: "3px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            fontWeight: "bold"
                        }}
                    >
                        Next ▶
                    </button>
                </div>
            )}

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
                    {/* Premium Glassmorphic Total Spent & Balance Card */}
                    <div style={{
                        background: "linear-gradient(135deg, var(--background-secondary-alt) 0%, var(--background-secondary) 100%)",
                        border: "1px solid var(--background-modifier-border)",
                        padding: "18px 16px",
                        borderRadius: "10px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        marginBottom: "16px"
                    }}>
                        <div style={{ 
                            fontSize: "36px", 
                            fontWeight: "bold", 
                            color: "var(--text-normal)",
                            lineHeight: "1.1",
                            marginBottom: "2px"
                        }}>
                            ${snapshot.totalSpent.toFixed(2)}
                        </div>
                        <div style={{ 
                            fontSize: "11px", 
                            fontWeight: "600", 
                            color: "var(--text-muted)", 
                            textTransform: "uppercase", 
                            letterSpacing: "0.05em",
                            marginBottom: "14px"
                        }}>
                            Total Spent This Week
                        </div>
                        
                        {/* Compact Divider */}
                        <div style={{
                            height: "1px",
                            background: "var(--background-modifier-border)",
                            opacity: 0.4,
                            marginBottom: "12px"
                        }} />

                        {/* Balance & Inflow Row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "bold", opacity: 0.5, letterSpacing: "0.02em" }}>
                                    Starting Monday
                                </span>
                                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>
                                    ${snapshot.startingAmount.toFixed(2)}
                                </span>
                            </div>
                            
                            {/* Dynamic Balance Pill */}
                            <div style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end"
                            }}>
                                <span style={{ fontSize: "9px", textTransform: "uppercase", fontWeight: "bold", opacity: 0.5, marginBottom: "2px", letterSpacing: "0.02em" }}>
                                    Available
                                </span>
                                {(() => {
                                    const isUp = snapshot.availableBalance >= snapshot.startingAmount;
                                    return (
                                        <span style={{
                                            fontSize: "11px",
                                            fontWeight: "bold",
                                            padding: "3px 8px",
                                            borderRadius: "12px",
                                            background: isUp ? "rgba(46, 125, 50, 0.12)" : "rgba(237, 233, 145, 0.12)",
                                            color: isUp ? "var(--text-success)" : "#ede991",
                                            border: isUp ? "1px solid rgba(46, 125, 50, 0.25)" : "1px solid rgba(237, 233, 145, 0.25)",
                                            display: "inline-flex",
                                            alignItems: "center"
                                        }}>
                                            {isUp 
                                                ? `+$${snapshot.availableBalance.toFixed(2)} surplus` 
                                                : `$${snapshot.availableBalance.toFixed(2)} remaining`}
                                        </span>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Premium Segmented Tab Selector */}
                    <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--background-modifier-border)", paddingBottom: "12px", marginBottom: "16px" }}>
                        <button
                            onClick={() => setActiveTab("spending")}
                            style={{
                                padding: "6px 16px",
                                fontSize: "12px",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                background: activeTab === "spending" ? "var(--interactive-accent)" : "transparent",
                                color: activeTab === "spending" ? "white" : "var(--text-muted)",
                                fontWeight: "bold",
                                transition: "all 0.2s ease"
                            }}
                        >
                            Spending Tracker
                        </button>
                        <button
                            onClick={() => setActiveTab("analytics")}
                            style={{
                                padding: "6px 16px",
                                fontSize: "12px",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                background: activeTab === "analytics" ? "var(--interactive-accent)" : "transparent",
                                color: activeTab === "analytics" ? "white" : "var(--text-muted)",
                                fontWeight: "bold",
                                transition: "all 0.2s ease"
                            }}
                        >
                            Analytics & Tuning
                        </button>
                    </div>
                    
                    {activeTab === "spending" ? (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 0 12px 0" }}>
                                <h4 style={{ margin: 0 }}>By Category</h4>
                                <div style={{ display: "flex", gap: "4px", background: "var(--background-primary-alt)", padding: "2px", borderRadius: "6px" }}>
                                    <button 
                                        onClick={() => setViewMode("list")} 
                                        style={{ 
                                            padding: "4px 12px", 
                                            fontSize: "11px", 
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            background: viewMode === "list" ? "var(--interactive-accent)" : "transparent", 
                                            color: viewMode === "list" ? "white" : "var(--text-muted)",
                                            fontWeight: viewMode === "list" ? "bold" : "normal"
                                        }}
                                    >List</button>
                                    <button 
                                        onClick={() => setViewMode("map")} 
                                        style={{ 
                                            padding: "4px 12px", 
                                            fontSize: "11px", 
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            background: viewMode === "map" ? "var(--interactive-accent)" : "transparent", 
                                            color: viewMode === "map" ? "white" : "var(--text-muted)",
                                            fontWeight: viewMode === "map" ? "bold" : "normal"
                                        }}
                                    >Map</button>
                                </div>
                            </div>

                            {viewMode === "list" ? (
                                <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                                    {snapshot.buckets
                                        .filter((b) => b.category !== "Deposits" && !(config?.buckets[b.category]?.is_savings))
                                        .map((b) => (
                                            <li
                                                key={b.category}
                                                onClick={() => {
                                                    if (b.category === "Experiences") {
                                                        setExpandedExperiences(!expandedExperiences);
                                                    }
                                                }}
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    padding: "10px 0",
                                                    borderBottom: "1px solid var(--background-modifier-border)",
                                                    cursor: b.category === "Experiences" ? "pointer" : "default",
                                                    transition: "background 0.2s ease",
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (b.category === "Experiences") {
                                                        e.currentTarget.style.background = "var(--background-secondary-alt)";
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (b.category === "Experiences") {
                                                        e.currentTarget.style.background = "transparent";
                                                    }
                                                }}
                                            >
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                                                        {b.category}
                                                        {b.category === "Experiences" && (
                                                            <span style={{ 
                                                                fontSize: "8px", 
                                                                opacity: 0.5, 
                                                                transition: "transform 0.2s ease", 
                                                                transform: expandedExperiences ? "rotate(90deg)" : "rotate(0deg)",
                                                                display: "inline-block"
                                                            }}>▶</span>
                                                        )}
                                                    </span>
                                                    <span style={{ fontWeight: "bold", fontSize: "13px" }}>
                                                        ${b.total.toFixed(2)}
                                                        <span style={{ fontWeight: "normal", color: "var(--text-muted)", marginLeft: "4px" }}>
                                                            / ${(b.allocation + b.rolloverCushion).toFixed(2)}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px", fontSize: "10px", color: "var(--text-muted)" }}>
                                                    <span>{b.count} transaction{b.count === 1 ? "" : "s"}</span>
                                                    {b.rolloverCushion !== 0 && (
                                                        <span style={{ 
                                                            color: b.rolloverCushion > 0 ? "var(--text-success)" : "#ede991",
                                                            fontWeight: "600"
                                                        }}>
                                                            {b.rolloverCushion > 0 
                                                                ? `+$${b.rolloverCushion.toFixed(2)} rollover` 
                                                                : `-$${Math.abs(b.rolloverCushion).toFixed(2)} deficit carryover`}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Expandable sub-tags for Experiences */}
                                                {b.category === "Experiences" && expandedExperiences && (
                                                    <div style={{
                                                        marginTop: 10,
                                                        padding: "10px 12px",
                                                        background: "var(--background-primary)",
                                                        border: "1px solid var(--background-modifier-border)",
                                                        borderRadius: 8,
                                                        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        gap: 8
                                                    }}>
                                                        <div style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", opacity: 0.6, letterSpacing: "0.03em" }}>
                                                            Sub-Category Breakdown (#tags)
                                                        </div>
                                                        {(() => {
                                                            const breakdown = getExperiencesSubTagBreakdown(b.transactions, config || undefined);
                                                            return breakdown.map((item) => (
                                                                <div key={item.tag} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                                                                        <span style={{ fontWeight: 500 }}>{item.tag}</span>
                                                                        <span style={{ fontWeight: "bold" }}>
                                                                            ${item.total.toFixed(2)}
                                                                            <span style={{ color: "var(--text-muted)", marginLeft: 4, fontWeight: "normal" }}>
                                                                                ({item.percentage}%)
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                    {/* Progress bar container */}
                                                                    <div style={{ height: 4, background: "var(--background-secondary)", borderRadius: 2, overflow: "hidden" }}>
                                                                        <div style={{
                                                                            height: "100%",
                                                                            width: `${item.percentage}%`,
                                                                            background: item.tag === "World Cup" 
                                                                                ? "linear-gradient(90deg, #42a5f5, #29b6f6)"
                                                                                : item.tag === "Za & Wraps"
                                                                                ? "linear-gradient(90deg, #66bb6a, #9ccc65)"
                                                                                : item.tag === "Raves & Music"
                                                                                ? "linear-gradient(90deg, #ab47bc, #ec407a)"
                                                                                : "linear-gradient(90deg, var(--text-muted), #90a4ae)",
                                                                            borderRadius: 2
                                                                        }} />
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <div style={{ flex: 1, marginTop: "12px", display: "flex", flexDirection: "column" }}>
                                    <SolarSystemMap snapshot={snapshot} config={config} />
                                </div>
                            )}
                        </>
                    ) : (
                        /* Analytics & Recommendations Tab */
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <h4 style={{ margin: 0 }}>Habits & Recommendations</h4>
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", background: "var(--background-secondary)", padding: "2px 8px", borderRadius: "10px" }}>
                                    4-Week Horizon
                                </span>
                            </div>

                            {/* Recommendations Glowing Box */}
                            {(() => {
                                const analytics = calculateSpendingAnalytics(allTransactions, config || undefined, 4);
                                return (
                                    <>
                                        <div style={{
                                            background: "linear-gradient(135deg, rgba(var(--interactive-accent-rgb), 0.08) 0%, rgba(var(--background-secondary-alt-rgb), 0.15) 100%)",
                                            border: "1px solid var(--interactive-accent)",
                                            borderRadius: "10px",
                                            padding: "16px",
                                            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px"
                                        }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <span style={{ fontSize: "16px" }}>💡</span>
                                                <span style={{ fontWeight: "bold", fontSize: "13px", color: "var(--text-accent)" }}>Smart Budget Tuning Insights</span>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                {analytics.recommendations.map((rec, i) => (
                                                    <div 
                                                        key={i} 
                                                        style={{ 
                                                            fontSize: "12px", 
                                                            lineHeight: "1.4", 
                                                            color: "var(--text-normal)",
                                                            paddingLeft: "12px",
                                                            borderLeft: "2px solid var(--interactive-accent)"
                                                        }}
                                                        dangerouslySetInnerHTML={{ 
                                                            __html: rec
                                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                .replace(/⚠️/g, '<span style="color:#ede991">⚠️</span>')
                                                                .replace(/🎉/g, '<span style="color:var(--text-success)">🎉</span>')
                                                                .replace(/💡/g, '<span style="color:var(--text-accent)">💡</span>')
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Category Averages Section */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                            <h5 style={{ margin: "4px 0 8px 0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                                                Multi-Week Spending Averages
                                            </h5>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                {analytics.categoryAnalytics.map((item) => {
                                                    const isOver = item.isOverBudget;
                                                    const diffVal = Math.abs(item.difference);
                                                    const diffPercentVal = Math.abs(item.differencePercent);
                                                    
                                                    return (
                                                        <div 
                                                            key={item.category}
                                                            style={{
                                                                background: "var(--background-secondary)",
                                                                border: "1px solid var(--background-modifier-border)",
                                                                borderRadius: "8px",
                                                                padding: "12px",
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center"
                                                            }}
                                                        >
                                                            <div>
                                                                <div style={{ fontWeight: "bold", fontSize: "13px" }}>{item.category}</div>
                                                                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                                                    Target: ${item.targetAllocation.toFixed(2)}/wk • {item.swipeFrequency.toFixed(1)} swipes/wk
                                                                </div>
                                                            </div>
                                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                                                                <div style={{ fontWeight: "600", fontSize: "13px" }}>
                                                                    ${item.actualAverageSpend.toFixed(2)}/wk
                                                                </div>
                                                                <span style={{
                                                                    fontSize: "9px",
                                                                    fontWeight: "bold",
                                                                    padding: "2px 6px",
                                                                    borderRadius: "4px",
                                                                    marginTop: "4px",
                                                                    background: isOver ? "rgba(229, 101, 101, 0.12)" : "rgba(46, 125, 50, 0.12)",
                                                                    color: isOver ? "#e56565" : "var(--text-success)",
                                                                    border: isOver ? "1px solid rgba(229, 101, 101, 0.25)" : "1px solid rgba(46, 125, 50, 0.25)"
                                                                }}>
                                                                    {item.difference === 0 
                                                                        ? "On Target" 
                                                                        : `${isOver ? "+" : "-"}$${diffVal.toFixed(2)} (${diffPercentVal.toFixed(1)}%)`}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Experiences sub-tags deep dive */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                                            <h5 style={{ margin: "4px 0 8px 0", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
                                                Experiences Deep-Dive Trends (#tags)
                                            </h5>
                                            <div style={{
                                                background: "var(--background-secondary)",
                                                border: "1px solid var(--background-modifier-border)",
                                                borderRadius: "8px",
                                                padding: "12px",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "10px"
                                            }}>
                                                {analytics.experiencesBreakdown.map((item) => (
                                                    <div key={item.tag} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                                                            <span style={{ fontWeight: 500 }}>{item.tag}</span>
                                                            <span style={{ fontWeight: "bold" }}>
                                                                ${item.total.toFixed(2)}
                                                                <span style={{ color: "var(--text-muted)", marginLeft: "4px", fontWeight: "normal" }}>
                                                                    ({item.percentage}%)
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <div style={{ height: "4px", background: "var(--background-primary)", borderRadius: "2px", overflow: "hidden" }}>
                                                            <div style={{
                                                                height: "100%",
                                                                width: `${item.percentage}%`,
                                                                background: item.tag === "World Cup" 
                                                                    ? "linear-gradient(90deg, #42a5f5, #29b6f6)"
                                                                    : item.tag === "Za & Wraps"
                                                                    ? "linear-gradient(90deg, #66bb6a, #9ccc65)"
                                                                    : item.tag === "Raves & Music"
                                                                    ? "linear-gradient(90deg, #ab47bc, #ec407a)"
                                                                    : "linear-gradient(90deg, var(--text-muted), #90a4ae)",
                                                                borderRadius: "2px"
                                                            }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

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
