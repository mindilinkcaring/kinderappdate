import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.cwd(), 'server/.data/localdb.sqlite');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS records (
    row_index INTEGER PRIMARY KEY,
    data_json TEXT NOT NULL,
    dirty INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
`);

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function setMeta(key, value) {
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

function getMeta(key) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row?.value ?? null;
}

function maybeMigrateFromJson() {
  const legacyPath = path.resolve(process.cwd(), 'server/.data/localdb.json');
  if (!fs.existsSync(legacyPath)) return;

  const count = db.prepare('SELECT COUNT(*) AS count FROM records').get()?.count ?? 0;
  if (count > 0) return;

  const raw = fs.readFileSync(legacyPath, 'utf8');
  const legacy = parseJson(raw, { headers: [], rows: [] });
  const headers = Array.isArray(legacy.headers) ? legacy.headers : [];
  setMeta('headers', JSON.stringify(headers));
  setMeta('lastSyncAt', new Date().toISOString());

  const insert = db.prepare('INSERT OR REPLACE INTO records (row_index, data_json, dirty, updated_at) VALUES (?, ?, ?, ?)');
  const now = new Date().toISOString();
  for (const row of legacy.rows || []) {
    const rowIndex = Number(row?.rowIndex);
    if (!Number.isFinite(rowIndex)) continue;
    insert.run(rowIndex, JSON.stringify(row?.data || {}), 1, now);
  }
}

maybeMigrateFromJson();

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export async function replaceRows(headers, rows) {
  db.exec('BEGIN');
  try {
    db.exec('DELETE FROM records');
    const insert = db.prepare('INSERT INTO records (row_index, data_json, dirty, updated_at) VALUES (?, ?, 0, ?)');
    const now = new Date().toISOString();
    for (const row of rows || []) {
      insert.run(Number(row.rowIndex), JSON.stringify(row.data || {}), now);
    }
    setMeta('headers', JSON.stringify(Array.isArray(headers) ? headers : []));
    setMeta('lastSyncAt', new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function getHeaders() {
  return parseJson(getMeta('headers') || '[]', []);
}

export async function setHeaders(headers) {
  setMeta('headers', JSON.stringify(Array.isArray(headers) ? headers : []));
  setMeta('lastSyncAt', new Date().toISOString());
}

export async function getRows() {
  const rows = db.prepare('SELECT row_index, data_json FROM records ORDER BY row_index ASC').all();
  return rows.map((row) => ({
    rowIndex: Number(row.row_index),
    data: parseJson(row.data_json, {})
  }));
}

export async function getRowsByPhone(phone) {
  const normalized = normalizePhone(phone);
  const rows = await getRows();
  return rows.filter((row) => normalizePhone(row?.data?.['טלפון ההורה']) === normalized);
}

export async function upsertRow(nextRow, options = {}) {
  const dirty = options.dirty ? 1 : 0;
  const rowIndex = Number(nextRow.rowIndex);
  db.prepare(
    'INSERT INTO records (row_index, data_json, dirty, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(row_index) DO UPDATE SET data_json = excluded.data_json, dirty = excluded.dirty, updated_at = excluded.updated_at'
  ).run(rowIndex, JSON.stringify(nextRow.data || {}), dirty, new Date().toISOString());
}

export async function getDirtyRows() {
  const rows = db.prepare('SELECT row_index, data_json FROM records WHERE dirty = 1 ORDER BY updated_at ASC').all();
  return rows.map((row) => ({
    rowIndex: Number(row.row_index),
    data: parseJson(row.data_json, {})
  }));
}

export async function markRowClean(rowIndex) {
  db.prepare('UPDATE records SET dirty = 0, updated_at = ? WHERE row_index = ?').run(new Date().toISOString(), Number(rowIndex));
  setMeta('lastSyncAt', new Date().toISOString());
}

export async function remapRowIndex(oldRowIndex, newRowIndex) {
  db.exec('BEGIN');
  try {
    const existing = db.prepare('SELECT data_json, dirty FROM records WHERE row_index = ?').get(Number(oldRowIndex));
    if (!existing) {
      db.exec('COMMIT');
      return;
    }
    db.prepare('DELETE FROM records WHERE row_index = ?').run(Number(oldRowIndex));
    db.prepare(
      'INSERT OR REPLACE INTO records (row_index, data_json, dirty, updated_at) VALUES (?, ?, ?, ?)'
    ).run(Number(newRowIndex), existing.data_json, existing.dirty, new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export async function getNextTempRowIndex() {
  const row = db.prepare('SELECT MIN(row_index) AS min_row FROM records').get();
  const minRow = Number(row?.min_row ?? 1);
  return minRow < 0 ? minRow - 1 : -1;
}

export async function getDirtyCount() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM records WHERE dirty = 1').get();
  return Number(row?.count ?? 0);
}
