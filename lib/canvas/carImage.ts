// lib/canvas/carImage.ts
// Shared car SVG loader for NumberLineCanvas and GameLineCanvas.
// Uses a module-level cache so /car.svg is fetched at most once per session.

let cachedImage: HTMLImageElement | null = null;
let loadPromise: Promise<HTMLImageElement> | null = null;

/**
 * Load /car.svg asynchronously.
 * Returns the same Promise on every call — only one network request per session.
 */
export function loadCarImage(): Promise<HTMLImageElement> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      cachedImage = img;
      resolve(img);
    };
    img.onerror = () => {
      // Clear the promise so a subsequent call can retry if needed.
      loadPromise = null;
      reject(new Error("Failed to load /car.svg"));
    };
    img.src = "/car.svg";
  });

  return loadPromise;
}

/**
 * Returns the cached HTMLImageElement synchronously, or null if not yet loaded.
 * Kicks off the background load the first time it is called so later canvas
 * draw calls can fall back to the cached image without awaiting.
 */
export function getCarImageSync(): HTMLImageElement | null {
  if (cachedImage) return cachedImage;
  // Start loading in the background if not already started.
  loadCarImage().catch(() => {
    // Silently ignore — drawCar() falls back to a circle shape when null.
  });
  return null;
}
