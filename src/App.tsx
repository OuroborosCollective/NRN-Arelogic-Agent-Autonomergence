import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Play, 
  Square, 
  Settings, 
  Activity, 
  Zap, 
  Shield, 
  Crosshair, 
  ChevronRight,
  RefreshCw,
  Plus,
  Crown,
  Database,
  FlaskConical
} from 'lucide-react';
import { AgentFactory, Registry } from './lib/nrn-factory';
import { stateSpace } from './helpers/nrn-integration/nrn-state-space';
import { actionSpace } from './helpers/nrn-integration/nrn-action-space';
import type { GameState, Entity, Structure, Item, Rarity, Point } from './types';
import { io } from 'socket.io-client';

const socket = io();

export default function App() {
  const [activeTab, setActiveTab] = useState<'arena' | 'training' | 'registry'>('arena');
  const [activeLayer, setActiveLayer] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    socket.on('gameState', (state: GameState) => {
      setGameState(state);
    });
    return () => {
      socket.off('gameState');
    };
  }, []);

  const [heuristicMemory, setHeuristicMemory] = useState<Record<string, number>>({});
  const [deathsInWindow, setDeathsInWindow] = useState(0);

  // Training States
  const [trainingParams, setTrainingParams] = useState({
    epochs: 100,
    learningRate: 0.001,
    rewardFunction: 'balanced' as 'aggressive' | 'efficient' | 'balanced'
  });
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingBufferTotal, setTrainingBufferTotal] = useState(12842);
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTraining = () => {
    if (isTraining) return;
    setIsTraining(true);
    setTrainingProgress(0);
    
    let currentEpoch = 0;
    trainingIntervalRef.current = setInterval(() => {
      currentEpoch++;
      const progress = (currentEpoch / trainingParams.epochs) * 100;
      setTrainingProgress(progress);
      setTrainingBufferTotal(prev => prev + Math.floor(Math.random() * 50));

      if (currentEpoch >= trainingParams.epochs) {
        if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
        setIsTraining(false);
      }
    }, 100);
  };

  const stopTraining = () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    setIsTraining(false);
  };

  const handleStart = () => {
    socket.emit('command', 'start');
  };

  const handleStop = () => {
    socket.emit('command', 'stop');
  };

  if (!gameState) {
    return <div className="h-screen flex items-center justify-center bg-black text-white font-mono text-sm">Connecting to Axiom Node...</div>;
  }

  const getScreenPos = (val: number) => {
    const min = 50 - gameState.worldSize / 2;
    return ((val - min) / gameState.worldSize) * 100;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E4E3E0] font-sans selection:bg-[#E4E3E0] selection:text-[#0A0A0A]">
      {/* Top Header / Border Line */}
      <header className="border-b border-[#222222] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-[#E4E3E0]" />
          <div>
            <h1 className="text-xl font-medium tracking-tight">AXIOM ARENA</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-60 font-mono text-blue-400">Heuristics are Axiom Battles</p>
          </div>
        </div>
        <nav className="flex gap-8">
          {['arena', 'training', 'registry'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`text-[11px] uppercase tracking-widest transition-all ${
                activeTab === tab ? 'opacity-100 border-b border-[#E4E3E0]' : 'opacity-40 hover:opacity-70'
              } pb-1`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase opacity-40">API STATUS</p>
            <p className="text-[11px] font-mono text-green-500">CONNECTED</p>
          </div>
          <div className="w-8 h-8 bg-[#222222] rounded-full flex items-center justify-center">
            <span className="text-[10px] font-bold">R</span>
          </div>
        </div>
      </header>

      <main className="p-6 grid grid-cols-12 gap-6 h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Sidebar - Agent Specs */}
        <aside className="col-span-3 border-r border-[#222222] pr-6 flex flex-col gap-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] uppercase tracking-widest opacity-50 italic serif">Active Architecture</h2>
              <Settings className="w-3 h-3 opacity-30" />
            </div>
            <div className="bg-[#141414] border border-[#222222] p-4 rounded-sm">
              <p className="text-sm font-medium mb-1">Axiom_Swarm_v8</p>
              <p className="text-[10px] font-mono opacity-40 mb-3">Hidden Hacker Protocol Active</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#1A1A1A] p-2 rounded-sm border border-[#222222]">
                  <p className="text-[9px] opacity-40 uppercase">Active Agents</p>
                  <p className="text-xs">{gameState.entities.filter(e => (e.role === 'agent' || e.role === 'hacker') && e.status === 'active').length} / 33</p>
                </div>
                <div className="bg-[#1A1A1A] p-2 rounded-sm border border-[#222222]">
                  <p className="text-[9px] opacity-40 uppercase">Sentinels</p>
                  <p className="text-xs">{gameState.entities.filter(e => e.role === 'dog').length} active</p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex-1 overflow-hidden flex flex-col">
            <h2 className="text-[11px] uppercase tracking-widest opacity-50 italic serif mb-4">Heuristic Memory (MemCache)</h2>
            <div className="bg-[#141414] border border-[#222222] p-4 rounded-sm space-y-3 mb-6">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="opacity-40 uppercase">DEATHS THIS MINUTE</span>
                <span className={deathsInWindow === 0 ? "text-green-400" : "text-red-400"}>{deathsInWindow}</span>
              </div>
              {Object.keys(heuristicMemory).length === 0 ? (
                <p className="text-[10px] opacity-20 italic">No patterns cached yet.</p>
              ) : (
                Object.entries(heuristicMemory).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center text-[10px] font-mono">
                    <span className="opacity-40 uppercase">{key.replace('_', ' ')}</span>
                    <span className="text-blue-400">{val}</span>
                  </div>
                ))
              )}
            </div>

            <h2 className="text-[11px] uppercase tracking-widest opacity-50 italic serif mb-4">Neural Output</h2>
            <div className="flex-1 bg-[#141414] border border-[#222222] p-4 rounded-sm overflow-y-auto space-y-3 font-mono text-[10px]">
              {gameState.logs.map((log, i) => (
                <div key={i} className="flex gap-2 opacity-70">
                  <span className="opacity-30">[{new Date().toLocaleTimeString()}]</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="p-4 border border-dashed border-[#333] rounded-sm bg-[#0C0C0C]">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Lord of the Swarm</p>
              <div className="flex items-center gap-3">
                <Crown className={`w-4 h-4 ${gameState.lordId ? 'text-yellow-500' : 'text-white/10'}`} />
                <span className="text-xs font-mono">{gameState.lordId || 'ANARCHY'}</span>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest opacity-40">Swarm Laws</h3>
            <div className="space-y-1">
              {gameState.globalLaws.map((law, i) => (
                <div key={i} className="text-[10px] font-serif italic py-1 px-2 border-l border-[#222] opacity-60">
                  {law}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="p-4 border border-dashed border-[#333] rounded-sm bg-[#0C0C0C]">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Swarm Credits (Economy)</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-mono text-blue-400">
                  {gameState.entities.filter(e => e.role !== 'dog' && e.status === 'active').reduce((acc, curr) => acc + curr.credits, 0).toLocaleString()}
                </span>
                <span className="text-[10px] opacity-30">SHARED POOL</span>
              </div>
            </div>
          </section>

          <section>
            <div className="p-4 border border-dashed border-[#333] rounded-sm bg-[#0C0C0C]">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Social Stability (Bonds)</p>
              <div className="h-1 bg-[#222] w-full rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-500" 
                  initial={{ width: '0%' }}
                  animate={{ 
                    width: `${Math.min(100, (gameState.entities.filter(e => e.role !== 'dog' && e.status === 'active').reduce((acc, curr) => acc + Object.values(curr.bonds).filter((b: any) => b > 50).length, 0) / Math.max(1, gameState.entities.length)) * 10)}%` 
                  }}
                />
              </div>
            </div>
          </section>

          {(Object.values(gameState.guildAlliances || {}).some(a => a.length > 0) || Object.values(gameState.guildRivalries || {}).some(r => r.length > 0)) && (
            <section className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest opacity-40">Guild Diplomacy</h3>
              <div className="space-y-2">
                {Object.entries(gameState.guildAlliances || {}).map(([guild, allies]) => 
                  allies.filter(a => guild < a).map(ally => (
                    <div key={`allies-${guild}-${ally}`} className="text-[9px] py-1 px-2 border border-[#222] bg-[#111] rounded-sm text-cyan-400">
                      <span className="opacity-50 text-[#fff]">ALLIANCE: </span>
                      {guild} ↔ {ally}
                    </div>
                  ))
                )}
                {Object.entries(gameState.guildRivalries || {}).map(([guild, rivals]) => 
                  rivals.filter(r => guild < r).map(rival => (
                    <div key={`rivals-${guild}-${rival}`} className="text-[9px] py-1 px-2 border border-[#222] bg-[#111] rounded-sm text-red-500">
                      <span className="opacity-50 text-[#fff]">WAR: </span>
                      {guild} ⚔️ {rival}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          <section>
            <div className="p-4 border border-dashed border-[#333] rounded-sm bg-[#0C0C0C]">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">DNA Reserve (Biogenesis)</p>
              <div className="h-1 bg-[#222] w-full rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500" 
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(100, (gameState.score / 5000) * 100)}%` }}
                />
              </div>
              <p className="text-[8px] opacity-30 mt-2">Next Synthesis: 500 Credits</p>
            </div>
          </section>

          <section>
            <div className="p-4 border border-dashed border-[#333] rounded-sm bg-[#0C0C0C]">
              <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Swarm Integrity</p>
              <div className="h-1 bg-[#222] w-full rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-green-500" 
                  initial={{ width: '100%' }}
                  animate={{ 
                    width: `${gameState.entities.filter(e => e.role !== 'dog' && e.status === 'active').reduce((acc, curr) => acc + curr.health, 0) / Math.max(1, gameState.entities.filter(e => e.role !== 'dog' && e.status === 'active').length)}%` 
                  }}
                />
              </div>
            </div>
          </section>
        </aside>

        {/* Center Section - Conditional Rendering */}
        <section className="col-span-6 relative bg-[#141414] border border-[#222222] rounded-sm overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {activeTab === 'arena' ? (
              <motion.div 
                key="arena"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col"
              >
                <div className="absolute top-4 right-4 flex gap-2 z-10 font-mono text-[10px]">
                  <div className="bg-black/60 px-1 py-1 border border-[#333] rounded-sm flex items-center">
                    {Array.from({ length: gameState.dungeonLayers + 1 }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveLayer(i)}
                        className={`px-2 py-0.5 ${activeLayer === i ? 'bg-[#333] text-white' : 'text-[#666] hover:text-[#999]'}`}
                      >
                        {i === 0 ? 'Sur' : `L${i}`}
                      </button>
                    ))}
                  </div>
                  <div className="bg-black/60 px-2 flex items-center border border-[#333] rounded-sm">
                    BORN: {gameState.totalBorn}
                  </div>
                  <div className="bg-black/60 px-3 flex items-center border border-[#333] rounded-sm">
                    SCORE: {String(gameState.score).padStart(4, '0')}
                  </div>
                </div>

                {/* Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#E4E3E0 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-8">
                  <div className="relative w-full aspect-square max-w-[500px] border border-[#222] bg-[#0F0F0F]">
                     {/* Static Grid */}
                     <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

                     {/* Social Links (Bonds) */}
                     <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                       {gameState.entities.filter(e => e.layer === activeLayer).map(e => {
                         if (e.status === 'terminated' || e.role === 'dog') return null;
                         return Object.entries(e.bonds).map(([allyId, level]) => {
                           if ((level as number) > -50 && (level as number) < 50) return null;
                           const ally = gameState.entities.find(a => a.id === allyId && a.layer === activeLayer);
                           if (!ally || ally.status === 'terminated') return null;
                           // Only draw once (avoid duplicate lines)
                           if (e.id < ally.id) {
                             const isAlliance = e.allianceId && e.allianceId === ally.allianceId;
                             const isRival = e.rivalId === ally.id || ally.rivalId === e.id || (level as number) < -50;
                             let strokeColor = "rgba(255,255,255,0.05)";
                             if (isAlliance) strokeColor = "rgba(0,255,255,0.2)";
                             else if (isRival) strokeColor = "rgba(255,0,0,0.2)";
                             
                             return (
                               <line 
                                 key={`${e.id}-${ally.id}`}
                                 x1={`${getScreenPos(e.x)}%`} 
                                 y1={`${getScreenPos(e.y)}%`} 
                                 x2={`${getScreenPos(ally.x)}%`} 
                                 y2={`${getScreenPos(ally.y)}%`} 
                                 stroke={strokeColor}
                                 strokeWidth={isAlliance || isRival ? "1.5" : "1"} 
                               />
                             );
                           }
                           return null;
                         });
                       })}
                     </svg>

                     {/* Structures (Buildings) */}
                     {gameState.structures.filter(s => s.layer === activeLayer).map(struct => (
                       <div 
                        key={struct.id}
                        className={`absolute flex items-center justify-center border ${struct.type === 'lab' ? 'border-blue-500 bg-blue-500/10 w-8 h-8' : 'border-white/20 bg-white/5 w-6 h-6'}`}
                        style={{ left: `${getScreenPos(struct.x)}%`, top: `${getScreenPos(struct.y)}%`, transform: 'translate(-50%, -50%)' }}
                       >
                         {struct.type === 'lab' ? (
                           <FlaskConical className="w-4 h-4 text-blue-400" />
                         ) : (
                           <Database className="w-3 h-3 opacity-20" />
                         )}
                         {struct.ownerId && (
                           <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-500 border border-black shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                         )}
                       </div>
                     ))}

                     {/* Entities Swarm */}
                     {gameState.entities.filter(en => en.layer === activeLayer).map((en) => {
                       if (en.status === 'terminated') return null;
                       
                       const isDog = en.role === 'dog';
                       const guildColor = en.guildId === 'Emerald Covenant' ? 'border-green-500' : 
                                         en.guildId === 'Crimson Nexus' ? 'border-red-500' : 
                                         en.guildId === 'Azure Void' ? 'border-blue-500' : 'border-[#E4E3E0]';
                       
                       let bgOverride = '';
                       if (activeLayer > 0) {
                         bgOverride = activeLayer % 2 === 1 ? 'bg-purple-900/40' : 'bg-red-900/40';
                       }
                       
                        return (
                         <motion.div
                            key={en.id}
                            className={`absolute flex flex-col items-center justify-center group`}
                            style={{ left: `${getScreenPos(en.x)}%`, top: `${getScreenPos(en.y)}%`, transform: 'translate(-50%, -50%)', zIndex: en.isLord ? 40 : (isDog ? 30 : 20) }}
                          >
                            {isDog ? (
                              <Zap className="w-4 h-4 text-red-500 fill-red-500/20" />
                            ) : (
                              <div className="relative flex flex-col items-center">
                                {en.isLord && (
                                  <motion.div 
                                    className="absolute -top-4 text-yellow-500"
                                    animate={{ y: [0, -2, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                  >
                                    <Crown className="w-3 h-3" />
                                  </motion.div>
                                )}
                                <div className={`w-2.5 h-2.5 rounded-full border ${guildColor} bg-black ring-offset-2 ${en.isLord ? 'ring-2 ring-yellow-500/50' : ''} ${bgOverride}`} />
                                
                                {/* Info Panel on Hover */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-[100] w-32">
                                  <div className="bg-black/90 border border-white/10 p-2 rounded-sm backdrop-blur-md translate-y-[-100%] mt-[-8px]">
                                    <p className="text-[8px] font-bold text-blue-400 mb-1">{en.id}</p>

                                    {en.allianceId && (
                                      <div className="mb-2">
                                        <p className="text-[6px] uppercase opacity-40">Syndicate</p>
                                        <p className="text-[7px] text-cyan-400 font-bold">{gameState.alliances.find(a => a.id === en.allianceId)?.name}</p>
                                      </div>
                                    )}

                                    {en.rivalId && (
                                      <div className="mb-2">
                                        <p className="text-[6px] uppercase opacity-40">Rival</p>
                                        <p className="text-[7px] text-red-500 font-bold">{en.rivalId}</p>
                                      </div>
                                    )}
                                    
                                    {en.traits.length > 0 && (
                                      <div className="mb-2">
                                        <p className="text-[6px] uppercase opacity-40">Traits</p>
                                        <div className="flex flex-wrap gap-1">
                                          {en.traits.map((t, i) => (
                                            <span key={i} className="text-[6px] text-green-400">#{t}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="mb-1">
                                      <p className="text-[6px] uppercase opacity-40">Reputation</p>
                                      <p className={`text-[7px] font-bold ${en.reputation > 0 ? 'text-green-400' : en.reputation < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {en.reputation > 0 ? '+' : ''}{en.reputation}
                                      </p>
                                    </div>

                                    {en.inventory.length > 0 && (
                                      <div>
                                        <p className="text-[6px] uppercase opacity-40">Loot</p>
                                        <div className="space-y-0.5">
                                          {en.inventory.slice(0, 3).map((item, i) => (
                                            <p key={i} className={`text-[6px] truncate ${
                                              item.rarity === 'Unique' ? 'text-yellow-500' :
                                              item.rarity === 'Rare' ? 'text-purple-500' :
                                              item.rarity === 'Magic' ? 'text-blue-400' : 'text-gray-400'
                                            }`}>
                                              {item.name}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {Math.random() < 0.01 && (
                                  <div className="absolute top-[-20px] bg-black/80 border border-white/10 px-2 py-0.5 rounded-full whitespace-nowrap z-50">
                                    <p className="text-[8px] tracking-tighter opacity-70 italic font-serif">"{en.thought}"</p>
                                  </div>
                                )}
                              </div>
                            )}
                         </motion.div>
                       );
                     })}

                     {/* Objective */}
                     <motion.div
                        className="absolute w-3 h-3 bg-white/10 border border-white/20 rotate-45 flex items-center justify-center"
                        style={{ left: `${getScreenPos(gameState.objective.x)}%`, top: `${getScreenPos(gameState.objective.y)}%`, transform: 'translate(-50%, -50%) rotate(45deg)' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                      >
                        <Crosshair className="w-2 h-2 text-white/50" />
                      </motion.div>

                      <div className="absolute bottom-2 left-2 flex flex-col gap-1 text-[8px] font-mono opacity-50 z-10 pointer-events-none">
                        <span>AXIOM GRID: {gameState.worldSize.toFixed(0)}x{gameState.worldSize.toFixed(0)}</span>
                        <span>LAYER: {activeLayer === 0 ? 'SURFACE' : activeLayer}</span>
                      </div>
                  </div>
                </div>

                <div className="p-4 border-t border-[#222222] flex items-center justify-center gap-12">
                  <button 
                    onClick={gameState.status === 'playing' ? handleStop : handleStart}
                    className={`flex items-center gap-2 px-8 py-2 rounded-sm border transition-all text-[11px] uppercase tracking-widest ${
                      gameState.status === 'playing' 
                        ? 'border-red-500/50 text-red-500 hover:bg-red-500/10' 
                        : 'border-[#E4E3E0] bg-[#E4E3E0] text-[#0A0A0A] hover:opacity-90'
                    }`}
                  >
                    {gameState.status === 'playing' ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    {gameState.status === 'playing' ? 'Recall Swarm' : 'Deploy Swarm'}
                  </button>

                  <button className="flex items-center gap-2 text-[11px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                    <RefreshCw className="w-3 h-3" />
                    Reset Stats
                  </button>
                </div>
              </motion.div>
            ) : activeTab === 'training' ? (
              <motion.div 
                key="training"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col p-8 bg-[#0F0F0F]"
              >
                <div className="max-w-xl mx-auto w-full space-y-8">
                  <div className="border-b border-[#222] pb-6">
                    <h2 className="text-xl font-medium mb-2">Training Configuration</h2>
                    <p className="text-xs opacity-40 italic">Optimization parameters for reinforcement learning.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-40">Epochs</label>
                        <input 
                          type="number" 
                          value={trainingParams.epochs}
                          onChange={(e) => setTrainingParams(p => ({ ...p, epochs: Number(e.target.value) }))}
                          disabled={isTraining}
                          className="w-full bg-[#1A1A1A] border border-[#222] p-3 text-sm focus:outline-none focus:border-[#E4E3E0] disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-40">Learning Rate</label>
                        <input 
                          type="number" 
                          step="0.001"
                          value={trainingParams.learningRate}
                          onChange={(e) => setTrainingParams(p => ({ ...p, learningRate: Number(e.target.value) }))}
                          disabled={isTraining}
                          className="w-full bg-[#1A1A1A] border border-[#222] p-3 text-sm focus:outline-none focus:border-[#E4E3E0] disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest opacity-40">Reward Function</label>
                      <div className="space-y-2">
                        {['balanced', 'aggressive', 'efficient'].map((type) => (
                          <button
                            key={type}
                            onClick={() => setTrainingParams(p => ({ ...p, rewardFunction: type as any }))}
                            disabled={isTraining}
                            className={`w-full text-left p-3 text-[11px] uppercase tracking-widest border transition-all ${
                              trainingParams.rewardFunction === type 
                                ? 'bg-[#E4E3E0] text-black border-[#E4E3E0]' 
                                : 'bg-transparent border-[#222] opacity-40 hover:opacity-100'
                            } disabled:opacity-50`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 pt-8">
                    <div className="relative h-20 bg-[#1A1A1A] border border-[#222] flex items-center justify-center overflow-hidden">
                      {isTraining ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.div 
                            className="h-full bg-blue-500/10 absolute left-0"
                            style={{ width: `${trainingProgress}%` }}
                          />
                          <div className="text-center z-10">
                            <p className="text-[10px] uppercase tracking-[0.2em] mb-1">Optimizing Weights...</p>
                            <p className="text-sm font-mono">{trainingProgress.toFixed(1)}%</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] uppercase tracking-[0.2em] opacity-20 italic">Awaiting Initiation</p>
                      )}
                    </div>

                    <button 
                      onClick={isTraining ? stopTraining : startTraining}
                      className={`w-full py-4 uppercase tracking-[0.3em] font-medium transition-all ${
                        isTraining 
                          ? 'border border-red-500/50 text-red-500 hover:bg-red-500/10' 
                          : 'bg-[#E4E3E0] text-black hover:opacity-90'
                      }`}
                    >
                      {isTraining ? 'Halt Training' : 'Start Optimization Cycle'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : activeTab === 'registry' ? (
              <motion.div 
                key="registry"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col p-8 bg-[#0F0F0F] overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto w-full space-y-8">
                  <div className="border-b border-[#222] pb-6">
                    <h2 className="text-xl font-medium mb-2">Agent Registry & Genetics</h2>
                    <p className="text-xs opacity-40 italic">Monitoring DNA traits and gathered artifacts across the swarm.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gameState.entities.filter(e => e.role !== 'dog' && e.status === 'active').map(entity => (
                      <div key={entity.id} className="bg-[#141414] border border-[#222] p-4 rounded-sm space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-400">{entity.id.split('-')[1]}</span>
                            <span className="text-[10px] uppercase opacity-40 tracking-widest">{entity.role}</span>
                          </div>
                          {entity.isLord && <Crown className="w-3 h-3 text-yellow-500" />}
                        </div>
                        
                        {entity.allianceId && (
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase opacity-40 tracking-tight">Syndicate</p>
                            <span className="text-[9px] text-cyan-400 font-bold">{gameState.alliances.find(a => a.id === entity.allianceId)?.name || 'Unknown'}</span>
                          </div>
                        )}

                        {entity.rivalId && (
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase opacity-40 tracking-tight">Vowed Nemesis</p>
                            <span className="text-[9px] text-red-500 font-bold font-mono">{entity.rivalId}</span>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase opacity-40 tracking-tight">Credits</p>
                            <span className="text-[10px] text-blue-400 font-mono">{entity.credits}</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] uppercase opacity-40 tracking-tight">Reputation</p>
                            <span className={`text-[10px] font-bold font-mono ${entity.reputation > 0 ? 'text-green-400' : entity.reputation < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                              {entity.reputation > 0 ? '+' : ''}{entity.reputation}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] uppercase opacity-40 tracking-tight">DNA Traits</p>
                          <div className="flex flex-wrap gap-1">
                            {entity.traits.length > 0 ? entity.traits.map((t, i) => (
                              <span key={i} className="text-[8px] bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded-sm border border-green-500/20 uppercase tracking-tighter font-mono">
                                {t}
                              </span>
                            )) : <span className="text-[8px] opacity-20 italic font-mono">NO MUTATIONS</span>}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[9px] uppercase opacity-40 tracking-tight">Inventory (Loot)</p>
                          <div className="grid grid-cols-1 gap-1">
                            {entity.inventory.length > 0 ? entity.inventory.map((item, i) => (
                              <div key={i} className={`text-[8px] px-2 py-1 border flex items-center justify-between font-mono ${
                                item.rarity === 'Unique' ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' :
                                item.rarity === 'Rare' ? 'border-purple-500 bg-purple-500/10 text-purple-500' :
                                item.rarity === 'Magic' ? 'border-blue-500 bg-blue-500/10 text-blue-500' :
                                'border-gray-500 bg-gray-500/10 text-gray-400 opacity-60'
                              }`}>
                                <span>{item.name}</span>
                                <span className="opacity-50 tracking-[0.2em]">{item.rarity}</span>
                              </div>
                            )) : <span className="text-[8px] opacity-20 italic font-mono">NO ARTIFACTS</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 border border-dashed border-[#333] rounded-sm bg-black/40">
                    <p className="text-[10px] opacity-30 leading-relaxed italic text-center">
                      Swarm connectivity status: Nominal. Political stability: {gameState.lordId ? 'Stable' : 'Volatile'}.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex items-center justify-center opacity-20 italic text-sm">
                Custom mode under development.
              </div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Sidebar - Logic Configuration */}
        <aside className="col-span-3 border-l border-[#222222] pl-6 flex flex-col gap-6">
          <section>
            <h2 className="text-[11px] uppercase tracking-widest opacity-50 italic serif mb-4">Space Integration</h2>
            <div className="space-y-4">
              <div className="group">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase opacity-40">State Dimensions</p>
                  <p className="text-[10px] font-mono opacity-20 group-hover:opacity-60">nrn-state-space.ts</p>
                </div>
                <div className="space-y-1">
                  {stateSpace.map((dim: any, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[#1A1A1A] p-2 border border-[#222]">
                      <span className="opacity-60">{dim.type}</span>
                      <span className="font-mono text-[10px] text-[#E4E3E0]">ACTIVE</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase opacity-40">Action Heads</p>
                  <p className="text-[10px] font-mono opacity-20 group-hover:opacity-60">nrn-action-space.ts</p>
                </div>
                <div className="space-y-1">
                  {Object.entries(actionSpace).map(([key, space]: [string, any], i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[#1A1A1A] p-2 border border-[#222]">
                      <span className="opacity-60 uppercase tracking-tighter">{key}</span>
                      <span className="font-mono text-[10px] text-[#E4E3E0]">{space.activationName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex-1 bg-[#141414] border border-[#222222] p-4 rounded-sm">
            <h3 className="text-[10px] uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
              <Database className="w-3 h-3" /> Training Buffer
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-[9px] opacity-40 uppercase">Samples</span>
                <span className="text-xl font-mono tracking-tighter">{trainingBufferTotal.toLocaleString()}</span>
              </div>
              <div className="h-1 bg-[#222] w-full rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-500" 
                  initial={{ width: '65%' }}
                  animate={{ width: `${Math.min(100, (trainingBufferTotal / 20000) * 100)}%` }}
                />
              </div>
              <p className="text-[9px] opacity-30 leading-relaxed italic">
                {isTraining ? 'Recording active telemetry...' : 'Awaiting batch normalization for architecture stalker_v4.'}
              </p>
            </div>
          </section>

          <section>
             <button className="w-full bg-[#1A1A1A] border border-[#333] hover:border-[#444] p-3 flex items-center justify-between transition-colors group">
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-widest opacity-40">Create New</p>
                  <p className="text-xs font-medium">Architecture Slot</p>
                </div>
                <Plus className="w-4 h-4 opacity-40 group-hover:opacity-100" />
             </button>
          </section>
        </aside>

      </main>

      {/* Decorative Corners */}
      <div className="fixed top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#E4E3E0]/20 pointer-events-none" />
      <div className="fixed top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#E4E3E0]/20 pointer-events-none" />
      <div className="fixed bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#E4E3E0]/20 pointer-events-none" />
      <div className="fixed bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#E4E3E0]/20 pointer-events-none" />
    </div>
  );
}
