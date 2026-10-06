import { useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import UploadPage from './components/upload/UploadPage';
import ManagementGate from './components/upload/ManagementGate';
import SearchPage from './components/search/SearchPage';

/**
 * Wrapper cho route /management: hiển thị passcode gate trước.
 * Khi passcode đúng, render UploadPage.
 *
 * Passed trạng thái lưu trong state → mỗi lần F5 (reload) sẽ hỏi lại.
 * Nếu muốn giữ qua reload, có thể lưu sessionStorage ở đây — nhưng theo
 * yêu cầu "nhập đúng → cho vào", không nói lưu session nên giữ an toàn.
 */
function ManagementRoute() {
  const [passed, setPassed] = useState(false);
  if (!passed) return <ManagementGate onPass={() => setPassed(true)} />;
  return <UploadPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/management" element={<ManagementRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
