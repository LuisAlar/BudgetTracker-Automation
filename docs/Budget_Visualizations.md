# Summer 2026 Budget Visualizations

Since you are a software engineer and are using Obsidian, you can use **Mermaid.js**, which is natively supported in Obsidian! It allows you to generate dynamic charts and diagrams strictly through code. 

Here are a few ways to visualize your "Simulated Independence" budget so you can track how your money flows without needing a spreadsheet.

## 1. The Income Flowchart (How Your Paycheck Splits)
This diagram maps exactly where a standard weekly paycheck of $850 goes. It makes it very easy to visualize how your Simulation works.

```mermaid
flowchart LR
    %% Define Nodes and Styling
    NetPay["Net Paycheck ($850)"]
    
    Essentials["Base Essentials ($180)"]
    Wants["Experience Fund ($130)"]
    Housing["Simulated Housing ($190)"]
    Savings["Strict Savings ($350)"]

    Groceries["Groceries ($125)"]
    Gas["Gas ($40)"]
    Subs["Subscriptions ($15)"]

    Dining["Dining Out (~$46)"]
    WorldCup["World Cup (~$23)"]
    Raves["Raves (~$28)"]
    Za["Za & Wraps (~$11.50)"]
    Fun["Spontaneous (~$11.50)"]
    
    Landlord["To Landlord / Rent"]
    ParentsHelp["Parents Rent Help -> Savings"]

    %% Flow routes
    NetPay --> Essentials
    NetPay --> Wants
    NetPay --> Housing
    NetPay --> Savings

    %% Essentials Breakdown
    Essentials --> Groceries
    Essentials --> Gas
    Essentials --> Subs

    %% Wants Breakdown
    Wants --> Dining
    Wants --> WorldCup
    Wants --> Raves
    Wants --> Za
    Wants --> Fun

    %% Housing Logic Simulation
    Housing --> Landlord
    Housing -. "If Parents Help" .-> ParentsHelp
    ParentsHelp --> Savings

    classDef income fill:#4CAF50,stroke:#388E3C,stroke-width:2px,color:white;
    classDef expense fill:#F44336,stroke:#D32F2F,stroke-width:2px,color:white;
    classDef save fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:white;
    classDef want fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:white;

    class NetPay income;
    class Essentials,Groceries,Gas,Subs expense;
    class Savings save;
    class Wants,Dining,WorldCup,Raves,Za,Fun want;
```

## 2. Overall Allocation Pie Chart
If you ever want a quick glance at your ratios to make sure you aren't overspending in one category, this pie chart breaks down your 100% distribution.

```mermaid
pie title Weekly Paycheck Distribution ($850)
    "Base Essentials (Food, Gas, Subs)" : 180
    "Simulated Rent (Housing Fund)" : 190
    "Experiences (Dining, Raves, Fun)" : 130
    "Strict Savings (For Next Year)" : 350
```

## 3. Your Summer Savings Trajectory
You can also use a Mindmap framework to break down exactly what that $350+ a week is building toward.

```mermaid
mindmap
  root((Total Summer Savings))
    Future Rent Fund
      Fall Rent
      Spring Rent
    Emergency Fund
      Car repairs
      Medical
    Sinking Funds
      New Guitar
      Headphones
```

## How to Customize This Workflow Further
As a software engineer, you can take this further into an automated workflow:
1. **Obsidian Dataview Plugin:** You can use the Dataview plugin to treat your markdown notes like a database. If you add YAML frontmatter (like `Cost: 15` and `Category: Fun`) to your daily journal notes when you buy something, Dataview can write dynamic SQL-like queries inside Obsidian to instantly show you a table of your spending that week.
2. **Obsidian Tracker Plugin:** This plugin reads your daily notes and creates automated line graphs over time (e.g., watching your "Wants" spending go up or down week by week).
