import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { BudgetView, VIEW_TYPE_BUDGET } from "./BudgetView";
import { loadTransactions, buildWeeklySnapshot } from "./dataService";
import { updateLiveDashboard, updateAllTransactionsDashboard } from "./dashboardWriter";
import { BudgetPluginSettings, DEFAULT_SETTINGS, resolveDataFolder } from "./models";

export default class BudgetPlugin extends Plugin {
	settings: BudgetPluginSettings;

	async onload() {
		await this.loadSettings();

		// Register the custom view
		this.registerView(
			VIEW_TYPE_BUDGET,
			(leaf) => new BudgetView(leaf, this)
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

		// Auto-refresh when any JSON file in the active folder is created, modified, or deleted
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile && file.extension === "json" && this.isDataFile(file.path)) {
					console.log(`[BudgetTracker] New file detected in active scope: ${file.path}`);
					this.refreshDashboard();
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === "json" && this.isDataFile(file.path)) {
					console.log(`[BudgetTracker] File modified in active scope: ${file.path}`);
					this.refreshDashboard();
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile && file.extension === "json" && this.isDataFile(file.path)) {
					console.log(`[BudgetTracker] File deleted in active scope: ${file.path}`);
					this.refreshDashboard();
				}
			})
		);

		// On startup, do an initial refresh
		this.app.workspace.onLayoutReady(() => {
			this.refreshDashboard();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/** Helper to determine if a JSON file belongs to the active environment and scenario data folder. */
	isDataFile(filePath: string): boolean {
		if (this.settings.environment === "production") {
			return filePath.startsWith("data/raw/") && !filePath.includes("/scenarios/");
		} else {
			const scenario = this.settings.activeScenario;
			if (scenario === "none") {
				return filePath.startsWith("data/raw_test/") && !filePath.includes("/scenarios/");
			} else {
				return filePath.startsWith(`data/raw_test/scenarios/${scenario}/`);
			}
		}
	}

	/** Dynamically scan the vault for subfolders under data/raw_test/scenarios/ to find active scenarios. */
	async scanScenarios(): Promise<string[]> {
		const scenarioPath = "data/raw_test/scenarios";
		try {
			const exists = await this.app.vault.adapter.exists(scenarioPath);
			if (!exists) {
				return [];
			}
			const listResult = await this.app.vault.adapter.list(scenarioPath);
			// Extract folder names from their paths (e.g. data/raw_test/scenarios/double_billing -> double_billing)
			return listResult.folders.map(folderPath => {
				const parts = folderPath.split(/[/\\]/);
				const lastPart = parts[parts.length - 1];
				return lastPart || "";
			}).filter(name => name.length > 0);
		} catch (e) {
			console.error("[BudgetTracker] Failed to scan scenarios:", e);
			return [];
		}
	}

	/** Reads all transaction data and updates the Live Dashboard .md file. */
	async refreshDashboard() {
		try {
			const folderPath = resolveDataFolder(this.settings);
			const transactions = await loadTransactions(this.app.vault, folderPath);
			const snapshot = buildWeeklySnapshot(transactions);
			await updateLiveDashboard(this.app.vault, snapshot, this.settings);
			await updateAllTransactionsDashboard(this.app.vault, transactions, this.settings);
			console.log(`[BudgetTracker] Dashboards refreshed: ${transactions.length} transactions total.`);
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
