import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Video, Clock, ChevronRight, Trash2, AlertCircle } from "lucide-react";

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

    // Generate a random duration for demo purposes
    const getRandomDuration = () => {
        const mins = Math.floor(Math.random() * 10) + 1;
        const secs = Math.floor(Math.random() * 60);
        return `${mins}:${secs < 10 ? '0' + secs : secs}`;
    };

    // Get a color based on the video title for the thumbnail
    const getThumbnailColor = (title) => {
        const colors = [
            'from-blue-600 to-purple-600',
            'from-purple-600 to-pink-600',
            'from-green-500 to-teal-500',
            'from-red-500 to-orange-500',
            'from-yellow-500 to-orange-600',
            'from-blue-400 to-indigo-600'
        ];

        // Use a simple hash function to pick a consistent color
        const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

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
        <div className="max-w-4xl mx-auto mt-10 p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl text-white min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Video Library
            </h1>
            
            {deleteError && (
                <div className="mb-6 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 text-red-300">
                    {deleteError}
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded-lg p-4 text-red-300">
                    {error}
                </div>
            ) : videos.length === 0 ? (
                <div className="text-center py-16">
                    <Video className="mx-auto h-16 w-16 text-gray-500 mb-4" />
                    <p className="text-gray-400 text-lg">No videos available yet</p>
                    <button
                        onClick={() => navigate('/upload')}
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-medium"
                    >
                        Upload Your First Video
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {videos.map((video, index) => (
                        <div
                            key={index}
                            className="bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:transform hover:scale-102 hover:shadow-xl"
                        >
                            {/* Thumbnail */}
                            <div className={`h-40 bg-gradient-to-r ${getThumbnailColor(video.title)} flex items-center justify-center relative`}>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-black bg-opacity-20 rounded-full p-4">
                                        <Video className="h-10 w-10 text-white" />
                                    </div>
                                </div>
                                
                                {/* Add delete button */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowConfirmDelete(video.title);
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-red-600 bg-opacity-70 rounded-full hover:bg-opacity-100 transition-all"
                                    title="Delete video"
                                >
                                    <Trash2 className="h-4 w-4 text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1">{video.title}</h3>
                                    <div className="flex items-center text-gray-400 text-sm ml-2">
                                        <Clock className="h-4 w-4 mr-1" />
                                        <span>{getRandomDuration()}</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-gray-400 text-sm">Added {new Date().toLocaleDateString()}</span>
                                    <button
                                        onClick={() => {
                                            console.log(video.title);
                                            navigate(`/videos/${encodeURIComponent(video.title)}`);
                                        }}
                                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg flex items-center transition-all duration-300"
                                    >
                                        <Play className="mr-1 h-4 w-4" />
                                        Watch
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation dialog */}
            {showConfirmDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
                        <div className="flex items-center mb-4 text-red-400">
                            <AlertCircle className="h-6 w-6 mr-2" />
                            <h3 className="text-lg font-semibold">Confirm Delete</h3>
                        </div>
                        <p className="mb-6">
                            Are you sure you want to delete <span className="font-semibold">{showConfirmDelete}</span>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowConfirmDelete(null)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
                                disabled={deleteLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteVideo(showConfirmDelete)}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center"
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? (
                                    <>
                                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload button */}
            {!loading && videos.length > 0 && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => navigate('/upload')}
                        className="px-6 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors flex items-center"
                    >
                        Upload New Video
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}