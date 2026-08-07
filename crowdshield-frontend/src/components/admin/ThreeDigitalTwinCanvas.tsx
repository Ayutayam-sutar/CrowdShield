import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VenueZone } from '../../types';
import { RotateCcw, Eye, ShieldAlert, Maximize2 } from 'lucide-react';

interface ThreeDigitalTwinCanvasProps {
  zones: VenueZone[];
  selectedZoneId: string;
  onSelectZone: (zoneId: string) => void;
  isScenarioActive: boolean;
}

export const ThreeDigitalTwinCanvas: React.FC<ThreeDigitalTwinCanvasProps> = ({
  zones,
  selectedZoneId,
  onSelectZone,
  isScenarioActive,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredZoneName, setHoveredZoneName] = useState<string | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0D0F1A);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(25, 20, 25);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls (Click & Drag to rotate, scroll to zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // Don't go below ground
    controls.minDistance = 10;
    controls.maxDistance = 60;
    controls.target.set(0, 0, 0);

    // 5. Lighting
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

    // 6. Venue Floor Plane & Grid Helper
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

    // 7. Render 3D Zone Blocks
    const zoneMeshes: { mesh: THREE.Mesh; zoneId: string; initialY: number; isHighRisk: boolean }[] = [];

    // Layout coordinates for up to 6 zone boxes
    const gridPositions = [
      { x: -10, z: -10, w: 7, h: 4, d: 7 }, // Gate A
      { x: 0, z: -10, w: 8, h: 6, d: 8 },   // West Exit Corridor
      { x: 10, z: -10, w: 7, h: 4, d: 7 },  // Gate B
      { x: -10, z: 8, w: 8, h: 5, d: 8 },   // Sector 7G
      { x: 0, z: 8, w: 9, h: 4, d: 9 },    // Central Concourse
      { x: 10, z: 8, w: 7, h: 5, d: 7 },    // Aux Exit Gate 4
    ];

    zones.slice(0, 6).forEach((zone, idx) => {
      const pos = gridPositions[idx] || { x: (idx - 2) * 8, z: 0, w: 6, h: 4, d: 6 };
      const isSelected = zone.id === selectedZoneId;
      const isHighRisk = zone.riskScore > 65 || (isScenarioActive && (zone.id === 'z-2' || zone.id === 'z-3'));

      // Determine color
      let colorHex = 0x22D3A6; // Green safe
      if (isHighRisk) colorHex = 0xFF3B5C; // Red risk
      else if (zone.riskScore > 40) colorHex = 0xFF7A45; // Orange moderate
      else if (isSelected) colorHex = 0x2C7BE5; // Blue selected

      const boxGeo = new THREE.BoxGeometry(pos.w, pos.h, pos.d);
      const boxMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.4,
        emissive: isHighRisk ? 0x990011 : isSelected ? 0x0033aa : 0x002211,
        emissiveIntensity: isHighRisk ? 0.8 : 0.2,
      });

      const mesh = new THREE.Mesh(boxGeo, boxMat);
      mesh.position.set(pos.x, pos.h / 2, pos.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { zoneId: zone.id, zoneName: zone.name };

      scene.add(mesh);
      zoneMeshes.push({
        mesh,
        zoneId: zone.id,
        initialY: pos.h / 2,
        isHighRisk,
      });

      // Add small glowing beacon light above high risk blocks
      if (isHighRisk) {
        const beaconLight = new THREE.PointLight(0xFF3B5C, 3, 12);
        beaconLight.position.set(pos.x, pos.h + 2, pos.z);
        scene.add(beaconLight);
      }
    });

    // 8. Raycasting for Click / Hover interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (event: MouseEvent) => {
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

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Pulsing effect for high risk blocks
      zoneMeshes.forEach(({ mesh, isHighRisk, initialY }) => {
        if (isHighRisk) {
          mesh.position.y = initialY + Math.sin(elapsedTime * 4) * 0.3;
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 11. Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      controls.dispose();
    };
  }, [zones, selectedZoneId, isScenarioActive, onSelectZone]);

  return (
    <div className="relative w-full h-[380px] bg-[#0D0F1A] rounded-xl border border-white/10 overflow-hidden shadow-inner group">
      {/* Three.js Mount Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Navigation Controls Overlay */}
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
