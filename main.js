// Ember & Tide — bootstrap: shows the title screen, wires rendering and
// input, and honours ?shot=title|game|win|loss so the maker can capture
// each screen of the real game in a browser (used for the screenshots).

function scriptedMidGame() {
  newGame();
  const p = Game.player;
  const o = Game.oracle;
  // A fixed, readable mid-duel: no randomness, so screenshots are stable.
  p.hp = 24; o.hp = 19;
  p.maxMana = 6; p.mana = 4;
  o.maxMana = 5; o.mana = 2;
  Game.turn = 5;
  p.hand = ['ember-bolt', 'cinder-drake', 'spring-mend', 'pebble-golem', 'tide-insight'];
  o.hand = ['spark-imp', 'ash-hound', 'current-eel'];
  p.board = [
    Object.assign(makeCreature(cardById('ash-hound')), { canAttack: true, justPlayed: false }),
    Object.assign(makeCreature(cardById('briar-wolf')), { canAttack: true, justPlayed: false }),
    Object.assign(makeCreature(cardById('pebble-golem')), { canAttack: false, justPlayed: true }),
  ];
  o.board = [
    Object.assign(makeCreature(cardById('current-eel')), { canAttack: true, justPlayed: false }),
    Object.assign(makeCreature(cardById('mist-leviathan')), { canAttack: false, justPlayed: true }),
  ];
  p.damageDealt = 11;
  p.kills = 2;
  Game.log = [
    'Turn 5 — your mana refills to 6.',
    'The Tide Oracle summons Mist Leviathan (6/5).',
    'Your Briar Wolf strikes the Oracle for 3 damage.',
    'The Oracle hurls an Ember Bolt at you for 3 damage.',
    'You summon Pebble Golem (1/4).',
  ];
  Game.phase = 'player';
  notify();
}

function scriptedEnd(win) {
  newGame();
  Game.phase = 'over';
  Game.turn = 9;
  Game.player.damageDealt = win ? 31 : 18;
  Game.player.kills = win ? 5 : 3;
  Game.player.hp = win ? 12 : 0;
  Game.oracle.hp = win ? 0 : 14;
  Game.winner = win ? 'player' : 'oracle';
  Game.screen = win ? 'win' : 'loss';
  Game.endStats = {
    turns: 9,
    damageDealt: Game.player.damageDealt,
    kills: Game.player.kills,
    hpLeft: Math.max(0, Game.player.hp),
  };
  Game.log = [win ? 'Victory! The Tide Oracle yields.' : 'Defeat. The tide takes you.'];
  notify();
}

function boot() {
  Game.onChange = renderAll;
  bindInput();
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot === 'game') scriptedMidGame();
  else if (shot === 'win') scriptedEnd(true);
  else if (shot === 'loss') scriptedEnd(false);
  else {
    Game.screen = 'title';
    renderAll();
  }
  // Debug handle for automated play-testing (not part of the game UI).
  window.__emberTide = { Game, newGame, playCard, attack, endPlayerTurn };
}

document.addEventListener('DOMContentLoaded', boot);
