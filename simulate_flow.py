import json
import uuid
import random
import os
import argparse
from datetime import datetime, timedelta

# ─── Configuration & Defaults ─────────────────────────────────
DEFAULT_VAULT_PATH = r"C:\Users\alarc\Box\All Files\Budget-Tracker"

categories = [
    "Groceries", "Gas", "Subscriptions", 
    "Dining Out", "plants", "Raves", 
    "Simulated Housing", "Base Essentials", "Spontaneous"
]

merchants = [
    "Trader Joe", "Shell", "Spotify", 
    "Chipotle", "zelle", "Insomniac", 
    "Rent", "CVS", "Target", "Amazon"
]

def generate_mock_transactions(vault_path, env, scenario, num, max_days):
    # Resolve the destination directory
    if env == "production":
        target_dir = os.path.join(vault_path, "data", "raw")
    else:  # testing
        if scenario and scenario.lower() != "none":
            target_dir = os.path.join(vault_path, "data", "raw_test", "scenarios", scenario)
        else:
            target_dir = os.path.join(vault_path, "data", "raw_test")

    # Create directories if they do not exist
    os.makedirs(target_dir, exist_ok=True)

    print(f"[BudgetSim] Target Directory: {target_dir}")

    # Generate mock transactions
    for _ in range(num):
        t_id = str(uuid.uuid4())
        
        # Generate random date in the specified range (recent dates ensure they show on the weekly dashboard)
        days_ago = random.randint(0, max_days)
        random_date = datetime.now() - timedelta(days=days_ago)
        
        data = {
            "transaction_id": t_id,
            "amount": round(random.uniform(5.50, 150.00), 2),
            "merchant": random.choice(merchants),
            "category": random.choice(categories),
            "date_logged": random_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "notes": f"Generated mock transaction for {env} mode."
        }
        
        filename = f"{random_date.strftime('%Y-%m-%d')}_{t_id[:8]}.json"
        file_path = os.path.join(target_dir, filename)
        
        with open(file_path, "w") as f:
            json.dump(data, f, indent=4)
            
    print(f"[SUCCESS] Generated {num} mock transactions in '{target_dir}/'")

def main():
    parser = argparse.ArgumentParser(description="Budget Automation Mock Transaction Scenario Generator CLI")
    
    parser.add_argument(
        "--env", "-e",
        choices=["production", "testing"],
        default="testing",
        help="Target environment (production or testing). Default: testing"
    )
    
    parser.add_argument(
        "--scenario", "-s",
        type=str,
        default="none",
        help="Subfolder scenario name for testing environment. E.g. 'double_billing' or 'rent_increase'. Default: none"
    )
    
    parser.add_argument(
        "--num", "-n",
        type=int,
        default=15,
        help="Number of transactions to generate. Default: 15"
    )
    
    parser.add_argument(
        "--days", "-d",
        type=int,
        default=6,
        help="Maximum days ago for generated dates. Set to 6 to stay within the current week. Default: 6"
    )
    
    parser.add_argument(
        "--vault", "-v",
        type=str,
        default=DEFAULT_VAULT_PATH,
        help=f"Path to active Obsidian vault. Default: {DEFAULT_VAULT_PATH}"
    )

    args = parser.parse_args()
    
    # Check if vault directory exists
    if not os.path.exists(args.vault):
        print(f"[WARNING] Vault directory not found at: '{args.vault}'. Creating it...")
        os.makedirs(args.vault, exist_ok=True)
        
    generate_mock_transactions(
        vault_path=args.vault,
        env=args.env,
        scenario=args.scenario,
        num=args.num,
        max_days=args.days
    )

if __name__ == "__main__":
    main()
