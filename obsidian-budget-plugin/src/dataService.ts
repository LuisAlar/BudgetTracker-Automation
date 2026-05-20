import { Vault, TFile } from "obsidian";
import { Transaction, BucketSummary, WeeklySnapshot } from "./models";

/**
 * Reads all .json files from the resolved data folder in the vault directly from
 * the disk using the Vault adapter, and parses/normalizes them into Transaction objects.
 */
export async function loadTransactions(vault: Vault, dataFolder: string): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    
    try {
        const exists = await vault.adapter.exists(dataFolder);
        if (!exists) {
            console.log(`[BudgetTracker] Data folder "${dataFolder}" does not exist.`);
            return [];
        }

        const listResult = await vault.adapter.list(dataFolder);
        const jsonFiles = listResult.files.filter((path) => path.endsWith(".json"));

        console.log(`[BudgetTracker] JSON files in filesystem under "${dataFolder}/": ${jsonFiles.length}`);

        for (const filePath of jsonFiles) {
            try {
                const raw = await vault.adapter.read(filePath);
                const parsed = JSON.parse(raw);

                const rawTransactions = Array.isArray(parsed) ? parsed : [parsed];

                for (const rawTx of rawTransactions) {
                    // Normalize the date field (could be 'date' or 'date_logged')
                    const rawDate = rawTx.date_logged || rawTx.date;
                    if (!rawDate) {
                        console.warn(`[BudgetTracker] Missing date in transaction inside ${filePath}`);
                        continue;
                    }

                    // Gracefully parse date (handles ISO strings and natural dates like "May 16, 2026")
                    const parsedDate = new Date(rawDate);
                    if (isNaN(parsedDate.getTime())) {
                        console.warn(`[BudgetTracker] Invalid date format "${rawDate}" in ${filePath}`);
                        continue;
                    }

                    transactions.push({
                        transaction_id: rawTx.transaction_id || rawTx.id || Math.random().toString(36).substring(2, 11),
                        amount: typeof rawTx.amount === "number" ? rawTx.amount : parseFloat(rawTx.amount || "0"),
                        merchant: rawTx.merchant || "Unknown Merchant",
                        category: rawTx.category || "Spontaneous",
                        date_logged: parsedDate.toISOString(),
                        notes: rawTx.notes || ""
                    });
                }
            } catch (e) {
                console.warn(`[BudgetTracker] Failed to parse or read file ${filePath}:`, e);
            }
        }
    } catch (e) {
        console.error(`[BudgetTracker] Error listing or loading files from ${dataFolder}:`, e);
    }

    console.log(`[BudgetTracker] Loaded ${transactions.length} transactions total from ${dataFolder}`);
    return transactions;
}

// ─── Config & Aggregation Engine ─────────────────────────────

export interface BudgetConfig {
    initial_seed_balance: number;
    allocations: Record<string, number>;
    rollover_rules: Record<string, {
        rollover_percent: number;
        sweep_target?: string;
        sweep_percent?: number;
    }>;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
    initial_seed_balance: 1900.0,
    allocations: {
        "Groceries": 125.0,
        "Gas": 40.0,
        "Subscriptions": 15.0,
        "Experiences": 130.0,
        "Strict Savings": 350.0
    },
    rollover_rules: {
        "Experiences": {
            "rollover_percent": 50,
            "sweep_target": "Strict Savings",
            "sweep_percent": 50
        },
        "Gas": {
            "rollover_percent": 100
        },
        "Groceries": {
            "rollover_percent": 100
        }
    }
};

/**
 * Historical simulation engine: Computes snapshots week-by-week chronologically
 * to calculate Monday starting balances and rollover cushions, then returns
 * the WeeklySnapshot for the requested week.
 */
export function buildWeeklySnapshot(
    transactions: Transaction[],
    config: BudgetConfig = DEFAULT_BUDGET_CONFIG,
    targetDate: Date = new Date()
): WeeklySnapshot {
    // 1. Sort all transactions chronologically
    const sortedTxs = [...transactions].sort(
        (a, b) => new Date(a.date_logged).getTime() - new Date(b.date_logged).getTime()
    );

    // 2. Determine target week boundaries
    const targetWeekStart = getWeekStart(targetDate);
    const targetWeekEnd = getWeekEnd(targetWeekStart);

    // 3. Find the earliest Monday in history (or targetWeekStart if no transactions exist)
    let earliestDate = targetWeekStart;
    if (sortedTxs.length > 0) {
        const firstTx = sortedTxs[0];
        if (firstTx) {
            const firstTxDate = new Date(firstTx.date_logged);
            if (firstTxDate < targetWeekStart) {
                earliestDate = firstTxDate;
            }
        }
    }
    const currentWeekStart = getWeekStart(earliestDate);

    // 4. Initialize historical tracking variables
    let currentBalanceAccumulated = config.initial_seed_balance;
    
    // Category cushions track how much carryover cushion exists for each category
    const categoryCushions: Record<string, number> = {};
    for (const cat of Object.keys(config.allocations)) {
        categoryCushions[cat] = 0;
    }

    // 5. Loop week-by-week up to the target week
    const targetWeekStartStr = targetWeekStart.toISOString().slice(0, 10);
    let activeSnapshot: WeeklySnapshot | null = null;

    let loopCount = 0;
    const maxWeeks = 1000;

    while (currentWeekStart <= targetWeekStart && loopCount++ < maxWeeks) {
        const currentWeekEnd = getWeekEnd(currentWeekStart);
        const startStr = currentWeekStart.toISOString().slice(0, 10);
        const endStr = currentWeekEnd.toISOString().slice(0, 10);

        // Filter transactions for this week
        const { expenses, deposits } = filterTransactionsForWeek(sortedTxs, currentWeekStart, currentWeekEnd);

        const totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
        const totalDeposited = deposits.reduce((sum, tx) => sum + tx.amount, 0);

        // Group expenses by category
        const expensesByCategory = groupExpensesByCategory(expenses);

        // Build bucket summaries
        const buckets = buildBuckets(expensesByCategory, deposits, config, categoryCushions);

        // Compute starting and ending balances for this week
        const startingAmount = currentBalanceAccumulated;
        currentBalanceAccumulated = startingAmount + totalDeposited - totalSpent;

        const snapshot: WeeklySnapshot = {
            weekStart: startStr,
            weekEnd: endStr,
            startingAmount,
            totalSpent,
            totalDeposited,
            availableBalance: currentBalanceAccumulated,
            buckets
        };

        if (startStr === targetWeekStartStr) {
            activeSnapshot = snapshot;
        }

        // 6. Calculate category cushions for next week
        const nextCategoryCushions = calculateNextCushions(expensesByCategory, config, categoryCushions);

        // Reset and update cushions for next iteration
        for (const cat of Object.keys(categoryCushions)) {
            categoryCushions[cat] = 0;
        }
        for (const [cat, cushion] of Object.entries(nextCategoryCushions)) {
            categoryCushions[cat] = cushion;
        }

        // Advance to next Monday
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    // Return the active snapshot (or fallback to a blank one if not found)
    if (activeSnapshot) {
        return activeSnapshot;
    }

    return {
        weekStart: targetWeekStart.toISOString().slice(0, 10),
        weekEnd: targetWeekEnd.toISOString().slice(0, 10),
        startingAmount: currentBalanceAccumulated,
        totalSpent: 0,
        totalDeposited: 0,
        availableBalance: currentBalanceAccumulated,
        buckets: Object.entries(config.allocations).map(([cat, alloc]) => ({
            category: cat,
            total: 0,
            count: 0,
            allocation: alloc,
            rolloverCushion: categoryCushions[cat] || 0,
            available: alloc + (categoryCushions[cat] || 0),
            transactions: []
        }))
    };
}

/**
 * Loads budget_config.json from the active Obsidian vault, falling back to defaults if missing.
 */
export async function loadBudgetConfig(vault: Vault): Promise<BudgetConfig> {
    const configPath = "budget_config.json";
    try {
        const exists = await vault.adapter.exists(configPath);
        if (exists) {
            const raw = await vault.adapter.read(configPath);
            const parsed = JSON.parse(raw);
            return {
                initial_seed_balance: typeof parsed.initial_seed_balance === "number" ? parsed.initial_seed_balance : 1900.0,
                allocations: parsed.allocations || DEFAULT_BUDGET_CONFIG.allocations,
                rollover_rules: parsed.rollover_rules || DEFAULT_BUDGET_CONFIG.rollover_rules
            };
        }
    } catch (e) {
        console.warn(`[BudgetTracker] Failed to load budget_config.json, using defaults:`, e);
    }
    return DEFAULT_BUDGET_CONFIG;
}

/** Get the Monday 00:00 of the week containing the given date. */
export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Get the Sunday 23:59 of the week containing the given date. */
export function getWeekEnd(weekStart: Date): Date {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Filters transactions that occurred within a given week boundary and splits them into expenses and deposits.
 */
export function filterTransactionsForWeek(
    transactions: Transaction[],
    weekStart: Date,
    weekEnd: Date
): { expenses: Transaction[]; deposits: Transaction[] } {
    const weekTxs = transactions.filter((tx) => {
        const txDate = new Date(tx.date_logged);
        return txDate >= weekStart && txDate <= weekEnd;
    });

    const expenses = weekTxs.filter((tx) => tx.category !== "Deposits");
    const deposits = weekTxs.filter((tx) => tx.category === "Deposits");

    return { expenses, deposits };
}

/**
 * Groups a list of expense transactions by their category and computes total spent per category.
 */
export function groupExpensesByCategory(
    expenses: Transaction[]
): Record<string, { total: number; txs: Transaction[] }> {
    const expensesByCategory: Record<string, { total: number; txs: Transaction[] }> = {};
    for (const tx of expenses) {
        const cat = tx.category;
        if (!expensesByCategory[cat]) {
            expensesByCategory[cat] = { total: 0, txs: [] };
        }
        expensesByCategory[cat].total += tx.amount;
        expensesByCategory[cat].txs.push(tx);
    }
    return expensesByCategory;
}

/**
 * Builds the bucket summaries for a week, incorporating allocations, rollover cushions, and actual spending.
 */
export function buildBuckets(
    expensesByCategory: Record<string, { total: number; txs: Transaction[] }>,
    deposits: Transaction[],
    config: BudgetConfig,
    categoryCushions: Record<string, number>
): BucketSummary[] {
    const buckets: BucketSummary[] = [];
    
    // Ensure all configured categories have a bucket
    const allCategories = new Set([
        ...Object.keys(config.allocations),
        ...Object.keys(expensesByCategory)
    ]);

    for (const cat of allCategories) {
        if (cat === "Deposits") continue;

        const spentInfo = expensesByCategory[cat] || { total: 0, txs: [] };
        const allocation = config.allocations[cat] || 0;
        const rolloverCushion = categoryCushions[cat] || 0;
        const available = allocation + rolloverCushion - spentInfo.total;

        buckets.push({
            category: cat,
            total: spentInfo.total,
            count: spentInfo.txs.length,
            allocation,
            rolloverCushion,
            available,
            transactions: spentInfo.txs
        });
    }

    // Include deposits bucket if deposits were made
    if (deposits.length > 0) {
        const totalDeposited = deposits.reduce((sum, tx) => sum + tx.amount, 0);
        buckets.push({
            category: "Deposits",
            total: totalDeposited,
            count: deposits.length,
            allocation: 0,
            rolloverCushion: 0,
            available: totalDeposited,
            transactions: deposits
        });
    }

    // Sort buckets by total spent descending (with Deposits always at the end)
    buckets.sort((a, b) => {
        if (a.category === "Deposits") return 1;
        if (b.category === "Deposits") return -1;
        return b.total - a.total;
    });

    return buckets;
}

/**
 * Computes the cushions for the next week based on allocation, current cushions, expenses, and rollover rules.
 */
export function calculateNextCushions(
    expensesByCategory: Record<string, { total: number }>,
    config: BudgetConfig,
    currentCushions: Record<string, number>
): Record<string, number> {
    const nextCategoryCushions: Record<string, number> = {};
    const allCategories = new Set([
        ...Object.keys(config.allocations),
        ...Object.keys(expensesByCategory)
    ]);

    for (const cat of allCategories) {
        if (cat === "Deposits") continue;

        const spentInfo = expensesByCategory[cat] || { total: 0 };
        const allocation = config.allocations[cat] || 0;
        const cushion = currentCushions[cat] || 0;
        const leftover = allocation + cushion - spentInfo.total;

        if (leftover > 0) {
            // Apply rollover rules
            const rule = config.rollover_rules[cat];
            if (rule) {
                const rollPercent = rule.rollover_percent;
                const rollAmt = leftover * (rollPercent / 100);
                nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + rollAmt;

                if (rule.sweep_target && rule.sweep_percent) {
                    const sweepAmt = leftover * (rule.sweep_percent / 100);
                    const sweepTarget = rule.sweep_target;
                    nextCategoryCushions[sweepTarget] = (nextCategoryCushions[sweepTarget] || 0) + sweepAmt;
                }
            } else {
                // Default rule: 100% rollover
                nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + leftover;
            }
        } else {
            // Deficit: 100% carried over as negative cushion (must pay it back)
            nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + leftover;
        }
    }

    return nextCategoryCushions;
}
