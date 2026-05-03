import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Line, Trail, Sphere, Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Entity, Structure, Item } from '../types';

interface Map3DProps {
  gameState: GameState;
  activeLayer: number;
}

const ARENA_SIZE = 100;

function HexGrid({ size }: { size: number }) {
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <gridHelper args={[size, size / 2, '#333333', '#111111']} />
      {/* Outer boundary */}
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#0A0A0A" depthWrite={false} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function Node({ structure }: { structure: Structure }) {
  const getPosition = (x: number, y: number) => {
    return new THREE.Vector3(x - 50, 0, y - 50);
  };

  const isLab = structure.type === 'lab';
  const pos = getPosition(structure.x, structure.y);

  return (
    <group position={pos}>
      {isLab ? (
        <group>
          <mesh position={[0, 1, 0]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#3b82f6" wireframe />
          </mesh>
          <pointLight color="#3b82f6" distance={10} intensity={2} position={[0, 1, 0]} />
        </group>
      ) : (
        <group>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.5, 1, 1.5]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
        </group>
      )}
      {structure.ownerId && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color="#eab308" />
        </mesh>
      )}
    </group>
  );
}

function Agent({ entity }: { entity: Entity }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current && entity.status === 'active') {
      meshRef.current.position.lerp(new THREE.Vector3(entity.x - 50, 0.5, entity.y - 50), 0.1);
      if (entity.isLord) {
         meshRef.current.rotation.y += 0.02;
      }
    }
  });

  const isDog = entity.role === 'dog';
  let color = '#ffffff';
  if (isDog) color = '#ef4444';
  else if (entity.guildId === 'Emerald Covenant') color = '#22c55e';
  else if (entity.guildId === 'Crimson Nexus') color = '#ef4444';
  else if (entity.guildId === 'Azure Void') color = '#3b82f6';
  else color = '#e4e3e0';

  return (
    <group ref={meshRef} position={[entity.x - 50, 0.5, entity.y - 50]}>
      {isDog ? (
        <mesh>
          <coneGeometry args={[0.5, 1.5, 4]} />
          <meshStandardMaterial color={color} />
          <pointLight color={color} distance={5} intensity={1} />
        </mesh>
      ) : (
        <group>
          <Trail width={0.5} length={5} color={new THREE.Color(color)} attenuation={(t) => t * t}>
             <mesh position={[0, 0, 0]}>
                <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
             </mesh>
          </Trail>
          {entity.isLord && (
            <group position={[0, 1.5, 0]}>
              <mesh>
                <torusGeometry args={[0.4, 0.05, 8, 24]} />
                <meshBasicMaterial color="#eab308" />
              </mesh>
              <pointLight color="#eab308" distance={8} intensity={2} />
            </group>
          )}

          {/* Simple HTML overlay for ID/Thought on hover */}
          <Html distanceFactor={20} position={[0, 2, 0]} className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/80 text-white text-[8px] p-1 rounded font-mono border border-white/20">
              {entity.id}
              {entity.thought && <div className="text-gray-400 italic mt-0.5">"{entity.thought}"</div>}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}

function Bonds({ gameState, activeLayer }: { gameState: GameState, activeLayer: number }) {
  const lines = useMemo(() => {
    const l: Array<{start: THREE.Vector3, end: THREE.Vector3, color: string, isAllied: boolean}> = [];
    const activeEntities = gameState.entities.filter(e => e.layer === activeLayer && e.status === 'active' && e.role !== 'dog');
    
    activeEntities.forEach(e => {
      Object.entries(e.bonds).forEach(([allyId, level]) => {
        if ((level as number) > -50 && (level as number) < 50) return;
        const ally = activeEntities.find(a => a.id === allyId);
        if (!ally) return;
        
        if (e.id < ally.id) {
          const isAlliance = e.allianceId && e.allianceId === ally.allianceId;
          const isRival = e.rivalId === ally.id || ally.rivalId === e.id || (level as number) < -50;
          
          let color = '#ffffff';
          if (isAlliance) color = '#06b6d4';
          else if (isRival) color = '#ef4444';
          
          if (isAlliance || isRival) {
            l.push({
              start: new THREE.Vector3(e.x - 50, 0.5, e.y - 50),
              end: new THREE.Vector3(ally.x - 50, 0.5, ally.y - 50),
              color,
              isAllied: !!isAlliance
            });
          }
        }
      });
    });
    return l;
  }, [gameState, activeLayer]);

  return (
    <>
      {lines.map((line, i) => (
        <Line 
          key={i} 
          points={[line.start, line.end]} 
          color={line.color} 
          lineWidth={line.isAllied ? 2 : 1}
          transparent
          opacity={0.6}
        />
      ))}
    </>
  );
}

export default function Map3D({ gameState, activeLayer }: Map3DProps) {
  return (
    <div className="w-full h-full bg-[#050505]">
      <Canvas camera={{ position: [0, 40, 40], fov: 60 }}>
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 30, 90]} />
        
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 20, 10]} intensity={1.5} color="#4444ff" />
        <directionalLight position={[-10, 20, -10]} intensity={0.5} color="#ff4444" />
        
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

        <HexGrid size={ARENA_SIZE} />
        
        <Bonds gameState={gameState} activeLayer={activeLayer} />

        {gameState.structures.filter(s => s.layer === activeLayer).map(struct => (
          <Node key={struct.id} structure={struct} />
        ))}

        {gameState.entities.filter(e => e.layer === activeLayer).map(entity => (
          <Agent key={entity.id} entity={entity} />
        ))}

        {/* Objective */}
        <mesh position={[gameState.objective.x - 50, 1, gameState.objective.y - 50]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#ffffff" wireframe />
        </mesh>

        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={10} 
          maxDistance={80} 
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
    </div>
  );
}
