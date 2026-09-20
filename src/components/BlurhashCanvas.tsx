import React, { useEffect, useRef } from 'react';
import { decode } from 'blurhash';

interface BlurhashCanvasProps {
  hash: string;
  width?: number;
  height?: number;
  className?: string;
}

export const BlurhashCanvas: React.FC<BlurhashCanvasProps> = ({
  hash,
  width = 32,
  height = 32,
  className = 'w-full h-full object-cover',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !hash) return;
    try {
      const pixels = decode(hash, width, height);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);
      }
    } catch (err) {
      console.warn('Blurhash decode fallback:', err);
    }
  }, [hash, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};
