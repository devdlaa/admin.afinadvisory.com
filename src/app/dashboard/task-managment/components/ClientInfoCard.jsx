import React from "react";
import { Building2, Mail, Phone, CreditCard, Users, Edit2, Plus } from "lucide-react";

const ClientInfoCard = ({ selectedEntityData, onOpenClientDialog }) => {
  return (
    <div className="client-card">
      {selectedEntityData ? (
        <div className="client-card__body">
          <div className="client-card__top">
            <div>
              <div className="client-card__name">{selectedEntityData.name}</div>
              <div className="client-card__type">
                {selectedEntityData.entity_type?.replaceAll("_", " ")}
              </div>
            </div>

            <span
              className={`client-card__status ${
                selectedEntityData.status === "ACTIVE" ? "active" : ""
              }`}
            >
              {selectedEntityData.status}
            </span>
          </div>

          <div className="client-card__details">
            <div className="client-card__row">
              <Mail size={14} />
              <div>
                <div className="client-card__label">Email Address</div>
                <div className="client-card__value">
                  {selectedEntityData.email || "—"}
                </div>
              </div>
            </div>

            <div className="client-card__row">
              <Phone size={14} />
              <div>
                <div className="client-card__label">Primary Phone</div>
                <div className="client-card__value">
                  {selectedEntityData.primary_phone || "—"}
                </div>
              </div>
            </div>

            {selectedEntityData.pan && (
              <div className="client-card__row">
                <CreditCard size={14} />
                <div>
                  <div className="client-card__label">PAN</div>
                  <div className="client-card__value">
                    {selectedEntityData.pan}
                  </div>
                </div>
              </div>
            )}

            {selectedEntityData.contact_person && (
              <div className="client-card__row">
                <Users size={14} />
                <div>
                  <div className="client-card__label">Contact Person</div>
                  <div className="client-card__value">
                    {selectedEntityData.contact_person}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className="client-card__edit-btn"
            onClick={onOpenClientDialog}
          >
            <Edit2 size={14} />
            Update Client
          </button>
        </div>
      ) : (
        <div className="client-card__empty">
          <Building2 size={32} />
          <h4>No Client Assigned</h4>
          <p>This task doesn't have a client associated with it yet.</p>
          <button className="client-card__add-btn" onClick={onOpenClientDialog}>
            <Plus size={16} />
            Add Client
          </button>
        </div>
      )}
    </div>
  );
};

export default ClientInfoCard;