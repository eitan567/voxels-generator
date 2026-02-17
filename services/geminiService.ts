
import { GoogleGenAI, Type } from "@google/genai";
import { VoxelModel, ModelCategory, AnimationType, Voxel } from "../types";

export const generateVoxelImage = async (
  prompt: string,
  category: ModelCategory,
  options: { style: string, complexity: string } = { style: 'Modern', complexity: 'Detailed' }
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const styleDescription = options.style === 'Cyberpunk' ? 'Neon, dark, digital, glowing' : 
                          options.style === 'Retro' ? '8-bit, NES style, bright flat colors' :
                          options.style === 'Nature' ? 'Earthy, organic, soft lighting' : 
                          'Clean 3D Voxel Art, plastic toy finish, bright studio lighting';

  let layoutInstruction = "";
  
  if (category === 'character') {
      layoutInstruction = `
      **CRITICAL INSTRUCTION: YOU MUST CREATE A "CHARACTER TURNAROUND SHEET".**

      **LAYOUT:**
      - A single horizontal row containing exactly THREE distinct poses of the SAME character.
      - Pose 1 (Left): **FRONT VIEW** (Character facing the camera directly).
      - Pose 2 (Center): **SIDE VIEW** (Profile view, facing left or right). Must clearly show body thickness.
      - Pose 3 (Right): **3/4 FRONT VIEW** (Character is angled 45 degrees towards the camera, showing the front and one side).

      **CONTENT RULES (CHARACTER ONLY):**
      - The image must ONLY contain the character described in the prompt. The character is the SOLE subject.
      - DO NOT add any other objects, items, buildings, animals, or scenery.

      **BACKGROUND:**
      - Solid, plain, light grey background (#E5E7EB). NO gradients or floor shadows.
      `;
  } else if (category === 'animal') {
      layoutInstruction = `
      STRICT LAYOUT REQUIREMENT:
      Generate an "ANIMAL REFERENCE SHEET" with 3 views:
      1. Side Profile (Full length).
      2. Front Face.
      3. 3/4 Front View.
      `;
  } else {
      layoutInstruction = `
      STRICT LAYOUT REQUIREMENT:
      Generate an "OBJECT BLUEPRINT":
      1. Perspective View (Main).
      2. Front View.
      3. Top/Side View.
      `;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { text: `Create a Technical Voxel Reference Sheet for: "${prompt}".
        
        ${layoutInstruction}
        
        STYLE: ${styleDescription}.
        AESTHETIC: Chunky, Volumetric, Toy-like.
        ` }
      ]
    },
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Failed to generate concept sheet.");
};

export const generateVoxelModel = async (
  prompt: string, 
  category: ModelCategory,
  imageBase64?: string, 
  options: { style: string, complexity: string } = { style: 'Modern', complexity: 'Detailed' }
): Promise<VoxelModel> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';
  
  // Construct a prompt that forces "Box" based construction rather than point-cloud
  let strategy = "";
  if (category === 'character') {
      strategy = `
      CONSTRUCTION STRATEGY (BLOCKING):
      1. **Base Mesh**: Define the character using LARGE, SOLID CUBOIDS (Boxes).
         - e.g., A box for the Head, a box for the Torso, boxes for Legs.
         - **Torso**: Must be thick (Z-depth > 3).
         - **Head**: Must be a solid block.
      2. **Details**: Add individual voxels ONLY for fine details like eyes, buttons, or hair tips.
      `;
  } else {
      strategy = `
      CONSTRUCTION STRATEGY:
      Decompose the object into solid primitive boxes.
      `;
  }

  const systemInstruction = `
    You are a Voxel Architect. 
    Instead of listing thousands of points (which causes errors), you must define the model using **VOLUMETRIC PRIMITIVES (BOXES)**.
    
    Your output must contain an array of 'elements'. 
    An element can be a 'box' (which fills a region) or a 'voxel' (single point).

    ${strategy}

    **OPTIMIZATION IS CRITICAL:**
    - **MERGE VOXELS**: Always use the largest possible 'box' to represent volumes of the same color.
    - **DO NOT** list adjacent voxels individually. Merge them into a single 'box' element.
    - This drastically reduces output size and prevents generation errors.

    **RULES FOR IMAGE REPLICATION:**
    - Look at the image provided. 
    - Break it down into its core geometric shapes.
    - Match the colors from the image exactly.
    - **ENSURE SOLIDITY**: Do not leave gaps between the head and body. Overlap coordinates if necessary to ensure connection.

    COORDINATE SYSTEM:
    - X: Left/Right (Width)
    - Y: Up/Down (Height). 0 is the floor.
    - Z: Forward/Back (Depth).
    - Center the model roughly at X=0, Z=0.

    Output pure JSON matching the schema.
  `;

  const contents: any = { 
    parts: [{ text: systemInstruction }] 
  };

  if (imageBase64) {
    contents.parts.push({
      inlineData: {
        mimeType: "image/png",
        data: imageBase64.split(',')[1]
      }
    });
  }

  // Schema now supports 'box' type to enforce solidity
  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      maxOutputTokens: 32768, // Significantly increased to handle large JSON models
      thinkingConfig: { thinkingBudget: 4096 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING, enum: ['character', 'animal', 'object'] },
          suggestedAnimation: { type: Type.STRING, enum: ['idle', 'walk', 'run', 'attack', 'spin', 'float', 'none'] },
          elements: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['box', 'voxel'] },
                // Position (for 'box' this is the bottom-left-front corner)
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                z: { type: Type.INTEGER },
                // Size (Only required for 'box')
                width: { type: Type.INTEGER },
                height: { type: Type.INTEGER },
                depth: { type: Type.INTEGER },
                color: { type: Type.STRING },
                part: { 
                  type: Type.STRING, 
                  enum: ['head', 'torso', 'left_arm', 'right_arm', 'left_leg', 'right_leg', 'tail', 'base', 'wing_l', 'wing_r'] 
                }
              },
              required: ['type', 'x', 'y', 'z', 'color', 'part']
            }
          }
        },
        required: ['name', 'elements', 'category', 'suggestedAnimation']
      }
    }
  });

  try {
    let jsonStr = response.text.trim();
    // Sanitize in case markdown blocks are present despite responseMimeType
    if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "");
    }
    const parsed = JSON.parse(jsonStr);

    // POST-PROCESSING: Convert 'Boxes' into individual Voxels
    const finalVoxels: Voxel[] = [];

    parsed.elements.forEach((el: any) => {
      if (el.type === 'box') {
        // Enforce defaults if missing
        const w = el.width || 1;
        const h = el.height || 1;
        const d = el.depth || 1;

        // Fill the box
        for (let ix = 0; ix < w; ix++) {
          for (let iy = 0; iy < h; iy++) {
            for (let iz = 0; iz < d; iz++) {
              finalVoxels.push({
                x: el.x + ix,
                y: el.y + iy,
                z: el.z + iz,
                color: el.color,
                part: el.part
              });
            }
          }
        }
      } else {
        // It's a single voxel
        finalVoxels.push({
          x: el.x,
          y: el.y,
          z: el.z,
          color: el.color,
          part: el.part
        });
      }
    });

    return {
        id: crypto.randomUUID(),
        name: parsed.name,
        category: category,
        animation: parsed.suggestedAnimation,
        voxels: finalVoxels,
        metadata: {
            complexity: options.complexity,
            description: prompt,
            createdAt: Date.now(),
            suggestedAnimation: parsed.suggestedAnimation
        }
    } as VoxelModel;

  } catch (error) {
    console.error("Voxel Model Generation Error:", error);
    // Provide a more user-friendly error if it's a JSON parse error (likely truncation)
    if (error instanceof SyntaxError) {
        throw new Error("Model is too complex. Please try 'Simple' detail or a shorter prompt.");
    }
    throw new Error("Failed to construct 3D model. Please try again.");
  }
};
