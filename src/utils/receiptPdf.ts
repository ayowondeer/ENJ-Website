import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { CartItem, OrderItem } from '../firebase';
import { formatNaira } from '../components/ShopView';

/**
 * Generates an official QR code data URL for receipt verification.
 */
export async function generateReceiptQrCode(order: OrderItem): Promise<string> {
  const verificationPayload = `https://wa.me/2348133535756?text=${encodeURIComponent(
    `[VERIFY RECEIPT] Order: ${order.id} | Customer: ${order.customerName} | Paid: ${formatNaira(order.totalAmount)} | Ref: ${order.paystackReference || 'PAID'}`
  )}`;

  try {
    return await QRCode.toDataURL(verificationPayload, {
      margin: 1,
      width: 160,
      color: {
        dark: '#111827',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.warn('QR code generation notice:', err);
    return '';
  }
}

/**
 * Downloads a pristine vector PDF receipt with clean hierarchy,
 * small uppercase metadata labels, bold large content text, and verification QR code.
 */
export async function downloadReceiptPdf(order: OrderItem, items: CartItem[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let y = 18;

  const qrDataUrl = await generateReceiptQrCode(order);

  // 1. Header Banner & Branding (Minimalist luxury)
  doc.setFillColor(24, 24, 27); // #18181b Dark slate
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ENJ DIGITAL CONCEPT', margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(244, 123, 32); // #f47b20 Brand accent
  doc.text('DIGITAL PRINTING · BRANDING · RENEWABLE ENERGY', margin + 6, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL RECEIPT', pageWidth - margin - 6, y + 9, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 231, 183); // Emerald
  doc.text('VERIFIED · PAID', pageWidth - margin - 6, y + 15, { align: 'right' });

  y += 27;

  // 2. Company Contact / Location
  doc.setTextColor(115, 115, 125);
  doc.setFontSize(7.5);
  doc.text('Thatcher Building, University of Maiduguri, Borno State, Nigeria', margin, y);
  doc.text('WhatsApp: +234 813 353 5756  |  Email: enjdigitalconcept@gmail.com', margin, y + 4.5);
  
  y += 9;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // 3. Receipt Metadata & Customer Information Box with QR Code
  const metaBoxHeight = 44;
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, y, contentWidth, metaBoxHeight, 2, 2, 'S');

  const formattedDate = new Date(order.createdAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  // Embed QR Code inside top-right of Metadata Box
  if (qrDataUrl) {
    const qrSize = 22;
    const qrX = pageWidth - margin - qrSize - 4;
    const qrY = y + 4;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 145);
    doc.text('SCAN TO VERIFY', qrX + (qrSize / 2), qrY + qrSize + 3.5, { align: 'center' });
  }

  // Column 1: Order # and Date
  const col1X = margin + 5;
  const col2X = margin + 55;

  // Small label, LARGE text beneath
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 160);
  doc.text('ORDER / RECEIPT #', col1X, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(11);
  doc.text(order.id || 'ENJ-ORDER', col1X, y + 12);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 160);
  doc.text('DATE & TIME', col1X, y + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(9);
  doc.text(formattedDate, col1X, y + 25.5);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 160);
  doc.text('PAYMENT REFERENCE', col1X, y + 33);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  doc.text(order.paystackReference || 'CONFIRMED', col1X, y + 38);

  // Column 2: Customer and Delivery Destination
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 160);
  doc.text('BILLED TO CUSTOMER', col2X, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(10.5);
  doc.text(order.customerName, col2X, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);
  doc.setFontSize(8);
  doc.text(`${order.customerPhone} · ${order.customerEmail}`, col2X, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 160);
  doc.text('DELIVERY DESTINATION', col2X, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.setFontSize(8.5);

  const addressLines = doc.splitTextToSize(order.customerAddress || 'Pickup in Maiduguri', 70);
  doc.text(addressLines, col2X, y + 29.5);

  y += metaBoxHeight + 7;

  // 4. Items Table Header
  doc.setFillColor(243, 244, 246);
  doc.rect(margin, y, contentWidth, 7, 'F');
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(75, 85, 99);
  doc.text('DESCRIPTION', margin + 4, y + 4.8);
  doc.text('QTY', margin + contentWidth - 65, y + 4.8, { align: 'center' });
  doc.text('UNIT PRICE', margin + contentWidth - 36, y + 4.8, { align: 'right' });
  doc.text('AMOUNT (NGN)', margin + contentWidth - 4, y + 4.8, { align: 'right' });

  y += 9;

  // 5. Items Rows
  const itemsToRender = items.length > 0 ? items : [];

  itemsToRender.forEach((item) => {
    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    
    const titleLines = doc.splitTextToSize(item.product.title, contentWidth - 85);
    doc.text(titleLines, margin + 4, y);
    
    // Quantity
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text(String(item.quantity), margin + contentWidth - 65, y, { align: 'center' });

    // Unit Price
    const unitPriceStr = formatNaira(item.product.price);
    doc.text(unitPriceStr, margin + contentWidth - 36, y, { align: 'right' });

    // Total Price
    const lineTotalStr = formatNaira(item.product.price * item.quantity);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(lineTotalStr, margin + contentWidth - 4, y, { align: 'right' });

    y += (titleLines.length * 4.2);

    // Selected options (Color, Size)
    const options = [
      item.selectedColor ? `Color: ${item.selectedColor}` : '',
      item.selectedSize ? `Size: ${item.selectedSize}` : ''
    ].filter(Boolean).join('  |  ');

    if (options) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(115, 115, 125);
      doc.text(options, margin + 4, y);
      y += 4;
    }

    // Light line divider
    y += 2;
    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4.5;
  });

  y += 3;

  // 6. Delivery Fee Policy Box in PDF
  doc.setFillColor(254, 243, 199); // Amber 100
  doc.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, 'F');
  doc.setDrawColor(251, 191, 36); // Amber 400
  doc.roundedRect(margin, y, contentWidth, 13, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14); // Amber 800
  doc.text('DELIVERY FEE POLICY (PAY ON DELIVERY):', margin + 4, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('The courier delivery fee is NOT included in this total. Delivery fee is payable upon delivery', margin + 4, y + 8.5);
  doc.text('after your goods have been safely received and inspected at your address.', margin + 4, y + 11.5);

  y += 18;

  // 7. Totals Summary
  const totalsBoxX = margin + contentWidth - 90;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 105);
  doc.text('Products Subtotal:', totalsBoxX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(formatNaira(order.totalAmount), margin + contentWidth - 4, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 83, 9);
  doc.text('Delivery Fee:', totalsBoxX, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Pay on Delivery', margin + contentWidth - 4, y, { align: 'right' });

  y += 5.5;
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.4);
  doc.line(totalsBoxX, y, margin + contentWidth, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text('Total Paid Now:', totalsBoxX, y);
  doc.setTextColor(5, 150, 105); // Emerald 600
  doc.text(formatNaira(order.totalAmount), margin + contentWidth - 4, y, { align: 'right' });

  y += 18;

  // 8. Footer Note
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('Thank you for choosing ENJ Digital Concept! For inquiries: +234 813 353 5756', pageWidth / 2, y, { align: 'center' });
  doc.text('Official verified digital receipt · Valid without physical signature', pageWidth / 2, y + 4, { align: 'center' });

  // Save the PDF file directly to user device
  doc.save(`Receipt-${order.id || 'ENJ'}.pdf`);
}

/**
 * Robust print helper with DM Sans and Space Grotesk fonts, proper text hierarchy, and QR code verification.
 */
export async function printReceiptDocument(order: OrderItem, items: CartItem[]) {
  const formattedDate = new Date(order.createdAt).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const qrDataUrl = await generateReceiptQrCode(order);

  const receiptHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${order.id} - ENJ Digital Concept</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Space+Grotesk:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      max-width: 680px;
      margin: 0 auto;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111827;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .brand-title {
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 2px 0;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 10px;
      color: #f47b20;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 6px 0;
    }
    .brand-contact {
      font-size: 10.5px;
      color: #6b7280;
      margin: 0;
      line-height: 1.4;
    }
    .receipt-badge {
      text-align: right;
    }
    .receipt-badge .title {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 4px 0;
    }
    .receipt-badge .status {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      font-weight: 700;
      font-size: 10.5px;
      padding: 3px 10px;
      border-radius: 9999px;
      border: 1px solid #a7f3d0;
    }
    .meta-box {
      background: #f9fafb;
      border: 1px solid #f3f4f6;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 24px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 20px;
      flex: 1;
    }
    .meta-item .label {
      color: #9ca3af;
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .meta-item .value {
      font-size: 14px;
      font-weight: 700;
      color: #111827;
      line-height: 1.25;
    }
    .meta-item .subtext {
      font-size: 11px;
      font-weight: 400;
      color: #6b7280;
      margin-top: 2px;
    }
    .qr-container {
      text-align: center;
      padding-left: 12px;
      border-left: 1px solid #e5e7eb;
      min-width: 90px;
    }
    .qr-container img {
      width: 76px;
      height: 76px;
      display: block;
      margin: 0 auto 4px auto;
    }
    .qr-container span {
      font-size: 8px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 12px;
    }
    th {
      background: #f3f4f6;
      color: #4b5563;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
      padding: 9px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    .item-title {
      font-weight: 600;
      font-size: 12.5px;
      color: #111827;
      margin: 0 0 2px 0;
    }
    .item-options {
      color: #6b7280;
      font-size: 10.5px;
      margin: 0;
    }
    .notice {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 20px;
      font-size: 11px;
      color: #92400e;
      line-height: 1.4;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totals-table {
      width: 260px;
      font-size: 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      color: #4b5563;
    }
    .totals-row.grand {
      border-top: 2px solid #111827;
      margin-top: 6px;
      padding-top: 8px;
      font-weight: 800;
      font-size: 16px;
      color: #059669;
    }
    .footer {
      text-align: center;
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      font-size: 10px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div>
        <h1 class="brand-title">ENJ DIGITAL CONCEPT</h1>
        <p class="brand-subtitle">Digital Printing · Branding · Renewable Energy</p>
        <p class="brand-contact">
          Thatcher Building, University of Maiduguri, Borno State<br/>
          WhatsApp: +234 813 353 5756 | enjdigitalconcept@gmail.com
        </p>
      </div>
      <div class="receipt-badge">
        <div class="title">RECEIPT</div>
        <div class="status">PAID ONLINE</div>
      </div>
    </div>

    <div class="meta-box">
      <div class="meta-grid">
        <div class="meta-item">
          <div class="label">Receipt / Order #</div>
          <div class="value">${order.id}</div>
        </div>
        <div class="meta-item">
          <div class="label">Date & Time</div>
          <div class="value">${formattedDate}</div>
        </div>
        <div class="meta-item">
          <div class="label">Billed to Customer</div>
          <div class="value">${order.customerName}</div>
          <div class="subtext">${order.customerPhone} · ${order.customerEmail}</div>
        </div>
        <div class="meta-item">
          <div class="label">Delivery Location</div>
          <div class="value" style="font-size: 12.5px;">${order.customerAddress}</div>
        </div>
        <div class="meta-item" style="grid-column: span 2;">
          <div class="label">Payment Reference</div>
          <div class="value" style="font-family: monospace; font-size: 12px; font-weight: 600;">${order.paystackReference || 'CONFIRMED'}</div>
        </div>
      </div>

      ${qrDataUrl ? `
        <div class="qr-container">
          <img src="${qrDataUrl}" alt="Verification QR Code" />
          <span>Scan to Verify</span>
        </div>
      ` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 110px;">Unit Price</th>
          <th style="text-align: right; width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
          <tr>
            <td>
              <div class="item-title">${item.product.title}</div>
              ${(item.selectedColor || item.selectedSize) ? `
                <div class="item-options">
                  ${[item.selectedColor ? `Color: ${item.selectedColor}` : '', item.selectedSize ? `Size: ${item.selectedSize}` : ''].filter(Boolean).join(' · ')}
                </div>
              ` : ''}
            </td>
            <td style="text-align: center; font-weight: 600;">${item.quantity}</td>
            <td style="text-align: right;">${formatNaira(item.product.price)}</td>
            <td style="text-align: right; font-weight: 700;">${formatNaira(item.product.price * item.quantity)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="notice">
      <strong>🚚 Delivery Fee Policy:</strong><br/>
      Delivery fee is <u>payable upon delivery after your goods have been received</u> and verified at your specified address.
    </div>

    <div class="totals-area">
      <div class="totals-table">
        <div class="totals-row">
          <span>Products Subtotal:</span>
          <span>${formatNaira(order.totalAmount)}</span>
        </div>
        <div class="totals-row">
          <span>Delivery Fee:</span>
          <span style="color:#b45309;font-weight:600;">Pay on Delivery</span>
        </div>
        <div class="totals-row grand">
          <span>Total Paid Now:</span>
          <span>${formatNaira(order.totalAmount)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      Thank you for your business! Electronic confirmation issued by ENJ Digital Concept.
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(receiptHtml);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Frame print notice:', e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 400);
    }
  } catch (err) {
    console.warn('Print iframe execution notice:', err);
    window.print();
  }
}
