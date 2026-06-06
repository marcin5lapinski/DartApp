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

function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function computeRoundName(roundIdx, numRounds) {
  const tables = {
    2: ['Półfinał', 'Finał'],
    3: ['Ćwierćfinał', 'Półfinał', 'Finał'],
    4: ['1/8 Finału', 'Ćwierćfinał', 'Półfinał', 'Finał'],
  };
  return (tables[numRounds] || [])[roundIdx] || ('Runda ' + (roundIdx + 1));
}

function _bracketCenterY(round, slot, cardH, gap) {
  if (round === 0) return slot * (cardH + gap) + cardH / 2;
  return (_bracketCenterY(round - 1, slot * 2,     cardH, gap) +
          _bracketCenterY(round - 1, slot * 2 + 1, cardH, gap)) / 2;
}

function advanceBracketWinner(matches, finishedMatch) {
  const winnerPlayerIdx = finishedMatch.winner === 0 ? finishedMatch.p1 : finishedMatch.p2;
  const nextRound = finishedMatch.round + 1;
  const nextSlot  = Math.floor(finishedMatch.slot / 2);
  const target    = matches.find(m => m.round === nextRound && m.slot === nextSlot);
  if (!target) return; // Final has no next round
  if (finishedMatch.slot % 2 === 0) target.p1 = winnerPlayerIdx;
  else                               target.p2 = winnerPlayerIdx;
}

function generateBracket(numPlayers, players) {
  const B         = nextPowerOf2(numPlayers);
  const numByes   = B - numPlayers;
  const numRounds = Math.log2(B);
  const r1Slots   = B / 2;
  const matches   = [];

  // Round 0: numByes bye-slots then real matches
  for (let slot = 0; slot < r1Slots; slot++) {
    if (slot < numByes) {
      matches.push({
        round: 0, slot, isBye: true,
        p1: slot, p2: null, winner: 0,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    } else {
      const ri   = slot - numByes;
      const p1i  = numByes + ri * 2;
      const p2i  = numByes + ri * 2 + 1;
      matches.push({
        round: 0, slot, isBye: false,
        p1: p1i, p2: p2i, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    }
  }

  // Rounds 1..numRounds-1: all TBD
  for (let r = 1; r < numRounds; r++) {
    const slotsInRound = B / Math.pow(2, r + 1);
    for (let slot = 0; slot < slotsInRound; slot++) {
      matches.push({
        round: r, slot, isBye: false,
        p1: null, p2: null, winner: null,
        legs: [null, null], sets: [null, null],
        avgs: [null, null], stats: [null, null], starter: null,
      });
    }
  }

  // Pre-fill subsequent rounds for all bye matches
  matches.filter(m => m.isBye).forEach(m => advanceBracketWinner(matches, m));

  return matches;
}

function createTournament(config, players) {
  const isBracket = config.format === 'bracket';
  const tournament = {
    id: 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
    name: config.name,
    status: 'active',
    createdAt: Math.floor(Date.now() / 1000),
    config: {
      numPlayers: config.numPlayers,
      format: config.format,
      ...(isBracket
        ? { bracketSize: nextPowerOf2(players.length) }
        : { leagueRounds: config.leagueRounds, winPoints: config.winPoints, lossPoints: config.lossPoints }),
      matchConfig: { ...config.matchConfig },
    },
    players,
    matches: isBracket
      ? generateBracket(players.length, players)
      : generateSchedule(players.length, config.leagueRounds),
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

  const { p1Idx, p2Idx, legsWon, setsWon, avgs } = liveData;
  const useSets = config.matchConfig.totalSets > 1;
  const score0  = useSets ? setsWon[0] : legsWon[0];
  const score1  = useSets ? setsWon[1] : legsWon[1];

  rows[p1Idx].legsWon  += legsWon[0];
  rows[p1Idx].legsLost += legsWon[1];
  rows[p2Idx].legsWon  += legsWon[1];
  rows[p2Idx].legsLost += legsWon[0];

  if (avgs) {
    if (avgs[0] !== null) { rows[p1Idx].avgSum += avgs[0]; rows[p1Idx].avgCount++; }
    if (avgs[1] !== null) { rows[p2Idx].avgSum += avgs[1]; rows[p2Idx].avgCount++; }
  }

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
      const atLimitClass = active.length >= 5 ? ' t-list-limit--full' : '';
      body.insertAdjacentHTML('beforeend',
        `<div class="t-list-section-label">W toku<span class="t-list-limit${atLimitClass}">${active.length} / 5</span></div>`);
      active.forEach(t => body.appendChild(buildTournamentCard(t)));
    }
    if (finished.length > 0) {
      const atLimitClass = finished.length >= 40 ? ' t-list-limit--full' : '';
      body.insertAdjacentHTML('beforeend',
        `<div class="t-list-section-label">Zakończone<span class="t-list-limit${atLimitClass}">${finished.length} / 40</span></div>`);
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
  const isBracket = t.config.format === 'bracket';
  const meta  = (isBracket ? 'Drabinka' : 'Liga') + ' · ' + t.players.length + ' graczy · ' + mc.variant + ' · First to ' + mc.totalLegs;
  const played = isBracket
    ? t.matches.filter(m => !m.isBye && m.winner !== null).length
    : t.matches.filter(m => m.winner !== null).length;
  const total = isBracket
    ? t.matches.filter(m => !m.isBye).length
    : t.matches.length;

  let statusHtml;
  if (t.status === 'active') {
    statusHtml = '<span class="tc-status tc-active">&#9654; W toku &mdash; ' + played + '/' + total + ' meczów</span>';
  } else {
    let winner;
    if (isBracket) {
      const numRounds  = Math.log2(t.config.bracketSize);
      const finalMatch = t.matches.find(m => m.round === numRounds - 1 && m.slot === 0);
      if (finalMatch && finalMatch.winner !== null) {
        const wIdx = finalMatch.winner === 0 ? finalMatch.p1 : finalMatch.p2;
        winner = escapeHtml(t.players[wIdx].name);
      } else {
        winner = '&mdash;';
      }
    } else {
      const standings = computeStandings(t);
      winner = standings[0] ? escapeHtml(standings[0].name) : '&mdash;';
    }
    statusHtml = '<span class="tc-status tc-done">&#10003; Zakończony &middot; Wygrał: ' + winner + '</span>';
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

function renderBracketScreen(tournament) {
  const container = document.getElementById('tv-bracket');
  container.innerHTML = '';

  const { matches, players, config } = tournament;
  const B         = config.bracketSize;
  const numRounds = Math.log2(B);
  const CARD_H = 36, GAP = 8, LABEL_H = 26, SVG_W = 20;

  const byRound = [];
  for (let r = 0; r < numRounds; r++) {
    byRound.push(matches.filter(m => m.round === r).sort((a, b) => a.slot - b.slot));
  }

  const numR1Slots = B / 2;
  const bodyH = numR1Slots * CARD_H + (numR1Slots - 1) * GAP;

  const VISIBLE = 3;
  let offset = 0;

  function render() {
    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'bk-nav-wrap';

    if (numRounds > VISIBLE) {
      const lBtn = document.createElement('button');
      lBtn.className = 'bk-arrow';
      lBtn.textContent = '←';
      lBtn.disabled = (offset === 0);
      lBtn.addEventListener('click', () => { offset--; render(); });
      wrap.appendChild(lBtn);
    }

    const viewport = document.createElement('div');
    viewport.className = 'bk-viewport';
    const track = document.createElement('div');
    track.className = 'bk-track';

    const end = Math.min(offset + VISIBLE, numRounds);
    for (let ri = offset; ri < end; ri++) {
      const roundMatches = byRound[ri];
      // find the absolute index in tournament.matches[] of the first match in this round
      const firstIdx = matches.findIndex(m => m.round === ri && m.slot === 0);
      const col = buildBracketRound(roundMatches, ri, numRounds, players, firstIdx, CARD_H, GAP, bodyH);
      track.appendChild(col);

      const isLastVisible = (ri === end - 1);
      const hasMoreRight  = (ri < numRounds - 1);
      if (!isLastVisible) {
        track.appendChild(buildBracketConnectorSvg(byRound[ri].length, ri, CARD_H, GAP, LABEL_H, bodyH, SVG_W, false));
      } else if (hasMoreRight) {
        track.appendChild(buildBracketConnectorSvg(byRound[ri].length, ri, CARD_H, GAP, LABEL_H, bodyH, Math.floor(SVG_W / 2), true));
      }
    }

    viewport.appendChild(track);
    wrap.appendChild(viewport);

    if (numRounds > VISIBLE) {
      const rBtn = document.createElement('button');
      rBtn.className = 'bk-arrow';
      rBtn.textContent = '→';
      rBtn.disabled = (offset + VISIBLE >= numRounds);
      rBtn.addEventListener('click', () => { offset++; render(); });
      wrap.appendChild(rBtn);
    }

    container.appendChild(wrap);
  }

  render();
}

function renderTournamentViewScreen(tournament) {
  _activeTournament = tournament;
  const isBracket = tournament.config.format === 'bracket';
  if (isBracket) {
    document.getElementById('tv-title').textContent = tournament.name;
    document.getElementById('tv-tabs').style.display      = 'none';
    document.getElementById('tv-standings').style.display = 'none';
    document.getElementById('tv-matches').style.display   = 'none';
    document.getElementById('tv-bracket').style.display   = '';
    const mc      = tournament.config.matchConfig;
    const played  = tournament.matches.filter(m => !m.isBye && m.winner !== null).length;
    const total   = tournament.matches.filter(m => !m.isBye).length;
    document.getElementById('tv-info-bar').innerHTML =
      '<span>Drabinka &middot; ' + mc.variant + ' &middot; First to ' + mc.totalLegs + ' &middot; ' + (CHECKOUT_LABELS[mc.checkoutMode] || mc.checkoutMode) + '</span>' +
      '<span>' + tournament.players.length + ' graczy &middot; ' + played + '/' + total + ' meczów rozegranych</span>';
    renderBracketScreen(tournament);
    return;
  }
  // --- league: restore tabs/standings visibility ---
  document.getElementById('tv-tabs').style.display = '';
  document.getElementById('tv-bracket').style.display = 'none';
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
  const finished  = tournament.status === 'finished' ||
                    tournament.matches.every(m => m.winner !== null);
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

  const MEDAL_POS  = ['pos-gold',  'pos-silver',  'pos-bronze'];
  const MEDAL_NAME = ['name-gold', 'name-silver', 'name-bronze'];

  const tbody = document.createElement('tbody');
  rows.forEach((row, i) => {
    const rank = i + 1;
    let posClass, nameClass;
    if (finished && rank <= 3) {
      posClass  = MEDAL_POS[rank - 1];
      nameClass = MEDAL_NAME[rank - 1];
    } else if (!finished && rank === 1 && row.M > 0) {
      posClass  = 'pos-gold';
      nameClass = 'name-gold';
    } else {
      posClass  = 'pos-num';
      nameClass = '';
    }

    const legDiff   = row.legsWon - row.legsLost;
    const avg       = row.avgCount ? (row.avgSum / row.avgCount).toFixed(1) : '&mdash;';
    const legsStr   = row.M === 0 ? '&mdash;' : `${row.legsWon}-${row.legsLost}`;
    const legsClass = row.M === 0 ? '' : legDiff > 0 ? 'legs-pos' : legDiff < 0 ? 'legs-neg' : 'legs-even';

    const tr = document.createElement('tr');
    if (row._tied) tr.classList.add('standings-tied');
    tr.innerHTML = `
      <td class="${posClass}">${rank}</td>
      <td class="left player-name-cell ${nameClass}">${escapeHtml(row.name)}</td>
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
    const wAvgF  = m.avgs[w];
    const lAvgF  = m.avgs[l];
    const wAvg   = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg   = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest  = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest  = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    playersDiv.appendChild(_buildMatchPlayerRow(players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    playersDiv.appendChild(_buildMatchPlayerRow(players[lPIdx].name, lScore, lAvg, 'loser', lBest));
  } else {
    playersDiv.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    playersDiv.appendChild(_buildMatchPlayerRow(players[m.p2].name, null, null, ''));
  }

  card.appendChild(playersDiv);
  cell.appendChild(card);
  return cell;
}

function _buildMatchPlayerRow(name, score, avg, rowClass, avgBest) {
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
    avgSpan.className = 'mpavg' + (avgBest ? ' avg-best' : '');
    avgSpan.textContent = avg;
    row.appendChild(avgSpan);
  }

  return row;
}

function _buildBracketCard(m, matchIdx, players, topPx) {
  const wrap = document.createElement('div');
  wrap.className = 'bk-card-wrap';
  wrap.style.top = topPx + 'px';

  const classes = ['match-card'];
  if (m.isBye) {
    classes.push('bye-card');
  } else if (m.winner !== null) {
    classes.push('played');
  } else if (m.p1 === null && m.p2 === null) {
    classes.push('tbd-card');
  } else {
    classes.push('unplayed');
  }
  const card = document.createElement('div');
  card.className = classes.join(' ');
  card.dataset.matchIndex = matchIdx;

  const pd = document.createElement('div');
  pd.className = 'match-players';

  if (m.isBye) {
    // Bye: show seeded player name + "— wolny los —" placeholder
    pd.appendChild(_buildMatchPlayerRow(players[m.p1].name, null, null, ''));
    const byeRow = document.createElement('div');
    byeRow.className = 'match-player-row bye-slot-row';
    const byeSpan = document.createElement('span');
    byeSpan.className = 'mpname';
    byeSpan.textContent = '— wolny los —';
    byeRow.appendChild(byeSpan);
    pd.appendChild(byeRow);
  } else if (m.winner !== null) {
    // Played: show winner/loser with scores and averages
    const useSet = m.sets && m.sets[0] !== null;
    const w = m.winner, l = 1 - w;
    const wPIdx = w === 0 ? m.p1 : m.p2;
    const lPIdx = l === 0 ? m.p1 : m.p2;
    const wScore = useSet ? m.sets[w] : m.legs[w];
    const lScore = useSet ? m.sets[l] : m.legs[l];
    const wAvgF  = m.avgs[w], lAvgF = m.avgs[l];
    const wAvg   = wAvgF !== null ? wAvgF.toFixed(1) : null;
    const lAvg   = lAvgF !== null ? lAvgF.toFixed(1) : null;
    const wBest  = wAvgF !== null && lAvgF !== null && wAvgF > lAvgF;
    const lBest  = wAvgF !== null && lAvgF !== null && lAvgF > wAvgF;
    pd.appendChild(_buildMatchPlayerRow(players[wPIdx].name, wScore, wAvg, 'winner', wBest));
    pd.appendChild(_buildMatchPlayerRow(players[lPIdx].name, lScore, lAvg, 'loser',  lBest));
  } else {
    // Unplayed or partially-seeded TBD: show known names, "?" for unknown
    const name1 = m.p1 !== null ? players[m.p1].name : '?';
    const name2 = m.p2 !== null ? players[m.p2].name : '?';
    pd.appendChild(_buildMatchPlayerRow(name1, null, null, ''));
    pd.appendChild(_buildMatchPlayerRow(name2, null, null, ''));
  }

  card.appendChild(pd);
  wrap.appendChild(card);
  return wrap;
}

function buildBracketRound(roundMatches, roundIdx, numRounds, players, matchIdxOffset, CARD_H, GAP, bodyH) {
  const col = document.createElement('div');
  col.className = 'bk-col';

  const lbl = document.createElement('div');
  lbl.className = 'bk-label' + (roundIdx === numRounds - 1 ? ' bk-label-final' : '');
  lbl.textContent = computeRoundName(roundIdx, numRounds);
  col.appendChild(lbl);

  const body = document.createElement('div');
  body.className = 'bk-body';
  body.style.height = bodyH + 'px';
  col.appendChild(body);

  roundMatches.forEach((m, i) => {
    const topPx = _bracketCenterY(m.round, m.slot, CARD_H, GAP) - CARD_H / 2;
    body.appendChild(_buildBracketCard(m, matchIdxOffset + i, players, topPx));
  });

  return col;
}

function buildBracketConnectorSvg(numLeft, round, CARD_H, GAP, LABEL_H, bodyH, SVG_W, isDashed) {
  const totalH = LABEL_H + bodyH;
  const HOOK   = Math.floor(SVG_W / 2);
  const STROKE = '#2d2d2d';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width',  SVG_W);
  svg.setAttribute('height', totalH);
  svg.style.flexShrink = '0';
  svg.style.display    = 'block';

  const numPairs = Math.floor(numLeft / 2);
  for (let pair = 0; pair < numPairs; pair++) {
    const slot1 = pair * 2, slot2 = pair * 2 + 1;
    const y1   = LABEL_H + _bracketCenterY(round, slot1, CARD_H, GAP);
    const y2   = LABEL_H + _bracketCenterY(round, slot2, CARD_H, GAP);
    const midY = (y1 + y2) / 2;

    if (!isDashed) {
      const arm = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      arm.setAttribute('points',       `0,${y1} ${HOOK},${y1} ${HOOK},${y2} 0,${y2}`);
      arm.setAttribute('fill',         'none');
      arm.setAttribute('stroke',       STROKE);
      arm.setAttribute('stroke-width', '1');
      svg.appendChild(arm);
    }

    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1',           isDashed ? 0 : HOOK);
    ln.setAttribute('y1',           midY);
    ln.setAttribute('x2',           SVG_W);
    ln.setAttribute('y2',           midY);
    ln.setAttribute('stroke',       STROKE);
    ln.setAttribute('stroke-width', '1');
    if (isDashed) ln.setAttribute('stroke-dasharray', '3,3');
    svg.appendChild(ln);
  }

  return svg;
}
