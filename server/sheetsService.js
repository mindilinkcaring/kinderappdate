import fs from 'node:fs';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1MfSfi-RByYhfNfNIK-PmPFTw2BCVx76uinP7IlZYP4c';

export function getCredentialsStatus() {
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  return {
    hasInlineJson: Boolean(inlineJson),
    filePath: filePath || null,
    fileExists: filePath ? fs.existsSync(filePath) : false
  };
}

function getCredentials() {
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (inlineJson) {
    try {
      return JSON.parse(inlineJson);
    } catch {
      throw new Error('Invalid Google credentials JSON');
    }
  }

  if (filePath && fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      throw new Error('Invalid Google credentials JSON file');
    }
  }

  throw new Error(`Missing Google credentials: ${filePath || 'GOOGLE_APPLICATION_CREDENTIALS not set'}`);
}

async function getSheetsClient() {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  return google.sheets({ version: 'v4', auth });
}

export async function getFirstSheetTitle() {
  const sheets = await getSheetsClient();
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets(properties(title))'
  });

  return metadata.data?.sheets?.[0]?.properties?.title || 'Sheet1';
}

export async function getAllValues() {
  const sheets = await getSheetsClient();
  const sheetTitle = await getFirstSheetTitle();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A:Z`
  });

  return {
    sheetTitle,
    values: result.data.values || []
  };
}

export async function updateHeaderRow(sheetTitle, headers) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A1:Z1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] }
  });
}

export async function updateRow(sheetTitle, rowIndex, rowValues) {
  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [rowValues] }
  });
}

export async function appendRow(sheetTitle, rowValues) {
  const sheets = await getSheetsClient();
  const result = await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetTitle}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] }
  });

  const updatedRange = result.data?.updates?.updatedRange || '';
  const matched = updatedRange.match(/!(?:[A-Z]+)(\d+):/);
  return matched ? Number(matched[1]) : null;
}

export function getIsraelTimestamp() {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date());
}
