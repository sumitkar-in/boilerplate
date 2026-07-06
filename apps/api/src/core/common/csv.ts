// Minimal RFC 4180 CSV helpers shared by import/export workers — kept
// dependency-free on purpose.

// Cells opened in Excel/Sheets are treated as formulas if they start with
// one of these characters — prefixing with a single quote forces them to
// be read as literal text and neutralizes CSV/spreadsheet formula injection.
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

function escapeCsvValue(value: string): string {
  const safeValue = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safeValue)) return `"${safeValue.replace(/"/g, '""')}"`;
  return safeValue;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
}

/** Parses CSV text (quoted fields, embedded commas/newlines, BOM) into rows. Blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
}
