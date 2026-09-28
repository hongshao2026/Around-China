/**
 * Run: node verify.mjs
 * Pure model checks: no network, browser, live route, hotel, or weather claims.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(fileURLToPath(import.meta.url));
const sandbox = { window: {}, console, structuredClone };
vm.createContext(sandbox);
vm.runInContext(readFileSync(resolve(root, 'dist/data.js'), 'utf8'), sandbox, { filename: 'data.js' });
const R = sandbox.window.RB;
const groups = Object.entries(R).filter(([, value]) => Array.isArray(value) && value[0]?.from).map(([key]) => key);
let checks = 0;
const run = (name, fn) => {
  try { fn(); checks += 1; console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}`); throw error; }
};
const approx = (actual, expected, label, tolerance = 1e-7) =>
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`);
const sum = (rows, key) => rows.reduce((n, row) => n + row[key], 0);
const copy = value => JSON.parse(JSON.stringify(value));
const radians = value => value * Math.PI / 180;
function distance(a, b) {
  const dLat = radians(b[0] - a[0]);
  const dLng = radians(b[1] - a[1]);
  return 6371 * 2 * Math.asin(Math.sqrt(
    Math.sin(dLat / 2) ** 2 + Math.cos(radians(a[0])) * Math.cos(radians(b[0])) * Math.sin(dLng / 2) ** 2));
}
function continuity(plan, label) {
  assert.ok(plan.length > 0, `${label}: empty plan`);
  for (let i = 1; i < plan.length; i += 1) {
    assert.equal(plan[i].from, plan[i - 1].to, `${label}: discontinuity at ${i + 1}: ${plan[i - 1].to} → ${plan[i].from}`);
  }
}

run('source day metadata, bounded town coordinates, and route continuity', () => {
  assert.ok(R && R.places && R.stages && R.sources);
  const stageIds = new Set(R.stages.map(stage => stage.id));
  const ids = new Map();
  for (const [name, coordinate] of Object.entries(R.places)) {
    assert.equal(coordinate.length, 2, `${name}: coordinate pair required`);
    assert.ok(coordinate.every(Number.isFinite), `${name}: non-finite coordinate`);
    assert.ok(coordinate[0] >= 18 && coordinate[0] <= 54, `${name}: latitude out of route region`);
    assert.ok(coordinate[1] >= 73 && coordinate[1] <= 135.1, `${name}: longitude out of route region`);
  }
  for (const group of groups) {
    assert.ok(Array.isArray(R[group]) && R[group].length, `${group}: missing daily data`);
    continuity(R[group], group);
    for (const day of R[group]) {
      assert.ok(day.id && typeof day.id === 'string');
      if (ids.has(day.id)) assert.equal(JSON.stringify(day), ids.get(day.id), `${day.id}: conflicting duplicate`);
      else ids.set(day.id, JSON.stringify(day));
      assert.ok(stageIds.has(day.stage), `${day.id}: unknown stage`);
      for (const key of ['from', 'to', 'mid', 'see', 'note', 'road', 'kind']) {
        assert.equal(typeof day[key], 'string', `${day.id}: ${key} must be text`);
      }
      assert.ok(day.see.trim().length && day.mid.trim().length, `${day.id}: daily experience / break missing`);
      assert.ok(day.km >= 0 && day.km <= 650 && Number.isFinite(day.km), `${day.id}: implausible km`);
      assert.ok(day.h >= 0 && day.h <= 10 && Number.isFinite(day.h), `${day.id}: implausible driving hours`);
      const towns = [day.from, ...(day.via || []), day.to];
      for (const town of towns) assert.ok(R.places[town], `${day.id}: missing coordinate for ${town}`);
      const minimum = towns.slice(1).reduce((n, town, i) => n + distance(R.places[towns[i]], R.places[town]), 0);
      assert.ok(day.km >= minimum * 0.94, `${day.id}: ${day.km} km is below geographic lower bound ${minimum.toFixed(1)} km`);
      if (day.h > 7) {
        assert.ok(day.unsplittable || day.split, `${day.id}: long driving day needs explicit treatment`);
        assert.ok(day.note.length > 30, `${day.id}: long driving day needs explanation`);
      }
      if (day.split) {
        assert.ok(R.places[day.split.at], `${day.id}: split town has no coordinates`);
        assert.ok(day.split.km > 0 && day.split.km < day.km, `${day.id}: invalid split km`);
        assert.ok(day.split.h > 0 && day.split.h < day.h, `${day.id}: invalid split hours`);
        assert.notEqual(day.split.at, day.from, `${day.id}: split is departure`);
        assert.notEqual(day.split.at, day.to, `${day.id}: split is destination`);
      }
    }
  }
  // Rounded anchor coordinates detect swapped latitude/longitude and map-origin regressions.
  assert.ok(distance(R.places['丹东'], [40.12, 124.38]) < 10);
  assert.ok(distance(R.places['漠河'], [52.97, 122.54]) < 10);
  assert.ok(distance(R.places['叶城'], [37.88, 77.42]) < 10);
  assert.ok(distance(R.places['东兴'], [21.55, 107.97]) < 10);
});

run('sources are dated direct external pages', () => {
  assert.ok(R.sources.length >= 5);
  for (const source of R.sources) {
    assert.ok(source.title && source.date && source.note, 'source requires title, date, interpretation');
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(!/search/i.test(url.pathname), 'link to the supporting page, not a search');
  }
});

const engineFile = resolve(root, 'dist/engine.js');
assert.ok(existsSync(engineFile), 'dist/engine.js must exist before running complete verification');
vm.runInContext(readFileSync(engineFile, 'utf8'), sandbox, { filename: 'engine.js' });
const E = sandbox.window.RoadEngine;
assert.ok(E && typeof E.buildPlan === 'function' && typeof E.totals === 'function' && typeof E.budget === 'function');
const defaultState = () => copy(E.defaults);
const base = E.buildPlan(defaultState());

function checkPlan(plan, state, label) {
  continuity(plan, label);
  assert.equal(plan[0].from, '丹东', `${label}: wrong start`);
  assert.equal(plan.at(-1).to, '东兴', `${label}: wrong end`);
  const identifiers = new Set();
  for (const [i, day] of plan.entries()) {
    assert.ok(!identifiers.has(day.id), `${label}: duplicate id ${day.id}`);
    identifiers.add(day.id);
    assert.equal(day.date, E.isoDate(state.departure, i), `${label}: date ${i + 1}`);
    assert.equal(day.index, i + 1, `${label}: day numbers must follow calendar order`);
    assert.ok(Number.isFinite(day.km) && day.km >= 0);
    assert.ok(Number.isFinite(day.h) && day.h >= 0);
    assert.ok(R.places[day.from] && R.places[day.to], `${label}: missing map coordinates`);
  }
}

run('date-only arithmetic across month, year, and leap boundaries', () => {
  assert.equal(E.isoDate('2026-10-01', 0), '2026-10-01');
  assert.equal(E.isoDate('2026-10-01', 31), '2026-11-01');
  assert.equal(E.isoDate('2026-12-31', 1), '2027-01-01');
  assert.equal(E.isoDate('2028-02-28', 1), '2028-02-29');
  assert.equal(E.isoDate('2028-02-28', 2), '2028-03-01');
});

run('all 128 route / excursion combinations remain connected', () => {
  let combinations = 0;
  for (const desert of ['border', 'town']) for (const highland of ['tibet', 'inland']) {
    for (const exit of ['main', 'bing']) for (const kanas of [false, true]) for (const zhaosu of [false, true]) {
     for (const grassRoute of ['border', 'town']) for (const northXinjiang of ['border', 'town']) {
      combinations += 1;
      const state = { ...defaultState(), desert, highland, exit, kanas, zhaosu, grassRoute, northXinjiang };
      const plan = E.buildPlan(state);
      checkPlan(plan, state, `${desert}/${highland}/${exit}/${kanas}/${zhaosu}/${grassRoute}/${northXinjiang}`);
      assert.equal(plan.some(day => day.stage === 'inland'), highland === 'inland');
      assert.equal(plan.some(day => day.stage === 'tibet'), highland === 'tibet');
      assert.equal(plan.some(day => day.to === '贾登峪'), kanas);
      assert.equal(plan.some(day => day.to === '昭苏'), zhaosu);
      assert.equal(plan.some(day => day.to === '乌兰察布'), desert === 'town');
      assert.equal(plan.some(day => day.to === '霍林郭勒'), grassRoute === 'town');
      assert.equal(plan.some(day => day.to === '宝格达山'), grassRoute === 'border');
      assert.equal(plan.some(day => day.to === '奇台'), northXinjiang === 'town');
      assert.equal(plan.some(day => day.to === '北塔山牧场'), northXinjiang === 'border');
      if (highland === 'inland') assert.ok(!plan.some(day => day.stage === 'exit'), 'inland bypass must omit Tibet exits');
      else assert.equal(plan.some(day => day.to === '察瓦龙'), exit === 'bing');
      const totals = E.totals(plan, state);
      const costs = E.budget(plan, state);
      assert.equal(totals.days, plan.length, 'scenario days must match the visible route');
      approx(totals.km, sum(plan, 'km'), 'scenario distance');
      assert.equal(costs.days, plan.length + state.reserve, 'scenario budget days');
      assert.ok(Number.isFinite(costs.total) && costs.total > 0, 'scenario budget must be finite');
     }
    }
  }
  assert.equal(combinations, 128);
});

run('optional two-day loops add exactly their own distance and time', () => {
  for (const option of ['kanas', 'zhaosu']) {
    const state = { ...defaultState(), kanas: false, zhaosu: false };
    const without = E.buildPlan(state);
    const withLoop = E.buildPlan({ ...state, [option]: true });
    const expected = R.xinjiang.filter(day => day.optional === option);
    assert.equal(withLoop.length - without.length, expected.length);
    approx(sum(withLoop, 'km') - sum(without, 'km'), sum(expected, 'km'), `${option}: km`);
    approx(sum(withLoop, 'h') - sum(without, 'h'), sum(expected, 'h'), `${option}: hours`);
  }
});

run('declared split days preserve route, distance, time, and downstream dates', () => {
  for (const original of base.filter(day => day.split)) {
    const state = { ...defaultState(), splitIds: [original.id] };
    const plan = E.buildPlan(state);
    checkPlan(plan, state, `split ${original.id}`);
    assert.equal(plan.length, base.length + 1);
    approx(sum(plan, 'km'), sum(base, 'km'), `${original.id}: split km`);
    approx(sum(plan, 'h'), sum(base, 'h'), `${original.id}: split hours`);
    const before = base.findIndex(day => day.id === original.id);
    assert.equal(plan[before].from, original.from);
    assert.equal(plan[before].to, original.split.at);
    assert.equal(plan[before + 1].from, original.split.at);
    assert.equal(plan[before + 1].to, original.to);
    approx(plan[before].km, original.split.km, 'first split distance');
    approx(plan[before + 1].km, original.km - original.split.km, 'second split distance');
    assert.equal(plan[before + 2]?.date, E.isoDate(original.date, 2));
  }
});

run('extra waiting days stay at the selected destination and delay subsequent dates', () => {
  for (const at of [base[0], base.find(day => day.to === '叶城'), base.at(-1)]) {
    const state = { ...defaultState(), rests: { [at.id]: 3 } };
    const plan = E.buildPlan(state);
    checkPlan(plan, state, `wait after ${at.id}`);
    assert.equal(plan.length, base.length + 3);
    const start = plan.findIndex(day => day.id === at.id) + 1;
    const added = plan.slice(start, start + 3);
    for (const day of added) {
      assert.equal(day.kind, 'wait');
      assert.equal(day.from, at.to);
      assert.equal(day.to, at.to);
      assert.equal(day.km, 0);
      assert.equal(day.h, 0);
    }
    approx(sum(plan, 'km'), sum(base, 'km'), 'waiting preserves route distance');
    approx(sum(plan, 'h'), sum(base, 'h'), 'waiting preserves driving time');
  }
});

run('waiting after either half of a split stays at that half\'s actual destination', () => {
  for (const original of base.filter(day => day.split)) {
    for (const half of ['a', 'b']) {
      const anchor = original.id + half;
      const state = { ...defaultState(), splitIds: [original.id], rests: { [anchor]: 2 } };
      const plan = E.buildPlan(state);
      checkPlan(plan, state, `wait after split ${anchor}`);
      assert.equal(plan.length, base.length + 3, 'one split day and two waiting days added');
      const start = plan.findIndex(day => day.id === anchor) + 1;
      const expectedTown = half === 'a' ? original.split.at : original.to;
      const added = plan.slice(start, start + 2);
      assert.equal(added.length, 2);
      for (const day of added) {
        assert.equal(day.kind, 'wait');
        assert.equal(day.from, expectedTown);
        assert.equal(day.to, expectedTown);
        assert.equal(day.restAnchor, anchor);
        assert.equal(day.km, 0);
        assert.equal(day.h, 0);
      }
      if (half === 'a') {
        assert.equal(plan[start + 2].id, original.id + 'b', 'second half resumes after midpoint waiting');
        assert.equal(plan[start + 2].from, original.split.at);
      }
      approx(sum(plan, 'km'), sum(base, 'km'), 'split waiting preserves route distance');
      approx(sum(plan, 'h'), sum(base, 'h'), 'split waiting preserves driving hours');
    }
  }
});

run('midpoint, original-destination, and second-half waits can coexist', () => {
  const original = base.find(day => day.split);
  const state = { ...defaultState(), splitIds: [original.id], rests: { [original.id + 'a']: 2, [original.id]: 1, [original.id + 'b']: 3 } };
  const plan = E.buildPlan(state);
  checkPlan(plan, state, 'all split wait anchors');
  assert.equal(plan.length, base.length + 7);
  const added = plan.filter(day => day.originalId === original.id && day.kind === 'wait');
  assert.equal(added.length, 6);
  assert.equal(added.filter(day => day.to === original.split.at).length, 2);
  assert.equal(added.filter(day => day.to === original.to).length, 4);
});

run('split and waiting together remain connected; unsafe or stale split requests have no effect', () => {
  const selected = base.find(day => day.split);
  const state = { ...defaultState(), splitIds: [selected.id], rests: { [selected.id]: 2 } };
  const plan = E.buildPlan(state);
  checkPlan(plan, state, 'split then wait');
  assert.equal(plan.length, base.length + 3);
  const added = plan.filter(day => day.originalId === selected.id && day.kind === 'wait');
  assert.equal(added.length, 2);
  assert.ok(added.every(day => day.from === selected.to && day.to === selected.to));
  const protectedState = { ...defaultState(), splitIds: [...base.filter(day => day.unsplittable).map(day => day.id), 'missing-id'] };
  assert.equal(JSON.stringify(E.buildPlan(protectedState)), JSON.stringify(base), 'unsupported splits must not create invented accommodation');
  const staleState = { ...defaultState(), rests: { 'missing-id': 2 } };
  assert.equal(E.buildPlan(staleState).length, base.length, 'inactive day must not create a disconnected wait');
});

run('totals count actual plan days and keep unallocated reserve separate', () => {
  const state = defaultState();
  const totals = E.totals(base, state);
  assert.equal(totals.days, base.length);
  approx(totals.km, sum(base, 'km'), 'total route distance');
  approx(totals.h, sum(base, 'h'), 'total driving time');
  assert.equal(totals.rest, base.filter(day => ['rest', 'wait'].includes(day.kind)).length);
  assert.equal(totals.long, base.filter(day => day.h > 6).length);
  assert.equal(totals.finish, base.at(-1).date);
  assert.equal(totals.latest, E.isoDate(base.at(-1).date, state.reserve));
  const extraState = { ...state, reserve: state.reserve + 7 };
  assert.equal(JSON.stringify(E.buildPlan(extraState)), JSON.stringify(base), 'reserve must not manufacture dated itinerary days');
  assert.equal(E.totals(base, extraState).latest, E.isoDate(totals.latest, 7));
});

run('budget uses per-100-km energy units, hotel nights, and transparent subtotal / buffer', () => {
  const state = defaultState();
  const budget = E.budget(base, state);
  const p = state.budget;
  const adjustedKm = sum(base, 'km') * (1 + p.extra / 100);
  approx(budget.km, adjustedKm, 'extra mileage');
  approx(budget.energy, adjustedKm * p.fuel * p.price / 100, 'litres per 100 km');
  assert.equal(budget.days, base.length + state.reserve, 'all travel nights and reserve nights count');
  const ordinary = base.filter(day => !day.remote && day.stage !== 'tibet' && day.to !== '贾登峪').length;
  const remote = base.filter(day => day.remote).length;
  const plateau = base.filter(day => !day.remote && day.stage === 'tibet').length;
  const scenic = base.filter(day => !day.remote && day.stage !== 'tibet' && day.to === '贾登峪').length;
  approx(budget.lodging, p.hotel * (ordinary + remote * 1.15 + plateau * 1.25 + scenic * 1.4 + state.reserve), 'weighted lodging nights');
  assert.ok(budget.items.every(item => typeof item.name === 'string' && typeof item.formula === 'string' && Number.isFinite(item.amount) && item.amount >= 0));
  approx(budget.subtotal, budget.items.reduce((n, item) => n + item.amount, 0), 'item subtotal');
  approx(budget.buffer, budget.subtotal * p.buffer / 100, 'contingency rate');
  approx(budget.total, budget.subtotal + budget.buffer, 'grand total');
  const expectedSubtotal = budget.energy + budget.lodging + budget.days * (p.food + p.parking) + p.tickets + p.tolls + p.service;
  approx(budget.subtotal, expectedSubtotal, 'all categories counted once');
});

run('budget responds to reserve, electricity, mileage, and fixed-cost changes', () => {
  const state = defaultState();
  const budget = E.budget(base, state);
  const moreReserve = E.budget(base, { ...state, reserve: state.reserve + 5 });
  const recurring = 5 * (state.budget.hotel + state.budget.food + state.budget.parking);
  approx(moreReserve.energy, budget.energy, 'waiting reserve has no invented driving distance');
  approx(moreReserve.subtotal - budget.subtotal, recurring, 'five extra reserve days');
  approx(moreReserve.total - budget.total, recurring * (1 + state.budget.buffer / 100), 'reserve with contingency');
  const electricity = E.budget(base, { ...state, budget: { ...state.budget, power: 'electric' } });
  approx(electricity.energy, budget.km * state.budget.kwh * state.budget.electricity / 100, 'kWh per 100 km');
  const alteredPetrol = E.budget(base, { ...state, budget: { ...state.budget, power: 'electric', fuel: 25, price: 20 } });
  approx(alteredPetrol.total, electricity.total, 'electric scenario ignores petrol assumptions');
  const noMileageAllowance = E.budget(base, { ...state, budget: { ...state.budget, extra: 0 } });
  approx(budget.energy, noMileageAllowance.energy * 1.1, '10% mileage allowance');
  const plusTickets = E.budget(base, { ...state, budget: { ...state.budget, tickets: state.budget.tickets + 1000 } });
  approx(plusTickets.total - budget.total, 1000 * (1 + state.budget.buffer / 100), 'fixed cost change including contingency');
  const noBuffer = E.budget(base, { ...state, budget: { ...state.budget, buffer: 0 } });
  approx(noBuffer.buffer, 0, 'zero contingency');
  approx(noBuffer.total, noBuffer.subtotal, 'zero contingency total');
});

run('source and state are unchanged by repeated plan builds', () => {
  const state = defaultState();
  const beforeData = JSON.stringify(R);
  const beforeState = JSON.stringify(state);
  const a = JSON.stringify(E.buildPlan(state));
  const b = JSON.stringify(E.buildPlan(state));
  assert.equal(a, b, 'rebuild must be deterministic');
  assert.equal(JSON.stringify(state), beforeState, 'buildPlan mutated state');
  assert.equal(JSON.stringify(R), beforeData, 'buildPlan mutated source data');
});

console.log(`\n${checks} verification groups passed.`);
for (const [name, state] of [['Default', defaultState()], ['Inland bypass', { ...defaultState(), highland: 'inland' }]]) {
  const plan = E.buildPlan(state);
  const totals = E.totals(plan, state);
  const costs = E.budget(plan, state);
  console.log(`${name}: ${totals.days} itinerary days + ${state.reserve} reserve, ${totals.km} km, CNY ${costs.total.toFixed(2)}, arrival ${totals.finish}–${totals.latest}.`);
}
