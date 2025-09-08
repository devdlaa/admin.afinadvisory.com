import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, AlertCircle, Smartphone, Check } from 'lucide-react';
import './RefundModal.scss';

const RefundModal = ({ payment, onClose }) => {
  const dispatch = useDispatch();
  const [step, setStep] = useState(1); // 1: Details, 2: OTP, 3: Success
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    phone: '',
    notes: {}
  });
  const [otp, setOtp] = useState('');
  const [otpId, setOtpId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatAmount = (amount) => {
    return (amount / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR'
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleVerifyStep = async (e) => {
    e.preventDefault();
    if (!formData.phone) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock API call to verify refund
      const response = await fetch('/api/payments/refund-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'verify',
          payment_id: payment.id,
          amount: formData.amount ? parseInt(formData.amount * 100) : null,
          phone: formData.phone,
          notes: {
            reason: formData.reason,
            admin_action: true
          },
          admin_id: 'admin_123' // This should come from auth context
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setOtpId(data.data.otp_id);
        setStep(2);
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Mock API call to initiate refund
      const response = await fetch('/api/payments/refund-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'initiate',
          otp_id: otpId,
          otp: otp,
          admin_id: 'admin_123' // This should come from auth context
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStep(3);
        // Dispatch action to refresh payments list
        // dispatch(fetchPayments());
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <form onSubmit={handleVerifyStep}>
      <div className="modal-section">
        <h4>Payment Details</h4>
        <div className="payment-info">
          <div className="info-row">
            <span className="label">Payment ID:</span>
            <span className="value">{payment.id}</span>
          </div>
          <div className="info-row">
            <span className="label">Original Amount:</span>
            <span className="value">{formatAmount(payment.amount)}</span>
          </div>
          <div className="info-row">
            <span className="label">Customer:</span>
            <span className="value">{payment.email}</span>
          </div>
        </div>
      </div>

      <div className="modal-section">
        <h4>Refund Details</h4>
        <div className="form-group">
          <label>Refund Amount (Optional)</label>
          <input
            type="number"
            placeholder="Leave empty for full refund"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            step="0.01"
            max={payment.amount / 100}
            className="form-input"
          />
          <small className="form-help">
            Maximum refundable: {formatAmount(payment.amount)}
          </small>
        </div>

        <div className="form-group">
          <label>Refund Reason</label>
          <select
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            className="form-input"
            required
          >
            <option value="">Select a reason</option>
            <option value="customer_request">Customer Request</option>
            <option value="duplicate_payment">Duplicate Payment</option>
            <option value="order_cancellation">Order Cancellation</option>
            <option value="processing_error">Processing Error</option>
            <option value="fraudulent_transaction">Fraudulent Transaction</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Admin Phone Number *</label>
          <input
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="form-input"
            required
          />
          <small className="form-help">
            OTP will be sent to this number for verification
          </small>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </div>
    </form>
  );

  const renderStep2 = () => (
    <form onSubmit={handleOtpVerify}>
      <div className="modal-section otp-section">
        <div className="otp-icon">
          <Smartphone size={48} />
        </div>
        <h4>Verify OTP</h4>
        <p>
          We've sent a 6-digit verification code to <strong>{formData.phone}</strong>
        </p>

        <div className="form-group">
          <label>Enter OTP</label>
          <input
            type="text"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="form-input otp-input"
            maxLength={6}
            required
          />
        </div>

        <div className="refund-summary">
          <h5>Refund Summary</h5>
          <div className="summary-row">
            <span>Amount:</span>
            <span>{formData.amount ? `₹${formData.amount}` : formatAmount(payment.amount)}</span>
          </div>
          <div className="summary-row">
            <span>Reason:</span>
            <span>{formData.reason.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div className="summary-row">
            <span>Payment ID:</span>
            <span>{payment.id}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
          Back
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Verify & Process Refund'}
        </button>
      </div>
    </form>
  );

  const renderStep3 = () => (
    <div className="modal-section success-section">
      <div className="success-icon">
        <Check size={48} />
      </div>
      <h4>Refund Processed Successfully</h4>
      <p>The refund has been initiated and will be processed by Razorpay.</p>

      <div className="success-details">
        <div className="detail-row">
          <span>Refund Amount:</span>
          <span>{formData.amount ? `₹${formData.amount}` : formatAmount(payment.amount)}</span>
        </div>
        <div className="detail-row">
          <span>Payment ID:</span>
          <span>{payment.id}</span>
        </div>
        <div className="detail-row">
          <span>Processing Time:</span>
          <span>3-5 business days</span>
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="refund-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {step === 1 && 'Create Refund'}
            {step === 2 && 'Verify OTP'}
            {step === 3 && 'Refund Successful'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span>1</span>
              <label>Details</label>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span>2</span>
              <label>Verify</label>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span>3</span>
              <label>Complete</label>
            </div>
          </div>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
};

export default RefundModal;