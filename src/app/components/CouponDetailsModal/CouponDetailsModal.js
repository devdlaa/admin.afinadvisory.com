// components/CouponDetailsModal/CouponDetailsModal.js
"use client";

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  X, 
  Tag, 
  DollarSign, 
  Percent, 
  Calendar, 
  Users, 
  Crown,
  Settings,
  Info,
  Clock,
  Target,
  Link
} from 'lucide-react';
import { fetchServices } from "@/store/slices/couponsSlice";
import './CouponDetailsModal.scss';

export default function CouponDetailsModal({ coupon, onClose }) {
  const dispatch = useDispatch();
  const { services } = useSelector(state => state.coupons);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!services.length) {
      dispatch(fetchServices());
    }
  }, [dispatch, services.length]);

  const getStatusBadge = (state) => {
    const statusConfig = {
      active: { label: 'Active', class: 'active' },
      inactive: { label: 'Inactive', class: 'inactive' },
      expired: { label: 'Expired', class: 'expired' },
      usedUp: { label: 'Used Up', class: 'used-up' }
    };

    const config = statusConfig[state] || statusConfig.inactive;
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDiscountDisplay = (discount) => {
    if (discount.kind === 'percent') {
      return `${discount.amount}% OFF`;
    }
    return `$${discount.amount} OFF`;
  };

  const getLinkedServiceNames = () => {
    if (!coupon.linkedServices?.length || !services.length) return [];
    
    return coupon.linkedServices
      .map(serviceId => services.find(s => s.serviceId === serviceId))
      .filter(Boolean);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'services', label: 'Linked Services', icon: Link }
  ];

  return (
    <div className="modal-overlay">
      <div className="coupon-details-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="coupon-code-header">
              <Tag size={20} />
              <h2>{coupon.code}</h2>
              {coupon.isInfluencerCoupon && (
                <div className="influencer-badge">
                  <Crown size={16} />
                  Influencer
                </div>
              )}
            </div>
            {getStatusBadge(coupon.state)}
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="modal-body">
          {activeTab === 'overview' && (
            <div className="overview-content">
              <div className="info-grid">
                <div className="info-card">
                  <div className="card-header">
                    <h3>Basic Information</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-item">
                      <label>Title</label>
                      <span>{coupon.title || 'Untitled Coupon'}</span>
                    </div>
                    <div className="info-item">
                      <label>Description</label>
                      <span>{coupon.description || 'No description'}</span>
                    </div>
                    <div className="info-item">
                      <label>Created</label>
                      <span>{formatDate(coupon.createdAt)}</span>
                    </div>
                    <div className="info-item">
                      <label>Last Updated</label>
                      <span>{formatDate(coupon.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="info-card discount-card">
                  <div className="card-header">
                    <h3>Discount Details</h3>
                  </div>
                  <div className="card-content">
                    <div className="discount-display">
                      <div className="discount-amount">
                        {coupon.discount.kind === 'percent' ? (
                          <Percent size={24} />
                        ) : (
                          <DollarSign size={24} />
                        )}
                        <span className="amount">
                          {getDiscountDisplay(coupon.discount)}
                        </span>
                      </div>
                      
                      {coupon.discount.maxDiscount && (
                        <div className="max-discount">
                          Maximum discount: ${coupon.discount.maxDiscount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <div className="card-header">
                    <h3>Usage & Limits</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-item">
                      <label>Applies To</label>
                      <span>
                        {coupon.appliesTo?.users === 'all' ? 'All Users' : 'New Users Only'}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>Uses Per User</label>
                      <span>{coupon.usageLimits?.perUser || 'Unlimited'}</span>
                    </div>
                    <div className="info-item">
                      <label>Total Uses</label>
                      <span>{coupon.usageLimits?.total || 'Unlimited'}</span>
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <div className="card-header">
                    <h3>Validity Period</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-item">
                      <label>Valid From</label>
                      <span>{formatDate(coupon.validFrom)}</span>
                    </div>
                    <div className="info-item">
                      <label>Expires At</label>
                      <span>{formatDate(coupon.expiresAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-content">
              <div className="info-grid">
                <div className="info-card">
                  <div className="card-header">
                    <h3>Status & Configuration</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-item">
                      <label>Current Status</label>
                      {getStatusBadge(coupon.state)}
                    </div>
                    <div className="info-item">
                      <label>Influencer Coupon</label>
                      <span>{coupon.isInfluencerCoupon ? 'Yes' : 'No'}</span>
                    </div>
                    {coupon.isInfluencerCoupon && coupon.influencerId && (
                      <div className="info-item">
                        <label>Influencer ID</label>
                        <span className="monospace">{coupon.influencerId}</span>
                      </div>
                    )}
                    <div className="info-item">
                      <label>Created By</label>
                      <span>{coupon.createdBy || 'System'}</span>
                    </div>
                  </div>
                </div>

                {coupon.isInfluencerCoupon && coupon.commission && (
                  <div className="info-card commission-card">
                    <div className="card-header">
                      <h3>Commission Details</h3>
                    </div>
                    <div className="card-content">
                      <div className="commission-display">
                        <div className="commission-amount">
                          {coupon.commission.kind === 'percent' ? (
                            <Percent size={20} />
                          ) : (
                            <DollarSign size={20} />
                          )}
                          <span>
                            {coupon.commission.kind === 'percent' 
                              ? `${coupon.commission.amount}%` 
                              : `$${coupon.commission.amount}`
                            }
                          </span>
                        </div>
                        
                        {coupon.commission.maxCommission && (
                          <div className="max-commission">
                            Max: ${coupon.commission.maxCommission}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="info-card">
                  <div className="card-header">
                    <h3>Linked Data</h3>
                  </div>
                  <div className="card-content">
                    <div className="info-item">
                      <label>Linked Services</label>
                      <span>{coupon.linkedServices?.length || 0} service(s)</span>
                    </div>
                    <div className="info-item">
                      <label>Linked Customers</label>
                      <span>{coupon.linkedCustomers?.length || 0} customer(s)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="services-content">
              <div className="info-card">
                <div className="card-header">
                  <h3>Linked Services</h3>
                  <span className="service-count">
                    {coupon.linkedServices?.length || 0} service(s) linked
                  </span>
                </div>
                <div className="card-content">
                  {!coupon.linkedServices?.length ? (
                    <div className="no-services">
                      <Link size={48} />
                      <h4>No Services Linked</h4>
                      <p>This coupon is not linked to any specific services and can be used across all services.</p>
                    </div>
                  ) : (
                    <div className="services-list">
                      {getLinkedServiceNames().map((service) => (
                        <div key={service.serviceId} className="service-item">
                          <div className="service-info">
                            <div className="service-name">{service.name}</div>
                            <div className="service-id">{service.serviceId}</div>
                            {service.description && (
                              <div className="service-description">{service.description}</div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {coupon.linkedServices.length > getLinkedServiceNames().length && (
                        <div className="unknown-services">
                          <p>
                            {coupon.linkedServices.length - getLinkedServiceNames().length} additional 
                            service(s) linked but not found in current service configuration.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}