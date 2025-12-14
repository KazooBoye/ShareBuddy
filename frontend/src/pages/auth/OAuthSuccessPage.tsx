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
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Đăng nhập thất bại. Vui lòng thử lại.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (token) {
      // Save token to localStorage
      localStorage.setItem('sharebuddy_token', token);
      
      // Refresh user data with new token
      refreshUser().then(() => {
        // Redirect to dashboard after refreshing user data
        setTimeout(() => navigate('/dashboard'), 1000);
      }).catch(() => {
        setError('Không thể tải thông tin người dùng');
        setTimeout(() => navigate('/login'), 3000);
      });
    } else {
      setError('Token không hợp lệ');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate, refreshUser]);

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
            <p className="text-muted">Vui lòng đợi trong giây lát</p>
          </>
        )}
      </div>
    </Container>
  );
};

export default OAuthSuccessPage;
