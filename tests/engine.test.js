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
      assert.equal(candidates.filter(x => x.score > 0).length, 1, q.id + ' multiple simple class formations'); assertions++;
    } else {
      assert.deepEqual(E.helpers.commonDims(model.vectors).sort(), model.mask.slice().sort(), q.id); assertions++;
    }
  }
  if (q.type === 'D') {
    const { vectors } = q.model, global = E.helpers.commonDims(vectors);
    const scores = vectors.map((_, i) => E.helpers.commonDims(vectors.filter((_, k) => i !== k)).filter(d => !global.includes(d)).length);
    assert.equal(scores.filter(x => x > 0).length, 1, q.id + ' multiple simple exclusions'); assertions++;
  }
  if (q.type === 'C') {
    assert.equal(q.model.labelsGiven, false); assertions++;
    assert.equal(q.main.display.rows, undefined); assertions++;
    assert.equal(q.main.display.cols, undefined); assertions++;
    const [a, b] = q.model.dimensions;
    const locations = q.model.vectors.flat().map((v, i) => v[a] === q.model.probe[a] && v[b] === q.model.probe[b] ? i : -1).filter(x => x >= 0);
    assert.deepEqual(locations, [q.main.answer]); assertions++;
    assert.ok(q.model.vectors.flat().filter(v => v[a] === q.model.probe[a]).length >= 2, q.id + ' row alone not enough'); assertions++;
    assert.ok(q.model.vectors.flat().filter(v => v[b] === q.model.probe[b]).length >= 2, q.id + ' column alone not enough'); assertions++;
    const inWrongPlace = q.check.options.map((p, i) => {
      const r = Math.floor((p.position - 1) / q.model.cols.length), c = (p.position - 1) % q.model.cols.length;
      const target = q.model.vectors[r][c];
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
    const evidence = E.repairEvidence(q, q.main.answer);
    assert.deepEqual(evidence.cards, restored, q.id + ' evidence uses actual repair'); assertions++;
    assert.equal(evidence.edges.length, 2, q.id + ' check both sides'); assertions++;
    assert.ok(evidence.edges.every(edge => edge.same), q.id + ' repaired relations'); assertions++;
    const incorrectReplacement = { position: q.main.answer.position, repair: (q.main.answer.repair + 1) % q.main.options.length };
    const badEvidence = E.repairEvidence(q, incorrectReplacement);
    assert.ok(badEvidence.edges.some(edge => !edge.same), q.id + ' incorrect replacement must break an adjacent relation'); assertions++;
    const misplacedEvidence = E.repairEvidence(q, wrong);
    const relation = E.helpers.relationalModel(q.mode, q.materialIndex, E.random(q.seed));
    assert.equal(E.helpers.fitsSequence(misplacedEvidence.cards, relation), false, q.id + ' checking a wrong location cannot fix the whole sequence'); assertions++;
  }
  if (q.type === 'S') {
    assert.equal(q.main.display.cells.at(-1).at(-1), null); assertions++;
    assert.equal(q.check.display.cells[0][0], null); assertions++;
    assert.ok(q.model.complete.length >= 2 && q.model.complete[0].length >= 2); assertions++;
    const model = E.helpers.systemModel(q.mode, q.materialIndex, E.random(q.seed));
    for (const [task, position] of [[q.main, q.model.mainPosition], [q.check, q.model.checkPosition]]) {
      const sets = E.helpers.systemOptionSets(model, task, position);
      assert.equal(sets.horizontal.length, 2, q.id + ' row-only ambiguity'); assertions++;
      assert.equal(sets.vertical.length, 2, q.id + ' column-only ambiguity'); assertions++;
      assert.deepEqual(sets.both, [task.answer], q.id + ' unique intersection'); assertions++;
      assert.equal(sets.horizontal.filter(i => !sets.vertical.includes(i)).length, 1, q.id + ' row-only distractor'); assertions++;
      assert.equal(sets.vertical.filter(i => !sets.horizontal.includes(i)).length, 1, q.id + ' column-only distractor'); assertions++;
    }
  }
}
console.log(JSON.stringify({ ...report, structuralAssertions: assertions, result: 'PASS' }, null, 2));
