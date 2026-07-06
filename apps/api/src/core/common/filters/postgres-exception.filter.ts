import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

type PgError = {
  code: string;
  table?: string;
  constraint?: string;
  detail?: string;
};

const PG_ERROR_CODE = /^[0-9A-Z]{5}$/;

/**
 * Walks an error and its `cause` chain looking for a Postgres error
 * (identified by its 5-char SQLSTATE `code`). Covers both raw `pg` errors
 * and drizzle's wrapped DrizzleQueryError.
 */
export function extractPgError(err: unknown): PgError | undefined {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (typeof current === 'object') {
      const candidate = current as Partial<PgError> & { cause?: unknown };
      if (
        typeof candidate.code === 'string' &&
        PG_ERROR_CODE.test(candidate.code)
      ) {
        return candidate as PgError;
      }
      current = candidate.cause;
    } else {
      return undefined;
    }
  }
  return undefined;
}

/** "Key (name)=(Engineering) already exists." -> "name" */
function columnFromDetail(detail?: string): string | undefined {
  const match = detail?.match(/^Key \(([^)]+)\)=/);
  return match?.[1];
}

/** naive singular: "departments" -> "department" (good enough for messages) */
function singularize(table?: string): string | undefined {
  if (!table) return undefined;
  return table.endsWith('s') ? table.slice(0, -1) : table;
}

function uniqueViolationMessage(pg: PgError): string {
  const entity = singularize(pg.table);
  const column = columnFromDetail(pg.detail);
  if (entity && column) {
    return `A ${entity.replaceAll('_', ' ')} with this ${column.replaceAll('_', ' ')} already exists`;
  }
  return 'A record with these unique values already exists';
}

/**
 * Global translation of Postgres constraint errors into HTTP responses,
 * so module services don't each hand-roll `err.code === '23505'` checks:
 *   23505 unique_violation      -> 409 Conflict (constraint-aware message)
 *   23503 foreign_key_violation -> 409 Conflict
 *   23514 check_violation       -> 400 Bad Request
 *   22P02 invalid_text_representation (e.g. bad uuid) -> 400 Bad Request
 * Anything else falls through to Nest's default handling.
 */
@Catch()
export class PostgresExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Never re-translate an intentional HTTP error from a service/guard.
    if (!(exception instanceof HttpException)) {
      const pg = extractPgError(exception);
      if (pg) {
        const mapped = this.mapPgError(pg);
        if (mapped) {
          super.catch(mapped, host);
          return;
        }
      }
    }
    super.catch(exception, host);
  }

  private mapPgError(pg: PgError): HttpException | undefined {
    switch (pg.code) {
      case '23505':
        return new ConflictException(uniqueViolationMessage(pg));
      case '23503':
        return new ConflictException(
          'Operation conflicts with related records',
        );
      case '23514':
        return new BadRequestException('Value violates a data constraint');
      case '22P02':
        return new BadRequestException('Malformed identifier or value');
      default:
        return undefined;
    }
  }
}
