// App entry point — wires up UI events to game logic

let match = null;
let pendingCheckoutScore = null;
let pendingWinnerIndex = null;
let undoStack = [];  // snapshots of match state before each committed visit
let pendingDeleteRecordId = null;
let pendingEditPlayerId = null;
let pendingDeletePlayerId = null;
let pendingDeleteTournamentId = null;
let pendingOpenScore = null;
let pendingOpenPlayerIndex = null;

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
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.getElementById('modal-overlay').classList.remove('open');
  updateUndoButton();
  renderGameScreen(match);
  renderDartBuffer(match);
  saveToLocalStorage();
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

  document.getElementById('btn-which-open-dart-cancel').addEventListener('click', undoLastVisit);

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
    try { localStorage.removeItem('dart_match'); } catch (e) { /* ignore */ }
    showScreen(SCREENS.HOME);
  });

  // Quick score buttons (always-visible shortcut row)
  document.querySelectorAll('.quick-score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!match) return;
      submitQuickScore(parseInt(btn.dataset.val));
    });
  });

  // New match button (from stats screen)
  document.getElementById('btn-new-match').addEventListener('click', () => {
    showScreen(SCREENS.HOME);
  });

  // Bust toast click to dismiss
  document.getElementById('bust-toast').addEventListener('click', () => {
    document.getElementById('bust-toast').classList.remove('visible');
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

  match = createMatch({ variant, player1, player2, checkoutMode, inMode, totalLegs, totalSets, startingPlayer, playerFavorites });
  undoStack = [];
  updateUndoButton();

  showScreen(SCREENS.GAME);
  renderGameScreen(match);
  document.getElementById('input-score').focus();
  saveToLocalStorage();
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
    } else {
      // Non-zero: player opened the leg — ask which dart (filtered to valid options)
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
    saveMatchToHistory(match);
    renderGameScreen(match);
    showLegResultDialog(names[pIdx], legNum, 'match', () => {
      renderStatsScreen(match);
      showScreen(SCREENS.STATS);
      saveToLocalStorage();
    });
  } else if (legResult.setOver) {
    showLegResultDialog(names[pIdx], setNum, 'set', () => {
      renderGameScreen(match);
      saveToLocalStorage();
    });
  } else {
    showLegResultDialog(names[pIdx], legNum, 'leg', () => {
      renderGameScreen(match);
      saveToLocalStorage();
    });
  }

  pendingCheckoutScore = null;
  pendingWinnerIndex = null;
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
        showScreen(SCREENS.GAME);
        renderGameScreen(match);
      }
    }
  } catch (e) { /* ignore */ }
}
