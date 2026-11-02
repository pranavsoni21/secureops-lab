const { getDb } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Snippet {
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  /**
   * List all snippets with optional filters.
   * @param {{ search?: string, tag?: string, favoritesOnly?: boolean, sortBy?: string, order?: string }} opts
   */
  static findAll({ search, tag, favoritesOnly, sortBy = 'updated_at', order = 'DESC' } = {}) {
    const db = getDb();
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push("(title LIKE ? OR description LIKE ? OR code LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    if (tag) {
      conditions.push("tags LIKE ?");
      params.push(`%"${tag}"%`);
    }

    if (favoritesOnly) {
      conditions.push("is_favorite = 1");
    }

    const allowedSort = ['title', 'created_at', 'updated_at', 'run_count'];
    const safeSort = allowedSort.includes(sortBy) ? sortBy : 'updated_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM snippets ${where} ORDER BY ${safeSort} ${safeOrder}`;

    return db.prepare(sql).all(...params);
  }

  /**
   * Find a single snippet by id.
   */
  static findById(id) {
    return getDb().prepare('SELECT * FROM snippets WHERE id = ?').get(id);
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  static create({ title, description = '', code, language = 'javascript', tags = [] }) {
    const db = getDb();
    const id = uuidv4();
    db.prepare(`
      INSERT INTO snippets (id, title, description, code, language, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, title, description, code, language, JSON.stringify(tags));
    return this.findById(id);
  }

  static update(id, fields) {
    const db = getDb();
    const allowed = ['title', 'description', 'code', 'language', 'tags', 'is_favorite'];
    const sets = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(key === 'tags' ? JSON.stringify(fields[key]) : fields[key]);
      }
    }

    if (sets.length === 0) return this.findById(id);

    sets.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE snippets SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return this.findById(id);
  }

  static delete(id) {
    const info = getDb().prepare('DELETE FROM snippets WHERE id = ?').run(id);
    return info.changes > 0;
  }

  static incrementRunCount(id) {
    getDb()
      .prepare("UPDATE snippets SET run_count = run_count + 1, last_run_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
      .run(id);
  }

  static toggleFavorite(id) {
    getDb()
      .prepare("UPDATE snippets SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = datetime('now') WHERE id = ?")
      .run(id);
    return this.findById(id);
  }

  // -------------------------------------------------------------------------
  // Execution log helpers
  // -------------------------------------------------------------------------

  static logExecution({ snippetId, code, output, error, durationMs }) {
    getDb().prepare(`
      INSERT INTO execution_logs (snippet_id, code, output, error, duration_ms)
      VALUES (?, ?, ?, ?, ?)
    `).run(snippetId || null, code, output || null, error || null, durationMs);
  }

  static getExecutionHistory(snippetId, limit = 20) {
    return getDb()
      .prepare('SELECT * FROM execution_logs WHERE snippet_id = ? ORDER BY executed_at DESC LIMIT ?')
      .all(snippetId, limit);
  }

  static getStats() {
    const db = getDb();
    const totalSnippets = db.prepare('SELECT COUNT(*) AS cnt FROM snippets').get().cnt;
    const totalRuns = db.prepare('SELECT COALESCE(SUM(run_count), 0) AS cnt FROM snippets').get().cnt;
    const totalLogs = db.prepare('SELECT COUNT(*) AS cnt FROM execution_logs').get().cnt;
    const favorites = db.prepare('SELECT COUNT(*) AS cnt FROM snippets WHERE is_favorite = 1').get().cnt;
    return { totalSnippets, totalRuns, totalLogs, favorites };
  }
}

module.exports = Snippet;
