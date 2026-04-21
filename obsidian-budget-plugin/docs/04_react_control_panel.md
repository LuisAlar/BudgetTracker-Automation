# 04 - React Control Panel

## Location: `src/BudgetView.tsx` & `src/BudgetDashboard.tsx`

This section of the code represents the right-sidebar "Control Panel".

### `BudgetView.tsx` (The Wrapper)
Obsidian is built via vanilla DOM (not React). The `BudgetView.ts` class extends Obsidian's native `ItemView`.
1. It registers an empty `div` (via `this.contentEl`).
2. Inside `onOpen()`, it creates a React root and mounts our `<BudgetDashboard />` natively into Obsidian.

### `BudgetDashboard.tsx` (The App)
This is a standard React component. Because we passed down the `app` prop (`<BudgetDashboard app={this.app} />`), this component can access the entirety of Obsidian's APIs.

#### Features
- **State Management**: Uses `useState` to hold the `WeeklySnapshot`.
- **Loading Loop**: On mount, it calls the `loadTransactions` engine function and updates the state.
- **Interactivity**: When a user clicks "Refresh", it re-queries the vault without needing to reload the plugin.

#### Expanding the Control Panel
When you're ready to build out your Simulation tools or specific archival reports:
1. Build a new React child component (e.g., `<SimulationRunner />` or `<HistoricalReports />`).
2. Import them into `BudgetDashboard.tsx`.
3. Give `BudgetDashboard` a tabbed navigation state (e.g., `const [activeTab, setActiveTab] = useState("Dashboard")`) to flip between your live metrics and your simulation tools.
