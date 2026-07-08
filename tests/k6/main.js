/* global __VU, __ENV, console */
import { sleep } from 'k6';

import { config } from './utils/config.js';
import { htmlSummary, textSummary } from './utils/summary.js';
import { superAdminLogin } from './utils/auth.js';
import { createTenant, createTenantOwner, listTenants, tenantLogin, updateTenantStatus, deleteTenant } from './scenarios/tenant.js';
import { createDepartment, listDepartments, updateDepartment } from './scenarios/department.js';
import { createTaskProject, listTaskProjects, createTask, listTasks, updateTask } from './scenarios/task.js';
import { createNote, listNotes, updateNote } from './scenarios/note.js';
import { createSpace, listSpaces, createPage, listPages, updatePage } from './scenarios/document.js';
import { listNotifications } from './scenarios/notification.js';
import { createCustomField, listCustomFields, updateCustomField, createEmployee, listEmployees, updateEmployee } from './scenarios/employee.js';
// generated scenario imports are appended below this line — see scripts/generators/generate-k6-scenario.js

export const options = {
  scenarios: {
    setup_tenants: {
      executor: 'per-vu-iterations',
      vus: config.load.vus,
      iterations: 1,
      maxDuration: '10m',
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
    http_req_failed: ['rate==0.0'],
  },
};

export function setup() {
  const token = superAdminLogin();
  return { token };
}

export default function (data) {
  const { token } = data;

  // 1. Create a Tenant
  const tenantRes = createTenant(token, __VU);
  if (!tenantRes || !tenantRes.id) {
    console.error('Failed to create tenant, skipping VU iteration');
    return;
  }
  const tenantId = tenantRes.id;
  const tenantSlug = tenantRes.slug;

  try {
    const owner = createTenantOwner(token, tenantId, __VU);
    if (!owner || !owner.temporaryPassword) {
      console.error('Failed to create tenant owner, skipping VU iteration');
      return;
    }

    sleep((__VU - 1) * Number(__ENV.K6_LOGIN_STAGGER_SECONDS || 6.5));
    const tenantToken = tenantLogin(tenantSlug, owner.email, owner.temporaryPassword);
    if (!tenantToken) {
      console.error('Failed to login as tenant owner, skipping VU iteration');
      return;
    }

    // Verify list/update
    listTenants(token);
    updateTenantStatus(token, tenantId, 'suspended');
    updateTenantStatus(token, tenantId, 'active');

    // 2. Create 2 Custom Fields
    const customFieldKeys = [];
    for (let i = 1; i <= 2; i++) {
      const cfRes = createCustomField(tenantToken, tenantId, i);
      if (cfRes && cfRes.id) {
        customFieldKeys.push(cfRes.fieldKey);
        // Verify update
        updateCustomField(tenantToken, tenantId, cfRes.id);
      }
    }
    listCustomFields(tenantToken, tenantId);

    // 3. Create 20 Departments
    const deptIds = [];
    for (let i = 1; i <= config.load.departmentsPerTenant; i++) {
      const deptRes = createDepartment(tenantToken, tenantId, i);
      if (deptRes && deptRes.id) {
        deptIds.push(deptRes.id);
        if (i === 1) {
          updateDepartment(tenantToken, tenantId, deptRes.id);
        }
      }
    }
    listDepartments(tenantToken, tenantId);
    if (deptIds.length === 0) {
      console.error('No departments were created, skipping employee creation');
      return;
    }

    // 4. Create 100 Employees
    const empIds = [];
    for (let i = 1; i <= config.load.employeesPerTenant; i++) {
      const deptId = deptIds[i % deptIds.length];
      
      // Assign custom fields dynamically based on the keys we created
      const customFieldsPayload = {};
      customFieldKeys.forEach(key => {
        customFieldsPayload[key] = `Value ${i} for ${key}`;
      });

      const empRes = createEmployee(tenantToken, tenantId, deptId, i, customFieldsPayload);
      if (empRes && empRes.id) {
        empIds.push(empRes.id);
        if (i === 1) {
          updateEmployee(tenantToken, tenantId, empRes.id);
        }
      }
    }
    listEmployees(tenantToken, tenantId);

    // 5. Tasks
    const projRes = createTaskProject(tenantToken, tenantId, 1);
    if (!projRes || !projRes.id) {
      console.error('Failed to create task project, skipping task creation');
      return;
    }
    listTaskProjects(tenantToken, tenantId);

    const taskRes = createTask(tenantToken, tenantId, projRes.id, 1);
    if (!taskRes || !taskRes.id) {
      console.error('Failed to create task, skipping task operations');
      return;
    }
    listTasks(tenantToken, tenantId);
    updateTask(tenantToken, tenantId, taskRes.id);

    // 6. Notes
    const noteRes = createNote(tenantToken, tenantId, 1);
    if (noteRes && noteRes.id) {
      listNotes(tenantToken, tenantId);
      updateNote(tenantToken, tenantId, noteRes.id);
    }

    // 7. Documents
    const spaceRes = createSpace(tenantToken, tenantId, 1);
    if (spaceRes && spaceRes.id) {
      listSpaces(tenantToken, tenantId);
      const pageRes = createPage(tenantToken, tenantId, spaceRes.id, 1);
      if (pageRes && pageRes.id) {
        listPages(tenantToken, tenantId);
        updatePage(tenantToken, tenantId, pageRes.id);
      }
    }

    // 8. Notifications
    listNotifications(tenantToken, tenantId);

    // generated module scenario calls are inserted below this line — see scripts/generators/generate-k6-scenario.js

  } finally {
    // Delete tenant to clean up all schema data and avoid leaks
    deleteTenant(token, tenantId);
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.html': htmlSummary(data),
    stdout: textSummary(data),
  };
}
