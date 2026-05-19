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

// ─── Aggregation ─────────────────────────────────────────────

/** Get the Monday 00:00 of the week containing the given date. */
function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Get the Sunday 23:59 of the week containing the given date. */
function getWeekEnd(weekStart: Date): Date {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
}

/**
 * Filters transactions to the current week and groups them
 * into category buckets, producing a WeeklySnapshot.
 */
export function buildWeeklySnapshot(transactions: Transaction[]): WeeklySnapshot {
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekEnd = getWeekEnd(weekStart);

    // Filter to current week
    const weekTx = transactions.filter((tx) => {
        const txDate = new Date(tx.date_logged);
        return txDate >= weekStart && txDate <= weekEnd;
    });

    // Group by category
    const bucketMap = new Map<string, Transaction[]>();
    for (const tx of weekTx) {
        const key = tx.category;
        if (!bucketMap.has(key)) {
            bucketMap.set(key, []);
        }
        bucketMap.get(key)!.push(tx);
    }

    const buckets: BucketSummary[] = [];
    for (const [category, txs] of bucketMap) {
        buckets.push({
            category,
            total: txs.reduce((sum, tx) => sum + tx.amount, 0),
            count: txs.length,
            transactions: txs,
        });
    }

    // Sort buckets by total spent descending
    buckets.sort((a, b) => b.total - a.total);

    return {
        weekStart: weekStart.toISOString().slice(0, 10),
        weekEnd: weekEnd.toISOString().slice(0, 10),
        totalSpent: weekTx.reduce((sum, tx) => sum + tx.amount, 0),
        buckets,
    };
}
