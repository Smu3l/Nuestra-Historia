export const GameState = {
  currentMap: 'casa',
  maxHP: 6,
  hp: 6,
  fragments: [],
  defeatedBosses: [],
  collectedLetters: [],
  visitedMaps: [],
  playerName: 'María José',
  partnerName: 'Samuel',

  reset() {
    this.currentMap = 'casa';
    this.maxHP = 6;
    this.hp = 6;
    this.fragments = [];
    this.defeatedBosses = [];
    this.collectedLetters = [];
    this.visitedMaps = [];
  },

  toSaveData() {
    return {
      currentMap: this.currentMap,
      maxHP: this.maxHP,
      hp: this.hp,
      fragments: [...this.fragments],
      defeatedBosses: [...this.defeatedBosses],
      collectedLetters: [...this.collectedLetters],
      visitedMaps: [...this.visitedMaps],
    };
  },

  loadSaveData(data) {
    if (!data) return;
    this.currentMap = data.currentMap || 'casa';
    this.maxHP = data.maxHP || 6;
    this.hp = data.hp || 6;
    this.fragments = data.fragments || [];
    this.defeatedBosses = data.defeatedBosses || [];
    this.collectedLetters = data.collectedLetters || [];
    this.visitedMaps = data.visitedMaps || [];
  },
};
