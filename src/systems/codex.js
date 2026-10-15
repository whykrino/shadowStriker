'use strict';

const CODEX_DATA = {
  monsters: [
    {
      id: 'slime', name: 'Слизень', icon: '🟦',
      hp: 130, damage: 13, speed: 65, exp: 6,
      behavior: 'Простой преследователь',
      weakness: 'Медленный. Легко обойти.',
      zone: 'Луга слизней',
    },
    {
      id: 'tank', name: 'Голем', icon: '🟫',
      hp: 520, damage: 24, speed: 45, exp: 14,
      behavior: 'Танк. Бронирован спереди.',
      weakness: 'Уязвим со спины. Медленный.',
      zone: 'Средние и красные зоны',
    },
    {
      id: 'ranger', name: 'Стрелок', icon: '🟪',
      hp: 220, damage: 16, speed: 90, exp: 16,
      behavior: 'Держит дистанцию, стреляет веером из 3 снарядов.',
      weakness: 'Слаб в ближнем бою.',
      zone: 'Средние зоны',
    },
    {
      id: 'assassin', name: 'Убийца', icon: '⚫',
      hp: 290, damage: 40, speed: 130, exp: 26,
      behavior: 'Невидимый. Атакует со спины.',
      weakness: 'Уязвим, когда виден.',
      zone: 'Красные зоны',
    },
    {
      id: 'summoner', name: 'Призыватель', icon: '🟣',
      hp: 420, damage: 11, speed: 70, exp: 30,
      behavior: 'Призывает слизней каждые 6 секунд.',
      weakness: 'Низкий урон. Убивай первым.',
      zone: 'Средние зоны',
    },
    {
      id: 'kamikaze', name: 'Камикадзе', icon: '🔴',
      hp: 32, damage: 60, speed: 220, exp: 20,
      behavior: 'Очень быстрый. Огромный урон.',
      weakness: 'Убивается одним ударом.',
      zone: 'Везде',
    },
    {
      id: 'boss', name: 'Тень (БОСС)', icon: '💀',
      hp: 3200, damage: 70, speed: 160, exp: 300,
      behavior: '3 фазы. Телепорт, кольцевой залп, хил.',
      weakness: 'Уязвим после рывка.',
      zone: 'Красные зоны, каждые 10 уровней',
    },
  ],

  abilities: [
    { id: 'dash', name: 'РЫВОК', desc: 'SHIFT - стремительный рывок', unlock: 2, icon: '»' },
    { id: 'charge', name: 'ЗАРЯЖЕННЫЙ УДАР', desc: 'Удерживай ЛКМ - мощная атака', unlock: 3, icon: '⚡' },
    { id: 'spin', name: 'ВИХРЬ', desc: 'ПКМ - круговой удар', unlock: 4, icon: '◎' },
    { id: 'heal', name: 'РЕГЕНЕРАЦИЯ', desc: '+3 HP/сек вне боя', unlock: 6, icon: '✚' },
    { id: 'berserk', name: 'ЯРОСТЬ', desc: '+25% урона при HP ниже 30%', unlock: 8, icon: '⚔' },
    { id: 'phoenix', name: 'ФЕНИКС', desc: 'Воскрешение с 50% HP', unlock: 12, icon: '✦' },
  ],

  zones: [
    { id: 'safe', name: 'Безопасная зона', color: '#4a9eff',
      desc: 'Мобы 1 тира. Рекомендуется с 1 уровня.' },
    { id: 'mid', name: 'Средняя зона', color: '#b070ff',
      desc: 'Мобы 2 тира. Требует рывок и прокачку.' },
    { id: 'hard', name: 'Опасная зона', color: '#ff3355',
      desc: 'Мобы 3-4 тира. Смертельно без талантов.' },
  ],
};