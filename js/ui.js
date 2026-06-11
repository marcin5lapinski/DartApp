// UI Module — screen management and rendering

const SCREENS = { HOME: 'home', SETUP: 'setup', GAME: 'game', STATS: 'stats', PLAYERS: 'players', HISTORY: 'history', HISTORY_DETAIL: 'history-detail', TOURNAMENT: 'tournament', TOURNAMENT_LIST: 'tournament-list', TOURNAMENT_VIEW: 'tournament-view' };

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

function renderGameScreen(match) {
  const p = match.players;
  const names = [match.player1, match.player2];

  for (let i = 0; i < 2; i++) {
    const card = document.getElementById('player-card-' + i);
    card.querySelector('.player-name').textContent = names[i];

    // Live score: subtract current visit buffer so display updates dart-by-dart
    const bufTotal = p[i].dartBuffer.reduce((a, d) => a + d.value, 0);
    card.querySelector('.player-score').textContent = p[i].score - bufTotal;

    const legDarts = match.stats[i].legDarts +
      (match.inputMode === INPUT_MODES.DART_BY_DART && match.activePlayer === i
        ? p[i].dartBuffer.length : 0);
    card.querySelector('.player-darts').textContent = legDarts > 0 ? legDarts + ' lot.' : '';

    const avg = getMatchAverage(match.stats[i]);
    const s = match.stats[i];
    let avgText = s.totalDartsThrown > 0 ? 'Avg: ' + avg.toFixed(2) : '';
    if (match.currentLeg > 1 && s.legDarts > 0) {
      const legAvg = s.legPoints / (s.legDarts / 3);
      avgText += ` <span style="color:var(--green)">(${legAvg.toFixed(2)})</span>`;
    }
    card.querySelector('.player-avg').innerHTML = avgText;

    const lastEl = card.querySelector('.player-last');
    const history = match.players[i].history;
    if (history.length > 0) {
      const last = history[history.length - 1];
      lastEl.textContent = last.bust ? 'Bust' : '+' + last.score;
      lastEl.classList.toggle('bust', last.bust);
    } else {
      lastEl.textContent = '';
      lastEl.classList.remove('bust');
    }

    card.classList.toggle('active', match.activePlayer === i);
    card.classList.toggle('inactive', match.activePlayer !== i);
  }

  const msResult = document.getElementById('ms-result');
  if (match.totalSets > 1) {
    msResult.textContent =
      '(' + match.setsWon[0] + ') ' +
      match.legsWonInSet[0] + ':' + match.legsWonInSet[1] +
      ' (' + match.setsWon[1] + ')';
    msResult.classList.add('ms-sets');
    const legInSet = match.matchOver
      ? match.legsWonInSet[0] + match.legsWonInSet[1]
      : match.legsWonInSet[0] + match.legsWonInSet[1] + 1;
    const limitSuffix = match.dartLimitVisits ? ' | Limit ' + (match.dartLimitVisits * 3) + ' rzutów' : '';
    document.getElementById('leg-indicator').textContent =
      'Set ' + match.currentSet + ' | Leg ' + legInSet + ' (First to ' + match.totalLegs + ')' + limitSuffix;
  } else {
    msResult.textContent = match.legsWon[0] + ' : ' + match.legsWon[1];
    msResult.classList.remove('ms-sets');
    const limitSuffix = match.dartLimitVisits ? ' | Limit ' + (match.dartLimitVisits * 3) + ' rzutów' : '';
    document.getElementById('leg-indicator').textContent =
      'Leg ' + match.currentLeg + ' (First to ' + match.totalLegs + ')' + limitSuffix;
  }

  renderHistory(match);
  renderCheckoutHint(match);
  renderInputMode(match);
}

function renderHistory(match) {
  const container = document.getElementById('turn-history');
  container.innerHTML = '';

  [0, 1].forEach(i => {
    const col = document.createElement('div');
    col.className = 'turn-history-col' + (i === 1 ? ' turn-history-col--right' : '');

    const recent = match.players[i].history.slice(-8).reverse();
    recent.forEach(entry => {
      const div = document.createElement('div');
      div.className = 'history-entry' + (entry.bust ? ' bust' : '');
      div.textContent = entry.bust ? '0 BUST' : '+' + entry.score;
      col.appendChild(div);
    });

    container.appendChild(col);
  });
}

// Wraps the closing double in the path string with a colored span for highlighting.
// pathString: e.g. "T20 S8 D16"
// targetDouble: numeric value e.g. 32 (for D16) or 50 (for Bull)
// highlightColor: CSS color string
function buildHintHtml(pathString, targetDouble, highlightColor) {
  const label = closeDoubleLabel(targetDouble);
  const parts = pathString.split(' ');
  return parts.map((part, i) => {
    if (i === parts.length - 1 && part === label) {
      return `<span style="color:${highlightColor};font-weight:bold">${part}</span>`;
    }
    return part;
  }).join(' ');
}

function renderCheckoutHint(match) {
  const p = match.activePlayer;
  const player = match.players[p];
  const bufTotal = player.dartBuffer.reduce((a, d) => a + d.value, 0);
  const score = player.score - bufTotal;
  const dartsLeft = (match.inputMode === INPUT_MODES.DART_BY_DART || match.inputMode === INPUT_MODES.BOARD)
    ? 3 - player.dartBuffer.length
    : 3;

  const hintEl   = document.getElementById('checkout-hint');
  const hintText = document.getElementById('checkout-hint-text');

  if (score < 2 || score > 170) {
    hintText.innerHTML = '';
    hintEl.classList.remove('active');
    return;
  }

  const favs = match.playerFavorites?.[p];
  let hintHtml = null;

  // Try primary favorite double
  if (favs?.primary) {
    const path = findCheckoutPath(score, favs.primary, dartsLeft);
    if (path) hintHtml = buildHintHtml(path, favs.primary, '#f5c218'); // yellow
  }

  // Try secondary favorite double
  if (!hintHtml && favs?.secondary) {
    const path = findCheckoutPath(score, favs.secondary, dartsLeft);
    if (path) hintHtml = buildHintHtml(path, favs.secondary, '#4da8f5'); // blue
  }

  // Fall back to existing default checkout table
  if (!hintHtml) {
    const hint = getCheckoutHint(score, dartsLeft);
    if (hint) hintHtml = escapeHtml(hint);
  }

  if (hintHtml) {
    hintText.innerHTML = hintHtml;
    hintEl.classList.add('active');
  } else {
    hintText.innerHTML = '';
    hintEl.classList.remove('active');
  }
}

function renderInputMode(match) {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === match.inputMode);
  });
  const isDbd = match.inputMode === INPUT_MODES.DART_BY_DART;
  const isBoard = match.inputMode === INPUT_MODES.BOARD;
  const useBuffer = isDbd || isBoard;

  document.getElementById('summary-area').style.display =
    match.inputMode === INPUT_MODES.SUMMARY ? 'flex' : 'none';
  document.getElementById('dart-by-dart-area').style.display =
    isDbd ? 'flex' : 'none';
  document.getElementById('board-area').style.display =
    isBoard ? 'flex' : 'none';
  document.getElementById('dart-buffer-row').style.display =
    useBuffer ? 'flex' : 'none';
  document.querySelector('.numpad').style.display =
    match.inputMode === INPUT_MODES.SUMMARY ? 'grid' : 'none';

  if (isDbd) renderDartPanel(match);
  if (isBoard) initBoard();
}

// --- Dart-by-dart buffer display ---
function renderDartBuffer(match) {
  const buf = match.players[match.activePlayer].dartBuffer;
  for (let i = 0; i < 3; i++) {
    const el = document.getElementById('dart-slot-' + i);
    const dart = buf[i];
    el.textContent = dart !== undefined ? dart.label : '-';
    el.classList.toggle('filled', dart !== undefined);
  }
}

// --- Dart panel state (multiplier + bull lock + grid tint) ---
function renderDartPanel(match) {
  const mult = match.currentMultiplier || 1;
  document.querySelectorAll('.mult-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.mult) === mult);
  });
  const bull = document.querySelector('.dart-val-btn.bull');
  if (bull) bull.classList.toggle('no-triple', mult === 3);
  const grid = document.getElementById('dart-grid');
  if (grid) {
    grid.classList.toggle('grid-double', mult === 2);
    grid.classList.toggle('grid-triple', mult === 3);
  }
}

// --- Post-match stats screen ---
function renderStatsScreen(match) {
  const names = [match.player1, match.player2];
  const container = document.getElementById('stats-container');
  container.innerHTML = '';

  const winner = match.winner !== null ? names[match.winner] : '—';
  const winnerEl = document.createElement('div');
  winnerEl.className = 'winner-banner';
  winnerEl.textContent = '🏆 Zwycięzca: ' + winner;
  const IN_MODE_LABELS  = { straight: 'Straight-in', double: 'Double-in', master: 'Master-in' };
  const CHECKOUT_LABELS = { double: 'Double-out', master: 'Master-out', straight: 'Straight-out' };
  const settingsEl = document.createElement('div');
  settingsEl.className = 'match-settings-info';
  [
    String(match.variant),
    match.totalSets > 1
      ? 'First to ' + match.totalSets + ' sets × ' + match.totalLegs + ' legs'
      : 'First to ' + match.totalLegs,
    IN_MODE_LABELS[match.inMode]  || match.inMode,
    CHECKOUT_LABELS[match.checkoutMode] || match.checkoutMode,
    match.dartLimitVisits ? 'Limit ' + (match.dartLimitVisits * 3) + ' rzutów' : null,
  ].filter(Boolean).forEach(text => {
    const span = document.createElement('span');
    span.textContent = text;
    settingsEl.appendChild(span);
  });

  const winnerCol = document.createElement('div');
  winnerCol.className = 'winner-col';
  winnerCol.appendChild(winnerEl);
  winnerCol.appendChild(settingsEl);
  container.appendChild(winnerCol);

  for (let i = 0; i < 2; i++) {
    const s = match.stats[i];
    const avg = getMatchAverage(s);
    const dblPct = getDoublePercentage(s);
    const first9 = getFirst9Average(s);
    const fastest = s.fastestLeg !== null ? s.fastestLeg : 0;

    const card = document.createElement('div');
    card.className = 'stats-card';
    card.innerHTML = `
      <h3>${names[i]}</h3>
      <table class="stats-table">
        ${match.totalSets > 1 ? `<tr><td>Sety wygrane</td><td><strong>${match.setsWon[i]}</strong></td></tr>` : ''}
        <tr><td>Legi wygrane</td><td><strong>${match.legsWon[i]}</strong></td></tr>
        <tr><td>Średnia 3-lotek</td><td><strong>${avg.toFixed(2)}</strong></td></tr>
        <tr><td>Średnia pierwszych 9</td><td><strong>${first9.toFixed(2)}</strong></td></tr>
        <tr><td>Najwyższe zamknięcie</td><td><strong>${s.highestCheckout || '—'}</strong></td></tr>
        <tr><td>Najszybszy leg</td><td><strong>${fastest} lotek</strong></td></tr>
        ${match.checkoutMode === 'double' ? `<tr><td>Trafione double</td><td><strong>${dblPct !== null ? dblPct.toFixed(1) + '%' : '—'} (${s.doubleHits}/${s.doubleAttempts})</strong></td></tr>` : ''}
      </table>
    `;
    container.appendChild(card);
  }
}

// --- Toast / bust notification ---
function showBust() {
  const bustEl = document.getElementById('bust-toast');
  const lvEl   = document.getElementById('last-visit-toast');
  bustEl.classList.add('visible');
  setTimeout(() => {
    bustEl.classList.remove('visible', 'stacked');
    lvEl.classList.remove('stacked');
  }, 1500);
}

function showLastVisitToast() {
  const bustEl = document.getElementById('bust-toast');
  const lvEl   = document.getElementById('last-visit-toast');
  if (bustEl.classList.contains('visible')) {
    bustEl.classList.add('stacked');
    lvEl.classList.add('stacked');
  }
  lvEl.classList.add('visible');
  setTimeout(() => lvEl.classList.remove('visible', 'stacked'), 1800);
}

// --- Which-dart dialog ---
function showWhichDartDialog(validDarts, callback) {
  const modal = document.getElementById('modal-which-dart');
  const btnsContainer = modal.querySelector('.dart-options');
  btnsContainer.innerHTML = '';

  validDarts.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-dart-option';
    btn.textContent = d + '. lotka';
    btn.addEventListener('click', () => {
      closeModal('modal-which-dart');
      callback(d);
    });
    btnsContainer.appendChild(btn);
  });

  openModal('modal-which-dart');
}

function showWhichOpenDartDialog(validDarts, callback) {
  const modal = document.getElementById('modal-which-open-dart');
  const btnsContainer = modal.querySelector('.open-dart-options');
  btnsContainer.innerHTML = '';

  validDarts.forEach(d => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-dart-option';
    btn.textContent = d + '. lotka';
    btn.addEventListener('click', () => {
      closeModal('modal-which-open-dart');
      callback(d);
    });
    btnsContainer.appendChild(btn);
  });

  openModal('modal-which-open-dart');
}

function showLegResultDialog(winnerName, num, type, callback) {
  const modal = document.getElementById('modal-leg-result');
  let text;
  if (type === 'match') text = winnerName + ' wygrał mecz!';
  else if (type === 'set') text = winnerName + ' wygrał set ' + num + '!';
  else text = winnerName + ' wygrał leg ' + num + '!';
  modal.querySelector('.leg-result-text').textContent = text;
  modal.querySelector('#btn-next-leg').onclick = () => {
    closeModal('modal-leg-result');
    callback();
  };
  const undoBtn = modal.querySelector('#btn-leg-result-undo');
  if (undoBtn) undoBtn.disabled = (typeof undoStack === 'undefined' || undoStack.length === 0);
  openModal('modal-leg-result');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Only close overlay if no modals remain open
  const anyOpen = document.querySelectorAll('.modal.open').length > 0;
  if (!anyOpen) document.getElementById('modal-overlay').classList.remove('open');
}
