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
    // 16x16 is sufficient for average color hash comparison
    const size = 16;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

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
        // Draw first image
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img1, 0, 0, size, size);
        const data1 = ctx.getImageData(0, 0, size, size).data;

        // Draw second image
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img2, 0, 0, size, size);
        const data2 = ctx.getImageData(0, 0, size, size).data;

        let totalDiff = 0;
        let count = 0;

        for (let i = 0; i < data1.length; i += 4) {
          const pixelIndex = i / 4;
          const x = pixelIndex % size;
          const y = Math.floor(pixelIndex / size);

          // Distance from center of grid
          const dx = x - (size - 1) / 2;
          const dy = y - (size - 1) / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Skip corner pixels (outside circular center boundary)
          if (dist > (size / 2) * 0.85) {
            continue;
          }

          const r1 = data1[i];
          const g1 = data1[i + 1];
          const b1 = data1[i + 2];
          const a1 = data1[i + 3];

          const r2 = data2[i];
          const g2 = data2[i + 1];
          const b2 = data2[i + 2];
          const a2 = data2[i + 3];

          // Skip comparisons if both are fully transparent (e.g., empty space)
          if (a1 === 0 && a2 === 0) continue;

          // Compute absolute differences
          const diffR = Math.abs(r1 - r2);
          const diffG = Math.abs(g1 - g2);
          const diffB = Math.abs(b1 - b2);
          const diffA = Math.abs(a1 - a2);

          // We weight the channel differences by average alpha to avoid false differences on transparent edges
          const alphaFactor = ((a1 + a2) / 2) / 255;
          const pixelDiff = ((diffR + diffG + diffB) / 3) * alphaFactor + diffA * (1 - alphaFactor);

          totalDiff += pixelDiff;
          count++;
        }

        // Calculate average difference as a percentage (max difference is 255)
        const averageDiff = count > 0 ? totalDiff / count : 0;
        const percentDiff = (averageDiff / 255) * 100;

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
