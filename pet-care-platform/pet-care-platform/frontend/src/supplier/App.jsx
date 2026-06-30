import { Navigate, Route, Routes } from 'react-router-dom';
import SupplierLayout from './components/SupplierLayout';
import SupplierProductEditor from './pages/SupplierProductEditor';
import SupplierProducts from './pages/SupplierProducts';

const SupplierApp = () => (
  <SupplierLayout>
    <Routes>
      <Route index element={<Navigate to="products" replace />} />
      <Route path="products" element={<SupplierProducts />} />
      <Route path="products/:id" element={<SupplierProductEditor />} />
      <Route path="*" element={<Navigate to="products" replace />} />
    </Routes>
  </SupplierLayout>
);

export default SupplierApp;
