const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const { AppModule } = require(path.resolve(__dirname, 'dist/app.module.js'));

jest.setTimeout(180000);

function parseCookiesFromSetCookieHeader(setCookieValue) {
  const result = {};
  if (!setCookieValue) return result;
  const accessMatch = setCookieValue.match(/access_token=([^;]+)/);
  const refreshMatch = setCookieValue.match(/refresh_token=([^;]+)/);
  const csrfMatch = setCookieValue.match(/csrf_token=([^;]+)/);
  if (accessMatch) result.access_token = accessMatch[1];
  if (refreshMatch) result.refresh_token = refreshMatch[1];
  if (csrfMatch) result.csrf_token = csrfMatch[1];
  return result;
}

function cookieHeader(jar) {
  const parts = [];
  if (jar.access_token) parts.push(`access_token=${jar.access_token}`);
  if (jar.refresh_token) parts.push(`refresh_token=${jar.refresh_token}`);
  if (jar.csrf_token) parts.push(`csrf_token=${jar.csrf_token}`);
  return parts.join('; ');
}

async function req(base, path, { method = 'GET', body, headers = {} } = {}, jar = {}) {
  const upperMethod = method.toUpperCase();
  const needsCsrf = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(upperMethod);
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookieHeader(jar) ? { cookie: cookieHeader(jar) } : {}),
      ...(needsCsrf && jar.csrf_token && !headers['x-csrf-token']
        ? { 'x-csrf-token': jar.csrf_token }
        : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie') || ''];
  for (const setCookie of setCookies) {
    Object.assign(jar, parseCookiesFromSetCookieHeader(setCookie));
  }

  let data = null;
  try { data = await res.json(); } catch {}
  return { res, data, jar };
}

describe('Complex functional flow (Jest in-process)', () => {
  let app;
  let base;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.use(helmet());
    app.use(cookieParser());
    app.enableCors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.listen(0);
    const server = app.getHttpServer();
    const addr = server.address();
    base = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  test('tenant + worker + rename + items stock + idempotency + refresh/logout', async () => {
    const jar = {};
    const id = Date.now();
    const companyName = `PepitoSecure${id}`;
    const ownerEmail = `owner${id}@pepitosecure${id}.com`;

    let out = await req(base, '/auth/register', {
      method: 'POST',
      body: {
        email: ownerEmail,
        password: 'OwnerPass123!',
        companyName,
        country: 'PE',
        currency: 'PEN',
        timezone: 'America/Lima',
        branchName: 'Principal',
      },
    }, jar);
    expect(out.res.status).toBe(201);

    out = await req(base, '/users/profile', {}, jar);
    expect(out.res.status).toBe(200);
    const branchId = out.data?.data?.branchId;
    expect(branchId).toBeTruthy();

    const productId = `PROD-${id}`;
    out = await req(base, '/inventory/movements', {
      method: 'POST',
      body: { branchId, productId, type: 'IN', quantity: 10, unitCost: 4 },
    }, jar);
    expect(out.res.status).toBe(201);

    const idem = `idem-${id}`;
    out = await req(base, '/sales', {
      method: 'POST',
      headers: { 'idempotency-key': idem },
      body: {
        branchId,
        status: 'paid',
        items: [{ productId, quantity: 2, unitPrice: 5 }],
        total: 10,
      },
    }, jar);
    if (out.res.status !== 201) {
      // eslint-disable-next-line no-console
      console.error('SALE_CREATE_DEBUG', out.data);
    }
    expect(out.res.status).toBe(201);
    const saleId1 = out.data?.data?.id;

    out = await req(base, '/sales', {
      method: 'POST',
      headers: { 'idempotency-key': idem },
      body: {
        branchId,
        status: 'paid',
        items: [{ productId, quantity: 2, unitPrice: 5 }],
        total: 10,
      },
    }, jar);
    expect(out.res.status).toBe(201);
    expect(out.data?.data?.id).toBe(saleId1);

    out = await req(base, `/inventory/stock/${productId}?branchId=${branchId}`, {}, jar);
    expect(out.res.status).toBe(200);
    expect(Number(out.data?.data)).toBe(8);

    out = await req(base, '/sales', {
      method: 'POST',
      body: {
        branchId,
        status: 'pending',
        items: [{ productId, quantity: 1, unitPrice: 7 }],
        total: 7,
      },
    }, jar);
    expect(out.res.status).toBe(201);

    out = await req(base, `/inventory/stock/${productId}?branchId=${branchId}`, {}, jar);
    expect(Number(out.data?.data)).toBe(8);

    out = await req(base, '/reports/dashboard', {}, jar);
    expect(out.res.status).toBe(200);
    expect(Number(out.data?.data?.stats?.todayRevenue)).toBe(10);

    out = await req(base, '/users/company-users', {
      method: 'POST',
      body: { username: `juan${id}`, password: 'WorkerPass123!', role: 'employee', branchId },
    }, jar);
    expect(out.res.status).toBe(201);
    const workerId = out.data?.data?.id;

    out = await req(base, '/companies/me', {
      method: 'PATCH',
      body: { name: `PepitoNuevo${id}`, emailDomain: `pepitonuevo${id}.com` },
    }, jar);
    expect(out.res.status).toBe(200);

    out = await req(base, '/users/company-users', {}, jar);
    const worker = (out.data?.data || []).find((u) => u.id === workerId);
    expect(worker.email.endsWith(`@pepitonuevo${id}.com`)).toBe(true);

    const otherTenantJar = {};
    out = await req(base, '/auth/register', {
      method: 'POST',
      body: {
        email: `owner-other-${id}@other${id}.com`,
        password: 'OwnerPass123!',
        companyName: `Other${id}`,
        country: 'PE',
        currency: 'PEN',
        timezone: 'America/Lima',
        branchName: 'Principal',
      },
    }, otherTenantJar);
    expect(out.res.status).toBe(201);

    out = await req(base, `/sales/${saleId1}`, {}, otherTenantJar);
    expect(out.res.status).toBe(404);

    out = await req(base, `/sales/${saleId1}`, {
      method: 'PATCH',
      body: { total: 999 },
    }, otherTenantJar);
    expect(out.res.status).toBe(404);

    const oldRefresh = jar.refresh_token;
    out = await req(base, '/auth/refresh', { method: 'POST' }, jar);
    expect(out.res.status).toBe(200);
    expect(jar.refresh_token).toBeTruthy();
    expect(jar.refresh_token).not.toBe(oldRefresh);

    out = await req(base, '/auth/logout', { method: 'POST' }, jar);
    expect(out.res.status).toBe(200);

    jar.refresh_token = oldRefresh;
    out = await req(base, '/auth/refresh', { method: 'POST' }, jar);
    expect(out.res.status).toBe(401);
  });
});
