import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignUpPage } from '@/pages/SignUpPage'
import { InterviewPage } from '@/pages/InterviewPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { ReportPage } from '@/pages/ReportPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route 
                path="/interview" 
                element={
                  <ProtectedRoute>
                    <InterviewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/interviews" 
                element={
                  <ProtectedRoute>
                    <InterviewsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/report/:id" 
                element={
                  <ProtectedRoute>
                    <ReportPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Layout>
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App