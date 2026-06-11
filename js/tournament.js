// Tournament wizard — state and step navigation

let tournamentConfig = null;
let _wizardStep = 1;

function _updateByeHint() {
  const hintEl = document.getElementById('t-bye-hint');
  if (!hintEl || hintEl.style.display === 'none') return;
  const isRandom = document.querySelector('#t-seeding-group .btn-seg.active')?.dataset.seeding === 'random';
  const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
  if (isRandom && byeCount === 0) {
    hintEl.textContent = '✓ Wolne losy zostaną wylosowane automatycznie przy tworzeniu turnieju.';
    hintEl.className = 'bye-hint bye-hint--auto';
  } else {
    hintEl.textContent = 'ℹ️ Aby wylosować wolne losy automatycznie — odznacz wszystkie BYE i wybierz „Losuj rozstawienie".';
    hintEl.className = 'bye-hint';
  }
}

function initTournamentWizard() {
  tournamentConfig = {
    name: '',
    numPlayers: null,
    format: 'league',
    leagueRounds: 'single',
    winPoints: 2,
    lossPoints: 0,
    matchConfig: {
      variant: 501,
      totalSets: 1,
      totalLegs: 3,
      inMode: 'straight',
      checkoutMode: 'double',
      dartLimit: null,
    },
    players: [],
    seeding: 'random',
  };
  // Reset step 1 inputs and error
  const nameInp = document.getElementById('t-name');
  if (nameInp) nameInp.value = '';
  const inp = document.getElementById('t-num-players');
  if (inp) inp.value = '';
  const err = document.getElementById('t-step1-error');
  if (err) err.hidden = true;
  // Reset step 2 rounds to default (single)
  document.querySelectorAll('#t-rounds-group .btn-seg').forEach(b => {
    b.classList.toggle('active', b.dataset.rounds === 'single');
  });
  document.getElementById('t-win-pts').value = 2;
  document.getElementById('t-loss-pts').value = 0;
  // Reset step 4 seeding to default (random)
  document.querySelectorAll('#t-seeding-group .btn-seg').forEach(b => {
    b.classList.toggle('active', b.dataset.seeding === 'random');
  });
  // Reset step 2 format to league
  document.querySelectorAll('#wstep-2 .format-tile').forEach(t =>
    t.classList.toggle('active', t.dataset.format === 'league'));
  document.getElementById('league-settings').classList.remove('format-hidden');
  const bracketDesc = document.getElementById('t-bracket-desc');
  if (bracketDesc) bracketDesc.classList.add('format-hidden');
  showWizardStep(1);
}

function showWizardStep(n) {
  _wizardStep = n;
  document.querySelectorAll('.wizard-step').forEach(s => { s.style.display = 'none'; });
  const step = document.getElementById('wstep-' + n);
  if (step) step.style.display = 'flex';
  document.querySelectorAll('.wdot').forEach(dot => {
    const s = parseInt(dot.dataset.step);
    dot.className = 'wdot' + (s < n ? ' wdot-done' : s === n ? ' wdot-active' : '');
  });
}

// ── Step 1 navigation ──
document.getElementById('t-back-1').addEventListener('click', () => {
  tournamentConfig = null;
  renderTournamentListScreen();
  showScreen(SCREENS.TOURNAMENT_LIST);
});

document.getElementById('t-next-1').addEventListener('click', () => {
  const name = document.getElementById('t-name').value.trim();
  const raw  = document.getElementById('t-num-players').value.trim();
  const val  = parseInt(raw);
  const err  = document.getElementById('t-step1-error');
  if (!name) {
    err.textContent = 'Wpisz nazwę turnieju.';
    err.hidden = false;
    return;
  }
  if (!raw || isNaN(val) || val < 3 || val > 10) {
    err.textContent = 'Wpisz liczbę graczy od 3 do 10.';
    err.hidden = false;
    return;
  }
  err.hidden = true;
  tournamentConfig.name = name;
  tournamentConfig.numPlayers = val;
  showWizardStep(2);
});

// ── Step 2 navigation ──
document.getElementById('t-back-2').addEventListener('click', () => {
  showWizardStep(1);
});

document.getElementById('t-next-2').addEventListener('click', () => {
  const activeRounds = document.querySelector('#t-rounds-group .btn-seg.active');
  tournamentConfig.leagueRounds = activeRounds ? activeRounds.dataset.rounds : 'single';
  tournamentConfig.winPoints  = Math.max(0, parseInt(document.getElementById('t-win-pts').value)  || 0);
  tournamentConfig.lossPoints = Math.max(0, parseInt(document.getElementById('t-loss-pts').value) || 0);
  showWizardStep(3);
});

// ── Step 2: rounds segmented buttons ──
document.querySelectorAll('#t-rounds-group .btn-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#t-rounds-group .btn-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ── Step 2: format tile selection ──
document.querySelectorAll('#wstep-2 .format-tile:not(.disabled)').forEach(tile => {
  tile.addEventListener('click', () => {
    document.querySelectorAll('#wstep-2 .format-tile').forEach(t => t.classList.remove('active'));
    tile.classList.add('active');
    tournamentConfig.format = tile.dataset.format;

    const isBracket = tile.dataset.format === 'bracket';
    document.getElementById('league-settings').classList.toggle('format-hidden', isBracket);
    document.getElementById('t-bracket-desc').classList.toggle('format-hidden', !isBracket);
  });
});

// ── Step 3 navigation ──
document.getElementById('t-back-3').addEventListener('click', () => {
  showWizardStep(2);
});

document.getElementById('t-next-3').addEventListener('click', () => {
  tournamentConfig.matchConfig = {
    variant:      parseInt(document.getElementById('t-variant').value),
    totalSets:    parseInt(document.getElementById('t-sets').value),
    totalLegs:    parseInt(document.getElementById('t-legs').value),
    inMode:       document.getElementById('t-in-mode').value,
    checkoutMode: document.getElementById('t-checkout').value,
    dartLimit:    parseInt(document.getElementById('t-dart-limit').value) || null,
  };
  renderStep4Players();
  showWizardStep(4);
});

// ── Step 3: dynamic legs label ──
document.getElementById('t-sets').addEventListener('change', () => {
  const v = parseInt(document.getElementById('t-sets').value);
  document.getElementById('t-lbl-legs').textContent = v > 1 ? 'Legi na seta' : 'Liczba legów';
});

// ── Step 4 navigation ──
document.getElementById('t-back-4').addEventListener('click', () => {
  showWizardStep(3);
});

// ── Step 4: seeding segmented buttons ──
document.querySelectorAll('#t-seeding-group .btn-seg').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#t-seeding-group .btn-seg').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tournamentConfig.seeding = btn.dataset.seeding;
    _updateByeHint();
    validateStep4();
  });
});

// ── Step 4: build player blocks dynamically ──
function buildDoublesOptions(placeholder) {
  let o = `<option value="">${placeholder}</option>`;
  for (let i = 1; i <= 20; i++) o += `<option value="${i * 2}">D${i}</option>`;
  o += '<option value="50">Bull</option>';
  return o;
}

function _computeByeSuggestion(numPlayers) {
  const B = nextPowerOf2(numPlayers);
  const numByes = B - numPlayers;
  if (numByes === 0) return new Array(numPlayers).fill(false);
  const r1Slots = B / 2;
  const numReal = numPlayers - r1Slots;
  const realSlotSet = new Set();
  for (let i = 0; i < numReal; i++) {
    realSlotSet.add(Math.floor(i * r1Slots / numReal));
  }
  const flags = [];
  for (let slot = 0; slot < r1Slots; slot++) {
    if (realSlotSet.has(slot)) {
      flags.push(false);
      flags.push(false);
    } else {
      flags.push(true);
    }
  }
  return flags; // length === numPlayers
}

function _updateByeCounter(numByes) {
  const counterEl = document.getElementById('t-bye-counter');
  if (!counterEl) return;
  const count = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
  if (count === numByes) {
    counterEl.className = 'bye-counter ok';
    counterEl.textContent = `Wolne losy: ${count} / ${numByes} ✓`;
  } else {
    counterEl.className = 'bye-counter warn';
    counterEl.textContent = `Wolne losy: ${count} / ${numByes} — zaznacz dokładnie ${numByes}`;
  }
  _updateByeHint();
}

function renderStep4Players(savedValues) {
  const n = tournamentConfig.numPlayers;
  const isBracket = tournamentConfig.format === 'bracket';
  const B = nextPowerOf2(n);
  const numByes = B - n;
  const numRounds = Math.log2(B);
  document.getElementById('t-players-label').textContent = `Gracze (${n})`;

  // ── Bye counter bar (bracket only, non-zero byes) ──
  let counterEl = document.getElementById('t-bye-counter');
  if (!counterEl) {
    counterEl = document.createElement('div');
    counterEl.id = 't-bye-counter';
    document.getElementById('t-players-list').before(counterEl);
  }
  counterEl.style.display = (isBracket && numByes > 0) ? '' : 'none';

  // ── Bye hint ──
  let hintEl = document.getElementById('t-bye-hint');
  if (!hintEl) {
    hintEl = document.createElement('p');
    hintEl.id = 't-bye-hint';
    document.getElementById('t-players-list').before(hintEl);
  }
  hintEl.style.display = (isBracket && numByes > 0) ? '' : 'none';

  // ── Player blocks ──
  const suggestedByes = savedValues
    ? savedValues.map(v => v.bye || false)
    : _computeByeSuggestion(n);

  const list = document.getElementById('t-players-list');
  list.innerHTML = '';
  const d1opts = buildDoublesOptions('1° —');
  const d2opts = buildDoublesOptions('2° —');

  for (let i = 1; i <= n; i++) {
    const hasBye = isBracket && suggestedByes[i - 1];
    const block = document.createElement('div');
    block.className = 'player-block' + (hasBye ? ' has-bye' : '');

    const byeBtn = isBracket
      ? `<button type="button" class="bye-toggle${hasBye ? ' active' : ''}"
              data-idx="${i - 1}"${numByes === 0 ? ' disabled' : ''}>
           ${hasBye ? 'BYE ✓' : 'BYE'}
         </button>`
      : '';

    block.innerHTML = `
      <div class="player-block-top">
        <div class="player-block-label">Gracz ${i}</div>
        <span style="display:flex;align-items:center;gap:8px">
          ${byeBtn}
          <span class="drag-handle" title="Przeciągnij aby zmienić kolejność">⠿</span>
        </span>
      </div>
      <input type="text" id="t-pname-${i}" class="player-name-input"
             placeholder="Imię gracza" maxlength="20"
             list="t-datalist-${i}" autocomplete="off">
      <datalist id="t-datalist-${i}"></datalist>
      <div class="doubles-row">
        <div>
          <div class="doubles-sublabel">Ulub. podwójna 1.</div>
          <select id="t-pd1-${i}">${d1opts}</select>
        </div>
        <div>
          <div class="doubles-sublabel">Ulub. podwójna 2.</div>
          <select id="t-pd2-${i}">${d2opts}</select>
        </div>
      </div>
    `;
    list.appendChild(block);

    if (savedValues && savedValues[i - 1]) {
      const v = savedValues[i - 1];
      document.getElementById('t-pname-' + i).value = v.name;
      document.getElementById('t-pd1-' + i).value   = v.d1;
      document.getElementById('t-pd2-' + i).value   = v.d2;
    }

    document.getElementById('t-pname-' + i).addEventListener('input', function() {
      const found = loadPlayers().find(p => p.name === this.value);
      if (found) {
        document.getElementById('t-pd1-' + i).value = found.primaryDouble  || '';
        document.getElementById('t-pd2-' + i).value = found.secondaryDouble || '';
      }
      _updateStep4Datalists();
      validateStep4();
    });
  }

  // BYE toggle click listeners
  if (isBracket && numByes > 0) {
    list.querySelectorAll('.bye-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const block = btn.closest('.player-block');
        const nowActive = !btn.classList.contains('active');
        btn.classList.toggle('active', nowActive);
        btn.textContent = nowActive ? 'BYE ✓' : 'BYE';
        block.classList.toggle('has-bye', nowActive);
        _updateByeCounter(numByes);
        validateStep4();
      });
    });
    _updateByeCounter(numByes);
  }

  // ── Info note (bracket only) ──
  let noteEl = document.getElementById('t-bye-note');
  if (!noteEl) {
    noteEl = document.createElement('p');
    noteEl.id = 't-bye-note';
    noteEl.className = 'bye-note';
    document.getElementById('t-seeding-group').after(noteEl);
  }
  if (isBracket && numByes > 0) {
    const roundName = computeRoundName(1, numRounds);
    noteEl.textContent = `ℹ️ Wolny los = gracz zaczyna od ${roundName}. Sugestia rozłożona równomiernie.`;
    noteEl.style.display = '';
  } else {
    noteEl.style.display = 'none';
  }

  _updateByeHint();
  _initStep4DragDrop(list);
  _updateStep4Datalists();
  validateStep4();

  const previewBtn = document.getElementById('btn-preview-bracket');
  if (previewBtn) previewBtn.style.display = isBracket ? '' : 'none';
}

function _updateStep4Datalists() {
  const n = tournamentConfig ? tournamentConfig.numPlayers : 0;
  if (n === 0) return;

  const allPlayers = loadPlayers();
  const savedNames = new Map(allPlayers.map(p => [p.name.toLowerCase(), p.name]));

  // Names currently entered per slot (lowercase for comparison)
  const currentLower = Array.from({ length: n }, (_, i) => {
    const inp = document.getElementById('t-pname-' + (i + 1));
    return inp ? inp.value.trim().toLowerCase() : '';
  });

  for (let i = 1; i <= n; i++) {
    const datalist = document.getElementById('t-datalist-' + i);
    if (!datalist) continue;

    // Saved players used in *other* slots
    const usedElsewhere = new Set(
      currentLower.filter((name, idx) => idx !== i - 1 && savedNames.has(name))
    );

    datalist.innerHTML = '';
    for (const [lower, displayName] of savedNames) {
      if (!usedElsewhere.has(lower)) {
        const opt = document.createElement('option');
        opt.value = displayName;
        datalist.appendChild(opt);
      }
    }
  }
}

function _getStep4Values() {
  return Array.from(document.querySelectorAll('#t-players-list .player-block')).map(block => ({
    name: block.querySelector('.player-name-input').value,
    d1:   block.querySelector('[id^="t-pd1-"]').value,
    d2:   block.querySelector('[id^="t-pd2-"]').value,
    bye:  block.querySelector('.bye-toggle')?.classList.contains('active') || false,
  }));
}

function _initStep4DragDrop(list) {
  let dragSrc = null;

  list.querySelectorAll('.player-block').forEach(b => b.setAttribute('draggable', 'true'));

  list.addEventListener('dragstart', e => {
    if (e.target.closest('input, select')) { e.preventDefault(); return; }
    const block = e.target.closest('.player-block');
    if (!block) return;
    dragSrc = block;
    e.dataTransfer.effectAllowed = 'move';
    requestAnimationFrame(() => block.classList.add('dragging'));
  });

  list.addEventListener('dragend', () => {
    list.querySelectorAll('.player-block').forEach(b =>
      b.classList.remove('dragging', 'drag-over'));
    dragSrc = null;
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    const block = e.target.closest('.player-block');
    if (!block || block === dragSrc) return;
    list.querySelectorAll('.player-block').forEach(b => b.classList.remove('drag-over'));
    block.classList.add('drag-over');
  });

  list.addEventListener('dragleave', e => {
    if (!list.contains(e.relatedTarget))
      list.querySelectorAll('.player-block').forEach(b => b.classList.remove('drag-over'));
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.player-block');
    if (!target || target === dragSrc) return;
    const blocks = Array.from(list.children);
    const fromIdx = blocks.indexOf(dragSrc);
    const toIdx   = blocks.indexOf(target);
    if (fromIdx < 0 || toIdx < 0) return;
    const vals = _getStep4Values();
    vals.splice(toIdx, 0, vals.splice(fromIdx, 1)[0]);
    renderStep4Players(vals);
  });
}

function validateStep4() {
  const n = tournamentConfig ? tournamentConfig.numPlayers : 0;
  const errEl = document.getElementById('t-step4-error');
  const btn   = document.getElementById('btn-create-tournament');

  const inputs = Array.from({ length: n }, (_, i) => document.getElementById('t-pname-' + (i + 1)));
  const names  = inputs.map(inp => inp?.value.trim() || '');
  const allFilled = n > 0 && names.every(name => name !== '');

  // Count occurrences (case-insensitive) to find duplicates
  const countByLower = new Map();
  for (const name of names) {
    if (!name) continue;
    const key = name.toLowerCase();
    countByLower.set(key, (countByLower.get(key) || 0) + 1);
  }
  const dupLowers = new Set([...countByLower.entries()].filter(([, c]) => c > 1).map(([k]) => k));

  // Highlight duplicate inputs
  inputs.forEach(inp => {
    if (!inp) return;
    inp.classList.toggle('inp-duplicate', !!inp.value.trim() && dupLowers.has(inp.value.trim().toLowerCase()));
  });

  if (dupLowers.size > 0) {
    // One representative per duplicate group (first occurrence)
    const seen = new Set();
    const dupLabels = names.filter(name => {
      if (!name || !dupLowers.has(name.toLowerCase())) return false;
      if (seen.has(name.toLowerCase())) return false;
      seen.add(name.toLowerCase());
      return true;
    });
    errEl.textContent = 'Zduplikowane nazwy graczy: ' + dupLabels.map(n => '"' + n + '"').join(', ');
    errEl.hidden = false;
    btn.disabled = true;
  } else if (allFilled && tournamentConfig.format === 'bracket') {
    const B = nextPowerOf2(tournamentConfig.numPlayers);
    const numByes = B - tournamentConfig.numPlayers;
    if (numByes > 0) {
      const byeCount = document.querySelectorAll('#t-players-list .bye-toggle.active').length;
      if (byeCount !== numByes) {
        errEl.hidden = true;
        btn.disabled = true;
        return;
      }
    }
    errEl.hidden = true;
    btn.disabled = false;
  } else {
    errEl.hidden = true;
    btn.disabled = !allFilled;
  }
}

// ── Create tournament: save new players + build tournament ──
document.getElementById('btn-create-tournament').addEventListener('click', () => {
  const vals = _getStep4Values();
  const players = vals.map(v => ({
    name:            v.name.trim(),
    primaryDouble:   parseInt(v.d1) || null,
    secondaryDouble: parseInt(v.d2) || null,
    bye:             v.bye,
  }));

  players.forEach(p => { if (p.name) createPlayer(p.name, null, null); });
  populatePlayerSuggestions();

  if (tournamentConfig.seeding === 'random') {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  const tournament = createTournament(tournamentConfig, players);
  renderTournamentViewScreen(tournament);
  showScreen(SCREENS.TOURNAMENT_VIEW);
});

// ── Bracket preview ──
document.getElementById('btn-preview-bracket').addEventListener('click', () => {
  const vals = _getStep4Values();
  const players = vals.map(v => ({
    name:            v.name.trim() || '?',
    primaryDouble:   parseInt(v.d1) || null,
    secondaryDouble: parseInt(v.d2) || null,
    bye:             v.bye,
  }));

  if (tournamentConfig.seeding === 'random') {
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
  }

  const n = tournamentConfig.numPlayers;
  const B = nextPowerOf2(n);
  const matches = generateBracket(players);
  const storedPlayers = players.map(({ bye, ...rest }) => rest);

  const fakeTournament = {
    players: storedPlayers,
    matches,
    config: { bracketSize: B, format: 'bracket', matchConfig: tournamentConfig.matchConfig },
  };

  document.getElementById('bracket-preview-note').hidden = tournamentConfig.seeding !== 'random';

  renderBracketScreen(fakeTournament, document.getElementById('bracket-preview-content'));
  openModal('modal-bracket-preview');
});

document.getElementById('btn-bracket-preview-close').addEventListener('click', () => {
  closeModal('modal-bracket-preview');
});
