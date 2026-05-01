import re
import logging

def extract_transaction_data(email_body: str) -> dict:
    """
    Extracts amount, merchant, and date from the bank email body.
    """

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
