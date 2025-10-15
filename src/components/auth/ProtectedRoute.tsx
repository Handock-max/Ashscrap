import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Composant simplifié - la logique d'auth est maintenant dans App.tsx
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  return <>{children}</>;
};