import { GameState } from '../data/GameState.js';

export class SaveSystem {
  constructor() {
    this.isElectron = typeof window !== 'undefined' && window.saveAPI;
  }

  async save() {
    const data = GameState.toSaveData();
    data.timestamp = Date.now();
    data.version = '1.1.3';

    if (this.isElectron) {
      try {
        const result = await window.saveAPI.save(data);
        return result.success;
      } catch (e) {
        console.error('Save failed:', e);
        return false;
      }
    } else {
      try {
        localStorage.setItem('fragmentos_save', JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('Save failed:', e);
        return false;
      }
    }
  }

  async load() {
    if (this.isElectron) {
      try {
        const data = await window.saveAPI.load();
        if (data) {
          GameState.loadSaveData(data);
          return true;
        }
        return false;
      } catch (e) {
        console.error('Load failed:', e);
        return false;
      }
    } else {
      try {
        const raw = localStorage.getItem('fragmentos_save');
        if (raw) {
          const data = JSON.parse(raw);
          GameState.loadSaveData(data);
          return true;
        }
        return false;
      } catch (e) {
        console.error('Load failed:', e);
        return false;
      }
    }
  }

  async hasSave() {
    if (this.isElectron) {
      try {
        return await window.saveAPI.hasSave();
      } catch (e) {
        return false;
      }
    } else {
      return !!localStorage.getItem('fragmentos_save');
    }
  }
}
