import test from 'node:test'
import assert from 'node:assert/strict'
import { COLORS, fmt, norm } from '../src/catalogUtils.js'

test('fmt renders seconds as m:ss and clamps invalid values', () => {
  assert.equal(fmt(0), '0:00')
  assert.equal(fmt(9), '0:09')
  assert.equal(fmt(65), '1:05')
  assert.equal(fmt(3661), '61:01')
  assert.equal(fmt(-5), '0:00')
  assert.equal(fmt(Number.NaN), '0:00')
  assert.equal(fmt(Number.POSITIVE_INFINITY), '0:00')
})

test('norm folds accents, punctuation and case for search matching', () => {
  assert.equal(norm('  Hégedüs  Márcell!  '), 'hegedus marcell')
  assert.equal(norm('VAWES — Session #1'), 'vawes session 1')
  assert.equal(norm(null), '')
  assert.equal(norm(undefined), '')
  assert.equal(norm(42), '42')
})

test('theme colours are all valid hex values', () => {
  for (const [name, value] of Object.entries(COLORS)) {
    assert.match(value, /^#[0-9a-f]{6}$/i, `${name} has an invalid colour`)
  }
})
