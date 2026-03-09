import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  // Fix #2: track isPlaying via ref so the RAF loop can read it without restarting
  const isPlayingRef = useRef(isPlaying);

  // Fix #2: sync ref on every render without restarting the RAF loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Fix #2: depend only on analyser — loop runs once and reads isPlayingRef internally
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Particle system
    const particles: {x: number, y: number, angle: number, speed: number, size: number}[] = [];
    for(let i=0; i<100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            angle: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 2,
            size: Math.random() * 2 + 1
        });
    }

    let rot = 0;

    const render = () => {
      // Fix #2: only sample live frequency data when audio is playing
      if (isPlayingRef.current) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Gradually decay toward silence for a smooth idle state
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.max(0, dataArray[i] - 4);
        }
      }

      // Clear canvas with fade effect for trails
      ctx.fillStyle = 'rgba(10, 10, 15, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Calculate average frequencies
      let bass = 0;
      let mid = 0;
      let treble = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        if (i < bufferLength * 0.1) bass += val;
        else if (i < bufferLength * 0.5) mid += val;
        else treble += val;
      }
      
      bass /= (bufferLength * 0.1);
      mid /= (bufferLength * 0.4);
      treble /= (bufferLength * 0.5);

      const bassScale = 1 + (bass / 255) * 0.5; // 1.0 to 1.5
      
      rot += 0.005 + (bass / 255) * 0.02;

      // Draw Central Orb
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rot);
      
      // Holographic Rings
      ctx.strokeStyle = `rgba(255, 165, 0, ${0.3 + (bass/255)*0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 100 * bassScale, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(0, 212, 255, ${0.3 + (mid/255)*0.7})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 140 * bassScale * 0.9, 0, Math.PI * 2); 
      ctx.stroke();

      // Complex Pattern: Mythic Geometry
      // Hexagon base
      ctx.strokeStyle = `rgba(255, 140, 0, ${0.4 + (treble/255)*0.6})`;
      ctx.lineWidth = 2;
      
      // Draw Merkaba-like shape (two intersecting triangles)
      const drawTriangle = (offset: number, scale: number) => {
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
              const angle = (i * 2 * Math.PI / 3) + offset;
              const r = 180 * bassScale * scale;
              const x = Math.cos(angle) * r;
              const y = Math.sin(angle) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
      };

      drawTriangle(0, 1);
      drawTriangle(Math.PI, 1);
      
      // Inner rotating glyphs/runes
      ctx.save();
      ctx.rotate(-rot * 2);
      ctx.font = `${14 * bassScale}px 'Orbitron'`;
      ctx.fillStyle = `rgba(0, 212, 255, ${0.5 + (mid/255)*0.5})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const runes = ['A', 'X', 'O', 'M', 'V', 'Z', 'I', 'Ω'];
      for(let i=0; i<8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const r = 120 * bassScale;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          ctx.fillText(runes[i], x, y);
      }
      ctx.restore();

      ctx.restore();

      // Draw Waveform Circle
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < bufferLength; i+=10) {
          const v = dataArray[i] / 128.0;
          const angle = (i / bufferLength) * Math.PI * 2 + rot;
          const r = 250 + (v * 50);
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Draw Particles
      particles.forEach((p, i) => {
          // Update particle position based on music
          const speedMultiplier = 1 + (bass / 255) * 2;
          p.x += Math.cos(p.angle) * p.speed * speedMultiplier;
          p.y += Math.sin(p.angle) * p.speed * speedMultiplier;

          // Wrap around
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;

          // Draw
          ctx.beginPath();
          ctx.fillStyle = i % 2 === 0 ? '#FFA500' : '#00D4FF';
          ctx.globalAlpha = 0.6 + (mid/255) * 0.4;
          ctx.arc(p.x, p.y, p.size * bassScale, 0, Math.PI * 2);
          ctx.fill();
          
          // Connect nearby particles
          particles.forEach((p2, j) => {
             if (i === j) return;
             const dx = p.x - p2.x;
             const dy = p.y - p2.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist < 100) {
                 ctx.beginPath();
                 ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - dist/100)})`;
                 ctx.moveTo(p.x, p.y);
                 ctx.lineTo(p2.x, p2.y);
                 ctx.stroke();
             }
          });
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser]); // Fix #2: only restart when analyser changes, not on every isPlaying toggle

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
