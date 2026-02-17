
export type BodyPart = 'head' | 'torso' | 'left_arm' | 'right_arm' | 'left_leg' | 'right_leg' | 'tail' | 'base' | 'wing_l' | 'wing_r';

export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
  part: BodyPart;
}

export type ModelCategory = 'character' | 'animal' | 'object';

export type AnimationType = 'none' | 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'spin' | 'float';

export interface VoxelModel {
  id: string;
  name: string;
  voxels: Voxel[];
  category: ModelCategory;
  animation?: AnimationType;
  metadata?: {
    complexity: string;
    description: string;
    createdAt: number;
    suggestedAnimation?: AnimationType;
  };
}

export enum GenerationStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}
