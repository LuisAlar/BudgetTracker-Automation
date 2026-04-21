# 03 - Dashboard Writer

## Location: `src/dashboardWriter.ts`

The Dashboard Writer handles the translation of raw math (`WeeklySnapshot`) into the final Markdown strings that Obsidian displays directly in your vault UI.

### Current Implementation
- `renderDashboardMarkdown(snapshot)` utilizes simple string array pushing (`lines.push`) to build standard Markdown tables and lists.
- `updateLiveDashboard(vault, snapshot)` uses the `vault.modify` or `vault.create` API to physically save that Markdown string over the `Current Weekly Spending.md` file.

### Future Expansion: Custom UI
You mentioned expanding this component from a basic "text file generator" to a custom UI. 

Obsidian Markdown notes can render HTML natively, or use codeblock interceptors. 
When you want to expand this:
1. **Interactive HTML Components:** Instead of rendering `| Table |`, your `renderDashboardMarkdown` can output `<div class="budget-card">...</div>` which can be beautifully styled by your `styles.css`.
2. **Code Blocks:** You can output a custom code block:
   ```budget-summary
     {"total": 500}
   ```
   And then have your `main.ts` register a Markdown Post Processor that intercepts `budget-summary` and renders an extremely advanced, interactive React chart *inside* the markdown file instead of just text!

### Golden Rule
The Writer should never parse money or calculate totals. That is `dataService.ts`'s job. The Writer only formats and outputs.
