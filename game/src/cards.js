// Ember & Tide — card pool and deck builders.
// Every card is original: our own names, elements and flavour text.
// Four elements, each told apart by colour AND shape (never text alone):
//   Ember ▲ red, Tide ● blue, Leaf ◆ green, Stone ■ amber.

const ELEMENTS = {
  ember: { name: 'Ember', glyph: '▲', color: '#e5484d', dark: '#8f1d22', light: '#ffd9d6' },
  tide:  { name: 'Tide',  glyph: '●', color: '#2f7fe0', dark: '#144a8f', light: '#d3e7ff' },
  leaf:  { name: 'Leaf',  glyph: '◆', color: '#3da35d', dark: '#1c5c33', light: '#d6f2dd' },
  stone: { name: 'Stone', glyph: '■', color: '#c98a2b', dark: '#7a5210', light: '#ffeecf' },
};

// kind: 'creature' stays on the board and attacks; 'spell' resolves at once.
// target: 'none' | 'any' (enemy creature or hero) | 'ally-creature' | 'enemy-creature'
const CARD_POOL = [
  // ---- Ember creatures ----
  { id: 'spark-imp',    name: 'Spark Imp',     element: 'ember', kind: 'creature', cost: 1, atk: 2, hp: 1, text: 'A flicker with a temper.' },
  { id: 'ash-hound',    name: 'Ash Hound',     element: 'ember', kind: 'creature', cost: 2, atk: 3, hp: 2, text: 'It hunts by the smell of smoke.' },
  { id: 'cinder-drake', name: 'Cinder Drake',  element: 'ember', kind: 'creature', cost: 4, atk: 5, hp: 4, text: 'Its wings leave embers behind.' },
  { id: 'ember-warden', name: 'Ember Warden',  element: 'ember', kind: 'creature', cost: 6, atk: 7, hp: 6, text: 'The last flame of a fallen court.' },
  // ---- Tide creatures ----
  { id: 'tide-sprite',  name: 'Tide Sprite',   element: 'tide',  kind: 'creature', cost: 1, atk: 1, hp: 2, text: 'Small, quick, everywhere at once.' },
  { id: 'current-eel',  name: 'Current Eel',   element: 'tide',  kind: 'creature', cost: 2, atk: 2, hp: 3, text: 'You never see it coming. Twice.' },
  { id: 'mist-leviathan', name: 'Mist Leviathan', element: 'tide', kind: 'creature', cost: 5, atk: 6, hp: 5, text: 'The fog grew teeth.' },
  // ---- Leaf creatures ----
  { id: 'thorn-sprout', name: 'Thorn Sprout',  element: 'leaf',  kind: 'creature', cost: 1, atk: 1, hp: 3, text: 'Prickly, patient, rooted.' },
  { id: 'briar-wolf',   name: 'Briar Wolf',    element: 'leaf',  kind: 'creature', cost: 3, atk: 3, hp: 4, text: 'It howls and the forest answers.' },
  { id: 'elder-grove',  name: 'Elder Grove',   element: 'leaf',  kind: 'creature', cost: 5, atk: 4, hp: 7, text: 'Older than the duel. Older than you.' },
  // ---- Stone creatures ----
  { id: 'pebble-golem', name: 'Pebble Golem',  element: 'stone', kind: 'creature', cost: 2, atk: 1, hp: 4, text: 'Slow, hard, patient.' },
  { id: 'bulwark-titan', name: 'Bulwark Titan', element: 'stone', kind: 'creature', cost: 4, atk: 3, hp: 6, text: 'A mountain that learned to walk.' },
  // ---- Spells ----
  { id: 'ember-bolt',   name: 'Ember Bolt',    element: 'ember', kind: 'spell', cost: 2, target: 'any', text: 'Deal 3 damage to any target.' },
  { id: 'spring-mend',  name: 'Spring Mend',   element: 'leaf',  kind: 'spell', cost: 2, target: 'none', text: 'Restore 5 health to your hero.' },
  { id: 'tide-insight', name: 'Tide Insight',  element: 'tide',  kind: 'spell', cost: 2, target: 'none', text: 'Draw 2 cards.' },
  { id: 'stone-surge',  name: 'Stone Surge',   element: 'stone', kind: 'spell', cost: 2, target: 'ally-creature', text: 'Give a friendly creature +2/+2.' },
  { id: 'quake-call',   name: 'Quake Call',    element: 'stone', kind: 'spell', cost: 3, target: 'none', text: 'Deal 2 damage to all enemy creatures.' },
];

const CARD_BY_ID = {};
for (const card of CARD_POOL) CARD_BY_ID[card.id] = card;

function cardById(id) {
  return CARD_BY_ID[id];
}

// The player's 24-card deck: a balanced mix of all four courts.
function buildPlayerDeck() {
  return [
    'spark-imp', 'spark-imp', 'ash-hound', 'ash-hound', 'cinder-drake', 'ember-warden',
    'tide-sprite', 'tide-sprite', 'current-eel', 'mist-leviathan',
    'thorn-sprout', 'thorn-sprout', 'briar-wolf', 'elder-grove',
    'pebble-golem', 'pebble-golem', 'bulwark-titan',
    'ember-bolt', 'ember-bolt', 'spring-mend', 'spring-mend',
    'tide-insight', 'stone-surge', 'quake-call',
  ];
}

// The Tide Oracle's 24-card deck: heavier on Ember and Tide, lighter on healing.
function buildOracleDeck() {
  return [
    'spark-imp', 'spark-imp', 'ash-hound', 'ash-hound', 'cinder-drake', 'cinder-drake', 'ember-warden',
    'tide-sprite', 'tide-sprite', 'current-eel', 'current-eel', 'mist-leviathan',
    'thorn-sprout', 'briar-wolf', 'pebble-golem', 'bulwark-titan', 'bulwark-titan',
    'ember-bolt', 'ember-bolt', 'spring-mend',
    'tide-insight', 'tide-insight', 'stone-surge', 'quake-call',
  ];
}

// Fisher-Yates shuffle; rng defaults to Math.random so live games vary.
function shuffleDeck(deck, rng) {
  const rand = rng || Math.random;
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
