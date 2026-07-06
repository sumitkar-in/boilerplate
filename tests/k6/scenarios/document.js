import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createSpace(token, tenantId, index) {
  const payload = {
    key: `SP${__VU}${__ITER}${index}`,
    name: `Space ${index} ${__VU} ${__ITER}`,
    description: `k6 document space ${index}`,
  };

  const res = makeRequest('POST', '/documents/spaces', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'space created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listSpaces(token, tenantId) {
  const res = makeRequest('GET', '/documents/spaces', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'spaces listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function createPage(token, tenantId, spaceId, index) {
  const payload = {
    spaceId,
    title: `Page ${index} ${__VU} ${__ITER}`,
    content: `Content for page ${index}`,
  };

  const res = makeRequest('POST', '/documents/pages', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'page created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listPages(token, tenantId) {
  const res = makeRequest('GET', '/documents/pages', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'pages listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updatePage(token, tenantId, pageId) {
  const payload = {
    content: `Updated content for page ${pageId}`,
  };

  const res = makeRequest('PATCH', `/documents/pages/${pageId}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'page updated': (r) => r && r.status === 200,
  });
}

export function deletePage(token, tenantId, pageId) {
  const res = makeRequest('DELETE', `/documents/pages/${pageId}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'page deleted': (r) => r && r.status === 200,
  });
}
