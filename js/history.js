// Match history — save completed matches and render history screen

const HISTORY_KEY = 'dart_history';
const HISTORY_MAX = 100;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveMatchToHistory(match) {
  const records = loadHistory();
  records.unshift({
    id: 'm_' + Date.now(),
    date: Date.now(),
    variant: match.variant,
    checkoutMode: match.checkoutMode,
    inMode: match.inMode || 'straight',
    totalLegs: match.totalLegs,
    totalSets: match.totalSets || 1,
    setsWon: [...(match.setsWon || [0, 0])],
    players: [match.player1, match.player2],
    legsWon: [...match.legsWon],
    winner: match.winner,
    stats: match.stats.map(s => ({
      legsWon: s.legsWon,
      totalDartsThrown: s.totalDartsThrown,
      totalPointsScored: s.totalPointsScored,
      first9Average: getFirst9Average(s),
      highestCheckout: s.highestCheckout,
      fastestLeg: s.fastestLeg,
      doubleAttempts: s.doubleAttempts,
      doubleHits: s.doubleHits,
    })),
  });
  if (records.length > HISTORY_MAX) records.length = HISTORY_MAX;
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(records)); } catch {}
}

function deleteHistoryRecord(id) {
  const records = loadHistory().filter(r => r.id !== id);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(records)); } catch {}
}

function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

function renderHistoryDetailScreen(rec) {
  const container = document.getElementById('history-detail-container');
  container.innerHTML = '';

  const date = new Date(rec.date).toLocaleString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  document.getElementById('history-detail-title').textContent = date;

  const modeLabel   = CHECKOUT_MODE_LABELS[rec.checkoutMode] || rec.checkoutMode;
  const inModeLabel = IN_MODE_LABELS[rec.inMode] || '';

  const winner = rec.winner !== null ? rec.players[rec.winner] : null;
  if (winner) {
    const banner = document.createElement('div');
    banner.className = 'winner-banner';
    banner.textContent = '🏆 Zwycięzca: ' + escapeHtml(winner);
    container.appendChild(banner);
  }

  const meta = document.createElement('div');
  meta.className = 'history-detail-meta';
  const scoreStr = rec.totalSets > 1
    ? `wynik setów ${(rec.setsWon || [0, 0])[0]}:${(rec.setsWon || [0, 0])[1]}`
    : `wynik ${rec.legsWon[0]}:${rec.legsWon[1]}`;
  const formatStr = rec.totalSets > 1 ? `${rec.totalSets} sety × ${rec.totalLegs} legi` : null;
  const metaParts = [String(rec.variant), ...(formatStr ? [formatStr] : []), ...(inModeLabel ? [inModeLabel] : []), modeLabel, scoreStr];
  meta.textContent = metaParts.join(' · ');
  container.appendChild(meta);

  for (let i = 0; i < 2; i++) {
    const s = rec.stats[i];
    const avg = s.totalDartsThrown > 0 ? (s.totalPointsScored / s.totalDartsThrown * 3) : 0;
    const dblPct = s.doubleAttempts > 0 ? (s.doubleHits / s.doubleAttempts * 100) : null;

    const card = document.createElement('div');
    card.className = 'stats-card';
    let rows = `
      ${rec.totalSets > 1 ? `<tr><td>Sety wygrane</td><td><strong>${(rec.setsWon || [0, 0])[i]}</strong></td></tr>` : ''}
      <tr><td>Legi wygrane</td><td><strong>${rec.legsWon[i]}</strong></td></tr>
      <tr><td>Średnia 3-lotek</td><td><strong>${avg.toFixed(2)}</strong></td></tr>`;
    if (s.first9Average != null) {
      rows += `<tr><td>Średnia pierwszych 9</td><td><strong>${s.first9Average.toFixed(2)}</strong></td></tr>`;
    }
    rows += `<tr><td>Najwyższe zamknięcie</td><td><strong>${s.highestCheckout || '—'}</strong></td></tr>`;
    if (s.fastestLeg != null) {
      rows += `<tr><td>Najszybszy leg</td><td><strong>${s.fastestLeg} lotek</strong></td></tr>`;
    }
    if (rec.checkoutMode === 'double') {
      rows += `<tr><td>Trafione double</td><td><strong>${dblPct !== null ? dblPct.toFixed(1) + '%' : '—'} (${s.doubleHits}/${s.doubleAttempts})</strong></td></tr>`;
    }

    card.innerHTML = `<h3>${escapeHtml(rec.players[i])}</h3><table class="stats-table">${rows}</table>`;
    container.appendChild(card);
  }
}

const CHECKOUT_MODE_LABELS = { double: 'DOut', master: 'MOut', straight: 'SOut' };
const IN_MODE_LABELS       = { double: 'DIn', master: 'MIn' };

function renderHistoryScreen() {
  const records = loadHistory();
  const container = document.getElementById('history-list');
  container.innerHTML = '';

  if (records.length === 0) {
    container.innerHTML = '<p class="empty-msg">Brak rozegranych meczów.</p>';
    return;
  }

  records.forEach(rec => {
    const date = new Date(rec.date).toLocaleString('pl-PL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const avg = rec.stats.map(s =>
      s.totalDartsThrown > 0
        ? ((s.totalPointsScored / s.totalDartsThrown) * 3).toFixed(1)
        : '—'
    );

    const modeLabel   = CHECKOUT_MODE_LABELS[rec.checkoutMode] || rec.checkoutMode;
    const inModeLabel = IN_MODE_LABELS[rec.inMode] || '';

    const div = document.createElement('div');
    div.className = 'history-record';
    div.dataset.id = rec.id;
    div.innerHTML = `
      <div class="hr-meta">
        <span class="hr-date">${date}</span>
        <span class="hr-variant">${rec.variant}${rec.totalSets > 1 ? ' · ' + rec.totalSets + 'S×' + rec.totalLegs + 'L' : ''}${inModeLabel ? ' · ' + inModeLabel : ''} · ${modeLabel}</span>
        <button class="btn-delete-record" title="Usuń">✕</button>
      </div>
      <div class="hr-players">
        <span class="hr-pname hr-pname-left ${rec.winner === 0 ? 'hr-winner' : ''}">${escapeHtml(rec.players[0])}</span>
        <span class="hr-score">${rec.totalSets > 1
          ? ((rec.setsWon || [0, 0])[0] + ' : ' + (rec.setsWon || [0, 0])[1])
          : (rec.legsWon[0] + ' : ' + rec.legsWon[1])}</span>
        <span class="hr-pname ${rec.winner === 1 ? 'hr-winner' : ''}">${escapeHtml(rec.players[1])}</span>
      </div>
      <div class="hr-avgs">
        <div class="hr-stats-col">
          <span>avg <span class="hr-val">${avg[0]}</span></span>
          ${rec.stats[0].highestCheckout ? `<span>najw. zamknięcie <span class="hr-val">${rec.stats[0].highestCheckout}</span></span>` : ''}
        </div>
        <div class="hr-stats-col hr-stats-col-right">
          <span>avg <span class="hr-val">${avg[1]}</span></span>
          ${rec.stats[1].highestCheckout ? `<span>najw. zamknięcie <span class="hr-val">${rec.stats[1].highestCheckout}</span></span>` : ''}
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}
