"""Endpoint business logic for BudgetBot."""
import csv
import io
import uuid
from typing import Optional


def _parse_csv(data: bytes) -> list:
    """Expect CSV columns: date, description, amount."""
    text = data.decode("utf-8-sig", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return []
    header = [c.lower().strip() for c in rows[0]]
    if "date" in header and "amount" in header:
        idx = {col: i for i, col in enumerate(header)}
        data_rows = rows[1:]
    else:
        idx = {"date": 0, "description": 1, "amount": 2}
        data_rows = rows
    parsed = []
    for r in data_rows:
        if len(r) < 3 or not r[idx.get("date", 0)].strip():
            continue
        try:
            parsed.append({
                "date": r[idx.get("date", 0)].strip(),
                "description": r[idx.get("description", 1)].strip(),
                "amount": float(r[idx.get("amount", 2)].strip().replace(",", "")),
            })
        except (ValueError, IndexError):
            continue
    return parsed


def _normalize_merchant(desc: str) -> str:
    import re
    return re.sub(r'\b(ft|pos|napas)\b', '', desc, flags=re.IGNORECASE).strip()


def handle_upload(
    user_id: str,
    filename: str,
    data: bytes,
    ai_client,
    storage,
    userstore,
) -> dict:
    import_id = "import-" + uuid.uuid4().hex[:8]
    key = f"{user_id}/{filename}"
    location = storage.put(key, data)
    rows = _parse_csv(data)
    
    rules_applied = 0
    ai_calls = 0
    reviews_needed = 0

    rules = userstore.list_rules(user_id)
    
    for i, row in enumerate(rows):
        desc = row["description"]
        desc_lower = desc.lower()
        amount = row["amount"]
        
        # Check Rules first
        matched_rule = next((r for r in rules if r["contains"].lower() in desc_lower), None)
        
        category = "Other"
        confidence = 0.0
        status = "NEEDS_REVIEW"
        merchant = _normalize_merchant(desc)
        recurring = False

        if matched_rule:
            category = matched_rule["category"]
            confidence = 1.0
            status = "AUTO_APPROVED"
            rules_applied += 1
        else:
            ai_calls += 1
            cat_result = ai_client.categorize(description=desc, amount=amount, date=row["date"])
            category = cat_result["category"]
            confidence = float(cat_result["confidence"])
            if confidence >= 0.8:
                status = "AUTO_APPROVED"
            else:
                status = "NEEDS_REVIEW"
                reviews_needed += 1
        
        txn = {
            "id": f"{import_id}-txn-{i+1}",
            "importId": import_id,
            "date": row["date"],
            "description": desc,
            "merchant": merchant,
            "amount": amount,
            "category": category,
            "confidence": confidence,
            "status": status,
            "recurring": recurring
        }
        userstore.add_transaction(user_id, txn)

    return {
        "id": import_id,
        "filename": filename,
        "importedAt": _now(),
        "rows": len(rows),
        "ruleMatches": rules_applied,
        "aiCalls": ai_calls,
        "reviewsNeeded": reviews_needed,
        "status": "Completed"
    }

def _now() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def handle_summary(user_id: str, month: Optional[str], userstore) -> dict:
    txns = userstore.list_transactions(user_id, month=month)
    income = sum(t["amount"] for t in txns if t["amount"] > 0)
    spend = abs(sum(t["amount"] for t in txns if t["amount"] < 0))
    
    from collections import defaultdict
    cats = defaultdict(lambda: {"amount": 0.0, "count": 0})
    for t in txns:
        if t["amount"] < 0:
            cats[t["category"]]["amount"] += abs(t["amount"])
        cats[t["category"]]["count"] += 1
        
    by_cat = []
    for cat, data in cats.items():
        if data["amount"] > 0:
            by_cat.append({"category": cat, "amount": data["amount"], "count": data["count"]})
    by_cat.sort(key=lambda x: x["amount"], reverse=True)

    return {
        "income": income,
        "spend": spend,
        "net": income - spend,
        "reviewCount": sum(1 for t in txns if t["status"] == "NEEDS_REVIEW"),
        "byCategory": by_cat
    }

def handle_list_transactions(user_id: str, month: Optional[str], userstore) -> list:
    return userstore.list_transactions(user_id, month=month)
