"""Env-driven config for BudgetBot."""
import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


@dataclass(frozen=True)
class Config:
    ai_backend: str = _env("AI_BACKEND", "ollama")
    ai_model_id: str = _env("AI_MODEL_ID", "llama3.1:8b")
    ollama_url: str = _env("OLLAMA_URL", "http://localhost:11434")
    aws_region: str = _env("AWS_REGION", "us-west-2")
    cognito_user_pool_id: str = _env("COGNITO_USER_POOL_ID", "")
    cognito_client_id: str = _env("COGNITO_CLIENT_ID", "")

    storage_backend: str = _env("STORAGE_BACKEND", "local")
    storage_bucket: str = _env("STORAGE_BUCKET", "")
    storage_local_dir: str = _env("STORAGE_LOCAL_DIR", "./_data/uploads")

    userstore_backend: str = _env("USERSTORE_BACKEND", "postgres")
    userstore_table: str = _env("USERSTORE_TABLE", "")
    userstore_postgres_url: str = _env("USERSTORE_POSTGRES_URL", "")
    userstore_sqlite_path: str = _env("USERSTORE_SQLITE_PATH", "./_data/transactions.db")

    default_user_id: str = _env("DEFAULT_USER_ID", "test-user-001")
    log_level: str = _env("LOG_LEVEL", "INFO")


    # Frontend serving (opt-out so backend can be pure API for split deploys)
    serve_frontend: bool = _env("SERVE_FRONTEND", "true").lower() == "true"
    cors_origins: str = _env("CORS_ORIGINS", "*")

    # Extra DB backends (DocumentDB, MySQL)
    userstore_mongo_url: str = _env("USERSTORE_MONGO_URL", "")
    userstore_mongo_db: str = _env("USERSTORE_MONGO_DB", "budgetbot")
    userstore_mongo_tls_ca: str = _env("USERSTORE_MONGO_TLS_CA", "")
    userstore_mysql_url: str = _env("USERSTORE_MYSQL_URL", "")

config = Config()
