import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import VideoList from "./VideoList";
import VideoPlayer from "./VideoPlayer";
import UploadPage from "./UploadPage";

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

export default App;
