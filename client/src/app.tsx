import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import DashboardPage from './pages/DashboardPage/DashboardPage';
import DataManagementPage from './pages/DataManagementPage/DataManagementPage';
import FaultAnalysisPage from './pages/FaultAnalysisPage/FaultAnalysisPage';
import ReportsPage from './pages/ReportsPage/ReportsPage';
import ImportPage from './pages/ImportPage/ImportPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="/data" element={<DataManagementPage />} />
        <Route path="/analysis" element={<FaultAnalysisPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/import" element={<ImportPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
