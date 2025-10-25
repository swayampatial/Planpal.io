import React from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { AuthPages } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-purple-300">Loading...</div>
      </div>
    );
  }

  return user ? <Dashboard /> : <AuthPages />;
};

export default function App() {
  return (
    <AuthProvider>
      <div className="dark">
        <AppContent />
        <Toaster 
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#e9d5ff',
              border: '1px solid rgba(168, 85, 247, 0.3)',
            },
          }}
        />
      </div>
    </AuthProvider>
  );
}
