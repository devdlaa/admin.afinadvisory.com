// ClientDialog.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./ClientDialog.module.scss";
import SegmentedTabs from "./SegmentedTabs";
import CustomInput from "./CustomInput";
import CustomDropdown from "./CustomDropdown";
import ActionButton from "./ActionButton";
import {
  Search,
  X,
  Loader2,
  Pencil,
  User,
  Plus,
  Mail,
  Phone,
  Languages,
  CreditCard,
  UserSearch,
  Building2,
  MapPin,
  FileText,
  Globe,
} from "lucide-react";

// ============================================================================
// CONSTANTS
// ============================================================================
const LANGUAGE_OPTIONS = [
  { value: "Hindi", label: "Hindi" },
  { value: "English", label: "English" },
  { value: "Hindi & English Both", label: "Hindi & English Both" },
];

const CLIENT_TYPE_OPTIONS = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
];

const ENTITY_TYPE_OPTIONS = [
  { value: "LLP", label: "LLP" },
  { value: "Private Limited", label: "Private Limited" },
  { value: "Public Limited", label: "Public Limited" },
  { value: "Partnership", label: "Partnership" },
  { value: "Proprietorship", label: "Proprietorship" },
  { value: "OPC", label: "One Person Company (OPC)" },
];

const RESIDENTIAL_STATUS_OPTIONS = [
  { value: "Resident", label: "Resident" },
  { value: "NRI", label: "NRI (Non-Resident Indian)" },
  { value: "Foreign National", label: "Foreign National" },
];

const INITIAL_FORM_DATA = {
  type: "individual",
  clientCode: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  preferredLanguage: "",
  pan: "",
  dob: "",
  address: "",
  residential_status: "",
  entityName: "",
  entityType: "",
  gstin: "",
  cin: "",
  businessPan: "",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ClientDialog({ open = true, onClose, onSelect }) {
  const dialogRef = useRef(null);

  // Tab state
  const [activeTab, setActiveTab] = useState("search");

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Form state
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // ============================================================================
  // DIALOG MANAGEMENT
  // ============================================================================
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      resetDialog();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClick = (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width;

      if (!isInDialog) onClose();
    };

    dialog.addEventListener("click", handleClick);
    return () => dialog.removeEventListener("click", handleClick);
  }, [onClose]);

  const resetDialog = () => {
    setActiveTab("search");
    setQuery("");
    setSearchResults([]);
    setSelectedClientId(null);
    setIsUpdateMode(false);
    setCurrentClientId(null);
    setHasMore(false);
    setFormData(INITIAL_FORM_DATA);
  };

  // ============================================================================
  // SEARCH LOGIC
  // ============================================================================
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setHasMore(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      performSearch(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery) => {
    // TODO: Replace with Redux dispatch
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockResults = [
      {
        id: 1,
        type: "individual",
        clientCode: "C001",
        primaryContactName: "Amit Kumar",
        primaryContactEmail: "amit@example.com",
        primaryContactPhone: "9834763212",
        preferredLanguage: "English",
        pan: "ABCDE1234F",
        dob: "1990-05-15",
        residential_status: "Resident",
        address: "Mumbai, Maharashtra",
      },
      {
        id: 2,
        type: "business",
        clientCode: "B001",
        primaryContactName: "Mahesh Sharma",
        primaryContactEmail: "mahesh@dlaa.com",
        primaryContactPhone: "7854123690",
        preferredLanguage: "Hindi",
        entityName: "DLA & Associates LLP",
        entityType: "LLP",
        gstin: "27AAGCD1234A1Z5",
        businessPan: "AAACD4567M",
        address: "Mumbai, Maharashtra",
      },
    ];

    const filtered = mockResults.filter((client) => {
      const search = searchQuery.toLowerCase();
      const name =
        client.type === "business"
          ? client.entityName.toLowerCase()
          : client.primaryContactName.toLowerCase();

      return (
        name.includes(search) ||
        client.primaryContactEmail.toLowerCase().includes(search) ||
        client.primaryContactPhone.includes(search) ||
        client.clientCode.toLowerCase().includes(search)
      );
    });

    setSearchResults(filtered);
    setHasMore(filtered.length >= 3);
    setIsSearching(false);
  };

  const handleLoadMore = async () => {
    // TODO: Replace with Redux dispatch
    setIsLoadingMore(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setHasMore(false);
    setIsLoadingMore(false);
  };

  const handleClearSearch = () => {
    setQuery("");
    setSearchResults([]);
    setHasMore(false);
  };

  const handleSelectClient = (client) => {
    setSelectedClientId(client.id);
    if (onSelect) onSelect(client);
    onClose();
  };

  const handleUpdateClick = (e, client) => {
    e.stopPropagation();
    setFormData(client);
    setCurrentClientId(client.id);
    setIsUpdateMode(true);
    setActiveTab("form");
  };

  // ============================================================================
  // FORM LOGIC
  // ============================================================================
  const handleCreateNew = () => {
    setFormData(INITIAL_FORM_DATA);
    setIsUpdateMode(false);
    setCurrentClientId(null);
    setActiveTab("form");
  };

  const handleSubmit = async () => {
    // TODO: Replace with Redux dispatch
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (isUpdateMode) {
      console.log("Updating client:", currentClientId, formData);
    } else {
      console.log("Creating client:", formData);
    }

    setIsSubmitting(false);
    onClose();
  };

  const isFormValid = () => {
    const sharedValid =
      formData.primaryContactName.trim() !== "" &&
      formData.primaryContactEmail.trim() !== "" &&
      formData.primaryContactPhone.trim() !== "";

    if (formData.type === "individual") {
      return sharedValid && formData.pan.trim() !== "";
    } else {
      return (
        sharedValid &&
        formData.entityName.trim() !== "" &&
        formData.businessPan.trim() !== ""
      );
    }
  };

  const handleTabChange = (val) => {
    if (val === "form") {
      handleCreateNew();
    } else {
      setActiveTab(val);
    }
  };

  const handleClientTypeChange = (option) => {
    setFormData((prev) => ({
      ...prev,
      type: option.value,
      ...(option.value === "individual"
        ? {
            entityName: "",
            entityType: "",
            gstin: "",
            cin: "",
            businessPan: "",
          }
        : {
            pan: "",
            dob: "",
            residential_status: "",
          }),
    }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const tabs = [
    {
      label: "Select Client",
      value: "search",
      icon: <User size={18} />,
    },
    {
      label: isUpdateMode ? "Update Client" : "Create Client",
      value: "form",
      icon: isUpdateMode ? <Pencil size={18} /> : <Plus size={18} />,
    },
  ];

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.dialogContent}>
        {/* Header */}
        <div className={styles.header}>
          <SegmentedTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
            size="md"
          />
        </div>

        {/* Search Tab */}
        {activeTab === "search" && (
          <div className={styles.searchContent}>
            <div className={styles.searchBar}>
              <input
                placeholder="Search by name, email, phone, or client code"
                disabled={isSearching}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className={styles.searchIcon}>
                {isSearching ? (
                  <Loader2 className={styles.spin} size={22} />
                ) : query ? (
                  <button
                    className={styles.clearBtn}
                    onClick={handleClearSearch}
                  >
                    <X size={22} />
                  </button>
                ) : (
                  <Search size={22} />
                )}
              </span>
            </div>

            <div className={styles.results}>
              {!query && searchResults.length === 0 && (
                <div className={styles.emptyState}>
                  <UserSearch size={48} strokeWidth={1.5} />
                  <p>Search for a client to get started</p>
                </div>
              )}

              {query && searchResults.length === 0 && !isSearching && (
                <div className={styles.emptyState}>
                  <UserSearch size={48} strokeWidth={1.5} />
                  <p>No clients found</p>
                  <span>Try searching with a different keyword</span>
                </div>
              )}

              {searchResults.map((client) => {
                const isSelected = selectedClientId === client.id;
                const displayName =
                  client.type === "business"
                    ? client.entityName
                    : client.primaryContactName;

                return (
                  <div
                    key={client.id}
                    className={`${styles.clientCard} ${
                      isSelected ? styles.selected : ""
                    }`}
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className={styles.clientInfo}>
                      <div className={styles.avatar}>
                        {client.type === "business" ? (
                          <Building2 size={20} />
                        ) : (
                          <User size={20} />
                        )}
                      </div>
                      <div className={styles.details}>
                        <div className={styles.nameRow}>
                          <h4>{displayName}</h4>
                          <span className={styles.clientCode}>
                            {client.clientCode}
                          </span>
                        </div>
                        <p>{client.primaryContactEmail}</p>
                        <p>{client.primaryContactPhone}</p>
                      </div>
                    </div>

                    <div className={styles.updateBtnWrapper}>
                      <ActionButton
                        text="Update"
                        icon={Pencil}
                        onClick={(e) => handleUpdateClick(e, client)}
                        variant="light"
                        size="small"
                      />
                    </div>
                  </div>
                );
              })}

              {hasMore && searchResults.length > 0 && (
                <ActionButton
                  text="Load More"
                  icon={Loader2}
                  onClick={handleLoadMore}
                  isLoading={isLoadingMore}
                  variant="light"
                  size="medium"
                />
              )}
            </div>
          </div>
        )}

        {/* Form Tab */}
        {activeTab === "form" && (
          <div className={styles.formContent}>
            <div className={styles.formGrid}>
              {/* Client Type Selection */}
              <div className={styles.row}>
                <CustomDropdown
                  label="Client Type"
                  placeholder="Select client type"
                  options={CLIENT_TYPE_OPTIONS}
                  selectedValue={formData.type}
                  onSelect={handleClientTypeChange}
                  required={true}
                />

                {formData.type === "individual" ? (
                  <CustomDropdown
                    label="Residential Status"
                    placeholder="Select status"
                    options={RESIDENTIAL_STATUS_OPTIONS}
                    selectedValue={formData.residential_status}
                    onSelect={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        residential_status: option.value,
                      }))
                    }
                    icon={<Globe />}
                  />
                ) : (
                  <CustomDropdown
                    label="Entity Type"
                    placeholder="Select entity type"
                    options={ENTITY_TYPE_OPTIONS}
                    selectedValue={formData.entityType}
                    onSelect={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        entityType: option.value,
                      }))
                    }
                    icon={<Building2 />}
                  />
                )}
              </div>

              <div className={styles.row}>
                <CustomInput
                  label="First Name"
                  placeholder="Enter contact name"
                  required={true}
                  icon={<User />}
                  type="text"
                  value={formData?.firstName}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: val,
                    }))
                  }
                />

                <CustomInput
                  label="Last Name"
                  placeholder="Enter contact name"
                  required={true}
                  icon={<User />}
                  type="text"
                  value={formData?.lastName}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: val,
                    }))
                  }
                />
              </div>
              <CustomInput
                label="Client Code"
                placeholder="Auto-generated or enter manually"
                icon={<FileText />}
                type="text"
                value={formData.clientCode}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, clientCode: val }))
                }
              />

              <div className={styles.row}>
                <CustomInput
                  label="Primary Contact Email"
                  placeholder="Enter email address"
                  required={true}
                  icon={<Mail />}
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryContactEmail: val,
                    }))
                  }
                />

                <CustomInput
                  label="Primary Contact Phone"
                  placeholder="Enter phone number"
                  required={true}
                  icon={<Phone />}
                  type="tel"
                  value={formData.primaryContactPhone}
                  onChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      primaryContactPhone: val,
                    }))
                  }
                />
              </div>

              {formData.type === "individual" && (
                <>
                  <CustomDropdown
                    label="Preferred Language"
                    placeholder="Select language"
                    options={LANGUAGE_OPTIONS}
                    selectedValue={formData.preferredLanguage}
                    onSelect={(option) =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredLanguage: option.value,
                      }))
                    }
                    icon={<Languages />}
                  />
                  <CustomInput
                    label="PAN Number"
                    placeholder="Enter PAN number"
                    required={true}
                    icon={<CreditCard />}
                    type="text"
                    value={formData.pan}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        pan: val.toUpperCase(),
                      }))
                    }
                  />
                  <CustomInput
                    label="Address"
                    placeholder="Enter full address"
                    icon={<MapPin />}
                    type="text"
                    multiline={true}
                    rows={3}
                    value={formData.address}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, address: val }))
                    }
                  />
                </>
              )}

              {formData.type === "business" && (
                <>
                  <CustomInput
                    label="Entity Name"
                    placeholder="Enter business name"
                    required={true}
                    icon={<Building2 />}
                    type="text"
                    value={formData.entityName}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, entityName: val }))
                    }
                  />

                  <CustomInput
                    label="GSTIN"
                    placeholder="Enter GSTIN (optional)"
                    icon={<FileText />}
                    type="text"
                    value={formData.gstin}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        gstin: val.toUpperCase(),
                      }))
                    }
                  />

                  <div className={styles.row}>
                    <CustomInput
                      label="Business PAN"
                      placeholder="Enter business PAN"
                      required={true}
                      icon={<CreditCard />}
                      type="text"
                      value={formData.businessPan}
                      onChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          businessPan: val.toUpperCase(),
                        }))
                      }
                    />
                    <CustomInput
                      label="Other Business Id"
                      placeholder="Other Business Id (optional)"
                      icon={<FileText />}
                      type="text"
                      value={formData.cin}
                      onChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          cin: val.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                  <CustomInput
                    label="Address"
                    placeholder="Enter business address"
                    icon={<MapPin />}
                    type="text"
                    multiline={true}
                    rows={3}
                    value={formData.address}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, address: val }))
                    }
                  />
                </>
              )}
            </div>

            <div className={styles.submitBtnWrapper}>
              <ActionButton
                text={isUpdateMode ? "Update Client" : "Add New Client"}
                icon={isUpdateMode ? Pencil : Plus}
                onClick={handleSubmit}
                isLoading={isSubmitting}
                disabled={!isFormValid()}
                variant="primary"
                size="large"
              />
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
