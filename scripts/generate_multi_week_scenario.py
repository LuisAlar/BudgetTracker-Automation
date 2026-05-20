import os
import json
import uuid
from datetime import datetime

VAULT_PATH = r"C:\Users\alarc\Box\All Files\Budget-Tracker"
SCENARIO_DIR = os.path.join(VAULT_PATH, "data", "raw_test", "scenarios", "multi_week_carryover")

# Ensure target directory exists
os.makedirs(SCENARIO_DIR, exist_ok=True)

# Helper to write a transaction JSON
def write_tx(date_str, amount, merchant, category, notes=""):
    t_id = str(uuid.uuid4())
    tx = {
        "transaction_id": t_id,
        "amount": amount,
        "merchant": merchant,
        "category": category,
        "date_logged": date_str,
        "notes": notes
    }
    filename = f"{date_str[:10]}_{t_id[:8]}.json"
    file_path = os.path.join(SCENARIO_DIR, filename)
    with open(file_path, "w") as f:
        json.dump(tx, f, indent=4)
    print(f"Wrote tx: {filename} - {category} - ${amount}")

# Clean existing files in scenario directory
for f in os.listdir(SCENARIO_DIR):
    if f.endswith(".json"):
        os.remove(os.path.join(SCENARIO_DIR, f))

print("Generating multi-week carryover test scenario...")

# ─── Week 1: May 4, 2026 to May 10, 2026 ───
# Starting balance: initial_seed_balance ($1,900.00)
# Deposits: Zelle / Paycheck of $850.00
# Spending: Experiences ($50.00), Groceries ($100.00), Gas ($20.00)
write_tx("2026-05-05T09:00:00Z", 850.00, "Employer Paycheck", "Deposits", "Week 1 Paycheck")
write_tx("2026-05-06T19:30:00Z", 50.00, "Movie Theater", "Experiences", "Week 1 Movie")
write_tx("2026-05-07T12:00:00Z", 100.00, "Trader Joes", "Groceries", "Week 1 Groceries")
write_tx("2026-05-08T08:15:00Z", 20.00, "Shell Gas", "Gas", "Week 1 Gas")

# ─── Week 2: May 11, 2026 to May 17, 2026 ───
# Starting balance: $2,580.00
# Deposits: Paycheck of $850.00
# Spending: Experiences ($250.00 - exceeds $170.00 limit -> deficit), Groceries ($100.00), Gas ($50.00), Strict Savings ($550.00)
write_tx("2026-05-12T09:00:00Z", 850.00, "Employer Paycheck", "Deposits", "Week 2 Paycheck")
write_tx("2026-05-13T20:00:00Z", 250.00, "Concert Tickets", "Experiences", "Week 2 Concert")
write_tx("2026-05-14T15:30:00Z", 100.00, "Whole Foods", "Groceries", "Week 2 Groceries")
write_tx("2026-05-15T11:00:00Z", 50.00, "Chevron", "Gas", "Week 2 Gas")
write_tx("2026-05-16T10:00:00Z", 550.00, "Strict Savings Transfer", "Strict Savings", "Week 2 Savings Transfer")

# ─── Week 3: May 18, 2026 to May 24, 2026 (Current Week) ───
# Starting balance: $2,480.00
# Deposits: None
# Spending: Experiences ($200.00), Groceries ($100.00), Strict Savings ($500.00), Spontaneous ($200.00)
write_tx("2026-05-18T18:00:00Z", 200.00, "Fancy Dinner", "Experiences", "Week 3 Dinner")
write_tx("2026-05-19T12:00:00Z", 100.00, "Trader Joes", "Groceries", "Week 3 Groceries")
write_tx("2026-05-20T10:00:00Z", 500.00, "Strict Savings Transfer", "Strict Savings", "Week 3 Savings Transfer")
write_tx("2026-05-20T16:00:00Z", 200.00, "Amazon Purchase", "Spontaneous", "Week 3 Spontaneous")

print("Successfully generated all mock transactions for multi_week_carryover scenario.")
