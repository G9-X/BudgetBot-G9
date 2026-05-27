"""AI adapters. BudgetBot uses direct InvokeModel — no KB / no RAG.

Interface:
    categorize(description, amount, date) -> {"category": str, "confidence": "high|medium|low"}
"""
import json
import re
from typing import Any


CATEGORIES = [
    "Food", "Transport", "Shopping", "Utilities", "Entertainment",
    "Health", "Subscriptions", "Income", "Transfer", "Other",
]


CATEGORIZE_PROMPT = """Categorize the following bank transaction into exactly one category.
Categories: {categories}

Transaction: "{description}"
Amount: {amount}
Date: {date}

Respond with JSON only. No explanation.
{{"category": "<category>", "confidence": <float between 0.0 and 1.0>}}"""


def _parse_json_response(text: str) -> dict:
    """Extract first JSON object from LLM response. Falls back to Other if invalid."""
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n?|```$", "", text, flags=re.MULTILINE).strip()
    match = re.search(r"\{[^}]+\}", text, re.DOTALL)
    if match:
        try:
            obj = json.loads(match.group())
            if obj.get("category") in CATEGORIES:
                conf = obj.get("confidence", 0.5)
                if isinstance(conf, str):
                    try: conf = float(conf)
                    except: conf = 0.5
                return {
                    "category": obj["category"],
                    "confidence": conf,
                }
        except json.JSONDecodeError:
            pass
    return {"category": "Other", "confidence": 0.2}


class BedrockAI:
    def __init__(self, region: str, model_id: str):
        import boto3
        self.runtime = boto3.client("bedrock-runtime", region_name=region)
        self.model_id = model_id

    def categorize(self, description: str, amount: float, date: str) -> dict:
        prompt = CATEGORIZE_PROMPT.format(
            categories=", ".join(CATEGORIES),
            description=description,
            amount=amount,
            date=date,
        )
        resp = self.runtime.converse(
            modelId=self.model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 100, "temperature": 0.0},
        )
        text = resp["output"]["message"]["content"][0]["text"]
        return _parse_json_response(text)


class LocalAI:
    """Rule-based categorizer. Keyword matching only. Use for development."""

    # Order matters: first match wins. Subscriptions BEFORE Entertainment so
    # "Netflix monthly subscription" → Subscriptions (subscription keyword fires).
    KEYWORDS = {
        "Income": ["salary", "deposit credit", "payroll", "incoming transfer"],
        "Transfer": ["transfer to", "transfer from", "moved to savings"],
        "Subscriptions": ["subscription", "netflix", "spotify", "openai", "chatgpt", "anthropic",
                          "claude", "github", "icloud", "google one"],
        "Food": ["restaurant", "cafe", "coffee", "starbucks", "highlands", "phở", "pho", "food",
                 "grab food", "shopee food", "lunch", "dinner", "bakery"],
        "Transport": ["grab", "uber", " be ", "xanh sm", "taxi", "metro", "bus", "petrol", "shell",
                      "vinfast", "fuel"],
        "Shopping": ["shopee", "lazada", "tiki", "amazon", "store", "mall", "vincom", "shop"],
        "Utilities": ["electric", "evn", "water", "internet", "viettel", "vnpt", "fpt", "utility"],
        "Entertainment": ["cinema", "cgv", "lotte cinema", "concert", "game"],
        "Health": ["pharmacy", "hospital", "clinic", "guardian", "long chau", "medlatec"],
    }

    def categorize(self, description: str, amount: float, date: str) -> dict:
        desc_lower = description.lower()
        for category, keywords in self.KEYWORDS.items():
            for kw in keywords:
                if kw in desc_lower:
                    return {"category": category, "confidence": 0.9}
        # Positive amount → income heuristic
        try:
            if float(amount) > 0:
                return {"category": "Income", "confidence": 0.4}
        except (TypeError, ValueError):
            pass
        return {"category": "Other", "confidence": 0.1}


class OllamaAI:
    def __init__(self, url: str, model_id: str):
        import httpx
        self.url = url.rstrip("/")
        self.model_id = model_id
        self.client = httpx.Client(timeout=60.0)

    def categorize(self, description: str, amount: float, date: str) -> dict:
        prompt = CATEGORIZE_PROMPT.format(
            categories=", ".join(CATEGORIES),
            description=description,
            amount=amount,
            date=date,
        )
        payload = {
            "model": self.model_id,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        try:
            resp = self.client.post(f"{self.url}/api/generate", json=payload)
            resp.raise_for_status()
            text = resp.json().get("response", "")
            return _parse_json_response(text)
        except Exception as e:
            print(f"Ollama Error: {e}")
            return {"category": "Other", "confidence": 0.0}
