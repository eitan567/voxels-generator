
import React, { useState, useCallback, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Physics, usePlane } from '@react-three/cannon';
import { generateVoxelModel, generateVoxelImage } from './services/geminiService';
import { VoxelModel, GenerationStatus, AnimationType, ModelCategory } from './types';
import VoxelMesh from './components/VoxelMesh';
import UIOverlay from './components/UIOverlay';

const STORAGE_KEY = 'voxelgen_saved_models';

const Ground = () => {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], position: [0, -0.1, 0] }));
  return (
    <mesh ref={ref as any} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial transparent opacity={0} />
    </mesh>
  );
};

const VoxelStage = () => {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Platform */}
      <mesh receiveShadow position={[0, -0.25, 0]}>
        <cylinderGeometry args={[6, 7, 0.5, 64]} />
        <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.8} />
      </mesh>
       <mesh receiveShadow position={[0, -0.24, 0]}>
        <cylinderGeometry args={[5.5, 5.5, 0.55, 64]} />
        <meshStandardMaterial color="#334155" metalness={0.1} roughness={1} />
      </mesh>
      {/* Glow Ring */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[6.2, 6.4, 64]} />
         <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<ModelCategory>('character');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [currentModel, setCurrentModel] = useState<VoxelModel | null>(null);
  const [savedModels, setSavedModels] = useState<VoxelModel[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // New States
  const [conceptImage, setConceptImage] = useState<string | null>(null);
  const [genOptions, setGenOptions] = useState({ style: 'Modern', complexity: 'Detailed' });
  
  // Edit & Physics State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(false);
  const [editTool, setEditTool] = useState<'paint' | 'erase'>('paint');
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [jointStiffness, setJointStiffness] = useState(0.5); // 0 (loose) to 1 (rigid)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setSavedModels(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedModels));
  }, [savedModels]);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setStatus(GenerationStatus.THINKING);
    setError(null);
    try {
      const img = await generateVoxelImage(prompt, category, genOptions);
      setConceptImage(img);
      setStatus(GenerationStatus.IDLE);
    } catch (err: any) {
      setError("Concept generation failed.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  const handleGenerateModel = useCallback(async (imageBase64?: string) => {
    const activePrompt = prompt || "Concept from image";
    const activeImage = imageBase64 || conceptImage || undefined;

    setStatus(GenerationStatus.GENERATING);
    setError(null);
    setIsEditMode(false);
    setIsPhysicsEnabled(false);
    
    try {
      const modelData = await generateVoxelModel(activePrompt, category, activeImage, genOptions);
      const newModel: VoxelModel = {
        ...modelData,
        id: crypto.randomUUID(),
        // Use AI suggestion or default to none
        animation: modelData.metadata?.suggestedAnimation || 'none',
        category: category,
        metadata: {
          complexity: genOptions.complexity,
          description: activePrompt,
          createdAt: Date.now(),
          suggestedAnimation: modelData.metadata?.suggestedAnimation
        }
      };
      setCurrentModel(newModel);
      setStatus(GenerationStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || 'Error during voxelization.');
      setStatus(GenerationStatus.ERROR);
    }
  }, [prompt, category, conceptImage, genOptions]);

  const handleVoxelClick = (index: number) => {
    if (!isEditMode || !currentModel) return;
    const newVoxels = [...currentModel.voxels];
    if (editTool === 'erase') {
      newVoxels.splice(index, 1);
    } else {
      newVoxels[index] = { ...newVoxels[index], color: brushColor };
    }
    setCurrentModel({ ...currentModel, voxels: newVoxels });
  };

  const handleSave = () => {
    if (currentModel) {
      const exists = savedModels.find(m => m.id === currentModel.id);
      if (exists) {
        setSavedModels(prev => prev.map(m => m.id === currentModel.id ? currentModel : m));
      } else {
        setSavedModels(prev => [currentModel, ...prev]);
      }
    }
  };

  const setAnimation = (anim: AnimationType) => {
    if (currentModel) {
      setCurrentModel({ ...currentModel, animation: anim });
      if (anim !== 'none') {
        setIsEditMode(false);
        setIsPhysicsEnabled(false);
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#0f172a] font-sans text-slate-100 overflow-hidden select-none">
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 to-slate-950">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[20, 20, 25]} fov={35} />
          
          <ambientLight intensity={0.6} />
          <spotLight 
            position={[10, 20, 10]} 
            angle={0.5} 
            penumbra={1} 
            intensity={1.5} 
            castShadow 
            shadow-bias={-0.0001}
          />
          <pointLight position={[-10, 10, -10]} intensity={0.5} color="#cbd5e1" />
          
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81 * (1 + jointStiffness), 0]}>
              <group position={[0, 0, 0]}>
                <VoxelStage />
                {currentModel && (
                  <VoxelMesh 
                    voxels={currentModel.voxels} 
                    animation={currentModel.animation} 
                    category={currentModel.category}
                    isEditMode={isEditMode}
                    isPhysicsEnabled={isPhysicsEnabled}
                    onVoxelClick={handleVoxelClick}
                    jointStiffness={jointStiffness}
                  />
                )}
                <Ground />
              </group>
            </Physics>
            
            <Environment preset="city" blur={0.8} background={false} />
            <ContactShadows position={[0, -0.1, 0]} opacity={0.4} scale={20} blur={2} far={4} />
          </Suspense>
          
          <OrbitControls 
            makeDefault 
            enabled={!isEditMode} 
            autoRotate={status === GenerationStatus.IDLE && !!currentModel && currentModel.animation === 'spin'} 
            autoRotateSpeed={2.0}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.1}
            enableDamping
          />
        </Canvas>
      </div>

      <UIOverlay 
        prompt={prompt}
        setPrompt={setPrompt}
        category={category}
        setCategory={setCategory}
        onGenerate={handleGenerateModel}
        onGenerateImage={handleGenerateImage}
        status={status}
        error={error}
        model={currentModel}
        conceptImage={conceptImage}
        setConceptImage={setConceptImage}
        onReset={() => { setCurrentModel(null); setIsPhysicsEnabled(false); setConceptImage(null); }}
        onSave={handleSave}
        savedModels={savedModels}
        onLoad={(m) => { setCurrentModel(m); setStatus(GenerationStatus.SUCCESS); setIsPhysicsEnabled(false); setCategory(m.category || 'character'); }}
        onDelete={(id) => setSavedModels(prev => prev.filter(m => m.id !== id))}
        onSetAnimation={setAnimation}
        isEditMode={isEditMode}
        setIsEditMode={setIsEditMode}
        isPhysicsEnabled={isPhysicsEnabled}
        setIsPhysicsEnabled={setIsPhysicsEnabled}
        editTool={editTool}
        setEditTool={setEditTool}
        brushColor={brushColor}
        setBrushColor={setBrushColor}
        genOptions={genOptions}
        setGenOptions={setGenOptions}
        jointStiffness={jointStiffness}
        setJointStiffness={setJointStiffness}
      />
    </div>
  );
};

export default App;
