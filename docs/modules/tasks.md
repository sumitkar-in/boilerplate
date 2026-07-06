# Tasks Module

The **Tasks** module handles issue tracking, project management, and workflow pipelines.

## Overview
It provides a robust backend for managing tasks, assigning them to users (or Employees), tracking status, and managing sprint or kanban boards.

## Key Features
- **Status & Workflow Tracking:** Track tasks across different statuses (e.g., Todo, In Progress, Done).
- **Assignments:** Link tasks to specific tenant users or employees.
- **Kanban UI Integration:** The frontend utilizes the `page-view-kanban` pattern to render Jira-style boards with drag-and-drop functionality, compact filters, and activity streams.

## Extending Tasks
To add custom workflows or approval steps:
1. Do not break the core CRUD operations.
2. Add dedicated controller endpoints for state transitions (e.g., `POST /tasks/:id/approve`).
3. If tasks require heavy notification logic, offload the email/notification sending to BullMQ jobs in the `jobs/` directory and handle them in the worker process.
