/**
 * OAuth Success Page - Handles redirect after successful OAuth authentication
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../../hooks/useAuth';

const OAuthSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser, user, isLoading } = useAuth();
  const [error, setError] = useState<string>('');
  const [processingAuth, setProcessingAuth] = useState(true);

  useEffect(() => {
    const processOAuth = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError('Đăng nhập thất bại. Vui lòng thử lại.');
        setProcessingAuth(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!token) {
        setError('Token không hợp lệ');
        setProcessingAuth(false);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Save token to localStorage
        console.log('💾 Saving OAuth token to localStorage');
        localStorage.setItem('sharebuddy_token', token);
        
        // Refresh user data with new token
        console.log('🔄 Fetching user data from server...');
        await refreshUser();
        
        console.log('✅ OAuth authentication complete');
        setProcessingAuth(false);
      } catch (err) {
        console.error('❌ OAuth error:', err);
        setError('Không thể tải thông tin người dùng');
        setProcessingAuth(false);
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processOAuth();
  }, [searchParams, navigate, refreshUser]);

  // Redirect to dashboard once user is loaded
  useEffect(() => {
    if (!processingAuth && !isLoading && user?.id && user.id !== 'undefined') {
      console.log('🚀 Redirecting to dashboard with user:', user.id);
      setTimeout(() => navigate('/dashboard'), 500);
    }
  }, [processingAuth, isLoading, user, navigate]);

  return (
    <Container className="py-5" style={{ marginTop: '80px' }}>
      <div className="text-center">
        {error ? (
          <Alert variant="danger">
            <Alert.Heading>Lỗi đăng nhập</Alert.Heading>
            <p>{error}</p>
          </Alert>
        ) : (
          <>
            <Spinner animation="border" variant="primary" className="mb-3" />
            <h4>Đang xử lý đăng nhập...</h4>
            <p className="text-muted">
              {processingAuth || isLoading 
                ? 'Đang tải thông tin người dùng...' 
                : 'Chuyển hướng đến dashboard...'}
            </p>
          </>
        )}
      </div>
    </Container>
  );
};

export default OAuthSuccessPage;
