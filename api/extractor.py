import re
import logging
from datetime import datetime

def extract_transaction_data(email_body: str) -> dict:
    """
    Extracts amount, merchant, and date from the bank email body.
    Routes to specific parsing logic based on email content.
    """
    body_lower = email_body.lower()
    
    # Identify email type based on keywords to route to the correct parser
    if "zelle" in body_lower:
        return _extract_zelle(email_body)
    elif "bank of america" in body_lower or "bankofamerica.com" in body_lower:
        if "deposit" in body_lower or "deposited" in body_lower:
            return _extract_bofa_deposit(email_body)
        else:
            return _extract_bofa(email_body)
    elif "purchase made at" in body_lower:
        return _extract_bofa(email_body)
    else:
        logging.warning("Unknown email format. Falling back to default extraction.")
        return _extract_fallback(email_body)

def _extract_bofa(email_body: str) -> dict:
    """Extraction logic specific to Bank of America HTML emails."""
    # Extract Amount
    amount_match = re.search(r'Amount.*?\$([0-9]+\.[0-9]{2})', email_body, re.DOTALL | re.IGNORECASE)
    amount = float(amount_match.group(1)) if amount_match else 0.0

    # Extract Merchant
    merchant_match = re.search(r'Purchase\s+made\s+at.*?<b>(.*?)</b>', email_body, re.DOTALL | re.IGNORECASE)
    merchant = "UNKNOWN_MERCHANT"
    if merchant_match:
        merchant = re.sub(r'\s+', ' ', merchant_match.group(1)).strip()

    # Extract Date
    date_match = re.search(r'Purchase\s+date.*?<b>(.*?)</b>', email_body, re.DOTALL | re.IGNORECASE)
    date = "UNKNOWN_DATE"
    if date_match:
        date = re.sub(r'\s+', ' ', date_match.group(1)).strip()
    
    return {
        "amount": amount,
        "merchant": merchant,
        "date": date
    }

def _extract_bofa_deposit(email_body: str) -> dict:
    """Extraction logic specific to Bank of America deposit notifications."""
    # Extract Amount
    amount_match = re.search(r'(?:deposit\s+of|deposited|amount:?)\s*\$?([0-9,]+\.[0-9]{2})', email_body, re.IGNORECASE)
    if not amount_match:
        amount_match = re.search(r'\$?([0-9,]+\.[0-9]{2})', email_body)
        
    amount = float(amount_match.group(1).replace(',', '')) if amount_match else 0.0

    # Extract Merchant / Source
    description_match = re.search(r'Description:?\s*([^.\n<,]+)', email_body, re.IGNORECASE)
    merchant = "BofA Deposit"
    if description_match:
        merchant = f"BofA Deposit: {description_match.group(1).strip()}"
    
    # Extract Date
    date_match = re.search(r'Date:?\s*([A-Za-z0-9\s\/\:\,]+)', email_body, re.IGNORECASE)
    date = "UNKNOWN_DATE"
    if date_match:
        date = re.sub(r'\s+', ' ', date_match.group(1)).strip()
    else:
        date = datetime.now().strftime("%B %d, %Y")

    return {
        "amount": amount,
        "merchant": merchant,
        "date": date,
        "category": "Deposits"
    }

def _extract_zelle(email_body: str) -> dict:
    """Extraction logic specific to Zelle emails."""
    # Extract Amount
    amount_match = re.search(r'(?:sent\s+you|received|amount:?)\s*\$?([0-9,]+\.[0-9]{2})', email_body, re.IGNORECASE)
    if not amount_match:
        amount_match = re.search(r'\$?([0-9,]+\.[0-9]{2})', email_body)
        
    amount = float(amount_match.group(1).replace(',', '')) if amount_match else 0.0

    # Extract Sender / Merchant
    sender_match = re.search(r'([A-Za-z0-9\s\-]+?)\s+sent\s+you', email_body, re.IGNORECASE)
    merchant = "Zelle Inflow"
    if sender_match:
        merchant = f"Zelle from {sender_match.group(1).strip()}"
    else:
        from_match = re.search(r'from\s+([A-Za-z0-9\s\-]+)', email_body, re.IGNORECASE)
        if from_match:
            merchant = f"Zelle from {from_match.group(1).strip()}"

    # Clean up common redundant Zelle text
    merchant = re.sub(r'(?i)ZELLE\s+PAYMENT\s+from\s+', '', merchant)
    merchant = re.sub(r'\s+', ' ', merchant).strip()

    # Extract Date
    date_match = re.search(r'Date:?\s*([A-Za-z0-9\s\/\:\,]+)', email_body, re.IGNORECASE)
    date = "UNKNOWN_DATE"
    if date_match:
        date = re.sub(r'\s+', ' ', date_match.group(1)).strip()
    else:
        date = datetime.now().strftime("%B %d, %Y")

    return {
        "amount": amount,
        "merchant": merchant,
        "date": date,
        "category": "Deposits"
    }

def _extract_fallback(email_body: str) -> dict:
    """Fallback extraction logic if the email source is unknown."""
    return {
        "amount": 0.0,
        "merchant": "UNKNOWN_MERCHANT",
        "date": "UNKNOWN_DATE"
    }
