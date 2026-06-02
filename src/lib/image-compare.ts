/**
 * Compares two images by resizing them to a small grid (16x16) on an offscreen canvas
 * and calculating the average difference in their RGB pixel channels.
 * Returns a promise resolving to `true` if they are visually similar (below threshold), else `false`.
 */
export function compareImages(
  imgUrl1: string,
  imgUrl2: string,
  thresholdPercent = 15
): Promise<{ isSimilar: boolean; difference: number }> {
  return new Promise((resolve, reject) => {
    // 32x32 grid for Average Hash (aHash)
    const size = 32;
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
        img.onerror = () => rejectImg(new Error(`Failed to load image from ${url}`));
        img.src = url;
      });
    };

    Promise.all([loadImg(imgUrl1), loadImg(imgUrl2)])
      .then(([img1, img2]) => {
        // Function to extract grayscale and compute average for masked pixels
        const getHashData = (img: HTMLImageElement) => {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          const data = ctx.getImageData(0, 0, size, size).data;
          
          let totalGray = 0;
          let validPixels = 0;
          const grays = new Float32Array(size * size);
          const validMap = new Uint8Array(size * size);

          for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % size;
            const y = Math.floor(pixelIndex / size);

            const dx = x - (size - 1) / 2;
            const dy = y - (size - 1) / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Skip corners to handle circular platform avatars
            if (dist > (size / 2) * 0.95) {
              continue;
            }

            // Skip fully transparent pixels
            if (data[i + 3] === 0) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Standard luminosity formula
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            grays[pixelIndex] = gray;
            validMap[pixelIndex] = 1;
            
            totalGray += gray;
            validPixels++;
          }

          const avgGray = validPixels > 0 ? totalGray / validPixels : 0;
          
          // Generate bitmask (1 if >= avg, 0 if < avg)
          const bits = new Uint8Array(size * size);
          for (let i = 0; i < grays.length; i++) {
            if (validMap[i]) {
              bits[i] = grays[i] >= avgGray ? 1 : 0;
            }
          }

          return { bits, validMap, validPixels };
        };

        const hash1 = getHashData(img1);
        const hash2 = getHashData(img2);

        let hammingDistance = 0;
        let comparedBits = 0;

        for (let i = 0; i < size * size; i++) {
          // Only compare pixels that are valid in BOTH images
          if (hash1.validMap[i] && hash2.validMap[i]) {
            if (hash1.bits[i] !== hash2.bits[i]) {
              hammingDistance++;
            }
            comparedBits++;
          }
        }

        const percentDiff = comparedBits > 0 ? (hammingDistance / comparedBits) * 100 : 0;

        // Use the threshold passed from page.tsx (25%), but aHash differences > 15% are usually distinct images.
        resolve({
          isSimilar: percentDiff <= thresholdPercent,
          difference: percentDiff,
        });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
