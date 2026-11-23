(() => {
  const E = window.KlauerEngine, A = window.TrainingApp;
  let assertions = 0;
  const test = (ok, message) => { assertions++; if (!ok) throw new Error(message); };
  const choose = (q, response) => {
    if (q.main.kind === 'group') response.forEach(i => document.querySelector(`[data-option="${i}"]`).click());
    else if (q.main.kind === 'repair') { document.querySelector(`[data-position="${response.position}"]`).click(); document.querySelector(`[data-option="${response.repair}"]`).click(); }
    else document.querySelector(`[data-option="${response}"]`).click();
  };
  localStorage.removeItem('klauer-method-v2');
  A.changeView('records'); document.getElementById('reset').click(); document.getElementById('confirmReset').click();
  const visited = [];
  for (const lesson of E.LESSONS) {
    for (let i = 0; i < lesson.items.length; i++) {
      A.start(lesson.n, i);
      const q = E.byId[lesson.items[i]];
      test(document.querySelectorAll('[data-option]').length === q.main.options.length, q.id + ' main options');
      test(!document.querySelector('.feedback'), q.id + ' no explanation before answer');
      test(!document.getElementById('page').textContent.includes(q.explanation), q.id + ' hidden rule');
      test(!document.querySelector('.question-number').textContent.includes(q.id), q.id + ' no category-coded learner number');
      if (q.type === 'C') test(!document.querySelector('#questionCard th'), q.id + ' unlabelled grid');
      choose(q, q.main.answer);
      const before = A.state.answers[q.id];
      test(before.stage === 'answer', q.id + ' selection is draft');
      document.getElementById('submit').click();
      test(A.state.answers[q.id].stage === 'check', q.id + ' check before feedback');
      test(E.sameResponse(q, A.state.answers[q.id].first), q.id + ' first saved');
      test(!document.getElementById('page').textContent.includes(q.explanation), q.id + ' no rule during check');
      test(document.querySelectorAll('[data-check]').length === q.check.options.length, q.id + ' check options');
      if (q.type === 'F') {
        const evidence = E.repairEvidence(q, q.main.answer);
        for (let edge = 0; edge < evidence.edges.length; edge++) document.querySelector(`[data-edge="${edge}"][data-same="${evidence.edges[edge].same}"]`).click();
        test(evidence.edges.length === 2, q.id + ' learner checks both repair edges');
      }
      document.querySelector(`[data-check="${q.check.answer}"]`).click();
      document.getElementById('submitCheck').click();
      test(A.state.answers[q.id].stage === 'done', q.id + ' completes both operations');
      test(document.getElementById('page').textContent.includes(q.explanation), q.id + ' explanation after independent check');
      test(A.state.answers[q.id].note === '', q.id + ' no forced text or terminology');
      visited.push(q.id);
    }
    A.changeView('review');
    let loops = 0;
    while (document.querySelector('[data-sort]:not(:disabled)') && loops++ < 150) {
      const card = document.querySelector('[data-sort]:not(:disabled)'), q = E.byId[card.dataset.sort];
      const bucket = lesson.n === 2 ? E.TYPE[q.type].branch === '属性' ? 'a' : 'r' : q.type;
      document.querySelector(`[data-bucket="${bucket}"]`).click();
      document.querySelector(`[data-sort="${q.id}"]`).click();
    }
    test(!!document.getElementById('nextLesson'), 'lesson ' + lesson.n + ' completed and reviewed');
  }
  test(new Set(visited).size === 120, '120 unique themes');
  test(Object.values(A.state.answers).filter(a => a.stage === 'done').length === 120, 'all complete');
  const saved = A.state;
  const parsed = A.validate(JSON.parse(JSON.stringify(saved)));
  test(Object.values(parsed.answers).filter(a => a.stage === 'done').length === 120, 'backup round trip');
  A.changeView('records');
  test(document.getElementById('page').textContent.includes('120/120'), 'report complete');
  A.changeView('about');
  test(document.getElementById('page').textContent.includes('第91页'), 'method evidence');
  window.__fullFlowResult = { result: 'PASS', questions: visited.length, assertions, completed: Object.values(saved.answers).filter(a => a.stage === 'done').length };
  return JSON.stringify(window.__fullFlowResult);
})()
