import { Vault, TFile } from "obsidian";
import { Transaction, BucketSummary, WeeklySnapshot } from "../models";

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

export interface BucketConfigItem {
    percentage: number | null;
    fixed_amount: number | null;
    is_savings?: boolean;
}

export interface RolloverRule {
    rollover_percent: number;
    sweep_target?: string;
    sweep_percent?: number;
    min_leftover_threshold?: number;
}

export interface BudgetConfig {
    weekly_income: number;
    initial_seed_balance: number;
    buckets: Record<string, BucketConfigItem>;
    rollover_rules: Record<string, RolloverRule>;
    experience_sub_tags?: Record<string, string[]>;
    // Runtime-derived absolute allocations for backward compatibility
    allocations: Record<string, number>;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
    weekly_income: 850.0,
    initial_seed_balance: 1900.0,
    buckets: {
        "Groceries": { percentage: 14.70588, fixed_amount: null, is_savings: false },
        "Gas": { percentage: 4.70588, fixed_amount: null, is_savings: false },
        "Subscriptions": { percentage: null, fixed_amount: 15.0, is_savings: false },
        "Experiences": { percentage: 15.29412, fixed_amount: null, is_savings: false },
        "District Savings": { percentage: 41.17647, fixed_amount: null, is_savings: true },
        "Simulated Housing": { percentage: null, fixed_amount: 190.0, is_savings: false }
    },
    rollover_rules: {
        "Experiences": {
            "rollover_percent": 50,
            "sweep_target": "District Savings",
            "sweep_percent": 50,
            "min_leftover_threshold": 10.0
        },
        "Gas": {
            "rollover_percent": 100,
            "min_leftover_threshold": 5.0
        },
        "Groceries": {
            "rollover_percent": 100,
            "min_leftover_threshold": 5.0
        },
        "District Savings": {
            "rollover_percent": 0
        },
        "Simulated Housing": {
            "rollover_percent": 0,
            "sweep_target": "District Savings",
            "sweep_percent": 100
        }
    },
    experience_sub_tags: {
        "World Cup": ["#worldcup", "#wc", "mexico", "game"],
        "Za & Wraps": ["#za", "#hemp", "wraps", "smoke"],
        "Raves & Music": ["#rave", "#music", "insomniac", "concert", "ticket"],
        "Dining Out & Spontaneous": []
    },
    allocations: {
        "Groceries": 125.0,
        "Gas": 40.0,
        "Subscriptions": 15.0,
        "Experiences": 130.0,
        "District Savings": 350.0,
        "Simulated Housing": 190.0
    }
};

/**
 * Dynamic allocations resolver: Computes absolute dollar allocations from percentages and fixed amounts.
 */
export function resolveAllocations(
    weeklyIncome: number,
    buckets: Record<string, BucketConfigItem>
): Record<string, number> {
    const allocations: Record<string, number> = {};
    for (const [name, item] of Object.entries(buckets)) {
        if (item.fixed_amount !== null && item.fixed_amount !== undefined) {
            allocations[name] = item.fixed_amount;
        } else if (item.percentage !== null && item.percentage !== undefined) {
            allocations[name] = Math.round(weeklyIncome * (item.percentage / 100) * 100) / 100;
        } else {
            allocations[name] = 0;
        }
    }
    return allocations;
}


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
            
            const weekly_income = typeof parsed.weekly_income === "number" ? parsed.weekly_income : 850.0;
            const buckets = parsed.buckets || DEFAULT_BUDGET_CONFIG.buckets;
            const allocations = resolveAllocations(weekly_income, buckets);
            
            return {
                weekly_income,
                initial_seed_balance: typeof parsed.initial_seed_balance === "number" ? parsed.initial_seed_balance : 1900.0,
                buckets,
                rollover_rules: parsed.rollover_rules || DEFAULT_BUDGET_CONFIG.rollover_rules,
                experience_sub_tags: parsed.experience_sub_tags || DEFAULT_BUDGET_CONFIG.experience_sub_tags,
                allocations
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
                const threshold = rule.min_leftover_threshold || 0;
                
                // Only trigger rollover/sweep if leftover is strictly greater than worth-it threshold
                if (leftover > threshold) {
                    const rollPercent = rule.rollover_percent;
                    const rollAmt = leftover * (rollPercent / 100);
                    nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + rollAmt;

                    if (rule.sweep_target && rule.sweep_percent) {
                        const sweepAmt = leftover * (rule.sweep_percent / 100);
                        const sweepTarget = rule.sweep_target;
                        nextCategoryCushions[sweepTarget] = (nextCategoryCushions[sweepTarget] || 0) + sweepAmt;
                    }
                } else {
                    // Leftover is below or equal to threshold: unspent money is saved but NOT rolled over. Next week's cushion is 0.
                    nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + 0;
                }
            } else {
                // Default rule: 100% rollover
                nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + leftover;
            }
        } else {
            // Deficit: 100% carried over as negative cushion (must pay it back, bypasses threshold!)
            nextCategoryCushions[cat] = (nextCategoryCushions[cat] || 0) + leftover;
        }
    }

    return nextCategoryCushions;
}

export interface SubTagBreakdown {
    tag: string;
    total: number;
    percentage: number;
    count: number;
}

/**
 * Categorizes a list of Transactions under the "Experiences" category into sub-tags on-the-fly.
 */
export function getExperiencesSubTagBreakdown(
    experiencesTxs: Transaction[],
    config: BudgetConfig = DEFAULT_BUDGET_CONFIG
): SubTagBreakdown[] {
    const rules = config.experience_sub_tags || DEFAULT_BUDGET_CONFIG.experience_sub_tags || {};
    const totals: Record<string, { total: number; count: number }> = {};
    
    // Initialize totals for all configured sub-tags
    for (const tag of Object.keys(rules)) {
        totals[tag] = { total: 0, count: 0 };
    }
    
    let totalSpent = 0;
    
    for (const tx of experiencesTxs) {
        totalSpent += tx.amount;
        let matched = false;
        
        // Scan note and merchant for matching keywords
        const scanText = `${tx.merchant} ${tx.notes}`.toLowerCase();
        
        for (const [tag, keywords] of Object.entries(rules)) {
            if (tag === "Dining Out & Spontaneous") continue;
            
            if (keywords.some(keyword => scanText.includes(keyword.toLowerCase()))) {
                if (!totals[tag]) {
                    totals[tag] = { total: 0, count: 0 };
                }
                totals[tag].total += tx.amount;
                totals[tag].count += 1;
                matched = true;
                break;
            }
        }
        
        if (!matched) {
            // Falls into "Dining Out & Spontaneous"
            const fallbackTag = "Dining Out & Spontaneous";
            if (!totals[fallbackTag]) {
                totals[fallbackTag] = { total: 0, count: 0 };
            }
            totals[fallbackTag].total += tx.amount;
            totals[fallbackTag].count += 1;
        }
    }
    
    // Convert to array and calculate percentages
    const breakdown: SubTagBreakdown[] = [];
    for (const [tag, info] of Object.entries(totals)) {
        breakdown.push({
            tag,
            total: info.total,
            percentage: totalSpent > 0 ? Math.round((info.total / totalSpent) * 1000) / 10 : 0,
            count: info.count
        });
    }
    
    // Sort so categories with spending come first, but default is at the end if it exists
    breakdown.sort((a, b) => {
        if (a.tag === "Dining Out & Spontaneous") return 1;
        if (b.tag === "Dining Out & Spontaneous") return -1;
        return b.total - a.total;
    });
    
    return breakdown;
}

export interface CategoryAnalyticItem {
    category: string;
    targetAllocation: number;
    actualAverageSpend: number;
    difference: number;
    differencePercent: number;
    swipeFrequency: number; // Avg number of transactions per week
    isOverBudget: boolean;
}

export interface SpendingAnalytics {
    totalWeeksAnalyzed: number;
    categoryAnalytics: CategoryAnalyticItem[];
    experiencesBreakdown: SubTagBreakdown[];
    recommendations: string[];
}

/**
 * Compiles spending habits and allocations trends over a given number of weeks.
 */
export function calculateSpendingAnalytics(
    transactions: Transaction[],
    config: BudgetConfig = DEFAULT_BUDGET_CONFIG,
    weeksToAnalyze: number = 4
): SpendingAnalytics {
    // 1. Filter out deposits
    const spendingTxs = transactions.filter(tx => tx.category !== "Deposits");
    
    // 2. Identify the date range of the transactions
    if (transactions.length === 0) {
        return {
            totalWeeksAnalyzed: 0,
            categoryAnalytics: [],
            experiencesBreakdown: [],
            recommendations: ["No transactions logged yet! Add some transactions to get analytics and recommendations."]
        };
    }
    
    // 3. Group transactions by category and calculate total spent in each
    const totalSpentPerCategory: Record<string, number> = {};
    const txCountPerCategory: Record<string, number> = {};
    
    // Get all experiences transactions across the history
    const experiencesTxs = spendingTxs.filter(tx => tx.category === "Experiences");
    const experiencesBreakdown = getExperiencesSubTagBreakdown(experiencesTxs, config);
    
    for (const tx of spendingTxs) {
        totalSpentPerCategory[tx.category] = (totalSpentPerCategory[tx.category] || 0) + tx.amount;
        txCountPerCategory[tx.category] = (txCountPerCategory[tx.category] || 0) + 1;
    }
    
    // 4. Compile category-level statistics
    const categoryAnalytics: CategoryAnalyticItem[] = [];
    const recommendations: string[] = [];
    
    // We only analyze non-savings categories for budget recommendations
    const activeCategories = Object.keys(config.allocations).filter(
        cat => {
            const bucket = config.buckets[cat];
            return bucket ? !bucket.is_savings : true;
        }
    );
    
    for (const cat of activeCategories) {
        const target = config.allocations[cat] || 0;
        const total = totalSpentPerCategory[cat] || 0;
        const avgSpend = Math.round((total / weeksToAnalyze) * 100) / 100;
        const diff = Math.round((avgSpend - target) * 100) / 100;
        const diffPct = target > 0 ? Math.round((diff / target) * 1000) / 10 : 0;
        const freq = Math.round(((txCountPerCategory[cat] || 0) / weeksToAnalyze) * 10) / 10;
        
        categoryAnalytics.push({
            category: cat,
            targetAllocation: target,
            actualAverageSpend: avgSpend,
            difference: diff,
            differencePercent: diffPct,
            swipeFrequency: freq,
            isOverBudget: diff > 0
        });
        
        // 5. Generate smart recommendations based on spending trends
        if (target > 0) {
            // Over budget by more than 10%
            if (diffPct > 10.0) {
                recommendations.push(
                    `⚠️ You are over-spending on **${cat}** by **+${diffPct}%** (average $${avgSpend.toFixed(2)} vs target $${target.toFixed(2)} per week). Consider increasing its allocation or reducing spend.`
                );
            }
            // Under budget by more than 15%
            else if (diffPct < -15.0) {
                const rescued = Math.abs(diff);
                recommendations.push(
                    `🎉 You consistently spend **${Math.abs(diffPct)}% less** than allocated on **${cat}** (saving about $${rescued.toFixed(2)}/week). You could safely reduce this allocation and move the surplus to savings or Experiences!`
                );
            }
        }
    }
    
    // Add an overall positive note if everything is well managed
    if (recommendations.length === 0) {
        recommendations.push(
            "🌟 Excellent work! Your spending in all categories is perfectly in line with your weekly targets."
        );
    } else {
        // Look for balance: suggest a potential swap
        const overspentCat = categoryAnalytics.find(item => item.differencePercent > 10.0);
        const underspentCat = categoryAnalytics.find(item => item.differencePercent < -15.0);
        if (overspentCat && underspentCat) {
            const shiftAmt = Math.min(Math.abs(underspentCat.difference), overspentCat.difference);
            recommendations.push(
                `💡 **Budget Tuning Idea**: Shift **$${shiftAmt.toFixed(0)}/week** from your under-utilized **${underspentCat.category}** bucket into your **${overspentCat.category}** bucket to balance your habits perfectly without changing your total spending limit!`
            );
        }
    }
    
    return {
        totalWeeksAnalyzed: weeksToAnalyze,
        categoryAnalytics,
        experiencesBreakdown,
        recommendations
    };
}

