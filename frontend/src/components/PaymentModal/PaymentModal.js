import React, { useState } from 'react';
import { urlConfig } from '../../config';
import './PaymentModal.css';

function PaymentModal({ item, onSuccess, onCancel }) {
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCreateOrder = async () => {
    try {
      setError('');
      setProcessing(true);
      const token = sessionStorage.getItem('auth-token');

      const response = await fetch(`${urlConfig.backendUrl}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemId: item.id, amount: item.price }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create order');
      }

      const data = await response.json();
      return data.orderId;
    } catch (err) {
      setError(err.message);
      setProcessing(false);
      throw err;
    }
  };

  const handleSimulatedPayment = async () => {
    try {
      setError('');
      setProcessing(true);
      const orderId = await handleCreateOrder();

      const token = sessionStorage.getItem('auth-token');
      const resp = await fetch(`${urlConfig.backendUrl}/api/payments/capture-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to capture payment');
      }

      const result = await resp.json();
      setProcessing(false);
      onSuccess(result);
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    setProcessing(false);
    onCancel();
  };

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <div className="payment-modal-header">
          <h2>Complete Payment</h2>
          <button className="payment-modal-close" onClick={handleCancel}>×</button>
        </div>

        <div className="payment-modal-body">
          <div className="payment-item-summary">
            <h3>{item.name}</h3>
            <div className="payment-details">
              <div className="payment-detail-row">
                <span>Price:</span>
                <span className="payment-amount">${item.price}</span>
              </div>
            </div>
          </div>

          {error && <div className="payment-error">{error}</div>}
          {processing && <div className="payment-processing">Processing payment...</div>}

          <div className="payment-buttons-container">
            <button className="pay-simulated" onClick={handleSimulatedPayment} disabled={processing}>
              {processing ? 'Processing...' : 'Pay (Sandbox - simulated)'}
            </button>
          </div>

          <div className="payment-sandbox-notice">
            <strong>Test Mode:</strong> This is a simulated payment. No real money will be charged.
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
