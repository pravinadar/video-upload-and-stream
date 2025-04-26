import express from "express";
import multer from "multer";
import { uploadFileToBlob } from "./storage.js";
import path from "path";
import { transcodeVideo } from "./transcoder.js";
import fs from "fs/promises";
import cors from "cors";
import videoRoutes from "./videoRoutes.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use('/api/videos', videoRoutes);

// app.post("/api/upload", upload.single("video"), async (req, res) => {
//   try {
//     const filePath = req.file.path;
//     const originalName = req.file.originalname;
//     const blobName = path.basename(originalName);
//     await uploadFileToBlob(filePath, blobName);
//     res.send({ message: "Uploaded successfully!", blobName });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({ error: "Upload failed." });
//   }
// });

app.post("/api/upload", upload.single("video"), async (req, res) => {
    try {
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const baseName = originalName.split(".")[0];
        const tempOutputDir = `processed/${baseName}`;

        const transcodedPaths = await transcodeVideo(filePath, tempOutputDir, baseName);

        const uploadPromises = Object.entries(transcodedPaths).map(
            async ([label, file]) => {
                const blobName = `${baseName}/${label}.mp4`;
                await uploadFileToBlob(file, blobName);
                return { label, blobName };
            }
        );

        const uploadedFiles = await Promise.all(uploadPromises);

        const title = baseName;
        const resolutionMap = {};
        uploadedFiles.forEach(file => {
            resolutionMap[file.label] = file.blobName;
        });
        await saveVideoMetadata(title, resolutionMap);


        // Optional: Clean up local files
        await fs.rm(tempOutputDir, { recursive: true, force: true });
        await fs.unlink(filePath);

        res.send({
            message: "Video uploaded and transcoded successfully.",
            videos: uploadedFiles,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Processing failed." });
    }
});

const METADATA_PATH = "videos.json";

async function saveVideoMetadata(title, resolutions) {
    let existing = [];
    try {
        const data = await fs.readFile(METADATA_PATH, "utf-8");
        existing = JSON.parse(data);
    } catch { }

    existing.push({ title, resolutions });

    await fs.writeFile(METADATA_PATH, JSON.stringify(existing, null, 2));
}

app.get("/api/videos", async (req, res) => {
    try {
        const data = await fs.readFile(METADATA_PATH, "utf-8");
        const videos = JSON.parse(data);
        res.send(videos);
    } catch {
        res.send([]);
    }
});

// DELETE /api/videos/:title - Delete a video
app.delete("/api/videos/:title", async (req, res) => {
    try {
        const videoTitle = decodeURIComponent(req.params.title);

        // 1. Read the current videos.json file
        let videos = [];
        try {
            const data = await fs.readFile(METADATA_PATH, "utf-8");
            videos = JSON.parse(data);
        } catch (err) {
            // If videos.json doesn't exist, just return success as there's nothing to delete
            return res.send({ success: true, message: "No videos found to delete" });
        }

        // 2. Find the video in the metadata
        const videoIndex = videos.findIndex(video => video.title === videoTitle);

        if (videoIndex === -1) {
            return res.status(404).send({ success: false, message: "Video not found" });
        }

        // 3. Remove the video from the metadata array
        const deletedVideo = videos.splice(videoIndex, 1)[0];

        // 4. Write the updated metadata back to videos.json
        await fs.writeFile(METADATA_PATH, JSON.stringify(videos, null, 2));

        // 5. Delete the video files from Azure Blob Storage
        const { deleteVideoFromStorage } = await import("./storage.js");
        await deleteVideoFromStorage(videoTitle);

        res.send({
            success: true,
            message: `Video '${videoTitle}' deleted successfully`,
            deletedVideo
        });
    } catch (err) {
        console.error("Error deleting video:", err);
        res.status(500).send({ success: false, error: "Failed to delete video" });
    }
});


app.listen(4000, () => console.log("🚀 Backend running on http://localhost:4000"));
