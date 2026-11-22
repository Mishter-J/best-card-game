// Ember & Tide — mouse and keyboard input.
// Click flow: hand card → select (click again to play, or pick a target for
// targeted spells); own ready creature → select attacker; enemy creature or
// hero → resolve the attack or the spell. Esc / right-click cancels.

function clearSelection() {
  Game.selectedHand = -1;
  Game.selectedAttacker = null;
  Game.targetingSpell = -1;
  notify();
}

function handleHandCardClick(handIndex) {
  if (Game.phase !== 'player' || Game.aiBusy) return;
  const card = cardById(Game.player.hand[handIndex]);
  if (!card) return;
  if (!canPlayCard(Game.player, handIndex)) {
    SoundBank.click();
    if (card.kind === 'creature' && Game.player.board.length >= MAX_BOARD) {
      logEvent('Your board is full — no room for ' + card.name + '.');
    } else {
      logEvent('Not enough mana for ' + card.name + ' (' + card.cost + ').');
    }
    notify();
    return;
  }
  if (Game.targetingSpell === handIndex) { clearSelection(); return; }
  if (card.kind === 'spell' && card.target !== 'none') {
    Game.targetingSpell = handIndex;
    Game.selectedHand = handIndex;
    Game.selectedAttacker = null;
    SoundBank.select();
    logEvent('Choose a target for ' + card.name + '.');
    notify();
    return;
  }
  if (Game.selectedHand === handIndex) {
    // Second click plays it.
    playCard(Game.player, handIndex, null);
    clearSelection();
    return;
  }
  Game.selectedHand = handIndex;
  Game.selectedAttacker = null;
  Game.targetingSpell = -1;
  SoundBank.select();
  notify();
}

function handleBoardCardClick(uid, isPlayerSide) {
  if (Game.phase !== 'player' || Game.aiBusy) return;
  const creature = findCreature(uid);
  if (!creature) return;
  // A targeted spell resolves on its target first.
  if (Game.targetingSpell >= 0) {
    const card = cardById(Game.player.hand[Game.targetingSpell]);
    if (!card) { clearSelection(); return; }
    const valid = (card.target === 'any' && !isPlayerSide)
      || (card.target === 'ally-creature' && isPlayerSide);
    if (valid) {
      const idx = Game.targetingSpell;
      clearSelection();
      playCard(Game.player, idx, uid);
    } else {
      logEvent(card.name + ' cannot target that.');
      notify();
    }
    return;
  }
  // An attacker is chosen: an enemy creature is its target.
  if (Game.selectedAttacker !== null && !isPlayerSide) {
    const uid0 = Game.selectedAttacker;
    clearSelection();
    attack(uid0, uid);
    return;
  }
  // Own creature: select it as the attacker when it can attack.
  if (isPlayerSide) {
    if (Game.selectedAttacker === uid) { clearSelection(); return; }
    if (creature.canAttack) {
      Game.selectedAttacker = uid;
      Game.selectedHand = -1;
      SoundBank.select();
      logEvent(creature.name + ' is ready — choose an enemy to attack.');
      notify();
    } else {
      SoundBank.click();
      logEvent(creature.name + ' cannot attack yet (summoning sickness).');
      notify();
    }
  }
}

function handleHeroClick(isPlayerSide) {
  if (Game.phase !== 'player' || Game.aiBusy) return;
  if (Game.targetingSpell >= 0) {
    const card = cardById(Game.player.hand[Game.targetingSpell]);
    if (card && card.target === 'any' && !isPlayerSide) {
      const idx = Game.targetingSpell;
      clearSelection();
      playCard(Game.player, idx, 'hero');
    }
    return;
  }
  if (Game.selectedAttacker !== null && !isPlayerSide) {
    const uid0 = Game.selectedAttacker;
    clearSelection();
    attack(uid0, 'hero');
  }
}

function bindInput() {
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest('#start-btn')) { SoundBank.click(); newGame(); return; }
    if (t.closest('#again-btn')) { SoundBank.click(); newGame(); return; }
    if (t.closest('#end-turn-btn')) { SoundBank.click(); endPlayerTurn(); return; }
    const handCard = t.closest('.hand-row .card');
    if (handCard && handCard.dataset.handIndex !== undefined) {
      handleHandCardClick(Number(handCard.dataset.handIndex));
      return;
    }
    const boardCard = t.closest('.board-row .card');
    if (boardCard && boardCard.dataset.uid !== undefined) {
      const isPlayerSide = Boolean(boardCard.closest('.board-player'));
      handleBoardCardClick(Number(boardCard.dataset.uid), isPlayerSide);
      return;
    }
    const hero = t.closest('.hero-bar');
    if (hero) {
      handleHeroClick(hero.dataset.hero === 'player');
      return;
    }
  });

  document.addEventListener('contextmenu', (ev) => {
    if (Game.screen === 'game') { ev.preventDefault(); clearSelection(); }
  });

  document.addEventListener('keydown', (ev) => {
    const key = ev.key;
    if (key === 'm' || key === 'M') {
      const muted = SoundBank.toggleMute();
      logEvent(muted ? 'Sound muted.' : 'Sound on.');
      notify();
      return;
    }
    if (Game.screen === 'title' && (key === 'Enter' || key === ' ')) {
      ev.preventDefault();
      newGame();
      return;
    }
    if ((Game.screen === 'win' || Game.screen === 'loss') && (key === 'Enter' || key === 'r' || key === 'R')) {
      ev.preventDefault();
      newGame();
      return;
    }
    if (Game.screen !== 'game') return;
    if (key === 'Escape') { clearSelection(); return; }
    if ((key === 'e' || key === 'E' || key === ' ') && Game.phase === 'player') {
      ev.preventDefault();
      endPlayerTurn();
      return;
    }
    if (key >= '1' && key <= '7') {
      const idx = Number(key) - 1;
      if (idx < Game.player.hand.length) handleHandCardClick(idx);
      return;
    }
    if (key === 'Enter') {
      if (Game.selectedHand >= 0) {
        const card = cardById(Game.player.hand[Game.selectedHand]);
        if (card && (card.kind === 'creature' || card.target === 'none')) {
          const idx = Game.selectedHand;
          clearSelection();
          playCard(Game.player, idx, null);
        }
      } else if (Game.phase === 'player') {
        endPlayerTurn();
      }
    }
  });
}
