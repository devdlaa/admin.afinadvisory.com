"use client";
import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  bulkImportEntities,
  downloadEntityImportTemplate,
  selectBulkImportLoading,
  selectTemplateDownloadLoading,
} from "@/store/slices/entitySlice";
import styles from "./BulkClientImportDialog.module.scss";

const normalizeValidationErrors = (details) => {
  const rowMap = {};

  details.forEach((err) => {
    const rowIndex = err.path?.[0];
    const field = err.path?.[1];

    if (rowIndex === undefined) return;

    const rowNumber = rowIndex + 2;

    if (!rowMap[rowNumber]) {
      rowMap[rowNumber] = new Set();
    }

    if (field) {
      rowMap[rowNumber].add(field.replace("_", " "));
    }
  });

  return Object.entries(rowMap).map(([row, fields]) => ({
    row,
    fields: Array.from(fields),
  }));
};

const BulkClientImportDialog = forwardRef((props, ref) => {
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();

  // Local state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // idle | uploading | success | error
  const [importResults, setImportResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Redux selectors
  const isUploading = useSelector(selectBulkImportLoading);
  const isDownloadingTemplate = useSelector(selectTemplateDownloadLoading);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    showModal: () => dialogRef.current?.showModal(),
    close: () => handleClose(),
  }));

  const handleClose = () => {
    // Prevent closing during upload
    if (isUploading) return;

    // Reset state
    setSelectedFile(null);
    setUploadStatus("idle");
    setImportResults(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    dialogRef.current?.close();
  };

  const handleDownloadTemplate = async () => {
    try {
      await dispatch(downloadEntityImportTemplate()).unwrap();
    } catch (error) {
      setErrorMessage(error.message || "Failed to download template");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!validTypes.includes(file.type)) {
      setErrorMessage("Please upload a valid Excel file (.xlsx or .xls)");
      e.target.value = "";
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be less than 10MB");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setErrorMessage("");
    setUploadStatus("idle");
    setImportResults(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus("uploading");
    setErrorMessage("");

    try {
      const result = await dispatch(bulkImportEntities(selectedFile)).unwrap();
      setImportResults(result);
      setUploadStatus("success");
    } catch (error) {
      if (error?.code === "VALIDATION_ERROR" && error.details) {
        const rows = normalizeValidationErrors(error.details);
        
        setImportResults({
          validationOnly: true,
          invalidRows: rows,
        });

        setErrorMessage("Validation failed. Please fix the errors in Excel Sheet and Re-upload.");
      } else {
        setErrorMessage(error.message || "Upload failed");
      }

      setUploadStatus("error");
    }
  };

  const handleRemoveFile = () => {
    if (isUploading) return;

    setSelectedFile(null);
    setUploadStatus("idle");
    setImportResults(null);
    setErrorMessage("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { label: "Download Template", completed: true },
      { label: "Upload File", completed: !!selectedFile },
      { label: "Import", completed: uploadStatus === "success" },
    ];

    return (
      <div className={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div
              className={`${styles.step} ${
                step.completed ? styles.completed : ""
              }`}
            >
              <div className={styles.stepNumber}>
                {step.completed ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`${styles.stepConnector} ${
                  step.completed ? styles.completed : ""
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderTemplateSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <FileSpreadsheet size={20} />
        <h3>Step 1: Download Template</h3>
      </div>
      <p className={styles.sectionDescription}>
        Download the Excel template, fill in your client details, and upload it
        back.
      </p>
      <button
        className={styles.downloadBtn}
        onClick={handleDownloadTemplate}
        disabled={isUploading || isDownloadingTemplate}
      >
        {isDownloadingTemplate ? (
          <>
            <Loader2 size={18} className={styles.spinner} />
            Downloading...
          </>
        ) : (
          <>
            <Download size={18} />
            Download Template
          </>
        )}
      </button>
    </div>
  );

  const renderUploadSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Upload size={20} />
        <h3>Step 2: Upload Filled Template</h3>
      </div>

      {!selectedFile ? (
        <div className={styles.uploadArea}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className={styles.fileInput}
            disabled={isUploading}
            id="bulk-upload-input"
          />
          <label
            htmlFor="bulk-upload-input"
            className={`${styles.uploadLabel} ${
              isUploading ? styles.disabled : ""
            }`}
          >
            <FileSpreadsheet size={32} className={styles.uploadIcon} />
            <span className={styles.uploadText}>
              Click to browse or drag and drop
            </span>
            <span className={styles.uploadSubtext}>
              Supported formats: .xlsx, .xls (Max 10MB)
            </span>
          </label>
        </div>
      ) : (
        <div className={styles.filePreview}>
          <FileSpreadsheet size={24} className={styles.fileIcon} />
          <div className={styles.fileInfo}>
            <span className={styles.fileName}>{selectedFile.name}</span>
            <span className={styles.fileSize}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </span>
          </div>
          {!isUploading && (
            <button
              className={styles.removeFileBtn}
              onClick={handleRemoveFile}
              title="Remove file"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderImportSection = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <CheckCircle2 size={20} />
        <h3>Step 3: Import Data</h3>
      </div>

      {errorMessage && (
        <div className={styles.errorAlert}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {uploadStatus === "idle" && selectedFile && (
        <button
          className={styles.importBtn}
          onClick={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={18} className={styles.spinner} />
              Importing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Start Import
            </>
          )}
        </button>
      )}

      {uploadStatus === "uploading" && (
        <div className={styles.uploadingState}>
          <Loader2 size={32} className={styles.spinnerLarge} />
          <p>Processing your file... Please wait.</p>
          <p className={styles.warningText}>
            Do not close this dialog or refresh the page.
          </p>
        </div>
      )}

      {uploadStatus === "success" && importResults && (
        <div className={styles.resultsContainer}>
          <div className={styles.resultsSummary}>
            <div className={styles.summaryCard}>
              <CheckCircle2 size={24} className={styles.successIcon} />
              <div>
                <span className={styles.summaryNumber}>
                  {importResults.added?.length || 0}
                </span>
                <span className={styles.summaryLabel}>Successfully Added</span>
              </div>
            </div>

            {importResults.skipped && importResults.skipped.length > 0 && (
              <div className={styles.summaryCard}>
                <AlertTriangle size={24} className={styles.warningIcon} />
                <div>
                  <span className={styles.summaryNumber}>
                    {importResults.skipped.length}
                  </span>
                  <span className={styles.summaryLabel}>Skipped</span>
                </div>
              </div>
            )}

            {importResults.failed && importResults.failed.length > 0 && (
              <div className={styles.summaryCard}>
                <XCircle size={24} className={styles.errorIcon} />
                <div>
                  <span className={styles.summaryNumber}>
                    {importResults.failed.length}
                  </span>
                  <span className={styles.summaryLabel}>Failed</span>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Results */}
          {(importResults.skipped?.length > 0 ||
            importResults.failed?.length > 0) && (
            <div className={styles.detailedResults}>
              <h4>Details</h4>

              {importResults.skipped?.length > 0 && (
                <div className={styles.resultSection}>
                  <h5 className={styles.warningTitle}>
                    <AlertTriangle size={16} />
                    Skipped Rows
                  </h5>
                  <div className={styles.resultList}>
                    {importResults.skipped.map((item, index) => (
                      <div key={index} className={styles.resultItem}>
                        <span className={styles.rowNumber}>Row {item.row}</span>
                        <span className={styles.reason}>{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importResults.failed?.length > 0 && (
                <div className={styles.resultSection}>
                  <h5 className={styles.errorTitle}>
                    <XCircle size={16} />
                    Failed Rows
                  </h5>
                  <div className={styles.resultList}>
                    {importResults.failed.map((item, index) => (
                      <div key={index} className={styles.resultItem}>
                        <span className={styles.rowNumber}>Row {item.row}</span>
                        <span className={styles.reason}>{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
     
    </div>
  );

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.dialogContent}>
        {/* Header */}
        <div className={styles.dialogHeader}>
          <div>
            <h2 className={styles.dialogTitle}>Bulk Import Clients</h2>
            <p className={styles.dialogSubtitle}>
              Import multiple clients at once using an Excel template
            </p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            disabled={isUploading}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Main Content */}
        <div className={styles.dialogBody}>
          {renderTemplateSection()}
          {renderUploadSection()}
          {renderImportSection()}
        </div>

        {/* Footer */}
        <div className={styles.dialogFooter}>
          <button
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={isUploading}
          >
            {uploadStatus === "success" ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </dialog>
  );
});

BulkClientImportDialog.displayName = "BulkClientImportDialog";

export default BulkClientImportDialog;
