
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBox } from '@react-three/cannon';
import { Voxel, AnimationType, BodyPart, ModelCategory } from '../types';
import * as THREE from 'three';

interface VoxelMeshProps {
  voxels: Voxel[];
  animation?: AnimationType;
  category?: ModelCategory;
  isEditMode?: boolean;
  isPhysicsEnabled?: boolean;
  onVoxelClick?: (index: number) => void;
  jointStiffness?: number;
}

const PhysicalVoxel = ({ voxel, originalIndex, onVoxelClick, isEditMode, jointStiffness = 0.5 }: any) => {
  const [ref] = useBox(() => ({
    mass: 1,
    position: [voxel.x, voxel.y, voxel.z],
    args: [0.95, 0.95, 0.95],
    linearDamping: 0.1 + (jointStiffness * 0.5),
    angularDamping: 0.1 + (jointStiffness * 0.5),
  }));

  return (
    <mesh 
      ref={ref as any} 
      castShadow 
      receiveShadow
      onClick={(e) => {
        if (isEditMode) {
          e.stopPropagation();
          onVoxelClick?.(originalIndex);
        }
      }}
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
      <meshStandardMaterial 
        color={voxel.color} 
        roughness={0.5} 
        metalness={0.1}
      />
    </mesh>
  );
};

const VoxelMesh: React.FC<VoxelMeshProps> = ({ 
  voxels, 
  animation = 'none', 
  category = 'character',
  isEditMode = false,
  isPhysicsEnabled = false,
  onVoxelClick,
  jointStiffness = 0.5
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const partsRefs = useRef<Record<string, THREE.Group | null>>({});

  const { groupedVoxels, centerOffset, partPivots } = useMemo(() => {
    const groups: Partial<Record<BodyPart, { voxel: Voxel; originalIndex: number }[]>> = {};
    const pivots: Record<string, THREE.Vector3> = {};
    
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    voxels.forEach((v, i) => {
      if (!groups[v.part]) groups[v.part] = [];
      groups[v.part]!.push({ voxel: v, originalIndex: i });
      
      minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); minZ = Math.min(minZ, v.z);
      maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); maxZ = Math.max(maxZ, v.z);
    });

    Object.entries(groups).forEach(([part, data]) => {
      if (!data) return;
      const pVoxels = data.map(d => d.voxel);
      const partMinY = Math.min(...pVoxels.map(v => v.y));
      const partMaxY = Math.max(...pVoxels.map(v => v.y));
      const partCenterX = (Math.min(...pVoxels.map(v => v.x)) + Math.max(...pVoxels.map(v => v.x))) / 2;
      const partCenterZ = (Math.min(...pVoxels.map(v => v.z)) + Math.max(...pVoxels.map(v => v.z))) / 2;
      
      let pivotY = (partMinY + partMaxY) / 2;
      if (part.includes('leg') || part.includes('arm')) pivotY = partMaxY;
      if (part === 'head') pivotY = partMinY;

      pivots[part] = new THREE.Vector3(partCenterX, pivotY, partCenterZ);
    });

    return {
      groupedVoxels: groups as Record<BodyPart, { voxel: Voxel; originalIndex: number }[]>,
      centerOffset: [-(minX + maxX) / 2, -minY, -(minZ + maxZ) / 2],
      partPivots: pivots
    };
  }, [voxels]);

  useFrame((state) => {
    if (!rootGroupRef.current || isPhysicsEnabled) return;
    const t = state.clock.getElapsedTime();
    const refs = partsRefs.current;
    const flex = (1.0 - jointStiffness) * 2.0;

    // Reset loop
    (Object.entries(refs) as [string, THREE.Group | null][]).forEach(([part, ref]) => {
      if (ref && partPivots[part]) {
        const p = partPivots[part];
        ref.position.set(p.x, p.y, p.z);
        ref.rotation.set(0, 0, 0);
      }
    });

    rootGroupRef.current.position.y = centerOffset[1] as number;
    rootGroupRef.current.rotation.set(0,0,0);

    if (animation === 'none' || isEditMode) return;

    // --- Object Animations ---
    if (category === 'object') {
       if (animation === 'spin') {
          rootGroupRef.current.rotation.y = t;
          rootGroupRef.current.position.y += Math.sin(t * 2) * 0.1;
       }
       if (animation === 'float') {
          rootGroupRef.current.position.y += Math.sin(t) * 0.3;
          rootGroupRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
          rootGroupRef.current.rotation.z = Math.cos(t * 0.4) * 0.05;
       }
       // Objects can also have 'idle' (just a gentle breath)
       if (animation === 'idle') {
          rootGroupRef.current.position.y += Math.sin(t) * 0.05;
       }
       return; 
    }

    // --- Character / Animal Animations ---
    if (animation === 'idle') {
      const breathe = Math.sin(t * 2) * 0.05 * flex;
      if (refs.torso) refs.torso.position.y += breathe;
      if (refs.head) {
        refs.head.position.y += breathe * 0.5;
        refs.head.rotation.x = Math.sin(t * 1.5) * 0.05 * flex;
      }
      if (refs.tail) refs.tail.rotation.x = Math.sin(t * 3) * 0.1 * flex;
      if (refs.wing_l) refs.wing_l.rotation.z = Math.sin(t * 4) * 0.2;
      if (refs.wing_r) refs.wing_r.rotation.z = -Math.sin(t * 4) * 0.2;
      
      // Arm sway
      if (refs.left_arm) refs.left_arm.rotation.z = (0.1 + Math.sin(t * 2) * 0.05) * flex;
      if (refs.right_arm) refs.right_arm.rotation.z = (-0.1 - Math.sin(t * 2) * 0.05) * flex;
    }

    if (animation === 'walk' || animation === 'run') {
      const speed = animation === 'run' ? 10 : 6;
      const intensity = (animation === 'run' ? 0.6 : 0.4) * flex;
      const cycle = t * speed;
      
      rootGroupRef.current.position.y += Math.abs(Math.sin(cycle)) * 0.2 * flex;
      rootGroupRef.current.rotation.x = Math.sin(cycle) * 0.05 * flex;
      
      if (refs.left_leg) refs.left_leg.rotation.x = Math.sin(cycle) * intensity;
      if (refs.right_leg) refs.right_leg.rotation.x = Math.sin(cycle + Math.PI) * intensity;
      
      // Arms opposite to legs
      if (refs.left_arm) refs.left_arm.rotation.x = Math.sin(cycle + Math.PI) * intensity;
      if (refs.right_arm) refs.right_arm.rotation.x = Math.sin(cycle) * intensity;
      
      if (refs.head) refs.head.rotation.x = Math.sin(cycle * 2) * 0.05 * flex;
      if (refs.tail) refs.tail.rotation.x = Math.sin(cycle * 2) * 0.2 * flex;
      
      if (refs.wing_l) refs.wing_l.rotation.z = Math.sin(cycle * 2) * 0.5;
      if (refs.wing_r) refs.wing_r.rotation.z = -Math.sin(cycle * 2) * 0.5;
    }

    if (animation === 'jump') {
      const jumpCycle = t * 4;
      const height = Math.max(0, Math.sin(jumpCycle) * 3);
      rootGroupRef.current.position.y += height;
      if (height > 0.5) {
        if (refs.left_leg) refs.left_leg.rotation.x = -0.5 * flex;
        if (refs.right_leg) refs.right_leg.rotation.x = -0.5 * flex;
        if (refs.left_arm) refs.left_arm.rotation.x = 0.3 * flex;
        if (refs.right_arm) refs.right_arm.rotation.x = 0.3 * flex;
        if (refs.wing_l) refs.wing_l.rotation.z = 0.8;
        if (refs.wing_r) refs.wing_r.rotation.z = -0.8;
      }
    }

    if (animation === 'attack') {
      const strike = Math.sin(t * 8);
      if (refs.torso) refs.torso.rotation.y = strike * 0.3 * flex;
      if (refs.right_arm) refs.right_arm.rotation.x = (-Math.PI / 2 + strike * 1.5) * flex;
      if (refs.head) refs.head.rotation.y = strike * 0.2 * flex;
    }
  });

  if (isPhysicsEnabled) {
    return (
      <group position={[centerOffset[0], 0, centerOffset[2]] as [number, number, number]}>
        {voxels.map((voxel, i) => (
          <PhysicalVoxel 
            key={`${i}-${voxel.x}-${voxel.y}-${voxel.z}`} 
            voxel={voxel} 
            originalIndex={i} 
            onVoxelClick={onVoxelClick}
            isEditMode={isEditMode}
            jointStiffness={jointStiffness}
          />
        ))}
      </group>
    );
  }

  return (
    <group ref={rootGroupRef} position={[centerOffset[0], centerOffset[1], centerOffset[2]] as [number, number, number]}>
      {(Object.entries(groupedVoxels) as [BodyPart, {voxel: Voxel, originalIndex: number}[]][]).map(([part, data]) => {
        const pivot = partPivots[part];
        return (
          <group 
            key={part} 
            ref={el => partsRefs.current[part] = el}
            position={[pivot.x, pivot.y, pivot.z]}
          >
            <group position={[-pivot.x, -pivot.y, -pivot.z]}>
              {data.map(({voxel, originalIndex}) => (
                <mesh 
                  key={`${originalIndex}-${voxel.x}-${voxel.y}-${voxel.z}`} 
                  position={[voxel.x, voxel.y, voxel.z]} 
                  castShadow 
                  receiveShadow
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      onVoxelClick?.(originalIndex);
                    }
                  }}
                >
                  <boxGeometry args={[0.95, 0.95, 0.95]} />
                  <meshStandardMaterial 
                    color={voxel.color} 
                    roughness={0.5} 
                    metalness={0.1}
                    emissive={isEditMode ? voxel.color : '#000'}
                    emissiveIntensity={isEditMode ? 0.2 : 0}
                  />
                </mesh>
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
};

export default VoxelMesh;
