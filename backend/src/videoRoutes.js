import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  const videoId = decodeURIComponent(req.params.id);
  console.log(`videoId: ${videoId}`);

  const resolutions = ['360p', '480p', '720p'];
  const baseUrl = process.env.AZURE_BLOB_URL;

  const videoUrls = {};
  resolutions.forEach(res => {
    videoUrls[res] = `${baseUrl}/${videoId}/${res}.mp4`;
  });

  res.json({
    id: videoId,
    title: videoId,
    urls: videoUrls
  });
});

export default router;
