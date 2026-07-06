import { parseCsv, toCsv } from './csv';

describe('csv helpers', () => {
  it('escapes commas, quotes, and newlines when serializing', () => {
    const csv = toCsv([
      ['Name', 'Notes'],
      ['Ada, Countess', 'Said "hello"\ntwice'],
    ]);

    expect(csv).toBe('Name,Notes\r\n"Ada, Countess","Said ""hello""\ntwice"');
  });

  it('parses quoted fields with embedded commas, quotes, and newlines', () => {
    const rows = parseCsv(
      'Name,Notes\r\n"Ada, Countess","Said ""hello""\ntwice"',
    );

    expect(rows).toEqual([
      ['Name', 'Notes'],
      ['Ada, Countess', 'Said "hello"\ntwice'],
    ]);
  });

  it('round-trips through toCsv and parseCsv', () => {
    const original = [
      ['a', 'b', 'c'],
      ['1,2', '"x"', 'line\nbreak'],
      ['', 'blank first', ''],
    ];

    expect(parseCsv(toCsv(original))).toEqual(original);
  });

  it('strips a BOM and drops blank lines', () => {
    const rows = parseCsv('\uFEFFName\r\nAda\r\n\r\n');

    expect(rows).toEqual([['Name'], ['Ada']]);
  });
});
