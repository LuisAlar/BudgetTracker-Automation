import React, { useEffect, useState } from "react";
import { App } from "obsidian";
import { loadTransactions, buildWeeklySnapshot } from "./dataService";
import { WeeklySnapshot } from "./models";

interface BudgetDashboardProps {
    app: App;
}

export const BudgetDashboard: React.FC<BudgetDashboardProps> = ({ app }) => {
    const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        const txs = await loadTransactions(app.vault);
        const snap = buildWeeklySnapshot(txs);
        setSnapshot(snap);
        setLoading(false);
    };

    useEffect(() => {
        refresh();
    }, []);

    if (loading) {
        return <div style={{ padding: 16 }}>Loading transactions...</div>;
    }

    if (!snapshot || snapshot.buckets.length === 0) {
        return (
            <div style={{ padding: 16 }}>
                <h3>Budget Tracker</h3>
                <p>No transactions found for this week.</p>
                <button onClick={refresh}>↻ Refresh</button>
            </div>
        );
    }

    return (
        <div style={{ padding: 16 }}>
            <h3>Weekly Control Panel</h3>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
                {snapshot.weekStart} → {snapshot.weekEnd}
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

            <h4>By Category</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
                {snapshot.buckets.map((b) => (
                    <li
                        key={b.category}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "4px 0",
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
                onClick={refresh}
                style={{ marginTop: 12, width: "100%" }}
            >
                ↻ Refresh Data
            </button>
        </div>
    );
};
