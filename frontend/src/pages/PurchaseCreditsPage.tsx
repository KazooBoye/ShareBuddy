/**
 * Purchase Credits Page - Buy credit packages with Stripe
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import apiClient from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../store/hooks';
import { getCurrentUser } from '../store/slices/authSlice';

interface CreditPackage {
  package_id: string;
  credits: number;
  price_usd: number;
  price_vnd: number;
  bonus_credits: number;
  is_popular: boolean;
}

// Stripe promise (will be initialized with publishable key)
let stripePromise: Promise<any> | null = null;

const CheckoutForm: React.FC<{ selectedPackage: CreditPackage | null; onSuccess: () => void }> = ({ 
  selectedPackage, 
  onSuccess 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [currency] = useState('usd'); // Can be toggled between usd/vnd

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !selectedPackage) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Create payment intent
      const response = await apiClient.post(
        '/payment/create-intent',
        {
          packageId: selectedPackage.package_id,
          currency
        }
      );

      const { clientSecret } = response.data.data;

      // Confirm payment
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="danger">{error}</Alert>}
      
      <div className="mb-3">
        <label className="form-label">Card Details</label>
        <div className="border rounded p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        variant="primary" 
        className="w-100" 
        disabled={!stripe || processing}
      >
        {processing ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Processing...
          </>
        ) : (
          `Pay $${Number(selectedPackage?.price_usd || 0).toFixed(2)}`
        )}
      </Button>

      <div className="text-center mt-3">
        <small className="text-muted d-block mb-2">Secure payment powered by</small>
        <svg height="26" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7 }}>
          <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z" fill="#6772e5"/>
        </svg>
      </div>
    </form>
  );
};

const PurchaseCreditsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAuth();

  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchPackages();
  }, [isAuthenticated]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(''); // Clear previous errors
      const response = await apiClient.get('/payment/packages');
      
      if (response.data && response.data.data) {
        setPackages(response.data.data.packages || []);
        
        // Initialize Stripe with publishable key
        if (!stripePromise && response.data.data.publishableKey) {
          stripePromise = loadStripe(response.data.data.publishableKey);
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error loading payment packages:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load packages';
      setError(`Không thể tải gói credits: ${errorMessage}. Vui lòng thử lại sau hoặc liên hệ quản trị viên.`);
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: CreditPackage) => {
    setSelectedPackage(pkg);
    setShowCheckout(true);
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setSelectedPackage(null);
    
    // Refresh user data to update credits in Navbar
    dispatch(getCurrentUser());
    
    alert('Payment successful! Your credits have been added.');
    navigate('/profile');
  };

  if (loading) {
    return (
      <Container className="py-5 text-center" style={{ marginTop: '80px' }}>
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading packages...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5" style={{ marginTop: '80px' }}>
        <Alert variant="danger">
          <Alert.Heading>Lỗi tải trang</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-between align-items-center">
            <Button variant="outline-danger" onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <Button variant="danger" onClick={fetchPackages}>
              Thử lại
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4" style={{ marginTop: '80px', maxWidth: '1200px' }}>
      <div className="text-center mb-5">
        <h2>💳 Purchase Credits</h2>
        <p className="text-muted">
          Current Balance: <strong className="text-primary">{user?.credits || 0} credits</strong>
        </p>
        <div className="d-flex align-items-center justify-content-center gap-2 mt-2">
          <small className="text-muted">Powered by</small>
          <svg height="20" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.6 }}>
            <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z" fill="#6772e5"/>
          </svg>
        </div>
      </div>

      {!showCheckout ? (
        <Row>
          {packages.map((pkg) => (
            <Col md={6} lg={4} key={pkg.package_id} className="mb-4">
              <Card className={`h-100 ${pkg.is_popular ? 'border-primary' : ''}`}>
                {pkg.is_popular && (
                  <Badge bg="primary" className="position-absolute top-0 end-0 m-2">
                    Popular
                  </Badge>
                )}
                <Card.Body className="text-center">
                  <div className="display-4 text-primary mb-3">
                    {pkg.credits + pkg.bonus_credits}
                  </div>
                  <h5>Credits</h5>
                  
                  {pkg.bonus_credits > 0 && (
                    <Badge bg="success" className="mb-3">
                      +{pkg.bonus_credits} Bonus
                    </Badge>
                  )}

                  <div className="my-4">
                    <h3>${Number(pkg.price_usd || 0).toFixed(2)}</h3>
                    <small className="text-muted">
                      ≈ {Number(pkg.price_vnd || 0).toLocaleString('vi-VN')} VND
                    </small>
                  </div>

                  <Button 
                    variant={pkg.is_popular ? 'primary' : 'outline-primary'}
                    className="w-100"
                    onClick={() => handleSelectPackage(pkg)}
                  >
                    Select Package
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Complete Payment</h5>
              </Card.Header>
              <Card.Body>
                {selectedPackage && (
                  <>
                    <div className="mb-4 p-3 rounded">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="mb-0">
                            {selectedPackage.credits + selectedPackage.bonus_credits} Credits
                          </h6>
                          <small className="text-muted">
                            {selectedPackage.credits} base + {selectedPackage.bonus_credits} bonus
                          </small>
                        </div>
                        <div className="text-end">
                          <h5 className="mb-0">${Number(selectedPackage.price_usd || 0).toFixed(2)}</h5>
                          <small className="text-muted">
                            {Number(selectedPackage.price_vnd || 0).toLocaleString('vi-VN')} VND
                          </small>
                        </div>
                      </div>
                    </div>

                    {stripePromise && (
                      <Elements stripe={stripePromise}>
                        <CheckoutForm 
                          selectedPackage={selectedPackage}
                          onSuccess={handlePaymentSuccess}
                        />
                      </Elements>
                    )}

                    <Button
                      variant="link"
                      className="w-100 mt-3"
                      onClick={() => setShowCheckout(false)}
                    >
                      ← Back to packages
                    </Button>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default PurchaseCreditsPage;
