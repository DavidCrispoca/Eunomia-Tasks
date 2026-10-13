# Assets de mascotas

Arte raster de las mascotas de Eunomia. Se sirve desde Next con `next/image`
directamente bajo `/assets/mascot/...`.

## Estructura

Una carpeta por especie, un archivo por etapa:

```
public/assets/mascot/
  pegaso/
    bebe.webp
    adulto.webp
  lechuza/
    bebe.webp    adulto.webp
  fenix/
    bebe.webp    adulto.webp
```

Especies válidas: `pegaso`, `lechuza`, `fenix`.
Etapas válidas: `bebe`, `adulto` (sin acentos ni mayúsculas en el nombre de
archivo; las etiquetas visibles sí son "Bebé"/"Adulto").

## Especificación de cada archivo

- **WebP con transparencia** (se superpone a superficies sólidas del design
  system; no lleva fondo propio).
- **Lienzo cuadrado** y sujeto centrado, con **mismo encuadre y escala
  relativa** entre las dos etapas: la evolución se nota en la silueta, no en el
  lienzo. (Los WebP actuales del Pegaso son 2752×1536, 16:9; se muestran con
  `object-contain`, así que un lienzo cuadrado aprovecha mejor el espacio.)
- Estilo del universo: línea de tinta ~2 px y paleta del mundo
  (`docs/visual-identity.md`, `docs/asset-catalog.md`). Sin texto ni sombras
  duras.

## Cómo se integran

- El usuario elige especie y etapa en el selector **Mascota** de la barra
  superior; la preferencia se guarda en `localStorage` (`eunomia:mascot`).
- `Mascot` (`src/components/mascot/mascot.tsx`) resuelve la ruta a partir de
  `src/lib/mascot/types.ts`. Mientras un archivo no exista, se muestra el SVG
  de respaldo sin romper la UI.
- Al añadir el arte de una especie nueva, agrégala a `MASCOT_ART_AVAILABLE` en
  `src/lib/mascot/types.ts` (evita peticiones 404 mientras no hay archivos).
