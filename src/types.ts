export type Rarity = 'Common' | 'Magic' | 'Rare' | 'Unique';

export interface BlockchainTx {
  txId: string;
  from: string;
  to: string;
  amount: number;
  memo: string;
  timestamp: number;
}

export interface Item {
  id: string;
  name: string;
  rarity: Rarity;
  stats: {
    healthBoost?: number;
    speedBoost?: number;
    damageBoost?: number;
  };
  type?: 'weapon' | 'consumable' | 'data';
  price?: number;
}

export interface Alliance {
  id: string;
  name: string;
  members: string[];
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  layer: number;
  role: 'builder' | 'explorer' | 'dog' | 'hacker' | 'scientist';
  guildId: string | null;
  thought: string;
  energy: number;
  health: number;
  votes: number;
  isLord: boolean;
  dnaPoints: number;
  traits: string[];
  credits: number;
  reputation: number;
  walletAddress: string;
  nrnBalance: number;
  bonds: Record<string, number>;
  allianceId: string | null;
  rivalId: string | null;
  inventory: Item[];
  status: 'active' | 'terminated';
  memory?: {
    allies: string[];
    threats: string[];
    pointsOfInterest: { id: string; type: string; x: number; y: number }[];
  };
  needs?: {
    survival: number;
    social: number;
    power: number;
    knowledge: number;
  };
}

export interface Structure {
  id: string;
  x: number;
  y: number;
  layer: number;
  type: 'node' | 'outpost' | 'lab';
  ownerId: string | null;
  laws: string[];
  integrity: number;
}

export interface Point {
  x: number;
  y: number;
  layer: number;
}

export interface GameState {
  entities: Entity[];
  structures: Structure[];
  alliances: Alliance[];
  guildAlliances: Record<string, string[]>;
  guildRivalries: Record<string, string[]>;
  objective: Point;
  lordId: string | null;
  globalLaws: string[];
  score: number;
  status: 'idle' | 'playing' | 'learning';
  hackerId: string | null;
  logs: string[];
  tickCount: number;
  totalBorn: number;
  totalDead: number;
  worldSize: number;
  dungeonLayers: number;
  nrnLedger: BlockchainTx[];
  baseAgentCount: number;
  dogKillTimestamps: number[];
}
