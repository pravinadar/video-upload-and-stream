import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs/promises";

export async function transcodeVideo(inputPath, outputDir, baseName) {
  const resolutions = {
    "360p": "640x360",
    "480p": "854x480",
    "720p": "1280x720",
  };

  await fs.mkdir(outputDir, { recursive: true });

  const outputPaths = {};

  const transcodePromises = Object.entries(resolutions).map(
    ([label, size]) => {
      const outputPath = path.join(outputDir, `${baseName}_${label}.mp4`);
      outputPaths[label] = outputPath;

      return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions(["-vf", `scale=${size}`, "-c:v libx264", "-preset veryfast", "-crf 23", "-c:a aac"])
          .on("end", () => resolve())
          .on("error", reject)
          .save(outputPath);
      });
    }
  );

  await Promise.all(transcodePromises);
  return outputPaths; // { '360p': '/path', '480p': '/path', ... }
}
