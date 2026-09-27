'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface FinancialScene3DProps {
  height?: string;
  theme?: 'volt' | 'cyan' | 'blue' | 'purple';
}

export const FinancialScene3D: React.FC<FinancialScene3DProps> = ({
  height = '140px',
  theme = 'volt',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const width = container.clientWidth || 600;
    const heightPx = container.clientHeight || 140;

    const camera = new THREE.PerspectiveCamera(40, width / heightPx, 0.1, 1000);
    camera.position.set(0, 0, 16);

    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Color mapping
    let primaryColor = 0xd4ff00; // Neon Volt
    let secondaryColor = 0x00f0ff; // Cyber Cyan

    if (theme === 'cyan') {
      primaryColor = 0x00f0ff;
      secondaryColor = 0x3b82f6;
    } else if (theme === 'purple') {
      primaryColor = 0xa855f7;
      secondaryColor = 0x00f0ff;
    }

    // 1. Kinetic Center Polyhedron (Athletic Wireframe Gem)
    const coreGeo = new THREE.IcosahedronGeometry(2.4, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // 2. Orbital Torus Ring 1 (Gyroscope Outer Ring)
    const ring1Geo = new THREE.TorusGeometry(4.2, 0.04, 8, 48);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: secondaryColor,
      transparent: true,
      opacity: 0.5,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    scene.add(ring1);

    // 3. Orbital Torus Ring 2
    const ring2Geo = new THREE.TorusGeometry(3.2, 0.03, 8, 36);
    const ring2Mat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.4,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    scene.add(ring2);

    // 4. Floating Kinetic Data Points (Subtle Energy Cloud)
    const particleCount = 45;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 14;
      particlePositions[i + 1] = (Math.random() - 0.5) * 8;
      particlePositions[i + 2] = (Math.random() - 0.5) * 8;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: primaryColor,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // Mouse Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 1.5;
      targetY = y * 1.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animId: number;
    let clock = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.015;

      mouseX += (targetX - mouseX) * 0.05;
      mouseY += (targetY - mouseY) * 0.05;

      coreMesh.rotation.x = clock * 0.6 + mouseY;
      coreMesh.rotation.y = clock * 0.8 + mouseX;

      ring1.rotation.z = clock * 0.4;
      ring1.rotation.x = Math.sin(clock * 0.5) * 0.3 + mouseY * 0.5;

      ring2.rotation.y = -clock * 0.5;
      ring2.rotation.z = Math.cos(clock * 0.4) * 0.4 + mouseX * 0.5;

      particleSystem.rotation.y = clock * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      coreGeo.dispose();
      coreMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [theme]);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        height,
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
};
