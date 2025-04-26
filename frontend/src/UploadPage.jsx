import React, { useState, useRef } from 'react';
import { Video, X, Upload as UploadIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!videoFile) {
      setMessage('Please select a video file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title || videoFile.name.split('.').slice(0, -1).join('.'));
    formData.append('video', videoFile);

    try {
      setUploading(true);
      setMessage('');
      setUploadProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress < 95 ? newProgress : prev;
        });
      }, 500);

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
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      setMessage(data.message || 'Upload successful!');
      setTitle('');
      setVideoFile(null);
      setPreviewUrl(null);
      
      // Auto-redirect after successful upload
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

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
    setTitle('');
    setMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors duration-300"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to videos
          </button>

          {/* Upload Card */}
          <div className="bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 p-8">
            <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Upload Your Video
            </h2>

            {/* Status Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-start ${
                message.includes('successful') 
                  ? 'bg-green-900 bg-opacity-30 text-green-200 border border-green-700' 
                  : 'bg-red-900 bg-opacity-30 text-red-200 border border-red-700'
              }`}>
                {message.includes('successful') 
                  ? <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" /> 
                  : <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
                }
                <span>{message}</span>
              </div>
            )}

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-10 mb-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center ${
                previewUrl 
                  ? 'border-blue-500 bg-blue-900 bg-opacity-20' 
                  : 'border-gray-600 hover:border-blue-400 hover:bg-gray-700'
              }`}
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: '240px' }}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative w-full max-w-lg">
                  <video
                    src={previewUrl}
                    className="w-full h-48 object-cover rounded-lg shadow-lg"
                    controls
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); clearFile(); }}
                    className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <p className="mt-3 text-gray-300 truncate font-medium">
                    {videoFile?.name}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {(videoFile?.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6 p-6 bg-blue-600 bg-opacity-20 rounded-full">
                    <Video className="w-16 h-16 text-blue-400" />
                  </div>
                  <p className="text-xl font-medium mb-3">Drag video here or click to browse</p>
                  <p className="text-sm text-gray-400">MP4, MOV, WebM formats supported (max 500MB)</p>
                </>
              )}
            </div>

            {/* Title Input */}
            {/* <div className="mb-8">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Video Title
              </label>
              <input
                type="text"
                placeholder="Enter a title for your video"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 p-4 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white shadow-inner transition-all duration-200"
              />
            </div> */}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={uploading || !videoFile}
              className={`w-full py-4 rounded-lg font-medium flex items-center justify-center transition-all duration-300 ${
                uploading || !videoFile
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
                  Uploading {Math.round(uploadProgress)}%
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
              <div className="w-full bg-gray-700 rounded-full h-3 mt-6 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;