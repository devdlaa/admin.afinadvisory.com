import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Edit,
  User,
  Instagram,
  Twitter,
  Linkedin,
  Facebook,
  Youtube,
  Github,
  TikTok,
  Pinterest,
  Twitch,
  Reddit,
  Globe,
  Users,
  BadgeCheck,
} from "lucide-react";
import { CircularProgress } from "@mui/material";
import {
  selectInfluencer,
  setInfluencerDrawer,
} from "@/store/slices/influencersSlice";
import "./InfluencerTable.scss";

// Map platform name to Lucide icon
const ICON_MAP = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  youtube: Youtube,
  github: Github,
  tiktok: TikTok,
  pinterest: Pinterest,
  twitch: Twitch,
  reddit: Reddit,
};

const InfluencerTable = ({ actionButtons = [] }) => {
  const dispatch = useDispatch();

  // Redux selectors
  const influencers = useSelector((state) => state.influencers.influencers);
  const searchedInfluencers = useSelector(
    (state) => state.influencers.searchedInfluencers
  );
  const { loading, searchLoading } = useSelector((state) => state.influencers);
  const { isSearchActive, isFilterActive } = useSelector(
    (state) => state.influencers
  );

  const defaultActions = [
    {
      text: "Edit & View",
      icon: Edit,
      onClick: (influencer) => {
        dispatch(selectInfluencer(influencer?.id));
        dispatch(setInfluencerDrawer());
      },
    },
  ];

  const actions = actionButtons.length > 0 ? actionButtons : defaultActions;

  const getStatusBadge = (status) => {
    const statusClass = status?.toLowerCase() || "unknown";
    return (
      <span className={`status-badge ${statusClass}`}>
        <BadgeCheck size={16} />
        {status || "Unknown"}
      </span>
    );
  };

  const getDisplayCategories = (tags) => {
    if (!tags || tags.length === 0) return "General";
    return Array.isArray(tags) ? tags.join(", ") : tags;
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return "—";
    return phone;
  };

  const getDisplayName = (influencer) => {
    if (influencer?.name) {
      return influencer?.name;
    }
    return influencer?.email?.split("@")[0] || "Unknown User";
  };

  let renderedInfluencers = [];
  if (isSearchActive) {
    renderedInfluencers = searchedInfluencers;
  } else {
    renderedInfluencers = influencers;
  }

  if (loading) {
    return (
      <div className="influencer-table-container">
        <div className="loading-state">
          <CircularProgress size={20} />
          <p>Loading influencers...</p>
        </div>
      </div>
    );
  }

  if (renderedInfluencers.length === 0) {
    return (
      <div className="influencer-table-container">
        <div className="empty-state">
          <Users size={48} />
          <h3>No influencers found</h3>
          <p>Try adjusting your search criteria or filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="influencer-table-container">
      {/* Table Header */}
      <div className="table-header">
        <div className="table-header-cell">Influencer</div>
        <div className="table-header-cell">Phone Number</div>
        <div className="table-header-cell">Category</div>
        <div className="table-header-cell">Account Status</div>
        <div className="table-header-cell">Socials</div>
        <div className="table-header-cell">Actions</div>
      </div>

      {/* Table Body */}
      <div className="table-body">
        {renderedInfluencers.map((influencer) => (
          <div key={influencer?.id} className="table-row">
            {/* Influencer Info */}
            <div className="table-cell influencer-info" data-label="Influencer">
              <div className="influencer-avatar">
                {influencer?.avatar ? (
                  <img src={influencer?.avatar} alt={influencer?.name} />
                ) : (
                  <User size={24} />
                )}
              </div>
              <div className="influencer-details">
                <div className="influencer-name">
                  {getDisplayName(influencer)}
                </div>
                <div className="influencer-uid">
                  {influencer?.uid
                    ? `UID: ${influencer?.uid}`
                    : influencer?.influencerId
                    ? `ID: ${influencer?.influencerId}`
                    : `ID: ${influencer?.id}`}
                </div>
                {influencer?.email && (
                  <div className="influencer-email">{influencer?.email}</div>
                )}
              </div>
            </div>

            {/* Phone Number */}
            <div className="table-cell phone-cell" data-label="Phone Number">
              <div className="phone-text">
                {formatPhoneNumber(influencer?.phone || influencer?.mobile)}
              </div>
            </div>

            {/* Category */}
            <div className="table-cell category-cell" data-label="Category">
              <div className="category-badge">
                <span className="category-text">
                  {getDisplayCategories(influencer?.tags || influencer?.category)}
                </span>
              </div>
            </div>

            {/* Account Status */}
            <div className="table-cell status-cell" data-label="Status">
              {getStatusBadge(influencer?.status || influencer?.accountStatus)}
            </div>

            {/* Social Links */}
            <div className="table-cell socials-cell" data-label="Socials">
              <div className="social-buttons">
                {influencer?.socialLinks?.slice(0, 2).map((social, index) => {
                  const Icon = ICON_MAP[social.platform.toLowerCase()] || Globe;
                  const platformClass = social.platform.toLowerCase();

                  return (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`social-button ${platformClass}`}
                      title={`${social.platform} Profile`}
                    >
                      <Icon className="social-icon" />
                      <span className="social-name">{social.platform}</span>
                    </a>
                  );
                })}
                {/* Handle socialMedia object format */}
                {influencer?.socialMedia &&
                  Object.entries(influencer?.socialMedia).map(
                    ([platform, handle]) => {
                      if (!handle) return null;
                      const Icon = ICON_MAP[platform.toLowerCase()] || Globe;
                      const platformClass = platform.toLowerCase();

                      return (
                        <div
                          key={platform}
                          className={`social-button ${platformClass}`}
                          title={`${platform}: ${handle}`}
                        >
                          <Icon className="social-icon" />
                          <span className="social-name">{platform}</span>
                        </div>
                      );
                    }
                  )}
                {(!influencer?.socialLinks ||
                  influencer?.socialLinks.length === 0) &&
                  (!influencer?.socialMedia ||
                    Object.keys(influencer?.socialMedia).length === 0) && (
                    <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                      —
                    </span>
                  )}
              </div>
            </div>

            {/* Actions */}
            <div className="table-cell actions-cell" data-label="Actions">
              <div className="actions-container">
                {actions.map((action, index) => (
                  <button
                    key={index}
                    className="action-button edit-button"
                    onClick={() => action.onClick(influencer)}
                    title={action.text}
                  >
                    <action.icon size={16} />
                    {action.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InfluencerTable;
