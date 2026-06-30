import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import SupplierLayout from './components/SupplierLayout';
import SupplierAnalytics from './pages/SupplierAnalytics';
import SupplierDashboard from './pages/SupplierDashboard';
import SupplierImports from './pages/SupplierImports';
import SupplierOrders from './pages/SupplierOrders';
import SupplierProductEditor from './pages/SupplierProductEditor';
import SupplierProducts from './pages/SupplierProducts';
import SupplierReturns from './pages/SupplierReturns';

const SupplierApp = () => (
  <SupplierLayout>
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<SupplierDashboard />} />
      <Route path="products" element={<SupplierProducts />} />
      <Route path="products/:id" element={<SupplierProductEditor />} />
      <Route path="orders" element={<SupplierOrders />} />
      <Route path="returns" element={<SupplierReturns />} />
      <Route path="analytics" element={<SupplierAnalytics />} />
      <Route path="imports" element={<SupplierImports />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  </SupplierLayout>
);

export default SupplierApp;
