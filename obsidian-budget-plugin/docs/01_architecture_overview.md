# 01 - Architecture Overview

## The Goal
The **Budget Tracker Plugin** connects automated, external transaction data (from Power Automate/Azure) to an interactive, private Obsidian dashboard. It operates under a "Control Panel" paradigm where the plugin itself manages the parsing of data and automatically injects visualizations into your vault without you having to write the code yourself.

## Component Flow

1. **The Data Drops**: Raw transactions drop into `data/raw/*.json`. 
2. **The Plugin Entry (`main.ts`)**: 
   - Uses the Obsidian API to listen to folder changes. 
   - Wires up the React Sidebar Panel (`BudgetView`).
   - Hooks commands and triggers the background refresh automatically.
3. **The Data Layer (`dataService.ts` & `models.ts`)**: 
   - The engine. It reads the raw JSON text from the file system, parses it against the `Transaction` interface, and calculates the math (bucket summaries, totals).
4. **The UI Outputs**:
   - **Static Markdown Generator (`dashboardWriter.ts`)**: Takes the math from the Data Layer and formats it into clean, readable Markdown text inside a specific Obsidian note (`Current Weekly Spending.md`).
   - **React Control Panel (`BudgetDashboard.tsx`)**: Displays the data in real-time on your sidebar and provides actionable buttons (like refreshing or eventually running simulations).

## Principles for Scaling
- Keep the **Data Layer** separate from the **UI Elements**. If you invent a new formula to calculate runway, it should go into `dataService.ts`. 
- Only pass pure, calculated objects (like `WeeklySnapshot`) down to the Dashboard Writer and the React components.
