const assert = require('node:assert/strict');
const E = require('../src/engine.js');
const report = E.audit();
assert.equal(report.total, 120);
assert.deepEqual(report.types, { G: 20, D: 20, C: 20, R: 20, F: 20, S: 20 });
assert.deepEqual(report.materials, { V: 40, F: 40, N: 40 });
assert.ok(report.lessons.every(n => n === 12));
assert.deepEqual(report.errors, []);
let assertions = 0;
for (const q of E.questions) {
  assert.ok(E.validResponse(q, q.main.answer), q.id); assertions++;
  assert.ok(E.sameResponse(q, q.main.answer), q.id); assertions++;
  assert.ok(E.validCheck(q, q.check.answer), q.id); assertions++;
  assert.ok(q.verify(), q.id); assertions++;
  assert.ok(!/奇偶性|完全平方|蓝色且空心|百位数字|十位数字|每步加|每步乘/.test(q.main.prompt), q.id + ' reveals rule'); assertions++;
  if (q.type === 'G') {
    const model = q.model;
    if (q.main.kind === 'group') {
      const global = E.helpers.commonDims(model.vectors);
      const candidates = E.helpers.combinations([0, 1, 2, 3, 4], 3).map(indices => ({ indices, score: E.helpers.commonDims(indices.map(i => model.vectors[i])).filter(d => !global.includes(d)).length }));
      const best = Math.max(...candidates.map(x => x.score));
      assert.equal(candidates.filter(x => x.score === best).length, 1, q.id + ' multiple class formations'); assertions++;
    } else {
      assert.deepEqual(E.helpers.commonDims(model.vectors).sort(), model.mask.slice().sort(), q.id); assertions++;
    }
  }
  if (q.type === 'D') {
    const { vectors } = q.model, global = E.helpers.commonDims(vectors);
    const scores = vectors.map((_, i) => E.helpers.commonDims(vectors.filter((_, k) => i !== k)).filter(d => !global.includes(d)).length);
    assert.equal(scores.filter(x => x === Math.max(...scores)).length, 1, q.id); assertions++;
  }
  if (q.type === 'C') {
    assert.equal(q.model.labelsGiven, false); assertions++;
    assert.equal(q.main.display.rows, undefined); assertions++;
    assert.equal(q.main.display.cols, undefined); assertions++;
    const [a, b] = q.model.dimensions;
    const locations = q.model.vectors.flat().map((v, i) => v[a] === q.model.probe[a] && v[b] === q.model.probe[b] ? i : -1).filter(x => x >= 0);
    assert.deepEqual(locations, [q.main.answer]); assertions++;
    const inWrongPlace = q.check.options.map((p, i) => {
      const r = Math.floor((p.position - 1) / q.model.cols.length), c = (p.position - 1) % q.model.cols.length;
      const target = q.model.vectors[r][c];
      const cardForVector = v => q.mode === 'N' ? { kind: 'number', value: (v[0] + 1) * 100 + (v[1] + 1) * 10 + v[2] + 1 } : q.mode === 'F' ? { kind: 'figure', shape: v[0], color: v[1], count: v[2] + 1, filled: true, rotation: 0, size: 1 } : null;
      if (q.mode === 'V') {
        const val = index => p.card.fields[index][1];
        const mapping = [['木制', '纸制', '金属', '布制'], ['扣式', '拉链', '绳结', '插片'], ['叶标', '云标', '山标', '星标']];
        return val(a) !== mapping[a][target[a]] || val(b) !== mapping[b][target[b]] ? i : -1;
      }
      const actual = q.mode === 'N' ? [Math.floor(p.card.value / 100) - 1, Math.floor(p.card.value / 10) % 10 - 1, p.card.value % 10 - 1] : [p.card.shape, p.card.color, p.card.count - 1];
      return actual[a] !== target[a] || actual[b] !== target[b] ? i : -1;
    }).filter(i => i >= 0);
    assert.deepEqual(inWrongPlace, [q.check.answer], q.id + ' opposite classification must have one invalid placement'); assertions++;
  }
  if (q.type === 'F') {
    assert.equal(q.main.kind, 'repair'); assertions++;
    const restored = E.clone(q.model.disturbed); restored[q.main.answer.position] = q.main.options[q.main.answer.repair];
    assert.deepEqual(restored, q.model.corrected, q.id + ' repair result'); assertions++;
    const wrong = { position: (q.main.answer.position + 1) % restored.length, repair: q.main.answer.repair };
    assert.equal(E.sameResponse(q, wrong), false); assertions++;
  }
  if (q.type === 'S') {
    assert.equal(q.main.display.cells.at(-1).at(-1), null); assertions++;
    assert.equal(q.check.display.cells[0][0], null); assertions++;
    assert.ok(q.model.complete.length >= 2 && q.model.complete[0].length >= 2); assertions++;
  }
}
console.log(JSON.stringify({ ...report, structuralAssertions: assertions, result: 'PASS' }, null, 2));
