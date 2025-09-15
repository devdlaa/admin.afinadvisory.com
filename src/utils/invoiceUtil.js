import Handlebars from "handlebars";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Inline HBS template
const invoiceTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Afinthrive Advisory - Tax Invoice</title>
  <style>
    @page { size: A4; margin: 5mm; }
    html, body { width: 210mm; margin: 0 auto; padding: 0; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #222; }
    .invoice-container { width: 100%; margin: auto; background: #fff; padding: 8mm; box-sizing: border-box; border: 1px solid #ccc; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); page-break-inside: avoid; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 24px; }
    .header img { max-height: 55px; }
    .company-details { text-align: right; font-size: 13px; line-height: 1.5; }
    .company-details strong { color: #1e3a8a; font-size: 15px; }
    .section-title { font-size: 14px; font-weight: bold; color: #1e3a8a; margin-top: 20px; margin-bottom: 6px; border-left: 4px solid #1e3a8a; padding-left: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 18px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
    th { background: #f0f4ff; color: #1e3a8a; font-weight: 600; text-align: left; }
    .totals td { font-weight: bold; padding: 10px 8px; }
    .totals tr td:first-child { text-align: right; }
    .note { margin-top: 20px; font-size: 13px; color: #444; background: #f9f9f9; padding: 10px; border-radius: 4px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #555; border-top: 1px solid #ddd; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <img src="https://afinadvisory.com/assets/svg/logo_color.svg?text=Afinthrive+Logo" alt="Afinthrive Advisory Logo">
      <div class="company-details">
        <strong>Afinthrive Advisory Private Limited</strong><br>
        402, 4th Floor, City Corporate Tower, D-3, Malviya Marg,<br>
        C-Scheme, Jaipur, Rajasthan, 302001, India<br>
        GSTIN: 08ABCCA3722H1ZX
      </div>
    </div>

    <div class="section-title">Client & Invoice Details</div>
    <table>
      <tr>
        <td><strong>Bill To:</strong> {{client-name}}</td>
        <td><strong>Invoice No:</strong> {{invoice-no}}</td>
      </tr>
      <tr>
        <td>Email: {{client-email}} | Phone: {{client-phone}}</td>
        <td><strong>Date:</strong> {{invoice-date}}</td>
      </tr>
      <tr>
        <td>Address: {{client-address}}</td>
        <td><strong>Place of Supply:</strong> {{place-of-supply}}</td>
      </tr>
    </table>

    <div class="section-title">Service Summary</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>HSN/SAC</th>
          <th>Amount</th>
          <th>GST (%)</th>
          <th>GST Amt</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{service-description}}</td>
          <td>998232</td>
          <td>{{amount}}</td>
          <td>{{gst-rate}}</td>
          <td>{{gst-amt}}</td>
          <td>{{total-amt}}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">HSN/SAC Wise Tax Summary</div>
    <table>
      <thead>
        <tr>
          <th>HSN/SAC</th>
          <th>Taxable Amount</th>
          <th>CGST</th>
          <th>SGST</th>
          <th>IGST</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>998232</td>
          <td>{{taxable-amount}}</td>
          <td>{{cgst}}</td>
          <td>{{sgst}}</td>
          <td>{{igst}}</td>
          <td>{{total-summary}}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals">
      <tr><td>Subtotal:</td><td>{{subtotal}}</td></tr>
      <tr><td>Total GST:</td><td>{{total-gst}}</td></tr>
      <tr><td><strong>Grand Total:</strong></td><td><strong>{{grand-total}}</strong></td></tr>
      <tr><td>Amount in Words:</td><td>{{amount-words}}</td></tr>
    </table>

    <div class="note">
      <strong>Notes:</strong> Thank you for choosing Afinthrive Advisory. This is a system-generated invoice. Please retain it for your records.
    </div>

    <div class="footer">
      For queries or support, contact us at <a href="mailto:info@afinthrive.com">info@afinthrive.com</a><br>
      www.afinadvisory.com
    </div>
  </div>
</body>
</html>
`;

function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (num < 20) return a[num];
  if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
  if (num < 1000) return a[Math.floor(num / 100)] + " Hundred " + numberToWords(num % 100);
  return num;
}

export async function downloadInvoice(config) {
  // Show loading state (optional)
  const originalButtonText = document.querySelector('.download-button')?.textContent;
  const downloadButton = document.querySelector('.download-button');
  if (downloadButton) {
    downloadButton.textContent = 'Generating PDF...';
    downloadButton.disabled = true;
  }

  try {
    const fullName = `${config.user_details.firstName} ${config.user_details.lastName}`;
    const address = config.user_details.address
      ? [config.user_details.address.city, config.user_details.address.state, config.user_details.address.country]
          .filter(Boolean).join(", ")
      : "Not Available";

    const data = {
      "client-name": fullName,
      "invoice-no": config.invoiceNumber,
      "client-email": config.user_details.email,
      "client-phone": config.user_details.phone,
      "invoice-date": new Date(config.created_at).toLocaleDateString("en-IN"),
      "client-address": address,
      "place-of-supply": config.user_details.address?.state || "Not Available",
      "service-description": config.plan_details.plan_name,
      "amount": config.payment_details.quantityAdjustedAmount,
      "gst-rate": config.payment_details.gstRate,
      "gst-amt": config.payment_details.gstAmount,
      "total-amt": config.payment_details.finalAmountPaid,
      "taxable-amount": config.payment_details.quantityAdjustedAmount,
      "cgst": config.payment_details.gstAmount / 2,
      "sgst": config.payment_details.gstAmount / 2,
      "igst": 0,
      "total-summary": config.payment_details.finalAmountPaid,
      "subtotal": config.payment_details.quantityAdjustedAmount,
      "total-gst": config.payment_details.gstAmount,
      "grand-total": config.payment_details.finalAmountPaid,
      "amount-words": numberToWords(config.payment_details.finalAmountPaid) + " Only"
    };

    const template = Handlebars.compile(invoiceTemplate);
    const html = template(data);

    // Create an invisible iframe instead of adding to main document
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm'; // A4 height
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    
    document.body.appendChild(iframe);

    // Wait for iframe to load
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    // Get the document from iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const invoiceElement = iframeDoc.body;

    // Generate canvas from iframe content
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${config.invoiceNumber}.pdf`);

    // Clean up iframe
    document.body.removeChild(iframe);

  } catch (error) {
    console.error('Error generating invoice:', error);
    alert('Failed to generate invoice. Please try again.');
  } finally {
    // Reset button state
    if (downloadButton) {
      downloadButton.textContent = originalButtonText || 'Download Invoice';
      downloadButton.disabled = false;
    }
  }
}

// Alternative approach: Open in new window (if you prefer this method)
export async function downloadInvoiceInNewWindow(config) {
  const fullName = `${config.user_details.firstName} ${config.user_details.lastName}`;
  const address = config.user_details.address
    ? [config.user_details.address.city, config.user_details.address.state, config.user_details.address.country]
        .filter(Boolean).join(", ")
    : "Not Available";

  const data = {
    "client-name": fullName,
    "invoice-no": config.invoiceNumber,
    "client-email": config.user_details.email,
    "client-phone": config.user_details.phone,
    "invoice-date": new Date(config.created_at).toLocaleDateString("en-IN"),
    "client-address": address,
    "place-of-supply": config.user_details.address?.state || "Not Available",
    "service-description": config.plan_details.plan_name,
    "amount": config.payment_details.quantityAdjustedAmount,
    "gst-rate": config.payment_details.gstRate,
    "gst-amt": config.payment_details.gstAmount,
    "total-amt": config.payment_details.finalAmountPaid,
    "taxable-amount": config.payment_details.quantityAdjustedAmount,
    "cgst": config.payment_details.gstAmount / 2,
    "sgst": config.payment_details.gstAmount / 2,
    "igst": 0,
    "total-summary": config.payment_details.finalAmountPaid,
    "subtotal": config.payment_details.quantityAdjustedAmount,
    "total-gst": config.payment_details.gstAmount,
    "grand-total": config.payment_details.finalAmountPaid,
    "amount-words": numberToWords(config.payment_details.finalAmountPaid) + " Only"
  };

  const template = Handlebars.compile(invoiceTemplate);
  const html = template(data);

  // Open in new window
  const newWindow = window.open('', '_blank', 'width=800,height=600');
  newWindow.document.write(html);
  newWindow.document.close();

  // Wait a moment for content to render
  setTimeout(async () => {
    try {
      const canvas = await html2canvas(newWindow.document.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${config.invoiceNumber}.pdf`);

      // Close the new window after download
      newWindow.close();
    } catch (error) {
      console.error('Error generating invoice:', error);
      newWindow.close();
      alert('Failed to generate invoice. Please try again.');
    }
  }, 1000);
}