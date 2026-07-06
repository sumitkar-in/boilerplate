---
name: k6-testing
description: Generates k6 end-to-end performance and functional tests. Use this skill when asked to add tests for any module using k6, or when building load tests.
---

# k6 Testing Guidelines

When the user requests to create or add k6 tests for modules, follow these instructions to maintain consistency across the test suite.

## Directory Structure
All k6 testing assets are located in `tests/k6`. 
- `tests/k6/utils/`: Shared utilities like `api.js` (for HTTP wrappers), `config.js` (for environment configurations), and `auth.js` (for login/impersonation logic).
- `tests/k6/scenarios/`: Modular scenario scripts where each file corresponds to a module (e.g. `tenant.js`, `department.js`, `employee.js`).
- `tests/k6/main.js`: The central orchestrator script that ties scenarios together and specifies VU/iteration profiles.

## Writing Scenarios
When adding tests for a new module, create a new file in `tests/k6/scenarios/<module>.js`.
1. Use `import { check } from 'k6';`
2. Use `import { makeRequest } from '../utils/api.js';`
3. Write functions for each CRUD operation.
4. Each function must validate the HTTP response using `check()`.
5. Return the parsed JSON response body when needed for downstream operations (e.g., returning an `id` to use in an update/delete call).

Example:
```javascript
import { check } from 'k6';
import { makeRequest } from '../utils/api.js';

export function createItem(token, tenantId, payload) {
  const res = makeRequest('POST', '/items', payload, {
    Authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
  });
  
  check(res, {
    'item created': (r) => r.status === 201,
  });
  
  return res.json();
}
```

## Adding to Main
1. Import your scenario functions into `tests/k6/main.js`.
2. In the `default(data)` function, invoke your CRUD functions sequentially, passing the necessary authentication tokens and tenant IDs.
3. Manage inter-dependencies (e.g., waiting for an item to be created before updating it).

## Reporting
The `handleSummary` function in `main.js` automatically hooks into the `benc-uk/k6-reporter` to generate a `summary.html` report. Do not modify this unless instructed by the user to change reporting tools.
