# BPQL (Boilerplate Query Language) Guide

BPQL is an advanced built-in Business Intelligence (BI) and custom data storage engine. It provides Tableau and Power BI-like capabilities natively within the application. 

With BPQL, tenants can build custom data structures on the fly, query them via a JSON-based query language, build dynamic visualizations, and pin them directly to their tenant Dashboard.

## 1. Custom Tables (Data Storage)
Rather than relying solely on the pre-defined application schema, BPQL allows you to create **Custom Tables**. 
- Each table is defined by a schema of `fields` (e.g., text, number, date, boolean, select).
- Rows of data are stored generically as JSON blobs in the `bpql_rows` table.
- Use the **BPQL -> Data** UI tab to define a table, edit its structure, and insert or update row data manually or programmatically.

## 2. Advanced Querying & BI Features
BPQL supports a robust query syntax for querying your custom data. 
- **Where Clauses**: You can filter on any custom field using operators such as `equals`, `contains`, `greaterThan`, `blank`, etc.
- **Saved Queries**: Just like in modern BI tools, you can save complex filter and sort configurations. This is useful for quickly referencing frequently used slices of data (e.g., "Enterprise Deals Over $35k").

## 3. Visualization and Charts
The power of BPQL comes from its aggregation engine. The **BPQL -> Charts** tab provides a drag-and-drop-like interface to create visual representations of your data.
- **Chart Types**: Choose from Bar, Line, Area, Pie, KPI (Number), and Data Table.
- **Aggregations**: Aggregate metrics using functions like `sum`, `avg`, `min`, `max`, or `count`.
- **Grouping**: Group data by dimensional fields (e.g., group sales by `status`, or traffic by `source`).
- **Dynamic Connection**: A chart can optionally be bound to a Saved Query. If the underlying Saved Query is modified, all charts bound to it automatically update their base filters.

## 4. Dashboard Integration
You can elevate important metrics out of the BPQL module and onto the main application Dashboard.
- When creating or editing a BPQL Chart, set its **Placement** property to `dashboard`.
- The chart will instantly appear in the "Dashboard KPIs & Charts" section on the main overview screen.
- You can control the relative ordering of charts on the dashboard using the `order` property.

## 5. API Usage & Seeding Data
BPQL is fully programmatic. You can push data from external systems into your tenant's BPQL tables using standard REST API calls. 

Example (Seeding a row):
```bash
POST /api/v1/tenant-demo/bpql/tables/sales_crm/rows
Content-Type: application/json
Authorization: Bearer <token>

{
  "data": {
    "leadName": "Acme Corp",
    "status": "Qualified",
    "dealSize": 45000,
    "isEnterprise": true
  }
}
```

A dummy data seeder script is provided in the repository to demonstrate this capability. Run `pnpm run seed:bpql` to automatically configure a "Sales CRM" and "Website Traffic" table with generated data and dashboard charts.
