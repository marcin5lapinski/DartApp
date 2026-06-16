// Interactive dartboard — Mode C input
// Canvas-based rendering with click/touch hit detection

const BOARD_SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Radii as fraction of the outer double ring radius.
// Triple and double rings are widened (~3× real proportions) for comfortable touch targets.
const BOARD_R = {
  innerBull:   0.09,
  outerBull:   0.22,
  tripleInner: 0.52,
  tripleOuter: 0.66,
  doubleInner: 0.85,
  doubleOuter: 1.0,
};

const BOARD_COLORS = {
  black:  '#1c1c1c',
  cream:  '#e8d5b0',
  red:    '#b91c1c',
  green:  '#15803d',
  border: '#888',
  wire:   '#666',
};

let _boardCanvas = null;
let _boardCtx = null;
let _boardR = 0; // pixel radius of the outer double ring on the canvas
let _boardSizeDelta = 0; // cumulative px offset from default size (-100…+100)

function initBoard() {
  _boardCanvas = document.getElementById('board-canvas');
  if (!_boardCanvas) return;
  _boardCanvas.removeEventListener('click', _onBoardClick);
  _boardCanvas.removeEventListener('touchend', _onBoardTouch);
  _boardCanvas.addEventListener('click', _onBoardClick);
  _boardCanvas.addEventListener('touchend', _onBoardTouch, { passive: false });
  _resizeBoard();
  _drawBoard();
}

function _resizeBoard() {
  const parent = _boardCanvas.parentElement;
  const maxSize = window.innerWidth < 600 ? 340 : 320;
  const baseSize = Math.min(parent.clientWidth - 16, maxSize);
  const size = baseSize + _boardSizeDelta;
  _boardCanvas.width = size;
  _boardCanvas.height = size;
  _boardR = (size / 2) * 0.84;
  _boardCtx = _boardCanvas.getContext('2d');
}

function adjustBoardSize(delta) {
  _boardSizeDelta = Math.max(-100, Math.min(100, _boardSizeDelta + delta));
  _resizeBoard();
  _drawBoard();
  const plus  = document.getElementById('btn-board-plus');
  const minus = document.getElementById('btn-board-minus');
  if (plus)  plus.disabled  = _boardSizeDelta >= 100;
  if (minus) minus.disabled = _boardSizeDelta <= -100;
}

function _drawBoard() {
  const ctx = _boardCtx;
  if (!ctx) return;
  const W = _boardCanvas.width;
  const H = _boardCanvas.height;
  const cx = W / 2;
  const cy = H / 2;
  const R = _boardR;

  ctx.clearRect(0, 0, W, H);

  // Background disc (slightly larger than doubles ring — holds numbers)
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.22, 0, 2 * Math.PI);
  ctx.fill();

  // Draw 20 sectors
  BOARD_SECTORS.forEach((num, i) => {
    const even = i % 2 === 0;
    // Canvas angles: -99° base so sector 0 (20) is at 12 o'clock
    const a0 = (i * 18 - 99) * Math.PI / 180;
    const a1 = a0 + 18 * Math.PI / 180;

    // Outer single (between doubles inner and triple outer)
    _arc(ctx, cx, cy, R, BOARD_R.doubleInner, BOARD_R.tripleOuter, a0, a1, even ? BOARD_COLORS.black : BOARD_COLORS.cream);
    // Triple ring
    _arc(ctx, cx, cy, R, BOARD_R.tripleOuter, BOARD_R.tripleInner, a0, a1, even ? BOARD_COLORS.red : BOARD_COLORS.green);
    // Inner single (between triple inner and outer bull)
    _arc(ctx, cx, cy, R, BOARD_R.tripleInner, BOARD_R.outerBull, a0, a1, even ? BOARD_COLORS.black : BOARD_COLORS.cream);
    // Double ring
    _arc(ctx, cx, cy, R, BOARD_R.doubleOuter, BOARD_R.doubleInner, a0, a1, even ? BOARD_COLORS.red : BOARD_COLORS.green);

    // Sector dividing wire
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * R * BOARD_R.outerBull, cy + Math.sin(a0) * R * BOARD_R.outerBull);
    ctx.lineTo(cx + Math.cos(a0) * R * BOARD_R.doubleOuter, cy + Math.sin(a0) * R * BOARD_R.doubleOuter);
    ctx.strokeStyle = BOARD_COLORS.wire;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Sector number
    const midAngle = a0 + 9 * Math.PI / 180;
    const tx = cx + Math.cos(midAngle) * R * 1.13;
    const ty = cy + Math.sin(midAngle) * R * 1.13;
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `bold ${Math.round(R * 0.10)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num, tx, ty);
  });

  // Ring wire lines (circles)
  [BOARD_R.outerBull, BOARD_R.tripleInner, BOARD_R.tripleOuter, BOARD_R.doubleInner, BOARD_R.doubleOuter].forEach(frac => {
    ctx.beginPath();
    ctx.arc(cx, cy, R * frac, 0, 2 * Math.PI);
    ctx.strokeStyle = BOARD_COLORS.wire;
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Outer bull (single bull = 25)
  ctx.beginPath();
  ctx.arc(cx, cy, R * BOARD_R.outerBull, 0, 2 * Math.PI);
  ctx.fillStyle = BOARD_COLORS.green;
  ctx.fill();

  // Inner bull (double bull = 50)
  ctx.beginPath();
  ctx.arc(cx, cy, R * BOARD_R.innerBull, 0, 2 * Math.PI);
  ctx.fillStyle = BOARD_COLORS.red;
  ctx.fill();

  // Bull wire
  ctx.beginPath();
  ctx.arc(cx, cy, R * BOARD_R.innerBull, 0, 2 * Math.PI);
  ctx.strokeStyle = BOARD_COLORS.wire;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Draw an annular sector (ring segment)
function _arc(ctx, cx, cy, R, outerFrac, innerFrac, a0, a1, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, R * outerFrac, a0, a1);
  ctx.arc(cx, cy, R * innerFrac, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function _onBoardTouch(e) {
  e.preventDefault();
  if (e.changedTouches.length === 0) return;
  const t = e.changedTouches[0];
  _handleHit(t.clientX, t.clientY);
}

function _onBoardClick(e) {
  _handleHit(e.clientX, e.clientY);
}

function _handleHit(clientX, clientY) {
  if (!match || match.inputMode !== INPUT_MODES.BOARD) return;
  const rect = _boardCanvas.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;

  // Scale from CSS pixels to canvas pixels
  const scale = _boardCanvas.width / rect.width;
  const distCanvas = Math.sqrt(dx * dx + dy * dy) * scale;
  const distFrac = distCanvas / _boardR;

  let base, multiplier;

  if (distFrac > BOARD_R.doubleOuter) {
    base = 0; multiplier = 1; // miss — outside doubles ring
  } else if (distFrac <= BOARD_R.innerBull) {
    base = 25; multiplier = 2; // double bull = 50
  } else if (distFrac <= BOARD_R.outerBull) {
    base = 25; multiplier = 1; // single bull = 25
  } else {
    // Determine sector: angle from top (12 o'clock), clockwise
    const atan2Deg = Math.atan2(dy, dx) * 180 / Math.PI;
    const fromTop = ((atan2Deg + 90) + 360) % 360;
    const sectorIndex = Math.floor((fromTop + 9) / 18) % 20;
    base = BOARD_SECTORS[sectorIndex];

    if (distFrac >= BOARD_R.doubleInner) {
      multiplier = 2;
    } else if (distFrac <= BOARD_R.tripleOuter && distFrac >= BOARD_R.tripleInner) {
      multiplier = 3;
    } else {
      multiplier = 1;
    }
  }

  _flashHit(base, multiplier);

  // submitDartValue reads match.currentMultiplier; set it temporarily
  match.currentMultiplier = multiplier;
  submitDartValue(base);
}

// Brief visual flash on the hit region
function _flashHit(base, multiplier) {
  const ctx = _boardCtx;
  if (!ctx) return;
  const W = _boardCanvas.width;
  const cx = W / 2;
  const cy = W / 2;
  const R = _boardR;

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#fff';

  if (base === 0) {
    // miss — flash outside ring
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.05, 0, 2 * Math.PI);
    ctx.arc(cx, cy, R * BOARD_R.doubleOuter, 0, 2 * Math.PI, true);
    ctx.fill('evenodd');
  } else if (base === 25) {
    ctx.beginPath();
    const fr = multiplier === 2 ? BOARD_R.innerBull : BOARD_R.outerBull;
    const to = multiplier === 2 ? 0 : BOARD_R.innerBull;
    ctx.arc(cx, cy, R * fr, 0, 2 * Math.PI);
    if (to > 0) ctx.arc(cx, cy, R * to, 0, 2 * Math.PI, true);
    ctx.fill('evenodd');
  } else {
    const sectorIndex = BOARD_SECTORS.indexOf(base);
    const a0 = (sectorIndex * 18 - 99) * Math.PI / 180;
    const a1 = a0 + 18 * Math.PI / 180;
    let outerFrac, innerFrac;
    if (multiplier === 2) { outerFrac = BOARD_R.doubleOuter; innerFrac = BOARD_R.doubleInner; }
    else if (multiplier === 3) { outerFrac = BOARD_R.tripleOuter; innerFrac = BOARD_R.tripleInner; }
    else { outerFrac = BOARD_R.doubleInner; innerFrac = BOARD_R.outerBull; } // singles lumped together
    _arc(ctx, cx, cy, R, outerFrac, innerFrac, a0, a1, '#fff');
  }
  ctx.restore();

  setTimeout(() => _drawBoard(), 200);
}

let _resizeTimer = null;
window.addEventListener('resize', () => {
  if (!_boardCanvas || _boardCanvas.offsetWidth === 0) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    _resizeBoard();
    _drawBoard();
  }, 100);
});
