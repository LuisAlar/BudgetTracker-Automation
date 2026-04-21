import React, { useState } from "react";

export const BudgetDashboard = () => {
    const [synced, setSynced] = useState(false);

    return (
        <div style={{ padding: "10px" }}>
            <h2>Budget Dashboard</h2>
            <p>Data Status: {synced ? "Synced!" : "Pending..."}</p>
            <button onClick={() => setSynced(true)}>Sync with Box Data</button>
        </div>
    );
};
