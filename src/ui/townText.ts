import { townEffects, type BuildingId, type TownLevels } from '../data/town';

/**
 * Beschreibt in einer Zeile, was ein Gebäude auf Stufe `level` bringt – fürs Fenster "Dorfausbau".
 * Die Zahlen kommen aus src/data/town.ts; `levels` sind die aktuellen Stufen aller Gebäude.
 */
export function describeBuilding(id: BuildingId, level: number, levels: TownLevels): string {
  // So wäre das Dorf, wenn dieses Gebäude auf `level` stünde.
  const effects = townEffects({ ...levels, [id]: level });
  switch (id) {
    case 'rathaus':
      return `Alle anderen Gebäude bis Stufe ${level}`;
    case 'kontor': {
      const parts = [`${effects.stockSize} Regalplätze`, `${effects.stockRareShare} % seltene Ware`];
      if (effects.stockEpicShare > 0) parts.push(`${effects.stockEpicShare} % epische`);
      parts.push(`neue Ware alle ${effects.restockMs / 60000} min`);
      if (effects.instantRestock) parts.push('Knopf „Neue Ware sofort“');
      return parts.join(' · ');
    }
    case 'alchemistin': {
      const parts = [`Trank heilt ${Math.round(effects.potionHealFraction * 100)} %`, `${effects.potionCooldownMs / 1000} s Abklingzeit`];
      if (effects.potionDiscount > 0) parts.push(`${Math.round(effects.potionDiscount * 100)} % billiger`);
      return parts.join(' · ');
    }
    case 'gasthaus': {
      const parts = [`Rasten: voll in ${effects.restingFullSeconds} s`];
      if (effects.townFullSeconds !== null) parts.push(`im Dorf voll in ${effects.townFullSeconds} s`);
      parts.push(`Tod kostet ${Math.round(effects.deathGoldLoss * 100)} % Gold`);
      return parts.join(' · ');
    }
    case 'lagerhaus':
      return effects.stashSize > 0 ? `Lagertruhe mit ${effects.stashSize} Plätzen` : 'Noch keine Lagertruhe';
  }
}
