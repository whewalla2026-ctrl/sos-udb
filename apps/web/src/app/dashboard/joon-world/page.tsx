'use client';

import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function JoonWorldPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 100px)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', position: 'relative' }}>
      <Head>
        <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
      </Head>
      
      {/* Fallback/Overlay UI */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, pointerEvents: 'none' }}>
        <h1 className="page-title" style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Joon World (WebXR)</h1>
        <p className="page-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>Explore your Doter's virtual habitat</p>
      </div>

      <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 10 }}>
        <button className="btn btn-primary">Enter VR</button>
      </div>

      {/* A-Frame Scene */}
      {/* Note: Next.js + A-Frame requires careful handling, using an iframe or dangerouslySetInnerHTML for simplicity in this demo */}
      <iframe
        srcDoc={`
          <html>
            <head>
              <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
            </head>
            <body style="margin: 0; overflow: hidden;">
              <a-scene embedded style="height: 100%; width: 100%;">
                <a-sky color="#87CEEB"></a-sky>
                <a-plane position="0 0 -4" rotation="-90 0 0" width="100" height="100" color="#7BC8A4"></a-plane>
                
                <!-- The Doter Habitat -->
                <a-box position="-1 0.5 -3" rotation="0 45 0" color="#4CC3D9" shadow></a-box>
                <a-sphere position="0 1.25 -5" radius="1.25" color="#EF2D5E" shadow></a-sphere>
                <a-cylinder position="1 0.75 -3" radius="0.5" height="1.5" color="#FFC65D" shadow></a-cylinder>
                
                <!-- Doter Avatar (Simplified) -->
                <a-entity position="0 0.5 -2">
                  <a-sphere radius="0.3" color="#7C3AED">
                    <a-animation attribute="position" to="0 0.1 0" direction="alternate" dur="1000" repeat="indefinite"></a-animation>
                  </a-sphere>
                </a-entity>

                <a-entity camera look-controls position="0 1.6 0"></a-entity>
              </a-scene>
            </body>
          </html>
        `}
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
