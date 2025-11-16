import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Grid, useTexture } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { VisualizationMode } from '../types';
import { useAppStore } from '../store';
import { 
  RotationLookupTable, 
  calculateRotationFromTimestamp,
  calculateShortestRotation 
} from '../utils/rotationCalculation';
import { getWebGLCapabilities } from '../utils/webglDetection';

interface ThreeDRendererProps {
  meshUrl: string | null;
  crackMapUrl?: string | null;
  depthMapUrl?: string | null;
}

interface DamageRegion {
  center: THREE.Vector3;
  radius: number;
  intensity: number;
}

// Parse crack map image to identify damaged regions
const parseCrackMapData = async (crackMapUrl: string): Promise<DamageRegion[]> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve([]);
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const regions: DamageRegion[] = [];
      
      // Sample the image to find high-intensity red pixels (cracks)
      const sampleRate = 10; // Sample every 10th pixel for performance
      const threshold = 100; // Red intensity threshold
      
      for (let y = 0; y < canvas.height; y += sampleRate) {
        for (let x = 0; x < canvas.width; x += sampleRate) {
          const idx = (y * canvas.width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // Detect red pixels (cracks) - high red, low green/blue
          if (r > threshold && r > g * 1.5 && r > b * 1.5) {
            // Convert pixel coordinates to UV coordinates (0-1 range)
            const u = x / canvas.width;
            const v = 1.0 - (y / canvas.height); // Flip V coordinate
            
            // Map UV to 3D sphere coordinates (simplified tyre surface)
            const theta = u * Math.PI * 2;
            const phi = v * Math.PI;
            
            const radius = 1.0; // Approximate tyre radius
            const center = new THREE.Vector3(
              radius * Math.sin(phi) * Math.cos(theta),
              radius * Math.cos(phi),
              radius * Math.sin(phi) * Math.sin(theta)
            );
            
            const intensity = r / 255.0;
            
            regions.push({
              center,
              radius: 0.1,
              intensity
            });
          }
        }
      }
      
      resolve(regions);
    };
    
    img.onerror = () => {
      resolve([]);
    };
    
    img.src = crackMapUrl;
  });
};

// Damage highlight shader material with glowing red edges
const DamageHighlightMaterial: React.FC<{ 
  damageRegions: DamageRegion[];
  baseColor?: THREE.Color;
}> = ({ damageRegions, baseColor = new THREE.Color('#F5F5F5') }) => {
  const { camera } = useThree();
  
  // Convert damage regions to shader uniforms
  const damagePositions = useMemo(() => {
    const positions = new Float32Array(damageRegions.length * 3);
    damageRegions.forEach((region, i) => {
      positions[i * 3] = region.center.x;
      positions[i * 3 + 1] = region.center.y;
      positions[i * 3 + 2] = region.center.z;
    });
    return positions;
  }, [damageRegions]);
  
  const damageRadii = useMemo(() => {
    return new Float32Array(damageRegions.map(r => r.radius));
  }, [damageRegions]);
  
  const damageIntensities = useMemo(() => {
    return new Float32Array(damageRegions.map(r => r.intensity));
  }, [damageRegions]);
  
  const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(normalMatrix * normal);
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  
  const fragmentShader = `
    uniform vec3 baseColor;
    uniform vec3 damageColor;
    uniform vec3 cameraPosition;
    uniform float damageCount;
    uniform vec3 damagePositions[100];
    uniform float damageRadii[100];
    uniform float damageIntensities[100];
    uniform float glowIntensity;
    uniform float edgeThickness;
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      // Base lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(vNormal, lightDir), 0.0);
      vec3 litColor = baseColor * (0.3 + 0.7 * diffuse);
      
      // Calculate damage influence
      float totalDamage = 0.0;
      float maxIntensity = 0.0;
      
      int count = int(damageCount);
      for (int i = 0; i < 100; i++) {
        if (i >= count) break;
        
        vec3 damagePos = damagePositions[i];
        float damageRadius = damageRadii[i];
        float damageIntensity = damageIntensities[i];
        
        float dist = distance(vWorldPosition, damagePos);
        
        // Create glowing effect with falloff
        if (dist < damageRadius) {
          float influence = 1.0 - (dist / damageRadius);
          influence = pow(influence, 2.0); // Sharper falloff
          totalDamage += influence * damageIntensity;
          maxIntensity = max(maxIntensity, damageIntensity);
        }
      }
      
      // Edge detection for glowing outline
      vec3 viewDir = normalize(vViewPosition);
      float edgeFactor = 1.0 - abs(dot(vNormal, viewDir));
      edgeFactor = pow(edgeFactor, edgeThickness);
      
      // Combine damage with edge glow
      float damageGlow = totalDamage * edgeFactor * glowIntensity;
      damageGlow = clamp(damageGlow, 0.0, 1.0);
      
      // Mix base color with damage color
      vec3 finalColor = mix(litColor, damageColor, damageGlow);
      
      // Add extra glow for high damage areas
      if (totalDamage > 0.5) {
        finalColor += damageColor * damageGlow * 0.5;
      }
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
  
  return (
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={{
        baseColor: { value: baseColor },
        damageColor: { value: new THREE.Color('#FF1801') },
        cameraPosition: { value: camera.position },
        damageCount: { value: Math.min(damageRegions.length, 100) },
        damagePositions: { value: damagePositions },
        damageRadii: { value: damageRadii },
        damageIntensities: { value: damageIntensities },
        glowIntensity: { value: 2.5 },
        edgeThickness: { value: 3.0 }
      }}
    />
  );
};

// Depth fog shader material
const DepthFogMaterial = () => {
  const { camera } = useThree();
  
  const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fragmentShader = `
    uniform vec3 cameraPosition;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    
    void main() {
      float depth = distance(vWorldPosition, cameraPosition);
      float fogFactor = smoothstep(fogNear, fogFar, depth);
      
      // Base color with lighting
      vec3 baseColor = vec3(0.96, 0.96, 0.96); // Soft white
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diffuse = max(dot(vNormal, lightDir), 0.0);
      vec3 litColor = baseColor * (0.3 + 0.7 * diffuse);
      
      // Mix with fog based on depth
      vec3 finalColor = mix(litColor, fogColor, fogFactor);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;
  
  return (
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={{
        cameraPosition: { value: camera.position },
        fogColor: { value: new THREE.Color('#FF1801') },
        fogNear: { value: 2.0 },
        fogFar: { value: 10.0 }
      }}
    />
  );
};



// Helper function to create LOD levels for a mesh
const createLODLevels = (originalMesh: THREE.Mesh): THREE.LOD => {
  const lod = new THREE.LOD();
  
  // Level 0: Full detail (original mesh)
  const highDetailMesh = originalMesh.clone();
  lod.addLevel(highDetailMesh, 0);
  
  // Level 1: Medium detail (50% vertices)
  const mediumDetailMesh = originalMesh.clone();
  if (mediumDetailMesh.geometry) {
    const simplifiedGeometry = simplifyGeometry(mediumDetailMesh.geometry, 0.5);
    mediumDetailMesh.geometry = simplifiedGeometry;
  }
  lod.addLevel(mediumDetailMesh, 5);
  
  // Level 2: Low detail (25% vertices)
  const lowDetailMesh = originalMesh.clone();
  if (lowDetailMesh.geometry) {
    const simplifiedGeometry = simplifyGeometry(lowDetailMesh.geometry, 0.25);
    lowDetailMesh.geometry = simplifiedGeometry;
  }
  lod.addLevel(lowDetailMesh, 10);
  
  return lod;
};

// Simple geometry simplification using vertex decimation
const simplifyGeometry = (geometry: THREE.BufferGeometry, ratio: number): THREE.BufferGeometry => {
  const simplified = geometry.clone();
  
  // Get position attribute
  const positionAttribute = simplified.getAttribute('position');
  if (!positionAttribute) return simplified;
  
  const positions = positionAttribute.array;
  const vertexCount = positions.length / 3;
  const targetVertexCount = Math.floor(vertexCount * ratio);
  
  // Simple decimation: keep every nth vertex
  const step = Math.max(1, Math.floor(vertexCount / targetVertexCount));
  const newPositions: number[] = [];
  
  for (let i = 0; i < vertexCount; i += step) {
    const idx = i * 3;
    newPositions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
  }
  
  // Create new geometry with simplified vertices
  const newGeometry = new THREE.BufferGeometry();
  newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  
  // Copy other attributes if they exist
  if (simplified.getAttribute('normal')) {
    newGeometry.computeVertexNormals();
  }
  if (simplified.getAttribute('uv')) {
    const uvAttribute = simplified.getAttribute('uv');
    const uvs = uvAttribute.array;
    const newUvs: number[] = [];
    for (let i = 0; i < vertexCount; i += step) {
      const idx = i * 2;
      newUvs.push(uvs[idx], uvs[idx + 1]);
    }
    newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
  }
  
  return newGeometry;
};

// Component to load and display the GLB mesh with auto-rotate and visualization modes
const TyreMesh: React.FC<{ 
  url: string; 
  autoRotate: boolean;
  visualizationMode: VisualizationMode;
  crackMapUrl?: string | null;
  depthMapUrl?: string | null;
  syncWithVideo: boolean;
  videoTimestamp: number;
  videoDuration: number;
}> = ({ url, autoRotate, visualizationMode, crackMapUrl, depthMapUrl, syncWithVideo, videoTimestamp, videoDuration }) => {
  let scene: THREE.Group;
  
  try {
    const gltf = useGLTF(url);
    scene = gltf.scene;
  } catch (error) {
    console.error('Error loading GLB mesh:', error);
    throw new Error(`Failed to load 3D model: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  const meshRef = useRef<THREE.Group>(null);
  const [clonedScene, setClonedScene] = useState<THREE.Group | null>(null);
  const [damageRegions, setDamageRegions] = useState<DamageRegion[]>([]);
  const [showDamageHighlight, setShowDamageHighlight] = useState(false);
  const targetRotationRef = useRef<number>(0);
  const [lookupTable, setLookupTable] = useState<RotationLookupTable | null>(null);
  const { camera } = useThree();
  
  // Load textures if available
  const crackTexture = crackMapUrl ? useTexture(crackMapUrl) : null;
  const depthTexture = depthMapUrl ? useTexture(depthMapUrl) : null;
  
  // Parse crack map data when it changes
  useEffect(() => {
    if (crackMapUrl) {
      parseCrackMapData(crackMapUrl).then((regions) => {
        setDamageRegions(regions);
        setShowDamageHighlight(regions.length > 0);
      });
    } else {
      setDamageRegions([]);
      setShowDamageHighlight(false);
    }
  }, [crackMapUrl]);
  
  // Clone the scene and apply LOD optimization
  useEffect(() => {
    const clone = scene.clone();
    
    // Apply LOD to all meshes in the scene
    const lodGroup = new THREE.Group();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const lod = createLODLevels(child);
        lod.position.copy(child.position);
        lod.rotation.copy(child.rotation);
        lod.scale.copy(child.scale);
        lodGroup.add(lod);
      } else if (!(child instanceof THREE.Mesh)) {
        // Keep non-mesh objects as-is
        lodGroup.add(child.clone());
      }
    });
    
    setClonedScene(lodGroup);
  }, [scene]);
  
  // Initialize rotation lookup table when video duration is available
  useEffect(() => {
    if (videoDuration > 0) {
      const table = new RotationLookupTable(videoDuration);
      setLookupTable(table);
    }
  }, [videoDuration]);
  
  // Apply visualization mode to all meshes in the scene (including LOD levels)
  useEffect(() => {
    if (!clonedScene) return;
    
    const applyMaterialToMesh = (mesh: THREE.Mesh) => {
      switch (visualizationMode) {
        case 'wireframe':
          mesh.material = new THREE.MeshBasicMaterial({
            color: '#F5F5F5',
            wireframe: true,
            wireframeLinewidth: 1
          });
          break;
          
        case 'crackHeatmap':
          if (crackTexture) {
            // Use compressed texture if available
            const material = new THREE.MeshBasicMaterial({
              map: crackTexture,
              color: '#FF1801' // Red tint for crack overlay
            });
            mesh.material = material;
          } else {
            // Fallback to red material if no crack map available
            mesh.material = new THREE.MeshStandardMaterial({
              color: '#FF1801',
              emissive: '#FF1801',
              emissiveIntensity: 0.3
            });
          }
          break;
          
        case 'depthFog':
          // Depth fog is handled by custom shader
          break;
          
        case 'normalMap':
          mesh.material = new THREE.MeshNormalMaterial();
          break;
          
        case 'geometry':
          mesh.material = new THREE.MeshStandardMaterial({
            color: '#F5F5F5',
            metalness: 0.1,
            roughness: 0.8,
            flatShading: true
          });
          break;
          
        case 'texture':
        default:
          // Use original material or standard material
          if (!mesh.material || visualizationMode === 'texture') {
            mesh.material = new THREE.MeshStandardMaterial({
              color: '#F5F5F5',
              metalness: 0.2,
              roughness: 0.7
            });
          }
          break;
      }
      
      // Enable frustum culling for all materials
      if (mesh.material) {
        mesh.frustumCulled = true;
      }
    };
    
    clonedScene.traverse((child) => {
      if (child instanceof THREE.LOD) {
        // Apply materials to all LOD levels
        child.levels.forEach((level) => {
          if (level.object instanceof THREE.Mesh) {
            applyMaterialToMesh(level.object);
          }
        });
      } else if (child instanceof THREE.Mesh) {
        applyMaterialToMesh(child);
      }
    });
  }, [clonedScene, visualizationMode, crackTexture, depthTexture, damageRegions, showDamageHighlight]);
  
  // Update target rotation when video timestamp changes
  useEffect(() => {
    if (syncWithVideo && videoDuration > 0) {
      // Use lookup table if available, otherwise fall back to simple calculation
      const targetRotation = lookupTable 
        ? lookupTable.getRotationAtTimestamp(videoTimestamp)
        : calculateRotationFromTimestamp(videoTimestamp, videoDuration);
      
      targetRotationRef.current = targetRotation;
    }
  }, [syncWithVideo, videoTimestamp, videoDuration, lookupTable]);
  
  // Auto-rotate animation and video sync rotation
  useFrame((_state, delta) => {
    if (!meshRef.current) return;
    
    if (syncWithVideo && videoDuration > 0) {
      // Smooth rotation transition using lerp (linear interpolation)
      const lerpFactor = 0.1; // Smoothing factor (0-1, higher = faster transition)
      const currentRotation = meshRef.current.rotation.y;
      const targetRotation = targetRotationRef.current;
      
      // Calculate the shortest rotation path using utility function
      const rotationDiff = calculateShortestRotation(currentRotation, targetRotation);
      
      // Apply lerp for smooth transition
      meshRef.current.rotation.y = currentRotation + rotationDiff * lerpFactor;
    } else if (autoRotate) {
      // Auto-rotate when not synced with video
      meshRef.current.rotation.y += delta * 0.5; // Rotate at 0.5 radians per second
    }
    
    // Update LOD levels based on camera distance
    if (clonedScene) {
      clonedScene.traverse((child) => {
        if (child instanceof THREE.LOD) {
          child.update(camera);
        }
      });
    }
  });
  
  if (!clonedScene) return null;
  
  // Get the first mesh geometry for custom shaders
  const firstMesh = clonedScene.children.find(child => child instanceof THREE.Mesh) as THREE.Mesh | undefined;
  
  // For depth fog mode, wrap in a group with custom shader
  if (visualizationMode === 'depthFog' && firstMesh) {
    return (
      <group ref={meshRef}>
        <mesh geometry={firstMesh.geometry}>
          <DepthFogMaterial />
        </mesh>
      </group>
    );
  }
  
  // Apply damage highlighting when in texture mode and damage is detected
  if (visualizationMode === 'texture' && showDamageHighlight && damageRegions.length > 0 && firstMesh) {
    return (
      <group ref={meshRef}>
        <mesh geometry={firstMesh.geometry}>
          <DamageHighlightMaterial damageRegions={damageRegions} />
        </mesh>
      </group>
    );
  }
  
  return <primitive ref={meshRef} object={clonedScene} />;
};

// Loading fallback component
const LoadingFallback: React.FC = () => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#FF1801" wireframe />
    </mesh>
  );
};

// FPS Monitor component
const FPSMonitor: React.FC<{ onFPSUpdate: (fps: number) => void }> = ({ onFPSUpdate }) => {
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef(performance.now());
  const frameCountRef = useRef(0);
  
  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;
    
    // Calculate FPS from frame delta
    const currentFps = 1000 / delta;
    frameTimesRef.current.push(currentFps);
    
    // Keep only last 60 frames for averaging
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }
    
    // Update FPS display every 30 frames
    frameCountRef.current++;
    if (frameCountRef.current % 30 === 0) {
      const avgFps = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      onFPSUpdate(Math.round(avgFps));
    }
  });
  
  return null;
};

const ThreeDRenderer: React.FC<ThreeDRendererProps> = ({ meshUrl, crackMapUrl, depthMapUrl }) => {
  const [autoRotate, setAutoRotate] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('texture');
  const [webglSupported, setWebglSupported] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showFPS, setShowFPS] = useState(false);
  const [currentFPS, setCurrentFPS] = useState(60);
  
  // Check WebGL support on mount
  useEffect(() => {
    const capabilities = getWebGLCapabilities();
    setWebglSupported(capabilities.supported);
    
    if (!capabilities.supported) {
      console.warn('WebGL is not supported in this browser');
    } else {
      console.log('WebGL capabilities:', capabilities);
    }
  }, []);
  
  // Get sync state and video timestamp from Zustand store
  const syncWithVideo = useAppStore((state) => state.syncWithVideo);
  const toggleVideoSync = useAppStore((state) => state.toggleVideoSync);
  const currentVideoTimestamp = useAppStore((state) => state.currentVideoTimestamp);
  const videoDuration = useAppStore((state) => state.videoDuration);
  const set3DSnapshot = useAppStore((state) => state.set3DSnapshot);
  
  // Default camera settings
  const defaultCameraPosition: [number, number, number] = [0, 2, 5];
  const defaultCameraTarget: [number, number, number] = [0, 0, 0];
  
  // Reset camera to default position and target
  const handleResetView = () => {
    if (controlsRef.current) {
      // Reset camera position
      controlsRef.current.object.position.set(...defaultCameraPosition);
      
      // Reset target (what the camera is looking at)
      controlsRef.current.target.set(...defaultCameraTarget);
      
      // Update controls
      controlsRef.current.update();
    }
  };
  
  // Toggle auto-rotate
  const handleToggleAutoRotate = () => {
    setAutoRotate(!autoRotate);
  };
  
  // Capture 3D scene as PNG snapshot
  const handleCaptureSnapshot = async () => {
    if (!canvasRef.current) {
      console.error('Canvas not available for snapshot');
      return;
    }
    
    try {
      // Get the canvas element from React Three Fiber
      const canvas = canvasRef.current;
      
      // Convert canvas to data URL (PNG format)
      const dataUrl = canvas.toDataURL('image/png');
      
      // Store snapshot in Zustand store
      set3DSnapshot(dataUrl);
      
      console.log('3D snapshot captured successfully');
      
      // Send snapshot to backend if we have a job ID
      const currentJobId = useAppStore.getState().currentJobId;
      if (currentJobId) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        
        const response = await fetch(`${backendUrl}/api/reconstruct/snapshot/${currentJobId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ snapshot: dataUrl }),
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Snapshot saved to backend:', data.snapshotUrl);
        } else {
          console.error('Failed to save snapshot to backend');
        }
      }
    } catch (error) {
      console.error('Error capturing 3D snapshot:', error);
    }
  };
  
  // Automatically capture snapshot when reconstruction completes
  const reconstructionResult = useAppStore((state) => state.reconstructionResult);
  useEffect(() => {
    if (reconstructionResult && meshUrl && canvasRef.current) {
      // Wait a bit for the scene to fully render before capturing
      const timer = setTimeout(() => {
        handleCaptureSnapshot();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [reconstructionResult, meshUrl]);
  
  // Visualization mode options
  const visualizationModes: { value: VisualizationMode; label: string }[] = [
    { value: 'texture', label: 'Texture' },
    { value: 'wireframe', label: 'Wireframe' },
    { value: 'crackHeatmap', label: 'Crack Heatmap' },
    { value: 'depthFog', label: 'Depth Fog' },
    { value: 'normalMap', label: 'Normal Map' },
    { value: 'geometry', label: 'Geometry' }
  ];
  
  // Handle Canvas errors
  const handleCanvasError = (error: Error) => {
    console.error('3D rendering error:', error);
    setRenderError(error.message);
    
    // Try to generate a fallback image from the mesh if possible
    if (meshUrl) {
      // Use the mesh URL as fallback or a placeholder
      setFallbackImageUrl(meshUrl.replace('.glb', '.png'));
    }
  };
  
  // If WebGL is not supported, show warning
  if (!webglSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ferrari-black">
        <div className="max-w-md p-6 bg-ferrari-graphite border-2 border-ferrari-red rounded-lg text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-ferrari-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-xl font-bold text-ferrari-white mb-2 uppercase">
            WebGL Not Supported
          </h3>
          <p className="text-ferrari-white text-sm mb-4">
            Your browser does not support WebGL, which is required for 3D visualization.
          </p>
          <p className="text-ferrari-white text-xs opacity-70">
            Please use a modern browser like Chrome, Firefox, Safari, or Edge to view 3D models.
          </p>
        </div>
      </div>
    );
  }
  
  // If there's a render error, show fallback
  if (renderError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-ferrari-black">
        <div className="max-w-md p-6 bg-ferrari-graphite border-2 border-ferrari-red rounded-lg text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-ferrari-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-ferrari-white mb-2 uppercase">
            3D Rendering Error
          </h3>
          <p className="text-ferrari-white text-sm mb-4">
            Failed to render the 3D model. The mesh file may be corrupted or in an unsupported format.
          </p>
          <div className="bg-ferrari-black border border-ferrari-red rounded p-3 mb-4">
            <p className="text-ferrari-red text-xs font-mono break-words">
              {renderError}
            </p>
          </div>
          {fallbackImageUrl && (
            <div className="mb-4">
              <p className="text-ferrari-white text-xs mb-2">Fallback 2D View:</p>
              <img 
                src={fallbackImageUrl} 
                alt="Fallback view" 
                className="w-full rounded border border-ferrari-graphite"
                onError={() => setFallbackImageUrl(null)}
              />
            </div>
          )}
          <button
            onClick={() => {
              setRenderError(null);
              setFallbackImageUrl(null);
            }}
            className="px-4 py-2 bg-ferrari-red text-ferrari-white rounded hover:bg-opacity-90 transition-colors duration-200 text-sm uppercase font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full relative" role="region" aria-label="3D tyre model viewer">
      {/* Control buttons overlay - Responsive positioning and sizing */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex flex-col gap-1.5 sm:gap-2 max-w-[200px] sm:max-w-xs" role="toolbar" aria-label="3D viewer controls">
        <button
          onClick={handleResetView}
          className="px-2 py-1.5 sm:px-4 sm:py-2 bg-ferrari-graphite hover:bg-ferrari-red active:bg-ferrari-red text-ferrari-white border border-ferrari-red rounded transition-colors duration-200 font-formula text-xs sm:text-sm touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-black"
          title="Reset camera to default view"
          aria-label="Reset camera view to default position"
        >
          Reset View
        </button>
        
        <button
          onClick={handleToggleAutoRotate}
          className={`px-2 py-1.5 sm:px-4 sm:py-2 ${
            autoRotate 
              ? 'bg-ferrari-red hover:bg-ferrari-graphite active:bg-ferrari-graphite' 
              : 'bg-ferrari-graphite hover:bg-ferrari-red active:bg-ferrari-red'
          } text-ferrari-white border border-ferrari-red rounded transition-colors duration-200 font-formula text-xs sm:text-sm touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-black`}
          title="Toggle continuous rotation"
          aria-label={autoRotate ? 'Stop automatic rotation' : 'Start automatic rotation'}
          aria-pressed={autoRotate}
        >
          {autoRotate ? 'Stop Rotate' : 'Auto-Rotate'}
        </button>
        
        {/* Visualization Mode Controls - Responsive grid */}
        <div className="bg-ferrari-graphite border border-ferrari-red rounded p-2 sm:p-3" role="group" aria-label="Visualization mode controls">
          <div className="text-ferrari-white text-[10px] sm:text-xs font-formula mb-1.5 sm:mb-2 font-semibold" id="viz-mode-label">
            Visualization
          </div>
          <div className="grid grid-cols-2 gap-0.5 sm:gap-1" role="radiogroup" aria-labelledby="viz-mode-label">
            {visualizationModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setVisualizationMode(mode.value)}
                className={`px-1.5 py-1 sm:px-2 sm:py-1 text-[10px] sm:text-xs rounded transition-colors duration-200 touch-manipulation focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-1 focus:ring-offset-ferrari-graphite ${
                  visualizationMode === mode.value
                    ? 'bg-ferrari-red text-ferrari-white'
                    : 'bg-ferrari-black text-ferrari-white hover:bg-ferrari-red hover:bg-opacity-50 active:bg-ferrari-red active:bg-opacity-50'
                }`}
                title={`Switch to ${mode.label} view`}
                aria-label={`Switch to ${mode.label} visualization mode`}
                role="radio"
                aria-checked={visualizationMode === mode.value}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Video Sync Toggle - Touch-friendly */}
        <div className="bg-ferrari-graphite border border-ferrari-red rounded p-2 sm:p-3">
          <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer touch-manipulation">
            <input
              type="checkbox"
              checked={syncWithVideo}
              onChange={toggleVideoSync}
              className="w-4 h-4 sm:w-5 sm:h-5 accent-ferrari-red cursor-pointer focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-graphite"
              aria-label="Synchronize 3D model rotation with video playback"
            />
            <span className="text-ferrari-white text-[10px] sm:text-xs font-formula">
              Sync with Video
            </span>
          </label>
        </div>
        
        {/* Performance Monitor Toggle - Touch-friendly */}
        <div className="bg-ferrari-graphite border border-ferrari-red rounded p-2 sm:p-3">
          <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer touch-manipulation">
            <input
              type="checkbox"
              checked={showFPS}
              onChange={() => setShowFPS(!showFPS)}
              className="w-4 h-4 sm:w-5 sm:h-5 accent-ferrari-red cursor-pointer focus:outline-none focus:ring-2 focus:ring-ferrari-red focus:ring-offset-2 focus:ring-offset-ferrari-graphite"
              aria-label="Show frames per second performance monitor"
            />
            <span className="text-ferrari-white text-[10px] sm:text-xs font-formula">
              Show FPS
            </span>
          </label>
        </div>
      </div>
      
      <Canvas
        camera={{ position: defaultCameraPosition, fov: 50 }}
        style={{ background: '#000000', touchAction: 'none' }}
        onCreated={({ gl }) => {
          // Store canvas reference for snapshot capture
          canvasRef.current = gl.domElement;
          
          // Enable performance optimizations
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
          
          // Disable shadows for better performance
          gl.shadowMap.enabled = false;
          
          // Enable touch events
          gl.domElement.style.touchAction = 'none';
        }}
        onError={(error) => {
          if (error instanceof Error) {
            handleCanvasError(error);
          } else {
            handleCanvasError(new Error('Unknown rendering error'));
          }
        }}
        performance={{ min: 0.5 }} // Adaptive performance scaling
        gl={{ 
          antialias: window.innerWidth > 768, // Disable antialiasing on mobile for performance
          powerPreference: 'high-performance'
        }}
      >
        {/* Ambient light for overall illumination */}
        <ambientLight intensity={0.5} />
        
        {/* Directional light for shadows and depth */}
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
        />
        
        {/* Additional directional light from opposite side */}
        <directionalLight
          position={[-5, 3, -5]}
          intensity={0.5}
        />

        {/* Grid helper for spatial reference */}
        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#1A1A1A"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#FF1801"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid={false}
        />

        {/* Load and display the mesh if URL is provided */}
        {meshUrl ? (
          <Suspense fallback={<LoadingFallback />}>
            <TyreMesh 
              url={meshUrl} 
              autoRotate={autoRotate}
              visualizationMode={visualizationMode}
              crackMapUrl={crackMapUrl}
              depthMapUrl={depthMapUrl}
              syncWithVideo={syncWithVideo}
              videoTimestamp={currentVideoTimestamp}
              videoDuration={videoDuration}
            />
          </Suspense>
        ) : (
          <mesh>
            <torusGeometry args={[1, 0.4, 16, 100]} />
            <meshStandardMaterial color="#F5F5F5" wireframe />
          </mesh>
        )}

        {/* FPS Monitor */}
        <FPSMonitor onFPSUpdate={setCurrentFPS} />

        {/* Orbit controls for camera manipulation - Touch-enabled */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
          target={defaultCameraTarget}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
          }}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN
          }}
        />
      </Canvas>
      
      {/* FPS Display Overlay */}
      {showFPS && (
        <div className="absolute bottom-4 left-4 z-10 bg-ferrari-graphite border border-ferrari-red rounded px-3 py-2">
          <div className="text-ferrari-white text-xs font-formula">
            FPS: <span className={currentFPS >= 55 ? 'text-green-400' : currentFPS >= 30 ? 'text-yellow-400' : 'text-ferrari-red'}>{currentFPS}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDRenderer;
