"""FastAPI app for BudgetBot. Runtime-agnostic."""
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Header, HTTPException, UploadFile, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.config import config
from src.adapters import factory
from src import handlers


app = FastAPI(title="BudgetBot API")

_allowed = ["*"] if config.cors_origins == "*" else [o.strip() for o in config.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_client = factory.make_ai()
storage = factory.make_storage()
userstore = factory.make_userstore()


def _resolve_user_id(x_user_id: Optional[str]) -> str:
    return x_user_id or config.default_user_id


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(default=None),
) -> dict:
    user_id = _resolve_user_id(x_user_id)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    return handlers.handle_upload(
        user_id=user_id,
        filename=file.filename or "statement.csv",
        data=data,
        ai_client=ai_client,
        storage=storage,
        userstore=userstore,
    )


@app.get("/summary")
def summary(
    month: Optional[str] = None,
    x_user_id: Optional[str] = Header(default=None),
) -> dict:
    return handlers.handle_summary(_resolve_user_id(x_user_id), month, userstore)


@app.get("/transactions")
def transactions(
    month: Optional[str] = None,
    x_user_id: Optional[str] = Header(default=None),
) -> list:
    return handlers.handle_list_transactions(_resolve_user_id(x_user_id), month, userstore)


class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    status: Optional[str] = None

@app.put("/transactions/{txn_id}")
def update_transaction(
    txn_id: str,
    update_data: TransactionUpdate,
    x_user_id: Optional[str] = Header(default=None),
) -> dict:
    user_id = _resolve_user_id(x_user_id)
    updates = {}
    if update_data.category is not None:
        updates["category"] = update_data.category
    if update_data.status is not None:
        updates["status"] = update_data.status
    userstore.update_transaction(user_id, txn_id, updates)
    return {"status": "success"}


class RuleCreate(BaseModel):
    contains: str
    category: str

@app.post("/rules")
def create_rule(
    rule_data: RuleCreate,
    x_user_id: Optional[str] = Header(default=None),
) -> dict:
    import uuid
    user_id = _resolve_user_id(x_user_id)
    rule = {
        "id": "rule-" + uuid.uuid4().hex[:8],
        "contains": rule_data.contains,
        "category": rule_data.category
    }
    userstore.add_rule(user_id, rule)
    return rule
