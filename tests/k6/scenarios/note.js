import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createNote(token, tenantId, index) {
  const payload = {
    title: `Note ${index} ${__VU} ${__ITER}`,
    content: `Content for note ${index}`,
  };

  const res = makeRequest('POST', '/notes', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'note created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listNotes(token, tenantId) {
  const res = makeRequest('GET', '/notes', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'notes listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updateNote(token, tenantId, noteId) {
  const payload = {
    content: `Updated content for note ${noteId}`,
  };

  const res = makeRequest('PATCH', `/notes/${noteId}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'note updated': (r) => r && r.status === 200,
  });
}

export function deleteNote(token, tenantId, noteId) {
  const res = makeRequest('DELETE', `/notes/${noteId}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'note deleted': (r) => r && r.status === 200,
  });
}
