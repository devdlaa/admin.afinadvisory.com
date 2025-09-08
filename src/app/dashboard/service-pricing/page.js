"use client";
import React, { useState, useEffect } from "react";
import {
  Settings,
  Search,
  Edit3,
  Plus,
  Loader,
  Database,
  FileText,
  Users,
  Building,
} from "lucide-react";
import ServicePricingModification from "../../components/ServicePricingModification/ServicePricingModification";
import {
  showSuccess,
  showError,
  showInfo,
} from "@/app/components/toastService";
import "./service-pricing.scss";

const AdminDashboard = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fetchingConfig, setFetchingConfig] = useState(false);
  const [error, setError] = useState(null);
  const [revalidateSlug, setRevaidateSlug] = useState("");
  const [isSaving, setSaving] = useState(false);

  // Fetch all services on page load
  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch("/api/admin/service_pricing/get");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.services) {
          throw new Error(data.error || "Failed to fetch services");
        }

        setServices(data.services || []);
        setFilteredServices(data.services || []);
        
        // Show success toast only if we have services
        if (data.services && data.services.length > 0) {
          showSuccess(`${data.services.length} services loaded successfully`);
        }
        
      } catch (error) {
        console.error("Error fetching services:", error);
        const errorMessage = error.message === "Failed to fetch" 
          ? "Network error. Please check your connection and try again."
          : error.message || "Failed to load services";
        
        setError(errorMessage);
        showError(`Failed to load services: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Handle search functionality
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredServices(services);
    } else {
      const filtered = services.filter(
        (service) =>
          service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.serviceId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredServices(filtered);
      
      // Show info about search results
      if (searchTerm.trim() && filtered.length === 0) {
        showInfo(`No services found matching "${searchTerm}"`);
      }
    }
  }, [searchTerm, services]);

  // Fetch individual service config when card is clicked
  const handleEditService = async (service) => {
    try {
      setFetchingConfig(true);
      setRevaidateSlug(service?.slug.split("/")[2]);
      
      // Show loading toast for longer operations
      showInfo("Loading service configuration...");

      const response = await fetch("/api/admin/service_pricing/get_by_id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ serviceId: service.serviceId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const config = await response.json();
      
      if (!config) {
        throw new Error(config.error || "Failed to fetch service config");
      }

      setSelectedService(config);
      setIsEditing(true);
      showSuccess(`Configuration loaded for ${service.name}`);
      
    } catch (error) {
      setRevaidateSlug("");
      console.error("Error fetching service config:", error);
      
      const errorMessage = error.message === "Failed to fetch"
        ? "Network error. Please check your connection and try again."
        : error.message || "Failed to fetch service configuration";
      
      showError(`Failed to load configuration: ${errorMessage}`);
    } finally {
      setFetchingConfig(false);
    }
  };

  // Handle saving updated config
  const handleSaveService = async (updatedConfig) => {
    try {
      setSaving(true);
      
      // Show loading toast
      showInfo("Saving configuration...");
      
      const response = await fetch("/api/admin/service_pricing/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceId: updatedConfig.serviceId,
          slug: revalidateSlug,
          updatedConfig,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to update service");
      }

      setRevaidateSlug("");
      setIsEditing(false);
      setSelectedService(null);
      setSaving(false);
      
      // Show success message with service name if available
      const serviceName = updatedConfig.name || updatedConfig.serviceId || "Service";
      showSuccess(`${serviceName} configuration updated successfully!`);
      
    } catch (error) {
      setRevaidateSlug("");
      setSaving(false);
      console.error("Error saving service:", error);
      
      const errorMessage = error.message === "Failed to fetch"
        ? "Network error. Please check your connection and try again."
        : error.message || "Failed to save service configuration";
      
      showError(`Save failed: ${errorMessage}`);
      
      // Don't close the editing modal on error so user can retry
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedService(null);
    setRevaidateSlug("");
    showInfo("Configuration changes discarded");
  };

  const handleRetry = async () => {
    setError(null);
    // Re-run the initial fetch
    const fetchServices = async () => {
      try {
        setLoading(true);
        showInfo("Retrying to load services...");
        
        const response = await fetch("/api/admin/service_pricing/get");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || "Failed to fetch services");
        }

        setServices(data.services || []);
        setFilteredServices(data.services || []);
        showSuccess("Services loaded successfully");
        
      } catch (error) {
        console.error("Error fetching services:", error);
        const errorMessage = error.message === "Failed to fetch" 
          ? "Network error. Please check your connection and try again."
          : error.message || "Failed to load services";
        
        setError(errorMessage);
        showError(`Retry failed: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    await fetchServices();
  };

  const getServiceIcon = (serviceName) => {
    const name = serviceName.toLowerCase();
    if (name.includes("company") || name.includes("corporation"))
      return <Building className="service-icon" />;
    if (name.includes("partnership") || name.includes("llp"))
      return <Users className="service-icon" />;
    if (name.includes("registration") || name.includes("filing"))
      return <FileText className="service-icon" />;
    return <Database className="service-icon" />;
  };

  if (isEditing && selectedService) {
    return (
      <ServicePricingModification
        initialConfig={selectedService}
        onSave={handleSaveService}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="dashboard">
      {/* Header Section */}
      <div className="dashboard__header">
        <div className="dashboard__header-content">
          <div className="dashboard__title">
            <Settings className="dashboard__title-icon" />
            <div>
              <h1>Service Management</h1>
              <p>Configure and manage your business services</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Stats Section */}
      <div className="dashboard__controls">
        <div className="search-bar">
          <Search className="search-bar__icon" />
          <input
            type="text"
            placeholder="Search services by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar__input"
          />
        </div>
        <div className="stats-card">
          <div className="stats-card__item">
            <span className="stats-card__number">{services.length}</span>
            <span className="stats-card__label">Total Services</span>
          </div>
          <div className="stats-card__item">
            <span className="stats-card__number">
              {filteredServices.length}
            </span>
            <span className="stats-card__label">Showing</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <Loader className="loading-spinner" />
          <p>Loading services...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button
            className="btn btn--secondary"
            onClick={handleRetry}
          >
            Retry
          </button>
        </div>
      )}

      {/* Services Grid */}
      {!loading && !error && (
        <div className="services-grid">
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <Database size={48} />
              <h3>No services found</h3>
              <p>
                {searchTerm.trim() 
                  ? `No services match "${searchTerm}". Try adjusting your search.`
                  : "No services available. Check back later or contact support."
                }
              </p>
            </div>
          ) : (
            filteredServices.map((service) => (
              <div key={service.serviceId} className="service-card">
                <div className="service-card__header">
                  {getServiceIcon(service.name)}
                  <div className="service-card__info">
                    <h3 className="service-card__name">{service.name}</h3>
                    <p className="service-card__id">{service.serviceId}</p>
                  </div>
                </div>

                <div className="service-card__actions">
                  <button
                    className="btn btn--outline"
                    onClick={() => handleEditService(service)}
                    disabled={fetchingConfig}
                  >
                    {fetchingConfig ? (
                      <Loader size={14} className="loading-spinner" />
                    ) : (
                      <Edit3 size={14} />
                    )}
                    Configure
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Fetching Config Overlay */}
      {fetchingConfig && (
        <div className="overlay">
          <div className="overlay__content">
            <Loader
              color="black"
              className="loading-spinner loading-spinner--large"
            />
            <p>Fetching pricing configuration...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;