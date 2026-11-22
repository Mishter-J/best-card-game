// Ember & Tide — the Tide Oracle's brain.
// A readable heuristic opponent: it plays what it can afford, answers the
// biggest threat first, heals when hurt, and goes for the face when lethal.
// Delays between actions let the player follow what it does.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function oracleThreatScore(creature) {
  return creature.atk * 2 + creature.hp;
}

async function OracleTakeTurn() {
  const me = Game.oracle;
  const foe = Game.player;
  await sleep(650);
  if (Game.screen !== 'game' || Game.phase !== 'ai') { Game.aiBusy = false; return; }

  // 1. Play cards while affordable: creatures first, then spells.
  let acted = true;
  let guard = 0;
  while (acted && guard < 12) {
    guard += 1;
    acted = false;
    if (Game.screen !== 'game') break;
    // Creatures: cheapest affordable that fits the board.
    const creatureIdx = me.hand.findIndex((id) => {
      const c = cardById(id);
      return c.kind === 'creature' && c.cost <= me.mana && me.board.length < MAX_BOARD;
    });
    if (creatureIdx >= 0) {
      playCard(me, creatureIdx, null);
      await sleep(550);
      acted = true;
      continue;
    }
    // Ember Bolt: lethal first, else the biggest player creature.
    const boltIdx = me.hand.findIndex((id) => id === 'ember-bolt' && cardById(id).cost <= me.mana);
    if (boltIdx >= 0) {
      if (foe.hp <= 3) {
        playCard(me, boltIdx, 'hero');
      } else {
        const biggest = foe.board.slice().sort((a, b) => oracleThreatScore(b) - oracleThreatScore(a))[0];
        if (biggest && biggest.hp <= 3) playCard(me, boltIdx, biggest.uid);
        else if (foe.board.length === 0) playCard(me, boltIdx, 'hero');
        else { break; }
      }
      await sleep(550);
      acted = true;
      continue;
    }
    // Spring Mend when hurt.
    const mendIdx = me.hand.findIndex((id) => id === 'spring-mend' && cardById(id).cost <= me.mana);
    if (mendIdx >= 0 && me.hp <= 18) {
      playCard(me, mendIdx, null);
      await sleep(550);
      acted = true;
      continue;
    }
    // Quake Call when the player has a wide board.
    const quakeIdx = me.hand.findIndex((id) => id === 'quake-call' && cardById(id).cost <= me.mana);
    if (quakeIdx >= 0 && foe.board.length >= 2) {
      playCard(me, quakeIdx, null);
      await sleep(550);
      acted = true;
      continue;
    }
    // Stone Surge on its strongest creature.
    const surgeIdx = me.hand.findIndex((id) => id === 'stone-surge' && cardById(id).cost <= me.mana);
    if (surgeIdx >= 0 && me.board.length > 0) {
      const best = me.board.slice().sort((a, b) => oracleThreatScore(b) - oracleThreatScore(a))[0];
      playCard(me, surgeIdx, best.uid);
      await sleep(550);
      acted = true;
      continue;
    }
    // Tide Insight when it can still draw value.
    const drawIdx = me.hand.findIndex((id) => id === 'tide-insight' && cardById(id).cost <= me.mana);
    if (drawIdx >= 0 && me.hand.length <= 5) {
      playCard(me, drawIdx, null);
      await sleep(550);
      acted = true;
    }
  }

  // 2. Attack with every ready creature.
  if (Game.screen === 'game') {
    for (const creature of me.board.slice()) {
      if (Game.screen !== 'game') break;
      if (!creature.canAttack) continue;
      await sleep(500);
      // Lethal: go face. Otherwise trade up: kill a player creature only
      // when the Oracle's creature survives the exchange.
      const lethal = me.board.reduce((sum, c) => sum + (c.canAttack ? c.atk : 0), 0) >= foe.hp;
      let target = 'hero';
      if (!lethal) {
        const victim = foe.board
          .filter((pc) => pc.atk < creature.hp && creature.atk >= pc.hp)
          .sort((a, b) => oracleThreatScore(b) - oracleThreatScore(a))[0];
        if (victim) target = victim.uid;
      }
      oracleAttack(creature.uid, target);
    }
  }

  await sleep(500);
  if (Game.screen !== 'game') { Game.aiBusy = false; return; }
  Game.aiBusy = false;
  Game.selectedHand = -1;
  Game.selectedAttacker = null;
  Game.targetingSpell = -1;
  startPlayerTurn();
}

// The Oracle's attack, mirroring the player's attack() but for its side.
function oracleAttack(attackerUid, target) {
  const attacker = Game.oracle.board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return false;
  const foe = Game.player;
  attacker.canAttack = false;
  SoundBank.attack();
  if (target === 'hero') {
    logEvent(attacker.name + ' strikes you for ' + attacker.atk + ' damage.');
    damageHero(foe, attacker.atk, Game.oracle);
  } else {
    const defender = foe.board.find((c) => c.uid === target);
    if (!defender) return false;
    logEvent(attacker.name + ' attacks your ' + defender.name + ' (' + attacker.atk + ' vs ' + defender.atk + ').');
    damageCreature(attacker.atk, defender, Game.oracle);
    damageCreature(defender.atk, attacker, foe);
    removeDead(Game.player);
    removeDead(Game.oracle);
  }
  checkEnd();
  notify();
  return true;
}
