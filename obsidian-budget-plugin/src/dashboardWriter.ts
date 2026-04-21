import { Vault, TFile } from "obsidian";
import { WeeklySnapshot } from "./models";

// ─── Configuration ───────────────────────────────────────────
const DASHBOARD_PATH = "Dashboard/Current Weekly Spending.md";

/**
 * Generates clean Markdown content from a WeeklySnapshot
 * and writes (or overwrites) the Live Dashboard file.
 */
export async function updateLiveDashboard(
    vault: Vault,
    snapshot: WeeklySnapshot
): Promise<void> {
    const content = renderDashboardMarkdown(snapshot);

    const existing = vault.getAbstractFileByPath(DASHBOARD_PATH);
    if (existing && existing instanceof TFile) {
        await vault.modify(existing, content);
    } else {
        // Ensure the Dashboard folder exists, then create the file
        await vault.create(DASHBOARD_PATH, content);
    }
}

/**
 * Pure function: converts a WeeklySnapshot into a formatted
 * Markdown string suitable for reading in Obsidian.
 */
function renderDashboardMarkdown(snapshot: WeeklySnapshot): string {
    const lines: string[] = [];

    lines.push(`# Spending`);
    lines.push(`**Week of ${snapshot.weekStart} → ${snapshot.weekEnd}**`);
    lines.push(``);
    lines.push(`> **Total Spent: $${snapshot.totalSpent.toFixed(2)}**`);
    lines.push(``);

    if (snapshot.buckets.length === 0) {
        lines.push(`_No transactions recorded this week._`);
        return lines.join("\n");
    }

    // ── Category Breakdown Table ──
    lines.push(`## Spending by Category`);
    lines.push(``);
    lines.push(`| Category | Spent | # Transactions |`);
    lines.push(`|----------|------:|:--------------:|`);

    for (const bucket of snapshot.buckets) {
        lines.push(
            `| ${bucket.category} | $${bucket.total.toFixed(2)} | ${bucket.count} |`
        );
    }

    lines.push(``);

    // ── Recent Transactions List ──
    lines.push(`## Recent Transactions`);
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
        lines.push(
            `- **${tx.merchant}** — $${tx.amount.toFixed(2)} _(${tx.category})_ — ${date}`
        );
    }

    lines.push(`---`);

    return lines.join("\n");
}
