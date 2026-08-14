import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TopologyEdge, TopologyNode } from '../../data/venueTopology';
import { Eye, AlertTriangle, MousePointer2 } from 'lucide-react';

interface MergedNode extends TopologyNode {
  density: number;
  riskLevel: string;
  hasTelemetry: boolean;
}

interface ThreeDigitalTwinCanvasProps {
  nodes: MergedNode[];
  edges: TopologyEdge[];
  selectedZoneId: string;
  highlightedPath: string[]; 
  onSelectZone: (zoneId: string) => void;
}

const toWorld = (x: number, y: number): [number, number] => {
  const worldX = (x - 50) * 0.34;
  const worldZ = (y - 50) * 0.34;
  return [worldX, worldZ];
};

export const ThreeDigitalTwinCanvas: React.FC<ThreeDigitalTwinCanvasProps> = ({
  nodes,
  edges,
  selectedZoneId,
  highlightedPath,
  onSelectZone,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredZoneName, setHoveredZoneName] = useState<string | null>(null);
  const [webGlError, setWebGlError] = useState<boolean>(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      setWebGlError(false);
    } catch (e) {
      console.warn('[ThreeDigitalTwinCanvas] WebGL not supported:', e);
      setWebGlError(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); 

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    
    // 🚨 FIX APPLIED: Pulled the camera back and up for a perfect wide overview!
    camera.position.set(18, 22, 18);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 6;
    
    // 🚨 FIX APPLIED: Increased max zoom out distance
    controls.maxDistance = 100; 
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const brandPointLight = new THREE.PointLight(0x67b2b9, 1.5, 30); 
    brandPointLight.position.set(-8, 8, -8);
    scene.add(brandPointLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(50, 25, 0x67b2b9, 0xcbd5e1);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    edges.forEach((edge) => {
      const a = nodes.find((n) => n.id === edge.source);
      const b = nodes.find((n) => n.id === edge.target);
      
      if (!a || !b) return; 
      
      const [ax, az] = toWorld(a.x, a.y);
      const [bx, bz] = toWorld(b.x, b.y);

      const isOnHighlightedPath = highlightedPath.some(
        (id, i) =>
          i < highlightedPath.length - 1 &&
          ((highlightedPath[i] === edge.source && highlightedPath[i + 1] === edge.target) ||
            (highlightedPath[i] === edge.target && highlightedPath[i + 1] === edge.source))
      );

      const points = [new THREE.Vector3(ax, 0.06, az), new THREE.Vector3(bx, 0.06, bz)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: isOnHighlightedPath ? 0x67b2b9 : 0x64748b, 
        linewidth: isOnHighlightedPath ? 3 : 2,
      });
      scene.add(new THREE.Line(geometry, material));
    });

    const zoneMeshes: {
      mesh: THREE.Mesh; zoneId: string; initialY: number; isHighRisk: boolean; density: number;
    }[] = [];

    nodes.forEach((node) => {
      const [wx, wz] = toWorld(node.x, node.y);
      const isSelected = node.id === selectedZoneId;
      const isHighRisk = node.hasTelemetry && (node.riskLevel === 'critical' || node.riskLevel === 'warning');
      const onPath = highlightedPath.includes(node.id);
      const blockHeight = node.hasTelemetry ? Math.max(0.4, node.density * 0.9) : 0.4;

      let colorHex = 0x64748b; 
      if (node.hasTelemetry) {
        if (node.riskLevel === 'critical') colorHex = 0xf43f5e;
        else if (node.riskLevel === 'warning') colorHex = 0xf97316;
        else if (node.riskLevel === 'caution') colorHex = 0xf59e0b;
        else colorHex = 0x10b981;
      }
      if (isSelected) colorHex = 0x67b2b9;

      const geometry = node.isGate
        ? new THREE.OctahedronGeometry(0.7, 0)
        : new THREE.CylinderGeometry(0.7, 0.7, blockHeight, 6);

      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.2,
        emissive: onPath ? 0x064e3b : isHighRisk ? 0x7f1d1d : 0x0f172a,
        emissiveIntensity: onPath ? 0.4 : isHighRisk ? 0.6 : 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      const yPos = node.isGate ? 0.9 : blockHeight / 2;
      mesh.position.set(wx, yPos, wz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { zoneId: node.id, zoneName: node.name };
      scene.add(mesh);

      zoneMeshes.push({ mesh, zoneId: node.id, initialY: yPos, isHighRisk, density: node.density });

      if (isHighRisk) {
        const beacon = new THREE.PointLight(0xf43f5e, 2.5, 10);
        beacon.position.set(wx, yPos + 2, wz);
        scene.add(beacon);
      }

      if (onPath) {
        const ringGeo = new THREE.RingGeometry(0.9, 1.05, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x67b2b9, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(wx, 0.04, wz);
        scene.add(ring);
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(zoneMeshes.map((m) => m.mesh));
      if (intersects.length > 0) {
        setHoveredZoneName(intersects[0].object.userData.zoneName);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredZoneName(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(zoneMeshes.map((m) => m.mesh));
      if (intersects.length > 0) {
        const hitId = intersects[0].object.userData.zoneId;
        if (hitId) onSelectZone(hitId);
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    let animationFrameId: number;
    let lastTime = 0;
    const fpsLimit = 20;
    const interval = 1000 / fpsLimit;
    const startTime = performance.now();

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const deltaTime = time - lastTime;
      if (deltaTime > interval) {
        lastTime = time - (deltaTime % interval);
        const elapsedTime = (time - startTime) * 0.001;

        zoneMeshes.forEach(({ mesh, isHighRisk, initialY, density }) => {
          if (isHighRisk || density > 1) {
            const amplitude = Math.min(0.4, density * 0.05);
            mesh.position.y = initialY + Math.sin(elapsedTime * 2) * amplitude;
          }
        });

        controls.update();
        renderer.render(scene, camera);
      }
    };
    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
    };
  }, [nodes, edges, selectedZoneId, highlightedPath, onSelectZone]);

  if (webGlError) {
    return (
      <div className="relative w-full h-full min-h-[400px] bg-slate-950 rounded-3xl overflow-hidden flex flex-col items-center justify-center p-8 text-center gap-5 shadow-inner border border-slate-800">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20 shadow-inner">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>
        <div className="flex flex-col gap-2 max-w-md">
          <span className="font-heading font-black text-xl text-white tracking-tight">WebGL Context Unavailable</span>
          <span className="font-mono text-xs text-slate-400 leading-relaxed uppercase tracking-widest">
            Hardware acceleration is disabled or unsupported by your graphics driver. 3D visualization suspended.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[400px] sm:min-h-[500px] bg-[#FAFAF7] rounded-3xl overflow-hidden shadow-inner group">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing outline-none" />
      
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/50 text-white text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pointer-events-none shadow-xl">
        <span className="flex items-center gap-2 text-[#67b2b9]">
          <Eye className="w-4 h-4" /> Live 3D Twin
        </span>
        <span className="hidden sm:inline text-slate-600">|</span>
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#67b2b9] rounded-sm rotate-45" /> Gate</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#67b2b9] rounded-full" /> Sector</span>
        </div>
      </div>

      {hoveredZoneName && (
        <div className="absolute bottom-6 left-6 bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black font-heading shadow-lg shadow-[#67b2b9]/20 border border-white/20 uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 pointer-events-none z-10 flex items-center gap-2">
          <MousePointer2 className="w-4 h-4" />
          {hoveredZoneName}
        </div>
      )}

      <div className="absolute bottom-6 right-6 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/50 text-[9px] sm:text-[10px] text-slate-400 font-mono font-bold uppercase tracking-widest shadow-xl flex items-center gap-2 pointer-events-none">
        <span>Scroll: Zoom</span>
        <span className="text-slate-600">•</span>
        <span>Right-Click: Pan</span>
      </div>
    </div>
  );
};