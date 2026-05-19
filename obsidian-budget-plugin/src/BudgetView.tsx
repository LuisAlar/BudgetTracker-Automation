import { ItemView, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { BudgetDashboard } from "./BudgetDashboard";
import BudgetPlugin from "./main";

export const VIEW_TYPE_BUDGET = "budget-dashboard-view";

export class BudgetView extends ItemView {
    root: Root | null = null;
    plugin: BudgetPlugin;

    constructor(leaf: WorkspaceLeaf, plugin: BudgetPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_BUDGET;
    }

    getDisplayText() {
        return "Budget Dashboard";
    }

    async onOpen() {
        const container = this.contentEl;
        container.empty();

        this.root = createRoot(container);
        this.root.render(
            <React.StrictMode>
                <BudgetDashboard app={this.app} plugin={this.plugin} />
            </React.StrictMode>
        );
    }

    async onClose() {
        this.root?.unmount();
    }
}
