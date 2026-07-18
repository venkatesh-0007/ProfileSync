/**
 * Compares two images by resizing them to a 64x64 grid on an offscreen canvas,
 * applying a circular mask to isolate the face, and computing a combined similarity score:
 * 1. Normalized RGB color difference.
 * 2. Structural gradient differences (Difference Hash style).
 * 
 * Returns a promise resolving to `{ isSimilar: boolean; difference: number }`.
 */
export function compareImages(
  imgUrl1: string,
  imgUrl2: string,
  thresholdPercent = 15
): Promise<{ isSimilar: boolean; difference: number }> {
  return new Promise((resolve, reject) => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return reject(new Error("Could not create canvas 2D context"));
    }

    const loadImg = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolveImg, rejectImg) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolveImg(img);
        img.onerror = () => rejectImg(new Error(`Failed to load image`));
        img.src = url;
      });
    };

    Promise.all([loadImg(imgUrl1), loadImg(imgUrl2)])
      .then(([img1, img2]) => {
        const getPixelData = (img: HTMLImageElement) => {
          ctx.fillStyle = "#ffffff"; // Solid background for transparent PNGs
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          return ctx.getImageData(0, 0, size, size).data;
        };

        const data1 = getPixelData(img1);
        const data2 = getPixelData(img2);

        let totalColorDiff = 0;
        let totalGradientDiff = 0;
        let validPixels = 0;

        // Circular mask: focus on center 82% to ignore borders and corners
        const radiusLimit = (size / 2) * 0.82;
        const center = (size - 1) / 2;

        const grays1 = new Float32Array(size * size);
        const grays2 = new Float32Array(size * size);
        const validMap = new Uint8Array(size * size);

        // First pass: extract grays and calculate color differences
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const pixelIndex = y * size + x;
            const idx = pixelIndex * 4;

            const dx = x - center;
            const dy = y - center;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Skip pixels outside circular mask
            if (dist > radiusLimit) {
              continue;
            }

            validMap[pixelIndex] = 1;
            validPixels++;

            const r1 = data1[idx], g1 = data1[idx + 1], b1 = data1[idx + 2];
            const r2 = data2[idx], g2 = data2[idx + 1], b2 = data2[idx + 2];

            // Normalize grayscale
            grays1[pixelIndex] = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
            grays2[pixelIndex] = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;

            // Euclidean color distance in RGB space (normalized to 0..1 range)
            const colorDist = Math.sqrt(
              Math.pow(r1 - r2, 2) +
              Math.pow(g1 - g2, 2) +
              Math.pow(b1 - b2, 2)
            ) / Math.sqrt(3 * 255 * 255);

            totalColorDiff += colorDist;
          }
        }

        // Second pass: structural gradient differences (compares each pixel to its neighbors)
        let gradientPairs = 0;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size - 1; x++) {
            const p1 = y * size + x;
            const p2 = y * size + (x + 1);

            if (validMap[p1] && validMap[p2]) {
              // Horizontal gradient direction comparison (Difference hashing principal)
              const grad1 = grays1[p1] > grays1[p2];
              const grad2 = grays2[p1] > grays2[p2];
              if (grad1 !== grad2) {
                totalGradientDiff += 1.0;
              }
              gradientPairs++;
            }
          }
        }

        // Combine scores: 65% color similarity + 35% structure similarity
        const colorDiffPercent = validPixels > 0 ? (totalColorDiff / validPixels) * 100 : 100;
        const gradDiffPercent = gradientPairs > 0 ? (totalGradientDiff / gradientPairs) * 100 : 100;

        const combinedDiff = colorDiffPercent * 0.65 + gradDiffPercent * 0.35;

        // Clean up canvas
        canvas.width = 0;
        canvas.height = 0;

        resolve({
          isSimilar: combinedDiff <= thresholdPercent,
          difference: combinedDiff,
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
