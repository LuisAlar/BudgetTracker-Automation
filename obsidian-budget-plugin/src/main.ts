import { Plugin, WorkspaceLeaf } from 'obsidian';
import { BudgetView, VIEW_TYPE_BUDGET } from "./BudgetView";

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
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | undefined = undefined;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_BUDGET);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({ type: VIEW_TYPE_BUDGET, active: true });
				leaf = rightLeaf;
			}
		}

		if (leaf) {
			// "Reveal" the leaf in case it is in a collapsed sidebar
			workspace.revealLeaf(leaf);
		}
	}
}
