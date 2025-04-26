# Video Management Application

This project is a video management application that consists of a **frontend** and a **backend**. The application was initially developed to run on `localhost` and later configured for deployment on a local Kubernetes cluster using `minikube`. Below, you will find a detailed explanation of the project structure, the backend and frontend logic, and the steps to deploy the application locally and on Kubernetes.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Backend Services](#backend-services)
3. [Frontend Logic](#frontend-logic)
4. [Running the Project Locally](#running-the-project-locally)
5. [Deploying the Project on Kubernetes](#deploying-the-project-on-kubernetes)
   - [Setting Up Azure Blob Storage](#1-setting-up-azure-blob-storage)
   - [Create a Kubernetes Secret](#2-create-a-kubernetes-secret-for-environment-variables)
   - [Enable Minikube Ingress Addon](#3-enable-minikube-ingress-addon)
   - [Update the Hosts File](#4-update-the-hosts-file)
   - [Apply Kubernetes Configuration Files](#5-apply-kubernetes-configuration-files)
   - [Start Minikube Tunnel](#6-start-minikube-tunnel)
   - [Access Your Application](#7-access-your-application)
6. [Why Public Internet Deployment is Not Possible with Minikube](#why-public-internet-deployment-is-not-possible-with-minikube)
7. [Docker Configuration](#docker-configuration)
8. [Kubernetes Deployment Configuration](#kubernetes-deployment-configuration)
9. [API Routing and Domain Configuration](#api-routing-and-domain-configuration)
10. [Local Development vs. Kubernetes Deployment](#local-development-vs-kubernetes-deployment)
11. [Conclusion](#conclusion)

---

## Project Structure

The project is divided into two main folders:

1. **frontend**: Contains the React-based user interface.
2. **backend**: Contains the Node.js-based backend services.

---

## Backend Services

The backend is built using Node.js and Express and manages video uploads, storage, and retrieval. Below is a detailed explanation of each component:

### 1. `server.js`
This is the entry point of the backend application. It:
- Sets up the Express server
- Configures middleware like CORS and body-parser
- Connects routes and controllers
- Initializes the server on a specified port

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use('/api/upload', uploadRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. `services/azureBlobService.js`
This service handles file storage in Azure Blob Storage:
- Establishes connection with Azure using connection string
- Creates container if it doesn't exist
- Uploads files to the Azure Blob Storage
- Generates URLs for uploaded files
- Handles file deletion

```javascript
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

class AzureBlobService {
  constructor() {
    this.connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    this.containerName = process.env.AZURE_CONTAINER_NAME;
    this.blobServiceClient = BlobServiceClient.fromConnectionString(this.connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  }

  async uploadFile(file) {
    const blobName = uuidv4() + '-' + file.originalname;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(file.buffer, file.size);
    return {
      url: `${process.env.AZURE_BLOB_URL}/${this.containerName}/${blobName}`,
      name: blobName
    };
  }

  // Other methods for deletion, retrieval, etc.
}

module.exports = new AzureBlobService();
```

### 3. `controllers/uploadController.js`
This controller manages the request/response cycle for file operations:
- Processes incoming multipart form data
- Calls the blob service to store files
- Returns appropriate responses
- Handles error scenarios

```javascript
const azureBlobService = require('../services/azureBlobService');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadFile = [
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const result = await azureBlobService.uploadFile(req.file);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
  }
];

// Other controller methods
```

### 4. `routes/uploadRoutes.js`
This file defines the API endpoints:
- Maps HTTP methods to controller functions
- Sets up route paths
- Groups related functionalities

```javascript
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

router.post('/file', uploadController.uploadFile);
router.get('/files', uploadController.getFiles);
router.delete('/file/:id', uploadController.deleteFile);

module.exports = router;
```

### 5. Environment Configuration
The backend uses environment variables for configuration:
- Database connection strings
- Azure storage credentials
- API keys and secrets
- Application settings

These are loaded from a `.env` file in development or from Kubernetes secrets in production.

---

## Frontend Logic

The frontend is built using React, providing a user-friendly interface for video management. Below are the key components and their functionality:

### 1. `src/App.jsx`
The main component that sets up routing and the overall application structure:

```jsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Header from './components/Header';
import VideoUpload from './components/VideoUpload';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Header />
        <main className="content">
          <Switch>
            <Route exact path="/" component={VideoList} />
            <Route path="/upload" component={VideoUpload} />
            <Route path="/video/:id" component={VideoPlayer} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;
```

### 2. `src/components/VideoUpload.jsx`
Handles the video upload functionality:
- Provides a file input for selecting videos
- Validates file type and size
- Shows upload progress
- Communicates with the backend API
- Displays success/error messages

```jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import './VideoUpload.css';

function VideoUpload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const history = useHistory();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.includes('video/')) {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('Please select a valid video file');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    
    setUploading(true);
    
    try {
      await axios.post('http://localhost:5000/api/upload/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setUploading(false);
      history.push('/');
    } catch (error) {
      setUploading(false);
      setError('Failed to upload video. Please try again.');
      console.error(error);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Video</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="video">Select Video</label>
          <input
            type="file"
            id="video"
            accept="video/*"
            onChange={handleFileChange}
            required
          />
        </div>
        <button 
          type="submit" 
          disabled={uploading || !file}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  );
}

export default VideoUpload;
```

### 3. `src/components/VideoList.jsx`
Displays a list of uploaded videos:
- Fetches video data from the backend
- Handles pagination
- Provides options to play or delete videos

```jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './VideoList.css';

function VideoList() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/upload/files');
      setVideos(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch videos');
      setLoading(false);
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      try {
        await axios.delete(`http://localhost:5000/api/upload/file/${id}`);
        setVideos(videos.filter(video => video.id !== id));
      } catch (error) {
        setError('Failed to delete video');
        console.error(error);
      }
    }
  };

  if (loading) return <div className="loading">Loading videos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="video-list">
      <h2>Your Videos</h2>
      {videos.length === 0 ? (
        <p>No videos yet. <Link to="/upload">Upload one now!</Link></p>
      ) : (
        <div className="video-grid">
          {videos.map(video => (
            <div key={video.id} className="video-card">
              <div className="thumbnail">
                <img src={video.thumbnailUrl || '/placeholder.jpg'} alt={video.title} />
              </div>
              <div className="video-info">
                <h3>{video.title}</h3>
                <div className="video-actions">
                  <Link to={`/video/${video.id}`} className="play-button">
                    Play
                  </Link>
                  <button 
                    onClick={() => handleDelete(video.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VideoList;
```

### 4. `src/components/VideoPlayer.jsx`
Handles video playback:
- Fetches specific video details
- Renders the video player
- Implements playback controls
- Tracks viewing statistics

---

## Running the Project Locally

To run the project locally without Docker or Kubernetes, use the code referenced in the `//original comment` throughout the codebase. To run the project locally:

1. **Backend Configuration**:
   - The backend API endpoints expect direct calls to `http://localhost:5000/api/...`
   - Environment variables are loaded from a local `.env` file
   - The server listens on port 5000

2. **Frontend Configuration**:
   - API calls are directed to `http://localhost:5000/api/...`
   - The development server runs on port 3000
   - React's development environment provides hot-reloading

3. **Why the Current Code Can't Run Locally Without Modifications**:
   - The code has been modified to work with Docker images and Kubernetes
   - API endpoints in the frontend code might be pointing to Kubernetes service names
   - The backend expects environment variables from Kubernetes secrets
   - Port configurations may have changed to accommodate container standards

4. **How to Revert to Local Development**:
   - Look for comments labeled `//original comment` in the code
   - Restore the original endpoint URLs in the frontend API calls
   - Set up a local `.env` file with the necessary Azure credentials
   - Use `npm start` for both frontend and backend instead of building Docker images

---

## Deploying the Project on Kubernetes

To deploy the project on a local Kubernetes cluster using `minikube`, follow these detailed steps:

### 1. Setting Up Azure Blob Storage

Before deploying to Kubernetes, you need to set up Azure Blob Storage:

1. **Create an Azure Storage Account**:
   - Sign in to the [Azure Portal](https://portal.azure.com)
   - Navigate to "Storage accounts" and click "Add"
   - Fill in the required details (name, region, performance, etc.)
   - Click "Review + create" and then "Create"

2. **Create a Blob Container**:
   - Once the storage account is created, navigate to it
   - Under "Data storage," click "Containers"
   - Click "+ Container" to create a new container
   - Give it a name and set the appropriate access level (usually "Private")
   - Click "Create"

3. **Get the Connection String**:
   - In your storage account, navigate to "Access keys" under "Security + networking"
   - Copy the "Connection string" value for one of the keys
   - This will be used for your Kubernetes secret

4. **Get the Blob URL**:
   - The blob URL follows this format: `https://<storage-account-name>.blob.core.windows.net`
   - Replace `<storage-account-name>` with your actual storage account name

### 2. Create a Kubernetes Secret for Environment Variables

Kubernetes secrets securely store and manage sensitive information:

```bash
kubectl create secret generic azure-secret \
  --from-literal=AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net" \
  --from-literal=AZURE_CONTAINER_NAME="your-container-name" \
  --from-literal=AZURE_BLOB_URL="https://youraccount.blob.core.windows.net"
```

This creates a Kubernetes secret named `azure-secret` that contains the environment variables needed by the backend to connect to Azure Blob Storage. The values are encrypted and stored securely in the Kubernetes cluster.

To verify the secret was created:

```bash
kubectl get secrets
kubectl describe secret azure-secret
```

### 3. Enable Minikube Ingress Addon

Ingress is a Kubernetes resource that manages external access to services in a cluster:

```bash
minikube addons enable ingress
```

This command enables the Ingress controller in your Minikube cluster. The Ingress controller is responsible for:

- Routing external HTTP/HTTPS traffic to the appropriate services
- Implementing routing rules defined in Ingress resources
- Providing load balancing, SSL termination, and name-based virtual hosting

Without an Ingress controller, you would need to create a separate LoadBalancer service for each application you want to expose, which is inefficient and hard to manage.

To verify the Ingress controller is running:

```bash
kubectl get pods -n ingress-nginx
```

### 4. Update the Hosts File

To access your application using a domain name instead of an IP address, you need to modify your hosts file:

1. **Open Notepad as Administrator** (Right-click Notepad and select "Run as administrator")
2. **Open the hosts file** located at `C:\Windows\System32\drivers\etc\hosts`
3. **Add the following line** at the end of the file:
   ```
   127.0.0.1 video.local
   ```
4. **Save the file**

Why this is necessary:
- DNS (Domain Name System) resolves domain names to IP addresses
- By adding an entry to your hosts file, you're creating a local DNS record
- When your browser requests `video.local`, it will check the hosts file first
- The hosts file will direct the request to `127.0.0.1` (localhost)
- Minikube's ingress controller will then route the request to the appropriate service based on the hostname
- Without this step, your browser wouldn't know where to send requests for `video.local`
- This approach allows you to use named-based virtual hosting without configuring a real DNS server

This setup is particularly important for features like cookies and CORS that often rely on consistent domain names.

### 5. Apply Kubernetes Configuration Files

Your application's Kubernetes configuration should be stored in YAML files in the `k8s` directory. These files define:
- Deployments (for the frontend and backend)
- Services (to expose the deployments)
- Ingress rules (to route external traffic)
- ConfigMaps and Secrets (for configuration)

Apply these configurations with:

```bash
kubectl apply -f k8s/
```

This command processes all YAML files in the `k8s` directory and creates/updates the corresponding Kubernetes resources.

To check the status of your deployments:
```bash
kubectl get deployments
kubectl get pods
kubectl get services
kubectl get ingress
```

You should see your backend and frontend deployments running, services exposing them, and an ingress rule configured.

### 6. Start Minikube Tunnel

To access your application through the Ingress, you need to establish a network tunnel:

```bash
minikube tunnel
```

**What this command does:**
- Creates a network route between your local machine and the Minikube VM
- Allows traffic sent to your local machine (on specific ports) to reach services in the Kubernetes cluster
- Maps the Kubernetes cluster's internal network to your local network
- Enables Ingress resources to work with a real IP address

**Why it's necessary:**
- By default, Kubernetes services and ingresses inside Minikube are not accessible from your host machine
- Minikube runs in a virtual machine with its own network
- The tunnel creates a bridge between your host network and the VM's network
- Allows you to access services exposed via Ingress

**Important notes:**
- Keep the terminal window with `minikube tunnel` running while you're using the application
- The command requires administrator privileges (it may prompt for your password)
- You may see log messages about traffic flowing through the tunnel

### 7. Access Your Application

After completing all the steps above:
1. Open your web browser
2. Navigate to `http://video.local`
3. You should see your application running

---

## Why Public Internet Deployment is Not Possible with Minikube

Minikube is designed for local development and testing, not for production deployment accessible from the public internet, for several reasons:

1. **Network Limitations**:
   - Minikube runs inside a VM or container on your local machine
   - It uses a private network that's not accessible from the internet
   - The `minikube tunnel` command only creates a route from your local machine to the VM

2. **No External IP Allocation**:
   - Minikube cannot request real external IP addresses from cloud providers
   - LoadBalancer services in Minikube don't get real external IPs
   - Ingress resources are only accessible locally

3. **Security Concerns**:
   - Minikube lacks many security features needed for production deployments
   - It's not designed to handle external traffic securely
   - Exposing Minikube directly to the internet would create significant security risks

4. **Resource Constraints**:
   - Minikube runs with limited resources (CPU, memory, disk)
   - It's not designed to handle production-level traffic or workloads
   - Performance would be severely limited

For public internet deployment, you should use a managed Kubernetes service like:
- Azure Kubernetes Service (AKS)
- Google Kubernetes Engine (GKE)
- Amazon Elastic Kubernetes Service (EKS)

These services provide:
- Real external IP addresses
- Load balancing
- Security features
- Scalability
- High availability
- Production-grade infrastructure

---

## Docker Configuration

The application is containerized using Docker to ensure consistent deployment across different environments. Below are explanations of the Dockerfiles for both the frontend and backend components:

### Backend Dockerfile

```dockerfile
# Use official Node.js image with Debian (for apt support)
FROM node:20

# Install FFmpeg
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

# Expose the port your app runs on (change if needed)
EXPOSE 4000

# Start the app
CMD ["node", "src/index.js"]
```

**Key aspects of the backend Dockerfile:**
- Uses the official Node.js 20 image as the base
- Installs FFmpeg for video processing capabilities
- Optimizes the build process by copying package files first to leverage Docker's layer caching
- Exposes port 4000 for the backend API
- Runs the application using the entry point `src/index.js`

### Frontend Dockerfile

```dockerfile
# Build stage
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Add custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Key aspects of the frontend Dockerfile:**
- Uses a multi-stage build process to optimize the final image size
- First stage uses Node.js to build the React application
- Second stage uses lightweight Nginx Alpine image to serve the static files
- Custom Nginx configuration is added to handle routing and API proxying
- Exposes port 80 for HTTP traffic

## Kubernetes Deployment Configuration

The Kubernetes configuration files in the `k8s` directory define how the application should be deployed and managed on the cluster. Let's look at the key deployment files:

### Backend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
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
          image: pnad01/backend-video:v8
          ports:
            - containerPort: 4000
          envFrom:
            - secretRef:
                name: azure-secret
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  type: ClusterIP
  # type: LoadBalancer
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 4000
      targetPort: 4000
```

**Key components of the backend deployment:**
- Defines a Kubernetes Deployment that creates and manages a Pod with the backend container
- Specifies the Docker image to use (`pnad01/backend-video:v8`)
- Sets up the container port (4000)
- Injects environment variables from the `azure-secret` we created earlier
- Creates a ClusterIP Service that exposes the backend within the cluster on port 4000
- The commented out `type: LoadBalancer` shows an alternative approach that would expose the service directly outside the cluster if we weren't using Ingress

### Frontend Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: pnad01/frontend-video:v11
          ports:
            - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: ClusterIP
  # type: LoadBalancer
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

**Key components of the frontend deployment:**
- Similar to the backend, defines a Deployment for the frontend container
- Uses the Docker image `pnad01/frontend-video:v11`
- Exposes port 80 for HTTP traffic
- Creates a ClusterIP Service that makes the frontend accessible within the cluster

### Ingress Configuration

The Ingress resource is defined in the `ingress.yaml` file and configures how external traffic is routed to the services within the Kubernetes cluster:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: video-ingress
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "500m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
spec:
  rules:
    - host: video.local
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 4000
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
```

**Key components of the Ingress configuration:**

- **Metadata**: Names the ingress resource as `video-ingress`.
- **Annotations**: 
  - `nginx.ingress.kubernetes.io/proxy-body-size: "500m"` - Allows large file uploads up to 500MB
  - `proxy-connect-timeout`, `proxy-send-timeout`, and `proxy-read-timeout` - Configures longer timeouts (600 seconds) to accommodate video uploads and processing
- **Rules**:
  - Specifies that requests to the host `video.local` should be routed based on the path
  - Requests to `/api` and its subpaths are routed to the backend service on port 4000
  - All other requests (matching the root path `/`) are routed to the frontend service on port 80
- **Path Types**: 
  - `Prefix` indicates that the path specified is matched as a prefix, so `/api` will match `/api/upload`, `/api/files`, etc.

This configuration creates a single entry point for the application, allowing the frontend and backend to be accessed through the same domain, which simplifies development and eliminates CORS issues.

## API Routing and Domain Configuration

### How API Routes Are Accessed

The application architecture uses a combination of the Ingress controller, host file configuration, and service discovery to route requests appropriately:

1. **Client-Side Request Flow**:
   - When a user accesses `http://video.local` in their browser, the hosts file mapping we created directs this request to `127.0.0.1` (localhost).
   - If the browser makes an API request to `http://video.local/api/upload/files`, the same hosts file is used to resolve `video.local` to localhost.
   - The request is sent to the local IP, where the `minikube tunnel` is listening.

2. **Ingress Controller Routing**:
   - The Ingress controller receives the request and checks the host header (`video.local`).
   - Based on the Ingress rules, it determines where to route the request:
     - Requests to the root path `/` are sent to the frontend service.
     - Requests to paths starting with `/api/` are sent to the backend service.
   - For API requests, the Ingress controller's rewrite rules (using the annotation `nginx.ingress.kubernetes.io/rewrite-target: /$1`) strip the `/api/` prefix before forwarding to the backend service. This means a request to `/api/upload/files` is rewritten to `/upload/files` when it reaches the backend.

3. **Service Resolution**:
   - The Kubernetes service discovery system directs the traffic to the appropriate pods.
   - The ClusterIP service for the backend routes traffic to the backend pod on port 4000.
   - The backend API processes the request and returns a response.

4. **Response Path**:
   - The response follows the reverse path back to the client browser.
   - The Ingress controller forwards the backend's response to the client.

This multi-layered routing setup allows the application to have a clean separation between frontend and backend while appearing as a single application to the user. The use of a single domain (`video.local`) also helps avoid CORS issues that would arise if the frontend and backend were accessed through different domains.

### Benefits of This Approach

1. **Simplified Development**:
   - Developers can use a consistent domain in both development and Kubernetes environments.
   - API calls don't need to change when moving between environments.

2. **Enhanced Security**:
   - All traffic goes through the Ingress controller, which can apply security policies.
   - Services aren't directly exposed outside the cluster.

3. **Flexibility**:
   - The routing configuration can be updated without changing the application code.
   - Additional paths or services can be added to the Ingress as needed.

With this setup, the application can be accessed through `http://video.local` in the browser, and all API requests to `http://video.local/api/*` are automatically routed to the backend service, creating a seamless user experience.

## Local Development vs. Kubernetes Deployment

The project was originally designed to run on localhost, then later modified for containerization and Kubernetes deployment. This transition involves several important changes:

### Running Locally (Original Configuration)

The project can be run locally without Docker or Kubernetes by using the code referenced in the `//original comment` throughout the codebase. To run the project locally:

1. **Backend Configuration**:
   - The backend API endpoints expect direct calls to `http://localhost:5000/api/...`
   - Environment variables are loaded from a local `.env` file
   - The server listens on port 5000

2. **Frontend Configuration**:
   - API calls are directed to `http://localhost:5000/api/...`
   - The development server runs on port 3000
   - React's development environment provides hot-reloading

3. **Why the Current Code Can't Run Locally Without Modifications**:
   - The code has been modified to work with Docker images and Kubernetes
   - API endpoints in the frontend code might be pointing to Kubernetes service names
   - The backend expects environment variables from Kubernetes secrets
   - Port configurations may have changed to accommodate container standards

4. **How to Revert to Local Development**:
   - Look for comments labeled `//original comment` in the code
   - Restore the original endpoint URLs in the frontend API calls
   - Set up a local `.env` file with the necessary Azure credentials
   - Use `npm start` for both frontend and backend instead of building Docker images

### Kubernetes Deployment (Current Configuration)

The current setup is optimized for running in a Kubernetes environment:

1. **Docker Images**:
   - Frontend is built and served from an Nginx container
   - Backend runs in a Node.js container
   - All dependencies are packaged within the containers

2. **Service Discovery**:
   - Services communicate using Kubernetes DNS names
   - The frontend might make API calls to `http://backend-service:4000/api/...`
   - Or the Ingress controller handles the routing transparently

3. **Configuration**:
   - Environment variables are injected from Kubernetes secrets
   - Network policies are defined by Kubernetes resources
   - The entire application stack is orchestrated by Kubernetes

This dual configuration approach allows the application to be developed locally for rapid iteration, then deployed to Kubernetes for a more production-like environment.

## Conclusion

This project demonstrates a complete video management application with a React frontend and Node.js backend, along with deployment options for both local development and Kubernetes. The application showcases modern web development practices, cloud storage integration, and containerized deployment workflows.

By following the steps outlined above, you can run the application locally or deploy it on a local Kubernetes cluster using `minikube`. For production deployments, consider using a managed Kubernetes service like AKS, GKE, or EKS to ensure reliability, security, and scalability.
