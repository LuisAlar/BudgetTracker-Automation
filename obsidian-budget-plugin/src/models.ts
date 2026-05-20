/**
 * Core data models for the Budget Tracker plugin.
 * These interfaces mirror the JSON structure produced by the
 * Azure Functions / Power Automate pipeline.
 */

/** A single parsed bank transaction. */
export interface Transaction {
    transaction_id: string;
    amount: number;
    merchant: string;
    category: string;
    date_logged: string; // ISO 8601 (e.g. "2026-04-07T16:53:44Z")
    notes: string;
}

/** Spending aggregated by category bucket. */
export interface BucketSummary {
    category: string;
    total: number; // Total spent this week
    count: number;
    allocation: number; // Configuration allocation (e.g. $125)
    rolloverCushion: number; // Carryover cushion from prior weeks (can be negative for deficit)
    available: number; // allocation + rolloverCushion - total
    transactions: Transaction[];
}

/** A full weekly snapshot used to render the Live Dashboard. */
export interface WeeklySnapshot {
    weekStart: string; // ISO date of Monday (YYYY-MM-DD)
    weekEnd: string;   // ISO date of Sunday (YYYY-MM-DD)
    startingAmount: number; // Starting balance on Monday (closing balance of previous week)
    totalSpent: number;
    totalDeposited: number;
    availableBalance: number; // startingAmount + totalDeposited - totalSpent
    buckets: BucketSummary[];
}

/** Plugin configuration and testing settings. */
export interface BudgetPluginSettings {
    environment: "production" | "testing";
    activeScenario: string; // "none" or subfolder name under data/raw_test/scenarios/
    prodDataFolder: string;
    testDataFolder: string;
    activeWeekDate: string; // YYYY-MM-DD of the week start we are currently viewing
}

export const DEFAULT_SETTINGS: BudgetPluginSettings = {
    environment: "production",
    activeScenario: "none",
    prodDataFolder: "data/raw",
    testDataFolder: "data/raw_test",
    activeWeekDate: "current" // "current" defaults to the calendar week, otherwise YYYY-MM-DD
};

/**
 * Pure utility function to map plugin settings to their active vault directory path.
 * This decouples environment constraints from business logic in dataService.ts.
 */
export function resolveDataFolder(settings: BudgetPluginSettings): string {
    if (settings.environment === "testing") {
        if (settings.activeScenario && settings.activeScenario !== "none") {
            return `data/raw_test/scenarios/${settings.activeScenario}`;
        }
        return settings.testDataFolder || "data/raw_test";
    }
    return settings.prodDataFolder || "data/raw";
}
