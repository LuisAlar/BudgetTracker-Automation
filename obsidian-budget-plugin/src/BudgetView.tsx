import { ItemView, WorkspaceLeaf } from "obsidian";
import * as React from "react";
import { createRoot, Root } from "react-dom/client";
import { BudgetDashboard } from "./BudgetDashboard";

export const VIEW_TYPE_BUDGET = "budget-dashboard-view";

export class BudgetView extends ItemView {
    root: Root | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_BUDGET;
    }

    getDisplayText() {
        return "Budget Dashboard"; // The title on the tab
    }

    async onOpen() {
        const container = this.contentEl;
        container.empty();

        // Create a React root and render our component into it
        this.root = createRoot(container);
        this.root.render(
            <React.StrictMode>
                <BudgetDashboard />
            </React.StrictMode>
        );
    }

    async onClose() {
        // Unmount React when the pane is closed to prevent memory leaks
        this.root?.unmount();
    }
}
