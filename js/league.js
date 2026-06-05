// League tournament — data, schedule, standings

const TOURNAMENTS_KEY = 'dart_tournaments';
const CHECKOUT_LABELS = { double: 'Double-out', master: 'Master-out', straight: 'Straight-out' };

let _activeTournament = null;

function loadTournaments() {
  try { return JSON.parse(localStorage.getItem(TOURNAMENTS_KEY) || '[]'); }
  catch { return []; }
}

function saveTournaments(list) {
  let active   = list.filter(t => t.status === 'active');
  let finished = list.filter(t => t.status === 'finished');
  if (finished.length > 40) {
    finished.sort((a, b) => a.createdAt - b.createdAt);
    finished = finished.slice(finished.length - 40);
  }
  try { localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify([...active, ...finished])); } catch {}
}

function generateSchedule(numPlayers, leagueRounds) {
  const matches = [];
  for (let i = 0; i < numPlayers; i++) {
    for (let j = i + 1; j < numPlayers; j++) {
      matches.push({ p1: i, p2: j, winner: null, legs: [null, null], sets: [null, null], avgs: [null, null], stats: [null, null] });
      if (leagueRounds === 'double') {
        matches.push({ p1: j, p2: i, winner: null, legs: [null, null], sets: [null, null], avgs: [null, null], stats: [null, null] });
      }
    }
  }
  return matches;
}

function createTournament(config, players) {
  const tournament = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    name: config.name,
    status: 'active',
    createdAt: Math.floor(Date.now() / 1000),
    config: {
      numPlayers: config.numPlayers,
      format: config.format,
      leagueRounds: config.leagueRounds,
      winPoints: config.winPoints,
      lossPoints: config.lossPoints,
      matchConfig: { ...config.matchConfig },
    },
    players,
    matches: generateSchedule(players.length, config.leagueRounds),
  };
  const list = loadTournaments();
  list.push(tournament);
  saveTournaments(list);
  return tournament;
}

function deleteTournament(id) {
  saveTournaments(loadTournaments().filter(t => t.id !== id));
}

function computeStandings(tournament) {
  const { players, matches, config } = tournament;
  const rows = players.map((p, i) => ({
    index: i, name: p.name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  for (const m of matches) {
    if (m.winner === null) continue;
    const [w, l] = m.winner === 0 ? [m.p1, m.p2] : [m.p2, m.p1];
    rows[w].M++; rows[w].W++; rows[w].pts += config.winPoints;
    rows[l].M++; rows[l].L++; rows[l].pts += config.lossPoints;
    rows[m.p1].legsWon  += m.legs[0]; rows[m.p1].legsLost += m.legs[1];
    rows[m.p2].legsWon  += m.legs[1]; rows[m.p2].legsLost += m.legs[0];
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost;
    const bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index;
  });

  rows.forEach((row, i) => {
    const diff = row.legsWon - row.legsLost;
    const prev = rows[i - 1];
    const next = rows[i + 1];
    const tiedWithPrev = prev && prev.pts === row.pts && (prev.legsWon - prev.legsLost) === diff;
    const tiedWithNext = next && next.pts === row.pts && (next.legsWon - next.legsLost) === diff;
    row._tied = tiedWithPrev || tiedWithNext;
  });

  return rows;
}

function computeLiveStandings(tournament, liveData) {
  const { players, matches, config } = tournament;
  const rows = players.map((p, i) => ({
    index: i, name: p.name,
    M: 0, W: 0, L: 0,
    legsWon: 0, legsLost: 0,
    avgSum: 0, avgCount: 0,
    pts: 0,
  }));

  for (const m of matches) {
    if (m.winner === null) continue;
    const [w, l] = m.winner === 0 ? [m.p1, m.p2] : [m.p2, m.p1];
    rows[w].M++; rows[w].W++; rows[w].pts += config.winPoints;
    rows[l].M++; rows[l].L++; rows[l].pts += config.lossPoints;
    rows[m.p1].legsWon  += (m.legs[0] || 0);
    rows[m.p1].legsLost += (m.legs[1] || 0);
    rows[m.p2].legsWon  += (m.legs[1] || 0);
    rows[m.p2].legsLost += (m.legs[0] || 0);
    if (m.avgs[0] !== null) { rows[m.p1].avgSum += m.avgs[0]; rows[m.p1].avgCount++; }
    if (m.avgs[1] !== null) { rows[m.p2].avgSum += m.avgs[1]; rows[m.p2].avgCount++; }
  }

  const { p1Idx, p2Idx, legsWon, setsWon } = liveData;
  const useSets = config.matchConfig.totalSets > 1;
  const score0  = useSets ? setsWon[0] : legsWon[0];
  const score1  = useSets ? setsWon[1] : legsWon[1];

  rows[p1Idx].legsWon  += legsWon[0];
  rows[p1Idx].legsLost += legsWon[1];
  rows[p2Idx].legsWon  += legsWon[1];
  rows[p2Idx].legsLost += legsWon[0];

  if (score0 > score1) {
    rows[p1Idx].pts += config.winPoints;
    rows[p2Idx].pts += config.lossPoints;
  } else if (score1 > score0) {
    rows[p2Idx].pts += config.winPoints;
    rows[p1Idx].pts += config.lossPoints;
  }

  rows.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const aDiff = a.legsWon - a.legsLost, bDiff = b.legsWon - b.legsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    const aAvg = a.avgCount ? a.avgSum / a.avgCount : 0;
    const bAvg = b.avgCount ? b.avgSum / b.avgCount : 0;
    if (bAvg !== aAvg) return bAvg - aAvg;
    return a.index - b.index;
  });

  rows.forEach((row, i) => {
    const diff = row.legsWon - row.legsLost;
    const prev = rows[i - 1], next = rows[i + 1];
    row._tied = (prev && prev.pts === row.pts && (prev.legsWon - prev.legsLost) === diff) ||
                (next && next.pts === row.pts && (next.legsWon - next.legsLost) === diff);
    row._live = row.index === p1Idx || row.index === p2Idx;
  });

  return rows;
}

function renderTournamentListScreen() {
  const all      = loadTournaments();
  const active   = all.filter(t => t.status === 'active').sort((a, b) => b.createdAt - a.createdAt);
  const finished = all.filter(t => t.status === 'finished').sort((a, b) => b.createdAt - a.createdAt);

  const body = document.getElementById('tournament-list-body');
  body.innerHTML = '';

  if (all.length === 0) {
    body.innerHTML = '<p class="t-list-empty">Brak turniejów</p>';
  } else {
    if (active.length > 0) {
      body.insertAdjacentHTML('beforeend', '<div class="t-list-section-label">W toku</div>');
      active.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
    if (finished.length > 0) {
      body.insertAdjacentHTML('beforeend', '<div class="t-list-section-label">Zakończone</div>');
      finished.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
  }

  const btn = document.getElementById('btn-new-tournament');
  const atLimit = active.length >= 5;
  btn.disabled = atLimit;
  btn.title = atLimit ? 'Maksymalna liczba aktywnych turniejów: 5' : '';
}

function buildTournamentCard(t) {
  const div = document.createElement('div');
  div.className = 'tournament-card-item';
  div.dataset.id = t.id;

  const mc    = t.config.matchConfig;
  const meta  = `Liga · ${t.players.length} graczy · ${mc.variant} · First to ${mc.totalLegs}`;
  const played = t.matches.filter(m => m.winner !== null).length;
  const total  = t.matches.length;

  let statusHtml;
  if (t.status === 'active') {
    statusHtml = `<span class="tc-status tc-active">&#9654; W toku &mdash; ${played}/${total} meczów</span>`;
  } else {
    const standings = computeStandings(t);
    const winner    = standings[0] ? escapeHtml(standings[0].name) : '&mdash;';
    statusHtml = `<span class="tc-status tc-done">&#10003; Zakończony &middot; Wygrał: ${winner}</span>`;
  }

  div.innerHTML = `
    <div class="tc-main">
      <div class="tc-name">${escapeHtml(t.name)}</div>
      <div class="tc-meta">${meta}</div>
      ${statusHtml}
    </div>
    <button class="btn-delete-record tc-delete" data-id="${t.id}" title="Usuń">&#x2715;</button>
  `;
  return div;
}

function renderTournamentViewScreen(tournament) {
  _activeTournament = tournament;
  document.getElementById('tv-title').textContent = tournament.name;
  document.getElementById('tv-tab-matches').classList.remove('tv-tab-disabled');
  document.getElementById('tv-tab-table').classList.add('active');
  document.getElementById('tv-tab-matches').classList.remove('active');
  document.getElementById('tv-standings').style.display = '';
  document.getElementById('tv-matches').style.display = 'none';

  const mc = tournament.config.matchConfig;
  const roundsLabel = tournament.config.leagueRounds === 'double' ? 'Dwie rundy' : 'Jedna runda';
  const played = tournament.matches.filter(m => m.winner !== null).length;
  const total  = tournament.matches.length;
  document.getElementById('tv-info-bar').innerHTML =
    `<span>${mc.variant} &middot; First to ${mc.totalLegs} &middot; ${CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode}</span>` +
    `<span>${tournament.players.length} graczy &middot; ${roundsLabel} &middot; ${played}/${total} meczów rozegranych</span>`;

  const rows      = computeStandings(tournament);
  const container = document.getElementById('tv-standings');
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'standings-table';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th>#</th><th class="left">Gracz</th>
    <th>M</th><th>W</th><th>L</th>
    <th>Legi</th><th>Avg</th><th>Pkt</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank     = i + 1;
    const isLeader = rank === 1 && row.M > 0;
    const legDiff  = row.legsWon - row.legsLost;
    const avg      = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
    const legsStr  = row.M === 0 ? '&mdash;' : `${row.legsWon}-${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${isLeader ? 'pos-gold' : 'pos-num'}">${rank}</td>
      <td class="left player-name-cell ${isLeader ? 'name-gold' : ''}">${escapeHtml(row.name)}</td>
      <td>${row.M}</td>
      <td>${row.W}</td>
      <td>${row.L}</td>
      <td class="${legsClass}">${legsStr}</td>
      <td class="avg-cell">${avg}</td>
      <td class="pts-cell">${row.pts}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function renderTournamentMatchesScreen(tournament) {
  const container = document.getElementById('tv-matches');
  container.innerHTML = '';

  const { matches, players } = tournament;

  const lastPlayedAt = new Array(players.length).fill(-1);
  matches.forEach((m, idx) => {
    if (m.winner !== null) {
      lastPlayedAt[m.p1] = idx;
      lastPlayedAt[m.p2] = idx;
    }
  });

  const unplayed = matches
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.winner === null)
    .sort((a, b) =>
      Math.max(lastPlayedAt[a.m.p1], lastPlayedAt[a.m.p2]) -
      Math.max(lastPlayedAt[b.m.p1], lastPlayedAt[b.m.p2])
    );

  const played = matches
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => m.winner !== null);

  if (unplayed.length > 0) {
    container.insertAdjacentHTML('beforeend', '<div class="tv-matches-section">Do rozegrania</div>');
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    unplayed.forEach(({ m, idx }) => grid.appendChild(_buildMatchCell(m, idx, players)));
    container.appendChild(grid);
  }

  if (played.length > 0) {
    container.insertAdjacentHTML('beforeend', '<div class="tv-matches-section">Rozegrane</div>');
    const grid = document.createElement('div');
    grid.className = 'matches-grid';
    played.forEach(({ m, idx }) => grid.appendChild(_buildMatchCell(m, idx, players)));
    container.appendChild(grid);
  }
}

function _buildMatchCell(m, idx, players) {
  const cell = document.createElement('div');
  cell.className = 'match-cell';

  const numDiv = document.createElement('div');
  numDiv.className = 'match-num-above';
  numDiv.textContent = '#' + (idx + 1);
  cell.appendChild(numDiv);

  const card = document.createElement('div');
  card.className = 'match-card' + (m.winner !== null ? ' played' : ' unplayed');
  card.dataset.matchIndex = idx;

  const playersDiv = document.createElement('div');
  playersDiv.className = 'match-players';

  if (m.winner !== null) {
    const useSetScore = m.sets && m.sets[0] !== null;
    const w = m.winner === 0 ? 0 : 1;
    const l = 1 - w;
    const wPIdx = w === 0 ? m.p1 : m.p2;
    const lPIdx = l === 0 ? m.p1 : m.p2;
    const wScore = useSetScore ? m.sets[w] : m.legs[w];
    const lScore = useSetScore ? m.sets[l] : m.legs[l];
    const wAvg   = m.avgs[w] !== null ? m.avgs[w].toFixed(1) : null;
    const lAvg   = m.avgs[l] !== null ? m.avgs[l].toFixed(1) : null;
    playersDiv.appendChild(_buildMatchPlayerRow(players[wPIdx].name, wScore, wAvg, 'winner'));
    playersDiv.appendChild(_buildMatchPlayerRow(players[lPIdx].name, lScore, lAvg, 'loser'));
  } else {
    playersDiv.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    playersDiv.appendChild(_buildMatchPlayerRow(players[m.p2].name, null, null, ''));
  }

  card.appendChild(playersDiv);
  cell.appendChild(card);
  return cell;
}

function _buildMatchPlayerRow(name, score, avg, rowClass) {
  const row = document.createElement('div');
  row.className = 'match-player-row' + (rowClass ? ' ' + rowClass : '');

  const nameSpan = document.createElement('span');
  nameSpan.className = 'mpname';
  nameSpan.textContent = name;
  row.appendChild(nameSpan);

  if (score !== null && score !== undefined) {
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'mpscore';
    scoreSpan.textContent = score;
    row.appendChild(scoreSpan);
  }

  if (avg !== null && avg !== undefined) {
    const avgSpan = document.createElement('span');
    avgSpan.className = 'mpavg';
    avgSpan.textContent = avg;
    row.appendChild(avgSpan);
  }

  return row;
}
