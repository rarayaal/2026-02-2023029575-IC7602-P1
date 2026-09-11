import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import DnsRecordsPage from './pages/DnsRecordsPage';
import HealthChecksPage from './pages/HealthChecksPage';
import IpCountryPage from './pages/IpCountryPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="records" element={<DnsRecordsPage />} />
          <Route path="health-checks" element={<HealthChecksPage />} />
          <Route path="ip-country" element={<IpCountryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
