/* Interactive learning sequence: independent attempt -> opposite comparison -> explanation. */
(function () {
  'use strict';
  const E = window.KlauerEngine, KEY = 'klauer-method-v2', OLD_KEY = 'klauer-comparison-lab-v1';
  const $ = s => document.querySelector(s);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initial = () => ({ schema: 2, version: E.VERSION, lesson: 1, index: 0, answers: {}, reviews: {}, started: Date.now() });
  let state = initial(), view = 'home', storageOK = true, toastTimer, bucket = 'a', reviewFilter = 'todo';
  function cleanResponse(q, v) {
    if (q.main.kind === 'group') return Array.isArray(v) ? Array.from(new Set(v.filter(i => Number.isInteger(i) && i >= 0 && i < q.main.options.length))).slice(0, 3) : [];
    if (q.main.kind === 'repair') return { position: Number.isInteger(v?.position) && v.position >= 0 && v.position < q.main.display.cards.length ? v.position : null, repair: Number.isInteger(v?.repair) && v.repair >= 0 && v.repair < q.main.options.length ? v.repair : null };
    return Number.isInteger(v) && v >= 0 && v < q.main.options.length ? v : null;
  }
  function validate(input) {
    if (!input || input.schema !== 2 || !input.answers || typeof input.answers !== 'object' || Array.isArray(input.answers)) throw Error('需要本次方法重做版的进度文件，旧题记录不混入新题。');
    const out = initial(); out.lesson = Number.isInteger(input.lesson) && input.lesson >= 1 && input.lesson <= 10 ? input.lesson : 1; out.index = Number.isInteger(input.index) && input.index >= 0 && input.index < 12 ? input.index : 0; out.started = Number(input.started) || Date.now();
    for (const [id, a] of Object.entries(input.answers)) {
      const q = E.byId[id]; if (!q || !a || typeof a !== 'object') continue;
      const first = E.validResponse(q, a.first) ? E.clone(a.first) : null;
      const hasFinal = a.final !== undefined && E.validResponse(q, a.final);
      const check = E.validCheck(q, a.check) ? a.check : null;
      const completed = a.stage === 'done' && first !== null && hasFinal && E.sameResponse(q, a.final) && check === q.check.answer;
      const stage = completed ? 'done' : ['check', 'feedback'].includes(a.stage) && first !== null ? a.stage : 'answer';
      out.answers[id] = {
        stage, draft: cleanResponse(q, a.draft), first, final: hasFinal ? E.clone(a.final) : null,
        hints: Math.min(3, Math.max(0, Number(a.hints) || 0)), firstHint: Math.min(3, Math.max(0, Number(a.firstHint) || 0)),
        check, firstCheck: E.validCheck(q, a.firstCheck) ? a.firstCheck : null,
        checkAttempts: Math.min(999, Math.max(0, Number(a.checkAttempts) || 0)), tries: Math.min(999, Math.max(0, Number(a.tries) || 0)),
        note: typeof a.note === 'string' ? a.note.slice(0, 3000) : '', inspect: typeof a.inspect === 'string' ? a.inspect.slice(0, 3000) : '',
        reflection: typeof a.reflection === 'string' ? a.reflection.slice(0, 3000) : '', classification: typeof a.classification === 'string' ? a.classification : '',
        compareOpen: a.compareOpen === true, firstSupport: a.firstSupport === true, checkedAt: Number(a.checkedAt) || 0
      };
    }
    if (input.reviews && typeof input.reviews === 'object') for (const [lesson, entries] of Object.entries(input.reviews)) {
      if (+lesson < 2 || +lesson > 10 || !entries || typeof entries !== 'object') continue;
      out.reviews[lesson] = Object.fromEntries(Object.entries(entries).filter(([id, val]) => E.byId[id] && val === true));
    }
    return out;
  }
  try { const data = localStorage.getItem(KEY); if (data) state = validate(JSON.parse(data)); localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { storageOK = false; }
  const qCurrent = () => E.byId[E.LESSONS[state.lesson - 1].items[state.index]];
  function record(q) {
    if (!state.answers[q.id]) state.answers[q.id] = { stage: 'answer', draft: q.main.kind === 'group' ? [] : q.main.kind === 'repair' ? { position: null, repair: null } : null, first: null, final: null, hints: 0, firstHint: 0, check: null, firstCheck: null, checkAttempts: 0, tries: 0, note: '', inspect: '', reflection: '', classification: '', compareOpen: false, firstSupport: false };
    return state.answers[q.id];
  }
  const completed = id => state.answers[id]?.stage === 'done';
  const doneCount = () => E.questions.filter(q => completed(q.id)).length;
  const lessonDone = l => l.items.filter(completed).length;
  function reviewIds(l) { if (l === 1) return []; const ids = E.LESSONS.slice(0, l).flatMap(x => x.items).filter(completed); if (l === 2) return E.LESSONS[0].items.filter(completed); if (l === 3 || l === 8) return ids.filter(id => E.TYPE[E.byId[id].type].branch === '属性'); if (l === 9) return ids.filter(id => E.TYPE[E.byId[id].type].branch === '关系'); return ids; }
  const requiresReview = l => l >= 2 && l <= 7;
  function reviewComplete(l) { if (!requiresReview(l)) return true; const ids = reviewIds(l); return ids.length > 0 && ids.every(id => state.reviews[l]?.[id]); }
  const courseComplete = l => lessonDone(l) === 12 && reviewComplete(l.n);
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); storageOK = true; } catch (e) { storageOK = false; } const el = $('#storageStatus'); if (el) el.textContent = storageOK ? '本浏览器保存进度' : '当前无法保存，请导出备份'; }
  function notify(text) { clearTimeout(toastTimer); $('#toast').textContent = text; $('#toast').classList.remove('hidden'); toastTimer = setTimeout(() => $('#toast').classList.add('hidden'), 4200); }
  function changeView(next) { view = next; render(); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function start(n, index) { state.lesson = n; state.index = index ?? Math.max(0, E.LESSONS[n - 1].items.findIndex(id => !completed(id))); save(); changeView('train'); }
  const COLOR = ['#c36945', '#3f709a', '#538152', '#8c67a1'];
  function figure(card) {
    const n = card.count, cols = n <= 3 ? n : n <= 8 ? 4 : n <= 16 ? 4 : 8, rows = Math.ceil(n / cols), width = Math.max(120, cols * 30), height = Math.max(90, rows * 31);
    const stepX = width / (cols + 1), stepY = height / (rows + 1), baseR = Math.min(stepX * 0.34, stepY * 0.32), radius = baseR * (0.65 + (card.size || 1) * 0.23);
    let shapes = '';
    for (let k = 0; k < n; k++) {
      const x = stepX * (k % cols + 1), y = stepY * (Math.floor(k / cols) + 1), r = radius;
      const path = card.shape === 0 ? `<circle r="${r}"></circle>` : card.shape === 1 ? `<rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" rx="1"></rect>` : card.shape === 2 ? `<path d="M0 ${-r} L${r} ${r} L${-r} ${r}Z"></path>` : card.shape === 3 ? `<path d="M0 ${-r} L${r} 0 L0 ${r} L${-r} 0Z"></path>` : `<path d="M${-r} ${-r / 3} H0 V${-r} L${r} 0 L0 ${r} V${r / 3} H${-r}Z"></path>`;
      shapes += `<g transform="translate(${x} ${y}) rotate(${(card.rotation || 0) * 90})" fill="${card.filled ? COLOR[card.color] : 'none'}" stroke="${COLOR[card.color]}" stroke-width="1.6" stroke-linejoin="round">${path}</g>`;
    }
    const shapesNames = ['圆形', '方形', '三角形', '菱形', '箭头'];
    const label = [E.MODE_NAMES.F, ['橙色', '蓝色', '绿色', '紫色'][card.color], card.filled ? '实心' : '空心', shapesNames[card.shape], n + '个', card.shape === 4 ? ['向右', '向下', '向左', '向上'][card.rotation] : '', '尺寸' + card.size].filter(Boolean).join('，');
    return `<svg class="drawing" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">${shapes}</svg>`;
  }
  function cardHTML(card) {
    if (card === null) return '<span class="token blank">?</span>';
    if (card.kind === 'figure') return `<span class="token graphic">${figure(card)}</span>`;
    if (card.kind === 'record') return `<span class="record-card">${card.fields.map(([k, v]) => `<span><small>${esc(k)}</small><b>${esc(v)}</b></span>`).join('')}</span>`;
    if (card.kind === 'word') return `<span class="token word">${esc(card.text)}</span>`;
    if (card.kind === 'number') return `<span class="token number">${esc(card.value)}</span>`;
    if (card.kind === 'position') return `<span class="token">第 ${card.value} 格</span>`;
    if (card.kind === 'placement') return `<span class="placement">${cardHTML(card.card)}<span>放入第 <b>${card.position}</b> 格</span></span>`;
    return `<span class="token">${esc(card)}</span>`;
  }
  function displayHTML(display, isCheck) {
    if (!display) return '';
    if (display.kind === 'cards') return `<div class="stimuli">${display.cards.map(cardHTML).join('')}</div>`;
    if (display.kind === 'sequence') return `<div class="stimuli sequence">${display.cards.map((x, i) => `<div class="seqitem">${cardHTML(x)}<small>第 ${i + 1} 项</small></div>`).join('<span class="seqarr" aria-hidden="true">→</span>')}</div>`;
    if (display.kind === 'analogy') return `<div class="analogies">${display.pairs.map(pair => `<div class="pair">${cardHTML(pair[0])}<span class="seqarr">→</span>${cardHTML(pair[1])}</div>`).join('')}<div class="pair probe">${cardHTML(display.probe)}<span class="seqarr">→</span><span class="token blank">?</span></div></div>`;
    if (display.kind === 'result') return `<div class="stimuli"><span class="token blank">?</span><span class="seqarr">→</span>${cardHTML(display.card)}</div>`;
    if (display.kind === 'grid' || display.kind === 'classification') return `<div class="stimuli"><div class="matrixwrap"><table class="matrix ${display.kind === 'classification' ? 'unlabelled' : ''}" aria-label="${display.kind === 'classification' ? '无分类标签的参照表格' : '关系矩阵'}"><tbody>${display.cells.map((row, r) => `<tr>${row.map((c, col) => `<td>${cardHTML(c)}${display.kind === 'classification' || (isCheck && qCurrent().type === 'C') ? `<small class="cell-number">第 ${r * row.length + col + 1} 格</small>` : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>${display.probe ? `<div class="probe-card"><small>需要归位的新卡片</small>${cardHTML(display.probe)}</div>` : ''}`;
    return '';
  }
  function optionsHTML(q, a, check) {
    const task = check ? q.check : q.main, draft = check ? a.check : a.draft;
    let position = '';
    if (!check && task.kind === 'repair') position = `<p class="choice-label">① 哪一项需要修复？</p><div class="position-options">${task.display.cards.map((_, i) => `<button data-position="${i}" aria-pressed="${draft?.position === i}" class="${draft?.position === i ? 'selected' : ''}">第 ${i + 1} 项</button>`).join('')}</div><p class="choice-label">② 用哪张卡片替换？</p>`;
    const label = check ? '反向检查选项' : task.kind === 'group' ? '选择三张组成一组' : task.kind === 'place' ? '选择归位位置' : '解答选项';
    return `${position}<div class="row between choice-label"><small>${task.kind === 'group' ? '选择三张 · 不必说出题型名称' : label}</small><small>${!check ? '先解答，后检查' : '标准解法尚未展示'}</small></div><div class="options ${task.kind === 'group' ? 'group-options' : ''}" role="group" aria-label="${esc(label)}">${task.options.map((card, i) => { const selected = check ? draft === i : task.kind === 'group' ? Array.isArray(draft) && draft.includes(i) : task.kind === 'repair' ? draft?.repair === i : draft === i; return `<button class="option ${selected ? 'selected' : ''}" data-${check ? 'check' : 'option'}="${i}" aria-pressed="${selected}"><span class="letter">${String.fromCharCode(65 + i)}</span>${cardHTML(card)}</button>`; }).join('')}</div>`;
  }
  function notesHTML(q, a) {
    if (state.lesson === 1) return `<p class="overviewnote">可以先直接尝试，不必先分析题型。想好了再提交。</p>`;
    return `<details class="notes" ${state.lesson >= 8 ? 'open' : ''}><summary>${state.lesson >= 8 ? '每题三问 · 先自己想，也可与陪练口头讨论' : '记录一下想法（可选）'}</summary><div class="note-body"><label for="hypothesis">${state.lesson >= 8 ? '① 我看了哪些特点或联系？② 我准备怎样比较？' : '我发现的规律或假设'}</label><textarea id="hypothesis" maxlength="3000" placeholder="先写自己的想法；不会按字数或术语评分。">${esc(a.note)}</textarea><label for="inspect">${state.lesson >= 8 ? '③ 我怎样用另一方向检查？' : '我准备怎样检查这个假设'}</label><textarea id="inspect" maxlength="3000" placeholder="可尝试找反例、看剩下对象的共同点，或倒过来还原变化。">${esc(a.inspect)}</textarea><small>也可口述。文字不自动判分；完成后对照解释，或请陪练判断理由是否成立。</small></div></details>`;
  }
  function hintHTML(q, a) {
    if (!a.hints && !a.compareOpen) return '';
    const generic = q.type === 'C' ? '分别比较同一行与同一列，观察哪些特点保持、哪些改变。先不要只看新卡片。' : q.type === 'S' ? '把横向与纵向分别当成一条线，提出两个关系，再让同一个候选同时通过它们。' : q.type === 'R' || q.type === 'F' ? '比较相邻两项或成对对象之间发生的变化。让你的假设解释每一段联系。' : '逐项比较可见特点：哪些相同，哪些不同？不要只凭最显眼的一张。';
    return `<section class="hint-panel">${a.hints >= 1 ? '<div class="hint"><b>提示1</b>　先整体观察，提出一个可能的规则，再用所有材料检验它。</div>' : ''}${a.hints >= 2 ? `<div class="hint"><b>提示2</b>　${esc(generic)}</div>` : ''}${a.hints >= 3 ? `<div class="hint"><b>提示3</b>　${esc(q.explanation)}</div>` : ''}${a.compareOpen ? `<div class="strategy"><h3>逐项比较记录</h3><p class="overviewnote">${esc(generic)}把材料按位置编号，轮流检查一个特点或一段关系；检验失败就换假设。</p><label for="comparison">我的逐项比较</label><textarea id="comparison" maxlength="3000" placeholder="例如：第1与第2项之间……；这项规则能否解释其余材料？">${esc(a.reflection)}</textarea></div>` : ''}</section>`;
  }
  function routeButton(name, label, cls = '') { return `<button data-nav="${name}" class="${cls}">${label}</button>`; }
  function home() {
    let old = false; try { old = !!localStorage.getItem(OLD_KEY); } catch (e) {}
    const firstCount = E.questions.filter(q => { const a = state.answers[q.id]; return a?.first !== null && a?.first !== undefined && E.sameResponse(q, a.first) && a.firstHint === 0 && !a.firstSupport; }).length;
    return `<section class="hero"><div><div class="eyebrow">METHOD REBUILT · V2</div><div class="spacer"></div><h1>先自己发现，<br><em>再让规律经得起检查。</em></h1><p>从同与不同中找出结构，提出自己的假设，换个方向验证。题目按六类认知操作重做，每一题都能查看方法依据。</p><div class="row"><button class="primary" id="continue">${doneCount() ? '继续第 ' + state.lesson + ' 课' : '开始第 1 课'}　→</button>${routeButton('about', '题目为什么这样设计')}</div></div><div class="diagram"><div class="method-flow"><span>观察材料</span><b>↓</b><span>提出自己的解答</span><b>↓</b><span>反向查验</span><b>↓</b><span>看解释 · 修订假设</span></div></div></section><div class="stats"><div class="stat"><b>${doneCount()}<small> / 120</small></b>完成解答与检查</div><div class="stat"><b>${E.LESSONS.filter(courseComplete).length}<small> / 10</small></b>完成课程</div><div class="stat"><b>${firstCount}</b>无提示首次答对</div></div>${old ? '<div class="notice">检测到旧版训练记录。旧题数据继续保留；本次题库、检查和记录独立计算，避免把不同任务的结果混在一起。</div>' : ''}<div class="sectiontitle"><h2>十堂课，逐步选择比较方法</h2><span class="badge">每课12道主题 · 每题含查验环节</span></div><div class="coursegrid">${E.LESSONS.map(l => `<button class="course ${l.n === state.lesson ? 'current' : ''}" data-lesson="${l.n}"><div class="row between" style="width:100%"><span class="num">${String(l.n).padStart(2, '0')}</span>${courseComplete(l) ? '<span class="badge">完成 ✓</span>' : ''}</div><h3>${esc(l.title)}</h3><small>${lessonDone(l)}/12${lessonDone(l) === 12 && !reviewComplete(l.n) ? ' · 待归类复盘' : ''}</small><div class="progress"><i style="width:${lessonDone(l) / 12 * 100}%"></i></div></button>`).join('')}</div><p class="overviewnote">建议按顺序分次练习。可参考每周两次、五周完成的研究安排；课次目标来自论文表2，单次时长可随学习者调整。</p><div class="notice">本版依据公开方法及样题机制构造新实例。六类各20题，文字、图形、数量各40题；不是作者商业题册原题的逐题复制。检查小题是每题内部的验证步骤，不另计为主题。</div>`;
  }
  function answerSummary(q, value) {
    if (q.main.kind === 'group') return '卡片 ' + (value || []).map(i => String.fromCharCode(65 + i)).join('、');
    if (q.main.kind === 'repair') return '第 ' + ((value?.position ?? -1) + 1) + ' 项 → 替换为 ' + String.fromCharCode(65 + (value?.repair ?? 0));
    return '选项 ' + String.fromCharCode(65 + value);
  }
  function train() {
    const q = qCurrent(), a = record(q), l = E.LESSONS[state.lesson - 1], step = a.stage === 'answer' ? 1 : a.stage === 'check' ? 2 : 3;
    let content = '';
    if (a.stage === 'answer') content = `<h2 class="qtitle" id="qtitle" tabindex="-1">${esc(q.main.prompt)}</h2>${displayHTML(q.main.display, false)}${q.mode === 'V' ? '<p class="material-note">文字卡的特点以画面为准；字片只比较可见字符，不必猜词语含义。</p>' : q.mode === 'N' ? '<p class="material-note">可比较数的写法或数之间的联系；不需要猜未展示的文化常识。</p>' : ''}${optionsHTML(q, a, false)}${notesHTML(q, a)}${hintHTML(q, a)}<div class="qfoot"><div class="row"><button class="small" id="hint">按需提示 ${a.hints}/3</button><button class="small flat" id="compare">${a.compareOpen ? '收起逐项比较' : '尝试逐项比较'}</button></div><button class="primary" id="submit">保存我的解答，进入查验　→</button></div><small>先整体提出假设；有困难时再用提示或逐项比较。不会在提交后立即揭示标准答案。</small>`;
    if (a.stage === 'check') content = `<div class="saved-answer"><span class="badge">首答已记录</span><span>${esc(answerSummary(q, a.first))}</span><small>暂不揭示对错，先用相反方向检查。</small></div><h2 class="qtitle" id="qtitle" tabindex="-1">${esc(q.check.prompt)}</h2>${displayHTML(q.check.display, true)}${optionsHTML(q, a, true)}${notesHTML(q, a)}<div class="qfoot"><small>这一环节不提供标准规则。</small><button class="primary" id="submitCheck">提交查验，再看讲解　→</button></div>`;
    if (a.stage === 'feedback' || a.stage === 'done') {
      const firstRight = E.sameResponse(q, a.first), checkRight = a.check === q.check.answer, finished = a.stage === 'done';
      content = `<h2 class="qtitle" id="qtitle" tabindex="-1">${finished ? '解答与查验都已通过' : '对照证据，修订自己的想法'}</h2><div class="result-pills"><span class="badge ${firstRight ? '' : 'orange'}">首次解答：${firstRight ? '一致' : '需修订'}</span><span class="badge ${checkRight ? '' : 'orange'}">最近查验：${checkRight ? '一致' : '需修订'}</span>${a.firstHint || a.firstSupport ? '<span class="badge orange">使用过支持</span>' : ''}</div><section class="feedback"><h3>${esc(E.TYPE[q.type].name)} · ${esc(E.TYPE[q.type].operation)}</h3><p>${esc(q.explanation)}</p><p class="check"><b>为什么这样检查：</b>${esc(q.checkExplanation)}</p></section><details class="solution" open><summary>材料与正确结果</summary>${displayHTML(q.main.display, false)}<div class="solution-answer"><small>解答</small>${q.main.kind === 'group' ? q.main.answer.map(i => cardHTML(q.main.options[i])).join('') : q.main.kind === 'repair' ? `<b>第 ${q.main.answer.position + 1} 项替换为</b>${cardHTML(q.main.options[q.main.answer.repair])}` : cardHTML(q.main.options[q.main.answer])}</div><div class="solution-answer"><small>查验结果</small>${cardHTML(q.check.options[q.check.answer])}</div></details>${a.note || a.inspect ? `<div class="strategy"><h3>你先前的想法</h3><p>${esc(a.note || '未写文字，可与陪练讨论。')}</p><p>${esc(a.inspect)}</p><small>网页没有自动判断这段理由是否充分。请与材料、标准解释及陪练意见对照。</small></div>` : ''}<div class="qfoot"><div class="row">${!finished ? '<button id="retry">用同一材料重新解答</button>' : ''}<button id="method" class="small">这道题的方法依据</button></div>${finished ? '<button class="primary" id="next">' + (state.index === 11 ? '本课复盘　→' : '下一题　→') + '</button>' : '<small>修订后重新完成解答与查验；首次记录保留。</small>'}</div>`;
    }
    return `<div class="row between" style="margin-bottom:18px"><div><span class="eyebrow">LESSON ${String(l.n).padStart(2, '0')} · ${E.MODE_NAMES[q.mode]}</span><h2>${esc(l.title)}</h2></div><select id="lessonSelect" aria-label="切换课程" style="width:auto;max-width:170px">${E.LESSONS.map(x => `<option value="${x.n}" ${x.n === l.n ? 'selected' : ''}>第 ${x.n} 课</option>`).join('')}</select></div><div class="training"><section class="card" id="questionCard"><div class="stagebar" aria-label="当前步骤"><span class="${step === 1 ? 'active' : ''}">1 自己解答</span><span class="${step === 2 ? 'active' : ''}">2 反向查验</span><span class="${step === 3 ? 'active' : ''}">3 对照与修订</span></div><small class="question-number">本课 ${state.index + 1}/12 · 题号 ${esc(q.id)} · ${q.level === 1 ? '基础比较' : q.level === 2 ? '变换材料' : '联合比较'}</small>${content}</section><aside class="aside"><div class="card"><h3>本课练习目标</h3><p>${esc(l.goal)}</p><div class="progress"><i style="width:${lessonDone(l) / 12 * 100}%"></i></div><div class="dots">${l.items.map((id, i) => `<button data-jump="${i}" class="${completed(id) ? 'done' : ''} ${state.index === i ? 'here' : ''}" aria-label="第 ${i + 1} 题${completed(id) ? '，完成' : ''}">${i + 1}</button>`).join('')}</div><button class="widebutton small" data-nav="review">归类复盘</button></div><div class="card"><h3>${l.n >= 8 ? '每题问自己三句话' : '让比较服务于发现'}</h3><ol class="steps"><li>我需要看哪些特点或联系？</li><li>我的假设能解释全部材料吗？</li><li>反过来检查，还成立吗？</li></ol><p>不要求先报出题型名称。提示与逐项比较按需使用。第一次解答及检查会单独保留。</p><small>可以邀请家长、教师或同伴追问理由。网页能检查结构化作答，不能代替对解释的判断。</small></div></aside></div>`;
  }
  function review() {
    const l = state.lesson, ids = reviewIds(l), two = l === 2, sorted = state.reviews[l] || {}, choices = two ? [{ id: 'a', name: '对象自身的特点' }, { id: 'r', name: '对象之间的联系' }] : E.TYPES.filter(t => l === 3 || l === 8 ? t.branch === '属性' : l === 9 ? t.branch === '关系' : true).map(t => ({ id: t.id, name: t.branch + ' · ' + t.operation }));
    if (!choices.some(x => x.id === bucket)) bucket = choices[0]?.id || 'a';
    const displayed = reviewFilter === 'todo' ? ids.filter(id => !sorted[id]) : ids;
    return `<div class="row between"><div><span class="eyebrow">REVISIT & COMPARE</span><h2>第 ${l} 课 · 回看你怎样比较</h2></div><select id="reviewLesson" aria-label="选择复盘课次" style="width:auto">${E.LESSONS.map(x => `<option value="${x.n}" ${x.n === l ? 'selected' : ''}>第 ${x.n} 课</option>`).join('')}</select></div><div class="notice">${l === 1 ? '第1课先熟悉题目，不要求学习术语。完成12题后可直接进入第2课。' : '先选择一种比较方式，再点击属于它的已完成题目。可以用日常语言理解分类，不必背诵专业名词。'} 这里回看旧题，不增加120道主题的数量。</div><section class="card" style="margin-top:18px"><div class="row between"><h3>已归类 ${ids.filter(id => sorted[id]).length}/${ids.length}</h3><select id="reviewFilter" aria-label="筛选复盘题" style="width:auto"><option value="todo" ${reviewFilter === 'todo' ? 'selected' : ''}>未归类</option><option value="all" ${reviewFilter === 'all' ? 'selected' : ''}>全部</option></select></div><div class="reviewbuckets">${choices.map(x => `<button data-bucket="${x.id}" class="small ${x.id === bucket ? 'active' : ''}">${esc(x.name)}</button>`).join('')}</div><div class="reviewgrid">${displayed.map(id => { const q = E.byId[id]; return `<button class="reviewcard ${sorted[id] ? 'sorted' : ''}" data-sort="${id}" ${sorted[id] ? 'disabled' : ''}><span class="badge">${id} · 第${q.lesson}课</span><p class="mini">${esc(q.main.prompt)}</p>${displayHTML(q.main.display, false) || `<div class="stimuli">${q.main.options.slice(0, 3).map(cardHTML).join('')}</div>`}<small>${sorted[id] ? '已归类 ✓' : '归入当前比较方式'}</small></button>`; }).join('')}</div>${!displayed.length ? `<div class="empty">${ids.length ? '当前没有未归类题目。' : '先完成本课练习，题卡会显示在这里。'}</div>` : ''}<div class="qfoot"><button data-nav="train">返回题目</button>${lessonDone(E.LESSONS[l - 1]) === 12 && reviewComplete(l) ? `<button class="primary" id="nextLesson">${l < 10 ? '进入第 ' + (l + 1) + ' 课　→' : '查看训练记录　→'}</button>` : `<small>${lessonDone(E.LESSONS[l - 1]) < 12 ? '先完成本课解答与查验' : '完成比较方式复盘后继续'}</small>`}</div></section>`;
  }
  function records() {
    const attempted = E.questions.filter(q => state.answers[q.id]?.first !== null && state.answers[q.id]?.first !== undefined);
    const firstRight = attempted.filter(q => E.sameResponse(q, state.answers[q.id].first)).length;
    const checkRight = attempted.filter(q => state.answers[q.id]?.firstCheck === q.check.answer).length;
    return `<div class="row between"><div><span class="eyebrow">PROCESS RECORD</span><h2>保留第一次，也记录怎样修订</h2></div><div class="row"><button id="export" class="small">导出本版进度</button><button id="import" class="small">导入本版进度</button><input id="importFile" type="file" accept="application/json,.json" hidden></div></div><div class="stats"><div class="stat"><b>${doneCount()}/120</b>解答与查验完成</div><div class="stat"><b>${firstRight}/${attempted.length}</b>首次解答一致（含支持）</div><div class="stat"><b>${checkRight}/${attempted.length}</b>首次反向查验一致</div></div><div class="split" style="margin-top:20px"><div class="card"><h3>六类练习覆盖</h3>${E.TYPES.map(t => { const d = E.questions.filter(q => q.type === t.id && completed(q.id)).length; return `<div class="recordbar"><span>${t.name}</span><div class="progress"><i style="width:${d * 5}%"></i></div><small>${d}/20</small></div>`; }).join('')}</div><div class="card"><h3>怎样理解记录</h3><p class="overviewnote">首次解答、提示、逐项比较和首次检查分别保存。重做不会改写第一次记录；记录的是本套任务的作答行为，不是智商或迁移效果。</p><p class="overviewnote">自由解释可写可口述，网页不按字数或专业术语判定理解。建议定期导出备份。</p><button class="small danger" id="reset" style="margin-top:15px">清除本版进度</button></div></div><div class="sectiontitle"><h3>题目与思考记录</h3><small>点击题号回到该题</small></div><div class="card tablewrap"><table class="table"><thead><tr><th>题目</th><th>过程</th><th>第一次／支持</th><th>我的假设与检查</th></tr></thead><tbody>${attempted.map(q => { const a = state.answers[q.id]; return `<tr><td><button class="small flat" data-openq="${q.id}">${q.id}</button><br><small>第${q.lesson}课</small></td><td>${E.TYPE[q.type].name}<br><small>${a.stage === 'done' ? '完成' : '进行中'}</small></td><td>首答${E.sameResponse(q, a.first) ? '一致' : '需修订'}<br><small>首答前提示${a.firstHint}级${a.firstSupport ? ' · 逐项比较' : ''}；查验${a.checkAttempts}次</small></td><td>${esc(a.note || '未写文字记录')}<br><small>${esc(a.inspect || '可与陪练口头讨论')}</small></td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">完成第一次提交后显示记录。</td></tr>'}</tbody></table></div>`;
  }
  function about() {
    return `<div class="eyebrow">DESIGN EVIDENCE · VERSION ${E.VERSION}</div><h2>从认知操作出发设计题目</h2><div class="stack source" style="margin-top:20px"><section class="card"><h3>本次实际改变了什么</h3><ul><li>去掉题干中“按奇偶性”“蓝色且空心”等提前透露规则的说法。对象特点直接可见，由学习者比较并发现共同点。</li><li>20道交叉分类全部使用无分类标题的参照表格。新卡片保留两个分类维度，同时改变一个无关特点，不能只凭外观完全相同来归位。</li><li>20道关系区分全部要求定位并选择替换对象；修复后每一段关系都必须一致。</li><li>120道主题各含一个不先显示答案的反向检查。先锁定解答，再检查，最后展示规则和证据；检查步骤不另算主题。</li><li>三问可写可口述，不按字数、不按是否报出类别名称决定通过。结构化解答与查验均正确才能完成该题。</li><li>支持按需展开：先整体提出假设，有困难再逐项比较；最高级提示会给出规则，并记录为有支持作答。</li></ul></section><section class="card tablewrap"><h3>六类任务对应的原文与实际操作</h3><table class="table"><thead><tr><th>过程</th><th>实际完成的工作</th><th>验收</th></tr></thead><tbody>${E.TYPES.map((t, i) => `<tr><td>${t.name}<br><small>${esc(t.source)}</small></td><td>${['从对象中组成类别或扩充从示例发现的类别', '找出破坏其他对象共同属性的异项', '发现两个交叉分类维度，再归位新对象', '发现并应用统一变换／续列／类比', '找异常位置并选择替换对象，实际修复序列', '让缺项同时满足矩阵横向和纵向的关系'][i]}</td><td>${['限定可见维度中，共同属性与正确组唯一', '去掉异项后其余对象形成一致类别', '无行列类别标签；两维交叉；无关属性变化', '所有已知关系一致；用新对象作逆向还原', '修复后前后相邻关系均成立', '两个方向均能验证；换材料从起点反向检查'][i]}</td></tr>`).join('')}</tbody></table></section><section class="card"><h3>主要原文依据</h3><p>Klauer & Phye（2008），<i>Inductive Reasoning: A Training Approach</i>：第87—88页定义与表1；第89—90页及图3的整体假设、定向验证与分析策略；第91页版本、题量以及“不必报出题型名称”；第92—93页表2、每题三问与相反比较。</p><div class="row"><a href="https://journals.sagepub.com/doi/10.3102/0034654307313402" target="_blank" rel="noopener noreferrer">2008论文正式出版页 ↗</a><a href="https://www.researchgate.net/publication/242148990_Inductive_Reasoning_A_Training_Approach" target="_blank" rel="noopener noreferrer">作者上传全文 ↗</a></div><p>Klauer、Willmes & Phye（2002）附录第21—23页公开六类样题。第22页关系区分要求找错并修正；第23页提供不预写分类名称的交叉分类样例及系统建构矩阵。它们来自1994儿童版，用于核对机制，不冒充已取得II／III完整题库。</p><a href="https://gwern.net/doc/dual-n-back/2002-klauer.pdf#page=21" target="_blank" rel="noopener noreferrer">六类原始样题，附录第21—23页 ↗</a></section><section class="card tablewrap"><h3>十课目标与本项目题型配额</h3><table class="table"><thead><tr><th>课次</th><th>表2对应目标</th><th>本项目编排</th></tr></thead><tbody>${E.LESSONS.map(l => `<tr><td>${l.n} · ${l.title}</td><td>${l.goal}</td><td>${l.counts.map((c, i) => c ? E.TYPES[i].name + '×' + c : '').filter(Boolean).join('，')}</td></tr>`).join('')}</tbody></table><p><small>原文表2规定的是教学目标。上列配额与逐题顺序为本项目编排，不是原版逐题分课表。</small></p></section><section class="card"><h3>题目构造与适用范围</h3><p>本版保留120道主题、六类各20、三种材料各40。文字资料使用画面直接给出的物品记录和字片变换，避免依靠鸟类分类或词义猜测；数量属性题使用可见的数字位值，关系题使用小整数及变换；图形题使用形状、颜色、数量、方向、大小和填充。</p><p>答案唯一性是在有限可见属性和本项目明确的变换模型中检验的。有限数列不可能排除所有人为数学规则；这里不宣称“在一切可能规则下唯一”。难度按材料和关系逐步加深，但未经过标准化校准。</p><p>原方案通常有训练者引导。2002年的一项实验是五周、每周两次、每次最多45分钟；这是特定研究条件。网页可用于个人或陪练，不自动复制原研究条件或效果。</p><p><b>原题边界：</b>这些是依据公开理论与样例机制构造的新题，不是作者商业题册原题的复制。题型细节、有限规则族、配额、提示时机、查验任务和交互方式均为本项目实现。本网站仍需独立教育效果评估。</p><p><b>数据：</b>本版记录独立保存，旧版进度不覆盖；没有账号、外部评分接口或运行时依赖。保存HTML可离线使用；预览或隐私环境请导出进度备份。</p><button class="primary" id="saveHtmlAbout">保存完整离线网页</button></section></div>`;
  }
  function render() {
    $('#app').innerHTML = `<div class="shell"><aside class="side"><div class="brand"><span class="mark">∩</span><div>比较之间<small>METHOD EDITION · V2</small></div></div><nav class="nav" aria-label="主要导航">${[['home', '01', '课程总览'], ['train', '02', '进入训练'], ['review', '03', '分类复盘'], ['records', '04', '训练记录'], ['about', '05', '依据与设计']].map(([id, no, text]) => `<button data-nav="${id}" class="${view === id ? 'active' : ''}" ${view === id ? 'aria-current="page"' : ''}><span>${no}</span>${text}</button>`).join('')}</nav><div class="sidefoot"><b>发现规律，再检查。</b><p>不先给规则，不只选答案。</p><div class="spacer"></div>Klauer公开方法改编<br>原创实例 · 可核查设计</div></aside><main class="main"><header class="top"><div><div class="eyebrow">INDUCTIVE REASONING · V${E.VERSION}</div><small>120道主题 · 十课 · 六种比较操作</small></div><div class="topright"><small><span class="dot"></span><span id="storageStatus">${storageOK ? '本浏览器保存进度' : '当前无法保存，请导出备份'}</span></small><button class="small" id="saveHtml">保存离线网页</button></div></header><div id="page">${({ home, train, review, records, about })[view]()}</div><div class="footer">方法依据：Klauer & Phye, 2008 · 原创实例，非官方题册 · 自由解释不自动判分</div></main></div>`;
    bind();
  }
  function download(name, data, type) { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  function exportProgress() { download('比较之间-v2-进度-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(state, null, 2), 'application/json'); }
  function saveHtml() { const copy = document.documentElement.cloneNode(true); copy.querySelector('#app').innerHTML = ''; copy.querySelector('#toast').textContent = ''; copy.querySelector('#toast').classList.add('hidden'); copy.querySelectorAll('dialog').forEach(x => x.removeAttribute('open')); download('比较之间-按克劳尔方法重做版.html', '<!DOCTYPE html>\n' + copy.outerHTML, 'text/html;charset=utf-8'); notify('已请求保存完整HTML；打开后无需网络依赖。'); }
  function submitMain() {
    const q = qCurrent(), a = record(q);
    if (!E.validResponse(q, a.draft)) { notify(q.main.kind === 'group' ? '请恰好选出三张卡片。' : q.main.kind === 'repair' ? '请先选错误位置，再选替换卡片。' : '先选择你的解答。'); return; }
    if (a.first === null) { a.first = E.clone(a.draft); a.firstHint = a.hints; a.firstSupport = a.compareOpen; }
    a.final = E.clone(a.draft); a.tries++; a.stage = 'check'; a.check = null; save(); render(); focusQuestion();
  }
  function submitCheck() {
    const q = qCurrent(), a = record(q);
    if (!E.validCheck(q, a.check)) { notify('先选择你的反向查验结果。'); return; }
    if (a.firstCheck === null) a.firstCheck = a.check;
    a.checkAttempts++; a.checkedAt = Date.now();
    a.stage = E.sameResponse(q, a.final) && a.check === q.check.answer ? 'done' : 'feedback';
    save(); render(); focusQuestion();
  }
  function focusQuestion() { $('#qtitle')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function bind() {
    const on = (id, fn) => { if ($('#' + id)) $('#' + id).onclick = fn; };
    document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => changeView(b.dataset.nav));
    document.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => start(+b.dataset.lesson));
    document.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => start(state.lesson, +b.dataset.jump));
    document.querySelectorAll('[data-openq]').forEach(b => b.onclick = () => { const q = E.byId[b.dataset.openq]; start(q.lesson, E.LESSONS[q.lesson - 1].items.indexOf(q.id)); });
    document.querySelectorAll('[data-option]').forEach(b => b.onclick = () => {
      const q = qCurrent(), a = record(q), i = +b.dataset.option;
      if (q.main.kind === 'group') { const values = Array.isArray(a.draft) ? a.draft : []; if (values.includes(i)) a.draft = values.filter(x => x !== i); else if (values.length < 3) a.draft = values.concat(i); else { notify('已选三张；先取消一张再调整。'); return; } }
      else if (q.main.kind === 'repair') a.draft = { ...a.draft, repair: i };
      else a.draft = i;
      save(); render();
    });
    document.querySelectorAll('[data-position]').forEach(b => b.onclick = () => { const a = record(qCurrent()); a.draft = { ...a.draft, position: +b.dataset.position }; save(); render(); });
    document.querySelectorAll('[data-check]').forEach(b => b.onclick = () => { record(qCurrent()).check = +b.dataset.check; save(); render(); });
    document.querySelectorAll('[data-bucket]').forEach(b => b.onclick = () => { bucket = b.dataset.bucket; render(); });
    document.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { const q = E.byId[b.dataset.sort], wanted = state.lesson === 2 ? E.TYPE[q.type].branch === '属性' ? 'a' : 'r' : q.type; if (bucket !== wanted) { notify('回想你比较的是特点还是联系，以及相同、不同或两者。'); return; } state.reviews[state.lesson] ??= {}; state.reviews[state.lesson][q.id] = true; save(); render(); });
    on('continue', () => start(state.lesson, state.index)); on('submit', submitMain); on('submitCheck', submitCheck);
    on('retry', () => { const a = record(qCurrent()); a.stage = 'answer'; a.check = null; save(); render(); focusQuestion(); });
    on('next', () => { if (!completed(qCurrent().id)) return; if (state.index < 11) start(state.lesson, state.index + 1); else changeView('review'); });
    on('nextLesson', () => state.lesson < 10 ? start(state.lesson + 1) : changeView('records'));
    on('hint', () => { const a = record(qCurrent()); a.hints = Math.min(3, a.hints + 1); save(); render(); });
    on('compare', () => { const a = record(qCurrent()); a.compareOpen = !a.compareOpen; save(); render(); });
    on('method', () => { const q = qCurrent(); $('#methodContent').innerHTML = `<h2>${esc(E.TYPE[q.type].name)}的方法依据</h2><p>${esc(q.source)}</p><p>${esc(q.explanation)}</p><p>${esc(q.checkExplanation)}</p><p>题目构造、检查任务与交互为本项目设计。原文解释操作机制，不提供此新实例。</p>`; $('#methodDialog').showModal(); });
    on('saveHtml', saveHtml); on('saveHtmlAbout', saveHtml); on('export', exportProgress); on('import', () => $('#importFile').click()); on('reset', () => $('#resetDialog').showModal());
    const setChange = (id, fn) => { if ($('#' + id)) $('#' + id).onchange = fn; };
    setChange('lessonSelect', e => start(+e.target.value)); setChange('reviewLesson', e => { state.lesson = +e.target.value; state.index = 0; save(); render(); }); setChange('reviewFilter', e => { reviewFilter = e.target.value; render(); });
    [['hypothesis', 'note'], ['inspect', 'inspect'], ['comparison', 'reflection']].forEach(([id, key]) => { if ($('#' + id)) $('#' + id).oninput = e => { record(qCurrent())[key] = e.target.value; save(); }; });
    setChange('importFile', async e => { const file = e.target.files[0]; if (!file) return; try { if (file.size > 2500000) throw Error('进度文件过大'); const data = validate(JSON.parse(await file.text())); state = data; save(); render(); notify('本版进度已导入。'); } catch (err) { notify('未导入：' + err.message); } });
  }
  $('#cancelReset').onclick = () => $('#resetDialog').close();
  $('#confirmReset').onclick = () => { state = initial(); save(); $('#resetDialog').close(); changeView('home'); };
  $('#closeMethod').onclick = () => $('#methodDialog').close();
  window.TrainingApp = { get state() { return E.clone(state); }, get view() { return view; }, get current() { return qCurrent(); }, start, changeView, validate, submitMain, submitCheck, render };
  render();
})();
