import test from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedAdmin } from '../src/adminAccess.js'

const allowedEmail = 'FXADAMG@VAWES.APP'

test('admin access requires both the database flag and an allowlisted email', () => {
  assert.equal(isAllowedAdmin({ isAdmin: true, email: allowedEmail }), true)
  assert.equal(isAllowedAdmin({ isAdmin: true, email: 'someone@example.com' }), false)
  assert.equal(isAllowedAdmin({ isAdmin: false, email: allowedEmail }), false)
})

test('admin access tolerates surrounding whitespace in the email', () => {
  assert.equal(isAllowedAdmin({ isAdmin: true, email: `  ${allowedEmail}  ` }), true)
})

test('admin access rejects missing or malformed user objects', () => {
  assert.equal(isAllowedAdmin(null), false)
  assert.equal(isAllowedAdmin(undefined), false)
  assert.equal(isAllowedAdmin({}), false)
  assert.equal(isAllowedAdmin({ isAdmin: true }), false)
  assert.equal(isAllowedAdmin({ isAdmin: true, email: '' }), false)
})
