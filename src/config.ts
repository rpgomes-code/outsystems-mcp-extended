// ─────────────────────────────────────────────────────────────────────────────
// Config loader — reads env vars at startup and normalizes the tenant hostname.
//
// We require exactly one variable to run:
//   - OS_TENANT: the ODC tenant hostname (e.g. "mytenant.outsystems.dev").
//     Accepts a full URL too; we strip the scheme and trailing slash.
//
// Optional:
//   - OS_BEARER_TOKEN: a pre-seeded JWT to skip the OAuth flow at startup.
//     Useful for CI / headless environments. When this is set the server still
//     accepts `authenticate` calls — the OAuth flow just isn't required upfront.
//
// Tenant validation is intentionally permissive: we allow letters, digits,
// dots, and hyphens (the union of valid DNS labels and what ODC actually uses).
// A bogus value here will surface as a connection failure on the first REST
// call rather than a cryptic crash on startup.
// ─────────────────────────────────────────────────────────────────────────────

export interface Config {
  /** Tenant hostname with no scheme and no trailing slash. */
  tenant: string;
  /**
   * Optional bearer JWT supplied via env. When present, the token store is
   * seeded with it on startup and the `authenticate` tool becomes optional.
   */
  initialBearerToken?: string;
}

export function loadConfig(): Config {
  const tenant = process.env.OS_TENANT;
  const initialBearerToken = process.env.OS_BEARER_TOKEN;

  if (!tenant) {
    throw new Error(
      "OS_TENANT env var is required (e.g. mytenant.outsystems.dev)"
    );
  }

  // Tolerate users who paste in a full URL: strip "https://" and trailing "/".
  const cleanTenant = tenant
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .trim();

  // Cheap DNS-label sanity check. The regex covers anything that could be a
  // valid hostname; we deliberately don't pin to ".outsystems.dev" because
  // some tenants use a custom domain.
  if (!/^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(cleanTenant)) {
    throw new Error(
      `OS_TENANT looks invalid after normalization: "${cleanTenant}"`
    );
  }

  return { tenant: cleanTenant, initialBearerToken };
}
