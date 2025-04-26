# Video Processing and Streaming Application

This project implements a comprehensive video processing and streaming platform using modern web technologies. It allows uploading videos, automatically transcodes them to multiple resolutions (360p, 480p, 720p), stores them in cloud storage, and enables streaming with quality switching. The entire application is containerized and deployed with Kubernetes for scalability.

## Table of Contents
- [Tech Stack Overview](#tech-stack-overview)
- [Azure Blob Storage Configuration](#azure-blob-storage-configuration)
- [Backend Implementation](#backend-implementation)
- [Frontend Implementation](#frontend-implementation)
- [Docker Containerization](#docker-containerization)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Conclusion](#conclusion)

---

## Tech Stack Overview

### Frontend Architecture
- **Framework**: React 19.0.0
- **Routing**: React Router DOM 7.5.1
- **Styling**: Tailwind CSS 4.1.4
- **UI Icons**: Lucide React 0.501.0
- **HTTP Client**: Axios 1.8.4
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Node.js with Express
- **Video Processing**: FFmpeg (via fluent-ffmpeg)
- **File Upload**: Multer
- **Cloud Storage**: Azure Blob Storage SDK
- **Cross-Origin Support**: CORS middleware

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **Storage**: Azure Blob Storage
- **Networking**: Kubernetes Ingress

---

## Azure Blob Storage Configuration

The application uses Azure Blob Storage to store and serve video files in multiple resolutions.

### Setup Process:
1. **Azure Storage Account Creation**:
   - Created a dedicated storage account in Azure Portal
   - Set region to ensure low latency for video streaming

2. **Container Configuration**:
   - Created a blob container named `videostorage`
   - Set access level to "Container" to enable public read access for video streaming

3. **CORS Configuration**:
   - Configured CORS settings in Azure Portal to allow requests from the application domain

4. **Connection Integration**:
   - Stored the connection string in environment variables
   - Created a dedicated storage service module for upload operations:

```javascript
// Example of the storage integration
import { BlobServiceClient } from "@azure/storage-blob";

export async function uploadFileToBlob(filePath, blobName) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  const containerClient = blobServiceClient.getContainerClient("videostorage");
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.uploadFile(filePath);
  return blockBlobClient.url;
}
```

---

## Backend Implementation

The backend handles video uploads, transcoding, and provides APIs for video metadata.

### Video Upload API (`/api/upload` Endpoint)

The video upload workflow is implemented in `index.js` and follows these steps:

1. **File Reception**: Uses Multer middleware to receive and temporarily store the uploaded video file
2. **Video Transcoding**: Processes the video into multiple resolutions using FFmpeg
3. **Cloud Storage**: Uploads each transcoded version to Azure Blob Storage
4. **Metadata Storage**: Saves video metadata in a local JSON file

```javascript
app.post("/api/upload", upload.single("video"), async (req, res) => {
    try {
        // Extract file information
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const baseName = originalName.split(".")[0];
        const tempOutputDir = `processed/${baseName}`;

        // Transcode to multiple resolutions
        const transcodedPaths = await transcodeVideo(filePath, tempOutputDir, baseName);

        // Upload all versions to Azure Blob Storage
        const uploadPromises = Object.entries(transcodedPaths).map(
            async ([label, file]) => {
                const blobName = `${baseName}/${label}.mp4`;
                await uploadFileToBlob(file, blobName);
                return { label, blobName };
            }
        );

        // Wait for all uploads to complete
        const uploadedFiles = await Promise.all(uploadPromises);

        // Save metadata for video listing
        const title = baseName;
        const resolutionMap = {};
        uploadedFiles.forEach(file => {
            resolutionMap[file.label] = file.blobName;
        });
        await saveVideoMetadata(title, resolutionMap);

        // Clean up temporary files
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
```

### Video Transcoding Implementation

The transcoding functionality in `transcoder.js` uses FFmpeg to convert videos to different resolutions:

```javascript
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
          .outputOptions([
            "-vf", `scale=${size}`, 
            "-c:v libx264", 
            "-preset veryfast", 
            "-crf 23", 
            "-c:a aac"
          ])
          .on("end", () => resolve())
          .on("error", reject)
          .save(outputPath);
      });
    }
  );

  await Promise.all(transcodePromises);
  return outputPaths;
}
```

### Video Metadata API (`/api/videos` Endpoint)

The application stores video metadata in a local JSON file (`videos.json`) and provides endpoints to:
1. List all available videos
2. Get information about a specific video by ID

```javascript
// Get all videos
app.get("/api/videos", async (req, res) => {
    try {
        const data = await fs.readFile(METADATA_PATH, "utf-8");
        const videos = JSON.parse(data);
        res.send(videos);
    } catch {
        res.send([]);
    }
});

// Get a specific video by ID
router.get('/:id', async (req, res) => {
  const videoId = decodeURIComponent(req.params.id);
  
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
```

### CORS Configuration

To allow cross-origin requests from the frontend, CORS middleware is configured:

```javascript
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
```

---

## Frontend Implementation

The frontend provides a user-friendly interface for uploading, browsing, and playing videos.

### Application Structure

The React application uses React Router for navigation between three main views:
- Video List (Home)
- Video Player
- Upload Page

```javascript
// App.jsx - Main routing configuration
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<VideoList />} />
        <Route path="/videos/:id" element={<VideoPlayer />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
    </Router>
  );
}
```

### Video List Component

The `VideoList.jsx` component fetches and displays all available videos:

1. **API Integration**: Fetches video metadata from `/api/videos` endpoint
2. **URL Adaptation**: During Docker and Kubernetes deployment, uses relative URLs instead of absolute URLs
3. **UI Presentation**: Displays videos in a responsive grid with generated thumbnails
4. **Navigation**: Provides links to individual videos and an upload button

```javascript
// Key parts of VideoList.jsx
useEffect(() => {
    setLoading(true);
    fetch("/api/videos")  // Note: Using relative path for Kubernetes deployment
        .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch videos");
            return res.json();
        })
        .then((data) => {
            setVideos(data);
            setLoading(false);
        })
        .catch((err) => {
            console.error("Error fetching videos:", err);
            setError(err.message);
            setLoading(false);
        });
}, []);
```

### Video Player Component

The `VideoPlayer.jsx` component implements:

1. **Dynamic Video Loading**: Fetches specific video data based on the URL parameter
2. **Resolution Switching**: Allows users to switch between 360p, 480p, and 720p formats
3. **Playback Control**: Preserves playback position when switching resolutions
4. **User Interface**: Provides controls for resolution selection, download, and sharing

```javascript
// Resolution switching in VideoPlayer.jsx
const handleResolutionChange = (newResolution) => {
  setResolution(newResolution);
  setShowResolutionMenu(false);
  
  // Save current time to resume at same point after resolution change
  const currentTime = videoRef.current?.currentTime;
  
  // Apply after resolution change
  setTimeout(() => {
    if (videoRef.current && currentTime) {
      videoRef.current.currentTime = currentTime;
    }
  }, 100);
};
```

The video player renders the appropriate URL based on the selected resolution:

```jsx
<video 
  ref={videoRef}
  key={resolution} 
  controls 
  className="w-full h-full object-contain" 
  poster={videoData.thumbnail}
>
  <source src={videoData.urls?.[resolution] || "#"} type="video/mp4" />
  Your browser does not support the video tag.
</video>
```

### Upload Page Component

The `UploadPage.jsx` component provides:

1. **File Selection**: Drag-and-drop or browse interface for video selection
2. **File Preview**: Shows a preview of the selected video before upload
3. **Progress Tracking**: Displays upload and processing progress
4. **API Integration**: Sends video file to the backend for processing

```javascript
// Upload handling in UploadPage.jsx
const handleUpload = async () => {
  if (!title || !videoFile) {
    setMessage('Please enter a title and select a video file.');
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('video', videoFile);

  try {
    setUploading(true);
    setMessage('');
    setUploadProgress(0);

    // For docker and k8s deployment - uses relative path
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      },
    });

    const data = await res.json();
    setMessage(data.message || 'Upload successful!');
    setTitle('');
    setVideoFile(null);
    setPreviewUrl(null);
  } catch (error) {
    console.error('Upload error:', error);
    setMessage('Upload failed.');
  } finally {
    setUploading(false);
    setUploadProgress(0);
  }
};
```

---

## Docker Containerization

The application is containerized using Docker to ensure consistent deployment across environments.

### Backend Dockerfile

```dockerfile
# Use official Node.js image with Debian (for apt support)
FROM node:20

# Install FFmpeg for video processing
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the backend code
COPY . .

# Expose the port your app runs on
EXPOSE 4000

# Start the app
CMD ["node", "src/index.js"]
```

### Docker Build and Run Process

To build and test the Docker container:

```bash
# Build the Docker image
docker build -t video-backend .

# Run the container locally
docker run -p 4000:4000 -e AZURE_STORAGE_CONNECTION_STRING="your-connection-string" video-backend
```

---

## Kubernetes Deployment

The application is deployed to Kubernetes for scalability and better resource management.

### Kubernetes Manifest Files

#### 1. Secret for Azure Credentials

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-secret
type: Opaque
data:
  AZURE_STORAGE_CONNECTION_STRING: <base64-encoded-connection-string>
  AZURE_BLOB_URL: <base64-encoded-url>
```

#### 2. Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: video-backend:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 4000
        envFrom:
        - secretRef:
            name: azure-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /api/videos
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
```

#### 3. Backend Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: ClusterIP
```

#### 4. Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
spec:
  rules:
  - host: video.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

### Deployment Steps

1. **Preparation**:
   - Add `video.local` to the hosts file (`127.0.0.1 video.local`)
   - Encode Azure connection strings to base64 for the Secret

2. **Deployment Commands**:
   ```bash
   # Apply all Kubernetes configuration files
   kubectl apply -f k8s/azure-secret.yaml
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/backend-service.yaml
   kubectl apply -f k8s/ingress.yaml
   
   # Enable local access to the Ingress
   minikube tunnel
   ```

3. **Verification**:
   ```bash
   # Check if pods are running
   kubectl get pods
   
   # View logs of the backend pod
   kubectl logs -f deployment/backend-deployment
   ```

### Detailed Configuration Explanation

#### Docker Configuration

The `Dockerfile` for the backend component needs to support both Node.js and FFmpeg:

```dockerfile
# Use official Node.js image with Debian (for apt support)
FROM node:20

# Install FFmpeg for video processing
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only package files first for caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the backend code
COPY . .

# Expose the port your app runs on
EXPOSE 4000

# Start the app
CMD ["node", "src/index.js"]
```

**Key aspects explained:**
- **Base Image**: Uses `node:20` which includes a Debian-based system that supports `apt-get` for installing FFmpeg
- **FFmpeg Installation**: Installs FFmpeg using apt-get, then cleans up apt caches to reduce image size
- **Build Optimization**: Leverages Docker layer caching by copying and installing dependencies before copying application code
- **Port Configuration**: Exposes port 4000 to match the Express server's listening port
- **Startup Command**: Uses `CMD` to specify how to start the application

#### Kubernetes Manifests

##### 1. Secret Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: azure-secret
type: Opaque
data:
  AZURE_STORAGE_CONNECTION_STRING: <base64-encoded-connection-string>
  AZURE_BLOB_URL: <base64-encoded-url>
```

**Important notes:**
- Secret values must be base64 encoded before adding them to the YAML file
- To encode values: `echo -n "your-connection-string" | base64`
- These secrets are mounted as environment variables in the container
- Secrets should never be committed to source control - consider using a secret management system for production

##### 2. Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: video-backend:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 4000
        envFrom:
        - secretRef:
            name: azure-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /api/videos
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Key configuration elements:**
- **Replicas**: Specifies how many identical pods to run (1 for development; can scale for production)
- **Image**: References the Docker image built from our Dockerfile
- **imagePullPolicy: IfNotPresent**: Uses the local image if available, which is important for Minikube with locally built images
- **Environment Variables**: Mounts the Azure secrets as environment variables via `envFrom`
- **Resource Limits**: Sets memory and CPU boundaries to prevent resource starvation
- **Readiness Probe**: Checks if the application is ready to receive traffic by making requests to the /api/videos endpoint

##### 3. Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 4000
  type: ClusterIP
```

**Important aspects:**
- **Selector**: Matches the labels defined in the deployment to route traffic to the right pods
- **Port Mapping**: Routes external port 80 to the container's port 4000
- **Service Type**: `ClusterIP` makes the service only accessible within the cluster
- The Ingress will provide external access to this service

##### 4. Ingress Configuration

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: backend-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "100m"
spec:
  rules:
  - host: video.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

**Key configuration details:**
- **Host**: `video.local` is mapped to 127.0.0.1 in the local hosts file
- **Annotations**: `proxy-body-size: "100m"` increases the maximum upload size to 100MB
- **Path Configuration**: Routes all requests (`pathType: Prefix` and path `/`) to the backend service
- **Backend Reference**: Points to our backend service on port 80

When working with Minikube, the `minikube tunnel` command creates a network route that makes these services accessible from the host machine via the defined hostname.

---

## Conclusion

This project demonstrates a comprehensive video processing and streaming pipeline using modern web technologies. The application allows users to upload videos, automatically transcodes them to multiple resolutions, stores them in cloud storage, and provides a sleek interface for playback with resolution switching.

The entire application is containerized using Docker and deployed on Kubernetes, showcasing a production-ready approach to deploying media applications.

Key technical achievements:
- Parallel video transcoding with FFmpeg
- Cloud storage integration with Azure Blob Storage
- Modern responsive UI with React and Tailwind CSS
- Containerization with Docker
- Orchestration with Kubernetes
- Resolution switching during video playback

Future improvements could include:
- Authentication and user accounts
- Video analytics and insights
- Adaptive bitrate streaming (HLS or DASH)
- CDN integration for global distribution
- Automated testing pipeline