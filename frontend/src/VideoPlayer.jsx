import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Settings, ChevronDown } from "lucide-react";

const AVAILABLE_RESOLUTIONS = ["360p", "480p", "720p"];

export default function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [videoData, setVideoData] = useState(null);
  const [resolution, setResolution] = useState(AVAILABLE_RESOLUTIONS[1]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const videoRef = useRef(null);
  const menuRef = useRef(null);

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
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch video data");
        return res.json();
      })
      .then((data) => setVideoData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Close resolution menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update video source on resolution change without remount
  useEffect(() => {
    if (!videoRef.current || !videoData) return;

    const player = videoRef.current;
    const currentTime = player.currentTime;

    player.pause();
    const source = player.querySelector("source");
    source.src = videoData.urls[resolution] || "";
    player.load();
    player.currentTime = currentTime;
    player.play();
  }, [resolution, videoData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-gray-300 animate-spin border-4 border-t-blue-500 rounded-full w-12 h-12"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 h-screen flex flex-col items-center justify-center bg-black text-white">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="mr-2" /> Back
        </button>
        <div className="bg-red-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2">Error Loading Video</h2>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="mr-2" /> Back to list
        </button>

        {/* Video Container */}
        <div className="bg-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="aspect-video relative">
            <video
              ref={videoRef}
              controls
              poster={videoData.thumbnail}
              className="w-full h-full bg-black"
            >
              <source src={videoData.urls[resolution] || ""} type="video/mp4" />
              Your browser does not support this video.
            </video>

            {/* Resolution Menu */}
            <div className="absolute top-2 right-2" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="flex items-center bg-gray-700 bg-opacity-50 px-3 py-1 rounded-full backdrop-blur-md hover:bg-opacity-75 transition"
              >
                <Settings className="mr-1" />
                <span className="text-sm">{resolution}</span>
                <ChevronDown className="ml-1" />
              </button>

              {showMenu && (
                <ul className="mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-lg">
                  {AVAILABLE_RESOLUTIONS.map((r) => (
                    <li key={r}>
                      <button
                        onClick={() => {
                          setResolution(r);
                          setShowMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition ${
                          resolution === r
                            ? "bg-blue-900 text-blue-200"
                            : "hover:bg-gray-700"
                        }`}
                      >
                        {r}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Title & Description */}
        <h1 className="mt-6 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          {videoData.title}
        </h1>
        {videoData.description && (
          <p className="mt-2 text-gray-400">{videoData.description}</p>
        )}
      </div>
    </div>
  );
}
