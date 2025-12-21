import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { User, UserPlus, Mail, Phone, MapPin } from "lucide-react";

import CustomInput from "../TinyLib/CustomInput";
import CustomDropdown from "../TinyLib/CustomDropdown";

import {
  setCustomerTab,
  setNewCustomerData,
  clearCustomerData,
  checkExistingCustomer,
  setCurrentStep,
  createNewCustomer,
} from "@/store/slices/createPaymentLink";

import { INDIAN_STATES } from "@/utils/utils";

const CreatePaymentLinkStepOne = () => {
  const dispatch = useDispatch();
  const {
    customerTab,
    newCustomerData,
    selectedCustomer,
    customerMissingFields,
    loading,
    prefilledCustomer,
  } = useSelector((state) => state.paymentLink);

  const [searchField, setSearchField] = useState("");

  // Handle prefilled customer
  useEffect(() => {
    if (prefilledCustomer && !selectedCustomer) {
      // If there's a prefilled customer, set it as selected
      dispatch(
        checkExistingCustomer(
          prefilledCustomer.email || prefilledCustomer.phoneNumber
        )
      );
    }
  }, [prefilledCustomer, dispatch, selectedCustomer]);

  const handleExistingCustomerSearch = () => {
    if (!searchField.trim()) return;
    dispatch(checkExistingCustomer(searchField));
  };

  const handleNewCustomerCreate = () => {
    const { firstName, lastName, email, phoneNumber, address } =
      newCustomerData;
    if (!firstName || !lastName || !email || !phoneNumber || !address.state) {
      return;
    }
    dispatch(createNewCustomer(newCustomerData));
  };

  const handleNextStep = () => {
    if (customerMissingFields?.length <= 0) {
      dispatch(setCurrentStep(2));
    }
  };

  const canProceedNew =
    newCustomerData.firstName &&
    newCustomerData.lastName &&
    newCustomerData.email &&
    newCustomerData.phoneNumber &&
    newCustomerData.address?.state;

  const stateOptions = INDIAN_STATES.map((state) => ({
    value: state,
    label: state,
  }));

  return (
    <div className="step-content-wrapper">
      <div className="tabs">
        <button
          className={`tab ${customerTab === "existing" ? "active" : ""}`}
          onClick={() => dispatch(setCustomerTab("existing"))}
          type="button"
        >
          <User size={16} />
          Existing Customer
        </button>
        <button
          className={`tab ${customerTab === "new" ? "active" : ""}`}
          onClick={() => dispatch(setCustomerTab("new"))}
          type="button"
        >
          <UserPlus size={16} />
          New Customer
        </button>
      </div>

      {customerTab === "existing" ? (
        <div className="form-section">
          {selectedCustomer ? (
            <div className="customer-selected-info">
              <div className="info-card">
                <h4 className="card-title">Selected Customer</h4>
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedCustomer.email}</span>
                </div>
                <div className="info-row">
                  <span className="label">Phone:</span>
                  <span className="value">{selectedCustomer.phoneNumber}</span>
                </div>
                <div className="info-row">
                  <span className="label">State:</span>
                  <span className="value">
                    {selectedCustomer.address.state}
                  </span>
                </div>
              </div>

              {customerMissingFields.length > 0 && (
                <div className="missing-fields-form">
                  <h4>Missing Information Required</h4>
                  <p>
                    Please update this customer's details in the Customers tab
                    before continuing.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="customer-search-section">
              <CustomInput
                label="Email or Phone Number"
                type="text"
                placeholder="Enter email or phone number"
                value={searchField}
                onChange={setSearchField}
                icon={<Mail size={16} />}
                required
              />
              <button
                type="button"
                onClick={handleExistingCustomerSearch}
                disabled={loading || !searchField.trim()}
                className="search-customer-btn"
              >
                {loading ? (
                  <CircularProgress color="white" size={16} />
                ) : (
                  "Search"
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="form-section new-customer-form">
          <div className="form-row">
            <CustomInput
              label="First Name"
              type="text"
              placeholder="Enter first name"
              value={newCustomerData.firstName}
              onChange={(value) =>
                dispatch(setNewCustomerData({ firstName: value }))
              }
              icon={<User size={16} />}
              required
            />
            <CustomInput
              label="Last Name"
              type="text"
              placeholder="Enter last name"
              value={newCustomerData.lastName}
              onChange={(value) =>
                dispatch(setNewCustomerData({ lastName: value }))
              }
              icon={<User size={16} />}
              required
            />
          </div>

          <CustomInput
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            value={newCustomerData.email}
            onChange={(value) => dispatch(setNewCustomerData({ email: value }))}
            icon={<Mail size={16} />}
            required
          />

          <div className="form-row">
            <CustomInput
              label="Phone Number"
              type="text"
              placeholder="Enter phone number"
              value={newCustomerData.phoneNumber}
              onChange={(value) =>
                dispatch(setNewCustomerData({ phoneNumber: value }))
              }
              icon={<Phone size={16} />}
              isPhone
              required
            />
            <CustomInput
              label="Alternate Phone"
              type="text"
              placeholder="Enter alternate phone"
              value={newCustomerData.alternatePhone}
              onChange={(value) =>
                dispatch(setNewCustomerData({ alternatePhone: value }))
              }
              icon={<Phone size={16} />}
              isPhone
            />
          </div>

          <CustomDropdown
            label="State"
            placeholder="Select State"
            options={stateOptions}
            selectedValue={newCustomerData.address?.state}
            onSelect={(option) =>
              dispatch(
                setNewCustomerData({
                  address: {
                    ...newCustomerData.address,
                    state: option.value,
                  },
                })
              )
            }
            icon={<MapPin size={16} />}
            enableSearch
          />
        </div>
      )}

      <div className="step-actions">
        {selectedCustomer && (
          <button
            className="btn-secondary"
            onClick={() => {
              dispatch(clearCustomerData());
              setSearchField("");
            }}
            type="button"
          >
            Change Customer
          </button>
        )}

        {selectedCustomer && customerMissingFields.length <= 0 && (
          <button
            onClick={handleNextStep}
            className="btn-primary proceed-btn"
            type="button"
          >
            Continue
          </button>
        )}

        {customerTab === "new" && !selectedCustomer && (
          <button
            className="btn-primary"
            onClick={handleNewCustomerCreate}
            disabled={loading || !canProceedNew}
            type="button"
          >
            {loading ? (
              <CircularProgress color="white" size={16} />
            ) : (
              "Create Customer"
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreatePaymentLinkStepOne;
