// Ember & Tide — game rules and state machine.
// One duel: you (the Ember Warden) against the Tide Oracle.
// First to reduce the other hero to 0 health wins. Mana grows 1 per turn
// up to 10 and refills each turn; creatures suffer summoning sickness.

const MAX_HP = 30;
const MAX_HAND = 7;
const MAX_BOARD = 4;
const START_HAND = 4;

let uidCounter = 1;

function makeHero(name, title, deckIds) {
  return {
    name, title,
    hp: MAX_HP, maxHp: MAX_HP,
    mana: 0, maxMana: 0,
    deck: shuffleDeck(deckIds),
    hand: [],           // card ids
    board: [],          // creature instances
    fatigue: 0,         // damage taken from drawing out of an empty deck
    damageDealt: 0,     // running score: damage this hero has dealt
    kills: 0,           // running score: enemy creatures destroyed
  };
}

function makeCreature(card) {
  return {
    uid: uidCounter++,
    cardId: card.id,
    name: card.name,
    element: card.element,
    atk: card.atk,
    hp: card.hp,
    maxHp: card.hp,
    canAttack: false,   // summoning sickness
    justPlayed: true,
  };
}

// The single mutable game state. render.js reads it; input.js mutates it
// only through the functions below; ai.js drives the Oracle's turns.
const Game = {
  screen: 'title',      // 'title' | 'game' | 'win' | 'loss'
  phase: 'idle',        // 'player' | 'ai' | 'over'
  turn: 0,
  player: null,
  oracle: null,
  log: [],
  winner: null,
  endStats: null,
  selectedHand: -1,     // index into player hand, -1 = none
  selectedAttacker: null, // uid of a player creature chosen to attack
  targetingSpell: -1,   // index into player hand of a spell awaiting a target
  aiBusy: false,
  onChange: null,       // render hook, set by main.js
};

function sideOf(hero) { return hero === Game.player ? 'player' : 'oracle'; }
function otherOf(hero) { return hero === Game.player ? Game.oracle : Game.player; }

function logEvent(text) {
  Game.log.unshift(text);
  if (Game.log.length > 7) Game.log.length = 7;
}

function notify() {
  if (typeof Game.onChange === 'function') Game.onChange();
}

function newGame() {
  uidCounter = 1;
  Game.screen = 'game';
  Game.phase = 'player';
  Game.turn = 1;
  Game.winner = null;
  Game.endStats = null;
  Game.log = [];
  Game.selectedHand = -1;
  Game.selectedAttacker = null;
  Game.targetingSpell = -1;
  Game.aiBusy = false;
  Game.player = makeHero('Ember Warden', 'You', buildPlayerDeck());
  Game.oracle = makeHero('Tide Oracle', 'Rival', buildOracleDeck());
  for (let i = 0; i < START_HAND; i++) {
    drawCard(Game.player, true);
    drawCard(Game.oracle, true);
  }
  Game.player.maxMana = 1;
  Game.player.mana = 1;
  logEvent('The duel begins. Your turn — mana 1.');
  SoundBank.turn();
  notify();
}

function drawCard(hero, quiet) {
  if (hero.deck.length === 0) {
    hero.fatigue += 1;
    hero.hp -= hero.fatigue;
    logEvent(hero.name + ' draws from an empty deck and takes ' + hero.fatigue + ' fatigue damage.');
    SoundBank.damage();
    checkEnd();
    return null;
  }
  const id = hero.deck.pop();
  if (hero.hand.length >= MAX_HAND) {
    logEvent(hero.name + ' draws ' + cardById(id).name + ' — hand is full, it burns away.');
    return null;
  }
  hero.hand.push(id);
  if (!quiet) SoundBank.draw();
  return id;
}

function startPlayerTurn() {
  Game.phase = 'player';
  Game.turn += 1;
  const p = Game.player;
  p.maxMana = Math.min(10, p.maxMana + 1);
  p.mana = p.maxMana;
  for (const c of p.board) { c.canAttack = true; c.justPlayed = false; }
  drawCard(p);
  logEvent('Turn ' + Game.turn + ' — your mana refills to ' + p.mana + '.');
  SoundBank.turn();
  notify();
}

function startOracleTurn() {
  Game.phase = 'ai';
  Game.aiBusy = true;
  const o = Game.oracle;
  o.maxMana = Math.min(10, o.maxMana + 1);
  o.mana = o.maxMana;
  for (const c of o.board) { c.canAttack = true; c.justPlayed = false; }
  drawCard(o);
  logEvent('Turn ' + Game.turn + ' — the Tide Oracle stirs.');
  notify();
  OracleTakeTurn();
}

function endPlayerTurn() {
  if (Game.phase !== 'player' || Game.aiBusy) return;
  Game.selectedHand = -1;
  Game.selectedAttacker = null;
  Game.targetingSpell = -1;
  startOracleTurn();
}

function removeDead(hero) {
  const before = hero.board.length;
  hero.board = hero.board.filter((c) => c.hp > 0);
  return before - hero.board.length;
}

function damageCreature(attacker, creature, sourceHero) {
  creature.hp -= attacker;
  if (creature.hp <= 0) {
    const owner = Game.player.board.includes(creature) ? Game.player : Game.oracle;
    const foe = otherOf(owner);
    foe.kills += 1;
    logEvent(creature.name + ' is destroyed.');
  }
}

function damageHero(hero, amount, sourceHero) {
  hero.hp = Math.max(0, hero.hp - amount);
  if (sourceHero) sourceHero.damageDealt += amount;
  SoundBank.damage();
  checkEnd();
}

// --- Playing cards -------------------------------------------------------

function canPlayCard(hero, handIndex) {
  if (handIndex < 0 || handIndex >= hero.hand.length) return false;
  const card = cardById(hero.hand[handIndex]);
  if (!card) return false;
  if (card.cost > hero.mana) return false;
  if (card.kind === 'creature' && hero.board.length >= MAX_BOARD) return false;
  return true;
}

// target: 'hero' | creature uid | null (for no-target spells)
function playCard(hero, handIndex, target) {
  if (!canPlayCard(hero, handIndex)) return false;
  const card = cardById(hero.hand[handIndex]);
  hero.mana -= card.cost;
  hero.hand.splice(handIndex, 1);

  if (card.kind === 'creature') {
    const creature = makeCreature(card);
    hero.board.push(creature);
    logEvent(hero.name + ' summons ' + card.name + ' (' + card.atk + '/' + card.hp + ').');
    SoundBank.playCard();
  } else {
    resolveSpell(hero, card, target);
  }
  checkEnd();
  notify();
  return true;
}

function findCreature(uid) {
  return Game.player.board.concat(Game.oracle.board).find((c) => c.uid === uid) || null;
}

function resolveSpell(hero, card, target) {
  const foe = otherOf(hero);
  SoundBank.playCard();
  if (card.id === 'ember-bolt') {
    if (target === 'hero') {
      logEvent(hero.name + ' hurls an Ember Bolt at ' + foe.name + ' for 3 damage.');
      damageHero(foe, 3, hero);
    } else {
      const creature = findCreature(target);
      if (!creature) return;
      logEvent(hero.name + ' hurls an Ember Bolt at ' + creature.name + ' for 3 damage.');
      damageCreature(3, creature, hero);
      removeDead(Game.player);
      removeDead(Game.oracle);
    }
  } else if (card.id === 'spring-mend') {
    const healed = Math.min(5, hero.maxHp - hero.hp);
    hero.hp += healed;
    logEvent(hero.name + ' mends for ' + healed + ' health.');
    SoundBank.heal();
  } else if (card.id === 'tide-insight') {
    logEvent(hero.name + ' peers into the tide and draws 2 cards.');
    drawCard(hero);
    drawCard(hero);
  } else if (card.id === 'stone-surge') {
    const creature = findCreature(target);
    if (!creature) return;
    creature.atk += 2;
    creature.hp += 2;
    creature.maxHp += 2;
    logEvent(hero.name + ' surges ' + creature.name + ' to ' + creature.atk + '/' + creature.hp + '.');
  } else if (card.id === 'quake-call') {
    logEvent(hero.name + ' calls a quake — 2 damage to all enemy creatures.');
    for (const c of foe.board.slice()) damageCreature(2, c, hero);
    removeDead(foe);
  }
}

// --- Combat ---------------------------------------------------------------

function canAttackWith(creature) {
  return Game.phase === 'player' && creature.canAttack;
}

function attack(attackerUid, target) {
  if (Game.phase !== 'player') return false;
  const attacker = Game.player.board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return false;
  const foe = Game.oracle;
  attacker.canAttack = false;
  SoundBank.attack();
  if (target === 'hero') {
    logEvent(attacker.name + ' strikes ' + foe.name + ' for ' + attacker.atk + ' damage.');
    damageHero(foe, attacker.atk, Game.player);
  } else {
    const defender = foe.board.find((c) => c.uid === target);
    if (!defender) return false;
    logEvent(attacker.name + ' attacks ' + defender.name + ' (' + attacker.atk + ' vs ' + defender.atk + ').');
    damageCreature(attacker.atk, defender, Game.player);
    damageCreature(defender.atk, attacker, foe);
    removeDead(Game.player);
    removeDead(Game.oracle);
  }
  checkEnd();
  notify();
  return true;
}

// --- End of duel ----------------------------------------------------------

function checkEnd() {
  if (Game.screen !== 'game') return;
  if (Game.oracle.hp <= 0 || Game.player.hp <= 0) {
    Game.phase = 'over';
    Game.winner = Game.oracle.hp <= 0 && Game.player.hp > 0 ? 'player' : 'oracle';
    Game.screen = Game.winner === 'player' ? 'win' : 'loss';
    Game.endStats = {
      turns: Game.turn,
      damageDealt: Game.player.damageDealt,
      kills: Game.player.kills,
      hpLeft: Math.max(0, Game.player.hp),
    };
    if (Game.winner === 'player') SoundBank.win();
    else SoundBank.lose();
    logEvent(Game.winner === 'player' ? 'Victory! The Tide Oracle yields.' : 'Defeat. The tide takes you.');
    notify();
  }
}
