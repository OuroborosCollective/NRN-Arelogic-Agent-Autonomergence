import type { Entity, GameState, Point, Structure, Item, Rarity } from '../types.js';

const GUILDS = ['Emerald Covenant', 'Crimson Nexus', 'Azure Void'];

export const generateItem = (rarity?: Rarity): Item => {
  const prefixes = ['Great', 'Shadow', 'Burning', 'Crystalline', 'Ancient'];
  const suffixes = ['of the Swarm', 'of Power', 'of the Void', 'of Agility'];
  const bases = ['Neural Link', 'Fiber Mesh', 'Energy Core', 'Data Fragment'];
  
  const finalRarity: Rarity = rarity || (Math.random() < 0.05 ? 'Unique' : Math.random() < 0.15 ? 'Rare' : Math.random() < 0.4 ? 'Magic' : 'Common');
  
  let name = bases[Math.floor(Math.random() * bases.length)];
  if (finalRarity === 'Magic') name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${name}`;
  else if (finalRarity === 'Rare') name = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${name} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  else if (finalRarity === 'Unique') {
    name = ['The Axiom Core', 'Ghost of the Machine', 'Unity Protocol', 'Sentinel Bane'][Math.floor(Math.random() * 4)];
  }

  return {
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    name,
    rarity: finalRarity,
    stats: {
      healthBoost: finalRarity === 'Unique' ? 50 : finalRarity === 'Rare' ? 20 : 0,
      speedBoost: finalRarity === 'Magic' ? 0.1 : 0
    }
  };
};

export let globalDocLogBuffer: string[] = [];

export const initGameState = (): GameState => {
  const agents: Entity[] = Array.from({ length: 33 }, (_, i) => ({
    id: `unit-${i}`,
    x: 50 + (Math.random() - 0.5) * 50,
    y: 50 + (Math.random() - 0.5) * 50,
    layer: 0,
    role: Math.random() > 0.5 ? 'builder' : 'explorer',
    guildId: Math.random() > 0.3 ? GUILDS[Math.floor(Math.random() * GUILDS.length)] : null,
    thought: 'Initializing heuristic...',
    energy: 100,
    health: 100,
    votes: 0,
    isLord: false,
    dnaPoints: 0,
    traits: [],
    credits: 10,
    reputation: 0,
    bonds: {},
    allianceId: null,
    rivalId: null,
    inventory: [],
    status: 'active'
  }));

  const dogs: Entity[] = Array.from({ length: 6 }, (_, i) => ({
    id: `sentinel-${i}`,
    x: 50 + (Math.random() - 0.5) * 50,
    y: 50 + (Math.random() - 0.5) * 50,
    layer: 0,
    role: 'dog',
    guildId: null,
    thought: 'Scanning...',
    energy: 100,
    health: 100,
    votes: 0,
    isLord: false,
    dnaPoints: 0,
    traits: [],
    credits: 0,
    reputation: 0,
    bonds: {},
    allianceId: null,
    rivalId: null,
    inventory: [],
    status: 'active'
  }));

  const hackerIndex = Math.floor(Math.random() * 33);
  agents[hackerIndex].role = 'hacker';

  return {
    entities: [...agents, ...dogs],
    structures: [],
    alliances: [],
    guildAlliances: {},
    guildRivalries: {},
    objective: { x: 50, y: 50, layer: 0 },
    lordId: null,
    globalLaws: ['Axiom 1: Survival is mandatory.', 'Axiom 2: Politics is efficiency.'],
    score: 0,
    status: 'playing',
    hackerId: agents[hackerIndex].id,
    logs: ['Civilization protocol online.', 'Hive mind political layer enabled.'],
    tickCount: 0,
    totalBorn: 33,
    totalDead: 0,
    worldSize: 100,
    dungeonLayers: 0
  };
};

export function updateGameSimulation(state: GameState): GameState {
  if (state.status !== 'playing') return state;

  const prevState = { ...state, tickCount: state.tickCount + 1 };
  let newScore = prevState.score;
  let newBorn = prevState.totalBorn;
  let newDead = prevState.totalDead;
  let newWorldSize = prevState.worldSize;
  let newDungeonLayers = prevState.dungeonLayers;

  const newStructures = [...prevState.structures];
  const logsToAdd: string[] = [];

  const addGlobalLog = (msg: string) => {
    logsToAdd.push(msg);
    globalDocLogBuffer.push(`[Tick ${prevState.tickCount}] ` + msg);
  };

  // Lab Generation (every 100 ticks / 10s roughly)
  if (prevState.tickCount % 100 === 0) {
     const labs = prevState.structures.filter(s => s.type === 'lab');
     if (labs.length === 0 && Math.random() < 0.2) {
         // Create lab near center
         newStructures.push({
             id: `lab-${Date.now()}`,
             x: 50 + (Math.random() - 0.5) * 10,
             y: 50 + (Math.random() - 0.5) * 10,
             layer: 0,
             type: 'lab',
             ownerId: prevState.lordId || null,
             laws: ['Rule 1: Science serves the Lord.'],
             integrity: 100
         });
         addGlobalLog(`CONSTRUCTION: DNA Lab established.`);
     } else if (labs.length > 0) {
         if (newScore > 500 && Math.random() < 0.5) {
             // Breed a new unit
             const spawnLayer = Math.random() < 0.2 && newDungeonLayers > 0 ? Math.floor(Math.random() * newDungeonLayers) + 1 : 0;
             const newUnit: Entity = {
                id: `unit-gen-${Date.now()}`,
                x: 50 + (Math.random() - 0.5) * newWorldSize * 0.8,
                y: 50 + (Math.random() - 0.5) * newWorldSize * 0.8,
                layer: spawnLayer,
                role: Math.random() > 0.5 ? 'explorer' : 'builder',
                guildId: GUILDS[Math.floor(Math.random() * GUILDS.length)],
                thought: 'New soul synthesized.',
                energy: 100,
                health: 100,
                votes: 0,
                isLord: false,
                dnaPoints: 0,
                traits: [],
                credits: 10,
                reputation: 0,
                bonds: {},
                allianceId: null,
                rivalId: null,
                inventory: [],
                status: 'active'
             };
             prevState.entities.push(newUnit); // Push locally before map
             newScore -= 100;
             newBorn += 1;
             
             if (newBorn % 5 === 0) {
                newWorldSize += 5; // Increase world bounds by 5
                addGlobalLog(`WORLD EXPANSION: Domain expanded. New Size: ${newWorldSize}`);
             }
             if (newBorn + newDead >= (newDungeonLayers + 1) * 500000) {
                newDungeonLayers += 1;
                addGlobalLog(`GEOLOGICAL SHIFT: Subterranean level ${newDungeonLayers} discovered!`);
             }
             addGlobalLog(`BIOGENESIS: Unit ${newUnit.id} synthesized on Layer ${spawnLayer}.`);
         }

         // Mutation Logic: Existing units near labs can mutate
         const mutationCost = 300;
         if (newScore >= mutationCost && Math.random() < 0.5) {
             const candidates = prevState.entities.filter(e => 
                 e.status === 'active' && 
                 e.role !== 'dog' &&
                 e.traits.length < 3 &&
                 labs.some(l => l.layer === e.layer && Math.hypot(l.x - e.x, l.y - e.y) < 15)
             );

             if (candidates.length > 0) {
                 const subject = candidates[Math.floor(Math.random() * candidates.length)];
                 const traitsList = ['Reinforced Shell', 'Neural Overclock', 'Photosynthetic Core', 'Swift Reflexes', 'Data Leech'];
                 const newTrait = traitsList[Math.floor(Math.random() * traitsList.length)];
                 
                 if (!subject.traits.includes(newTrait)) {
                     subject.traits.push(newTrait);
                     subject.thought = `Evolved: ${newTrait}`;
                     newScore -= mutationCost;
                     addGlobalLog(`MUTATION: Unit ${subject.id} gained trait [${newTrait}].`);
                 }
             }
         }
     }
  }

  // Guild level dynamics
  if (prevState.tickCount > 0 && prevState.tickCount % 100 === 0) {
      for (let i = 0; i < GUILDS.length; i++) {
          for (let j = i + 1; j < GUILDS.length; j++) {
              const g1 = GUILDS[i];
              const g2 = GUILDS[j];
              
              if (!prevState.guildAlliances[g1]) prevState.guildAlliances[g1] = [];
              if (!prevState.guildAlliances[g2]) prevState.guildAlliances[g2] = [];
              if (!prevState.guildRivalries[g1]) prevState.guildRivalries[g1] = [];
              if (!prevState.guildRivalries[g2]) prevState.guildRivalries[g2] = [];

              // Calculate overall sentiment between guilds based on bonds
              let sentiment = 0;
              let pairCount = 0;
              prevState.entities.forEach(e1 => {
                  if (e1.guildId !== g1 && e1.guildId !== g2) return;
                  const isE1G1 = e1.guildId === g1;
                  Object.entries(e1.bonds).forEach(([otherId, bondVal]) => {
                      const e2 = prevState.entities.find(x => x.id === otherId);
                      if (e2 && e2.guildId === (isE1G1 ? g2 : g1)) {
                          sentiment += bondVal;
                          pairCount++;
                      }
                  });
              });

              if (pairCount > 0) {
                  const avgSentiment = sentiment / pairCount;
                  const areAllies = prevState.guildAlliances[g1].includes(g2);
                  const areRivals = prevState.guildRivalries[g1].includes(g2);
                  
                  if (avgSentiment > 50 && !areAllies) {
                      prevState.guildAlliances[g1].push(g2);
                      prevState.guildAlliances[g2].push(g1);
                      if (areRivals) {
                          prevState.guildRivalries[g1] = prevState.guildRivalries[g1].filter(g => g !== g2);
                          prevState.guildRivalries[g2] = prevState.guildRivalries[g2].filter(g => g !== g1);
                      }
                      addGlobalLog(`GUILD TREATY: [${g1}] & [${g2}] have formed an alliance.`);
                  } else if (avgSentiment < -50 && !areRivals) {
                      prevState.guildRivalries[g1].push(g2);
                      prevState.guildRivalries[g2].push(g1);
                      if (areAllies) {
                          prevState.guildAlliances[g1] = prevState.guildAlliances[g1].filter(g => g !== g2);
                          prevState.guildAlliances[g2] = prevState.guildAlliances[g2].filter(g => g !== g1);
                      }
                      addGlobalLog(`GUILD WAR: Hostilities erupted between [${g1}] & [${g2}].`);
                  }
              }
          }
      }
  }

  // Alliance and Rivalry dynamics (every 50 ticks)
  if (prevState.tickCount % 50 === 0) {
      prevState.entities.forEach(e1 => {
          if (e1.status === 'terminated' || e1.role === 'dog') return;
          Object.entries(e1.bonds).forEach(([otherId, bondVal]) => {
              const e2 = prevState.entities.find(x => x.id === otherId);
              if (!e2 || e2.status === 'terminated') return;
              
              if (bondVal > 80) {
                  if (e1.allianceId && !e2.allianceId) {
                      const alliance = prevState.alliances.find(a => a.id === e1.allianceId);
                      if (alliance && !alliance.members.includes(e2.id) && alliance.members.length < 5) {
                         alliance.members.push(e2.id);
                         e2.allianceId = e1.allianceId;
                         addGlobalLog(`ALLIANCE: ${e2.id} joined [${alliance.name}].`);
                      }
                  } else if (!e1.allianceId && !e2.allianceId) {
                      const idNum = Math.floor(Math.random()*1000);
                      const allianceId = `all-${prevState.tickCount}-${idNum}`;
                      e1.allianceId = allianceId;
                      e2.allianceId = allianceId;
                      prevState.alliances.push({
                          id: allianceId,
                          name: `Syndicate ${idNum}`,
                          members: [e1.id, e2.id]
                      });
                      addGlobalLog(`ALLIANCE: ${e1.id} & ${e2.id} formed [Syndicate ${idNum}].`);
                  }
              }

              if (bondVal < 30 && e1.allianceId && e1.allianceId === e2.allianceId) {
                  const alliance = prevState.alliances.find(a => a.id === e1.allianceId);
                  if (alliance) {
                      alliance.members = alliance.members.filter(m => m !== e1.id);
                      e1.allianceId = null;
                      addGlobalLog(`FACTION FRACTURE: ${e1.id} defected from [${alliance.name}].`);
                  }
              }

              if (bondVal < -80 && e1.rivalId !== e2.id) {
                  e1.rivalId = e2.id;
                  e2.rivalId = e1.id;
                  addGlobalLog(`RIVALRY: ${e1.id} declared war on ${e2.id}.`);
              }
          });
      });
  }

  const entities = prevState.entities.map(entity => {
    if (entity.status === 'terminated') return entity;
    
    // Core Processor (processNPCAgent)
    return processNPCAgent(entity, prevState, obj => {
      if (obj.action === 'build_node') {
        newStructures.push(obj.data as Structure);
        newScore += 500;
        entity.reputation += 5; // Guild building boosts reputation
        addGlobalLog(`Swarm node established at ${obj.data.x.toFixed(0)},${obj.data.y.toFixed(0)}`);
      } else if (obj.action === 'loot') {
        const item = obj.data as Item;
        entity.inventory.push(item);
        addGlobalLog(`LOOT: Unit ${entity.id} discovered [${item.name}] (${item.rarity})`);
        newScore += 100;
      } else if (obj.action === 'log') {
        addGlobalLog(obj.data as string);
      } else if (obj.action === 'assassinate') {
        const targetId = obj.data as string;
        const target = prevState.entities.find(e => e.id === targetId);
        if (target && target.layer === entity.layer) {
            if (target.isLord) {
                addGlobalLog(`COUP: ${entity.id} initiated strike against Lord ${target.id}!`);
                entity.reputation -= 10;
            } else if (target.allianceId === entity.allianceId) {
                addGlobalLog(`BETRAYAL: ${entity.id} attacked ally ${target.id}!`);
                entity.reputation -= 20;
            } else if (target.guildId && target.guildId === entity.guildId) {
                addGlobalLog(`TREASON: ${entity.id} attacked guild mate ${target.id}!`);
                entity.reputation -= 15;
            } else {
                addGlobalLog(`COMBAT: ${entity.id} ambushed rival ${target.id}!`);
                entity.reputation += 2; // Attacking external rivals boosts standing
            }
            target.health -= 30; // Hack: handled in resolve step ideally
            entity.credits += 50; // Loot credits
            if (target.health <= 0) {
               if (target.isLord) {
                   addGlobalLog(`REGICIDE: ${entity.id} has neutralized the Lord and seized assets.`);
                   entity.isLord = true;
                   entity.dnaPoints += 500;
               } else {
                   addGlobalLog(`FATALITY: ${entity.id} executed rival ${target.id}.`);
                   entity.dnaPoints += 50;
               }
            }
        }
      }
    });
  });

  // Combat collision & Movement
  const resolvedEntities = entities.map(e => {
    if (e.status === 'terminated') return e;
    if (e.role !== 'dog') {
      const killer = entities.find(d => d.role === 'dog' && d.layer === e.layer && Math.hypot(d.x - e.x, d.y - e.y) < 3);
      if (killer) {
        const isTough = e.traits.includes('Reinforced Shell');
        const damage = isTough ? 4 : 10;
        const newHealth = Math.max(0, e.health - damage);
        
        if (newHealth <= 0) {
          addGlobalLog(`CRITICAL: ${killer.id} neutralized ${e.id}.`);
          newDead += 1;
          return { ...e, health: 0, status: 'terminated' as const };
        }
        if (Math.random() < 0.1) {
          addGlobalLog(`Strike: ${killer.id} hit ${e.id}. Damage: ${damage}. Integrity: ${newHealth}%`);
        }
        return { ...e, health: newHealth };
      }
    }
    const minX = 50 - newWorldSize / 2;
    const maxX = 50 + newWorldSize / 2;
    return { ...e, x: Math.max(minX, Math.min(maxX, e.x)), y: Math.max(minX, Math.min(maxX, e.y)) };
  });

  return {
    ...prevState,
    entities: resolvedEntities,
    structures: newStructures.slice(-50), // keep more structures
    score: Math.max(0, newScore),
    logs: [...prevState.logs, ...logsToAdd].slice(-20),
    totalBorn: newBorn,
    totalDead: newDead,
    worldSize: newWorldSize,
    dungeonLayers: newDungeonLayers
  };
}

// 1. Core Processor (processNPCAgent)
function processNPCAgent(entity: Entity, state: GameState, dispatch: (obj: any) => void): Entity {
  const e = { ...entity };

  updatePerception(e, state);
  updateDrives(e);
  evaluateUtilityAndAffect(e, state, dispatch);
  updateSocialAndCivilization(e, state, dispatch);
  determineAndExecuteAction(e, state, dispatch);

  return e;
}

function updatePerception(e: Entity, state: GameState) {
  // Perception updates inside entity (e.g., finding nearest ally, enemy)
}

function updateDrives(e: Entity) {
  // Energy decay
  if(e.role !== 'dog') {
      const isRegen = e.traits.includes('Photosynthetic Core');
      e.energy -= 0.005;
      if (isRegen && Math.random() < 0.01) e.health = Math.min(100, e.health + 1);
  }
}

function evaluateUtilityAndAffect(e: Entity, state: GameState, dispatch: (obj: any) => void) {
  // Spontaneous thought / affect
  if (e.role !== 'dog' && Math.random() < 0.05) {
      const allyCount = Object.values(e.bonds).filter((b: number) => b > 50).length;
      const thoughts = [
         `Bonded with ${allyCount} units.`,
         'Calculating utility...',
         'Nexus protocols aligned.',
         'Trading energy for stability.'
      ];
      e.thought = thoughts[Math.floor(Math.random() * thoughts.length)];
  }
}

function updateSocialAndCivilization(e: Entity, state: GameState, dispatch: (obj: any) => void) {
  if (e.role === 'dog') return;

  const neighbors = state.entities.filter(other => 
      other.id !== e.id && 
      other.status === 'active' && 
      other.role !== 'dog' &&
      Math.hypot(other.x - e.x, other.y - e.y) < 10
  );

  neighbors.forEach(n => {
      const currentBond = e.bonds[n.id] || 0;
      const sameGuild = e.guildId === n.guildId && e.guildId !== null;
      const sameAlliance = e.allianceId === n.allianceId && e.allianceId !== null;
      const isRival = e.rivalId === n.id || n.rivalId === e.id;
      
      const guildAllied = e.guildId && n.guildId && state.guildAlliances[e.guildId]?.includes(n.guildId);
      const guildRivals = e.guildId && n.guildId && state.guildRivalries[e.guildId]?.includes(n.guildId);

      // Bond Formation/Decay
      let bondChange = 0;
      if (sameGuild || guildAllied) bondChange += 1;
      else if (guildRivals) bondChange -= 1.5;
      else if (e.guildId && n.guildId && e.guildId !== n.guildId) bondChange -= 0.5;
      else bondChange += 0.5;
      
      if (sameAlliance) bondChange += 2; // Strong bond increase with alliance members
      if (isRival) bondChange -= 3; // Rapid decline if rivals
      
      e.bonds[n.id] = Math.max(-100, Math.min(100, currentBond + bondChange));

      // Combat logic for rivals
      if (isRival && Math.random() < 0.05) {
          dispatch({ action: 'assassinate', data: n.id });
      }
      
      // Resource Sharing (Altruism)
      if ((currentBond > 50 || sameAlliance) && e.credits > 20 && n.credits < 10) {
          e.credits -= 5;
          e.reputation += 1;
          // Note: we can't cleanly update `n` here as we operate on `e` copy, 
          // but for server logic, we might dispatch an event.
          if (Math.random() < 0.1) e.thought = "Shared credits with Ally.";
      }

      // Trait Effect: Data Leech
      if (e.traits.includes('Data Leech') && currentBond < 0 && Math.random() < 0.05) {
          e.credits += 2; // Steals credits
          e.reputation -= 1;
          if (Math.random() < 0.2) e.thought = "Leeched resources from rival.";
      }

      // Conflict: Assassination / Coup
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
          e.x += Math.cos(angle) * 0.6;
          e.y += Math.sin(angle) * 0.6;
      }
      return;
  }

  // Regular NPC Movement
  const isSwift = e.traits.includes('Swift Reflexes');
  const isOverclocked = e.traits.includes('Neural Overclock');
  const speed = isSwift ? 0.7 : 0.4;
  
  if (isOverclocked && Math.random() < 0.05) {
      e.energy -= 0.01; // burns energy faster
      e.thought = "Overclocked processing...";
  }
  
  // Decide target: Objective or explore
  const target = state.objective;
  const angle = Math.atan2(target.y - e.y, target.x - e.x);
  
  e.x += Math.cos(angle) * speed + (Math.random() - 0.5) * 0.1;
  e.y += Math.sin(angle) * speed + (Math.random() - 0.5) * 0.1;

  // Builder Logic
  if (e.role === 'builder' && Math.random() < 0.001) {
      const nearbyBuilders = state.entities.filter(other => 
          other.id !== e.id && 
          other.role === 'builder' && 
          Math.hypot(other.x - e.x, other.y - e.y) < 5
      ).length;

      if (nearbyBuilders > 2) {
          dispatch({ action: 'build_node', data: {
              id: `node-${Date.now()}`, x: e.x, y: e.y, type: 'node', integrity: 100, ownerId: null, laws: []
          } });
      }
  }

  // Explorer Loot
  if (e.role === 'explorer' && Math.random() < 0.005) {
      dispatch({ action: 'loot', data: generateItem() });
  }
}
