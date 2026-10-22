'use strict';

class PlayerStats {
  constructor() {
    this.level = 0;
    this.exp = 0;
    this.expToNext = 50;
    this.skillPoints = 0;

    this.str = 0;
    this.agi = 0;
    this.int = 0;
    this.vit = 0;
  }

  expForLevel(level) {
    return Math.max(10, Math.floor(45 * Math.pow(Math.max(1, level), 1.45)));
  }

  addExp(amount) {
    const mult = 1 + this.int * 0.05;
    this.exp += Math.floor(amount * mult);

    let leveled = 0;
    let safety = 0;
    while (this.exp >= this.expToNext && safety < 50) {
      this.exp -= this.expToNext;
      this.level++;
      this.skillPoints += 3;
      leveled++;
      this.expToNext = this.expForLevel(this.level);
      safety++;
    }
    return leveled;
  }

  spendPoint(stat) {
    if (this.skillPoints <= 0) return false;
    if (!['str', 'agi', 'int', 'vit'].includes(stat)) return false;
    this[stat]++;
    this.skillPoints--;
    return true;
  }

  get maxHp() { return 100 + this.vit * 10 + this.level * 5; }
  get damage() { return 4 + this.str * 2; }
  get speed() { return 225 + this.agi * 6; }
  get dashSpeed() { return 680 + this.agi * 12; }
  get attackRange() { return 105 + this.int * 3; }
}