// Tournament wizard — state and step navigation

let tournamentConfig = null;
let _wizardStep = 1;

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
  if (!raw || isNaN(val) || val < 3 || val > 6) {
    err.textContent = 'Wpisz liczbę graczy od 3 do 6.';
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
  });
});

// ── Step 4: build player blocks dynamically ──
function buildDoublesOptions(placeholder) {
  let o = `<option value="">${placeholder}</option>`;
  for (let i = 1; i <= 20; i++) o += `<option value="${i * 2}">D${i}</option>`;
  o += '<option value="50">Bull</option>';
  return o;
}

function renderStep4Players() {
  const n = tournamentConfig.numPlayers;
  document.getElementById('t-players-label').textContent = `Gracze (${n})`;
  const list = document.getElementById('t-players-list');
  list.innerHTML = '';
  const d1opts = buildDoublesOptions('1° —');
  const d2opts = buildDoublesOptions('2° —');
  for (let i = 1; i <= n; i++) {
    const block = document.createElement('div');
    block.className = 'player-block';
    block.innerHTML = `
      <div class="player-block-label">Gracz ${i}</div>
      <input type="text" id="t-pname-${i}" class="player-name-input"
             placeholder="Imię gracza" maxlength="20"
             list="players-datalist" autocomplete="off">
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

    document.getElementById('t-pname-' + i).addEventListener('input', function() {
      const found = loadPlayers().find(p => p.name === this.value);
      if (found) {
        document.getElementById('t-pd1-' + i).value = found.primaryDouble  || '';
        document.getElementById('t-pd2-' + i).value = found.secondaryDouble || '';
      }
      validateStep4();
    });
  }
  validateStep4();
}

function validateStep4() {
  const n = tournamentConfig ? tournamentConfig.numPlayers : 0;
  const allFilled = n > 0 && Array.from({ length: n },
    (_, i) => (document.getElementById('t-pname-' + (i + 1))?.value.trim() || '') !== ''
  ).every(Boolean);
  document.getElementById('btn-create-tournament').disabled = !allFilled;
}

// ── Create tournament: save new players + build tournament ──
document.getElementById('btn-create-tournament').addEventListener('click', () => {
  const n = tournamentConfig.numPlayers;
  const players = [];
  for (let i = 1; i <= n; i++) {
    const name = document.getElementById('t-pname-' + i).value.trim();
    if (name) createPlayer(name, null, null);
    players.push({
      name,
      primaryDouble:   parseInt(document.getElementById('t-pd1-' + i).value) || null,
      secondaryDouble: parseInt(document.getElementById('t-pd2-' + i).value) || null,
    });
  }
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
