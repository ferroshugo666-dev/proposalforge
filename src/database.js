const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const dbPath = path.join(__dirname, "..", "proposalforge.db");

const db = new DatabaseSync(dbPath);

db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_name TEXT NOT NULL DEFAULT 'My Company',
        language TEXT NOT NULL DEFAULT 'en',
        currency TEXT NOT NULL DEFAULT 'USD',
        currency_symbol TEXT NOT NULL DEFAULT '$',
        currency_position TEXT NOT NULL DEFAULT 'before',
        tax_rate REAL NOT NULL DEFAULT 0,
        tax_name TEXT NOT NULL DEFAULT 'Tax',
        company_email TEXT DEFAULT '',
        company_phone TEXT DEFAULT '',
        company_website TEXT DEFAULT '',
        company_address TEXT DEFAULT '',
        logo_path TEXT DEFAULT '',
        primary_color TEXT DEFAULT '#2563eb',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        phone TEXT DEFAULT '',
        company TEXT DEFAULT '',
        address TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS proposals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        public_token TEXT UNIQUE NOT NULL,
        valid_until DATE DEFAULT NULL,
        notes TEXT DEFAULT '',
        payment_terms TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (client_id)
            REFERENCES clients(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proposal_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposal_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        quantity REAL NOT NULL DEFAULT 1,
        unit_price REAL NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (proposal_id)
            REFERENCES proposals(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS proposal_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proposal_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price REAL NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,

        FOREIGN KEY (proposal_id)
            REFERENCES proposals(id)
            ON DELETE CASCADE
    );
`);

const settingsColumns = db
    .prepare("PRAGMA table_info(settings)")
    .all()
    .map(column => column.name);

const settingsMigrations = [
    ["language", "TEXT NOT NULL DEFAULT 'en'"],
    ["currency", "TEXT NOT NULL DEFAULT 'USD'"],
    ["currency_symbol", "TEXT NOT NULL DEFAULT '$'"],
    ["currency_position", "TEXT NOT NULL DEFAULT 'before'"],
    ["tax_rate", "REAL NOT NULL DEFAULT 0"],
    ["tax_name", "TEXT NOT NULL DEFAULT 'Tax'"],
    ["company_email", "TEXT DEFAULT ''"],
    ["company_phone", "TEXT DEFAULT ''"],
    ["company_website", "TEXT DEFAULT ''"],
    ["company_address", "TEXT DEFAULT ''"],
    ["logo_path", "TEXT DEFAULT ''"],
    ["primary_color", "TEXT DEFAULT '#2563eb'"],
    ["created_at", "DATETIME"],
    ["updated_at", "DATETIME"]
];

for (const [name, definition] of settingsMigrations) {
    if (!settingsColumns.includes(name)) {
        db.exec(`ALTER TABLE settings ADD COLUMN ${name} ${definition}`);
    }
}

db.prepare(`
    UPDATE settings
    SET
        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
`).run();

const settings = db
    .prepare("SELECT id FROM settings LIMIT 1")
    .get();

if (!settings) {
    db.prepare(`
        INSERT INTO settings (
            company_name,
            language,
            currency,
            currency_symbol,
            currency_position,
            tax_rate,
            tax_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        "My Company",
        "en",
        "USD",
        "$",
        "before",
        0,
        "Tax"
    );
}

module.exports = db;


