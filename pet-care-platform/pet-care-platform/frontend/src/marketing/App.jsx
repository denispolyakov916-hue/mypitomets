import { Navigate, Route, Routes } from 'react-router-dom';
import MarketingLayout from './components/MarketingLayout';
import MarketingContentList from './pages/MarketingContentList';
import MarketingContentEditor from './pages/MarketingContentEditor';

const MarketingApp = () => (
  <MarketingLayout>
    <Routes>
      <Route index element={<Navigate to="content" replace />} />
      <Route path="content" element={<MarketingContentList />} />
      <Route path="content/:contentType/new" element={<MarketingContentEditor />} />
      <Route path="content/:contentType/:id" element={<MarketingContentEditor />} />
      <Route path="*" element={<Navigate to="content" replace />} />
    </Routes>
  </MarketingLayout>
);

export default MarketingApp;
