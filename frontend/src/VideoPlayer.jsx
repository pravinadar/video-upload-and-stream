import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Settings, Download, Share2, ThumbsUp, MessageSquare, Bookmark, MoreHorizontal, ChevronDown } from "lucide-react";

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [videoData, setVideoData] = useState(null);
  const [resolution, setResolution] = useState("480p");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showResolutionMenu, setShowResolutionMenu] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(80);
  const videoRef = useRef(null);
  const resolutionMenuRef = useRef(null);

  // original
  // useEffect(() => {
  //   setLoading(true);
  //   fetch(`http://localhost:4000/api/videos/${id}`)
  //     .then(res => {
  //       if (!res.ok) throw new Error("Failed to fetch video data");
  //       return res.json();
  //     })
  //     .then(data => {
  //       setVideoData(data);
  //       setLoading(false);
  //     })
  //     .catch(err => {
  //       console.error("Error fetching video:", err);
  //       setError(err.message);
  //       setLoading(false);
  //     });
  // }, [id]);

  // for docker and k8s deployment
  useEffect(() => {
    setLoading(true);
    fetch(`/api/videos/${id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch video data");
        return res.json();
      })
      .then(data => {
        setVideoData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching video:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    // Close resolution menu when clicking outside
    const handleClickOutside = (event) => {
      if (resolutionMenuRef.current && !resolutionMenuRef.current.contains(event.target)) {
        setShowResolutionMenu(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Simulate random view count and upload date for demo
  const getRandomViews = () => {
    return Math.floor(Math.random() * 50000) + 1000;
  };
  
  const formatViews = (views) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K';
    }
    return views;
  };
  
  const getUploadDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-300">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-gray-400 hover:text-white mb-6"
          >
            <ArrowLeft className="mr-2" /> Back to videos
          </button>
          
          <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-6 text-red-300">
            <h3 className="font-bold text-lg mb-2">Error Loading Video</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-800 rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!videoData) return null;

  const viewCount = getRandomViews();
  const uploadDate = getUploadDate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white pb-16">
      <div className="max-w-6xl mx-auto p-4">
        {/* Top Navigation */}
        <div className="mb-4">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2" /> Back to videos
          </button>
        </div>
        
        {/* Video Player Section */}
        <div className="bg-black rounded-xl overflow-hidden shadow-2xl mb-6">
          <div className="relative aspect-video">
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
          </div>
        </div>
        
        {/* Video Info Section */}
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">{videoData.title}</h1>
            {/* <div className="flex flex-wrap items-center mt-2 text-gray-400 text-sm">
              <span>{formatViews(viewCount)} views</span>
              <span className="mx-2">•</span>
              <span>{uploadDate}</span>
            </div> */}
          </div>
          
          {/* Action Bar */}
          <div className="flex flex-wrap justify-between items-center py-4 border-t border-b border-gray-700">
            <div className="flex flex-wrap items-center">
              {/* Resolution Selector */}
              <div className="relative mr-6" ref={resolutionMenuRef}>
                <button 
                  onClick={() => setShowResolutionMenu(!showResolutionMenu)}
                  className="flex items-center px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings size={16} className="mr-2" />
                  {resolution}
                  <ChevronDown size={16} className="ml-2" />
                </button>
                
                {showResolutionMenu && (
                  <div className="absolute z-10 mt-2 w-36 rounded-lg shadow-lg bg-gray-800 border border-gray-700">
                    <div className="py-1">
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm ${resolution === '360p' ? 'bg-blue-900 text-blue-200' : 'hover:bg-gray-700'}`}
                        onClick={() => handleResolutionChange('360p')}
                      >
                        360p
                      </button>
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm ${resolution === '480p' ? 'bg-blue-900 text-blue-200' : 'hover:bg-gray-700'}`}
                        onClick={() => handleResolutionChange('480p')}
                      >
                        480p
                      </button>
                      <button
                        className={`block w-full text-left px-4 py-2 text-sm ${resolution === '720p' ? 'bg-blue-900 text-blue-200' : 'hover:bg-gray-700'}`}
                        onClick={() => handleResolutionChange('720p')}
                      >
                        720p
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Download Button */}
              <button className="flex items-center mr-6 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Download size={16} className="mr-2" />
                Download
              </button>
              
              {/* Share Button */}
              <button className="flex items-center px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                <Share2 size={16} className="mr-2" />
                Share
              </button>
            </div>
            
            {/* <div className="flex items-center mt-4 sm:mt-0"> */}
              {/* Like Button */}
              {/* <button className="flex items-center mr-4 text-gray-400 hover:text-blue-400">
                <ThumbsUp size={20} className="mr-1" />
                <span>23</span>
              </button> */}
              
              {/* Comment Button */}
              {/* <button className="flex items-center mr-4 text-gray-400 hover:text-blue-400">
                <MessageSquare size={20} className="mr-1" />
                <span>4</span>
              </button> */}
              
              {/* Save Button */}
              {/* <button className="flex items-center text-gray-400 hover:text-blue-400">
                <Bookmark size={20} />
              </button> */}
            {/* </div> */}
          </div>
          
          {/* Description */}
          {/* <div className="mt-6 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mr-4 flex items-center justify-center">
                <span className="font-bold text-lg">
                  {videoData.title?.charAt(0)?.toUpperCase() || 'V'}
                </span>
              </div>
              <div>
                <h3 className="font-medium">Video Author</h3>
                <p className="text-sm text-gray-400">Creator</p>
              </div>
            </div>
            
            <p className="text-gray-300 whitespace-pre-line">
              {videoData.description || `This is an amazing video about ${videoData.title}. Watch in ${resolution} quality for the best experience.`}
            </p>
            
            {videoData.tags && videoData.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {videoData.tags.map((tag, index) => (
                  <span key={index} className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-300">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div> */}
          
          {/* Related Videos Placeholder */}
          {/* <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Related Videos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((idx) => (
                <div key={idx} className="flex bg-gray-800 rounded-lg overflow-hidden h-24">
                  <div className="w-40 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                  <div className="p-3 flex-1">
                    <h4 className="font-medium text-sm line-clamp-2">Related video title example {idx}</h4>
                    <p className="text-xs text-gray-400 mt-2">320 views • 3 days ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;