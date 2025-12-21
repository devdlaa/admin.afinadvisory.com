import { useEffect, useRef, useState } from "react";
import {
  User,
  Users,
  Plus,
  Flame,
  Flower,
  Waves,
  RefreshCcw,
  CircleSlash,
  CircleCheck,
  ListChecks,
  IndianRupee,
  Rocket,
  Building,
  Building2,
  Check,
} from "lucide-react";

import CustomInput from "./CustomInput";
import CustomDropdown from "./CustomDropdown";
import CustomDatePicker from "./CustomDatePicker";
import ActionButton from "./ActionButton";
import Avatar from "./Avatar";
import styles from "./TaskDialog.module.scss";
import { Calendar, Pencil } from "lucide-react";
import Checklist from "./Checklist";

import ChargesManager from "./ChargesManager";
import TaskSaveActions from "./TaskSaveActions";

const TaskDialog = ({ isOpen, onClose, taskData = null, mode = "view" }) => {
  const dialogRef = useRef(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tabt, setTab] = useState("actions");
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "",
    category: "",
    status: "",
    startDate: null,
    completionDate: null,
  });

  const handleUpdateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const createdByUser = {
    name: "Dinesh Lulla",
    role: "Admin",
    avatar:
      "https://nlpbifhxscrlgsfgrlua.supabase.co/storage/v1/object/public/team_profiles/ADMIN_USER_001.jpg",
    date: "12 July 2026",
  };

  const assignment = {
    date: "18 July 2025",
    members: [
      {
        id: 1,
        name: "Dinesh Lulla",
        avatar:
          "https://nlpbifhxscrlgsfgrlua.supabase.co/storage/v1/object/public/team_profiles/ADMIN_USER_001.jpg",
      },
      {
        id: 2,
        name: "Ana Wells",
        avatar:
          "https://nlpbifhxscrlgsfgrlua.supabase.co/storage/v1/object/public/team_profiles/ADMIN_USER_001.jpg",
      },
    ],
    onAdd: () => alert("Open assign modal"),
  };

  const hasMembers = assignment.members.length > 0;

  const priorityOptions = [
    {
      value: "high",
      label: "High Priority",
      txtClr: "#dc2626",
      icon: <Flame color="#dc2626" />,
      bgColor: "#fbe3e3ff",
    },
    {
      value: "medium",
      label: "Medium Priority",
      txtClr: "#1056d8ff",
      icon: <Flower color="#1056d8ff" />,
      bgColor: "#e3ebfaff",
    },
    {
      value: "low",
      label: "Low Priority",
      txtClr: "#16a34a",
      icon: <Waves color="#16a34a" />,
      bgColor: "#ebfbf1ff",
    },
  ];

  const categoryOptions = [
    { value: "gst", label: "Goods & Service Tax" },
    { value: "income", label: "Income Tax" },
    { value: "company", label: "Company Formation" },
    { value: "tcs", label: "Tax Collected at Source" },
    { value: "tds", label: "Tax Deducted at Source" },
    { value: "itr", label: "ITR Filing" },
    { value: "msme", label: "MSME / Udyam Registration" },
    { value: "trademark", label: "Trademark Registration" },
    { value: "audit", label: "Audit & Compliance" },
    { value: "pf", label: "PF / EPFO Services" },
    { value: "esi", label: "ESI Compliance" },
    { value: "fssai", label: "FSSAI License" },
    { value: "iso", label: "ISO Certification" },
    { value: "roc", label: "ROC Compliance" },
    { value: "financial", label: "Financial Statements" },
    { value: "startup", label: "Startup Registration & Support" },
    { value: "importExport", label: "Import/Export License (IEC)" },
    { value: "bookkeeping", label: "Bookkeeping & Accounting" },
    { value: "legal", label: "Legal Agreements & Support" },
  ];

  const statusOptions = [
    {
      value: "in-progress",
      label: "In Progress",
      txtClr: "#2563eb",
      icon: <RefreshCcw color="#2563eb" />,
      bgColor: "#eaf0fdff",
    },
    {
      value: "on-hold",
      label: "on-hold",
      txtClr: "#cd9f08ff",
      icon: <CircleSlash color="#eab60cff" />,
      bgColor: "#fcf2d1ff",
    },
    {
      value: "completed",
      label: "Completed",
      txtClr: "#16a34a",
      icon: <CircleCheck color="#16a34a" />,
      bgColor: "#ebfbf1ff",
    },
  ];

  const tabs = [
    {
      label: "Actions & Activity",
      value: "actions",
      icon: <Rocket size={18} />,
    },
    {
      label: "Checklist / Sub Tasks",
      value: "checklist",
      icon: <ListChecks size={18} />,
    },
    {
      label: "Payment & Summary",
      value: "payment",
      icon: <IndianRupee size={18} />,
    },
  ];
  const clientInfo = {
    type: "business",
    ClientCode: "E1252",

    // Shared Fields
    primaryContactName: "Rahul Sharma",
    primaryContactEmail: "rahul.sharma@dlaa.com",
    primaryContactPhone: "+91 7852099185",
    preferredLanguage: "English",

    // Business Specific
    entityName: "DLA & Associates LLP",
    entityType: "LLP",
    gstin: "27AAGCD1234A1Z5",
    cin: "AAE-1234",
    businessPan: "AAACD4567M",
    address: "401, Business Bay Tower, Andheri East, Mumbai - 400069",
    website: "https://dlaa.com",
  };

  // const clientInfo = {
  //   type: "individual",

  //   primaryContactName: "Ayush Khandelwal",
  //   primaryContactEmail: "ayush.khandelwal@example.com",
  //   primaryContactPhone: "+91 9876543210",
  //   preferredLanguage: "Hindi or English",
  //   ClientCode: "E1252",
  //   residential_status: "NRI",

  //   // Individual Specific
  //   pan: "ABCDE1234F",
  //   dob: "1996-09-15",
  //   address: "502, Green Residency, Airoli, Navi Mumbai, Maharashtra - 400708",
  // };

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={handleClose}>
      <div className={styles.mainGrid}>
        <div className={styles.leftSection}>
          <div className={styles.task_primaryInfo}>
            {/* Title */}

            <textarea
              rows={1}
              className={styles.titleInput}
              placeholder="Give your task a title…."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              rows={4}
              className={styles.descriptionInput}
              placeholder="Give your task a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.container}>
            <div className={styles.tabscontainer}>
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  className={`${styles.tab} ${
                    tabt === tab.value ? styles.active : ""
                  }`}
                  onClick={() => setTab(tab.value)}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className={styles.tabContent}>
              {tabt === "actions" && (
                <div className={styles.actions_primary}>
                  <div className={styles.actionsRow}>
                    <CustomDropdown
                      label="Priority"
                      selectedValue={formData.priority}
                      options={priorityOptions}
                      placeholder="Select priority"
                      onSelect={(e) => handleUpdateField("priority", e.value)}
                    />

                    <CustomDropdown
                      label="Category"
                      selectedValue={formData.category}
                      options={categoryOptions}
                      placeholder="Select category"
                      enableSearch
                      onSelect={(e) => handleUpdateField("category", e.value)}
                      onAddNew={(e) => null}
                    />

                    <CustomDropdown
                      label="Status"
                      selectedValue={formData.status}
                      options={statusOptions}
                      placeholder="Select status"
                      onSelect={(e) => handleUpdateField("status", e.value)}
                    />
                    <CustomDatePicker
                      label="Start Date"
                      selectedDate={formData.startDate}
                      onDateSelect={(date) =>
                        handleUpdateField("startDate", date)
                      }
                    />

                    <CustomDatePicker
                      label="Date Of Completion"
                      selectedDate={formData.completionDate}
                      onDateSelect={(date) =>
                        handleUpdateField("completionDate", date)
                      }
                    />
                  </div>
                </div>
              )}
              {tabt === "checklist" && <Checklist />}
              {tabt === "payment" && <ChargesManager />}
            </div>
          </div>
        </div>

        <div className={styles.rightSection}>
          <div className={`${styles.creatdBySection} ${styles.section}`}>
            <p className={styles.title}>Created By & when</p>

            <div className={styles.infoRow}>
              <Avatar
                src={createdByUser.avatar}
                size={48}
                alt={createdByUser.name}
                fallbackText={createdByUser.name}
              />

              <div className={styles.userMeta}>
                <div className={styles.nameRow}>
                  <h3 className={styles.name}>{createdByUser.name}</h3>
                </div>

                <div className={styles.roleBadge}>
                  <span>
                    {" "}
                    <User /> {createdByUser.role}{" "}
                  </span>
                  {createdByUser.date && (
                    <div className={styles.dateTag}>
                      <Calendar size={18} />
                      <span>{createdByUser.date}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.assignment_section}>
            {/* HEADER */}
            <div className={styles.header}>
              <div className={styles.badge}>
                <Users size={16} />
                <span>{assignment?.members?.length || 0} Members Assigned</span>
              </div>
              {hasMembers && assignment.date && (
                <div className={styles.date}>
                  <Calendar size={18} />
                  <span>{assignment.date}</span>
                </div>
              )}
            </div>

            {/* AVATARS & ADD BUTTON */}
            <div className={styles.row}>
              {hasMembers && (
                <div onClick={assignment.onAdd} className={styles.avatars}>
                  {assignment.members.map((m) => (
                    <Avatar
                      key={m.id}
                      src={m.avatar}
                      alt={m.name}
                      fallbackText={m.name}
                      size={48}
                    />
                  ))}
                </div>
              )}

              <button className={styles.addButton} onClick={assignment.onAdd}>
                <Plus size={22} />
              </button>

              {!hasMembers && (
                <p className={styles.noMembersText}>
                  No one is assigned to this task yet.
                </p>
              )}
            </div>
          </div>
          <div className={styles.client_info}>
            {/* HEADER */}
            <div className={styles.header}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <h3 className={styles.title}>Client Information</h3>
                <div className={styles.badge}>
                  {clientInfo.type === "business" ? (
                    <>
                      <Building2 size={16} />
                      <span>{clientInfo.entityType || "Business Entity"}</span>
                    </>
                  ) : (
                    <>
                      <User size={16} />
                      <span>
                        {clientInfo.type
                          ? clientInfo.type.charAt(0).toUpperCase() +
                            clientInfo.type.slice(1)
                          : "Individual"}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ActionButton
                text="Update"
                icon={Pencil}
                onClick={null}
                variant="light"
                size="small"
              />
            </div>

            {/* FORM GRID */}
            <div className={styles.grid}>
              {/* CONDITIONAL FIELDS */}
              {clientInfo.type === "individual" && (
                <>
                  <CustomInput
                    label="PAN"
                    value={clientInfo.pan || ""}
                    readOnly
                  />
                  <CustomInput
                    label="Residential status"
                    value={clientInfo.residential_status || ""}
                    readOnly
                  />
                </>
              )}

              {clientInfo.type === "business" && (
                <>
                  <CustomInput
                    label="Entity Legal Name"
                    value={clientInfo.entityName || ""}
                    readOnly
                  />

                  <CustomInput
                    label="GSTIN"
                    value={clientInfo.gstin || ""}
                    readOnly
                  />
                  <CustomInput
                    label="CIN / LLPIN"
                    value={clientInfo.cin || ""}
                    readOnly
                  />
                  <CustomInput
                    label="Business PAN"
                    value={clientInfo.businessPan || ""}
                    readOnly
                  />
                </>
              )}
              <CustomInput
                label="Contact Name"
                value={clientInfo.primaryContactName || ""}
                readOnly
              />
              <CustomInput
                label="Contact Email"
                value={clientInfo.primaryContactEmail || ""}
                readOnly
              />

              <CustomInput
                label="Contact Phone"
                value={clientInfo.primaryContactPhone || ""}
                readOnly
              />

              <CustomInput
                label="Client Code"
                value={clientInfo.ClientCode || ""}
                readOnly
              />

              <div className={styles.fullWidth}>
                <CustomInput
                  label=" Address"
                  value={clientInfo.address || ""}
                  readOnly
                  multiline
                />
              </div>
            </div>
          </div>

          <TaskSaveActions
            hasChanges={false}
            isLoading={false}
            onUpdate={null}
            onCancel={null}
          />
        </div>
      </div>
    </dialog>
  );
};

export default TaskDialog;
