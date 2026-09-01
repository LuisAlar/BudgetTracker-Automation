import React from "react";
import { WeeklySnapshot } from "../models";
import { BucketStar } from "./BucketStar";
import { BudgetConfig } from "./dataService";

interface SolarSystemMapProps {
    snapshot: WeeklySnapshot;
    config?: BudgetConfig | null;
}

export const SolarSystemMap: React.FC<SolarSystemMapProps> = ({ snapshot, config }) => {
    // Filter out the Deposits bucket and any savings buckets from the map view
    const bucketsToMap = snapshot.buckets.filter(b => {
        if (b.category === "Deposits") return false;
        const bucketCfg = config?.buckets[b.category];
        return bucketCfg ? !bucketCfg.is_savings : true;
    });

    return (
        <div style={{
            background: "#1e1e24", // Dark space-like background
            borderRadius: "12px",
            padding: "24px",
            minHeight: "400px",
            display: "flex",
            flexWrap: "wrap",
            gap: "40px",
            justifyContent: "center",
            alignItems: "center",
            border: "1px solid var(--background-modifier-border)",
            boxShadow: "inset 0 4px 12px rgba(0,0,0,0.2)"
        }}>
            {bucketsToMap.length === 0 ? (
                <div style={{ color: "var(--text-muted)" }}>No buckets found in this galaxy.</div>
            ) : (
                bucketsToMap.map((bucket, index) => (
                    <BucketStar key={bucket.category || index} bucket={bucket} />
                ))
            )}
        </div>
    );
};

