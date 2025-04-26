import React, { useState, useRef } from 'react';
import { Upload, Video, X, Upload as UploadIcon } from 'lucide-react';

const UploadPage = () => {
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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

      //original
      // const res = await fetch('http://localhost:4000/api/upload', {
      //   method: 'POST',
      //   body: formData,
      //   // Simulating progress updates
      //   onUploadProgress: (progressEvent) => {
      //     const percentCompleted = Math.round(
      //       (progressEvent.loaded * 100) / progressEvent.total
      //     );
      //     setUploadProgress(percentCompleted);
      //   },
      // });

      // for docker and k8s deployment
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        // Simulating progress updates
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

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 100MB

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setMessage('File size exceeds the 500MB limit.');
        return;
      }
      setVideoFile(file);

      // Create a preview URL for the video
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      // Extract filename as default title
      const filename = file.name.split('.').slice(0, -1).join('.');
      if (!title) setTitle(filename);
    }
  };

  const clearFile = () => {
    setVideoFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl text-white">
      <h2 className="text-3xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
        Upload Your Video
      </h2>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${previewUrl ? 'border-blue-500 bg-blue-900 bg-opacity-20' : 'border-gray-600 hover:border-blue-400 hover:bg-gray-800'
          }`}
        onClick={() => fileInputRef.current?.click()}
        style={{ minHeight: '200px' }}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl ? (
          <div className="relative w-full">
            <video
              src={previewUrl}
              className="w-full h-40 object-cover rounded-lg"
              controls
            />
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full"
            >
              <X size={20} />
            </button>
            <p className="mt-2 text-sm text-gray-300 truncate">
              {videoFile?.name}
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-16 h-16 text-blue-400 mb-4" />
            <p className="text-lg font-medium mb-2">Drag video here or click to browse</p>
            <p className="text-sm text-gray-400">MP4, MOV, WebM formats supported</p>
          </>
        )}
      </div>

      {/* Title Input */}
      {/* <div className="mb-6">
        <label className="block text-sm font-medium mb-2 text-gray-300">
          Video Title
        </label>
        <input
          type="text"
          placeholder="Enter a catchy title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
        />
      </div> */}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || !videoFile}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center transition-all duration-300 ${uploading || !videoFile
            ? 'bg-gray-700 cursor-not-allowed opacity-70'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg'
          }`}
      >
        {uploading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading {uploadProgress}%
          </div>
        ) : (
          <div className="flex items-center">
            <UploadIcon className="mr-2 h-5 w-5" />
            Upload Video
          </div>
        )}
      </button>

      {/* Progress Bar */}
      {uploading && (
        <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${message.includes('successful')
            ? 'bg-green-900 bg-opacity-30 text-green-300 border border-green-700'
            : 'bg-red-900 bg-opacity-30 text-red-300 border border-red-700'
          }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default UploadPage;