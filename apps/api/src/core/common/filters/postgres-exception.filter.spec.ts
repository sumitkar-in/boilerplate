import {
  BadRequestException,
  ConflictException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import {
  extractPgError,
  PostgresExceptionFilter,
} from './postgres-exception.filter';

function pgError(
  code: string,
  extra: Partial<{ table: string; detail: string; constraint: string }> = {},
): Error {
  const err = new Error('db error') as Error & Record<string, unknown>;
  err.code = code;
  Object.assign(err, extra);
  return err;
}

describe('extractPgError', () => {
  it('finds the code on a raw pg error', () => {
    expect(extractPgError(pgError('23505'))?.code).toBe('23505');
  });

  it('finds the code through a cause chain (DrizzleQueryError shape)', () => {
    const wrapped = new Error('Failed query');
    (wrapped as Error & { cause?: unknown }).cause = pgError('23503');
    expect(extractPgError(wrapped)?.code).toBe('23503');
  });

  it('returns undefined for non-pg errors', () => {
    expect(extractPgError(new Error('nope'))).toBeUndefined();
    expect(extractPgError(undefined)).toBeUndefined();
    expect(extractPgError('string')).toBeUndefined();
  });
});

describe('PostgresExceptionFilter', () => {
  let filter: PostgresExceptionFilter;
  let forwarded: unknown[];

  beforeEach(() => {
    filter = new PostgresExceptionFilter();
    forwarded = [];
    // Capture what the base filter would render instead of exercising HTTP.
    jest
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(filter)) as {
          catch: (exception: unknown, host: ArgumentsHost) => void;
        },
        'catch',
      )
      .mockImplementation(function (this: unknown, exception: unknown) {
        forwarded.push(exception);
      });
  });

  const host = {} as ArgumentsHost;

  it('maps 23505 to 409 with an entity/column-aware message', () => {
    filter.catch(
      pgError('23505', {
        table: 'departments',
        detail: 'Key (name)=(Engineering) already exists.',
      }),
      host,
    );
    const mapped = forwarded[0] as ConflictException;
    expect(mapped).toBeInstanceOf(ConflictException);
    expect(mapped.message).toBe('A department with this name already exists');
  });

  it('maps 23505 without table/detail to a generic 409', () => {
    filter.catch(pgError('23505'), host);
    expect(forwarded[0]).toBeInstanceOf(ConflictException);
  });

  it('maps 23503 to 409 and 23514/22P02 to 400', () => {
    filter.catch(pgError('23503'), host);
    filter.catch(pgError('23514'), host);
    filter.catch(pgError('22P02'), host);
    expect(forwarded[0]).toBeInstanceOf(ConflictException);
    expect(forwarded[1]).toBeInstanceOf(BadRequestException);
    expect(forwarded[2]).toBeInstanceOf(BadRequestException);
  });

  it('passes HttpExceptions through untouched', () => {
    const original = new NotFoundException('Note not found');
    filter.catch(original, host);
    expect(forwarded[0]).toBe(original);
  });

  it('passes unknown errors through untouched', () => {
    const original = new Error('boom');
    filter.catch(original, host);
    expect(forwarded[0]).toBe(original);
    expect(forwarded[0]).not.toBeInstanceOf(HttpException);
  });
});
