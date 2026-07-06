import http from 'k6/http';
import { check } from 'k6';
import { config } from './config.js';

export function makeRequest(method, endpoint, payload = null, headers = {}) {
  const url = `${config.baseUrl}${endpoint}`;

  const params = {
    timeout: '180s',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  let res;
  if (method.toUpperCase() === 'GET') {
    res = http.get(url, params);
  } else if (method.toUpperCase() === 'POST') {
    res = http.post(url, payload ? JSON.stringify(payload) : null, params);
  } else if (method.toUpperCase() === 'PATCH') {
    res = http.patch(url, payload ? JSON.stringify(payload) : null, params);
  } else if (method.toUpperCase() === 'DELETE') {
    res = http.del(url, payload ? JSON.stringify(payload) : null, params);
  }

  if (!res) {
    console.error(`Request failed: ${method} ${url} - no response`);
    return null;
  }

  if (res.status >= 400) {
    console.error(`Request failed: ${method} ${url} - Status: ${res.status} - Body: ${res.body}`);
  }

  return res;
}

export function jsonOrNull(res, selector = undefined) {
  if (!res || !res.body) return null;
  try {
    return selector === undefined ? res.json() : res.json(selector);
  } catch (err) {
    console.error(`Could not parse JSON response: ${err}`);
    return null;
  }
}
