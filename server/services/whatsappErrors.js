// Maps WhatsApp Cloud API error codes to short, human-friendly explanations
// so the UI can tell apart platform limits (not your fault) from real problems.
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes

const FRIENDLY = {
  131049: 'Blocked by WhatsApp’s marketing limit for this recipient (healthy-ecosystem cap). Try a utility template or message within the 24-hour window.',
  130472: 'Recipient is in a WhatsApp experiment group and didn’t receive this marketing message. Not an error on your side.',
  131047: 'Outside the 24-hour customer service window — you must use an approved template to reach this contact.',
  131026: 'Message undeliverable — the recipient may not have WhatsApp, has blocked the business, or can’t receive this message type.',
  131042: 'Billing/eligibility issue — check the payment method and currency on your WhatsApp Business account.',
  131051: 'Unsupported message type.',
  131045: 'Phone number not registered/certificate issue — re-check number setup in WhatsApp Manager.',
  132000: 'Template parameter count mismatch — the values sent don’t match the template’s placeholders.',
  132001: 'Template not found for this name/language — it must exist and be approved in Meta.',
  132005: 'Template content was paused or disabled due to low quality.',
  132007: 'Template format/policy violation.',
  133010: 'Phone number not registered on the WhatsApp Business platform.',
  368:    'Temporarily blocked for policy violations.',
  131031: 'Account has been restricted or locked by Meta.',
};

// Build the message we store on a failed message row.
const describeFailure = (errorObj) => {
  if (!errorObj) return 'Message failed';
  const code = errorObj.code;
  const friendly = FRIENDLY[code];
  if (friendly) return friendly;
  // Prefer Meta's own actionable message (error_user_msg) — it explains template/validation
  // errors far better than the generic "Invalid parameter".
  return errorObj.error_user_msg
    || errorObj.error_data?.details
    || errorObj.error_user_title
    || errorObj.title
    || errorObj.message
    || `Failed (code ${code ?? 'unknown'})`;
};

module.exports = { describeFailure, FRIENDLY };
