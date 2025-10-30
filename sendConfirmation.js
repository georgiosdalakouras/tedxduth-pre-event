exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { name = 'Δεν δόθηκε', email = 'Δεν δόθηκε', phone = 'Δεν δόθηκε', newsletter = 'no', consent = 'no' } = body;

    const qrPayload = `Name: ${name} | Email: ${email} | Phone: ${phone}`;
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrPayload);

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@tedxduth.gr';
    const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL || 'g.dalakouras@tedxduth.gr';

    if (!SENDGRID_API_KEY) {
      return { statusCode: 500, body: 'SendGrid API key not configured.' };
    }

    const sgUrl = 'https://api.sendgrid.com/v3/mail/send';

    const participantHtml = `
      <div style="font-family:Arial,sans-serif;color:#0a0e33;">
        <img src="https://placehold.co/160x40?text=TEDxDUTH" alt="TEDxDUTH" style="max-width:160px" />
        <h2>Επιβεβαίωση συμμετοχής — TEDxDUTH Pre-Event</h2>
        <p>Γεια σου ${name},</p>
        <p>Ευχαριστούμε που εγγράφηκες για το TEDxDUTH Pre-Event – AXD 08/11/2025.</p>
        <h3>Στοιχεία συμμετοχής</h3>
        <ul>
          <li><strong>Ονοματεπώνυμο:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Κινητό:</strong> ${phone}</li>
          <li><strong>Newsletter:</strong> ${newsletter === 'yes' ? 'Ναι' : 'Όχι'}</li>
        </ul>
        <p>Παρουσίασε αυτό το QR στο event:</p>
        <img src="${qrUrl}" alt="QR Code" style="width:200px;height:200px" />
        <p>Ευχαριστούμε,<br><strong>Η ομάδα του TEDxDUTH</strong></p>
      </div>
    `;

    // 1️⃣ Στέλνουμε e-mail στον συμμετέχοντα
    await fetch(sgUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }], subject: 'Επιβεβαίωση συμμετοχής στο TEDxDUTH Pre-Event – AXD 08/11/2025' }],
        from: { email: SENDER_EMAIL, name: 'TEDxDUTH Team' },
        content: [
          { type: 'text/plain', value: 'Αν δεν εμφανίζεται HTML, δείτε την επιβεβαίωση στον browser σας.' },
          { type: 'text/html', value: participantHtml }
        ]
      })
    });

    // 2️⃣ Στέλνουμε e-mail στον διοργανωτή
    const organizerText = `Νέα εγγραφή στο TEDxDUTH Pre-Event:\n\nΌνομα: ${name}\nEmail: ${email}\nΤηλέφωνο: ${phone}\nNewsletter: ${newsletter}\nΣυναίνεση: ${consent}`;
    await fetch(sgUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: ORGANIZER_EMAIL }], subject: 'Νέα εγγραφή — TEDxDUTH Pre-Event' }],
        from: { email: SENDER_EMAIL, name: 'TEDxDUTH Team' },
        content: [{ type: 'text/plain', value: organizerText }]
      })
    });

    return { statusCode: 200, body: 'Emails sent successfully.' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: String(err) };
  }
};
