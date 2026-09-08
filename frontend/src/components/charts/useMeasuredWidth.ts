'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Ancho real del contenedor, en píxeles CSS.
 *
 * Las gráficas SVG dibujan con un `viewBox` de ese mismo ancho para que una
 * unidad del dibujo sea un píxel de pantalla. Con un `viewBox` fijo escalado
 * a `width: 100%`, el texto de los ejes se encoge con el contenedor y en un
 * teléfono queda en cuatro o cinco píxeles, ilegible.
 */
export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
