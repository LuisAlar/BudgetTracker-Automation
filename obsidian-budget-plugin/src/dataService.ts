import { Vault, TFile } from "obsidian";
import { Transaction, BucketSummary, WeeklySnapshot } from "./models";

// ─── Configuration ───────────────────────────────────────────
const DATA_FOLDER = "data/raw";

// ─── File Reader ─────────────────────────────────────────────

/**
 * Reads all .json files from the  folder in the vault
 * and parses them into Transaction objects.
 */
export async function loadTransactions(vault: Vault): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    const allFiles = vault.getFiles();
    const files = allFiles.filter(
        (f: TFile) => f.path.startsWith(DATA_FOLDER + "/") && f.extension === "json"
    );

    console.log(`[BudgetTracker] All vault files: ${allFiles.length}`);
    console.log(`[BudgetTracker] JSON files in "${DATA_FOLDER}/": ${files.length}`);
    if (files.length === 0) {
        console.log(`[BudgetTracker] No files found. Sample paths:`, allFiles.slice(0, 10).map(f => f.path));
    }

    for (const file of files) {
        try {
            const raw = await vault.read(file);
            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) {
                transactions.push(...parsed);
            } else {
                transactions.push(parsed);
            }
        } catch (e) {
            console.warn(`[BudgetTracker] Failed to parse ${file.path}:`, e);
        }
    }

    console.log(`[BudgetTracker] Loaded ${transactions.length} transactions total`);
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
