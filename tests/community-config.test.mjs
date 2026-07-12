import test from 'node:test';
import assert from 'node:assert/strict';
import { getCommunityRuntimeConfig, publicCommunityConfig } from '../api/community/_config.js';

test('maps the existing Vercel Auth0 names into SPA runtime config', () => {
  const config = getCommunityRuntimeConfig({
    AUTH0_DOMAIN: 'https://nine-six.us.auth0.com/',
    AUTH0_CLIENT_ID: 'spa-client',
    AUTH0_AUDIENCE: 'https://api.nine-six.example',
    AUTH0_SCOPE: 'openid offline_access',
    DB_CONNECT: 'postgresql://secret'
  });

  assert.equal(config.auth0.domain, 'nine-six.us.auth0.com');
  assert.equal(config.auth0.clientId, 'spa-client');
  assert.equal(config.auth0.audience, 'https://api.nine-six.example');
  assert.match(config.auth0.scope, /\bprofile\b/);
  assert.match(config.auth0.scope, /\bemail\b/);
  assert.equal(config.authConfigured, true);
  assert.equal(config.databaseConfigured, true);
});

test('public config never exposes database or Auth0 secrets', () => {
  const json = JSON.stringify(publicCommunityConfig({
    AUTH0_DOMAIN: 'nine-six.us.auth0.com',
    AUTH0_CLIENT_ID: 'spa-client',
    AUTH0_AUDIENCE: 'https://api.nine-six.example',
    AUTH0_CLIENT_SECRET: 'never-in-the-browser',
    AUTH0_SECRET: 'also-server-only',
    DB_CONNECT: 'postgresql://database-secret'
  }));

  assert.doesNotMatch(json, /never-in-the-browser|also-server-only|database-secret/);
  assert.doesNotMatch(json, /clientSecret|DB_CONNECT|AUTH0_SECRET/);
});

test('Auth0 is incomplete until an API audience exists', () => {
  const config = getCommunityRuntimeConfig({
    AUTH0_DOMAIN: 'nine-six.us.auth0.com',
    AUTH0_CLIENT_ID: 'spa-client'
  });
  assert.equal(config.authConfigured, false);
});
