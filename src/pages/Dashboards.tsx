import React, { useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { DashboardHeader } from '../components/layout/DashboardHeader';
import { useSidebar } from '../contexts/SidebarContext';
import { setPageTitle, resetPageTitle } from '../utils/pageTitle';

export const Dashboards: React.FC = () => {
  const { sidebarWidth } = useSidebar();

  // Set page title
  useEffect(() => {
    setPageTitle("Dashboards");
    return () => {
      resetPageTitle();
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1" style={{ marginLeft: `${sidebarWidth}px` }}>
        {/* Header */}
        <DashboardHeader />

        {/* Main Content Area */}
        <div className="p-8 bg-white">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Dashboards Overview</h1>
            <p className="text-gray-600 mt-2">Overview of all active campaigns and performance metrics</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Campaigns</h3>
              <p className="text-3xl font-bold text-gray-900">-</p>
              <p className="text-sm text-gray-500 mt-2">Active campaigns across all accounts</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Spend</h3>
              <p className="text-3xl font-bold text-gray-900">-</p>
              <p className="text-sm text-gray-500 mt-2">Total advertising spend</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold text-gray-900">-</p>
              <p className="text-sm text-gray-500 mt-2">Total revenue generated</p>
            </div>
          </div>
          
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Overview</h2>
            <p className="text-gray-600">Dashboard metrics and analytics will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
