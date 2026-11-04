/**
 * Seamless Endless ASCII Bitcoin Running Text Pattern Canvas
 */
import { store } from '../core/store.js';

export function initAsciiBackground() {
  const canvas = document.getElementById('asciiCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationFrameId = null;

  const BANNER_LINES = [
    "   .---------.     ██████╗  ██╗ ████████╗  ██████╗   ██████╗  ██╗ ███╗   ██╗    [ ₿ BITCOIN // LEDGER ]     ",
    "  /  ₿     ₿  \\    ██╔══██╗ ██║ ╚══██╔══╝ ██╔════╝  ██╔═══██╗ ██║ ████╗  ██║    [ BLOCK #867,420 ]          ",
    " |  [BITCOIN]  |   ██████╔╝ ██║    ██║    ██║       ██║   ██║ ██║ ██╔██╗ ██║    [ 21,000,000 HARD CAP ]     ",
    "  \\  ₿     ₿  /    ██╔══██╗ ██║    ██║    ██║       ██║   ██║ ██║ ██║╚██╗██║    [ SHA-256 PROOF-OF-WORK ]   ",
    "   '---------'     ██████╔╝ ██║    ██║    ╚██████╗  ╚██████╔╝ ██║ ██║ ╚████║    [ DECENTRALIZED PROTOCOL ]  ",
  ];

  const TAPE_HEADER = "════ ₿ BITCOIN CONTINUOUS NETWORK ════ [PEER-TO-PEER CASH] ════ BLOCK #867,420 ════ SHA-256 ════ DIFFICULTY: 84.23 T ════ MEMPOOL: SYNCED ════ ";
  const TAPE_TICKER = " ₿ BTC/USD: $68,420.50 ▲ +3.42% ── SAT/USD: $0.000684 ── 24H_HIGH: $69,150.00 ── 24H_LOW: $66,800.00 ── VOL: 42,918 BTC ── PAPERTRADE DEX ── ";
  const TAPE_GENESIS = ' "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks" ── SATOSHI NAKAMOTO ── GENESIS HASH: 000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f ── ';
  const TAPE_MEDALLIONS = "[ ₿ ] ────── [ BTC ] ────── [ ₿ ] ────── [ 21M ] ────── [ ₿ ] ────── [ SAT ] ────── [ ₿ ] ────── [ HODL ] ────── [ ₿ ] ────── [ P2P ] ────── ";
  const TAPE_HASH = " 000000000000000000024be43aced4289832117a22839d09c687e14c46f235b6 ── NONCE: 2083236893 ── MERKLE: 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b ── ";

  const SPEEDS = {
    header: 0.85,
    banner: 1.15,
    ticker: 1.60,
    genesis: 0.70,
    medallions: 1.05,
    hash: 1.30,
  };

  const offsets = {
    header: 0,
    banner: 0,
    ticker: 0,
    genesis: 0,
    medallions: 0,
    hash: 0,
  };

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  let cachedWidths = null;
  function measureWidths() {
    ctx.font = '12px "JetBrains Mono", monospace';
    cachedWidths = {
      header: ctx.measureText(TAPE_HEADER).width,
      banner: ctx.measureText(BANNER_LINES[0]).width,
      ticker: ctx.measureText(TAPE_TICKER).width,
      genesis: ctx.measureText(TAPE_GENESIS).width,
      medallions: ctx.measureText(TAPE_MEDALLIONS).width,
      hash: ctx.measureText(TAPE_HASH).width,
    };
  }

  function drawSeamlessLine(text, textWidth, offset, y) {
    if (!textWidth) return;
    const normOffset = offset % textWidth;
    let startX = -normOffset;
    while (startX < canvas.width) {
      ctx.fillText(text, startX, y);
      startX += textWidth;
    }
  }

  function renderFrame() {
    const width = canvas.width;
    const height = canvas.height;
    if (!width || !height) return;

    if (!cachedWidths) measureWidths();

    offsets.header = (offsets.header + SPEEDS.header) % cachedWidths.header;
    offsets.banner = (offsets.banner + SPEEDS.banner) % cachedWidths.banner;
    offsets.ticker = (offsets.ticker + SPEEDS.ticker) % cachedWidths.ticker;
    offsets.genesis = (offsets.genesis + SPEEDS.genesis) % cachedWidths.genesis;
    offsets.medallions = (offsets.medallions + SPEEDS.medallions) % cachedWidths.medallions;
    offsets.hash = (offsets.hash + SPEEDS.hash) % cachedWidths.hash;

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px "JetBrains Mono", monospace';

    const isDark = document.documentElement.dataset.theme === 'dark';
    ctx.fillStyle = isDark ? '#c7c4d8' : '#7a7060';

    const lineHeight = 19;
    const unitLineCount = 10;
    const unitHeight = unitLineCount * lineHeight;
    const repeats = Math.ceil(height / unitHeight) + 1;

    for (let r = 0; r < repeats; r++) {
      const baseY = r * unitHeight;
      drawSeamlessLine(TAPE_HEADER, cachedWidths.header, offsets.header, baseY + lineHeight * 1);
      for (let b = 0; b < BANNER_LINES.length; b++) {
        drawSeamlessLine(BANNER_LINES[b], cachedWidths.banner, offsets.banner, baseY + lineHeight * (b + 2));
      }
      drawSeamlessLine(TAPE_TICKER, cachedWidths.ticker, offsets.ticker, baseY + lineHeight * 7);
      drawSeamlessLine(TAPE_GENESIS, cachedWidths.genesis, offsets.genesis, baseY + lineHeight * 8);
      drawSeamlessLine(TAPE_MEDALLIONS, cachedWidths.medallions, offsets.medallions, baseY + lineHeight * 9);
      drawSeamlessLine(TAPE_HASH, cachedWidths.hash, offsets.hash, baseY + lineHeight * 10);
    }
  }

  function loop() {
    if (!store.get('asciiEnabled')) return;
    renderFrame();
    animationFrameId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!animationFrameId && store.get('asciiEnabled')) {
      cachedWidths = null;
      animationFrameId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopLoop();
    else if (store.get('asciiEnabled')) startLoop();
  });

  if (store.get('asciiEnabled')) {
    startLoop();
  }
}
