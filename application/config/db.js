const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'playground.db');

let db;

/**
 * Returns the singleton database connection, creating it on first call.
 */
function getDb() {
  if (!db) {
    const fs = require('fs');
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Creates tables and seed data (idempotent).
 */
function initializeDatabase() {
  const conn = getDb();

  conn.exec(`
    CREATE TABLE IF NOT EXISTS snippets (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT DEFAULT '',
      code        TEXT NOT NULL,
      language    TEXT NOT NULL DEFAULT 'javascript',
      tags        TEXT DEFAULT '[]',
      is_favorite INTEGER DEFAULT 0,
      run_count   INTEGER DEFAULT 0,
      last_run_at TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS execution_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      snippet_id  TEXT,
      code        TEXT NOT NULL,
      output      TEXT,
      error       TEXT,
      duration_ms INTEGER,
      executed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (snippet_id) REFERENCES snippets(id) ON DELETE SET NULL
    );
  `);

  // Seed a couple of example snippets if the table is empty
  const count = conn.prepare('SELECT COUNT(*) AS cnt FROM snippets').get().cnt;
  if (count === 0) {
    const { v4: uuidv4 } = require('uuid');
    const insert = conn.prepare(`
      INSERT INTO snippets (id, title, description, code, tags)
      VALUES (?, ?, ?, ?, ?)
    `);

    insert.run(
      uuidv4(),
      'Fibonacci Generator',
      'Generate the first N Fibonacci numbers using a generator function.',
      `function* fibonacci(n) {\n  let [a, b] = [0, 1];\n  for (let i = 0; i < n; i++) {\n    yield a;\n    [a, b] = [b, a + b];\n  }\n}\n\nconst fibs = [...fibonacci(15)];\nconsole.log('First 15 Fibonacci numbers:');\nconsole.log(fibs.join(', '));`,
      '["algorithms","generators"]'
    );

    insert.run(
      uuidv4(),
      'Array Utilities',
      'Handy array helper functions – chunk, unique, flatten, groupBy.',
      `const chunk = (arr, size) => {\n  const result = [];\n  for (let i = 0; i < arr.length; i += size) {\n    result.push(arr.slice(i, i + size));\n  }\n  return result;\n};\n\nconst unique = arr => [...new Set(arr)];\n\nconst flatten = arr => arr.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);\n\nconst groupBy = (arr, fn) =>\n  arr.reduce((acc, item) => {\n    const key = typeof fn === 'function' ? fn(item) : item[fn];\n    (acc[key] = acc[key] || []).push(item);\n    return acc;\n  }, {});\n\n// --- Demo ---\nconsole.log('chunk([1..8], 3):', JSON.stringify(chunk([1,2,3,4,5,6,7,8], 3)));\nconsole.log('unique:', unique([1,2,2,3,3,3]));\nconsole.log('flatten:', flatten([1,[2,[3,[4]]]]));\nconsole.log('groupBy length:', JSON.stringify(groupBy(['one','two','three','four'], w => w.length)));`,
      '["arrays","utilities"]'
    );

    insert.run(
      uuidv4(),
      'Promise Chain Demo',
      'Demonstrates async workflows with Promises and async/await.',
      `function delay(ms, value) {\n  return new Promise(resolve => setTimeout(() => resolve(value), ms));\n}\n\nasync function pipeline() {\n  console.log('Starting pipeline...');\n\n  const step1 = await delay(100, 'Step 1 done');\n  console.log(step1);\n\n  const step2 = await delay(100, 'Step 2 done');\n  console.log(step2);\n\n  const results = await Promise.all([\n    delay(50, 'Parallel A'),\n    delay(80, 'Parallel B'),\n    delay(30, 'Parallel C'),\n  ]);\n  console.log('Parallel results:', results.join(', '));\n\n  console.log('Pipeline complete!');\n}\n\npipeline();`,
      '["async","promises"]'
    );

    console.log('[DB] Seeded 3 example snippets');
  }

  console.log('[DB] Database initialised at', DB_PATH);
}

module.exports = { getDb, initializeDatabase };
