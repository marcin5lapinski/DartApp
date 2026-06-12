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
    numGroups: 2,
    advanceCount: 1,
    advanceCounts: null,
    thirdPlaceMatch: false,
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
  const gs = document.getElementById('groups-settings');
  if (gs) gs.classList.add('format-hidden');
  showWizardStep(1);
}

function showWizardStep(n) {
  _wizardStep = n;
  document.querySelectorAll('.wizard-step').forEach(s => { s.style.display = 'none'; });
  const el = document.getElementById('wstep-' + n);
  if (!el) return;
  el.style.display = 'flex';

  const isGroups   = tournamentConfig && tournamentConfig.format === 'groups';
  const stepOrder  = isGroups ? [1, 2, 3, '3b', 4] : [1, 2, 3, 4];
  const visualPos  = stepOrder.indexOf(n) + 1;  // 1-based
  const totalSteps = stepOrder.length;

  // Update step-indicator text inside current step
  const ind = el.querySelector('.step-indicator');
  if (ind) ind.textContent = 'Krok ' + visualPos + ' z ' + totalSteps;

  // Update dots
  document.querySelectorAll('.wdot').forEach((dot, di) => {
    dot.classList.remove('wdot-active', 'wdot-done');
    if (di >= totalSteps) return;
    if (di < visualPos - 1) dot.classList.add('wdot-done');
    else if (di === visualPos - 1) dot.classList.add('wdot-active');
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
  if (!raw || isNaN(val) || val < 3 || val > 16) {
    err.textContent = 'Wpisz liczbę graczy od 3 do 16.';
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
document.querySelectorAll('#wstep-2 .format-tile').forEach(tile => {
  tile.addEventListener('click', () => {
    document.querySelectorAll('#wstep-2 .format-tile').forEach(t => t.classList.remove('active'));
    tile.classList.add('active');
    tournamentConfig.format = tile.dataset.format;

    const isLeague  = tile.dataset.format === 'league';
    const isBracket = tile.dataset.format === 'bracket';
    const isGroups  = tile.dataset.format === 'groups';

    document.getElementById('league-settings').classList.toggle('format-hidden', !isLeague);
    document.getElementById('t-bracket-desc').classList.toggle('format-hidden', !isBracket);
    document.getElementById('groups-settings').classList.toggle('format-hidden', !isGroups);
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
  if (tournamentConfig.format === 'groups') {
    _initStep3bGroupButtons();
    showWizardStep('3b');
  } else {
    renderStep4Players();
    showWizardStep(4);
  }
});

// ── Step 3b navigation ──
document.getElementById('t-back-3b').addEventListener('click', () => {
  showWizardStep(3);
});

document.getElementById('t-advance-per-group-toggle').addEventListener('change', () => {
  _updateAdvancePerGroupUI();
  _updateThirdPlaceVisibility();
  _validateStep3b();
});

document.getElementById('t-advance-count').addEventListener('input', () => {
  _updateThirdPlaceVisibility();
  _validateStep3b();
});

document.getElementById('t-next-3b').addEventListener('click', () => {
  const activeBtn  = document.querySelector('#t-groups-count-group .btn-seg.active');
  const numGroups  = activeBtn ? parseInt(activeBtn.dataset.groups) : 0;
  const n          = tournamentConfig.numPlayers;
  const errEl      = document.getElementById('t-step3b-error');
  const togEl      = document.getElementById('t-advance-per-group-toggle');
  const perGroup   = togEl && togEl.checked && numGroups > 1;

  if (!numGroups) {
    errEl.textContent = 'Nieprawidłowe ustawienia grup.';
    errEl.hidden = false;
    return;
  }

  let advCount = null;
  let advanceCounts = null;

  if (perGroup) {
    const inputs = document.querySelectorAll('#t-per-group-advance-inputs input[type=number]');
    advanceCounts = [];
    let valid = true;
    inputs.forEach((inp, gi) => {
      const groupSize = Math.floor(n / numGroups) + (gi < n % numGroups ? 1 : 0);
      const v = parseInt(inp.value);
      if (isNaN(v) || v < 1 || v >= groupSize) { valid = false; }
      else { advanceCounts.push(v); }
    });
    if (!valid || advanceCounts.length !== numGroups) {
      errEl.textContent = 'Nieprawidłowe ustawienia awansujących.';
      errEl.hidden = false;
      return;
    }
    advCount = Math.min(...advanceCounts);
  } else {
    advCount = parseInt(document.getElementById('t-advance-count').value);
    const groupSize = Math.floor(n / numGroups);
    if (isNaN(advCount) || advCount < 1 || advCount >= groupSize) {
      errEl.textContent = 'Nieprawidłowe ustawienia grup.';
      errEl.hidden = false;
      return;
    }
  }
  errEl.hidden = true;

  tournamentConfig.numGroups        = numGroups;
  tournamentConfig.advanceCount     = advCount;
  tournamentConfig.advanceCounts    = advanceCounts;
  tournamentConfig.winPoints        = Math.max(0, parseInt(document.getElementById('t-group-win-pts').value) || 0);
  tournamentConfig.lossPoints       = Math.max(0, parseInt(document.getElementById('t-group-loss-pts').value) || 0);
  tournamentConfig.thirdPlaceMatch  = document.getElementById('t-third-place-match').checked;

  // Preserve any player data the user already entered in step 4
  const existingBlocks = document.querySelectorAll('#t-players-list .player-block').length;
  const savedStep4 = existingBlocks === tournamentConfig.numPlayers ? _getStep4Values() : null;
  renderStep4Players(savedStep4);
  showWizardStep(4);
});

// ── Step 3: dynamic legs label ──
document.getElementById('t-sets').addEventListener('change', () => {
  const v = parseInt(document.getElementById('t-sets').value);
  document.getElementById('t-lbl-legs').textContent = v > 1 ? 'Legi na seta' : 'Liczba legów';
});

// ── Step 4 navigation ──
document.getElementById('t-back-4').addEventListener('click', () => {
  if (tournamentConfig.format === 'groups') {
    showWizardStep('3b');
    _validateStep3b();
  } else {
    showWizardStep(3);
  }
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

function _initStep3bGroupButtons() {
  const n = tournamentConfig.numPlayers;
  // Valid group counts: k ≥ 1 AND floor(n/k) ≥ 3 AND max 8 players per group
  const validCounts = [];
  for (let k = 1; k <= n; k++) {
    if (Math.floor(n / k) >= 3 && Math.floor(n / k) <= 8) validCounts.push(k);
  }

  const group = document.getElementById('t-groups-count-group');
  group.innerHTML = '';

  let defaultK = tournamentConfig.numGroups;
  if (!validCounts.includes(defaultK)) {
    const smaller = validCounts.filter(k => k <= tournamentConfig.numGroups);
    defaultK = smaller.length > 0 ? smaller[smaller.length - 1] : validCounts[0];
  }

  validCounts.forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-seg' + (k === defaultK ? ' active' : '');
    btn.dataset.groups = k;
    btn.textContent = k === 1 ? '1 grupa' : k <= 4 ? k + ' grupy' : k + ' grup';
    btn.addEventListener('click', () => {
      group.querySelectorAll('.btn-seg').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tournamentConfig.numGroups = k;
      _updateAdvanceCountMax();
      _updateAdvancePerGroupUI();
      _updateThirdPlaceVisibility();
      _validateStep3b();
    });
    group.appendChild(btn);
  });

  tournamentConfig.numGroups = defaultK;
  _updateAdvanceCountMax();

  // Restore previously saved values if returning from step 4
  const advInp = document.getElementById('t-advance-count');
  if (advInp) advInp.value = tournamentConfig.advanceCount || 1;
  const wpInp  = document.getElementById('t-group-win-pts');
  if (wpInp)  wpInp.value  = tournamentConfig.winPoints  !== undefined ? tournamentConfig.winPoints  : 3;
  const lpInp  = document.getElementById('t-group-loss-pts');
  if (lpInp)  lpInp.value  = tournamentConfig.lossPoints !== undefined ? tournamentConfig.lossPoints : 0;
  const tpCk   = document.getElementById('t-third-place-match');
  if (tpCk)   tpCk.checked = tournamentConfig.thirdPlaceMatch || false;

  // Restore per-group toggle state + rebuild inputs, then update visibility
  const togEl = document.getElementById('t-advance-per-group-toggle');
  if (togEl) togEl.checked = !!tournamentConfig.advanceCounts;
  _updateAdvancePerGroupUI();
  _updateThirdPlaceVisibility();
  _validateStep3b();
}

function _updateAdvanceCountMax() {
  const n         = tournamentConfig.numPlayers;
  const k         = tournamentConfig.numGroups;
  const groupSize = Math.floor(n / k);
  const inp       = document.getElementById('t-advance-count');
  if (!inp) return;
  inp.max = groupSize - 1;
  const cur = parseInt(inp.value) || 1;
  if (cur >= groupSize) inp.value = Math.min(groupSize - 1, 1);
}

function _validateStep3b() {
  const activeBtn = document.querySelector('#t-groups-count-group .btn-seg.active');
  const numGroups = activeBtn ? parseInt(activeBtn.dataset.groups) : 0;
  const n         = tournamentConfig.numPlayers;
  const nextBtn   = document.getElementById('t-next-3b');
  const errEl     = document.getElementById('t-step3b-error');
  const togEl     = document.getElementById('t-advance-per-group-toggle');
  const perGroup  = togEl && togEl.checked && numGroups > 1;

  if (!numGroups) {
    if (errEl) { errEl.textContent = 'Wybierz liczbę grup.'; errEl.hidden = false; }
    if (nextBtn) nextBtn.disabled = true;
    return;
  }

  if (perGroup) {
    const inputs = document.querySelectorAll('#t-per-group-advance-inputs input[type=number]');
    const errors = [];
    inputs.forEach((inp, gi) => {
      const groupSize = Math.floor(n / numGroups) + (gi < n % numGroups ? 1 : 0);
      const maxAdv    = groupSize - 1;
      const v         = parseInt(inp.value);
      inp.classList.remove('input-error');
      if (isNaN(v) || v < 1 || v > maxAdv) {
        inp.classList.add('input-error');
        errors.push('Grupa ' + String.fromCharCode(65 + gi) + ': min 1, max ' + maxAdv);
      }
    });
    if (errors.length) {
      errEl.textContent = errors.join(' • ');
      errEl.hidden = false;
      if (nextBtn) nextBtn.disabled = true;
    } else {
      errEl.hidden = true;
      if (nextBtn) nextBtn.disabled = false;
    }
  } else {
    const inp       = document.getElementById('t-advance-count');
    const groupSize = Math.floor(n / numGroups);
    const maxAdv    = groupSize - 1;
    const v         = parseInt(inp?.value);
    if (inp) inp.classList.remove('input-error');
    if (isNaN(v) || v < 1 || v > maxAdv) {
      if (inp) inp.classList.add('input-error');
      if (errEl) {
        errEl.textContent = 'Awansujący: min 1, max ' + maxAdv + ' (gr. liczy ' + groupSize + ' graczy)';
        errEl.hidden = false;
      }
      if (nextBtn) nextBtn.disabled = true;
    } else {
      if (errEl) errEl.hidden = true;
      if (nextBtn) nextBtn.disabled = false;
    }
  }
}

function _updateThirdPlaceVisibility() {
  const k     = tournamentConfig.numGroups;
  const togEl = document.getElementById('t-advance-per-group-toggle');
  let total;
  if (togEl && togEl.checked) {
    total = 0;
    document.querySelectorAll('#t-per-group-advance-inputs input[type=number]')
      .forEach(inp => { total += parseInt(inp.value) || 1; });
  } else {
    total = k * (parseInt(document.getElementById('t-advance-count')?.value) || tournamentConfig.advanceCount || 1);
  }
  const wrap = document.getElementById('t-third-place-wrap');
  if (wrap) wrap.style.display = total >= 3 ? '' : 'none';
}

function _updateAdvancePerGroupUI() {
  const k         = tournamentConfig.numGroups;
  const togEl     = document.getElementById('t-advance-per-group-toggle');
  const wrapEl    = document.getElementById('t-advance-per-group-wrap');
  const globalRow = document.getElementById('t-advance-count-row');
  const inputsEl  = document.getElementById('t-per-group-advance-inputs');

  if (k <= 1) {
    if (wrapEl)    wrapEl.style.display = 'none';
    if (togEl)     togEl.checked = false;
    if (globalRow) globalRow.style.display = '';
    if (inputsEl)  inputsEl.style.display = 'none';
    return;
  }

  if (wrapEl) wrapEl.style.display = '';
  const isPerGroup = togEl && togEl.checked;
  if (globalRow) globalRow.style.display = isPerGroup ? 'none' : '';
  if (inputsEl)  inputsEl.style.display  = isPerGroup ? ''     : 'none';
  if (isPerGroup) _rebuildPerGroupAdvanceInputs();
}

function _rebuildPerGroupAdvanceInputs() {
  const k         = tournamentConfig.numGroups;
  const n         = tournamentConfig.numPlayers;
  const container = document.getElementById('t-per-group-advance-inputs');
  if (!container) return;
  container.innerHTML = '';

  for (let gi = 0; gi < k; gi++) {
    const groupName = String.fromCharCode(65 + gi);
    const groupSize = Math.floor(n / k) + (gi < n % k ? 1 : 0);
    const maxAdv    = groupSize - 1;
    const saved     = tournamentConfig.advanceCounts && tournamentConfig.advanceCounts[gi];
    const val       = Math.min(Math.max(1, saved || 1), maxAdv);

    const row = document.createElement('div');
    row.className = 't-pg-row';

    const lbl = document.createElement('span');
    lbl.className = 't-pg-lbl';
    lbl.textContent = 'Grupa ' + groupName;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min  = '1';
    inp.max  = String(maxAdv);
    inp.value = String(val);
    inp.className = 't-pg-inp';
    inp.dataset.groupIndex = gi;
    inp.addEventListener('change', () => {
      const v = parseInt(inp.value) || 1;
      inp.value = String(Math.min(Math.max(1, v), maxAdv));
      _updateThirdPlaceVisibility();
      _validateStep3b();
    });
    inp.addEventListener('input', _validateStep3b);

    const hint = document.createElement('span');
    hint.className = 't-pg-hint';
    hint.textContent = 'max ' + maxAdv + ' (' + groupSize + ' graczy)';

    row.appendChild(lbl);
    row.appendChild(inp);
    row.appendChild(hint);
    container.appendChild(row);
  }
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

  const isGroupsFmt  = tournamentConfig.format === 'groups';
  const isBracketFmt = tournamentConfig.format === 'bracket';

  const pbBtn = document.getElementById('btn-preview-bracket');
  const pgBtn = document.getElementById('btn-preview-groups');
  if (pbBtn) pbBtn.style.display = isBracketFmt ? '' : 'none';
  if (pgBtn) pgBtn.style.display = isGroupsFmt ? '' : 'none';
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

function _assignRandomByes(players) {
  const numByes = nextPowerOf2(players.length) - players.length;
  if (numByes === 0) return;
  const byeCount = players.filter(p => p.bye).length;
  if (byeCount !== 0) return;
  const indices = Array.from({ length: players.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const byeSet = new Set(indices.slice(0, numByes));
  players.forEach((p, i) => { p.bye = byeSet.has(i); });
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
    if (tournamentConfig && tournamentConfig.format === 'groups') _refreshGroupPreviewBody();
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
      const isRandom  = document.querySelector('#t-seeding-group .btn-seg.active')?.dataset.seeding === 'random';
      const autoAssign = isRandom && byeCount === 0;
      if (!autoAssign && byeCount !== numByes) {
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
    if (tournamentConfig.format === 'bracket') _assignRandomByes(players);
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
    if (tournamentConfig.format === 'bracket') _assignRandomByes(players);
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

document.getElementById('btn-preview-groups').addEventListener('click', () => {
  renderGroupPreviewModal();
});

function _refreshGroupPreviewBody() {
  const vals = _getStep4Values();
  const n    = tournamentConfig.numPlayers;
  const k    = tournamentConfig.numGroups;
  if (!vals || vals.length < n) return;

  const seeding  = document.querySelector('#t-seeding-group .btn-seg.active')?.dataset.seeding;
  const isRandom  = seeding === 'random';
  const isOrdered = seeding === 'ordered';
  const noteEl   = document.getElementById('group-preview-note');
  if (noteEl) noteEl.hidden = !isRandom;

  const body = document.getElementById('group-preview-body');
  body.innerHTML = '';

  for (let gi = 0; gi < k; gi++) {
    const groupName  = String.fromCharCode(65 + gi);
    const groupBlock = document.createElement('div');
    groupBlock.style.cssText = 'margin-bottom:14px';

    const header = document.createElement('div');
    header.className = 'group-preview-header';
    header.textContent = 'Grupa ' + groupName;
    groupBlock.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'group-preview-list';
    if (isOrdered) {
      let startIdx = 0;
      for (let g = 0; g < gi; g++) startIdx += Math.floor(n / k) + (g < n % k ? 1 : 0);
      const groupSize = Math.floor(n / k) + (gi < n % k ? 1 : 0);
      for (let j = 0; j < groupSize; j++) {
        const row = document.createElement('li');
        row.className = 'group-preview-player';
        row.textContent = (vals[startIdx + j] && vals[startIdx + j].name.trim()) || '—';
        list.appendChild(row);
      }
    } else {
      for (let pi = gi; pi < n; pi += k) {
        const row = document.createElement('li');
        row.className = 'group-preview-player';
        row.textContent = (vals[pi] && vals[pi].name.trim()) || '—';
        list.appendChild(row);
      }
    }
    groupBlock.appendChild(list);
    body.appendChild(groupBlock);
  }
}

function renderGroupPreviewModal() {
  _refreshGroupPreviewBody();
  openModal('modal-group-preview');
}
