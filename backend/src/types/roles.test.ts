import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission } from './roles.js';

test('Owner has wildcard access', () => {
  assert.equal(hasPermission('Owner', 'any:permission'), true);
});

test('Receptionist can manage reservations but cannot manage settings', () => {
  assert.equal(hasPermission('Receptionist', 'reservations:manage'), true);
  assert.equal(hasPermission('Receptionist', 'settings:manage'), false);
});

test('Department staff can create requisitions only within limited permissions', () => {
  assert.equal(hasPermission('Department Staff', 'requisitions:create'), true);
  assert.equal(hasPermission('Department Staff', 'requisitions:approve'), false);
});
