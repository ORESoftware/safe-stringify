#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const safe = require('../dist/main.js');

let failed = 0;
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    process.stdout.write(`ok - ${name}\n`);
  } catch (err) {
    failed += 1;
    process.stderr.write(`not ok - ${name}\n`);
    process.stderr.write((err && err.stack) ? (err.stack + '\n') : String(err) + '\n');
  }
}

test('r2gSmokeTest returns true', () => {
  assert.equal(safe.r2gSmokeTest(), true);
});

test('stringify serializes a primitive number', () => {
  assert.equal(safe.stringify(42), '42');
});

test('stringify serializes a primitive boolean', () => {
  assert.equal(safe.stringify(true), 'true');
  assert.equal(safe.stringify(false), 'false');
});

test('stringify serializes a nested object', () => {
  assert.equal(safe.stringify({ a: { b: 1, c: [2, 3] } }), '{"a":{"b":1,"c":[2,3]}}');
});

test('stringify serializes an array of objects', () => {
  assert.equal(safe.stringify([{ x: 1 }, { y: 2 }]), '[{"x":1},{"y":2}]');
});

test('stringify drops a self-circular object key', () => {
  const obj = { a: 1 };
  obj.self = obj;
  const parsed = JSON.parse(safe.stringify(obj));
  assert.equal(parsed.a, 1);
  assert.equal('self' in parsed, false);
});

test('stringify dedupes a shared non-circular nested object', () => {
  const shared = { z: 9 };
  const parsed = JSON.parse(safe.stringify({ a: shared, b: shared }));
  assert.deepEqual(parsed, { a: { z: 9 }, b: { z: 9 } });
});

test('stringify drops a self-circular array slot', () => {
  const arr = [1];
  arr.push(arr);
  const parsed = JSON.parse(safe.stringify(arr));
  assert.equal(parsed[0], 1);
  assert.equal(parsed[1], null);
});

test('stringifyAll serializes nested objects like stringify', () => {
  assert.equal(safe.stringifyAll({ a: { b: true } }), '{"a":{"b":true}}');
});

test('stringifyAll handles a circular object without throwing', () => {
  const obj = { n: 1 };
  obj.self = obj;
  const out = safe.stringifyAll(obj);
  assert.equal(typeof out, 'string');
  const parsed = JSON.parse(out);
  assert.equal(parsed.n, 1);
});

test('stringifyAll encodes a repeated Buffer as a typed payload', () => {
  const buf = Buffer.from('hi');
  const obj = { buf, again: buf };
  const parsed = JSON.parse(safe.stringifyAll(obj));
  assert.ok(parsed.buf);
  assert.ok(parsed.again);
});

test('stringifyAll encodes a repeated Map as a typed payload', () => {
  const map = new Map([['one', 1], ['two', 2]]);
  const obj = { map, again: map };
  const parsed = JSON.parse(safe.stringifyAll(obj));
  assert.equal(parsed.again && parsed.again.type, 'Map');
  assert.ok(Array.isArray(parsed.again.val));
});

test('stringifyAll encodes a repeated Set as a typed payload', () => {
  const set = new Set([1, 2, 3]);
  const obj = { set, again: set };
  const parsed = JSON.parse(safe.stringifyAll(obj));
  assert.equal(parsed.again && parsed.again.type, 'Set');
  assert.ok(Array.isArray(parsed.again.val));
});

test('stringifyAll encodes a repeated RegExp as a typed payload', () => {
  const re = /ab+c/i;
  const obj = { re, again: re };
  const parsed = JSON.parse(safe.stringifyAll(obj));
  assert.equal(parsed.again && parsed.again.type, 'RegExp');
  assert.equal(parsed.again.val, String(re));
});

test('stringifyAll encodes a repeated nested array', () => {
  const inner = [1, 2];
  const obj = { inner, again: inner };
  const parsed = JSON.parse(safe.stringifyAll(obj));
  assert.deepEqual(parsed.again, [1, 2]);
});

test('stringifyDeep serializes primitives', () => {
  assert.equal(safe.stringifyDeep(7), '7');
  assert.equal(safe.stringifyDeep(false), 'false');
});

test('stringifyDeep serializes a nested object and array', () => {
  const parsed = JSON.parse(safe.stringifyDeep({ a: [1, { b: 2 }] }));
  assert.deepEqual(parsed, { a: [1, { b: 2 }] });
});

test('stringifyDeep handles a circular object without throwing', () => {
  const obj = { a: 1 };
  obj.self = obj;
  const out = safe.stringifyDeep(obj);
  assert.equal(typeof out, 'string');
  JSON.parse(out);
});

test('stringifyDeep handles a circular array without throwing', () => {
  const arr = [{ n: 1 }];
  arr.push(arr);
  const out = safe.stringifyDeep(arr);
  assert.equal(typeof out, 'string');
  JSON.parse(out);
});

test('stringifyDeep uses Date toJSON', () => {
  const d = new Date('2020-01-01T00:00:00.000Z');
  const out = safe.stringifyDeep({ d });
  assert.equal(typeof out, 'string');
  const parsed = JSON.parse(out);
  assert.ok(parsed);
});

test('stringifyDeep survives a throwing toJSON method', () => {
  const broken = {
    keep: 1,
    toJSON() {
      throw new Error('malformed toJSON');
    }
  };
  const out = safe.stringifyDeep({ broken });
  assert.equal(typeof out, 'string');
  JSON.parse(out);
});

test('stringifyDeep survives a Date-named object with throwing toJSON', () => {
  class BrokenDate {
    toJSON() {
      throw new Error('bad date');
    }
  }
  const out = safe.stringifyDeep({ d: new BrokenDate() });
  assert.equal(typeof out, 'string');
  JSON.parse(out);
});

test('stringifyDeep copies nested objects independently of later mutation', () => {
  const src = { a: { b: 1 } };
  const out = safe.stringifyDeep(src);
  src.a.b = 99;
  assert.deepEqual(JSON.parse(out), { a: { b: 1 } });
});

if (failed > 0) {
  process.stderr.write(`${failed} failed, ${passed} passed\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${passed} passed\n`);
}
