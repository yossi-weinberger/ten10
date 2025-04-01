import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './routes';
import { ThemeProvider } from './lib/theme';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="tenten-ui-theme">
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </ThemeProvider>
  </StrictMode>
);