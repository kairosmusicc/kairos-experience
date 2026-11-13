/* Run: node tests/living_os_engine.cjs */
const assert = require('node:assert/strict');
require('../living-os.js');
let clock = 100000, blocked = false, solved = false, deliveries = 0, saved;
const rule = { id: 'hint', event: 'failure', once: true, delay: [25000, 45000], when: () => !solved, obsolete: () => solved, effect: { type: 'message' } };
const make = state => new LivingOSEngine({ state, rules: [rule], facts: () => ({}), now: () => clock,
  persist: state => { saved = JSON.parse(JSON.stringify(state)); }, blocked: () => blocked,
  deliver: () => { deliveries++; return true; } });
let engine = make();
assert.equal(engine.emit('failure', {}, 'failure-1'), true);
assert.equal(engine.emit('failure', {}, 'failure-1'), false);
engine.emit('failure', {}, 'failure-2');
assert.equal(engine.state.pending.length, 1);
assert.equal(engine.state.events.length, 2);
for (let i = 0; i < 130; i++) engine.emit('navigation');
assert.equal(engine.emit('failure', {}, 'failure-1'), false, 'dedup survives bounded journal eviction');
const due = saved.pending[0].dueAt;
engine = make(saved);
assert.equal(engine.state.pending[0].dueAt, due);
assert.equal(engine.delay(rule), make(saved).delay(rule));
clock = due + 1000;
blocked = true; engine.process();
assert.equal(deliveries, 0); assert.equal(saved.pending.length, 1);
blocked = false; engine.process(); engine.process();
assert.equal(deliveries, 1); assert.equal(saved.pending.length, 0);
engine = make(saved); engine.emit('failure'); engine.process();
assert.equal(deliveries, 1); assert.equal(saved.pending.length, 0);
engine = make(); engine.emit('failure'); solved = true; engine.emit('solved');
assert.equal(saved.pending.length, 0);
// Reentrant process and spacing cannot deliver a burst.
solved = false; deliveries = 0;
const rules = ['one', 'two'].map(id => ({ ...rule, id }));
engine = new LivingOSEngine({ rules, facts: () => ({}), now: () => clock, persist: () => {}, blocked: () => false,
  deliver: () => { deliveries++; engine.process(); return true; } });
engine.emit('failure'); clock += 50000; engine.process(); engine.process();
assert.equal(deliveries, 1); clock += 30000; engine.process(); assert.equal(deliveries, 2);
console.log('PASS engine: event/effect deduplication, stable delays, refresh/expiry, blocked delivery, cancellation, reentrancy, spacing');
