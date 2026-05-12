#!/usr/bin/env python3
import json
import os
import posixpath
import random
import sqlite3
import string
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(os.environ.get("APP_ROOT", "/opt/url-shortener"))
DIST_DIR = ROOT / "frontend" / "dist"
DB_PATH = ROOT / "backend" / "shortener.db"
PORT = int(os.environ.get("PORT", "80"))


def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS urls (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_url TEXT NOT NULL,
                short_code TEXT NOT NULL UNIQUE,
                clicks INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS click_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                created_at TEXT NOT NULL
            )
            """
        )


def random_code(length=6):
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def ensure_unique_code(conn):
    while True:
        code = random_code()
        row = conn.execute("SELECT 1 FROM urls WHERE short_code = ?", (code,)).fetchone()
        if row is None:
            return code


def now_iso():
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def is_valid_http_url(value):
    try:
        parsed = urlparse(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
    except Exception:
        return False


def json_row_url(row):
    return {
        "id": row["id"],
        "originalUrl": row["original_url"],
        "shortCode": row["short_code"],
        "clicks": row["clicks"],
        "createdAt": row["created_at"],
    }


class AppHandler(BaseHTTPRequestHandler):
    server_version = "UrlShortenerPython/1.0"

    def log_message(self, fmt, *args):
        return

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_cors()
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/shorten":
            self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self.send_json({"error": "Invalid URL"}, HTTPStatus.BAD_REQUEST)
            return

        original_url = (payload.get("originalUrl") or "").strip()
        if not is_valid_http_url(original_url):
            self.send_json({"error": "Invalid URL"}, HTTPStatus.BAD_REQUEST)
            return

        with db_conn() as conn:
            existing = conn.execute(
                "SELECT id, original_url, short_code, clicks, created_at FROM urls WHERE original_url = ?",
                (original_url,),
            ).fetchone()
            if existing is not None:
                self.send_json(json_row_url(existing))
                return

            code = ensure_unique_code(conn)
            created_at = now_iso()
            cur = conn.execute(
                "INSERT INTO urls (original_url, short_code, clicks, created_at) VALUES (?, ?, 0, ?)",
                (original_url, code, created_at),
            )
            conn.commit()
            row = conn.execute(
                "SELECT id, original_url, short_code, clicks, created_at FROM urls WHERE id = ?",
                (cur.lastrowid,),
            ).fetchone()

        self.send_json(json_row_url(row))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/stats/"):
            code = path.removeprefix("/api/stats/")
            self.handle_stats(code)
            return

        if path in {"/", "/index.html"}:
            self.serve_file(DIST_DIR / "index.html", "text/html; charset=utf-8")
            return

        if path.startswith("/assets/"):
            safe_path = posixpath.normpath(unquote(path)).lstrip("/")
            self.serve_file(DIST_DIR / safe_path)
            return

        if path in {"/favicon.svg", "/icons.svg"}:
            self.serve_file(DIST_DIR / path.lstrip("/"))
            return

        if path.startswith("/analytics/"):
            self.serve_file(DIST_DIR / "index.html", "text/html; charset=utf-8")
            return

        code = path.lstrip("/")
        if code:
            self.handle_redirect(code)
            return

        self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def handle_stats(self, code):
        with db_conn() as conn:
            row = conn.execute(
                "SELECT id, original_url, short_code, clicks, created_at FROM urls WHERE short_code = ?",
                (code,),
            ).fetchone()
            if row is None:
                self.send_json({"error": "URL not found"}, HTTPStatus.NOT_FOUND)
                return

            stats_rows = conn.execute(
                """
                SELECT substr(created_at, 1, 10) AS date, COUNT(id) AS count
                FROM click_logs
                WHERE short_code = ?
                GROUP BY substr(created_at, 1, 10)
                ORDER BY date ASC
                """,
                (code,),
            ).fetchall()

        self.send_json(
            {
                "url": json_row_url(row),
                "stats": [{"date": r["date"], "count": r["count"]} for r in stats_rows],
            }
        )

    def handle_redirect(self, code):
        with db_conn() as conn:
            row = conn.execute(
                "SELECT id, original_url, short_code, clicks, created_at FROM urls WHERE short_code = ?",
                (code,),
            ).fetchone()
            if row is None:
                self.send_json({"error": "URL not found"}, HTTPStatus.NOT_FOUND)
                return

            created_at = now_iso()
            conn.execute(
                "INSERT INTO click_logs (short_code, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?)",
                (code, self.client_address[0], self.headers.get("User-Agent", ""), created_at),
            )
            conn.execute("UPDATE urls SET clicks = clicks + 1 WHERE short_code = ?", (code,))
            conn.commit()

        self.send_response(HTTPStatus.FOUND)
        self.send_header("Location", row["original_url"])
        self.send_cors()
        self.end_headers()

    def serve_file(self, path, content_type=None):
        if not path.exists() or not path.is_file():
            self.send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        if content_type is None:
            if path.suffix == ".svg":
                content_type = "image/svg+xml"
            elif path.suffix == ".js":
                content_type = "text/javascript; charset=utf-8"
            elif path.suffix == ".css":
                content_type = "text/css; charset=utf-8"
            elif path.suffix == ".html":
                content_type = "text/html; charset=utf-8"
            else:
                content_type = "application/octet-stream"

        data = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, payload, status=HTTPStatus.OK):
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(data)

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept")


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), AppHandler)
    print(f"Serving on 0.0.0.0:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
