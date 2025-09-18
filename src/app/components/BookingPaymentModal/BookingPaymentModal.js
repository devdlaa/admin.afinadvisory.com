import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  User,
  Package,
  Percent,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import {
  setCurrentStep,
  resetPaymentLink,
} from "@/store/slices/createPaymentLink";

import CreatePaymentLinkStepOne from "../CreatePaymentLink/CreatePaymentLinkStepOne";
import CreatePaymentLinkStepTwo from "../CreatePaymentLink/CreatePaymentLinkStepTwo";
import CreatePaymentLinkStepThree from "../CreatePaymentLink/CreatePaymentLinkStepThree";
import CreatePaymentLinkStepFour from "../CreatePaymentLink/CreatePaymentLinkStepFour";
import CreatePaymentLinkStepFive from "../CreatePaymentLink/CreatePaymentLinkStepFive";

import "./BookingPaymentModal.scss";

const BookingPaymentModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const {
    currentStep,
    error,
    selectedCustomer,
    customerMissingFields,
    selectedPlan,
    selectedServicePricing,
    selectedState,
    canProceedToNextStep,
    customerTab,
    newCustomerData,
    paymentLinkCreated,
  } = useSelector((state) => state.paymentLink);

  const steps = [
    { number: 1, title: "Customer", icon: User },
    { number: 2, title: "Service", icon: Package },
    { number: 3, title: "Discount", icon: Percent },
    { number: 4, title: "Review", icon: CheckCircle2 },
    { number: 5, title: "Payment", icon: CreditCard },
  ];

  // Handle modal close
  const handleClose = () => {
    dispatch(resetPaymentLink());
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <CreatePaymentLinkStepOne />;
      case 2:
        return <CreatePaymentLinkStepTwo />;
      case 3:
        return <CreatePaymentLinkStepThree />;
      case 4:
        return <CreatePaymentLinkStepFour />;
      case 5:
        return <CreatePaymentLinkStepFive onClose={handleClose} />;
      default:
        return null;
    }
  };

  // Navigation logic
  const canGoToNextStep = () => {
    switch (currentStep) {
      case 1:
        if (customerTab === "existing") {
          return selectedCustomer && customerMissingFields.length === 0;
        } else {
          return (
            newCustomerData.firstName &&
            newCustomerData.lastName &&
            newCustomerData.email &&
            newCustomerData.phoneNumber &&
            newCustomerData.address?.state
          );
        }
      case 2:
        return (
          selectedPlan &&
          (!selectedServicePricing?.isMultiState || selectedState)
        );
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canGoToNextStep()) {
      dispatch(setCurrentStep(currentStep + 1));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      dispatch(setCurrentStep(currentStep - 1));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h1>Create Payment Link</h1>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{
            borderRadius :"0px"
          }} className="error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="stepper">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`stepper-item ${
                currentStep === step.number
                  ? "active"
                  : currentStep > step.number
                  ? "completed"
                  : ""
              }`}
            >
              <div className="stepper-circle">
                {currentStep > step.number ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <step.icon size={16} />
                )}
              </div>
              <span className="stepper-label">{step.title}</span>
              {index < steps.length - 1 && <div className="stepper-line" />}
            </div>
          ))}
        </div>

        <div className="modal-content">{renderStepContent()}</div>

        {currentStep > 1 && (
          <>
            <div className="modal-footer">
              <div className="footer-buttons">
                {currentStep > 1 &&
                  !(currentStep === 5 && paymentLinkCreated) && (
                    <button className="btn-secondary" onClick={handlePrevious}>
                      <ArrowLeft size={16} /> Previous
                    </button>
                  )}

                {currentStep <= 4 && (
                  <button
                    className="btn-primary"
                    onClick={handleNext}
                    disabled={!canGoToNextStep()}
                  >
                    Continue
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BookingPaymentModal;
