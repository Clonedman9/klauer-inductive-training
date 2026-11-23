/* Klauer method adaptation: original instances, explicit model checks. No original item-bank claim. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KlauerEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '2.1.0';
  const TYPES = [
    { id: 'G', name: '概括', branch: '属性', operation: '寻找相同', source: '2008，表1：Class formation / Class expansion / Finding common attributes' },
    { id: 'D', name: '辨别', branch: '属性', operation: '寻找不同', source: '2008，表1：Identifying disturbing items' },
    { id: 'C', name: '交叉分类', branch: '属性', operation: '同时比较相同与不同', source: '2008，表1：4 / 6 / 9-fold scheme；2002，附录第23页' },
    { id: 'R', name: '关系识别', branch: '关系', operation: '寻找相同', source: '2008，表1：Series completion / Ordered series / Analogy' },
    { id: 'F', name: '关系区分', branch: '关系', operation: '寻找不同', source: '2008，表1：Disturbed series；2002，附录第22页要求找错并修复' },
    { id: 'S', name: '系统建构', branch: '关系', operation: '同时比较相同与不同', source: '2008，表1：Matrices；2002，附录第23页' }
  ];
  const TYPE = Object.fromEntries(TYPES.map(t => [t.id, t]));
  const MODES = ['V', 'F', 'N'];
  const MODE_NAMES = { V: '文字资料', F: '图形资料', N: '数量资料' };
  const LESSONS = [
    ['先用自己的办法', '熟悉材料和训练情境，先尝试解决，再说说你的想法。', [2, 2, 2, 2, 2, 2]],
    ['看特点，还是看联系', '区分对象自身的特点与对象之间的关系，回看第1课题目。', [2, 2, 2, 2, 2, 2]],
    ['特点的三种比较', '比较共同属性、不同属性及两个交叉的分类维度。', [4, 4, 4, 0, 0, 0]],
    ['联系的三种比较', '发现统一关系、修复关系中断，并联合比较多个关系。', [0, 0, 0, 4, 4, 4]],
    ['找相同，也找反例', '练习发现共同属性或关系，并用相反方向的比较检查。', [6, 0, 0, 6, 0, 0]],
    ['找不同，再让它一致', '发现属性或关系的异常；修复之后，检验整体是否一致。', [0, 6, 0, 0, 6, 0]],
    ['让两个条件都成立', '同时处理相同与不同；检查分类和关系的两个维度。', [0, 0, 6, 0, 0, 6]],
    ['自己监控：对象特点', '复习属性分支，每题问自己：看什么、怎么比较、怎么检查。', [4, 4, 4, 0, 0, 0]],
    ['自己监控：对象联系', '复习关系分支，每题实践识别、解决与反向检查。', [0, 0, 0, 4, 4, 4]],
    ['把方法带到新题', '混合练习六类任务，不先显示题型或规律，独立选择比较方法。', [2, 2, 2, 2, 2, 2]]
  ].map((x, i) => ({ n: i + 1, title: x[0], goal: x[1], counts: x[2], items: [] }));
  const MATERIALS = ['木制', '纸制', '金属', '布制'];
  const CLOSURES = ['扣式', '拉链', '绳结', '插片'];
  const MARKS = ['叶标', '云标', '山标', '星标'];
  const SHAPES = ['圆形', '方形', '三角形', '菱形'];
  const COLORS = ['橙色', '蓝色', '绿色', '紫色'];
  const WORDS = ['山川月', '风雨雪', '林泉石', '春夏冬', '星云海', '舟桥岸', '竹兰梅', '红青白', '松柏杉', '门窗墙', '日月星', '河湖海', '花叶果', '木纸布', '东南西', '溪谷峰', '田园村', '笔墨砚', '江河湖', '琴棋书', '晨午夜', '草树花', '舟车桥', '雨雪霜'];
  const PREFIXES = ['新', '小', '青', '明', '早', '南', '白'];
  const SUFFIXES = ['站', '号', '门', '箱', '格', '坊', '屋'];
  const clone = x => JSON.parse(JSON.stringify(x));
  const mod = (x, m) => ((x % m) + m) % m;
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const cardKey = card => JSON.stringify(card);
  function random(seed) {
    let x = seed >>> 0;
    return {
      int(n) { x = (1664525 * x + 1013904223) >>> 0; return Math.floor(x / 4294967296 * n); },
      shuffle(items) { const a = items.slice(); for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    };
  }
  function combinations(items, k) {
    const output = [];
    function visit(start, acc) {
      if (acc.length === k) { output.push(acc); return; }
      for (let i = start; i <= items.length - (k - acc.length); i++) visit(i + 1, acc.concat(items[i]));
    }
    visit(0, []); return output;
  }
  function domain(mode) { return mode === 'N' ? 8 : 4; }
  function vector(mode, rng) { return [rng.int(domain(mode)), rng.int(domain(mode)), rng.int(domain(mode))]; }
  function attrCard(mode, v) {
    if (mode === 'F') return { kind: 'figure', shape: v[0], color: v[1], count: v[2] + 1, filled: true, rotation: 0, size: 1 };
    if (mode === 'N') return { kind: 'number', value: (v[0] + 1) * 100 + (v[1] + 1) * 10 + v[2] + 1 };
    return { kind: 'record', fields: [['材质', MATERIALS[v[0]]], ['封口', CLOSURES[v[1]]], ['标记', MARKS[v[2]]]] };
  }
  function dimension(mode, i) { return mode === 'F' ? ['形状', '颜色', '数量'][i] : mode === 'N' ? ['百位数字', '十位数字', '个位数字'][i] : ['材质', '封口', '标记'][i]; }
  function attribute(mode, i, value) {
    return mode === 'F' ? [SHAPES[value], COLORS[value], (value + 1) + '个图形'][i] : mode === 'N' ? String(value + 1) : [MATERIALS[value], CLOSURES[value], MARKS[value]][i];
  }
  function commonDims(vecs) { return [0, 1, 2].filter(d => vecs.every(v => v[d] === vecs[0][d])); }
  function ruleText(mode, mask, target) { return mask.map(d => dimension(mode, d) + '都是「' + attribute(mode, d, target[d]) + '」').join('，'); }
  function matches(v, mask, target) { return mask.every(d => v[d] === target[d]); }
  function constrained(mode, mask, target, rng, differ = false) {
    const v = vector(mode, rng); mask.forEach(d => { v[d] = target[d]; });
    if (differ) { const d = mask[rng.int(mask.length)]; v[d] = mod(target[d] + 1 + rng.int(domain(mode) - 1), domain(mode)); }
    return v;
  }
  function distinctVectors(make, n) {
    const out = [], seen = new Set();
    for (let tries = 0; out.length < n && tries < 1500; tries++) { const v = make(); if (!seen.has(JSON.stringify(v))) { seen.add(JSON.stringify(v)); out.push(v); } }
    assert(out.length === n, 'Unable to construct distinct cards'); return out;
  }
  function choices(correct, distractors, rng) {
    const seen = new Set([cardKey(correct)]), list = [{ card: correct, correct: true }];
    for (const card of distractors) {
      const key = cardKey(card);
      if (!seen.has(key)) { seen.add(key); list.push({ card, correct: false }); }
      if (list.length === 4) break;
    }
    assert(list.length >= 2, 'Need distinct alternatives');
    const shuffled = rng.shuffle(list);
    return { options: shuffled.map(x => x.card), answer: shuffled.findIndex(x => x.correct) };
  }
  function attrChoices(mode, mask, target, rng, reverse) {
    const cards = distinctVectors(() => constrained(mode, mask, target, rng, reverse), reverse ? 1 : 1);
    const other = distinctVectors(() => constrained(mode, mask, target, rng, !reverse), 3);
    const result = choices(attrCard(mode, cards[0]), other.map(v => attrCard(mode, v)), rng);
    return { ...result, model: { vectors: result.options.map(card => card), reverse } };
  }
  function buildG(mode, j, rng) {
    const mask = j >= 4 && j % 3 !== 0 ? rng.shuffle([0, 1, 2]).slice(0, 2) : [j % 3];
    const target = vector(mode, rng), form = j % 3 === 0;
    let evidence, main, model;
    if (form) {
      let found;
      for (let tries = 0; tries < 1000 && !found; tries++) {
        const members = distinctVectors(() => constrained(mode, mask, target, rng), 3);
        const rest = distinctVectors(() => constrained(mode, mask, target, rng, true), 2);
        const records = rng.shuffle(members.map(v => ({ v, yes: true })).concat(rest.map(v => ({ v, yes: false }))));
        const vecs = records.map(x => x.v), global = commonDims(vecs);
        const scored = combinations([0, 1, 2, 3, 4], 3).map(indices => ({ indices, score: commonDims(indices.map(i => vecs[i])).filter(d => !global.includes(d)).length }));
        const best = Math.max(...scored.map(x => x.score)), winners = scored.filter(x => x.score > 0);
        if (best > 0 && winners.length === 1 && winners[0].indices.every(i => records[i].yes)) found = { vecs, expected: winners[0].indices, winners, best };
      }
      assert(found, 'Group formation uniqueness');
      evidence = found.expected.map(i => attrCard(mode, found.vecs[i]));
      main = { kind: 'group', prompt: '哪三张可以组成一组？比较画面中相同的特点，找出共享某一特点的三张。', options: found.vecs.map(v => attrCard(mode, v)), answer: found.expected };
      model = { family: 'class-formation', vectors: found.vecs, mask, target, expected: found.expected, bestScore: found.best };
    } else {
      let examples;
      for (let tries = 0; tries < 300; tries++) {
        examples = distinctVectors(() => constrained(mode, mask, target, rng), 3);
        if (equal(commonDims(examples).slice().sort(), mask.slice().sort())) break;
      }
      assert(equal(commonDims(examples).slice().sort(), mask.slice().sort()), 'Expansion examples must expose intended commonality only');
      evidence = examples.map(v => attrCard(mode, v));
      const correct = constrained(mode, mask, target, rng);
      const wrong = [];
      for (let k = 0; k < 9; k++) wrong.push(attrCard(mode, constrained(mode, mask, target, rng, true)));
      main = { kind: 'choice', prompt: '先比较这三张。哪一张可以加入同一组？', display: { kind: 'cards', cards: evidence }, ...choices(attrCard(mode, correct), wrong, rng) };
      model = { family: 'class-expansion', vectors: examples, mask, target, expected: main.answer };
    }
    const check = attrChoices(mode, mask, target, rng, true);
    return { main, check: { kind: 'choice', prompt: '换个方向检查：下面哪张会破坏你刚才发现的共同特征？', display: { kind: 'cards', cards: evidence }, options: check.options, answer: check.answer }, explanation: '这组对象的' + ruleText(mode, mask, target) + '。其他特点可以变化；比较的重点是稳定的共同点。', checkExplanation: '找到共同点后，再主动寻找不符合它的对象。检查题中的异项破坏了上述共同点。', model, verify: () => main.kind === 'group' ? model.expected.length === 3 : true };
  }
  function buildD(mode, j, rng) {
    const mask = j >= 4 ? rng.shuffle([0, 1, 2]).slice(0, 2) : [j % 3], target = vector(mode, rng);
    let found;
    for (let tries = 0; tries < 1000 && !found; tries++) {
      const normal = distinctVectors(() => constrained(mode, mask, target, rng), 4);
      const odd = constrained(mode, mask, target, rng, true);
      const records = rng.shuffle(normal.map(v => ({ v, odd: false })).concat([{ v: odd, odd: true }]));
      const vecs = records.map(x => x.v), global = commonDims(vecs);
      const scores = vecs.map((_, i) => commonDims(vecs.filter((_, k) => k !== i)).filter(d => !global.includes(d)).length);
      const max = Math.max(...scores), win = scores.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
      if (max > 0 && win.length === 1 && records[win[0]].odd) found = { vecs, answer: win[0] };
    }
    assert(found, 'Discrimination uniqueness');
    const main = { kind: 'choice', prompt: '哪一张打破了其余对象的共同点？先比较，再选择。', options: found.vecs.map(v => attrCard(mode, v)), answer: found.answer };
    const check = attrChoices(mode, mask, target, rng, false);
    const evidence = distinctVectors(() => constrained(mode, mask, target, rng), 3).map(v => attrCard(mode, v));
    return { main, check: { kind: 'choice', prompt: '反过来检查共同点：哪张新卡片能加入剩余的一组？', display: { kind: 'cards', cards: evidence }, options: check.options, answer: check.answer }, explanation: '其余四张的' + ruleText(mode, mask, target) + '。异项至少有一项不符合。', checkExplanation: '发现差异后，需要确认留下的对象确实共享某一特点。新卡片也必须保留这个共同点。', model: { family: 'discrimination', vectors: found.vecs, mask, target, expected: found.answer }, verify: () => found.vecs.filter(v => matches(v, mask, target)).length === 4 };
  }
  function buildC(mode, j, rng) {
    const dims = rng.shuffle([0, 1, 2]), a = dims[0], b = dims[1], nuisance = dims[2];
    const nr = j >= 5 ? 3 : 2, nc = j % 3 === 0 ? 2 : 3;
    const rows = rng.shuffle(Array.from({ length: domain(mode) }, (_, i) => i)).slice(0, nr);
    const cols = rng.shuffle(Array.from({ length: domain(mode) }, (_, i) => i)).slice(0, nc);
    const cells = [], vectors = [];
    for (let r = 0; r < nr; r++) {
      const line = [], vecLine = [];
      for (let c = 0; c < nc; c++) { const v = vector(mode, rng); v[a] = rows[r]; v[b] = cols[c]; v[nuisance] = (r + c + j) % domain(mode); vecLine.push(v); line.push(attrCard(mode, v)); }
      cells.push(line); vectors.push(vecLine);
    }
    const r = rng.int(nr), c = rng.int(nc), probeV = clone(vectors[r][c]); probeV[nuisance] = mod(probeV[nuisance] + 1, domain(mode));
    const answer = r * nc + c;
    const main = { kind: 'place', prompt: '表格没有分类标题。先发现它怎样分组，再把新卡片放进最合适的一格；它可以和该格原有卡片放在一起。', display: { kind: 'classification', cells, probe: attrCard(mode, probeV) }, options: cells.flat().map((_, i) => ({ kind: 'position', value: i + 1 })), answer };
    const placements = [], expectedBad = rng.int(4), usedPlacementKeys = new Set();
    for (let k = 0; k < 4; k++) {
      let placement;
      for (let tries = 0; tries < 100; tries++) {
        const rr = rng.int(nr), cc = rng.int(nc), v = vector(mode, rng); v[a] = rows[rr]; v[b] = cols[cc];
        if (k === expectedBad) { if (rng.int(2)) v[a] = rows[(rr + 1) % nr]; else v[b] = cols[(cc + 1) % nc]; }
        const candidate = { kind: 'placement', card: attrCard(mode, v), position: rr * nc + cc + 1 };
        if (!usedPlacementKeys.has(cardKey(candidate))) { placement = candidate; usedPlacementKeys.add(cardKey(candidate)); break; }
      }
      assert(placement, 'Distinct classification checks'); placements.push(placement);
    }
    return { main, check: { kind: 'choice', prompt: '反向查验：沿用你发现的分类办法，哪一个归位建议不成立？', display: { kind: 'grid', cells }, options: placements, answer: expectedBad }, explanation: '同一行保持' + dimension(mode, a) + '相同，同一列保持' + dimension(mode, b) + '相同；' + dimension(mode, nuisance) + '可以变化。新卡片需同时和目标格共享这两个特点，所以应放入第' + (answer + 1) + '格。', checkExplanation: '检查每一个归位建议的两个分类维度，不能只符合一行或一列。错误建议至少与目标格的一项分类属性不一致。', model: { family: 'cross-classification', dimensions: [a, b], nuisance, vectors, probe: probeV, rows, cols, expected: answer, labelsGiven: false }, verify: () => rows.indexOf(probeV[a]) * nc + cols.indexOf(probeV[b]) === answer && probeV[nuisance] !== vectors[r][c][nuisance] };
  }
  const num = value => ({ kind: 'number', value });
  const word = text => ({ kind: 'word', text });
  function relationalModel(mode, j, rng) {
    const family = j % 7;
    if (mode === 'N') {
      const slopes = [1, 1, 2, 1, 2, 3, 2], adds = [2 + j, -(2 + j), 0, 5 + j, 1, -1, 3];
      const a = slopes[family], b = adds[family];
      return {
        mode, family: 'affine-' + a + '-' + b,
        make: () => num(8 + rng.int(30)),
        apply: x => num(a * x.value + b), inverse: x => num((x.value - b) / a),
        describe: a === 1 ? '每一步' + (b > 0 ? '加' : '减') + Math.abs(b) : '每一步先乘' + a + (b ? (b > 0 ? '，再加' : '，再减') + Math.abs(b) : ''),
        distractors: x => [num(x.value + 1), num(x.value - 1), num(x.value + Math.abs(b || a)), num(x.value + 2 * a), num(x.value - 3)],
        steps: family < 2 || family === 3 ? 5 : 4
      };
    }
    if (mode === 'V') {
      const pre = PREFIXES[j % PREFIXES.length], suf = SUFFIXES[j % SUFFIXES.length];
      const rotate = text => text.slice(1) + text[0];
      const unrotate = text => text[text.length - 1] + text.slice(0, -1);
      const swap = text => text[1] + text[0] + text.slice(2);
      const reverse = text => Array.from(text).reverse().join('');
      const applyText = text => [() => pre + text, () => text + suf, () => reverse(text), () => rotate(text), () => swap(text), () => text + suf + suf, () => pre + text + suf][family]();
      const inverseText = text => [() => text.slice(1), () => text.slice(0, -1), () => reverse(text), () => unrotate(text), () => swap(text), () => text.slice(0, -2), () => text.slice(1, -1)][family]();
      const explain = ['在词片最前面加「' + pre + '」', '在词片最后加「' + suf + '」', '把字符次序完全反过来', '把最前面的字符移到最后', '交换前两个字符的位置，保留其余字符', '在词片最后加两个「' + suf + '」', '在最前面加「' + pre + '」，同时在最后加「' + suf + '」'][family];
      return { mode, family: 'word-' + family, make: () => word(WORDS[rng.int(WORDS.length)]), apply: x => word(applyText(x.text)), inverse: x => word(inverseText(x.text)), describe: explain, steps: 5,
        distractors: x => [word(reverse(x.text)), word(rotate(x.text)), word(swap(x.text)), word(x.text + suf), word(pre + x.text), word(x.text.slice(1)), word(x.text + pre)] };
    }
    const make = () => ({ kind: 'figure', shape: family === 2 || family === 3 || family === 6 ? 4 : rng.int(4), color: rng.int(4), count: 1 + rng.int(2), filled: true, rotation: rng.int(4), size: 1 });
    const apply = x => { const y = clone(x); if (family === 0) y.count++; if (family === 1) y.count += 2; if (family === 2) y.rotation = mod(y.rotation + 1, 4); if (family === 3) y.rotation = mod(y.rotation + 2, 4); if (family === 4) y.filled = !y.filled; if (family === 5) y.count *= 2; if (family === 6) { y.count++; y.rotation = mod(y.rotation + 1, 4); } return y; };
    const inverse = x => { const y = clone(x); if (family === 0) y.count--; if (family === 1) y.count -= 2; if (family === 2) y.rotation = mod(y.rotation - 1, 4); if (family === 3) y.rotation = mod(y.rotation - 2, 4); if (family === 4) y.filled = !y.filled; if (family === 5) y.count /= 2; if (family === 6) { y.count--; y.rotation = mod(y.rotation - 1, 4); } return y; };
    const describe = ['每次增加一个图形，保留其他特点', '每次增加两个图形，保留其他特点', '每个箭头顺时针转90°', '每个箭头旋转180°', '实心与空心互换，保留其他特点', '每次把图形数量乘2', '数量增加1，同时每个箭头顺时针转90°'][family];
    const distractors = x => {
      if (family === 4) return [{ ...x, filled: !x.filled }, { ...x, count: x.count + 1 }];
      if (family === 2 || family === 3) return [1, 2, 3].map(d => ({ ...x, rotation: mod(x.rotation + d, 4) }));
      if (family === 6) return [{ ...x, count: x.count + 1 }, { ...x, rotation: mod(x.rotation + 1, 4) }, { ...x, count: Math.max(1, x.count - 1) }, { ...x, rotation: mod(x.rotation + 2, 4) }];
      return [1, -1, 2, 3, -2].filter(d => x.count + d > 0).map(d => ({ ...x, count: x.count + d }));
    };
    return { mode, family: 'figure-' + family, make, apply, inverse, describe, distractors, steps: family === 5 ? 4 : 5 };
  }
  function inverseCheck(model, rng) {
    const before = model.make(), after = model.apply(before);
    return { kind: 'choice', prompt: '用另一组材料逆向还原：下方是变化后的结果，哪张是变化之前的样子？', display: { kind: 'result', card: after }, ...choices(before, model.distractors(before), rng), before, after, method: 'inverse-restoration' };
  }
  function buildR(mode, j, rng) {
    const model = relationalModel(mode, j, rng), useSequence = j % 2 === 1 && !(mode === 'V' && j % 7 === 2);
    let main;
    if (useSequence) {
      const cards = [model.make()]; for (let k = 1; k < model.steps; k++) cards.push(model.apply(cards[k - 1]));
      const answer = model.apply(cards[cards.length - 1]);
      main = { kind: 'choice', prompt: '比较相邻项的联系。沿用能解释全部已知项的同一种变化，下一项是什么？', display: { kind: 'sequence', cards }, ...choices(answer, model.distractors(answer), rng) };
    } else {
      const pairs = [], used = new Set();
      for (let tries = 0; pairs.length < 2 && tries < 100; tries++) { const x = model.make(); if (used.has(cardKey(x))) continue; used.add(cardKey(x)); pairs.push([x, model.apply(x)]); }
      let probe = model.make(); for (let k = 0; used.has(cardKey(probe)) && k < 50; k++) probe = model.make();
      const answer = model.apply(probe);
      main = { kind: 'choice', prompt: '前两组遵循同一种变化。把这条联系用于第三组，应该得到哪张？', display: { kind: 'analogy', pairs, probe }, ...choices(answer, model.distractors(answer), rng) };
    }
    const check = inverseCheck(model, rng);
    return { main, check, explanation: '可统一解释已知材料的变化是：' + model.describe + '。把同一变化用于新对象，即得到相应结果。', checkExplanation: '这里采用本项目设计的逆向还原查验：把刚才的变化倒过来，检查能否还原原对象。它补充了同一关系的检验，不代表原文所说相反比较的唯一形式。', model: { family: model.family, process: 'same-relation', describe: model.describe }, verify: () => equal(model.inverse(model.apply(check.before)), check.before) && equal(check.options[check.answer], check.before) };
  }
  function fitsSequence(cards, model) { return cards.slice(1).every((x, i) => equal(x, model.apply(cards[i]))); }
  function buildF(mode, j, rng) {
    const model = relationalModel(mode, j, rng), corrected = [model.make()];
    for (let k = 1; k < model.steps; k++) corrected.push(model.apply(corrected[k - 1]));
    const position = 1 + rng.int(corrected.length - 2), expectedCard = corrected[position];
    const alternatives = model.distractors(expectedCard).filter(x => !equal(x, expectedCard));
    assert(alternatives.length, 'Need an erroneous item');
    const disturbed = clone(corrected); disturbed[position] = alternatives[rng.int(alternatives.length)];
    const repair = choices(expectedCard, [disturbed[position], ...alternatives], rng);
    const validLocations = disturbed.map((_, i) => {
      if (i === 0) return false;
      const candidate = clone(disturbed); candidate[i] = model.apply(candidate[i - 1]);
      return fitsSequence(candidate, model);
    }).map((v, i) => v ? i : -1).filter(x => x >= 0);
    assert(validLocations.length === 1 && validLocations[0] === position, 'Disturbed sequence must have one repair location');
    const main = { kind: 'repair', prompt: '序列中只有一项破坏了其余项的变化。先指出位置，再选择替换卡片，把整条序列修好。', display: { kind: 'sequence', cards: disturbed }, options: repair.options, answer: { position, repair: repair.answer } };
    const check = inverseCheck(model, rng);
    return { main, check, explanation: '整条序列应当' + model.describe + '。第' + (position + 1) + '项破坏了这一联系；用所示正确卡片替换后，每一段相邻关系都恢复一致。', checkExplanation: '先把你选择的替换卡代回原序列，实际判断它两侧的关系是否和其他位置一致；再用新材料作逆向还原。局部关系核验与逆向还原都是本项目的具体检查实现，不代表原文只允许一种检查形式。', model: { family: model.family, process: 'locate-and-repair', corrected, disturbed, position }, verify: () => fitsSequence(corrected, model) && !fitsSequence(disturbed, model) && validLocations.length === 1 && equal(model.inverse(model.apply(check.before)), check.before) };
  }
  // Independent row and column components prevent solving a system item from one direction alone.
  function systemModel(mode, j, rng) {
    const rows = 3, cols = 3;
    if (mode === 'N') {
      const h = j % 3 === 1 ? { a: 2, b: j >= 4 ? 1 : 0 } : { a: 1, b: 1 + rng.int(4) };
      const v = j % 3 === 2 ? { a: 2, b: 0 } : { a: 1, b: j % 2 ? 2 + rng.int(4) : -(1 + rng.int(3)) };
      const iterate = (start, rule, times) => { let x = start; for (let k = 0; k < times; k++) x = x * rule.a + rule.b; return x; };
      const describe = rule => rule.a === 1 ? (rule.b > 0 ? '加' : '减') + Math.abs(rule.b) : '乘' + rule.a + (rule.b ? '再加' + rule.b : '');
      return {
        family: 'joint-number-pairs', rows, cols,
        horizontal: { component: 'first', ...h }, vertical: { component: 'second', ...v },
        board() {
          const rowBases = rng.shuffle([3, 5, 7, 9, 11, 13]).slice(0, rows), colBases = rng.shuffle([12, 15, 18, 21, 24, 27]).slice(0, cols);
          return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ({ kind: 'number-pair', values: [iterate(rowBases[r], h, c), iterate(colBases[c], v, r)] })));
        },
        hValue: x => x.values[0], vValue: x => x.values[1],
        hForward: x => x * h.a + h.b, hBackward: x => (x - h.b) / h.a,
        vForward: x => x * v.a + v.b, vBackward: x => (x - v.b) / v.a,
        perturbH: x => ({ ...clone(x), values: [x.values[0] + 1, x.values[1]] }),
        perturbV: x => ({ ...clone(x), values: [x.values[0], x.values[1] + 1] }),
        describe: '横向比较每格的甲数，每步' + describe(h) + '；纵向比较每格的乙数，每步' + describe(v) + '。两条线约束不同部分，必须联合使用'
      };
    }
    if (mode === 'V') {
      const pre = PREFIXES[(j + 2) % PREFIXES.length], suf = SUFFIXES[(j + 1) % SUFFIXES.length];
      const hKind = j % 3, vKind = (j + 1) % 3;
      const reverse = text => Array.from(text).reverse().join('');
      const rotate = text => text.slice(1) + text[0], unrotate = text => text.at(-1) + text.slice(0, -1);
      const hForward = text => hKind === 0 ? pre + text : hKind === 1 ? text + pre : rotate(text);
      const hBackward = text => hKind === 0 ? text.slice(1) : hKind === 1 ? text.slice(0, -1) : unrotate(text);
      const vForward = text => vKind === 0 ? suf + text : vKind === 1 ? text + suf : reverse(text);
      const vBackward = text => vKind === 0 ? text.slice(1) : vKind === 1 ? text.slice(0, -1) : reverse(text);
      const iterate = (start, fn, count) => { let result = start; for (let k = 0; k < count; k++) result = fn(result); return result; };
      return {
        family: 'joint-word-pairs', rows, cols,
        horizontal: { component: 'first', kind: hKind, symbol: pre }, vertical: { component: 'second', kind: vKind, symbol: suf },
        board() {
          const rowBases = rng.shuffle(WORDS).slice(0, rows), colBases = rng.shuffle(WORDS).slice(0, cols);
          return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => ({ kind: 'word-pair', parts: [iterate(rowBases[r], hForward, c), iterate(colBases[c], vForward, r)] })));
        },
        hValue: x => x.parts[0], vValue: x => x.parts[1], hForward, hBackward, vForward, vBackward,
        perturbH: x => ({ ...clone(x), parts: [hForward(x.parts[0]), x.parts[1]] }),
        perturbV: x => ({ ...clone(x), parts: [x.parts[0], vForward(x.parts[1])] }),
        describe: '横向只比较甲字片：' + ['在前面加「' + pre + '」', '在后面加「' + pre + '」', '把最前面的字符移到最后'][hKind] + '；纵向只比较乙字片：' + ['在前面加「' + suf + '」', '在后面加「' + suf + '」', '把字符次序反过来'][vKind] + '。只看一条线不能确定另一片的结果'
      };
    }
    const family = j % 3, hStep = j >= 4 ? 2 : 1, shape = family === 0 ? 4 : rng.int(4), color = rng.int(4);
    const verticalComponent = ['rotation', 'size', 'filled'][family];
    const vForward = x => family === 0 ? mod(x + 1, 4) : family === 1 ? x + 1 : !x;
    const vBackward = x => family === 0 ? mod(x - 1, 4) : family === 1 ? x - 1 : !x;
    return {
      family: 'joint-figure-components-' + family, rows, cols,
      horizontal: { component: 'count', step: hStep }, vertical: { component: verticalComponent, family },
      board() {
        const rowCounts = rng.shuffle([1, 2, 3]).slice(0, rows);
        const colFeatures = family === 0 ? rng.shuffle([0, 1, 2, 3]).slice(0, cols) : family === 1 ? [1, 1, 1] : rng.shuffle([false, true, false]);
        return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
          const card = { kind: 'figure', shape, color, count: rowCounts[r] + c * hStep, filled: true, rotation: 0, size: 1 };
          let feature = colFeatures[c]; for (let k = 0; k < r; k++) feature = vForward(feature);
          card[verticalComponent] = feature; return card;
        }));
      },
      hValue: x => x.count, vValue: x => x[verticalComponent],
      hForward: x => x + hStep, hBackward: x => x - hStep, vForward, vBackward,
      perturbH: x => ({ ...clone(x), count: x.count + 1 }),
      perturbV: x => ({ ...clone(x), [verticalComponent]: family === 1 ? (x.size === 3 ? 2 : x.size + 1) : family === 0 ? mod(x.rotation + 1, 4) : !x.filled }),
      describe: '横向比较图形数量，每步增加' + hStep + '个；纵向比较' + ['箭头方向，每步顺时针转90°', '每个图形的大小，每步增大一级', '填充方式，实心与空心交替'][family] + '。数量关系与纵向变化必须同时满足'
    };
  }
  function systemChecks(model, cells, position, candidate) {
    const [r, c] = position, horizontal = [], vertical = [];
    if (c > 0 && cells[r][c - 1]) horizontal.push(equal(model.hValue(candidate), model.hForward(model.hValue(cells[r][c - 1]))));
    if (c + 1 < cells[r].length && cells[r][c + 1]) horizontal.push(equal(model.hValue(candidate), model.hBackward(model.hValue(cells[r][c + 1]))));
    if (r > 0 && cells[r - 1][c]) vertical.push(equal(model.vValue(candidate), model.vForward(model.vValue(cells[r - 1][c]))));
    if (r + 1 < cells.length && cells[r + 1][c]) vertical.push(equal(model.vValue(candidate), model.vBackward(model.vValue(cells[r + 1][c]))));
    return { horizontal: horizontal.length > 0 && horizontal.every(Boolean), vertical: vertical.length > 0 && vertical.every(Boolean) };
  }
  function systemOptionSets(model, task, position) {
    const scores = task.options.map(card => systemChecks(model, task.display.cells, position, card));
    return {
      horizontal: scores.map((s, i) => s.horizontal ? i : -1).filter(i => i >= 0),
      vertical: scores.map((s, i) => s.vertical ? i : -1).filter(i => i >= 0),
      both: scores.map((s, i) => s.horizontal && s.vertical ? i : -1).filter(i => i >= 0)
    };
  }
  function buildS(mode, j, rng) {
    const model = systemModel(mode, j, rng), complete = model.board(), reverseComplete = model.board();
    const mainPosition = [model.rows - 1, model.cols - 1], checkPosition = [0, 0];
    const makeOptions = correct => choices(correct, [model.perturbH(correct), model.perturbV(correct), model.perturbV(model.perturbH(correct))], rng);
    const mainCells = clone(complete), checkCells = clone(reverseComplete);
    const mainCorrect = mainCells[mainPosition[0]][mainPosition[1]], checkCorrect = checkCells[0][0];
    mainCells[mainPosition[0]][mainPosition[1]] = null; checkCells[0][0] = null;
    const main = { kind: 'choice', prompt: '比较完整的行与列。哪张卡片能让横向和纵向的联系同时成立？', display: { kind: 'grid', cells: mainCells }, ...makeOptions(mainCorrect) };
    const check = { kind: 'choice', prompt: '换一组材料，空格移到起点。分别还原两条方向的联系，再选出同时符合的卡片。', display: { kind: 'grid', cells: checkCells }, ...makeOptions(checkCorrect), method: 'joint-inverse-restoration' };
    const sets = systemOptionSets(model, main, mainPosition), reverseSets = systemOptionSets(model, check, checkPosition);
    const allRelationsHold = cells => cells.every((line, r) => line.every((card, c) => (!c || equal(model.hValue(card), model.hForward(model.hValue(line[c - 1])))) && (!r || equal(model.vValue(card), model.vForward(model.vValue(cells[r - 1][c]))))));
    const bothNeeded = set => set.horizontal.length === 2 && set.vertical.length === 2 && set.both.length === 1;
    assert(bothNeeded(sets) && bothNeeded(reverseSets), 'Every system task must require both directions');
    return {
      main, check,
      explanation: '两个方向分别约束卡片的不同部分：' + model.describe + '。有一个干扰项只满足横向，另一个只满足纵向，只有一个答案同时通过。',
      checkExplanation: '本项目把检查设计为“换材料、逆向还原”：横向与纵向各留有两个候选，必须合并两条证据，才能还原起点。逆向还原是具体教学实现，不等同于原文所有“相反比较”的形式。',
      model: { family: model.family, process: 'joint-relations', horizontal: model.horizontal, vertical: model.vertical, complete, reverseComplete, mainPosition, checkPosition, optionSets: sets, reverseOptionSets: reverseSets },
      verify: () => allRelationsHold(complete) && allRelationsHold(reverseComplete) && bothNeeded(systemOptionSets(model, main, mainPosition)) && bothNeeded(systemOptionSets(model, check, checkPosition)) && equal(sets.both, [main.answer]) && equal(reverseSets.both, [check.answer])
    };
  }
  const builders = { G: buildG, D: buildD, C: buildC, R: buildR, F: buildF, S: buildS };
  const offsets = [0, 0, 1, 1, 2, 2], questions = [], banks = {};
  TYPES.forEach((type, ti) => {
    const counters = { V: 0, F: 0, N: 0 }; banks[type.id] = [];
    for (let i = 0; i < 20; i++) {
      const mode = MODES[(i + offsets[ti]) % 3], j = counters[mode]++, seed = 271828 + ti * 100003 + j * 503 + mode.charCodeAt(0) * 37;
      const q = builders[type.id](mode, j, random(seed));
      Object.assign(q, { id: type.id + String(i + 1).padStart(2, '0'), type: type.id, mode, level: j < 2 ? 1 : j < 5 ? 2 : 3, seed, materialIndex: j, source: type.source });
      questions.push(q); banks[type.id].push(q);
    }
  });
  const used = Object.fromEntries(TYPES.map(t => [t.id, 0]));
  LESSONS.forEach(lesson => { const left = lesson.counts.slice(); while (left.some(Boolean)) TYPES.forEach((t, i) => { if (left[i]) { const q = banks[t.id][used[t.id]++]; q.lesson = lesson.n; lesson.items.push(q.id); q.number = (lesson.n - 1) * 12 + lesson.items.length; q.revision = q.type === 'S' ? 2 : 1; left[i]--; } }); });
  const byId = Object.fromEntries(questions.map(q => [q.id, q]));
  function repairEvidence(q, value) {
    if (q.type !== 'F' || !validResponse(q, value)) return null;
    const relation = relationalModel(q.mode, q.materialIndex, random(q.seed));
    const cards = clone(q.model.disturbed); cards[value.position] = clone(q.main.options[value.repair]);
    const edges = [];
    if (value.position > 0) edges.push({ from: value.position - 1, to: value.position, same: equal(relation.apply(cards[value.position - 1]), cards[value.position]) });
    if (value.position + 1 < cards.length) edges.push({ from: value.position, to: value.position + 1, same: equal(relation.apply(cards[value.position]), cards[value.position + 1]) });
    return { cards, edges };
  }
  function sameResponse(q, value) {
    if (q.main.kind === 'group') return Array.isArray(value) && equal(value.slice().sort((a, b) => a - b), q.main.answer.slice().sort((a, b) => a - b));
    if (q.main.kind === 'repair') return value && value.position === q.main.answer.position && value.repair === q.main.answer.repair;
    return Number.isInteger(value) && value === q.main.answer;
  }
  function validResponse(q, value) {
    if (q.main.kind === 'group') return Array.isArray(value) && value.length === 3 && new Set(value).size === 3 && value.every(i => Number.isInteger(i) && i >= 0 && i < q.main.options.length);
    if (q.main.kind === 'repair') return value && Number.isInteger(value.position) && value.position >= 0 && value.position < q.main.display.cards.length && Number.isInteger(value.repair) && value.repair >= 0 && value.repair < q.main.options.length;
    return Number.isInteger(value) && value >= 0 && value < q.main.options.length;
  }
  function validCheck(q, value) { return Number.isInteger(value) && value >= 0 && value < q.check.options.length; }
  function audit() {
    const errors = [], fingerprints = new Map();
    questions.forEach(q => {
      if (!validResponse(q, q.main.answer) || !validCheck(q, q.check.answer)) errors.push(q.id + ':invalid-key');
      if (!q.verify()) errors.push(q.id + ':model-failure');
      for (const [name, options] of [['main', q.main.options], ['check', q.check.options]]) if (new Set(options.map(cardKey)).size !== options.length) errors.push(q.id + ':' + name + '-duplicate-options');
      const key = JSON.stringify([q.type, q.mode, q.main]); if (fingerprints.has(key)) errors.push(q.id + ':duplicate-of-' + fingerprints.get(key)); fingerprints.set(key, q.id);
      if (q.type === 'C' && (q.main.display.rows || q.main.display.cols || q.model.labelsGiven)) errors.push(q.id + ':classification-labels');
      if (q.type === 'F' && q.main.kind !== 'repair') errors.push(q.id + ':missing-repair');
      if (q.type === 'S' && ![q.model.optionSets, q.model.reverseOptionSets].every(s => s.horizontal.length === 2 && s.vertical.length === 2 && s.both.length === 1)) errors.push(q.id + ':single-direction-shortcut');
    });
    return { version: VERSION, total: questions.length, types: Object.fromEntries(TYPES.map(t => [t.id, questions.filter(q => q.type === t.id).length])), materials: Object.fromEntries(MODES.map(m => [m, questions.filter(q => q.mode === m).length])), lessons: LESSONS.map(l => l.items.length), unlabelledClassification: questions.filter(q => q.type === 'C' && !q.model.labelsGiven).length, repairs: questions.filter(q => q.main.kind === 'repair').length, independentChecks: questions.length, errors };
  }
  return { VERSION, TYPES, TYPE, MODES, MODE_NAMES, LESSONS, questions, byId, sameResponse, validResponse, validCheck, repairEvidence, audit, equal, clone, cardKey, random, attribute, dimension, helpers: { commonDims, matches, combinations, fitsSequence, relationalModel, systemModel, systemChecks, systemOptionSets } };
});
