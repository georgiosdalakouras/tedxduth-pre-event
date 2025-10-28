
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const body = JSON.parse(event.body || '{}');
    const name = body.name || 'Δεν δόθηκε';
    const email = body.email || 'Δεν δόθηκε';
    const phone = body.phone || 'Δεν δόθηκε';
    const newsletter = body.newsletter || 'no';
    const consent = body.consent || 'no';

    const qrPayload = `Name: ${name} | Email: ${email} | Phone: ${phone}`;
    const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(qrPayload);

    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@tedxduth.gr';
    const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL || 'g.dalakouras@tedxduth.gr';

    if (!SENDGRID_API_KEY) {
      return { statusCode: 500, body: 'SendGrid API key not configured (SENDGRID_API_KEY).' };
    }

    const sgUrl = 'https://api.sendgrid.com/v3/mail/send';

    const participantHtml = `
      <div style="font-family:Arial,sans-serif;color:#0a0e33;">
        <img src="https://placehold.co/160x40?text=TEDxDUTH" alt="TEDxDUTH" style="max-width:160px" />
        <h2>Επιβεβαίωση συμμετοχής — TEDxDUTH Pre-Event</h2>
        <p>Γεια σου ${name},</p>
        <p>Ευχαριστούμε που εγγραφές για το TEDxDUTH Pre-Event – AXD 08/11/2025.</p>
        <h3>Στοιχεία συμμετοχής</h3>
        <ul>
          <li><strong>Ονοματεπώνυμο:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Κινητό:</strong> ${phone}</li>
          <li><strong>Newsletter:</strong> ${newsletter === 'yes' ? 'Ναι' : 'Όχι'}</li>
        </ul>
        <p>Παρουσίασε αυτό το QR στο event:</p>
        <img src="${qrUrl}" alt="QR Code" style="width:200px;height:200px" />
        <p>Ευχαριστούμε,</p>
        <p><strong>TEDxDUTH Team</strong></p>
      </div>
    `;

    const organizerText = `New registration for TEDxDUTH Pre-Event\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nNewsletter: ${newsletter}\nConsent: ${consent}`;

    const payload = {
      personalizations: [
        {
          to: [{ email: email }],
          subject: 'Επιβεβαίωση συμμετοχής στο TEDxDUTH Pre-Event – AXD 08/11/2025'
        },
        {
          to: [{ email: ORGANIZER_EMAIL }],
          subject: 'Νέα εγγραφή — TEDxDUTH Pre-Event'
        }
      ],
      from: { email: SENDER_EMAIL, name: 'TEDxDUTH Team' },
      content: [
        { type: 'text/plain', value: 'If your client does not show HTML, please view the confirmation in HTML.' },
        { type: 'text/html', value: participantHtml }
      ]
    };

    const res = await fetch(sgUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SENDGRID_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('SendGrid error', res.status, txt);
      return { statusCode: 502, body: 'Failed to send emails: ' + txt };
    }

    // Also send organizer email separately
    const orgPayload = {
      personalizations: [{ to: [{ email: ORGANIZER_EMAIL }], subject: 'Νέα εγγραφή — TEDxDUTH Pre-Event' }],
      from: { email: SENDER_EMAIL, name: 'TEDxDUTH Team' },
      content: [{ type: 'text/plain', value: organizerText }]
    };

    await fetch(sgUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + SENDGRID_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orgPayload)
    });

    return { statusCode: 200, body: 'Emails sent' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: String(err) };
  }
};
