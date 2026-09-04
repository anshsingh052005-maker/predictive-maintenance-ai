import sqlite3
from pathlib import Path
from datetime import datetime, timezone


# Project root
BASE_DIR = Path(__file__).resolve().parent.parent

# Database folder
DATABASE_DIR = BASE_DIR / "database"
DATABASE_DIR.mkdir(exist_ok=True)

# SQLite database file
DATABASE_PATH = DATABASE_DIR / "predictx.db"


def get_connection():
    """Create and return a SQLite database connection."""
    connection = sqlite3.connect(DATABASE_PATH)

    # Return rows like dictionaries
    connection.row_factory = sqlite3.Row

    return connection


def initialize_database():
    """Create the predictions table if it does not exist."""
    connection = get_connection()

    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                air_temperature REAL NOT NULL,
                process_temperature REAL NOT NULL,
                rotational_speed REAL NOT NULL,
                torque REAL NOT NULL,
                tool_wear REAL NOT NULL,
                prediction INTEGER NOT NULL,
                failure_probability REAL NOT NULL,
                risk_level TEXT NOT NULL,
                maintenance_required INTEGER NOT NULL
            )
            """
        )

        connection.commit()

    finally:
        connection.close()


def save_prediction(
    air_temperature,
    process_temperature,
    rotational_speed,
    torque,
    tool_wear,
    prediction,
    failure_probability,
    risk_level,
    maintenance_required,
):
    """Save a prediction result to the database."""

    connection = get_connection()

    try:
        timestamp = datetime.now(timezone.utc).isoformat()

        cursor = connection.execute(
            """
            INSERT INTO predictions (
                timestamp,
                air_temperature,
                process_temperature,
                rotational_speed,
                torque,
                tool_wear,
                prediction,
                failure_probability,
                risk_level,
                maintenance_required
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timestamp,
                air_temperature,
                process_temperature,
                rotational_speed,
                torque,
                tool_wear,
                prediction,
                failure_probability,
                risk_level,
                int(maintenance_required),
            ),
        )

        connection.commit()

        return cursor.lastrowid

    finally:
        connection.close()
def get_predictions(limit=50):
    """Return recent prediction records from the database."""

    connection = get_connection()

    try:
        cursor = connection.execute(
            """
            SELECT *
            FROM predictions
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,),
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()
        
def delete_predictions():
    """Delete all prediction records from the database."""

    connection = get_connection()

    try:
        connection.execute("DELETE FROM predictions")
        connection.commit()
    finally:
        connection.close()