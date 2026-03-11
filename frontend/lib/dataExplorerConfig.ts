/**
 * Data Explorer configuration — allowed schemas and SQL validation.
 */

export const ALLOWED_SCHEMAS = [
  "public",
  "dbt",
  "dbt_pjm_v1_2026_feb_19",
  "positions_and_trades_v1_2026_feb_03",
  "logging",
  "gas_ebbs",
] as const;

export type AllowedSchema = (typeof ALLOWED_SCHEMAS)[number];

export function isAllowedSchema(schema: string): schema is AllowedSchema {
  return (ALLOWED_SCHEMAS as readonly string[]).includes(schema);
}

/** Characters allowed in table/schema identifiers (prevents injection). */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function isSafeIdentifier(name: string): boolean {
  return SAFE_IDENTIFIER.test(name);
}

/** Forbidden SQL keywords that indicate write operations. */
const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "CREATE",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "EXECUTE",
  "CALL",
  "DO",
  "LOCK",
  "VACUUM",
  "REINDEX",
  "CLUSTER",
  "REFRESH",
  "COMMENT",
  "SECURITY",
  "SET ROLE",
  "RESET ROLE",
] as const;

/**
 * Validates that a SQL string is read-only.
 * Returns an error message if invalid, or null if OK.
 */
export function validateReadOnlySql(sql: string): string | null {
  const trimmed = sql.trim();
  if (!trimmed) return "SQL query cannot be empty.";

  const upper = trimmed.toUpperCase();

  // Must start with SELECT or WITH (CTE)
  if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
    return "Only SELECT queries are allowed. Query must start with SELECT or WITH.";
  }

  // Check for forbidden keywords
  for (const kw of FORBIDDEN_KEYWORDS) {
    // Match keyword as a whole word (not inside an identifier)
    const regex = new RegExp(`\\b${kw}\\b`, "i");
    if (regex.test(trimmed)) {
      return `Forbidden keyword detected: ${kw}. Only read-only queries are allowed.`;
    }
  }

  return null;
}

export const DEFAULT_ROW_LIMIT = 5_000;
export const MAX_ROW_LIMIT = 10_000;
export const QUERY_TIMEOUT_SECONDS = 60;
