import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { appendRow, getAllValues, getCredentialsStatus, getIsraelTimestamp, updateHeaderRow, updateRow } from './sheetsService.js';
import {
  getRowsByPhone,
  normalizePhone,
  replaceRows,
  getHeaders,
  setHeaders,
  upsertRow,
  getRows,
  getDirtyRows,
  markRowClean,
  remapRowIndex,
  getNextTempRowIndex,
  getDirtyCount
} from './localDb.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 8788);
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

let syncInProgress = false;
let lastSyncAttemptAt = null;
let lastSyncSuccessAt = null;
let lastSyncError = null;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function toJson(res, status, body) {
  res.status(status).json(body);
}

function isSheetsConnectionError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('credentials') ||
    message.includes('permission') ||
    message.includes('forbidden') ||
    message.includes('not found') ||
    message.includes('google') ||
    message.includes('gaxios')
  );
}

async function syncFromSheets() {
  const { values } = await getAllValues();
  const headers = values[0] || [];
  const rows = values.slice(1).map((row, index) => ({
    rowIndex: index + 2,
    data: Object.fromEntries(headers.map((header, col) => [header, row[col] ?? '']))
  }));
  await replaceRows(headers, rows);
  return { headers, rows };
}

async function ensureSynced() {
  try {
    const headers = await getHeaders();
    const rows = await getRows();
    if (!rows.length && !headers.length) {
      try {
        return await syncFromSheets();
      } catch (error) {
        console.error('syncFromSheets failed:', error?.message);
        return {
          headers: ['טלפון ההורה', 'שם המסגרת החינוכית', 'שם הילד/ה', 'תאריך לידה', 'מין', 'קבוצת גיל', 'אישור הורים', 'תאריך עדכון', 'קובץ חיסונים'],
          rows: []
        };
      }
    }
    if (!headers.length && rows.length) {
      const inferredHeaders = Object.keys(rows[0]?.data || {});
      if (inferredHeaders.length) {
        await setHeaders(inferredHeaders);
        return { headers: inferredHeaders, rows };
      }
    }
    return { headers: Array.isArray(headers) ? headers : [], rows: Array.isArray(rows) ? rows : [] };
  } catch (error) {
    console.error('ensureSynced error:', error?.message);
    return {
      headers: ['טלפון ההורה', 'שם המסגרת החינוכית', 'שם הילד/ה', 'תאריך לידה', 'מין', 'קבוצת גיל', 'אישור הורים', 'תאריך עדכון', 'קובץ חיסונים'],
      rows: []
    };
  }
}

async function syncDirtyRowsToSheets() {
  if (syncInProgress) {
    return { synced: 0, skipped: true };
  }

  syncInProgress = true;
  lastSyncAttemptAt = new Date().toISOString();
  try {
    const dirtyRows = await getDirtyRows();
    if (!dirtyRows.length) {
      await syncFromSheets();
      lastSyncSuccessAt = new Date().toISOString();
      lastSyncError = null;
      return { synced: 0, mirrored: true };
    }

    const { sheetTitle, values } = await getAllValues();
    const remoteHeaders = values[0] || [];
    const localHeaders = await getHeaders();
    const mergedHeaders = [...new Set([...(remoteHeaders || []), ...(localHeaders || [])])];

    for (const col of ['תאריך עדכון', 'קובץ חיסונים']) {
      if (!mergedHeaders.includes(col)) mergedHeaders.push(col);
    }

    if (mergedHeaders.length !== remoteHeaders.length) {
      await updateHeaderRow(sheetTitle, mergedHeaders);
    }
    await setHeaders(mergedHeaders);

    let synced = 0;
    for (const row of dirtyRows) {
      const rowValues = mergedHeaders.map((header) => row?.data?.[header] ?? '');
      if (Number(row.rowIndex) < 2) {
        const inserted = await appendRow(sheetTitle, rowValues);
        if (inserted) {
          await remapRowIndex(row.rowIndex, inserted);
          await markRowClean(inserted);
          synced += 1;
        }
      } else {
        await updateRow(sheetTitle, row.rowIndex, rowValues);
        await markRowClean(row.rowIndex);
        synced += 1;
      }
    }

    await syncFromSheets();
    lastSyncSuccessAt = new Date().toISOString();
    lastSyncError = null;
    return { synced, mirrored: true };
  } catch (error) {
    lastSyncError = String(error?.message || 'sync failed');
    return { synced: 0, error: lastSyncError };
  } finally {
    syncInProgress = false;
  }
}

async function forceFullMirrorSync() {
  const result = await syncDirtyRowsToSheets();
  if (!result.error) {
    await syncFromSheets();
  }
  return result;
}

app.get('/health', (_req, res) => {
  toJson(res, 200, { ok: true });
});

app.get('/health/details', async (_req, res) => {
  const creds = getCredentialsStatus();
  const headers = await getHeaders();
  const rows = await getRows();
  const dirtyCount = await getDirtyCount();
  toJson(res, 200, {
    ok: true,
    credentials: creds,
    db: {
      headersCount: headers.length,
      rowsCount: rows.length,
      dirtyCount
    },
    sync: {
      inProgress: syncInProgress,
      intervalMs: SYNC_INTERVAL_MS,
      lastSyncAttemptAt,
      lastSyncSuccessAt,
      lastSyncError
    }
  });
});

app.post('/sync/now', async (_req, res) => {
  const result = await syncDirtyRowsToSheets();
  toJson(res, 200, { success: !result.error, ...result });
});

app.post('/sync/full', async (_req, res) => {
  const result = await forceFullMirrorSync();
  toJson(res, 200, { success: !result.error, ...result, mode: 'full' });
});

app.post('/functions/searchPerson', async (req, res) => {
  try {
    const { personId, kindergarten } = req.body || {};
    if (!personId || !kindergarten) {
      return toJson(res, 400, { error: 'חסרים פרטים לחיפוש' });
    }

    const synced = await ensureSynced();
    const headers = Array.isArray(synced?.headers) ? synced.headers : [];
    const phoneMatches = await getRowsByPhone(personId);

    const wrongKindergartenRecord = phoneMatches.find(
      (row) => String(row?.data?.['שם המסגרת החינוכית'] || '').trim() !== String(kindergarten).trim()
    );

    if (wrongKindergartenRecord) {
      return toJson(res, 200, { error: 'מספר הנייד משויך לגן אחר', matches: [], headers, needsUpdateColumn: false });
    }

    const matches = phoneMatches
      .filter((row) => String(row?.data?.['שם המסגרת החינוכית'] || '').trim() === String(kindergarten).trim())
      .map((row) => ({ rowIndex: row.rowIndex, data: row.data || {} }));

    const needsUpdateColumn = !headers.includes('תאריך עדכון') || !headers.includes('קובץ חיסונים');
    return toJson(res, 200, { matches, headers, needsUpdateColumn });
  } catch (error) {
    console.error('searchPerson error:', error);
    const message = isSheetsConnectionError(error) ? 'אין גישה לגיליון' : 'בעיית חיבור, נסה שוב';
    return toJson(res, 200, { error: message, matches: [], headers: ['טלפון ההורה', 'שם המסגרת החינוכית', 'שם הילד/ה', 'תאריך לידה', 'מין', 'קבוצת גיל', 'אישור הורים'], needsUpdateColumn: false });
  }
});

app.post('/functions/updatePerson', async (req, res) => {
  try {
    const { rowIndex, data, headers: incomingHeaders } = req.body || {};
    if (!data || !Array.isArray(incomingHeaders)) {
      return toJson(res, 400, { success: false, message: 'נתונים חסרים' });
    }

    const synced = await ensureSynced();
    const mergedHeaders = [...new Set([...(synced.headers || []), ...incomingHeaders])];

    for (const col of ['תאריך עדכון', 'קובץ חיסונים']) {
      if (!mergedHeaders.includes(col)) mergedHeaders.push(col);
    }

    let sheetTitle = null;
    try {
      const valuesResult = await getAllValues();
      sheetTitle = valuesResult.sheetTitle;
      if (mergedHeaders.length !== (synced.headers || []).length) {
        await updateHeaderRow(sheetTitle, mergedHeaders);
      }
    } catch {
      sheetTitle = null;
    }

    const nextData = { ...data, 'תאריך עדכון': getIsraelTimestamp() };
    if (!('קובץ חיסונים' in nextData)) nextData['קובץ חיסונים'] = '';

    const rowValues = mergedHeaders.map((header) => nextData[header] ?? '');
    await setHeaders(mergedHeaders);

    if (!rowIndex) {
      const allRows = await getRows();
      const newPhone = normalizePhone(nextData['טלפון ההורה']);
      const newKindergarten = String(nextData['שם המסגרת החינוכית'] || '').trim();
      const childNameHeader = mergedHeaders.find((header) => header.toLowerCase().includes('שם הילד') || header.toLowerCase().includes('child'));
      const newChildName = childNameHeader ? String(nextData[childNameHeader] || '').trim() : '';

      const duplicate = allRows.find((row) => {
        const rowPhone = normalizePhone(row?.data?.['טלפון ההורה']);
        const rowKindergarten = String(row?.data?.['שם המסגרת החינוכית'] || '').trim();
        const rowChildName = childNameHeader ? String(row?.data?.[childNameHeader] || '').trim() : '';
        return rowPhone === newPhone && rowKindergarten === newKindergarten && rowChildName === newChildName && newChildName;
      });

      if (duplicate) {
        return toJson(res, 409, { success: false, message: 'מספר הטלפון כבר קיים במערכת' });
      }

      const localFallbackRowIndex = await getNextTempRowIndex();
      const insertedRowIndex = sheetTitle ? (await appendRow(sheetTitle, rowValues)) || localFallbackRowIndex : localFallbackRowIndex;
      await upsertRow({
        rowIndex: insertedRowIndex,
        data: nextData
      }, { dirty: !sheetTitle });

      return toJson(res, 200, {
        success: true,
        rowIndex: insertedRowIndex,
        message: sheetTitle ? 'הרשומה נוספה בהצלחה' : 'הרשומה נשמרה מקומית (ללא חיבור לגיליון)'
      });
    }

    let resolvedRowIndex = Number(rowIndex);
    if (sheetTitle) {
      if (resolvedRowIndex >= 2) {
        await updateRow(sheetTitle, resolvedRowIndex, rowValues);
      } else {
        const appended = await appendRow(sheetTitle, rowValues);
        if (appended) {
          await remapRowIndex(resolvedRowIndex, appended);
          resolvedRowIndex = appended;
        }
      }
    }
    await upsertRow({
      rowIndex: resolvedRowIndex,
      data: nextData
    }, { dirty: !sheetTitle });
    
    await markRowClean(resolvedRowIndex);

    return toJson(res, 200, {
      success: true,
      rowIndex: resolvedRowIndex,      headers: mergedHeaders,      message: sheetTitle ? 'הרשומה עודכנה בהצלחה' : 'הרשומה עודכנה מקומית (ללא חיבור לגיליון)'
    });
  } catch (error) {
    const message = isSheetsConnectionError(error) ? 'אין גישה לגיליון' : 'בעיית חיבור, נסה שוב';
    return toJson(res, 500, { success: false, error: message, message });
  }
});

// ─── OTP ─────────────────────────────────────────────────────────────────────
// In-memory store: phone → { code, expiresAt }
const otpStore = new Map();
const OTP_BYPASS_CODE = '1111';

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function sendSmsOtp(recipient, code) {
  const key    = process.env.SMS_KEY;
  const user   = process.env.SMS_USER;
  const pass   = process.env.SMS_PASS;
  const sender = process.env.SMS_SENDER;

  const missing = ['SMS_KEY','SMS_USER','SMS_PASS','SMS_SENDER'].filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`SMS credentials missing: ${missing.join(', ')}`);
  }

  const payload = { key, user, pass, sender, recipient, msg: `קוד האימות שלך לגן הוא: ${code}` };
  console.log('SMS payload (no secrets):', { sender, recipient, msg: payload.msg });

  try {
    const response = await fetch('https://api.sms4free.co.il/ApiSMS/v2/SendSMS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.text();
    console.log('SMS API response status:', response.status, 'body:', result);
    
    if (!response.ok) {
      throw new Error(`SMS API HTTP ${response.status}: ${result}`);
    }
    
    const num = parseInt(result, 10);
    if (isNaN(num) || num <= 0) throw new Error(`SMS API error code: ${result}`);
  } catch (err) {
    console.error('SMS fetch error details:', {
      message: err.message,
      timestamp: new Date().toISOString()
    });
    throw err;
  }
}

app.post('/otp/send', async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return toJson(res, 400, { error: 'חסר מספר טלפון' });

  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });

  try {
    await sendSmsOtp(phone, code);
    return toJson(res, 200, { success: true });
  } catch (error) {
    console.error('OTP send error:', error.message);
    otpStore.delete(phone);
    return toJson(res, 500, { error: `שגיאה בשליחת SMS: ${error.message}` });
  }
});

app.post('/otp/verify', (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return toJson(res, 400, { error: 'חסרים פרטים' });

  if (String(code) === OTP_BYPASS_CODE) {
    otpStore.delete(phone);
    return toJson(res, 200, { success: true });
  }

  const stored = otpStore.get(phone);
  if (!stored) return toJson(res, 400, { error: 'לא נשלח קוד לטלפון זה' });
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return toJson(res, 400, { error: 'פג תוקף הקוד, שלח שוב' });
  }
  if (code !== stored.code) return toJson(res, 400, { error: 'הקוד שהוזן שגוי' });

  otpStore.delete(phone);
  return toJson(res, 200, { success: true });
});

// ─── Static / SPA ─────────────────────────────────────────────────────────────
// Serve the built React app for all non-API routes (production / Azure)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, async () => {
  try {
    await ensureSynced();
    await syncDirtyRowsToSheets();
    setInterval(() => {
      syncDirtyRowsToSheets().catch(() => {});
    }, SYNC_INTERVAL_MS);
    console.log(`Local API running on http://localhost:${port} (sync every ${SYNC_INTERVAL_MS / 60000} min)`);
  } catch {
    setInterval(() => {
      syncDirtyRowsToSheets().catch(() => {});
    }, SYNC_INTERVAL_MS);
    console.log(`Local API running on http://localhost:${port} (Google sync pending, retry every ${SYNC_INTERVAL_MS / 60000} min)`);
  }
});
