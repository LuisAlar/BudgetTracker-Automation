import re
import logging

def extract_transaction_data(email_body: str) -> dict:
    """
    Extracts amount, merchant, and date from the bank email body.
    Routes to specific parsing logic based on email content.
    """
    
    body_lower = email_body.lower()
    
    # Identify email type based on keywords to route to the correct parser
    if "bank of america" in body_lower or "bankofamerica.com" in body_lower or "purchase made at" in body_lower:
        return _extract_bofa(email_body)
    elif "zelle" in body_lower:
        return _extract_zelle(email_body)
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

def _extract_zelle(email_body: str) -> dict:
    """Extraction logic specific to Zelle emails (To be implemented)."""
    # TODO: Add Zelle specific regex here in the future
    return {
        "amount": 0.0,
        "merchant": "UNKNOWN_ZELLE_MERCHANT",
        "date": "UNKNOWN_DATE"
    }

def _extract_fallback(email_body: str) -> dict:
    """Fallback extraction logic if the email source is unknown."""
    # TODO: Add generic fallback regex here if needed
    return {
        "amount": 0.0,
        "merchant": "UNKNOWN_MERCHANT",
        "date": "UNKNOWN_DATE"
    }
