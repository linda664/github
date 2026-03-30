from flask_cors import CORS
from flask import Flask, jsonify, request
import sqlite3
import csv
import os
import pandas as pd


app = Flask(__name__)
CORS(
    app,
    resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
    supports_credentials=False,
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "OPTIONS"],
)  #CROS: cross-domain request(different urls b/w frontend and backend

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE_DIR, "database.db")
DATA_DIR = BASE_DIR

def get_conn():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn
'''
def init_db_from_csv():
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        account_creation_date TEXT,
        country TEXT
    )
    """)
    # import the first 20 wors from .cvs
    count = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    if count == 0 and os.path.exists(CSV_PATH):
        with open(CSV_PATH, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= 20: break
                c.execute("""
                INSERT OR REPLACE INTO users
                (user_id, name, email, phone, account_creation_date, country)
                VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    int(row["user_id"]),
                    row["name"],
                    row["email"],
                    row["phone"],
                    row["account_creation_date"],
                    row["country"],
                ))
    conn.commit()  #write into SQLite
    conn.close()
'''

FILES = {
    "users": "users.csv",
    "shopping_cart": "shopping_cart.csv",
    "orders": "orders.csv",
    "shipments": "shipments.csv",
}


def table_has_rows(conn, table):
    try:
        cur = conn.execute(f"SELECT 1 FROM {table} LIMIT 1")
        return cur.fetchone() is not None
    except sqlite3.Error:
        return False

def ensure_tables_exist(conn):
    # minimal schemas so API won't crash even if import fails
    conn.execute("""
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER,
        name TEXT,
        email TEXT,
        phone TEXT,
        account_creation_date TEXT,
        country TEXT
      )
    """)
    conn.execute("""
      CREATE TABLE IF NOT EXISTS shopping_cart (
        cart_id INTEGER,
        user_id INTEGER,
        cart_created_date TEXT
      )
    """)
    conn.execute("""
      CREATE TABLE IF NOT EXISTS orders (
        order_id INTEGER,
        user_id INTEGER,
        category TEXT,
        total_price REAL,
        payment_method TEXT,
        order_date TEXT,
        status TEXT,
        shipping_address TEXT
      )
    """)
    conn.execute("""
      CREATE TABLE IF NOT EXISTS shipments (
        shipment_id INTEGER,
        order_id INTEGER,
        carrier_name TEXT,
        tracking_number TEXT,
        delivery_status TEXT,
        estimated_arrival TEXT
      )
    """)
    conn.commit()

def import_excel_to_sqlite_once():
    conn = get_conn()
    ensure_tables_exist(conn)

    for table, filename in FILES.items():
        path = os.path.join(DATA_DIR, filename)

        if not os.path.exists(path):
            print(f"[WARN] Missing file: {path}")
            continue

        # If table already has rows, skip
        if table_has_rows(conn, table):
            print(f"[SKIP] {table} already has data")
            continue

        try:
            ext = os.path.splitext(filename)[1].lower()
            df = pd.read_csv(path)

            df.columns = [str(c).strip().lower() for c in df.columns]

            #clean "category": only keep the part before the first "|"
            if "category" in df.columns:
                df["category"] = (
                    df["category"]
                    .astype(str)
                    .str.split("|")
                    .str[0]
                    .str.strip()
                )
                
            for col in df.columns:
                if "date" in col or "arrival" in col:
                    df[col] = pd.to_datetime(df[col], errors="coerce").dt.strftime("%Y-%m-%d")

            # replace table with imported content
            df.to_sql(table, conn, if_exists="replace", index=False)
            print(f"[OK] Imported {table}: {len(df)} rows")

        except Exception as e:
            print(f"[ERROR] Failed to import {table} from {path}: {e}")

    conn.close()

@app.route("/api/user", methods=["GET"])
def get_user():
    conn = get_conn()
    row = conn.execute("""
        SELECT u.*
        FROM users u
        WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.user_id)
        ORDER BY u.user_id
        LIMIT 1
        """).fetchone()
    conn.close()
    return jsonify(dict(row)) if row else jsonify({}), 200

@app.route("/api/user", methods=["POST"])
def save_user():
    data = request.json
    conn = get_conn()
    conn.execute("""
        UPDATE users
        SET name=?, email=?, phone=?, country=?
        WHERE user_id=?
    """, (
        data["name"],
        data["email"],
        data["phone"],
        data["country"],
        data["user_id"],
    ))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/api/user/<int:user_id>", methods=["GET"])
def get_user_by_id(user_id):
    conn = get_conn()
    row = conn.execute("SELECT * FROM users WHERE user_id=?", (user_id,)).fetchone()
    conn.close()
    return jsonify(dict(row)) if row else jsonify({}), 200

@app.route("/api/order-user-ids", methods=["GET"])
def order_user_ids():
    conn = get_conn()
    rows = conn.execute("""
        SELECT DISTINCT CAST(user_id AS INTEGER) AS user_id
        FROM orders
        WHERE user_id IS NOT NULL
        ORDER BY CAST(user_id AS INTEGER)
        LIMIT 8
    """).fetchall()
    conn.close()
    return jsonify([r["user_id"] for r in rows]), 200


@app.route("/api/shopping-carts", methods=["GET"])
def api_shopping_carts():
    user_id = request.args.get("user_id", default=1, type=int)
    conn = get_conn()
    rows = conn.execute(
        "SELECT cart_id, user_id, cart_created_date FROM shopping_cart WHERE WHERE CAST(user_id AS INTEGER)=? ORDER BY cart_id",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200

@app.route("/api/orders", methods=["GET"])
def api_orders():
    user_id = request.args.get("user_id", default=1, type=int)
    conn = get_conn()
    rows = conn.execute(
        """SELECT order_id, user_id, category, total_price, payment_method, order_date, status, shipping_address
        FROM orders
        WHERE CAST(user_id AS INTEGER)=?
        ORDER BY order_id""",
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200

@app.route("/api/tracking", methods=["GET"])
def api_tracking():
    user_id = request.args.get("user_id", default=1, type=int)
    conn = get_conn()
    rows = conn.execute(
        """
        SELECT
            o.order_id,
            o.user_id,
            o.order_date,
            o.status AS order_status,
            o.category,
            o.total_price,
            s.shipment_id,
            s.carrier_name,
            s.tracking_number,
            s.delivery_status,
            s.estimated_arrival
        FROM orders o
        LEFT JOIN shipments s ON s.order_id = o.order_id
        WHERE CAST(o.user_id AS INTEGER)=?
        ORDER BY o.order_id
        """,
        (user_id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows]), 200


if __name__ == "__main__":
    import_excel_to_sqlite_once()
    app.run(debug=True)


