import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VenueZone } from '../../types';
import { Eye, AlertTriangle } from 'lucide-react';

interface ThreeDigitalTwinCanvasProps {
  zones: VenueZone[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
}

export const ThreeDigitalTwinCanvas: React.FC<ThreeDigitalTwinCanvasProps> = ({
  zones,
  selectedZoneId,
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

    // 1. Safe WebGL Context Initialization
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      // FIX: PCFShadowMap replaces deprecated PCFSoftShadowMap
      renderer.shadowMap.type = THREE.PCFShadowMap;
      container.innerHTML = '';
      container.appendChild(renderer.domElement);
      setWebGlError(false);
    } catch (e) {
      console.warn('[ThreeDigitalTwinCanvas] WebGL not supported or hardware acceleration disabled:', e);
      setWebGlError(true);
      return;
    }

    // 2. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D0F1A);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(25, 20, 25);

    // 3. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const bluePointLight = new THREE.PointLight(0x2C7BE5, 2, 30);
    bluePointLight.position.set(-10, 10, -10);
    scene.add(bluePointLight);

    // 5. Venue Floor Plane & Grid Helper
    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x151726,
      roughness: 0.6,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(36, 18, 0x2C7BE5, 0x2A2E45);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // 6. Render 3D Zone Blocks
    const zoneMeshes: { mesh: THREE.Mesh; zoneId: string; initialY: number; isHighRisk: boolean; density: number; flowRate: number }[] = [];

    zones.slice(0, 4).forEach((zone, idx) => {
      const posX = (idx - 1.5) * 3.5;
      const blockHeight = Math.max(0.5, (zone.density || 0) * 3);
      const isSelected = zone.id === selectedZoneId;
      const isHighRisk = zone.riskLevel === 'critical' || zone.riskLevel === 'warning';

      let colorHex = 0x22D3A6;
      if (zone.riskLevel === 'critical') colorHex = 0xef4444;
      else if (zone.riskLevel === 'warning') colorHex = 0xf97316;
      else if (zone.riskLevel === 'caution') colorHex = 0xFFB627;
      else if (isSelected) colorHex = 0x2C7BE5;

      const boxGeo = new THREE.BoxGeometry(1.5, blockHeight, 1.5);
      const boxMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.4,
        emissive: isHighRisk ? 0x990011 : isSelected ? 0x0033aa : 0x002211,
        emissiveIntensity: isHighRisk ? 0.8 : 0.2,
      });

      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(posX, blockHeight / 2, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { zoneId: zone.id, zoneName: zone.name };

      scene.add(mesh);
      zoneMeshes.push({
        mesh,
        zoneId: zone.id,
        initialY: blockHeight / 2,
        isHighRisk,
        density: zone.density || 0,
        flowRate: zone.flowRate || 0,
      });

      if (isHighRisk) {
        const beaconLight = new THREE.PointLight(0xFF3B5C, 3, 12);
        beaconLight.position.set(posX, blockHeight + 2, 0);
        scene.add(beaconLight);
      }
    });

    // 7. Raycasting for Click / Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
      if (!renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(zoneMeshes.map((m) => m.mesh));

      if (intersects.length > 0) {
        const hitName = intersects[0].object.userData.zoneName;
        setHoveredZoneName(hitName);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setHoveredZoneName(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    const onClick = (event: MouseEvent) => {
      if (!renderer) return;
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

    // 8. Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 9. Animation Loop (FIX: Uses performance.now() to avoid THREE.Clock deprecation)
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

        zoneMeshes.forEach(({ mesh, isHighRisk, initialY, density, flowRate }) => {
          if (isHighRisk || density > 1) {
            const frequency = Math.max(1, (flowRate || 1) * 0.5);
            const amplitude = Math.min(1.5, density * 0.1);
            mesh.position.y = initialY + Math.sin(elapsedTime * frequency) * amplitude;
          }
        });

        controls.update();
        renderer.render(scene, camera);
      }
    };

    requestAnimationFrame(animate);

    // 10. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onPointerMove);
        renderer.domElement.removeEventListener('click', onClick);
        renderer.dispose();
      }
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
    };
  }, [zones, selectedZoneId, onSelectZone]);

  if (webGlError) {
    return (
      <div className="relative w-full h-[380px] bg-[#0D0F1A] rounded-xl border border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="p-3 bg-amber-500/15 text-amber-500 rounded-full border border-amber-500/30">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <span className="font-heading font-bold text-sm text-white">
            3D WebGL Context Unavailable
          </span>
          <span className="text-xs text-slate-400 leading-relaxed">
            Hardware acceleration is disabled or unsupported by your graphics driver.
          </span>
        </div>
        <div className="text-[11px] text-[#38BDF8] font-mono-num bg-[#38BDF8]/10 px-3 py-1.5 rounded-lg border border-[#38BDF8]/20">
          Enable "Use graphics acceleration when available" in Browser Settings
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[380px] bg-[#0D0F1A] rounded-xl border border-white/10 overflow-hidden shadow-inner group">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs font-mono-num flex items-center gap-2 pointer-events-none">
        <Eye className="w-3.5 h-3.5 text-[#22D3A6]" />
        <span>3D Block Model · Click & Drag to Rotate</span>
      </div>

      {hoveredZoneName && (
        <div className="absolute bottom-3 left-3 bg-[#2C7BE5] text-white px-3 py-1 rounded-lg text-xs font-bold font-heading shadow-lg border border-white/20 animate-fadeIn">
          Zone: {hoveredZoneName}
        </div>
      )}

      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-white/70 font-mono-num">
        Scroll to Zoom · Right-Click to Pan
      </div>
    </div>
  );
};