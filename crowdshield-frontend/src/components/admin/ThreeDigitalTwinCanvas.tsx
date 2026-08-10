import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TopologyEdge, TopologyNode, getTopologyNode } from '../../data/venueTopology';
import { Eye, AlertTriangle } from 'lucide-react';

// Node shape as consumed by this canvas: real topology position/role, merged
// with whatever live telemetry is currently available for it.
interface MergedNode extends TopologyNode {
  density: number;
  riskLevel: string;
  hasTelemetry: boolean;
}

interface ThreeDigitalTwinCanvasProps {
  nodes: MergedNode[];
  edges: TopologyEdge[];
  selectedZoneId: string;
  highlightedPath: string[]; // ordered zone IDs - the live or fallback route
  onSelectZone: (zoneId: string) => void;
}

// Map schematic 0-100 x/y layout coords onto a 3D ground plane.
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
    scene.background = new THREE.Color(0x0D0F1A);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(14, 16, 14);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 12);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    scene.add(dirLight);

    const bluePointLight = new THREE.PointLight(0x2C7BE5, 2, 30);
    bluePointLight.position.set(-8, 8, -8);
    scene.add(bluePointLight);

    // Floor sized to the schematic layout, not an arbitrary fixed size
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: 0x151726, roughness: 0.6, metalness: 0.2 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(24, 16, 0x2C7BE5, 0x2A2E45);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // --- Draw the real road edges as ground-level lines ---
    edges.forEach((edge) => {
      const a = getTopologyNode(edge.source);
      const b = getTopologyNode(edge.target);
      if (!a || !b) return;
      const [ax, az] = toWorld(a.x, a.y);
      const [bx, bz] = toWorld(b.x, b.y);

      const isOnHighlightedPath = highlightedPath.some(
        (id, i) =>
          i < highlightedPath.length - 1 &&
          ((highlightedPath[i] === edge.source && highlightedPath[i + 1] === edge.target) ||
            (highlightedPath[i] === edge.target && highlightedPath[i + 1] === edge.source))
      );

      const points = [new THREE.Vector3(ax, 0.03, az), new THREE.Vector3(bx, 0.03, bz)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: isOnHighlightedPath ? 0x22D3A6 : 0x3a3f55,
        linewidth: isOnHighlightedPath ? 3 : 1,
      });
      scene.add(new THREE.Line(geometry, material));
    });

    // --- Draw each real zone/gate as a distinct 3D object ---
    const zoneMeshes: {
      mesh: THREE.Mesh; zoneId: string; initialY: number; isHighRisk: boolean; density: number;
    }[] = [];

    nodes.forEach((node) => {
      const [wx, wz] = toWorld(node.x, node.y);
      const isSelected = node.id === selectedZoneId;
      const isHighRisk = node.hasTelemetry && (node.riskLevel === 'critical' || node.riskLevel === 'warning');
      const onPath = highlightedPath.includes(node.id);
      const blockHeight = node.hasTelemetry ? Math.max(0.4, node.density * 0.9) : 0.4;

      let colorHex = 0x3a3f55; // no telemetry yet -> neutral grey
      if (node.hasTelemetry) {
        if (node.riskLevel === 'critical') colorHex = 0xef4444;
        else if (node.riskLevel === 'warning') colorHex = 0xf97316;
        else if (node.riskLevel === 'caution') colorHex = 0xFFB627;
        else colorHex = 0x22D3A6;
      }
      if (isSelected) colorHex = 0x2C7BE5;

      // Gates render as diamonds (rotated boxes) to be visually distinct
      // from interior zones/junctions, which render as cylinders.
      const geometry = node.isGate
        ? new THREE.OctahedronGeometry(0.7, 0)
        : new THREE.CylinderGeometry(0.7, 0.7, blockHeight, 6);

      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.3,
        metalness: 0.4,
        emissive: onPath ? 0x0a5f4a : isHighRisk ? 0x990011 : 0x001122,
        emissiveIntensity: onPath ? 0.6 : isHighRisk ? 0.8 : 0.15,
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
        const beacon = new THREE.PointLight(0xFF3B5C, 3, 10);
        beacon.position.set(wx, yPos + 2, wz);
        scene.add(beacon);
      }

      if (onPath) {
        const ringGeo = new THREE.RingGeometry(0.9, 1.05, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x22D3A6, side: THREE.DoubleSide, transparent: true, opacity: 0.7 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(wx, 0.04, wz);
        scene.add(ring);
      }
    });

    // --- Raycasting ---
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
      <div className="relative w-full h-[380px] bg-[#0D0F1A] rounded-xl border border-white/10 overflow-hidden flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="p-3 bg-amber-500/15 text-amber-500 rounded-full border border-amber-500/30">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-1 max-w-sm">
          <span className="font-heading font-bold text-sm text-white">3D WebGL Context Unavailable</span>
          <span className="text-xs text-slate-400 leading-relaxed">
            Hardware acceleration is disabled or unsupported by your graphics driver.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[380px] bg-[#0D0F1A] rounded-xl border border-white/10 overflow-hidden shadow-inner group">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs font-mono-num flex items-center gap-2 pointer-events-none">
        <Eye className="w-3.5 h-3.5 text-[#22D3A6]" />
        <span>Real venue · diamonds = gates · cylinders = zones</span>
      </div>
      {hoveredZoneName && (
        <div className="absolute bottom-3 left-3 bg-[#2C7BE5] text-white px-3 py-1 rounded-lg text-xs font-bold font-heading shadow-lg border border-white/20">
          {hoveredZoneName}
        </div>
      )}
      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg border border-white/10 text-[10px] text-white/70 font-mono-num">
        Scroll to Zoom · Right-Click to Pan
      </div>
    </div>
  );
};