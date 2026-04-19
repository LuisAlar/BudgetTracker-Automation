import azure.functions as func
import json
import logging
import re
import os

app = func.FunctionApp()

@app.route(route="ParseEmail", methods=["POST"], auth_level=func.AuthLevel.FUNCTION)
def parse_email(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Trigger received email for parsing.')

    try:
        req_body = req.get_json()
        email_body = req_body.get('body', '')
    except ValueError:
        return func.HttpResponse("Invalid JSON payload", status_code=400)
    
    if not email_body:
         return func.HttpResponse("Missing 'body' string in payload", status_code=400)

    # 1. Regex Extraction (Assuming standard Bank of America email format)
    # Example: "... transaction of $46.50 was made at CHIPOTLE MEXICAN GRILL on 05/10/2026."
    amount_match = re.search(r'\$([0-9]+\.[0-9]{2})', email_body)
    amount = float(amount_match.group(1)) if amount_match else 0.0

    merchant_match = re.search(r'at\s+(.*?)\s+on', email_body)
    merchant = merchant_match.group(1).strip() if merchant_match else "UNKNOWN_MERCHANT"

    date_match = re.search(r'on\s+(\d{2}/\d{2}/\d{4})', email_body)
    date = date_match.group(1) if date_match else "UNKNOWN_DATE"

    # 2. Categorization Mapping
    # We load our 'categories.json' to dynamically see if the merchant string maps to a bucket
    category = "Spontaneous" # Fallback bucket
    try:
        with open("categories.json", "r") as f:
            categories_map = json.load(f)
            # Find which array the merchant falls into
            for bucket, merchants in categories_map.items():
                if any(m.lower() in merchant.lower() for m in merchants):
                    category = bucket
                    break
    except Exception as e:
        logging.error(f"Error reading categories.json: {e}")

    # 3. Build & Return the structured JSON for Power Automate to use
    result = {
        "amount": amount,
        "merchant": merchant,
        "date": date,
        "category": category
    }

    return func.HttpResponse(
         json.dumps(result),
         mimetype="application/json",
         status_code=200
    )