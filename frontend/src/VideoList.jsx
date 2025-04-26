import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Video, Trash2, AlertCircle, Plus } from "lucide-react";

export default function VideoList() {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const navigate = useNavigate();

    // original
    // useEffect(() => {
    //     setLoading(true);
    //     fetch("http://localhost:4000/api/videos")
    //         .then((res) => {
    //             if (!res.ok) throw new Error("Failed to fetch videos");
    //             return res.json();
    //         })
    //         .then((data) => {
    //             setVideos(data);
    //             setLoading(false);
    //         })
    //         .catch((err) => {
    //             console.error("Error fetching videos:", err);
    //             setError(err.message);
    //             setLoading(false);
    //         });
    // }, []);

    // for docker and k8s deployment
    useEffect(() => {
        setLoading(true);
        fetch("/api/videos")
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

    // Function to delete a video
    const handleDeleteVideo = async (videoTitle) => {
        try {
            setDeleteLoading(true);
            setDeleteError(null);
            
            const response = await fetch(`/api/videos/${encodeURIComponent(videoTitle)}`, {
                method: 'DELETE',
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to delete video');
            }
            
            // Update the videos list by removing the deleted video
            setVideos(videos.filter(video => video.title !== videoTitle));
            setShowConfirmDelete(null);
        } catch (error) {
            console.error('Error deleting video:', error);
            setDeleteError(error.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-gray-900 to-black text-white">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-4xl font-bold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Video Library
                </h1>
                
                {deleteError && (
                    <div className="mb-8 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 text-red-300 max-w-4xl mx-auto">
                        {deleteError}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 text-red-300 max-w-4xl mx-auto">
                        {error}
                    </div>
                ) : videos.length === 0 ? (
                    <div className="text-center py-20 bg-gray-900 bg-opacity-50 rounded-2xl max-w-2xl mx-auto shadow-lg">
                        <Video className="mx-auto h-20 w-20 text-gray-400 mb-6" />
                        <p className="text-gray-300 text-xl mb-4">No videos available yet</p>
                        <button
                            onClick={() => navigate('/upload')}
                            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg"
                        >
                            Upload Your First Video
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {videos.map((video, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:bg-opacity-80 border border-gray-700"
                                >
                                    {/* Video card with simplified design */}
                                    <div className="p-6 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-xl font-semibold text-white line-clamp-2 flex-1">
                                                {video.title}
                                            </h3>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowConfirmDelete(video.title);
                                                }}
                                                className="ml-3 p-2 bg-red-600 bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
                                                title="Delete video"
                                            >
                                                <Trash2 className="h-4 w-4 text-white" />
                                            </button>
                                        </div>

                                        <div className="mt-auto pt-4">
                                            <button
                                                onClick={() => {
                                                    console.log(video.title);
                                                    navigate(`/videos/${encodeURIComponent(video.title)}`);
                                                }}
                                                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg flex items-center justify-center transition-all duration-300"
                                            >
                                                <Play className="mr-2 h-5 w-5" />
                                                Watch Video
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Upload button - more prominent */}
                        <div className="mt-12 flex justify-center">
                            <button
                                onClick={() => navigate('/upload')}
                                className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg text-white font-medium hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg flex items-center"
                            >
                                <Plus className="mr-2 h-5 w-5" />
                                Upload New Video
                            </button>
                        </div>
                    </>
                )}

                {/* Confirmation dialog */}
                {showConfirmDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
                            <div className="flex items-center mb-6 text-red-400">
                                <AlertCircle className="h-7 w-7 mr-3" />
                                <h3 className="text-xl font-semibold">Confirm Delete</h3>
                            </div>
                            <p className="mb-8 text-gray-300">
                                Are you sure you want to delete <span className="font-semibold text-white">{showConfirmDelete}</span>? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setShowConfirmDelete(null)}
                                    className="px-5 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                    disabled={deleteLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteVideo(showConfirmDelete)}
                                    className="px-5 py-3 bg-red-600 hover:bg-red-700 rounded-lg flex items-center transition-colors"
                                    disabled={deleteLoading}
                                >
                                    {deleteLoading ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="h-5 w-5 mr-2" />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}