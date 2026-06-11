// App entry point — wires up UI events to game logic

let match = null;
let pendingCheckoutScore = null;
let pendingWinnerIndex = null;
let undoStack = [];  // snapshots of match state before each committed visit
let pendingDeleteRecordId = null;
let pendingEditPlayerId = null;
let pendingDeletePlayerId = null;
let pendingDeleteTournamentId = null;
let pendingTournamentMatch = null;
let pendingTournamentStarterData = null;
let pendingOpenScore = null;
let pendingOpenPlayerIndex = null;
let pendingLimitWinnerIndex = null;

const IMPOSSIBLE_VISIT_SCORES = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);

// --- Undo helpers ---

function pushUndoState() {
  // Deep-clone the mutable match fields; dartBuffers are forced to []
  // because the snapshot represents the state at the START of the visit.
  const snapshot = JSON.parse(JSON.stringify({
    players: match.players.map(p => ({ ...p, dartBuffer: [] })),
    activePlayer: match.activePlayer,
    legsWon: match.legsWon,
    legsWonInSet: match.legsWonInSet,
    currentLeg: match.currentLeg,
    currentSet: match.currentSet,
    legStartingPlayer: match.legStartingPlayer,
    setStartingPlayer: match.setStartingPlayer,
    setsWon: match.setsWon,
    stats: match.stats,
    matchOver: match.matchOver,
    winner: match.winner,
  }));
  undoStack.push(snapshot);
  if (undoStack.length > 20) undoStack.shift();
  updateUndoButton();
}

function undoLastVisit() {
  if (undoStack.length === 0) return;
  const snapshot = undoStack.pop();
  match.players         = snapshot.players;
  match.activePlayer    = snapshot.activePlayer;
  match.legsWon         = snapshot.legsWon;
  match.currentLeg      = snapshot.currentLeg;
  match.legStartingPlayer = snapshot.legStartingPlayer;
  match.stats           = snapshot.stats;
  match.matchOver       = snapshot.matchOver;
  match.winner          = snapshot.winner;
  match.legsWonInSet      = snapshot.legsWonInSet;
  match.currentSet        = snapshot.currentSet;
  match.setStartingPlayer = snapshot.setStartingPlayer;
  match.setsWon           = snapshot.setsWon;
  match.currentMultiplier = 1;
  // Reset any pending checkout state and close open modals
  pendingCheckoutScore = null;
  pendingWinnerIndex   = null;
  pendingOpenScore = null;
  pendingOpenPlayerIndex = null;
  pendingLimitWinnerIndex = null;
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.getElementById('modal-overlay').classList.remove('open');
  updateUndoButton();
  renderGameScreen(match);
  renderDartBuffer(match);
  focusSummaryInput();
  saveToLocalStorage();
}

function focusSummaryInput() {
  if (match && match.inputMode === INPUT_MODES.SUMMARY)
    document.getElementById('input-score').focus();
}

function updateUndoButton() {
  const btn = document.getElementById('btn-undo-visit');
  if (btn) btn.disabled = undoStack.length === 0;
}

// --- Setup screen ---

document.addEventListener('DOMContentLoaded', () => {
  showScreen(SCREENS.HOME);
  setupEventListeners();
  populatePlayerSuggestions();
  loadFromLocalStorage();
});

function setupEventListeners() {
  // Setup form submit
  document.getElementById('btn-start-match').addEventListener('click', startMatch);

  // Score input (summary mode)
  document.getElementById('btn-submit-score').addEventListener('click', submitSummaryScore);
  document.getElementById('input-score').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitSummaryScore();
  });

  // Numpad buttons (summary mode only)
  document.querySelectorAll('.numpad-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      const input = document.getElementById('input-score');
      if (val === 'DEL') {
        input.value = input.value.slice(0, -1);
      } else if (val === 'OK') {
        submitSummaryScore();
      } else {
        if (input.value.length < 3) input.value += val;
      }
      input.focus();
    });
  });

  // Mode switcher
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!match) return;
      const targetMode = btn.dataset.mode;
      const currentMode = match.inputMode;

      // Block switching to summary while darts are in the buffer
      if (targetMode === INPUT_MODES.SUMMARY &&
          (currentMode === INPUT_MODES.DART_BY_DART || currentMode === INPUT_MODES.BOARD)) {
        const buf = match.players[match.activePlayer].dartBuffer;
        if (buf.length > 0) {
          btn.classList.add('mode-blocked');
          btn.addEventListener('animationend', () => btn.classList.remove('mode-blocked'), { once: true });
          return;
        }
      }

      match.inputMode = targetMode;
      renderGameScreen(match);
      renderDartBuffer(match);
      focusSummaryInput();
    });
  });

  // Multiplier buttons (dart-by-dart mode)
  document.querySelectorAll('.mult-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!match) return;
      match.currentMultiplier = parseInt(btn.dataset.mult);
      renderDartPanel(match);
    });
  });

  // Dart value buttons (dart-by-dart mode)
  document.querySelectorAll('.dart-val-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!match || match.inputMode !== INPUT_MODES.DART_BY_DART) return;
      submitDartValue(parseInt(btn.dataset.base));
    });
  });

  // Undo last dart (dart-by-dart mode)
  document.getElementById('btn-undo-dart').addEventListener('click', () => {
    if (!match || (match.inputMode !== INPUT_MODES.DART_BY_DART && match.inputMode !== INPUT_MODES.BOARD)) return;
    const player = match.players[match.activePlayer];
    if (player.dartBuffer.length === 0) return;
    player.dartBuffer.pop();
    renderDartBuffer(match);
    renderGameScreen(match);
  });

  // Starter selector (segmented buttons)
  document.querySelectorAll('#starter-group .btn-seg').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#starter-group .btn-seg').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Sync starter button labels with player name inputs
  function syncStarterLabels() {
    const p1 = document.getElementById('input-p1').value.trim() || 'Gracz 1';
    const p2 = document.getElementById('input-p2').value.trim() || 'Gracz 2';
    document.querySelector('#starter-group .btn-seg[data-starter="0"]').textContent = p1;
    document.querySelector('#starter-group .btn-seg[data-starter="1"]').textContent = p2;
  }
  document.getElementById('input-p1').addEventListener('input', syncStarterLabels);
  document.getElementById('input-p2').addEventListener('input', syncStarterLabels);

  // Undo last player's committed visit
  document.getElementById('btn-undo-visit').addEventListener('click', undoLastVisit);

  // Cancel which-dart dialog — revert the visit so the score can be re-entered
  document.getElementById('btn-which-dart-cancel').addEventListener('click', undoLastVisit);

  // Undo from leg/set/match result modal
  document.getElementById('btn-leg-result-undo').addEventListener('click', undoLastVisit);

  document.getElementById('btn-which-open-dart-cancel').addEventListener('click', undoLastVisit);

  // Limit modal
  document.getElementById('btn-limit-undo').addEventListener('click', undoLastVisit);

  document.getElementById('limit-winner-options').addEventListener('click', e => {
    const btn = e.target.closest('.limit-winner-btn');
    if (!btn) return;
    document.querySelectorAll('.limit-winner-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    pendingLimitWinnerIndex = parseInt(btn.dataset.player);
    document.getElementById('btn-limit-dalej').disabled = false;
  });

  document.getElementById('btn-limit-dalej').addEventListener('click', () => {
    if (pendingLimitWinnerIndex === null) return;
    closeModal('modal-dart-limit');
    handleLimitLegClose(pendingLimitWinnerIndex);
    pendingLimitWinnerIndex = null;
  });

  // Exit to menu button (game screen)
  document.getElementById('btn-exit-match').addEventListener('click', () => {
    openModal('modal-exit-confirm');
  });

  document.getElementById('btn-exit-cancel').addEventListener('click', () => {
    closeModal('modal-exit-confirm');
  });

  document.getElementById('btn-exit-confirm').addEventListener('click', () => {
    closeModal('modal-exit-confirm');
    match = null;
    undoStack = [];
    try { localStorage.removeItem('dart_match'); } catch(e) {}
    document.getElementById('btn-live-standings').style.display = 'none';
    if (pendingTournamentMatch) {
      const ptm = pendingTournamentMatch;
      pendingTournamentMatch = null;
      const t = loadTournaments().find(t => t.id === ptm.tournamentId);
      if (t) {
        _activeTournament = t;
        renderTournamentViewScreen(t);
        showScreen(SCREENS.TOURNAMENT_VIEW);
        if (t.config.format !== 'bracket') {
          document.getElementById('tv-tab-matches').click();
        }
      } else {
        showScreen(SCREENS.HOME);
      }
    } else {
      showScreen(SCREENS.HOME);
    }
  });

  // Quick score buttons (always-visible shortcut row)
  document.querySelectorAll('.quick-score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!match) return;
      submitQuickScore(parseInt(btn.dataset.val));
      focusSummaryInput();
    });
  });

  // New match button (from stats screen)
  document.getElementById('btn-new-match').addEventListener('click', () => {
    if (pendingTournamentMatch) {
      const ptm = pendingTournamentMatch;
      pendingTournamentMatch = null;
      document.getElementById('btn-new-match').textContent = 'Nowy mecz';
      const t = loadTournaments().find(t => t.id === ptm.tournamentId);
      if (t) {
        _activeTournament = t;
        renderTournamentViewScreen(t);
        showScreen(SCREENS.TOURNAMENT_VIEW);
        if (t.config.format !== 'bracket') {
          document.getElementById('tv-tab-matches').click();
        }
      } else {
        showScreen(SCREENS.HOME);
      }
    } else {
      showScreen(SCREENS.HOME);
    }
  });

  // Bust toast click to dismiss
  document.getElementById('bust-toast').addEventListener('click', () => {
    document.getElementById('bust-toast').classList.remove('visible', 'stacked');
    document.getElementById('last-visit-toast').classList.remove('stacked');
  });
  document.getElementById('last-visit-toast').addEventListener('click', () => {
    document.getElementById('last-visit-toast').classList.remove('visible', 'stacked');
    document.getElementById('bust-toast').classList.remove('stacked');
  });

  // Navigation: home → match setup
  document.getElementById('btn-home-match').addEventListener('click', () => {
    showScreen(SCREENS.SETUP);
  });

  // Navigation: home → tournament list
  document.getElementById('btn-home-tournament').addEventListener('click', () => {
    renderTournamentListScreen();
    showScreen(SCREENS.TOURNAMENT_LIST);
  });

  // Tournament list: back to home
  document.getElementById('btn-back-from-tournament-list').addEventListener('click', () => {
    showScreen(SCREENS.HOME);
  });

  // Tournament list: new tournament button
  document.getElementById('btn-new-tournament').addEventListener('click', () => {
    initTournamentWizard();
    showScreen(SCREENS.TOURNAMENT);
  });

  // Tournament list: click card or delete (delegated)
  document.getElementById('tournament-list-body').addEventListener('click', e => {
    const deleteBtn = e.target.closest('.tc-delete');
    if (deleteBtn) {
      pendingDeleteTournamentId = deleteBtn.dataset.id;
      openModal('modal-delete-tournament');
      return;
    }
    if (e.target.id === 'btn-delete-all-active') {
      openModal('modal-delete-all-active');
      return;
    }
    if (e.target.id === 'btn-delete-all-finished') {
      openModal('modal-delete-all-finished');
      return;
    }
    const card = e.target.closest('.tournament-card-item');
    if (card) {
      const tournament = loadTournaments().find(t => t.id === card.dataset.id);
      if (tournament) {
        renderTournamentViewScreen(tournament);
        showScreen(SCREENS.TOURNAMENT_VIEW);
      }
    }
  });

  // Modal: delete tournament
  document.getElementById('btn-delete-tournament-cancel').addEventListener('click', () => {
    closeModal('modal-delete-tournament');
    pendingDeleteTournamentId = null;
  });
  document.getElementById('btn-delete-tournament-confirm').addEventListener('click', () => {
    closeModal('modal-delete-tournament');
    if (pendingDeleteTournamentId) {
      deleteTournament(pendingDeleteTournamentId);
      pendingDeleteTournamentId = null;
      renderTournamentListScreen();
    }
  });

  // Modal: delete all active tournaments
  document.getElementById('btn-delete-all-active-cancel').addEventListener('click', () => closeModal('modal-delete-all-active'));
  document.getElementById('btn-delete-all-active-confirm').addEventListener('click', () => {
    closeModal('modal-delete-all-active');
    deleteAllTournamentsByStatus('active');
    renderTournamentListScreen();
  });

  // Modal: delete all finished tournaments
  document.getElementById('btn-delete-all-finished-cancel').addEventListener('click', () => closeModal('modal-delete-all-finished'));
  document.getElementById('btn-delete-all-finished-confirm').addEventListener('click', () => {
    closeModal('modal-delete-all-finished');
    deleteAllTournamentsByStatus('finished');
    renderTournamentListScreen();
  });

  // Tournament view: back to list
  document.getElementById('btn-back-from-tournament-view').addEventListener('click', () => {
    renderTournamentListScreen();
    showScreen(SCREENS.TOURNAMENT_LIST);
  });

  // Tournament view: tab switching
  document.getElementById('tv-tab-table').addEventListener('click', () => {
    document.getElementById('tv-tab-table').classList.add('active');
    document.getElementById('tv-tab-matches').classList.remove('active');
    document.getElementById('tv-standings').style.display = '';
    document.getElementById('tv-matches').style.display = 'none';
  });

  document.getElementById('tv-tab-matches').addEventListener('click', () => {
    document.getElementById('tv-tab-matches').classList.add('active');
    document.getElementById('tv-tab-table').classList.remove('active');
    document.getElementById('tv-standings').style.display = 'none';
    document.getElementById('tv-matches').style.display = '';
    if (_activeTournament) renderTournamentMatchesScreen(_activeTournament);
  });

  // Tournament match card click (delegated from tv-matches)
  document.getElementById('tv-matches').addEventListener('click', e => {
    const card = e.target.closest('.match-card');
    if (!card) return;
    const idx = parseInt(card.dataset.matchIndex);
    if (!_activeTournament) return;
    const m = _activeTournament.matches[idx];
    if (m.winner !== null) {
      openTournamentMatchStats(_activeTournament, idx);
    } else {
      openTournamentStarterModal(_activeTournament, idx);
    }
  });

  // Tournament bracket card click (delegated from tv-bracket)
  document.getElementById('tv-bracket').addEventListener('click', e => {
    const card = e.target.closest('.match-card');
    if (!card) return;
    if (card.classList.contains('bye-card') || card.classList.contains('tbd-card')) return;
    const idx = parseInt(card.dataset.matchIndex);
    if (!_activeTournament) return;
    const m = _activeTournament.matches[idx];
    if (!m || m.p1 === null || m.p2 === null) return;
    if (m.winner !== null) {
      openTournamentMatchStats(_activeTournament, idx);
    } else {
      openTournamentStarterModal(_activeTournament, idx);
    }
  });

  // Starter modal: option selection (delegated)
  document.getElementById('starter-options').addEventListener('click', e => {
    const btn = e.target.closest('.modal-starter-opt');
    if (!btn) return;
    document.querySelectorAll('.modal-starter-opt').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('btn-starter-start').disabled = false;
  });

  // Starter modal: close (X)
  document.getElementById('btn-starter-close').addEventListener('click', () => {
    closeModal('modal-tournament-starter');
    pendingTournamentStarterData = null;
  });

  // Starter modal: START
  document.getElementById('btn-starter-start').addEventListener('click', () => {
    if (!pendingTournamentStarterData) return;
    const { tournament: t, matchIndex: mi, autoStarter } = pendingTournamentStarterData;
    let sp;
    if (autoStarter !== null) {
      sp = autoStarter;
    } else {
      const sel = document.querySelector('.modal-starter-opt.selected');
      if (!sel) return;
      const val = sel.dataset.starter;
      sp = val === 'random' ? (Math.random() < 0.5 ? 0 : 1) : parseInt(val);
    }
    closeModal('modal-tournament-starter');
    startTournamentMatch(t, mi, sp);
    pendingTournamentStarterData = null;
  });

  // Live standings button
  document.getElementById('btn-live-standings').addEventListener('click', renderLiveStandingsModal);

  // Live standings modal: close (X)
  document.getElementById('btn-live-close').addEventListener('click', () => {
    closeModal('modal-live-standings');
  });

  // Setup screen: back to home
  document.getElementById('btn-back-from-setup').addEventListener('click', () => {
    showScreen(SCREENS.HOME);
  });

  // Navigation: home → players
  document.getElementById('btn-home-players').addEventListener('click', () => {
    renderPlayersScreen();
    showScreen(SCREENS.PLAYERS);
  });

  // Navigation: home → history
  document.getElementById('btn-home-history').addEventListener('click', () => {
    renderHistoryScreen();
    showScreen(SCREENS.HISTORY);
  });

  // Players screen: back button
  document.getElementById('btn-back-from-players').addEventListener('click', () => {
    populatePlayerSuggestions();
    showScreen(SCREENS.HOME);
  });

  // History screen: back button
  document.getElementById('btn-back-from-history').addEventListener('click', () => {
    showScreen(SCREENS.HOME);
  });

  // History screen: clear all
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    openModal('modal-clear-history');
  });
  document.getElementById('btn-clear-history-cancel').addEventListener('click', () => {
    closeModal('modal-clear-history');
  });
  document.getElementById('btn-clear-history-confirm').addEventListener('click', () => {
    closeModal('modal-clear-history');
    clearHistory();
    renderHistoryScreen();
  });

  // Delete single record modal
  document.getElementById('btn-delete-record-cancel').addEventListener('click', () => {
    closeModal('modal-delete-record');
    pendingDeleteRecordId = null;
  });
  document.getElementById('btn-delete-record-confirm').addEventListener('click', () => {
    closeModal('modal-delete-record');
    if (pendingDeleteRecordId) {
      deleteHistoryRecord(pendingDeleteRecordId);
      pendingDeleteRecordId = null;
      renderHistoryScreen();
    }
  });

  // History screen: delete record or open detail (delegated)
  document.getElementById('history-list').addEventListener('click', e => {
    if (e.target.closest('.btn-delete-record')) {
      const rec = e.target.closest('.history-record');
      if (rec) {
        pendingDeleteRecordId = rec.dataset.id;
        openModal('modal-delete-record');
      }
      return;
    }
    const rec = e.target.closest('.history-record');
    if (rec) {
      const record = loadHistory().find(r => r.id === rec.dataset.id);
      if (record) {
        renderHistoryDetailScreen(record);
        showScreen(SCREENS.HISTORY_DETAIL);
      }
    }
  });

  // History detail: back to history list
  document.getElementById('btn-back-from-history-detail').addEventListener('click', () => {
    showScreen(SCREENS.HISTORY);
  });

  // Players screen: add player
  document.getElementById('btn-add-player').addEventListener('click', addPlayerFromInput);
  document.getElementById('input-new-player').addEventListener('keydown', e => {
    if (e.key === 'Enter') addPlayerFromInput();
  });

  // Players screen: edit / delete (delegated)
  document.getElementById('players-list').addEventListener('click', e => {
    const row = e.target.closest('.player-row');
    if (!row) return;
    const id = row.dataset.id;

    if (e.target.closest('.btn-delete-player')) {
      const name = row.querySelector('.player-row-name').textContent;
      pendingDeletePlayerId = id;
      document.getElementById('delete-player-msg').textContent =
        'Gracz "' + name + '" zostanie trwale usunięty.';
      openModal('modal-delete-player');
    }

    if (e.target.closest('.btn-rename-player')) {
      const player = loadPlayers().find(p => p.id === id);
      if (!player) return;
      pendingEditPlayerId = id;
      document.getElementById('input-edit-player-name').value = player.name;
      document.getElementById('sel-edit-primary-double').value   = player.primaryDouble   || '';
      document.getElementById('sel-edit-secondary-double').value = player.secondaryDouble || '';
      document.getElementById('edit-player-error').textContent = '';
      openModal('modal-edit-player');
    }
  });

  // Edit player modal
  document.getElementById('btn-edit-player-cancel').addEventListener('click', () => {
    closeModal('modal-edit-player');
    pendingEditPlayerId = null;
  });
  document.getElementById('btn-edit-player-save').addEventListener('click', () => {
    const name          = document.getElementById('input-edit-player-name').value;
    const primaryDouble   = parseInt(document.getElementById('sel-edit-primary-double').value)   || null;
    const secondaryDouble = parseInt(document.getElementById('sel-edit-secondary-double').value) || null;
    if (!updatePlayer(pendingEditPlayerId, name, primaryDouble, secondaryDouble)) {
      document.getElementById('edit-player-error').textContent = 'Pusta nazwa lub już zajęta.';
      return;
    }
    closeModal('modal-edit-player');
    pendingEditPlayerId = null;
    renderPlayersScreen();
    populatePlayerSuggestions();
  });

  // Delete player modal
  document.getElementById('btn-delete-player-cancel').addEventListener('click', () => {
    closeModal('modal-delete-player');
    pendingDeletePlayerId = null;
  });
  document.getElementById('btn-delete-player-confirm').addEventListener('click', () => {
    if (pendingDeletePlayerId) {
      deletePlayer(pendingDeletePlayerId);
      pendingDeletePlayerId = null;
      closeModal('modal-delete-player');
      renderPlayersScreen();
      populatePlayerSuggestions();
    }
  });

  document.getElementById('sel-sets').addEventListener('change', () => {
    const sets = parseInt(document.getElementById('sel-sets').value);
    document.getElementById('lbl-legs').textContent =
      sets > 1 ? 'Legi na seta' : 'Liczba legów';
  });
}

// --- Player management helpers ---

function addPlayerFromInput() {
  const input = document.getElementById('input-new-player');
  const name = input.value.trim();
  if (!name) return;
  const primaryDouble   = parseInt(document.getElementById('sel-primary-double').value)   || null;
  const secondaryDouble = parseInt(document.getElementById('sel-secondary-double').value) || null;
  const result = createPlayer(name, primaryDouble, secondaryDouble);
  if (!result) {
    input.classList.add('input-error');
    input.addEventListener('animationend', () => input.classList.remove('input-error'), { once: true });
    return;
  }
  input.value = '';
  document.getElementById('sel-primary-double').value   = '';
  document.getElementById('sel-secondary-double').value = '';
  renderPlayersScreen();
}

// --- Start match ---

function startMatch() {
  const variant = parseInt(document.getElementById('sel-variant').value);
  const player1 = document.getElementById('input-p1').value.trim() || 'Gracz 1';
  const player2 = document.getElementById('input-p2').value.trim() || 'Gracz 2';
  const checkoutMode = document.getElementById('sel-checkout').value;
  const dartLimit = parseInt(document.getElementById('sel-dart-limit').value) || null;
  const totalLegs = parseInt(document.getElementById('sel-legs').value);
  const inMode    = document.getElementById('sel-in-mode').value;
  const totalSets = parseInt(document.getElementById('sel-sets').value);

  const starterVal = document.querySelector('#starter-group .btn-seg.active').dataset.starter;
  let startingPlayer;
  if (starterVal === 'random') {
    startingPlayer = Math.random() < 0.5 ? 0 : 1;
  } else {
    startingPlayer = parseInt(starterVal);
  }

  const profiles = loadPlayers();
  const p1Profile = profiles.find(p => p.name.toLowerCase() === player1.toLowerCase());
  const p2Profile = profiles.find(p => p.name.toLowerCase() === player2.toLowerCase());
  const playerFavorites = [
    p1Profile ? { primary: p1Profile.primaryDouble ?? null, secondary: p1Profile.secondaryDouble ?? null } : null,
    p2Profile ? { primary: p2Profile.primaryDouble ?? null, secondary: p2Profile.secondaryDouble ?? null } : null,
  ];

  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, totalSets, startingPlayer, playerFavorites, dartLimit });
  undoStack = [];
  updateUndoButton();

  showScreen(SCREENS.GAME);
  renderGameScreen(match);
  document.getElementById('input-score').focus();
  saveToLocalStorage();
}

function openTournamentStarterModal(tournament, matchIndex) {
  const m  = tournament.matches[matchIndex];
  const mc = tournament.config.matchConfig;
  const p1Name = tournament.players[m.p1].name;
  const p2Name = tournament.players[m.p2].name;

  document.getElementById('starter-match-title').textContent = 'Mecz #' + (matchIndex + 1);
  const fmtLegs = mc.totalSets > 1
    ? 'First to ' + mc.totalSets + ' sets × ' + mc.totalLegs
    : 'First to ' + mc.totalLegs;
  document.getElementById('starter-match-subtitle').textContent =
    p1Name + ' vs ' + p2Name + ' · ' + mc.variant + ' · ' + fmtLegs;

  const opts = document.getElementById('starter-options');
  opts.innerHTML = '';

  // Detect rematch: find the completed first match between the same pair
  const firstMatch = tournament.matches.find(
    (mx, i) => i !== matchIndex && mx.winner !== null && mx.starter != null &&
      ((mx.p1 === m.p1 && mx.p2 === m.p2) || (mx.p1 === m.p2 && mx.p2 === m.p1))
  );

  let autoStarter = null;
  if (firstMatch) {
    const rematchPIdx = firstMatch.starter === m.p1 ? m.p2 : m.p1;
    autoStarter = rematchPIdx === m.p1 ? 0 : 1;
    const info = document.createElement('div');
    info.className = 'modal-starter-info';
    info.textContent = 'Rewanż — ' + tournament.players[rematchPIdx].name + ' zaczyna';
    opts.appendChild(info);
    document.getElementById('btn-starter-start').disabled = false;
  } else {
    [
      { label: '👤 ' + p1Name + ' zaczyna', starter: '0' },
      { label: '🎲 Losuj',                   starter: 'random' },
      { label: '👤 ' + p2Name + ' zaczyna', starter: '1' },
    ].forEach(o => {
      const btn = document.createElement('button');
      btn.className = 'modal-starter-opt';
      btn.dataset.starter = o.starter;
      btn.textContent = o.label;
      opts.appendChild(btn);
    });
    document.getElementById('btn-starter-start').disabled = true;
  }

  pendingTournamentStarterData = { tournament, matchIndex, autoStarter };
  openModal('modal-tournament-starter');
}

function startTournamentMatch(tournament, matchIndex, startingPlayer) {
  const m  = tournament.matches[matchIndex];
  const mc = tournament.config.matchConfig;
  const p1 = tournament.players[m.p1];
  const p2 = tournament.players[m.p2];

  const starterPIdx = startingPlayer === 0 ? m.p1 : m.p2;

  pendingTournamentMatch = {
    tournamentId: tournament.id,
    matchIndex,
    p1Idx:   m.p1,
    p2Idx:   m.p2,
    starter: starterPIdx,
  };

  match = createMatch({
    variant:      mc.variant,
    player1:      p1.name,
    player2:      p2.name,
    checkoutMode: mc.checkoutMode,
    inMode:       mc.inMode,
    totalLegs:    mc.totalLegs,
    totalSets:    mc.totalSets,
    startingPlayer,
    playerFavorites: [
      { primary: p1.primaryDouble ?? null, secondary: p1.secondaryDouble ?? null },
      { primary: p2.primaryDouble ?? null, secondary: p2.secondaryDouble ?? null },
    ],
    dartLimit: mc.dartLimit ?? null,
  });
  match.tournamentMatchContext = {
    tournamentId: pendingTournamentMatch.tournamentId,
    matchIndex:   pendingTournamentMatch.matchIndex,
    p1Idx:        pendingTournamentMatch.p1Idx,
    p2Idx:        pendingTournamentMatch.p2Idx,
    starter:      starterPIdx,
  };
  undoStack = [];
  updateUndoButton();

  const hideLS = tournament.config.format === 'bracket' ||
                 (tournament.config.format === 'groups' && m.phase === 'bracket');
  document.getElementById('btn-live-standings').style.display = hideLS ? 'none' : '';
  showScreen(SCREENS.GAME);
  renderGameScreen(match);
  focusSummaryInput();
}

function saveTournamentMatchResult(finishedMatch, ptm) {
  const list = loadTournaments();
  const t    = list.find(t => t.id === ptm.tournamentId);
  if (!t) return;
  const m = t.matches[ptm.matchIndex];

  m.winner  = finishedMatch.winner;
  m.legs    = [finishedMatch.legsWon[0], finishedMatch.legsWon[1]];
  m.sets    = finishedMatch.totalSets > 1
                ? [finishedMatch.setsWon[0], finishedMatch.setsWon[1]]
                : [null, null];
  m.avgs    = [getMatchAverage(finishedMatch.stats[0]),
               getMatchAverage(finishedMatch.stats[1])];
  m.stats   = [finishedMatch.stats[0], finishedMatch.stats[1]];
  m.starter = ptm.starter;

  if (t.config.format === 'bracket') {
    advanceBracketWinner(t.matches, m);
    if (t.matches.filter(mx => !mx.isBye).every(mx => mx.winner !== null)) {
      t.status = 'finished';
    }
  } else if (t.config.format === 'groups') {
    if (m.phase === 'group') {
      if (isGroupPhaseComplete(t)) {
        finalizeGroupPhase(t);
      }
    } else if (m.phase === 'bracket') {
      advanceBracketWinner(t.matches, m);

      const totalBracketRounds = Math.log2(t.config.bracketSize);
      const isSemiFinal = m.round === totalBracketRounds - 2 && totalBracketRounds >= 2;
      if (isSemiFinal && t.config.thirdPlaceMatch) {
        const thirdMatch = t.matches.find(mx => mx.phase === 'bracket' && mx.isThirdPlace);
        if (thirdMatch) {
          const loserIdx = m.winner === 0 ? m.p2 : m.p1;
          if (thirdMatch.p1 === null) thirdMatch.p1 = loserIdx;
          else if (thirdMatch.p2 === null) thirdMatch.p2 = loserIdx;
        }
      }

      const bracketNonBye = t.matches.filter(mx => mx.phase === 'bracket' && !mx.isBye);
      if (bracketNonBye.every(mx => mx.winner !== null)) {
        t.status = 'finished';
      }
    }
  } else {
    // league
    if (t.matches.every(mx => mx.winner !== null)) t.status = 'finished';
  }

  saveTournaments(list);
  _activeTournament = t;
}

function openTournamentMatchStats(tournament, matchIndex) {
  const m  = tournament.matches[matchIndex];
  if (!m.stats || m.stats[0] === null) return;
  const mc = tournament.config.matchConfig;

  const pseudo = {
    player1:      tournament.players[m.p1].name,
    player2:      tournament.players[m.p2].name,
    winner:       m.winner,
    stats:        m.stats,
    legsWon:      m.legs,
    setsWon:      m.sets?.[0] !== null ? m.sets : [0, 0],
    totalSets:    mc.totalSets,
    totalLegs:    mc.totalLegs,
    variant:      mc.variant,
    inMode:       mc.inMode,
    checkoutMode: mc.checkoutMode,
    matchOver:    true,
  };

  pendingTournamentMatch = {
    tournamentId: tournament.id,
    matchIndex,
    p1Idx: m.p1,
    p2Idx: m.p2,
  };

  renderStatsScreen(pseudo);
  document.getElementById('btn-new-match').textContent = 'Wróć do meczów';
  document.getElementById('btn-live-standings').style.display = 'none';
  showScreen(SCREENS.STATS);
}

function renderLiveStandingsModal() {
  if (!pendingTournamentMatch) return;
  const ptm = pendingTournamentMatch;

  const t = loadTournaments().find(t => t.id === ptm.tournamentId);
  if (!t) return;

  const liveData = {
    p1Idx:   ptm.p1Idx,
    p2Idx:   ptm.p2Idx,
    legsWon: [match.legsWon[0], match.legsWon[1]],
    setsWon: [match.setsWon[0], match.setsWon[1]],
    avgs: [
      match.stats[0].totalDartsThrown > 0 ? getMatchAverage(match.stats[0]) : null,
      match.stats[1].totalDartsThrown > 0 ? getMatchAverage(match.stats[1]) : null,
    ],
  };
  const rows = computeLiveStandings(t, liveData);

  document.getElementById('live-modal-subtitle').textContent = t.name;

  const container = document.getElementById('live-standings-container');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'standings-table';
  table.innerHTML = `<thead><tr>
    <th>#</th><th class="left">Gracz</th><th class="live-col"></th>
    <th>M</th><th>W</th><th>L</th>
    <th>Legi</th><th>Avg</th><th>Pkt</th>
  </tr></thead>`;

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank      = i + 1;
    const isLeader  = rank === 1 && (row.W > 0 || row._live);
    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
    const legsStr   = (row.legsWon + row.legsLost) === 0 ? '&mdash;' : `${row.legsWon}–${row.legsLost}`;
    const legsClass = legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';
    const badge     = row._live ? '<span class="live-badge">LIVE</span>' : '';
    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${isLeader ? 'pos-gold' : 'pos-num'}">${rank}</td>
      <td class="left player-name-cell ${isLeader ? 'name-gold' : ''}">${escapeHtml(row.name)}</td>
      <td class="live-col">${badge}</td>
      <td>${row.M}</td><td>${row.W}</td><td>${row.L}</td>
      <td class="${legsClass}">${legsStr}</td>
      <td class="avg-cell">${avg}</td>
      <td class="pts-cell">${row.pts}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);

  const useSets = t.config.matchConfig.totalSets > 1;
  const s0 = useSets ? match.setsWon[0] : match.legsWon[0];
  const s1 = useSets ? match.setsWon[1] : match.legsWon[1];
  const p1n = t.players[ptm.p1Idx].name;
  const p2n = t.players[ptm.p2Idx].name;
  document.getElementById('live-standings-note').textContent =
    s0 > s1 ? `${p1n} prowadzi — punkty przyznane tymczasowo.`
    : s1 > s0 ? `${p2n} prowadzi — punkty przyznane tymczasowo.`
    : 'Remis — punkty nie są jeszcze przyznane.';

  openModal('modal-live-standings');
}

// --- Quick score shortcut buttons ---

function submitQuickScore(val) {
  if (!match || isNaN(val)) return;

  // Clear any in-progress dart buffer (quick score overrides dart-by-dart entry)
  const player = match.players[match.activePlayer];
  if (player.dartBuffer.length > 0) {
    player.dartBuffer = [];
    renderDartBuffer(match);
  }

  const pIdx = match.activePlayer;
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !match.players[pIdx].legOpened;

  pushUndoState();

  if (isLocked) {
    if (val === 0) {
      recordVisit(match.stats[pIdx], 0, 3);
      match.players[pIdx].history.push({ score: 0, bust: false, darts: 3 });
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
      return;
    }
    // Quick-score buttons always have val > 0 — treat as opening attempt
    pendingOpenScore = val;
    pendingOpenPlayerIndex = pIdx;
    const validOpenDarts = getValidOpeningDarts(val, match.inMode);
    const confirmOpen = () => {
      match.players[pendingOpenPlayerIndex].legOpened = true;
      applySummaryScore(pendingOpenPlayerIndex, pendingOpenScore);
      pendingOpenScore = null;
      pendingOpenPlayerIndex = null;
    };
    if (validOpenDarts.length === 1) {
      confirmOpen();
    } else {
      showWhichOpenDartDialog(validOpenDarts, confirmOpen);
    }
    return;
  }

  const remainingBefore = match.players[pIdx].score;
  const result = applyVisitScore(match, pIdx, val);

  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    if (isDoubleAttemptScore(remainingBefore)) {
      recordSummaryDoubleAttempts(match.stats[pIdx], 3);
    }
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    checkLastVisitWarning();
    if (checkLegVisitLimit()) return;
    return;
  }

  if (result.checkout) {
    pendingCheckoutScore = val;
    pendingWinnerIndex = pIdx;
    const validDarts = getValidClosingDarts(remainingBefore, val);
    if (validDarts.length === 1) {
      handleLegClose(3);
    } else {
      showWhichDartDialog(validDarts, (dartNum) => handleLegClose(dartNum));
    }
    return;
  }

  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLastVisitWarning();
  if (checkLegVisitLimit()) return;
}

// --- Summary mode ---

// Core summary scoring — called after pushUndoState() has already been called.
function applySummaryScore(pIdx, val) {
  const remainingBefore = match.players[pIdx].score;
  const result = applyVisitScore(match, pIdx, val);

  if (result.bust) {
    recordVisit(match.stats[pIdx], 0, 3);
    if (isDoubleAttemptScore(remainingBefore)) {
      recordSummaryDoubleAttempts(match.stats[pIdx], 3);
    }
    showBust();
    saveToLocalStorage();
    switchPlayer(match);
    renderGameScreen(match);
    checkLastVisitWarning();
    if (checkLegVisitLimit()) return;
    return;
  }

  if (result.checkout) {
    pendingCheckoutScore = val;
    pendingWinnerIndex = pIdx;
    const validDarts = getValidClosingDarts(remainingBefore, val);
    if (validDarts.length === 1) {
      handleLegClose(3);
    } else {
      showWhichDartDialog(validDarts, (dartNum) => handleLegClose(dartNum));
    }
    return;
  }

  if (isDoubleAttemptScore(remainingBefore)) {
    recordSummaryDoubleAttempts(match.stats[pIdx], 3);
  }
  switchPlayer(match);
  renderGameScreen(match);
  saveToLocalStorage();
  checkLastVisitWarning();
  if (checkLegVisitLimit()) return;
}

function submitSummaryScore() {
  const input = document.getElementById('input-score');
  const val = parseInt(input.value);
  input.value = '';
  input.focus();

  if (isNaN(val) || val < 0 || val > 180 || IMPOSSIBLE_VISIT_SCORES.has(val)) return;

  const pIdx = match.activePlayer;
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !match.players[pIdx].legOpened;

  pushUndoState();

  if (isLocked) {
    if (val === 0) {
      // Missed opening — 3 darts wasted, player stays locked
      recordVisit(match.stats[pIdx], 0, 3);
      match.players[pIdx].history.push({ score: 0, bust: false, darts: 3 });
      switchPlayer(match);
      renderGameScreen(match);
      saveToLocalStorage();
      checkLastVisitWarning();
      if (checkLegVisitLimit()) return;
    } else {
      // Non-zero: player opened the leg — ask which dart (filtered to valid options)
      const validOpenDarts = getValidOpeningDarts(val, match.inMode);
      if (validOpenDarts.length === 0) return; // impossible opening score for this inMode
      pendingOpenScore = val;
      pendingOpenPlayerIndex = pIdx;
      const confirmOpen = () => {
        match.players[pendingOpenPlayerIndex].legOpened = true;
        applySummaryScore(pendingOpenPlayerIndex, pendingOpenScore);
        pendingOpenScore = null;
        pendingOpenPlayerIndex = null;
      };
      if (validOpenDarts.length === 1) {
        confirmOpen();
      } else {
        showWhichOpenDartDialog(validOpenDarts, confirmOpen);
      }
    }
    return;
  }

  applySummaryScore(pIdx, val);
}

// --- Dart-by-dart mode ---

function getDartLabel(base, multiplier) {
  if (base === 0) return 'Miss';
  if (multiplier === 1) return String(base);
  if (multiplier === 2) return base === 25 ? 'Bull' : 'D' + base;
  if (multiplier === 3) return 'T' + base;
  return String(base * multiplier);
}

function submitDartValue(base) {
  if (!match) return;
  if (match.inputMode !== INPUT_MODES.DART_BY_DART && match.inputMode !== INPUT_MODES.BOARD) return;

  const multiplier = base === 0 ? 1 : match.currentMultiplier;
  if (base === 25 && multiplier === 3) return; // T25 doesn't exist

  const dartValue = base * multiplier;
  const label = getDartLabel(base, multiplier);

  const pIdx = match.activePlayer;
  const player = match.players[pIdx];

  // Snapshot pre-visit state once, at the first dart of each visit (empty buffer).
  // This ensures legOpened is captured before any mid-visit change
  // (e.g. locked dart 1 wasted, opens on dart 2 — snapshot must have legOpened=false).
  if (player.dartBuffer.length === 0) {
    pushUndoState();
  }

  // --- Locked leg (double-in / master-in, not yet opened) ---
  const isLocked = match.inMode !== IN_MODES.STRAIGHT && !player.legOpened;
  let openedThisVisit = false;
  if (isLocked) {
    const opens = isOpeningDart(base, multiplier, match.inMode);
    if (opens) {
      player.legOpened = true;
      openedThisVisit = true;
      // Fall through to normal dart processing with actual dartValue
    } else {
      // Wasted dart — counts toward the 3-dart turn but scores 0
      const bufSoFar = player.dartBuffer.reduce((a, d) => a + d.value, 0);
      player.dartBuffer.push({ value: 0, label, remainingBefore: player.score - bufSoFar });
      renderDartBuffer(match);
      renderGameScreen(match);

      if (player.dartBuffer.length === 3) {
        // All 3 darts wasted — commit as 0-score visit, player stays locked
        recordVisit(match.stats[pIdx], 0, 3);
        player.history.push({ score: 0, bust: false, darts: 3 });
        player.dartBuffer = [];
        switchPlayer(match);
        match.currentMultiplier = 1;
        renderGameScreen(match);
        renderDartBuffer(match);
        saveToLocalStorage();
        checkLastVisitWarning();
        if (checkLegVisitLimit()) return;
      }
      return;
    }
  }

  // --- Normal dart processing (player is unlocked) ---
  const bufSoFar = player.dartBuffer.reduce((a, d) => a + d.value, 0);
  const remainingBefore = player.score - bufSoFar;
  const remainingAfter  = remainingBefore - dartValue;

  // Bust detection
  const isOvershot      = remainingAfter < 0;
  const isLeftOnOne     = remainingAfter === 1;
  const isInvalidFinish = remainingAfter === 0 && !isValidFinish(base, multiplier, match.checkoutMode);

  if (isOvershot || isLeftOnOne || isInvalidFinish) {
    if (openedThisVisit) player.legOpened = false;
    const bustDarts = player.dartBuffer.length + 1;
    showBust();
    player.history.push({ score: bufSoFar, bust: true, darts: bustDarts });
    player.dartBuffer = [];
    recordVisit(match.stats[pIdx], 0, 3);
    switchPlayer(match);
    match.currentMultiplier = 1;
    renderGameScreen(match);
    renderDartBuffer(match);
    saveToLocalStorage();
    checkLastVisitWarning();
    if (checkLegVisitLimit()) return;
    return;
  }

  // Checkout
  if (remainingAfter === 0) {
    const closingDartNum = player.dartBuffer.length + 1;
    trackDoubleAttempts(match.stats[pIdx], player, remainingBefore, true);
    const visitTotal = bufSoFar + dartValue;
    recordVisit(match.stats[pIdx], visitTotal, closingDartNum);
    player.score = 0;
    player.history.push({ score: visitTotal, bust: false, darts: closingDartNum });
    player.dartBuffer = [];
    pendingCheckoutScore = visitTotal;
    pendingWinnerIndex = pIdx;
    handleLegClose(closingDartNum, true);
    return;
  }

  // Normal dart — add to buffer
  player.dartBuffer.push({ value: dartValue, label, remainingBefore });
  renderDartBuffer(match);
  renderGameScreen(match);

  // Auto-commit after 3rd dart
  if (player.dartBuffer.length === 3) {
    const visitTotal = player.dartBuffer.reduce((a, d) => a + d.value, 0);
    trackDoubleAttempts(match.stats[pIdx], player, null, false);
    recordVisit(match.stats[pIdx], visitTotal, 3);
    player.score -= visitTotal;
    player.history.push({ score: visitTotal, bust: false, darts: 3 });
    player.dartBuffer = [];
    switchPlayer(match);
    match.currentMultiplier = 1;
    renderGameScreen(match);
    renderDartBuffer(match);
    saveToLocalStorage();
    checkLastVisitWarning();
    if (checkLegVisitLimit()) return;
  }
}

// Track double attempts for all buffered darts + optionally the closing dart
// closingRemaining: remainingBefore for the checkout dart (null if not a checkout)
// isHit: true if the closing dart was a checkout
function trackDoubleAttempts(stats, player, closingRemaining, isHit) {
  // Previous buffer darts
  player.dartBuffer.forEach(d => {
    if (isDoubleAttemptScore(d.remainingBefore)) {
      stats.doubleAttempts++;
      stats.legDoubleAttempts++;
    }
  });
  // Closing/last dart
  if (closingRemaining !== null && isDoubleAttemptScore(closingRemaining)) {
    stats.doubleAttempts++;
    stats.legDoubleAttempts++;
    if (isHit) {
      stats.doubleHits++;
      stats.legDoubleHits++;
    }
  }
}

// --- Leg close flow ---

function handleLegClose(dartNumber, isDartByDart) {
  const pIdx = pendingWinnerIndex;
  const names = [match.player1, match.player2];
  match.currentMultiplier = 1;

  const legNum = match.currentLeg;
  const setNum = match.currentSet;
  const legResult = finalizeLeg(match, pIdx, pendingCheckoutScore, dartNumber, isDartByDart);

  if (legResult.matchOver) {
    if (pendingTournamentMatch) {
      saveTournamentMatchResult(match, pendingTournamentMatch);
    } else {
      saveMatchToHistory(match);
    }
    renderGameScreen(match);
    showLegResultDialog(names[pIdx], legNum, 'match', () => {
      renderStatsScreen(match);
      showScreen(SCREENS.STATS);
      document.getElementById('btn-new-match').textContent =
        pendingTournamentMatch ? 'Wróć do meczów' : 'Nowy mecz';
      document.getElementById('btn-live-standings').style.display = 'none';
      saveToLocalStorage();
    });
  } else if (legResult.setOver) {
    showLegResultDialog(names[pIdx], setNum, 'set', () => {
      renderGameScreen(match);
      focusSummaryInput();
      saveToLocalStorage();
    });
  } else {
    showLegResultDialog(names[pIdx], legNum, 'leg', () => {
      renderGameScreen(match);
      focusSummaryInput();
      saveToLocalStorage();
    });
  }

  pendingCheckoutScore = null;
  pendingWinnerIndex = null;
}

// --- Dart visit limit ---

function checkLastVisitWarning() {
  if (!match || !match.dartLimitVisits) return;
  if (match.players[match.activePlayer].history.length === match.dartLimitVisits - 1) {
    showLastVisitToast();
  }
}

function checkLegVisitLimit() {
  if (!match || !match.dartLimitVisits) return false;
  const v0 = match.players[0].history.length;
  const v1 = match.players[1].history.length;
  if (v0 >= match.dartLimitVisits && v1 >= match.dartLimitVisits) {
    showLimitModal();
    return true;
  }
  return false;
}

function showLimitModal() {
  const options = document.getElementById('limit-winner-options');
  options.innerHTML = '';
  [match.player1, match.player2].forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = 'btn limit-winner-btn';
    btn.dataset.player = i;
    btn.textContent = name;
    options.appendChild(btn);
  });
  pendingLimitWinnerIndex = null;
  document.getElementById('btn-limit-dalej').disabled = true;
  const undoBtn = document.getElementById('btn-limit-undo');
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  openModal('modal-dart-limit');
}

function handleLimitLegClose(winnerIndex) {
  const names = [match.player1, match.player2];
  match.currentMultiplier = 1;

  const legNum = match.currentLeg;
  const setNum = match.currentSet;
  const legResult = finalizeLimitLeg(match, winnerIndex);

  if (legResult.matchOver) {
    if (pendingTournamentMatch) {
      saveTournamentMatchResult(match, pendingTournamentMatch);
    } else {
      saveMatchToHistory(match);
    }
    renderGameScreen(match);
    showLegResultDialog(names[winnerIndex], legNum, 'match', () => {
      renderStatsScreen(match);
      showScreen(SCREENS.STATS);
      document.getElementById('btn-new-match').textContent =
        pendingTournamentMatch ? 'Wróć do meczów' : 'Nowy mecz';
      document.getElementById('btn-live-standings').style.display = 'none';
      saveToLocalStorage();
    });
  } else if (legResult.setOver) {
    showLegResultDialog(names[winnerIndex], setNum, 'set', () => {
      renderGameScreen(match);
      focusSummaryInput();
      saveToLocalStorage();
    });
  } else {
    showLegResultDialog(names[winnerIndex], legNum, 'leg', () => {
      renderGameScreen(match);
      focusSummaryInput();
      saveToLocalStorage();
    });
  }
}

// --- localStorage persistence ---

function saveToLocalStorage() {
  if (!match) return;
  try {
    localStorage.setItem('dart_match', JSON.stringify(match));
  } catch (e) { /* ignore quota errors */ }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('dart_match');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && !saved.matchOver) {
      if (confirm('Znaleziono niedokończony mecz. Kontynuować?')) {
        match = saved;
        if (match && match.tournamentMatchContext) {
          pendingTournamentMatch = match.tournamentMatchContext;
          const restoredT = loadTournaments().find(t => t.id === match.tournamentMatchContext.tournamentId);
          document.getElementById('btn-live-standings').style.display =
            (restoredT && restoredT.config.format === 'bracket') ? 'none' : '';
        }
        showScreen(SCREENS.GAME);
        renderGameScreen(match);
      }
    }
  } catch (e) { /* ignore */ }
}
