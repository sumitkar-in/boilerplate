import { check } from 'k6';
import { jsonOrNull, makeRequest } from '../utils/api.js';

export function createTaskProject(token, tenantId, index) {
  const payload = {
    name: `Project ${index} ${__VU} ${__ITER}`,
    code: `P${__VU}${__ITER}${index}`,
  };

  const res = makeRequest('POST', '/tasks/projects', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'task project created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listTaskProjects(token, tenantId) {
  const res = makeRequest('GET', '/tasks/projects', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'task projects listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function createTask(token, tenantId, projectId, index) {
  const payload = {
    projectId,
    title: `Task ${index} ${__VU} ${__ITER}`,
    description: `Task description ${index}`,
  };

  const res = makeRequest('POST', '/tasks', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'task created': (r) => r && r.status === 201,
  });

  return jsonOrNull(res);
}

export function listTasks(token, tenantId) {
  const res = makeRequest('GET', '/tasks', null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'tasks listed': (r) => r && r.status === 200,
  });

  return jsonOrNull(res);
}

export function updateTask(token, tenantId, taskId) {
  const payload = {
    description: `Updated description ${taskId}`,
  };

  const res = makeRequest('PATCH', `/tasks/${taskId}`, payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'task updated': (r) => r && r.status === 200,
  });
}

export function deleteTask(token, tenantId, taskId) {
  const res = makeRequest('DELETE', `/tasks/${taskId}`, null, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });

  check(res, {
    'task deleted': (r) => r && r.status === 200,
  });
}
