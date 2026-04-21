import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { BudgetView, VIEW_TYPE_BUDGET } from "./BudgetView";
import { loadTransactions, buildWeeklySnapshot } from "./dataService";
import { updateLiveDashboard } from "./dashboardWriter";

export default class BudgetPlugin extends Plugin {
	async onload() {
		// Register the custom view
		this.registerView(
			VIEW_TYPE_BUDGET,
			(leaf) => new BudgetView(leaf)
		);

		// Add a sidebar ribbon icon that opens your view
		this.addRibbonIcon('piggy-bank', 'Open Budget Dashboard', () => {
			this.activateView();
		});

		// Add a command to manually refresh the live dashboard
		this.addCommand({
			id: 'refresh-budget-dashboard',
			name: 'Refresh Live Dashboard',
			callback: () => this.refreshDashboard(),
		});

		// Auto-refresh when any JSON file in Data/ is created, modified, or deleted
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.path.startsWith("data/raw/") && file.extension === "json") {
					console.log(`[BudgetTracker] New file detected: ${file.path}`);
					this.refreshDashboard();
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.path.startsWith("data/raw/") && file.extension === "json") {
					console.log(`[BudgetTracker] File modified: ${file.path}`);
					this.refreshDashboard();
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.path.startsWith("data/raw/") && file.extension === "json") {
					console.log(`[BudgetTracker] File deleted: ${file.path}`);
					this.refreshDashboard();
				}
			})
		);

		// On startup, do an initial refresh
		this.app.workspace.onLayoutReady(() => {
			this.refreshDashboard();
		});
	}

	/** Reads all transaction data and updates the Live Dashboard .md file. */
	async refreshDashboard() {
		try {
			const transactions = await loadTransactions(this.app.vault);
			const snapshot = buildWeeklySnapshot(transactions);
			await updateLiveDashboard(this.app.vault, snapshot);
			console.log(`[BudgetTracker] Dashboard refreshed: ${transactions.length} transactions, $${snapshot.totalSpent.toFixed(2)} this week.`);
		} catch (e) {
			console.error("[BudgetTracker] Failed to refresh dashboard:", e);
		}
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | undefined = undefined;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_BUDGET);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: VIEW_TYPE_BUDGET, active: true });
				leaf = rightLeaf;
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}
