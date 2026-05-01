import azure.functions as func
import json
import logging
import os
import extractor

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

    # 1. Regex Extraction using separate module
    extracted_data = extractor.extract_transaction_data(email_body)
    amount = extracted_data["amount"]
    merchant = extracted_data["merchant"]
    date = extracted_data["date"]

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