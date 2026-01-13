import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import {
  Search,
  Package,
  MapPin,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";

import {
  setSearchTerm,
  setSelectedService,
  setSelectedPlan,
  setSelectedState,
  setQuantity,
  fetchServices,
  fetchServicePricing,
} from "@/store/slices/createPaymentLink";

import { INDIAN_STATES } from "@/utils/server/utils";

const PricingCard = ({
  plan,
  planIndex,
  onSelect,
  isSelected,
  isMultiState,
  selectedState,
  stateWiseExtras,
}) => {
  const planNumber = planIndex + 1;

  // Correct: search directly in stateWiseExtras array
  const stateSpecificPlan =
    isMultiState && selectedState && Array.isArray(stateWiseExtras)
      ? stateWiseExtras.find(
          (item) =>
            item.state_name === selectedState &&
            item.for_plan_number === planNumber
        )
      : null;

  const finalPrice = stateSpecificPlan
    ? stateSpecificPlan.extra_charges
    : plan.price;

  const originalPrice = plan.originalPrice;

  const discount =
    originalPrice > finalPrice
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : 0;

  return (
    <div
      className={`plan-card ${isSelected ? "selected" : ""} ${
        plan.isPopular ? "popular" : ""
      }`}
      onClick={() => onSelect(plan)}
    >
      {plan.isPopular && <div className="popular-badge">Most Popular</div>}

      <div className="plan-header">
        <h4>{plan.name}</h4>
        <div className="plan-pricing">
          <span className="price">₹{finalPrice.toLocaleString()}</span>
          {originalPrice > finalPrice && !stateSpecificPlan && (
            <>
              <span className="original-price">
                ₹{originalPrice.toLocaleString()}
              </span>
              {discount > 0 && (
                <span className="discount-badge">{discount}% OFF</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
const CreatePaymentLinkStepTwo = () => {
  const dispatch = useDispatch();
  const {
    services,
    searchTerm,
    selectedService,
    selectedServicePricing,
    selectedPlan,
    selectedState,
    quantity,
    loading,
    servicePricingCache,
  } = useSelector((state) => state.paymentLink);

  // Fetch services only if we don't have them yet
  useEffect(() => {
    if (services.length === 0) {
      dispatch(fetchServices());
    }
  }, [dispatch, services.length]);

  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.description &&
        service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleServiceSelect = async (service) => {
    dispatch(setSelectedService(service));

    // Only fetch pricing if not already cached
    if (!servicePricingCache[service.serviceId]) {
      dispatch(fetchServicePricing(service.serviceId));
    }
  };

  return (
    <div className="step-content">
      {loading && services.length === 0 && (
        <div className="loading-container">
          <CircularProgress size={24} />
          <span>Loading services...</span>
        </div>
      )}

      {!loading && (
        <>
          <div className="search-section">
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              />
            </div>

            {searchTerm && filteredServices.length > 0 && (
              <div className="search-results">
                {filteredServices.map((service) => (
                  <div
                    key={service.serviceId}
                    className="search-result-item"
                    onClick={() => {
                      handleServiceSelect(service);
                      dispatch(setSearchTerm(""));
                    }}
                  >
                    <div className="result-info">
                      <h4>{service.name}</h4>
                    </div>
                    <div className="result-meta">
                      <span className="service-id">{service.serviceId}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchTerm && filteredServices.length === 0 && (
              <div className="no-results">
                <p>No services found matching "{searchTerm}"</p>
              </div>
            )}
          </div>
        </>
      )}

      {selectedService && (
        <div className="selected-service">
          {loading && !selectedServicePricing && (
            <div className="loading-container">
              <CircularProgress size={24} />
              <span>Loading service pricing...</span>
            </div>
          )}

          {selectedServicePricing && (
            <div className="service-header">
              <h3>{selectedService.name}</h3>
            </div>
          )}

          {selectedServicePricing && (
            <>
              {selectedServicePricing.isPricingOnDemand ? (
                <div className="pricing-on-demand">
                  <div className="empty-state">
                    <Package size={48} />
                    <h3>No Pricing Available</h3>
                    <p>This service has no pricing available.</p>
                    <button
                      className="btn-secondary"
                      onClick={() => dispatch(setSelectedService(null))}
                    >
                      Choose Different Service
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="service-config">
                    {selectedServicePricing.isMultiState && (
                      <div className="form-group state_Selection">
                        <label>
                          <MapPin size={14} /> Select State *
                        </label>
                        <div className="select-wrapper">
                          <select
                            value={selectedState}
                            onChange={(e) =>
                              dispatch(setSelectedState(e.target.value))
                            }
                          >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map((state) => (
                              <option key={state} value={state}>
                                {state}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    )}

                    {selectedServicePricing.isMultiPurchase && (
                      <div className="form-group quantity">
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                          }}
                        >
                          <label
                            style={{
                              margin: "0px",
                            }}
                          >
                            Quantity
                          </label>
                          <p className="form-hint">
                            Max:{" "}
                            {selectedServicePricing.maxMultiPurchaseCount || 10}
                          </p>
                        </div>
                        <div className="quantity-selector">
                          <button
                            type="button"
                            onClick={() =>
                              dispatch(setQuantity(Math.max(1, quantity - 1)))
                            }
                            disabled={quantity <= 1}
                          >
                            <Minus size={16} />
                          </button>
                          <span>{quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              dispatch(
                                setQuantity(
                                  Math.min(
                                    selectedServicePricing.maxMultiPurchaseCount ||
                                      10,
                                    quantity + 1
                                  )
                                )
                              )
                            }
                            disabled={
                              quantity >=
                              (selectedServicePricing.maxMultiPurchaseCount ||
                                10)
                            }
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedServicePricing.AVAILABLE_PLANS &&
                  selectedServicePricing.AVAILABLE_PLANS.length > 0 ? (
                    <div className="plans-section">
                      <h3>Available Plans</h3>
                      <div className="plans-grid">
                        {selectedServicePricing.AVAILABLE_PLANS.map(
                          (plan, index) => (
                            <PricingCard
                              key={plan.planId}
                              plan={plan}
                              planIndex={index}
                              isMultiState={selectedServicePricing.isMultiState}
                              selectedState={selectedState}
                              stateWiseExtras={
                                selectedServicePricing.stateWiseExtras
                              }
                              onSelect={(selectedPlan) =>
                                dispatch(setSelectedPlan(selectedPlan))
                              }
                              isSelected={selectedPlan?.planId === plan.planId}
                            />
                          )
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="no-plans">
                      <div className="empty-state">
                        <Package size={48} />
                        <h3>No Plans Available</h3>
                        <p>
                          This service doesn't have any available plans at the
                          moment.
                        </p>
                        <button
                          className="btn-secondary"
                          onClick={() => dispatch(setSelectedService(null))}
                        >
                          Choose Different Service
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatePaymentLinkStepTwo;
