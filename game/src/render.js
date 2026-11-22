// Ember & Tide — everything the player sees: the title screen, the table,
// the cards, the health and mana bars, the win and loss screens, and the
// flourishes (damage numbers, screen shake, victory confetti).

const $ = (sel) => document.querySelector(sel);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function elementBadge(element) {
  const e = ELEMENTS[element];
  const s = el('span', 'elem-badge');
  s.style.background = e.color;
  s.title = e.name;
  s.textContent = e.glyph + ' ' + e.name;
  return s;
}

// --- Card DOM ---------------------------------------------------------------

function cardElement(card, opts) {
  opts = opts || {};
  const e = ELEMENTS[card.element];
  const node = el('div', 'card elem-' + card.element + (opts.small ? ' small' : ''));
  node.style.setProperty('--elem', e.color);
  node.style.setProperty('--elem-dark', e.dark);
  node.style.setProperty('--elem-light', e.light);
  if (opts.uid !== undefined) node.dataset.uid = String(opts.uid);
  if (opts.handIndex !== undefined) node.dataset.handIndex = String(opts.handIndex);
  if (opts.selectable) node.classList.add('selectable');
  if (opts.selected) node.classList.add('selected');
  if (opts.targetable) node.classList.add('targetable');
  if (opts.canAttack) node.classList.add('can-attack');
  if (opts.justPlayed) node.classList.add('just-played');
  if (opts.disabled) node.classList.add('disabled');

  const cost = el('div', 'card-cost', String(card.cost));
  const glyph = el('div', 'card-glyph', e.glyph);
  const name = el('div', 'card-name', card.name);
  const kind = el('div', 'card-kind', card.kind === 'creature' ? 'Creature' : 'Spell · ' + e.name);
  const text = el('div', 'card-text', card.text);
  node.append(cost, glyph, name, kind, text);
  if (card.kind === 'creature') {
    const stats = el('div', 'card-stats');
    const atk = el('span', 'stat-atk', '⚔ ' + (opts.atk !== undefined ? opts.atk : card.atk));
    const hp = el('span', 'stat-hp', '♥ ' + (opts.hp !== undefined ? opts.hp : card.hp));
    stats.append(atk, hp);
    node.append(stats);
  } else {
    const targetHint = el('div', 'card-target-hint', targetHintFor(card));
    node.append(targetHint);
  }
  return node;
}

function targetHintFor(card) {
  if (card.target === 'any') return 'Target: any enemy';
  if (card.target === 'ally-creature') return 'Target: your creature';
  return 'No target needed';
}

function cardBackElement() {
  const node = el('div', 'card card-back');
  node.append(el('div', 'card-back-glyph', '≈'));
  node.append(el('div', 'card-back-name', 'Tide Oracle'));
  return node;
}

// --- Hero bar ----------------------------------------------------------------

function heroBar(hero, isPlayer) {
  const wrap = el('div', 'hero-bar' + (isPlayer ? ' hero-player' : ' hero-oracle'));
  wrap.dataset.hero = isPlayer ? 'player' : 'oracle';
  const portrait = el('div', 'hero-portrait', isPlayer ? '🔥' : '🌊');
  const info = el('div', 'hero-info');
  const nameRow = el('div', 'hero-name');
  nameRow.append(el('span', 'hero-title', hero.name), elementBadge(isPlayer ? 'ember' : 'tide'));
  const hpRow = el('div', 'hero-hp-row');
  const hpBar = el('div', 'hp-bar');
  const hpFill = el('div', 'hp-fill');
  hpFill.style.width = Math.max(0, (hero.hp / hero.maxHp) * 100) + '%';
  hpFill.classList.toggle('low', hero.hp <= 10);
  hpBar.append(hpFill);
  const hpText = el('span', 'hp-text', hero.hp + ' / ' + hero.maxHp + ' HP');
  hpRow.append(hpBar, hpText);
  const manaRow = el('div', 'mana-row');
  for (let i = 0; i < 10; i++) {
    const pip = el('span', 'mana-pip' + (i < hero.maxMana ? (i < hero.mana ? ' full' : ' empty') : ' locked'), '◆');
    manaRow.append(pip);
  }
  manaRow.append(el('span', 'mana-text', hero.mana + ' / ' + hero.maxMana + ' mana'));
  info.append(nameRow, hpRow, manaRow);
  const deck = el('div', 'deck-count');
  deck.append(el('div', 'deck-card', '🂠'));
  deck.append(el('span', 'deck-text', hero.deck.length + ' cards'));
  wrap.append(portrait, info, deck);
  return wrap;
}

// --- Table -------------------------------------------------------------------

function renderTable() {
  const table = $('#screen-game');
  table.innerHTML = '';

  const top = el('div', 'table-top');
  top.append(heroBar(Game.oracle, false));
  const oracleHand = el('div', 'mini-hand');
  for (let i = 0; i < Game.oracle.hand.length; i++) oracleHand.append(cardBackElement());
  const oracleHandLabel = el('div', 'hand-label', 'Oracle hand · ' + Game.oracle.hand.length + ' cards');
  const oracleCol = el('div', 'side-col');
  oracleCol.append(oracleHandLabel, oracleHand);
  top.append(oracleCol);

  const oracleBoard = el('div', 'board-row board-oracle');
  if (Game.oracle.board.length === 0) oracleBoard.append(el('div', 'board-empty', 'The Oracle has no creatures — strike now!'));
  for (const c of Game.oracle.board) {
    const card = cardById(c.cardId);
    const node = cardElement(card, {
      uid: c.uid, atk: c.atk, hp: c.hp, justPlayed: c.justPlayed,
      targetable: isOracleCreatureTargetable(c),
      selectable: false,
    });
    oracleBoard.append(node);
  }

  const mid = el('div', 'table-mid');
  const logBox = el('div', 'log-box');
  logBox.append(el('div', 'log-title', 'Duel log'));
  for (const line of Game.log.slice(0, 4)) logBox.append(el('div', 'log-line', line));
  const controls = el('div', 'controls');
  const turnLabel = el('div', 'turn-label', 'Turn ' + Game.turn + ' · ' + (Game.phase === 'player' ? 'Your turn' : 'Oracle thinking…'));
  const endBtn = el('button', 'btn btn-end', 'End turn  ⏎');
  endBtn.id = 'end-turn-btn';
  endBtn.disabled = Game.phase !== 'player' || Game.aiBusy;
  const hint = el('div', 'hint-line', 'Click a card to play it · click your creature, then an enemy, to attack · keys 1–7, Enter, E, M');
  controls.append(turnLabel, endBtn, hint);
  const scoreBox = el('div', 'score-box');
  scoreBox.append(el('div', 'score-title', 'Score'));
  scoreBox.append(el('div', 'score-line', 'Damage dealt: ' + Game.player.damageDealt));
  scoreBox.append(el('div', 'score-line', 'Creatures defeated: ' + Game.player.kills));
  scoreBox.append(el('div', 'score-line', 'Your HP: ' + Math.max(0, Game.player.hp) + ' · Oracle HP: ' + Math.max(0, Game.oracle.hp)));
  mid.append(logBox, controls, scoreBox);

  const playerBoard = el('div', 'board-row board-player');
  if (Game.player.board.length === 0) playerBoard.append(el('div', 'board-empty', 'Your board is empty — play a creature!'));
  for (const c of Game.player.board) {
    const card = cardById(c.cardId);
    const node = cardElement(card, {
      uid: c.uid, atk: c.atk, hp: c.hp, justPlayed: c.justPlayed,
      selectable: Game.phase === 'player' && c.canAttack,
      selected: Game.selectedAttacker === c.uid,
      canAttack: Game.phase === 'player' && c.canAttack,
      targetable: isPlayerCreatureTargetable(c),
    });
    playerBoard.append(node);
  }

  const handLabel = el('div', 'hand-label', 'Your hand — click a card, then a target if it needs one');
  const hand = el('div', 'hand-row');
  Game.player.hand.forEach((id, i) => {
    const card = cardById(id);
    const affordable = card.cost <= Game.player.mana;
    const node = cardElement(card, {
      handIndex: i,
      selectable: Game.phase === 'player' && affordable,
      selected: Game.selectedHand === i || Game.targetingSpell === i,
      disabled: !affordable,
    });
    hand.append(node);
  });

  const bottom = el('div', 'table-bottom');
  bottom.append(heroBar(Game.player, true));

  table.append(top, oracleBoard, mid, playerBoard, handLabel, hand, bottom);
}

function isOracleCreatureTargetable(creature) {
  if (Game.phase !== 'player') return false;
  if (Game.selectedAttacker !== null) return true;
  if (Game.targetingSpell >= 0) {
    const card = cardById(Game.player.hand[Game.targetingSpell]);
    return card && card.target === 'any';
  }
  return false;
}

function isPlayerCreatureTargetable(creature) {
  if (Game.phase !== 'player') return false;
  if (Game.targetingSpell >= 0) {
    const card = cardById(Game.player.hand[Game.targetingSpell]);
    return card && card.target === 'ally-creature';
  }
  return false;
}

// --- Title screen -------------------------------------------------------------

function renderTitle() {
  const screen = $('#screen-title');
  screen.innerHTML = '';
  const wrap = el('div', 'title-wrap');
  wrap.append(el('div', 'title-kicker', 'A duel of the four courts'));
  const title = el('h1', 'title-main');
  title.innerHTML = 'EMBER <span class="amp">&amp;</span> TIDE';
  wrap.append(title);
  wrap.append(el('div', 'title-sub', 'An original card duel — summon creatures, cast spells, outwit the Tide Oracle.'));
  const legend = el('div', 'title-legend');
  for (const key of ['ember', 'tide', 'leaf', 'stone']) {
    const e = ELEMENTS[key];
    const chip = el('div', 'legend-chip');
    chip.style.setProperty('--elem', e.color);
    chip.append(el('span', 'legend-glyph', e.glyph), el('span', null, e.name));
    legend.append(chip);
  }
  wrap.append(legend);
  const rules = el('div', 'title-rules');
  rules.innerHTML =
    '<b>How to play:</b> You and the Oracle start at <b>30 HP</b>. Each turn you gain mana (1 more than last turn, up to 10) and draw a card. ' +
    'Play creatures onto your board, then attack with them — creatures strike the turn after they are summoned. ' +
    'Spells hit at once: bolts, healing, card draw, surges and quakes. Reduce the Oracle to 0 HP to win. ' +
    '<b>Mouse:</b> click a card, then its target. <b>Keys:</b> 1–7 select a card, Enter plays it, E ends your turn, M mutes.';
  wrap.append(rules);
  const startBtn = el('button', 'btn btn-start', '▶  Start the duel');
  startBtn.id = 'start-btn';
  wrap.append(startBtn);
  wrap.append(el('div', 'title-foot', 'First to 0 HP loses · 24-card decks · no two duels play alike'));
  screen.append(wrap);
}

// --- End screens ---------------------------------------------------------------

function renderEnd() {
  const screen = $('#screen-end');
  screen.innerHTML = '';
  const win = Game.screen === 'win';
  const wrap = el('div', 'end-wrap' + (win ? ' end-win' : ' end-loss'));
  wrap.append(el('div', 'end-glyph', win ? '👑' : '🌊'));
  wrap.append(el('h1', 'end-title', win ? 'VICTORY!' : 'DEFEAT'));
  wrap.append(el('div', 'end-sub', win
    ? 'The Tide Oracle yields. The four courts are yours, Ember Warden.'
    : 'The tide takes you this time, Ember Warden. The Oracle remains.'));
  const stats = el('div', 'end-stats');
  const s = Game.endStats || { turns: 0, damageDealt: 0, kills: 0, hpLeft: 0 };
  stats.append(el('div', 'end-stat', 'Turns played: ' + s.turns));
  stats.append(el('div', 'end-stat', 'Damage dealt: ' + s.damageDealt));
  stats.append(el('div', 'end-stat', 'Creatures defeated: ' + s.kills));
  stats.append(el('div', 'end-stat', 'Health remaining: ' + s.hpLeft + ' / ' + MAX_HP));
  wrap.append(stats);
  const againBtn = el('button', 'btn btn-start', '↻  Duel again');
  againBtn.id = 'again-btn';
  wrap.append(againBtn);
  wrap.append(el('div', 'title-foot', 'Press Enter or click to play again'));
  screen.append(wrap);
  if (win) launchConfetti();
}

// --- Flourishes -----------------------------------------------------------------

function floatText(text, x, y, cls) {
  const layer = $('#fx-layer');
  if (!layer) return;
  const n = el('div', 'float-text ' + (cls || ''), text);
  n.style.left = x + 'px';
  n.style.top = y + 'px';
  layer.append(n);
  setTimeout(() => n.remove(), 1400);
}

function shakeTable() {
  const table = $('#screen-game');
  if (!table) return;
  table.classList.remove('shake');
  void table.offsetWidth;
  table.classList.add('shake');
}

function launchConfetti() {
  const layer = $('#fx-layer');
  if (!layer) return;
  const colors = ['#e5484d', '#2f7fe0', '#3da35d', '#c98a2b', '#ffd166', '#f4f1ea'];
  for (let i = 0; i < 90; i++) {
    const piece = el('div', 'confetti');
    piece.style.left = Math.random() * 100 + 'vw';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = (Math.random() * 1.2) + 's';
    piece.style.animationDuration = (2.2 + Math.random() * 1.8) + 's';
    piece.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';
    layer.append(piece);
    setTimeout(() => piece.remove(), 5000);
  }
}

function showBanner(text) {
  const banner = $('#banner');
  if (!banner) return;
  banner.textContent = text;
  banner.classList.remove('show');
  void banner.offsetWidth;
  banner.classList.add('show');
}

// --- Master render ---------------------------------------------------------------

function renderAll() {
  const title = $('#screen-title');
  const game = $('#screen-game');
  const end = $('#screen-end');
  title.classList.toggle('hidden', Game.screen !== 'title');
  game.classList.toggle('hidden', Game.screen !== 'game');
  end.classList.toggle('hidden', Game.screen !== 'win' && Game.screen !== 'loss');
  if (Game.screen === 'title') renderTitle();
  else if (Game.screen === 'game') renderTable();
  else renderEnd();
}
