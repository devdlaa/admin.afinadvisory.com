import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { User, UserPlus, Mail, Phone, MapPin, ChevronDown } from "lucide-react";

import {
  setCustomerTab,
  setNewCustomerData,
  clearCustomerData,
  updateSelectedCustomerField,
  checkExistingCustomer,
  setCurrentStep,
  createNewCustomer,
} from "@/store/slices/createPaymentLink";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const CreatePaymentLinkStepOne = () => {
  const dispatch = useDispatch();
  const {
    customerTab,
    newCustomerData,
    selectedCustomer,
    customerMissingFields,
    loading,
  } = useSelector((state) => state.paymentLink);

  const [searchField, setSearchField] = useState("");
  const [missingUserData, setMissingUserData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    state: "",
  });
  const isMissingField = (field) => customerMissingFields.includes(field);
  console.log(customerMissingFields);
  useEffect(() => {
    if (!selectedCustomer) return;

    setMissingUserData((prev) => {
      const updated = { ...prev };
      Object.keys(prev).forEach((field) => {
        updated[field] = customerMissingFields.includes(field)
          ? ""
          : selectedCustomer?.[field] || "";
      });
      return updated;
    });
  }, [customerMissingFields, selectedCustomer]);

  const handleExistingCustomerSearch = () => {
    if (!searchField.trim()) {
      return;
    }
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

  const canProceedExisting =
    selectedCustomer &&
    Object.values(missingUserData).every(
      (field) => field && field.trim() !== ""
    );
  const canProceedNew =
    newCustomerData.firstName &&
    newCustomerData.lastName &&
    newCustomerData.email &&
    newCustomerData.phoneNumber &&
    newCustomerData.address?.state;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
      className="step-content"
    >
      <div
        style={{
          flex: "1",
        }}
      >
        <div className="tabs">
          <button
            className={`tab ${customerTab === "existing" ? "active" : ""}`}
            onClick={() => dispatch(setCustomerTab("existing"))}
          >
            <User size={16} />
            Existing Customer
          </button>
          <button
            className={`tab ${customerTab === "new" ? "active" : ""}`}
            onClick={() => dispatch(setCustomerTab("new"))}
          >
            <UserPlus size={16} />
            New Customer
          </button>
        </div>

        {customerTab === "existing" ? (
          <div
            style={{
              overflowY: "auto",
              maxHeight: "463px",
            }}
            className="form-section"
          >
            {selectedCustomer ? (
              <div
                style={{
                  overflowY: "auto",
                  maxHeight: "463px",
                }}
                className="customer-selected-info"
              >
                <div className="info-card">
                  <h4 className="card-title">Selected Customer</h4>
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">
                      {selectedCustomer.firstName || "Not Available"}{" "}
                      {selectedCustomer.lastName}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Email:</span>
                    <span className="value">
                      {selectedCustomer.email || "Not Available"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span className="value">
                      {selectedCustomer.phoneNumber || "Not Available"}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">State:</span>
                    <span className="value">
                      {selectedCustomer.address.state || "Not Available"}
                    </span>
                  </div>
                </div>

                {/* Show missing fields form */}
                {customerMissingFields.length > 0 && (
                  <div className="missing-fields-form">
                    <h4>Missing Information Required</h4>
                    <p>
                      Please update this customer’s details in the Customers tab
                      before continuing.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>
                    <Mail size={14} /> Email or Phone Number
                  </label>
                  <div className="customer-search-wrapper">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        placeholder="Enter email or phone number"
                        value={searchField}
                        onChange={(e) => setSearchField(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleExistingCustomerSearch();
                          }
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleExistingCustomerSearch}
                      disabled={loading || !searchField.trim()}
                      className="search-customer-btn"
                    >
                      {loading ? <CircularProgress color="white" size={16} /> : "Search"}
                    </button>
                  </div>
                
                </div>
              </>
            )}
          </div>
        ) : selectedCustomer ? (
          <>
            <div
              style={{
                overflowY: "auto",
                maxHeight: "463px",
              }}
              className="customer-selected-info"
            >
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
                {selectedCustomer.address?.state && (
                  <div className="info-row">
                    <span className="label">State:</span>
                    <span className="value">
                      {selectedCustomer.address.state}
                    </span>
                  </div>
                )}
              </div>

              {/* Show missing fields form */}
              {customerMissingFields.length > 0 && (
                <div className="missing-fields-form">
                  <h4>Missing Information Required</h4>
                  <p>
                    Please update this customer’s details in the Customers tab
                    before continuing.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                overflowY: "auto",
                maxHeight: "463px",
              }}
              className="form-section new_customer"
            >
              <div className="form-row">
                <div className="form-group">
                  <label>
                    <User size={14} /> First Name *
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="Enter first name"
                      value={newCustomerData.firstName}
                      onChange={(e) =>
                        dispatch(
                          setNewCustomerData({ firstName: e.target.value })
                        )
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    <User size={14} /> Last Name *
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="text"
                      placeholder="Enter last name"
                      value={newCustomerData.lastName}
                      onChange={(e) =>
                        dispatch(
                          setNewCustomerData({ lastName: e.target.value })
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <Mail size={14} /> Email Address *
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newCustomerData.email}
                    onChange={(e) =>
                      dispatch(setNewCustomerData({ email: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>
                    <Phone size={14} /> Phone Number *
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={newCustomerData.phoneNumber}
                      onChange={(e) =>
                        dispatch(
                          setNewCustomerData({ phoneNumber: e.target.value })
                        )
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    <Phone size={14} /> Alternate Phone
                  </label>
                  <div className="input-wrapper">
                    <input
                      type="tel"
                      placeholder="Enter alternate phone"
                      value={newCustomerData.alternatePhone}
                      onChange={(e) =>
                        dispatch(
                          setNewCustomerData({
                            alternatePhone: e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>
                  <MapPin size={14} /> State *
                </label>
                <div className="select-wrapper">
                  <select
                    value={newCustomerData.address?.state || ""}
                    onChange={(e) =>
                      dispatch(
                        setNewCustomerData({
                          address: {
                            ...newCustomerData.address,
                            state: e.target.value,
                          },
                        })
                      )
                    }
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map((state, key) => (
                      <option key={key} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div
        style={{
          justifySelf: "flex-end",
          margin: "0x",
        }}
        className="step-actions"
      >
        {selectedCustomer && (
          <button
            className="btn-secondary small"
            onClick={() => {
              dispatch(clearCustomerData());
              setSearchField("");
            }}
          >
            Change Customer
          </button>
        )}

        {customerTab === "existing" && canProceedExisting && (
          <button onClick={handleNextStep} className="btn-primary proceed-btn">
            Ready to Continue
          </button>
        )}

        {selectedCustomer && customerMissingFields.length <=0 &&  (
          <button onClick={handleNextStep} className="btn-primary proceed-btn">
            Continue
          </button>
        )}

        {customerTab === "new" && !selectedCustomer && (
          <button
            className="btn-primary"
            onClick={handleNewCustomerCreate}
            disabled={loading || !canProceedNew}
          >
            {loading ? <CircularProgress color="white" size={16} /> : "Create Customer"}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreatePaymentLinkStepOne;
