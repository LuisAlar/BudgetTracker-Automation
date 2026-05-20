# Task: Update Available Amount Calculation & Color Logic

This document specifies the requirements and technical design for updating the **Available Balance** computation and dynamic color indicators.

---

## 🎯 Goal
Pivot how the available balance is calculated and color-coded:
1. **Starting Amount**: Represents the balance on Monday at the start of the week.
2. **Current Available Amount**: The current balance computed as:
   $$\text{Current Available} = \text{Starting Amount} + \text{Deposits This Week} - \text{Spent This Week}$$
3. **Interactive Colors**:
   - 🟡 **Pastel Yellow (`#ede991`)**: If the current available balance is **less than** the starting amount (indicating you spent money and the balance went down, e.g., started with \$1,900 and ended up with \$1,500).
   - 🟢 **Emerald Green**: If the current available balance is **greater than or equal to** the starting amount (indicating you made more money from paychecks/Zelle inflows than you spent, e.g., \$2,050 vs. \$1,900 starting).

---

## 📊 Logical Breakdown & Color Rules

| State | Formula | Color | Indicator / Text |
| :--- | :--- | :--- | :--- |
| **Down / Spent** | $\text{Current} < \text{Starting}$ | 🟡 Warm Yellow (`#ede991`) | E.g., `-$1,500.00 current` (represents net decline) |
| **Up / Earned** | $\text{Current} \ge \text{Starting}$ | 🟢 Emerald Green | E.g., `+$2,050.00 current` (represents net surplus) |

---

## 🛠️ Implementation Outline (For Tomorrow)

### 1. Data Layer (`dataService.ts` / `models.ts`)
* We need to define how the **Starting Amount** on Monday is determined:
  - Option A: Read a starting balance value from the vault configuration settings.
  - Option B: Carry over the closing balance of the previous week.
> carrying over the closing balance is going to be the choice for this . this is because we will also have a feature to transfer offer buckets left over "money" and go into other buckets for the next week. the percentages and location would be configured and managed  by me. for this to be tested i need the testing env to allow to simulate weeks to see if the carry over works and makes sense at a benifit level. would it allow me to save and districutre the purchace frequency? idk id like to know what benifit it would be to haveing this feature to carry over left over money that wasnt spent for taht bucket. 
*the goal to do this 
* Add `startingAmount` and `currentBalance` variables to the `WeeklySnapshot` model:
  ```typescript
  export interface WeeklySnapshot {
      weekStart: string;
      weekEnd: string;
      startingAmount: number;     // Monday's starting baseline
      totalSpent: number;         // Total spent this week
      totalDeposited: number;     // Total deposits this week
      currentBalance: number;     // startingAmount + totalDeposited - totalSpent
      buckets: BucketSummary[];
  }
  ```

### 2. UI Styling Logic (`BudgetDashboard.tsx`)
In the main spent card status row, render the pill dynamically based on the state comparison:

```tsx
const isUp = snapshot.currentBalance >= snapshot.startingAmount;

// ... Inside JSX:
<span style={{
    fontSize: "11px",
    fontWeight: "bold",
    padding: "3px 8px",
    borderRadius: "12px",
    background: isUp ? "rgba(46, 125, 50, 0.12)" : "rgba(237, 233, 145, 0.12)",
    color: isUp ? "var(--text-success)" : "#ede991",
    border: isUp ? "1px solid rgba(46, 125, 50, 0.25)" : "1px solid rgba(237, 233, 145, 0.25)",
    display: "inline-flex",
    alignItems: "center"
}}>
    {isUp 
        ? `+$${snapshot.currentBalance.toFixed(2)} surplus` 
        : `$${snapshot.currentBalance.toFixed(2)} remaining`}
</span>
```

### 3. Markdown Notes (`dashboardWriter.ts`)
Update the generated Markdown dashboards to match this comparison logic:
* Remove any legacy available balance callouts.
* Prepend a `+` or `-` to the Net Balance compared to Monday's baseline.
