import { API_BASE_URL } from './apiBaseUrl';

// Sends a request to the API and returns the JSON response.
// Adds the bearer token when one is given. Throws the server's error message
// when the response isn't OK, with the HTTP status on error.status.
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error ?? `Server returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}
