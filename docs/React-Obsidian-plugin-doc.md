Creating an Obsidian Plugin with React
This guide outlines the standard, modern approach to building Obsidian plugins using React. It is generalized so you can reference it for future projects, but specifically references your Budget Tracker plugin for context.

Prerequisites
Node.js installed on your machine
Basic knowledge of React and TypeScript
An existing Obsidian Vault for testing
1. Setup the Template
Obsidian uses a standard build pipeline (typically with esbuild). The easiest way to get started is by using the official sample template.

Run the following in your workspace:

bash
# Clone the official sample
git clone https://github.com/obsidianmd/obsidian-sample-plugin.git obsidian-budget-plugin
cd obsidian-budget-plugin
# Install baseline dependencies
npm install
2. Install React Dependencies
You need React and React DOM, along with their TypeScript definitions:

bash
npm install react react-dom
npm install -D @types/react @types/react-dom
3. Configure TypeScript for JSX
You need to instruct TypeScript to compile React's JSX syntax. Open tsconfig.json and add/modify these properties inside "compilerOptions":

json
{
  "compilerOptions": {
    "jsx": "react",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
    // ... leave other existing options intact
  }
}
4. Build Your React Component
Create a new file called BudgetDashboard.tsx (the .tsx extension is crucial!).

tsx
import React, { useState } from "react";
export const BudgetDashboard = () => {
  const [synced, setSynced] = useState(false);
  return (
    <div style={{ padding: "10px" }}>
      <h2>Budget Dashboard</h2>
      <p>Data Status: {synced ? "Synced!" : "Pending..."}</p>
      <button onClick={() => setSynced(true)}>Sync with Box Data</button>
    </div>
  );
};
5. Mount React inside an Obsidian View
Obsidian's user interface is built using Vanilla JS/TypeScript. To use React, you must define an Obsidian ItemView (which represents a tab or pane) and "mount" your React component into its DOM node.

Create a file called BudgetView.tsx:

tsx
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
    // containerEl represents the wrapper. children[1] targets the inner content node.
    const container = this.containerEl.children[1];
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
6. Register the View in Your Plugin
Finally, wire everything up in the main entry point (main.ts):

ts
import { Plugin } from "obsidian";
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
  // Helper method to open the view safely
  async activateView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_BUDGET)[0];
    if (!leaf) {
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
         await rightLeaf.setViewState({ type: VIEW_TYPE_BUDGET, active: true });
      }
    }
    
    workspace.revealLeaf(
      workspace.getLeavesOfType(VIEW_TYPE_BUDGET)[0]
    );
  }
}
7. Workflow: Building and Testing
Configure your manifest.json to have an ID of obsidian-budget-plugin.
Ensure npm run dev builds the project output (main.js, styles.css, manifest.json).
You can configure your build tool (or just manually copy) to drop these files into your vault's plugin directory: <Your Box Vault Path>\.obsidian\plugins\obsidian-budget-plugin\
Open your Obsidian Vault, go to Settings > Community Plugins, disable "Safe Mode" and enable your new plugin.
TIP

Use the Hot Reload Plugin in Obsidian to automatically refresh your React plugin every time you save a .tsx file during development!