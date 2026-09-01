import { Vault, TFile } from "obsidian";
import { WeeklySnapshot, Transaction, BudgetPluginSettings } from "../models";

// ─── Configuration ───────────────────────────────────────────
const PROD_DASHBOARD_PATH = "Dashboard/Current Weekly Spending.md";
const PROD_ALL_TX_DASHBOARD_PATH = "Dashboard/All Transactions.md";
const TEST_DASHBOARD_PATH = "Dashboard/TEST Weekly Spending.md";
const TEST_ALL_TX_DASHBOARD_PATH = "Dashboard/TEST All Transactions.md";

/**
 * Ensures that the parent directory of a given file path exists inside the vault.
 */
async function ensureParentFolderExists(vault: Vault, filePath: string): Promise<void> {
    const lastSlash = filePath.lastIndexOf("/");
    if (lastSlash === -1) return;
    const folderPath = filePath.substring(0, lastSlash);
    if (folderPath && !(await vault.adapter.exists(folderPath))) {
        await vault.createFolder(folderPath);
    }
}

/**
 * Generates clean Markdown content from a WeeklySnapshot
 * and writes (or overwrites) the Live Dashboard file.
 */
export async function updateLiveDashboard(
    vault: Vault,
    snapshot: WeeklySnapshot,
    settings?: BudgetPluginSettings
): Promise<void> {
    const isTesting = settings?.environment === "testing";
    const targetPath = isTesting ? TEST_DASHBOARD_PATH : PROD_DASHBOARD_PATH;
    const content = renderDashboardMarkdown(snapshot, isTesting);

    await ensureParentFolderExists(vault, targetPath);

    const existing = vault.getAbstractFileByPath(targetPath);
    if (existing && existing instanceof TFile) {
        await vault.modify(existing, content);
    } else {
        await vault.create(targetPath, content);
    }
}

/**
 * Generates an "All Transactions" Markdown page
 * and writes or overwrites the debug dashboard file.
 */
export async function updateAllTransactionsDashboard(
    vault: Vault,
    transactions: Transaction[],
    settings?: BudgetPluginSettings
): Promise<void> {
    const isTesting = settings?.environment === "testing";
    const targetPath = isTesting ? TEST_ALL_TX_DASHBOARD_PATH : PROD_ALL_TX_DASHBOARD_PATH;
    const content = renderAllTransactionsMarkdown(transactions, isTesting);

    await ensureParentFolderExists(vault, targetPath);

    const existing = vault.getAbstractFileByPath(targetPath);
    if (existing && existing instanceof TFile) {
        await vault.modify(existing, content);
    } else {
        await vault.create(targetPath, content);
    }
}

/**
 * Pure function: converts a list of all transactions into a formatted
 * Markdown string containing category totals and full list.
 */
function renderAllTransactionsMarkdown(transactions: Transaction[], isTesting = false): string {
    const lines: string[] = [];

    lines.push(isTesting ? `# All Transactions (TEST Debug Dashboard)` : `# All Transactions (Debug Dashboard)`);
    
    if (isTesting) {
        lines.push(`> [!WARNING]`);
        lines.push(`> **TEST ENVIRONMENT ACTIVE**: This dashboard displays mock transactions loaded from the simulated test suite.`);
        lines.push(``);
    }
    
    lines.push(`_This dashboard displays all successfully parsed JSON transactions on disk without any date filtering._`);
    lines.push(``);

    const expenses = transactions.filter((tx) => tx.category !== "Deposits");
    const deposits = transactions.filter((tx) => tx.category === "Deposits");
    
    const totalSpent = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const totalDeposited = deposits.reduce((sum, tx) => sum + tx.amount, 0);
    const netAllTime = totalDeposited - totalSpent;

    lines.push(`> [!NOTE]`);
    lines.push(`> ### Cumulative Spending & Balance (All-Time)`);
    lines.push(`> * **Total Transactions**: ${transactions.length}`);
    lines.push(`> * **Total Spent**: **$${totalSpent.toFixed(2)}**`);
    lines.push(`> * **Starting Deposits**: **+$${totalDeposited.toFixed(2)}**`);
    const netAllTimeSign = netAllTime >= 0 ? "+" : "-";
    lines.push(`> * **Net Balance**: **${netAllTimeSign}$${Math.abs(netAllTime).toFixed(2)}**`);
    lines.push(``);

    if (transactions.length === 0) {
        lines.push(`_No transactions found in the raw data folder._`);
        return lines.join("\n");
    }

    // ── Category Breakdown ──
    const categoryMap = new Map<string, { total: number; count: number }>();
    for (const tx of transactions) {
        if (tx.category === "Deposits") continue; // Exclude deposits from spending breakdown
        const cat = tx.category || "Spontaneous";
        const current = categoryMap.get(cat) || { total: 0, count: 0 };
        categoryMap.set(cat, {
            total: current.total + tx.amount,
            count: current.count + 1,
        });
    }

    const categories = Array.from(categoryMap.entries()).sort((a, b) => b[1].total - a[1].total);

    lines.push(`## All-Time Spending by Category`);
    lines.push(``);
    lines.push(`| Category | Cumulative Spent | Transaction Count |`);
    lines.push(`|----------|-----------------:|:-----------------:|`);
    for (const [cat, summary] of categories) {
        lines.push(`| ${cat} | $${summary.total.toFixed(2)} | ${summary.count} |`);
    }
    lines.push(``);

    // ── Transaction History Table ──
    lines.push(`## Complete Transaction History`);
    lines.push(``);
    lines.push(`| Date | Merchant | Amount | Category | ID |`);
    lines.push(`|------|----------|--------|----------|----|`);

    const sortedTxs = [...transactions].sort(
        (a, b) => new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime()
    );

    for (const tx of sortedTxs) {
        const dateStr = new Date(tx.date_logged).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        const isDeposit = tx.category === "Deposits";
        const prefix = isDeposit ? "+" : "-";
        const amtStr = `**${prefix}$${tx.amount.toFixed(2)}**`;
        lines.push(
            `| ${dateStr} | **${tx.merchant}** | ${amtStr} | _${tx.category}_ | \`${tx.transaction_id}\` |`
        );
    }

    lines.push(``);
    lines.push(`---`);
    lines.push(`*Last updated: ${new Date().toLocaleString()}*`);

    return lines.join("\n");
}

/**
 * Pure function: converts a WeeklySnapshot into a formatted
 * Markdown string suitable for reading in Obsidian.
 */
function renderDashboardMarkdown(snapshot: WeeklySnapshot, isTesting = false): string {
    const lines: string[] = [];

    lines.push(isTesting ? `# Financial Balance (TEST)` : `# Financial Balance`);
    
    if (isTesting) {
        lines.push(`> [!WARNING]`);
        lines.push(`> **TEST ENVIRONMENT ACTIVE**: This dashboard displays mock transactions loaded from the simulated test suite.`);
        lines.push(``);
    }

    lines.push(`**Week of ${snapshot.weekStart} → ${snapshot.weekEnd}**`);
    lines.push(``);
    
    // Sleek Callout header in Markdown
    lines.push(`> [!NOTE]`);
    lines.push(`> ### Weekly Spending Summary`);
    lines.push(`> * **Total Spent**: **$${snapshot.totalSpent.toFixed(2)}**`);
    lines.push(`> * **Starting Monday**: **$${snapshot.startingAmount.toFixed(2)}**`);
    const balanceSign = snapshot.availableBalance >= snapshot.startingAmount ? "+" : "";
    lines.push(`> * **Available Balance**: **${balanceSign}$${snapshot.availableBalance.toFixed(2)}**`);
    lines.push(``);

    const spendingBuckets = snapshot.buckets.filter((b) => b.category !== "Deposits");

    if (spendingBuckets.length === 0) {
        lines.push(`_No spending transactions recorded this week._`);
        
        // Render deposit list if there are Zelle/BofA inflows
        const depositsBucket = snapshot.buckets.find((b) => b.category === "Deposits");
        if (depositsBucket && depositsBucket.transactions.length > 0) {
            lines.push(``);
            lines.push(`## Weekly Deposits`);
            lines.push(``);
            for (const tx of depositsBucket.transactions) {
                const date = new Date(tx.date_logged).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                });
                lines.push(`- **${tx.merchant}** — **+$${tx.amount.toFixed(2)}** — ${date}`);
            }
        }
        
        lines.push(``);
        lines.push(`---`);
        return lines.join("\n");
    }

    // ── Category Breakdown Table ──
    lines.push(`## Spending by Category`);
    lines.push(``);
    lines.push(`| Category | Spent | Allocation / Available | Rollover Cushion | # Transactions |`);
    lines.push(`|----------|------:|-----------------------:|-----------------:|:--------------:|`);

    for (const bucket of spendingBuckets) {
        const limitStr = `$${(bucket.allocation + bucket.rolloverCushion).toFixed(2)}`;
        const availStr = `$${bucket.available.toFixed(2)}`;
        
        let rolloverStr = `—`;
        if (bucket.rolloverCushion > 0) {
            rolloverStr = `+$${bucket.rolloverCushion.toFixed(2)}`;
        } else if (bucket.rolloverCushion < 0) {
            rolloverStr = `-$${Math.abs(bucket.rolloverCushion).toFixed(2)}`;
        }

        lines.push(
            `| ${bucket.category} | $${bucket.total.toFixed(2)} | ${limitStr} (avail: ${availStr}) | ${rolloverStr} | ${bucket.count} |`
        );
    }

    lines.push(``);

    // ── Recent Transactions List ──
    lines.push("## Recent Transactions");
    lines.push(``);

    const allTx = snapshot.buckets.flatMap((b) => b.transactions);
    allTx.sort(
        (a, b) =>
            new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime()
    );

    for (const tx of allTx.slice(0, 15)) {
        const date = new Date(tx.date_logged).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        const isDeposit = tx.category === "Deposits";
        const prefix = isDeposit ? "+" : "-";
        lines.push(
            `- **${tx.merchant}** — **${prefix}$${tx.amount.toFixed(2)}** _(${tx.category})_ — ${date}`
        );
    }

    lines.push(``);
    lines.push(`---`);

    return lines.join("\n");
}
