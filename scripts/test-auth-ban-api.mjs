#!/usr/bin/env node

import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';

loadEnv({ path: '.env.local' });
loadEnv();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getRefreshSecret() {
  const val = process.env.JWT_REFRESH_SECRET;
  const fallback = 'dev-refresh-secret-change-me';
  return new TextEncoder().encode(val || fallback);
}

async function mintRefreshToken(userId) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getRefreshSecret());
}

async function createTempUser(client, userId, phone) {
  await client.query(
    `INSERT INTO users (id, phone, "userType", "createdAt", "updatedAt", "bannedAt")
     VALUES ($1, $2, 'CUSTOMER', NOW(), NOW(), NOW())`,
    [userId, phone]
  );
}

async function cleanupTempUser(client, userId) {
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

async function setBanState(client, userId, banned) {
  await client.query(
    'UPDATE users SET "bannedAt" = $2, "updatedAt" = NOW() WHERE id = $1',
    [userId, banned ? new Date() : null]
  );
}

async function callSessionRefresh(refreshToken) {
  return fetch(`${BASE_URL}/api/auth/session-refresh`, {
    method: 'POST',
    headers: {
      Cookie: `sevam_refresh=${refreshToken}`,
    },
  });
}

async function main() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required for auth-ban API tests');
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const userId = `test_ban_${randomUUID().replace(/-/g, '')}`;
  const phone = `+9199${Math.floor(Math.random() * 1_0000_0000)
    .toString()
    .padStart(8, '0')}`;

  try {
    await createTempUser(client, userId, phone);
    const refreshToken = await mintRefreshToken(userId);

    const bannedRes = await callSessionRefresh(refreshToken);
    assert(
      bannedRes.status === 403,
      `Expected 403 for banned user refresh, got ${bannedRes.status}`
    );

    const bannedSetCookie = bannedRes.headers.get('set-cookie') || '';
    assert(
      bannedSetCookie.includes('sevam_session=') || bannedSetCookie.includes('sevam_refresh='),
      'Expected cookie-clearing set-cookie headers for banned refresh response'
    );

    await setBanState(client, userId, false);

    const unbannedRes = await callSessionRefresh(refreshToken);
    assert(
      unbannedRes.status === 200,
      `Expected 200 for unbanned user refresh, got ${unbannedRes.status}`
    );

    const payload = await unbannedRes.json();
    assert(payload?.userId === userId, 'Unbanned refresh payload userId mismatch');

    console.log('PASS banned refresh returns 403 and clears cookies');
    console.log('PASS unbanned refresh returns 200 with session payload');
    console.log('All auth-ban API tests passed.');
  } finally {
    await cleanupTempUser(client, userId).catch(() => null);
    await client.end();
  }
}

main().catch((error) => {
  console.error('Auth-ban API tests failed:');
  console.error(error?.message || error);
  process.exit(1);
});
