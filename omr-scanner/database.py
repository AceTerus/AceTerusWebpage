from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DATABASE_URL

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Supabase Transaction Pooler (and most hosted Postgres) require SSL
    connect_args = {"sslmode": "require"}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Enable WAL mode and foreign keys for SQLite
if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(conn, _rec):
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
