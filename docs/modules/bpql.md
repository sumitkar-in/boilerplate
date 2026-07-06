# BPQL Module

The **BPQL (Boilerplate Query Language)** module provides advanced, dynamic query capabilities across the boilerplate.

## Overview
BPQL is designed to handle complex filtering, searching, and aggregation requests that standard CRUD endpoints might not cover natively without extensive manual wiring. It acts as an interface to build dynamic queries on top of the Drizzle ORM layer safely.

## Key Features
- **Dynamic Filtering:** Evaluate complex ASTs or filter objects passed from the client into SQL `WHERE` clauses securely.
- **Cross-Module Querying:** Allows authorized requests to fetch and shape data dynamically.
- **Pagination & Sorting:** Integrates seamlessly with the standard `listAndCount` paradigms defined in the core query utilities.

## Extension
If you are adding complex analytics or advanced filtering to a new module, you can leverage the BPQL parser and utilities to dynamically construct safe SQL conditions without exposing the underlying database schema.
