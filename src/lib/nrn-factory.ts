import { AgentFactory, Registry } from 'nrn-agents';

const API_KEY = process.env.NRN_API_KEY || 'default-api-key';
const GAME_ID = process.env.NRN_GAME_ID || 'default-game-id';

AgentFactory.setApiKey(API_KEY);
AgentFactory.setGameId(GAME_ID);

export { AgentFactory, Registry };
