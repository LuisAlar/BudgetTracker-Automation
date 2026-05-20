# Product Requirements Document (PRD): Microsoft Power Automate Finance Pipeline

## 1. Executive Summary
**Objective:** To design and implement a fully automated Extract, Transform, Load (ETL) pipeline that tracks personal budget expenditures using the native **Microsoft Power Platform** (Outlook and Power Automate).

**Target User:** A software engineering student managing a summer internship budget, aiming to use this project as a sandbox to practice **AI Automation** and enterprise workflows within the Microsoft Suite, while maintaining seamless tracking in Obsidian.

---

## 2. System Architecture

This architecture pivots away from custom Python/Plaid scripts and leverages the enterprise Microsoft Stack. It acts as an event-driven workflow.

```mermaid
flowchart TD
    subgraph Extraction (Microsoft Outlook)
        Bank[(Bank Account)] -- Transaction Alert --> Email[Outlook Email]
    end

    subgraph Transformation (Power Automate)
        Email -- Triggers Flow --> PowerAutomate[Microsoft Power Automate]
        PowerAutomate -- AI Builder / Text Parse --> ExtractData{Extract: Amount, Merchant}
        ExtractData -- Keyword Rules --> Categorize[Tag to Budget Category]
    end

    subgraph Destination & Load (OneDrive & Obsidian)
        Categorize -- Create File --> OneDrive[OneDrive Folder]
        OneDrive -- Local Sync --> LocalVault[(Obsidian Vault)]
        LocalVault --> Dataview[Dataview Dashboard]
    end

    classDef ms fill:#0078D4,stroke:#005A9E,stroke-width:2px,color:#fff;
    classDef obs fill:#7C3AED,stroke:#5B21B6,stroke-width:2px,color:#fff;
    class Email,PowerAutomate,ExtractData,Categorize,OneDrive ms;
    class LocalVault,Dataview obs;
```

---

## 3. Core Components & Technical Stack

### A. Data Gathering (Extraction)
*   **Tooling:** Microsoft Outlook.
*   **Functionality:** 
    *   Set up your bank's notification settings to send an email for *every* transaction over $1.00.
    *   Create an Outlook Inbox Rule/Folder (e.g., "Bank Transactions") where all these emails are automatically routed so they don't clutter your main inbox.

### B. Cleaning & Categorization (Transformation via Power Automate)
*   **Tooling:** Microsoft Power Automate (the "workflow code option").
*   **Functionality:** 
    *   **Trigger:** The flow begins implicitly `When a new email arrives` in the Outlook "Bank Transactions" folder.
    *   **AI Data Extraction:** Use Power Automate's native **AI Builder** (or standard string parsing/regex functions) to extract the *Merchant Name* and *Spend Amount* from the email body.
    *   **Categorization Logic:** Add "Condition" blocks (If/Else statements) in Power Automate:
        *   *If `Extracted_Merchant` contains "Spotify" → assign Variable `Category` = "Subscriptions".*
        *   *If `Extracted_Merchant` contains "Uber" → assign Variable `Category` = "Transport".*

### C. Formatting & Loading (Load via OneDrive)
*   **Tooling:** Power Automate "Create File" action + OneDrive.
*   **Functionality:**
    *   Because your Obsidian vault is stored in `OneDrive\Documents\Academic\Summer_Budget\`, Power Automate can directly interact with it in the cloud!
    *   Set Power Automate to construct a string formatted exactly like an Obsidian Markdown file with YAML frontmatter.
    *   Use the **OneDrive - Create file** connector to drop a `[Date]-[Merchant].md` file directly into your vault folder.
    *   OneDrive Desktop syncs this to your PC instantly.

### D. Visualization (Obsidian)
*   **Tooling:** Obsidian Dataview plugin.
*   **Functionality:**
    *   As soon as OneDrive syncs the file, the Dataview plugin inside Obsidian will automatically detect the new transaction.
    *   Your dashboard updates live to reflect the exact budget deductions based on your "Simulated Independence" constraints.

---

## 4. Implementation Phases & Practice Steps

**Phase 1: The Outlook & Simple Flow Hook**
1. Update your bank settings to send an email to your Outlook address for every transaction.
2. Log into Power Automate and create an "Automated Cloud Flow".
3. Trigger: `When a new email arrives (V3)`.
4. Action: Just send yourself a Microsoft Teams message or a simple notification to prove the hook works.

**Phase 2: Text Extraction & AI Builder**
1. Look at an example bank email and learn how to extract the text using Power Automate Expressions (e.g., `substring()`, `split()`).
2. *Alternative AI Practice:* Feed the email body into the **AI Builder** node in Power Automate and prompt the AI: *"Extract the Merchant and the Amount from this email text and return it as JSON."*
3. Initialize variables in the flow to store the resulting `Merchant` and `Amount`.

**Phase 3: The OneDrive Markdown Bridge**
1. Add a "Create file" step connecting to your OneDrive account.
2. For File Content, manually write out the Markdown/YAML structure and insert your Power Automate variables into the text block.
3. Swipe your card, wait for the email, and watch the markdown file magically appear in your Obsidian folder moments later!
