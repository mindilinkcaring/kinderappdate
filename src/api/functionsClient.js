const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function parseResponse(response) {
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'בעיית חיבור, נסה שוב');
  }

  return payload;
}

export async function invokeSearchPerson(payload) {
  const response = await fetch(`${API_BASE_URL}/functions/searchPerson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function invokeUpdatePerson(payload) {
  const response = await fetch(`${API_BASE_URL}/functions/updatePerson`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}