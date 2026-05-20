# Implementation Plan: Budget Automation & Obsidian Integration

## Goal Description
Design the architectural layout and integration strategy for a personal budget tracker that uses an Obsidian vault as the UI/Data layer, and Power Automate + Azure Functions as the Application/Logic layer.

## Proposed Strategy: Separation of Concerns

From a Software Engineering perspective, you should adopt the **Model-View-Controller (MVC)** architectural pattern here. Your Obsidian Vault is your View (UI) and Model (Database). Your actual code is the Controller.

### 1. Directory Structure
**Recommendation: Keep them separate.** 
Do not mix your high-code server functionality (like local Azure Functions, Python scripts, or GitHub Action YAMLs) inside your Obsidian Vault. If you do, Obsidian's graph view will get polluted with `.js`, `.py`, and `.json` files, and it mixes your "Code repository" with a "Data repository".

Instead, structure your machine like this:
```text
C:\Users\alarc\Documents\Obsidian_Vaults\BudgetVault\   <-- (The "UI" & Data Hub. Sync this to cloud)
    ├── 01_Daily_Spending\
    ├── 02_Monthly_Summaries\
    └── Dashboard.md

C:\Users\alarc\Developer\Workspace\BudgetAutomationCode\ <-- (The "Server" / Functionality Hub)
    ├── src\functions\httpTrigger1.js (Your logic)
    ├── .github\workflows\ (Your CI/CD)
    └── package.json
```
*Why?* The `BudgetAutomationCode` folder gets pushed to GitHub as source code. The `BudgetVault` folder gets synced to a cloud drive (OneDrive/Dropbox) as raw data.

### 2. How Power Automate Interacts with Obsidian
Since Power Automate lives in the cloud, it cannot directly reach into your `C:\` drive to edit your Obsidian files securely without a lot of firewall configurations. 

**The Recommended Solution (Cloud-Sync Approach):**
1. **Host the Vault in OneDrive:** Move your `BudgetVault` folder into your local OneDrive folder. Obsidian will still read it instantly on your PC as standard local files.
2. **Cloud Editing:** When your Power Automate flow triggers (e.g., via an email receipt), it does the math, then uses the **OneDrive for Business Connector**.
3. **The Action:** The flow uses the `Update file` or `Create file` action in the OneDrive connector to inject the new Markdown data directly into your Vault's files in the cloud.
4. **The Sync:** OneDrive instantly syncs the updated `.md` file down to your PC. If you have Obsidian open, the text will literally appear on your screen in real time.

## Verification Plan
### Manual Verification
1. Move a test vault to OneDrive.
2. Build a simple 2-step Power Automate flow that triggers from a button press and writes "Hello World" into a test `.md` file in the OneDrive vault.
3. Verify that the Obsidian UI updates automatically when the flow runs.
