export function sanitizeCompanyNameToSlug(companyName: string) {
  const slug = companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  return slug || 'empresa';
}

const DOMAIN_REGEX =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export function normalizeEmailDomain(input?: string, companyName?: string) {
  const base = (input ?? '').trim().toLowerCase();
  const derivedFromName = `${sanitizeCompanyNameToSlug(companyName ?? 'empresa')}.com`;
  const candidate = base || derivedFromName;
  const withoutAt = candidate.replace(/^@+/, '');
  return withoutAt;
}

export function isValidDomainSyntax(domain: string) {
  return DOMAIN_REGEX.test(domain);
}

export function compliesWithCompanyDomainPolicy(domain: string, companyName: string) {
  const companySlug = sanitizeCompanyNameToSlug(companyName);
  if (!domain.endsWith('.com')) return false;

  const firstLabel = domain.split('.')[0] ?? '';
  if (firstLabel === companySlug) return true;
  if (firstLabel === `${companySlug}1`) return true;
  if (firstLabel.startsWith(`${companySlug}-`)) return true;
  if (new RegExp(`^${companySlug}[0-9]+$`).test(firstLabel)) return true;

  return false;
}

export function buildCompanyEmailDomain(companyName: string) {
  return normalizeEmailDomain(undefined, companyName);
}

export function getEmailDomain(email: string) {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export function getEmailLocalPart(email: string) {
  return email.split('@')[0] ?? '';
}
