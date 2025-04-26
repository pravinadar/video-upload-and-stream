import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const AZURE_CONN = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONN);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

export async function uploadFileToBlob(filePath, blobName) {
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadFile(filePath);
  console.log(`✅ Uploaded ${blobName}`);
}

// New function to delete a blob and all associated resolution variants
export async function deleteVideoFromStorage(videoTitle) {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_CONN);
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // List all blobs with the prefix of videoTitle/
    // This will match all resolution variants (videoTitle/360p.mp4, videoTitle/480p.mp4, etc.)
    const prefix = `${videoTitle}/`;
    const blobsToDelete = containerClient.listBlobsFlat({ prefix });
    
    // Delete each blob
    for await (const blob of blobsToDelete) {
      console.log(`Deleting blob: ${blob.name}`);
      const blockBlobClient = containerClient.getBlockBlobClient(blob.name);
      await blockBlobClient.delete();
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting video from storage: ${error.message}`);
    throw error;
  }
}
