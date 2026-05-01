import re

with open('api/EmailBodySample.html', 'r', encoding='utf-8') as f:
    email_body = f.read()

print("Is bofa in body?", "bank of america" in email_body.lower() or "bankofamerica.com" in email_body.lower())

def test_bofa():
    amount_match = re.search(r'Amount.*?\$([0-9]+\.[0-9]{2})', email_body, re.DOTALL | re.IGNORECASE)
    amount = float(amount_match.group(1)) if amount_match else 0.0

    merchant_match = re.search(r'Purchase\s+made\s+at.*?<b>(.*?)</b>', email_body, re.DOTALL | re.IGNORECASE)
    merchant = "UNKNOWN_MERCHANT"
    if merchant_match:
        merchant = re.sub(r'\s+', ' ', merchant_match.group(1)).strip()

    date_match = re.search(r'Purchase\s+date.*?<b>(.*?)</b>', email_body, re.DOTALL | re.IGNORECASE)
    date = "UNKNOWN_DATE"
    if date_match:
        date = re.sub(r'\s+', ' ', date_match.group(1)).strip()
        
    print("BOFA:")
    print("Amount:", amount)
    print("Merchant:", merchant)
    print("Date:", date)

def test_fallback():
    amount_match = re.search(r'\$([0-9]+\.[0-9]{2})', email_body)
    amount = float(amount_match.group(1)) if amount_match else 0.0

    merchant_match = re.search(r'at\s+(.*?)\s+on', email_body, re.DOTALL | re.IGNORECASE)
    merchant = merchant_match.group(1).strip() if merchant_match else "UNKNOWN_MERCHANT"

    date_match = re.search(r'on\s+(\d{2}/\d{2}/\d{4})', email_body)
    date = date_match.group(1) if date_match else "UNKNOWN_DATE"
    
    print("FALLBACK:")
    print("Amount:", amount)
    print("Merchant:", merchant)
    print("Date:", date)

test_bofa()
test_fallback()
