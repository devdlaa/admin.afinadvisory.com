"use client";
import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Facebook,
  Globe,
  AlertCircle,
  CheckCircle,
  Filter,
  Search,
  Loader2,
} from "lucide-react";
import styles from "./WaitlistDashboard.module.scss";

import AddInfluencerDialog from "@/app/components/partners/AddInfluencerDialog/AddInfluencerDialog";

export default function WaitlistDashboard() {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' or 'created'
  const [isAddInfluencerDialogOpen, setAddInfluencerDialog] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const limit = 10;

  useEffect(() => {
    fetchInfluencers(page);
  }, [page]);

  const fetchInfluencers = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/influencers/brevo/get?page=${pageNum}&limit=${limit}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch");
      setInfluencers(data.data.contacts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (email) => {
    if (!confirm(`Are you sure you want to remove ${email} from the waitlist?`))
      return;

    setActionLoading((prev) => ({ ...prev, [email]: "deleting" }));
    try {
      const res = await fetch(`/api/admin/influencers/brevo/delete`, {
        body: JSON.stringify({ email }),
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete");
      setInfluencers((prev) => prev.filter((i) => i.email !== email));
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading((prev) => {
        const newState = { ...prev };
        delete newState[email];
        return newState;
      });
    }
  };

  const handleMarkAsCreated = async (email) => {
    setActionLoading((prev) => ({ ...prev, [email]: "marking" }));
    try {
      const res = await fetch(`/api/admin/influencers/brevo/has-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hasAccountAlready: true, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      // Update local state
      setInfluencers((prev) =>
        prev.map((inf) =>
          inf.email === email
            ? {
                ...inf,
                attributes: {
                  ...inf.attributes,
                  HASACCOUNTALREADY: true,
                },
              }
            : inf
        )
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading((prev) => {
        const newState = { ...prev };
        delete newState[email];
        return newState;
      });
    }
  };

  const handleCreateInfluencer = (influencer) => {
    setSelectedInfluencer(influencer);
    setAddInfluencerDialog(true);
  };

  const handleInfluencerCreated = async (email) => {
    // Mark as created in Brevo
    await handleMarkAsCreated(email);
    // Refresh list
    fetchInfluencers(page);
  };

  const toggleCard = (email) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const parseSocialLinks = (socialLinksString) => {
    try {
      return JSON.parse(socialLinksString || "[]");
    } catch {
      return [];
    }
  };

  const getSocialIcon = (platform) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <Instagram size={16} />;
      case "facebook":
        return <Facebook size={16} />;
      default:
        return <Globe size={16} />;
    }
  };

  const filteredInfluencers = influencers.filter((inf) => {
    const hasAccount = inf.attributes?.HASACCOUNTALREADY === true;
    const matchesTab = activeTab === "pending" ? !hasAccount : hasAccount;

    if (!matchesTab) return false;

    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      inf.email.toLowerCase().includes(searchLower) ||
      inf.attributes?.FIRSTNAME?.toLowerCase().includes(searchLower) ||
      inf.attributes?.LASTNAME?.toLowerCase().includes(searchLower) ||
      inf.attributes?.SMS?.includes(searchTerm)
    );
  });

  const pendingCount = influencers.filter(
    (inf) => !inf.attributes?.HASACCOUNTALREADY
  ).length;
  const createdCount = influencers.filter(
    (inf) => inf.attributes?.HASACCOUNTALREADY
  ).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1>Influencer Waitlist</h1>
            <p className={styles.subtitle}>
              Manage and convert waitlist applications
            </p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "pending" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("pending")}
          >
            <Filter size={16} />
            Pending Applications
            <span className={styles.badge}>{pendingCount}</span>
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "created" ? styles.active : ""
            }`}
            onClick={() => setActiveTab("created")}
          >
            <CheckCircle size={16} />
            Account Created
            <span className={styles.badge}>{createdCount}</span>
          </button>
        </div>

      </div>

      {loading && (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={32} />
          <p>Loading waitlist...</p>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <AlertCircle size={24} />
          <p>{error}</p>
          <button onClick={() => fetchInfluencers(page)}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={styles.cardsList}>
            {filteredInfluencers.length > 0 ? (
              filteredInfluencers.map((inf) => {
                const isExpanded = expandedCards.has(inf.email);
                const socialLinks = parseSocialLinks(
                  inf.attributes?.SOCIAL_LINKS
                );
                const hasAccount = inf.attributes?.HASACCOUNTALREADY;
                const isLoading = actionLoading[inf.email];

                return (
                  <div
                    key={inf.email}
                    className={`${styles.card} ${
                      isExpanded ? styles.expanded : ""
                    } ${hasAccount ? styles.hasAccount : ""}`}
                  >
                    <div
                      className={styles.cardHeader}
                      onClick={() => toggleCard(inf.email)}
                    >
                      <div className={styles.cardHeaderLeft}>
                        <div className={styles.avatar}>
                          {inf.attributes?.FIRSTNAME?.[0] || "?"}
                        </div>
                        <div className={styles.cardHeaderInfo}>
                          <h3>
                            {inf.attributes?.FIRSTNAME}{" "}
                            {inf.attributes?.LASTNAME}
                          </h3>
                          <div className={styles.cardHeaderMeta}>
                            <span>
                              <Mail size={14} />
                              {inf.email}
                            </span>
                            {inf.attributes?.SMS && (
                              <span>
                                <Phone size={14} />
                                {inf.attributes.SMS}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={styles.cardHeaderRight}>
                        {hasAccount && (
                          <span className={styles.statusBadge}>
                            <CheckCircle size={14} />
                            Account Created
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={20} />
                        ) : (
                          <ChevronDown size={20} />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={styles.cardBody}>
                        <div className={styles.infoGrid}>
                          {inf.attributes?.BIO && (
                            <div className={styles.infoSection}>
                              <h4>Bio</h4>
                              <p>{inf.attributes.BIO}</p>
                            </div>
                          )}

                          {inf.attributes?.PREFERRED_CONTACT_METHOD && (
                            <div className={styles.infoItem}>
                              <span className={styles.label}>
                                Preferred Contact
                              </span>
                              <span className={styles.value}>
                                {inf.attributes.PREFERRED_CONTACT_METHOD}
                              </span>
                            </div>
                          )}

                          {(inf.attributes?.ADDRESS_LANE ||
                            inf.attributes?.CITY) && (
                            <div className={styles.infoSection}>
                              <h4>
                                <MapPin size={16} />
                                Address
                              </h4>
                              <p>
                                {[
                                  inf.attributes.ADDRESS_LANE,
                                  inf.attributes.CITY,
                                  inf.attributes.STATE,
                                  inf.attributes.PINCODE,
                                  inf.attributes.COUNTRY,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                          )}

                          {socialLinks.length > 0 && (
                            <div className={styles.infoSection}>
                              <h4>Social Media</h4>
                              <div className={styles.socialLinks}>
                                {socialLinks.map((link, idx) => (
                                  <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.socialLink}
                                  >
                                    {getSocialIcon(link.platform)}
                                    {link.platform}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={styles.cardActions}>
                          {!hasAccount ? (
                            <>
                              <button
                                className={styles.btnPrimary}
                                onClick={() => handleCreateInfluencer(inf)}
                                disabled={isLoading}
                              >
                                {isLoading === "creating" ? (
                                  <>
                                    <Loader2
                                      className={styles.spinner}
                                      size={16}
                                    />
                                    Creating...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={16} />
                                    Create Influencer Account
                                  </>
                                )}
                              </button>
                              <button
                                className={styles.btnSecondary}
                                onClick={() => handleMarkAsCreated(inf.email)}
                                disabled={isLoading}
                              >
                                {isLoading === "marking" ? (
                                  <>
                                    <Loader2
                                      className={styles.spinner}
                                      size={16}
                                    />
                                    Marking...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={16} />
                                    Mark as Created
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <div className={styles.createdInfo}>
                              <CheckCircle size={16} />
                              <span>Account has been created</span>
                            </div>
                          )}
                          <button
                            className={styles.btnDanger}
                            onClick={() => handleDelete(inf.email)}
                            disabled={isLoading}
                          >
                            {isLoading === "deleting" ? (
                              <>
                                <Loader2 className={styles.spinner} size={16} />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 size={16} />
                                Remove from Waitlist
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>
                <AlertCircle size={48} />
                <h3>No applications found</h3>
                <p>
                  {searchTerm
                    ? "Try adjusting your search criteria"
                    : activeTab === "pending"
                    ? "No pending applications at the moment"
                    : "No accounts have been created yet"}
                </p>
              </div>
            )}
          </div>

          <div className={styles.pagination}>
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className={styles.paginationBtn}
            >
              Previous
            </button>
            <span className={styles.pageInfo}>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className={styles.paginationBtn}
              disabled={filteredInfluencers.length < limit}
            >
              Next
            </button>
          </div>
        </>
      )}

      <AddInfluencerDialog
        prefilledData={selectedInfluencer}
        isOpen={isAddInfluencerDialogOpen}
        onClose={() => {
          setAddInfluencerDialog(false);
          setSelectedInfluencer(null);
        }}
        onSuccess={handleInfluencerCreated}
      />
    </div>
  );
}
