import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import UploadPage from './components/upload/UploadPage';
import SearchPage from './components/search/SearchPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/management" element={<UploadPage />} />
        {/* Mọi route không khớp -> về trang search */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}