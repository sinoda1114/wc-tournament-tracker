export type BracketResult = 'winner' | 'loser';
export type BracketSlot = 'home' | 'away';

export type SeedBracketEdge = {
  fromMatchId: number;
  fromResult: BracketResult;
  toMatchId: number;
  toSlot: BracketSlot;
};

export const seedBracketEdges = [
  { fromMatchId: 74, fromResult: 'winner', toMatchId: 89, toSlot: 'home' },
  { fromMatchId: 77, fromResult: 'winner', toMatchId: 89, toSlot: 'away' },
  { fromMatchId: 73, fromResult: 'winner', toMatchId: 90, toSlot: 'home' },
  { fromMatchId: 75, fromResult: 'winner', toMatchId: 90, toSlot: 'away' },
  { fromMatchId: 76, fromResult: 'winner', toMatchId: 91, toSlot: 'home' },
  { fromMatchId: 78, fromResult: 'winner', toMatchId: 91, toSlot: 'away' },
  { fromMatchId: 79, fromResult: 'winner', toMatchId: 92, toSlot: 'home' },
  { fromMatchId: 80, fromResult: 'winner', toMatchId: 92, toSlot: 'away' },
  { fromMatchId: 83, fromResult: 'winner', toMatchId: 93, toSlot: 'home' },
  { fromMatchId: 84, fromResult: 'winner', toMatchId: 93, toSlot: 'away' },
  { fromMatchId: 81, fromResult: 'winner', toMatchId: 94, toSlot: 'home' },
  { fromMatchId: 82, fromResult: 'winner', toMatchId: 94, toSlot: 'away' },
  { fromMatchId: 86, fromResult: 'winner', toMatchId: 95, toSlot: 'home' },
  { fromMatchId: 88, fromResult: 'winner', toMatchId: 95, toSlot: 'away' },
  { fromMatchId: 85, fromResult: 'winner', toMatchId: 96, toSlot: 'home' },
  { fromMatchId: 87, fromResult: 'winner', toMatchId: 96, toSlot: 'away' },
  { fromMatchId: 89, fromResult: 'winner', toMatchId: 97, toSlot: 'home' },
  { fromMatchId: 90, fromResult: 'winner', toMatchId: 97, toSlot: 'away' },
  { fromMatchId: 93, fromResult: 'winner', toMatchId: 98, toSlot: 'home' },
  { fromMatchId: 94, fromResult: 'winner', toMatchId: 98, toSlot: 'away' },
  { fromMatchId: 91, fromResult: 'winner', toMatchId: 99, toSlot: 'home' },
  { fromMatchId: 92, fromResult: 'winner', toMatchId: 99, toSlot: 'away' },
  { fromMatchId: 95, fromResult: 'winner', toMatchId: 100, toSlot: 'home' },
  { fromMatchId: 96, fromResult: 'winner', toMatchId: 100, toSlot: 'away' },
  { fromMatchId: 97, fromResult: 'winner', toMatchId: 101, toSlot: 'home' },
  { fromMatchId: 98, fromResult: 'winner', toMatchId: 101, toSlot: 'away' },
  { fromMatchId: 99, fromResult: 'winner', toMatchId: 102, toSlot: 'home' },
  { fromMatchId: 100, fromResult: 'winner', toMatchId: 102, toSlot: 'away' },
  { fromMatchId: 101, fromResult: 'winner', toMatchId: 104, toSlot: 'home' },
  { fromMatchId: 102, fromResult: 'winner', toMatchId: 104, toSlot: 'away' },
  { fromMatchId: 101, fromResult: 'loser', toMatchId: 103, toSlot: 'home' },
  { fromMatchId: 102, fromResult: 'loser', toMatchId: 103, toSlot: 'away' },
] satisfies SeedBracketEdge[];
