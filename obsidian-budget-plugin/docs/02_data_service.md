# 02 - Data Service Engine

## Location: `src/dataService.ts` & `src/models.ts`

The Data Service is explicitly responsible for reading the file system (Vault API) and computing all mathematical metrics required by the budget tracker. 

### Why keep this separate?
By keeping math isolated from the React UI and the Markdown generator, you can test complex algorithms without breaking your UI. 

### Core Responsibilities
1. **`loadTransactions(vault)`**:
   - Locates the `data/raw` folder.
   - Wraps the Obsidian `vault.read()` API to open the JSON drops safely.
   - Pushes flat arrays of `Transaction` interfaces.
2. **`buildWeeklySnapshot(transactions)`**:
   - Provides grouping algorithms. Takes raw transactions and transforms them into bucket summaries (e.g., "$95 spent on Groceries across 4 transactions").
   - Uses native `Date` functions to bound the transactions within the Monday-Sunday week.

### Future Expansion Guide
When you are ready to expand (for example, creating a "Monthly Report"):
1. Open `models.ts` and define `export interface MonthlySnapshot { ... }`.
2. Open `dataService.ts` and write `export function buildMonthlySnapshot(transactions: Transaction[]): MonthlySnapshot { ... }`.
3. Pass that new snapshot to your Writer or your Control Panel!
4. **Calculations for Simulations**: Add them here. E.g., `calculateRunway(snapshot, simulatedExpenses)`, then send the result array to a new visual UI.
