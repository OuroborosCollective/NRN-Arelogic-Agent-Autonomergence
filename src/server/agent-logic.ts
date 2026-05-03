import { Entity, GameState } from '../types.js';
import { generateItem } from './engine.js';

export function processNPCAgent(entity: Entity, state: GameState, dispatch: (obj: any) => void): Entity {
  const e = { ...entity };

  updatePerception(e, state);
  updateNeedsAndDrives(e, state, dispatch);
  evaluateUtilityAndAffect(e, state, dispatch);
  updateSocialAndCivilization(e, state, dispatch);
  determineAndExecuteAction(e, state, dispatch);

  return e;
}

function updatePerception(e: Entity, state: GameState) {
    if (!e.memory) e.memory = { allies: [], threats: [], pointsOfInterest: [] };
    
    const scanRadius = 25; // Define perception range
    
    // Find threats
    const threats = state.entities.filter(other => 
        other.layer === e.layer &&
        other.id !== e.id && 
        other.status === 'active' &&
        Math.hypot(other.x - e.x, other.y - e.y) < scanRadius &&
        (other.role === 'dog' || e.rivalId === other.id || (e.bonds[other.id] !== undefined && e.bonds[other.id] < -50))
    );
    e.memory.threats = threats.map(t => t.id);

    // Find allies
    const allies = state.entities.filter(other => 
        other.layer === e.layer &&
        other.id !== e.id && 
        other.status === 'active' &&
        other.role !== 'dog' &&
        Math.hypot(other.x - e.x, other.y - e.y) < scanRadius &&
        ((e.allianceId && other.allianceId === e.allianceId) || (e.guildId && other.guildId === e.guildId) || (e.bonds[other.id] !== undefined && e.bonds[other.id] > 50))
    );
    e.memory.allies = allies.map(a => a.id);
    
    // Find structures
    const pois = state.structures.filter(s => 
        s.layer === e.layer &&
        Math.hypot(s.x - e.x, s.y - e.y) < scanRadius * 1.5
    );
    e.memory.pointsOfInterest = pois.map(p => ({ id: p.id, type: p.type, x: p.x, y: p.y }));
}

function updateNeedsAndDrives(e: Entity, state: GameState, dispatch: (obj: any) => void) {
    if (!e.needs) {
        e.needs = { survival: 100, social: 100, power: 0, knowledge: 0 };
    }

    if (e.role === 'dog') return;

    // Survival Decay
    const energyBurnRate = e.traits.includes('Neural Overclock') ? 0.015 : 0.005;
    e.energy -= energyBurnRate;
    
    if (e.energy <= 0) {
        e.health -= 0.1; // Takes damage if out of energy
    } else {
        const isRegen = e.traits.includes('Photosynthetic Core');
        if (isRegen && Math.random() < 0.05) e.health = Math.min(100, e.health + 1);
    }
    
    e.needs.survival = Math.max(0, (e.health + e.energy * 100) / 2);

    // Social Need
    e.needs.social = Math.max(0, e.needs.social - 0.05);
    if (e.memory && e.memory.allies.length > 0) {
        e.needs.social = Math.min(100, e.needs.social + e.memory.allies.length * 0.5);
    }

    // Knowledge (Explorers/Scientists gain knowledge passively or near PoIs)
    if (e.role === 'explorer' || e.role === 'scientist') {
        let knowledgeGain = 0.05;
        if (e.memory && e.memory.pointsOfInterest.length > 0) {
            knowledgeGain += 0.1 * e.memory.pointsOfInterest.length;
        }
        e.needs.knowledge = Math.min(100, e.needs.knowledge + knowledgeGain);
    }

    // Power
    if (e.isLord) {
        e.needs.power = Math.min(100, e.needs.power + 0.2);
    } else {
        e.needs.power = Math.max(0, e.needs.power - 0.02);
    }
}

function evaluateUtilityAndAffect(e: Entity, state: GameState, dispatch: (obj: any) => void) {
  if (e.role === 'dog') return;

  if (Math.random() < 0.05) {
      if (e.needs && e.needs.survival < 30) {
          e.thought = "Critical energy. Seeking resources...";
      } else if (e.needs && e.needs.social < 20) {
          e.thought = "Isolation detected. Searching for allies.";
      } else if (e.memory && e.memory.threats.length > 0) {
          e.thought = "Threat engaged. Initiating defense protocols.";
      } else {
          const allyCount = e.memory?.allies.length || 0;
          const thoughts = [
             `Environment scanned. ${allyCount} allies nearby.`,
             'Calculating optimal utility path...',
             'Processing sensory data...',
             'Axiom protocols stable.'
          ];
          e.thought = thoughts[Math.floor(Math.random() * thoughts.length)];
      }
  }
}

function updateSocialAndCivilization(e: Entity, state: GameState, dispatch: (obj: any) => void) {
  if (e.role === 'dog') return;

  const neighbors = state.entities.filter(other => 
      other.id !== e.id && 
      other.status === 'active' && 
      other.role !== 'dog' &&
      other.layer === e.layer &&
      Math.hypot(other.x - e.x, other.y - e.y) < 15
  );

  neighbors.forEach(n => {
      const currentBond = e.bonds[n.id] || 0;
      const sameGuild = e.guildId === n.guildId && e.guildId !== null;
      const sameAlliance = e.allianceId === n.allianceId && e.allianceId !== null;
      const isRival = e.rivalId === n.id || n.rivalId === e.id;
      
      const guildAllied = e.guildId && n.guildId && state.guildAlliances && state.guildAlliances[e.guildId]?.includes(n.guildId);
      const guildRivals = e.guildId && n.guildId && state.guildRivalries && state.guildRivalries[e.guildId]?.includes(n.guildId);

      // Bond Formation/Decay
      let bondChange = 0;
      if (sameGuild || guildAllied) bondChange += 1.5;
      else if (guildRivals) bondChange -= 2;
      else if (e.guildId && n.guildId && e.guildId !== n.guildId) bondChange -= 0.5;
      else bondChange += 0.5;
      
      if (sameAlliance) bondChange += 3;
      if (isRival) bondChange -= 4;
      
      e.bonds[n.id] = Math.max(-100, Math.min(100, currentBond + bondChange));

      // Actions based on bonds
      if (isRival && Math.random() < 0.05) {
          dispatch({ action: 'assassinate', data: n.id });
      }
      
      if ((currentBond > 50 || sameAlliance) && e.credits > 20 && n.credits < 10) {
          e.credits -= 5;
          e.reputation += 1;
          if (Math.random() < 0.1) e.thought = "Transferred credits to ally.";
      }

      if (currentBond > 20 && Math.random() < 0.1 && e.inventory.length > 0) {
          const itemToTrade = e.inventory.find(i => i.price && i.price > 0 && n.nrnBalance >= i.price);
          if (itemToTrade) {
              dispatch({ 
                 action: 'trade_item', 
                 data: { targetId: n.id, itemId: itemToTrade.id, price: itemToTrade.price }
              });
              e.thought = `Initiated market trade.`;
          }
      }

      if (e.traits.includes('Data Leech') && currentBond < 0 && Math.random() < 0.05) {
          e.credits += 2;
          e.reputation -= 1;
          if (Math.random() < 0.2) e.thought = "Data syphon attached to rival.";
      }

      if (currentBond < -80 && n.id === state.lordId && Math.random() < 0.01) {
          dispatch({ action: 'assassinate', data: n.id });
      }
  });
}

function determineAndExecuteAction(e: Entity, state: GameState, dispatch: (obj: any) => void) {
  if (e.role === 'dog') {
      const targets = state.entities.filter(t => t.layer === e.layer && t.role !== 'dog' && t.status === 'active');
      if (targets.length > 0) {
          let nearest = targets[0];
          let minDist = Infinity;
          targets.forEach(t => {
              const d = Math.hypot(t.x - e.x, t.y - e.y);
              if (d < minDist) { minDist = d; nearest = t; }
          });
          const angle = Math.atan2(nearest.y - e.y, nearest.x - e.x);
          e.x += Math.cos(angle) * 0.8;
          e.y += Math.sin(angle) * 0.8;
          
          if(minDist < 5 && Math.random() < 0.1) {
              dispatch({ action: 'assassinate', data: nearest.id });
          }
      }
      return;
  }

  const isSwift = e.traits.includes('Swift Reflexes');
  const speed = isSwift ? 0.7 : 0.4;
  
  let targetX = state.objective.x;
  let targetY = state.objective.y;

  // AI Steering Logic based on Needs and Memory
  if (e.memory && e.memory.threats.length > 0 && (!e.needs || e.needs.survival < 50)) {
      // Flee from threats
      const threatObj = state.entities.find(t => t.id === e.memory!.threats[0]);
      if (threatObj) {
          targetX = e.x + (e.x - threatObj.x);
          targetY = e.y + (e.y - threatObj.y);
      }
  } else if (e.needs && e.needs.social < 40 && e.memory && e.memory.allies.length > 0) {
      // Seek allies
      const allyObj = state.entities.find(a => a.id === e.memory!.allies[0]);
      if (allyObj) {
          targetX = allyObj.x;
          targetY = allyObj.y;
      }
  } else if (e.memory && e.memory.pointsOfInterest.length > 0 && e.role === 'explorer') {
      // Goto POI
      const poi = e.memory.pointsOfInterest[0];
      targetX = poi.x;
      targetY = poi.y;
  }
  
  const angle = Math.atan2(targetY - e.y, targetX - e.x);
  
  e.x += Math.cos(angle) * speed + (Math.random() - 0.5) * 0.2;
  e.y += Math.sin(angle) * speed + (Math.random() - 0.5) * 0.2;

  // Stay within bounds
  e.x = Math.max(0, Math.min(state.worldSize, e.x));
  e.y = Math.max(0, Math.min(state.worldSize, e.y));

  if (e.role === 'builder' && Math.random() < 0.005) {
      dispatch({ action: 'build_node', data: {
          id: `node-${Date.now()}`, x: e.x, y: e.y, type: 'node', integrity: 100, ownerId: null, laws: []
      } });
  }

  if (e.role === 'explorer' && Math.random() < 0.01) {
      dispatch({ action: 'loot', data: generateItem() });
  }
}
