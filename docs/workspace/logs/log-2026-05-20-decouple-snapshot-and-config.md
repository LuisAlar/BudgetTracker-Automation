# Change Log: Decouple Snapshot Calculations and Relocate Config

## Overview
We successfully executed two major improvements based on the new user notes:
1. **Relocated `budget_config.json`**: Moved it from a temporary path inside the workspace's todo directory to the root of the active Obsidian Vault (`budget_config.json`). We updated the plugin's loading logic in `dataService.ts` to fetch it from the root.
2. **Decoupled Snapshot Calculations**: Completely refactored the ~200 lines `buildWeeklySnapshot` function in `dataService.ts`. We isolated the complex sub-phases of the chronological weekly simulation into pure, modular, reusable, and testable helper functions:
   - `filterTransactionsForWeek`: Handles chronological filtering and splitting into expenses vs deposits.
   - `groupExpensesByCategory`: Groups expenses and calculates category totals.
   - `buildBuckets`: Allocates bucket balances, rollover cushions, and sorts the results.
   - `calculateNextCushions`: Processes roll-overs, sweeps, and deficits to propagate cushions into the next week.

---

## Detailed Changes

### 1. Relocate Config File
- Moved the active configuration file:
  - From: `docs/workspace/todo/budget_config.json`
  - To: `budget_config.json` (Vault/Workspace Root)
- Deleted the temporary note and file from `docs/workspace/todo/`.

### 2. Plugin Code Refactoring
#### [dataService.ts](file:///c:/Users/alarc/Developer/Workspace/BudgetAutomationCode/obsidian-budget-plugin/src/dataService.ts)
- **`loadBudgetConfig`**: Changed the loaded path from `"docs/workspace/todo/budget_config.json"` to `"budget_config.json"`.
- **`filterTransactionsForWeek` (New Helper)**: Filters transactions for a given week and splits them by category.
- **`groupExpensesByCategory` (New Helper)**: Groups expenses by category and tracks total spent.
- **`buildBuckets` (New Helper)**: Takes configuration, grouped expenses, deposits, and category cushions to construct a list of active `BucketSummary` objects.
- **`calculateNextCushions` (New Helper)**: Analyzes leftover amounts and applies rollover/sweep rules or deficits to generate subsequent cushions.
- **`buildWeeklySnapshot`**: Streamlined the core weekly loop by sequentially calling the extracted helper functions, dramatically improving readability and reducing code size in the main routine.

---

## Verification

We ran `npm run build` within `obsidian-budget-plugin/` and successfully built the plugin:

```bash
> tsc -noEmit -skipLibCheck && node esbuild.config.mjs production

✅ Auto-synced to Vault
```

All tests and types verified perfectly, resulting in a successful esbuild production compilation.
