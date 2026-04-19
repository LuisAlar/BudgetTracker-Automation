import json
import uuid
import random
import os
from datetime import datetime, timedelta

MOCK_DIR = "_mock_database"

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

def generate_mock_transactions(num=15):
    if not os.path.exists(MOCK_DIR):
        os.makedirs(MOCK_DIR)

    for i in range(num):
        t_id = str(uuid.uuid4())
        
        # Generate random date in the last month
        days_ago = random.randint(0, 30)
        random_date = datetime.now() - timedelta(days=days_ago)
        
        data = {
            "transaction_id": t_id,
            "amount": round(random.uniform(5.50, 150.00), 2),
            "merchant": random.choice(merchants),
            "category": random.choice(categories),
            "date_logged": random_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "notes": ""
        }
        
        filename = f"{random_date.strftime('%Y-%m-%d')}_{t_id[:8]}.json"
        
        with open(os.path.join(MOCK_DIR, filename), "w") as f:
            json.dump(data, f, indent=4)
            
    print(f"[SUCCESS] Generated {num} mock transactions in '{MOCK_DIR}/'")

if __name__ == "__main__":
    generate_mock_transactions()
