const axios = require('axios');
const { describeFailure } = require('./whatsappErrors');

const BASE = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v18.0'}`;

// Turn an axios/Graph error into a clean Error carrying a friendly reason + status,
// so the API responds with something diagnosable instead of "Request failed with status code 404".
const wrapGraphError = (err) => {
  const meta = err.response?.data?.error;
  if (meta) {
    const e = new Error(describeFailure(meta));
    e.status = err.response.status || 502;
    e.waCode = meta.code;
    return e;
  }
  return err;
};

const sendTextMessage = async (phoneNumberId, accessToken, to, text) => {
  try {
    return await axios.post(
      `${BASE}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    throw wrapGraphError(err);
  }
};

const sendTemplateMessage = async (phoneNumberId, accessToken, to, templateName, languageCode = 'en_US', components = []) => {
  try {
    return await axios.post(
      `${BASE}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    throw wrapGraphError(err);
  }
};

const sendMediaMessage = async (phoneNumberId, accessToken, to, type, link, caption = '') => {
  return axios.post(
    `${BASE}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type,
      [type]: { link, caption },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

const markMessageRead = async (phoneNumberId, accessToken, messageId) => {
  return axios.post(
    `${BASE}/${phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

// Fetch the templates registered in the Meta Business account (source of truth for name/language/status).
const fetchTemplates = async (businessAccountId, accessToken) => {
  try {
    const { data } = await axios.get(
      `${BASE}/${businessAccountId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { limit: 100 },
      }
    );
    return data.data || [];
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Meta returns 132001 when the requested name/language pair isn't an approved translation.
const isLanguageMismatch = (err) =>
  err?.status === 404 || /132001|does not exist in the translation/i.test(err?.message || '');

// Create (submit) a message template for approval.
const createTemplate = async (wabaId, accessToken, { name, language, category, components }) => {
  try {
    const { data } = await axios.post(
      `${BASE}/${wabaId}/message_templates`,
      { name, language, category, components },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return data; // { id, status, category }
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Edit an existing template (used to resubmit a rejected one). Name/language can't change.
const editTemplate = async (metaTemplateId, accessToken, { category, components }) => {
  try {
    const { data } = await axios.post(
      `${BASE}/${metaTemplateId}`,
      { category, components },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return data;
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Delete a template from Meta by name (removes all its language versions).
const deleteTemplate = async (wabaId, accessToken, name) => {
  try {
    const { data } = await axios.delete(`${BASE}/${wabaId}/message_templates`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { name },
    });
    return data;
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Validate that the phone number id + WABA id + token actually work, for the Settings health check.
const verifyCredentials = async (phoneNumberId, wabaId, accessToken) => {
  try {
    const [phone, waba] = await Promise.all([
      axios.get(`${BASE}/${phoneNumberId}`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { fields: 'display_phone_number,verified_name' } }),
      axios.get(`${BASE}/${wabaId}`, { headers: { Authorization: `Bearer ${accessToken}` }, params: { fields: 'name' } }),
    ]);
    return {
      displayPhoneNumber: phone.data?.display_phone_number,
      verifiedName: phone.data?.verified_name,
      wabaName: waba.data?.name,
    };
  } catch (err) {
    throw wrapGraphError(err);
  }
};

const PROFILE_FIELDS = 'about,address,description,email,profile_picture_url,websites,vertical';

// Read the WhatsApp Business profile shown to customers for this phone number.
const getBusinessProfile = async (phoneNumberId, accessToken) => {
  try {
    const { data } = await axios.get(
      `${BASE}/${phoneNumberId}/whatsapp_business_profile`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: PROFILE_FIELDS },
      }
    );
    return data?.data?.[0] || {};
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Update the WhatsApp Business profile. `fields` may include about, address, description,
// email, websites (array, max 2), vertical. messaging_product is required by Meta.
const updateBusinessProfile = async (phoneNumberId, accessToken, fields) => {
  try {
    const { data } = await axios.post(
      `${BASE}/${phoneNumberId}/whatsapp_business_profile`,
      { messaging_product: 'whatsapp', ...fields },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return data;
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Derive the Meta App ID from the access token (needed for the resumable upload API).
// Cached after the first lookup; tokens are stable for a deployment.
let cachedAppId = null;
const getAppId = async (accessToken) => {
  if (cachedAppId) return cachedAppId;
  try {
    const { data } = await axios.get(`${BASE}/debug_token`, {
      params: { input_token: accessToken, access_token: accessToken },
    });
    cachedAppId = data?.data?.app_id;
    if (!cachedAppId) throw new Error('Could not determine Meta App ID from the access token');
    return cachedAppId;
  } catch (err) {
    throw wrapGraphError(err);
  }
};

// Upload an image via Meta's Resumable Upload API and return its file handle,
// which is what the WhatsApp Business profile picture accepts.
const uploadResumable = async (appId, accessToken, buffer, mimeType) => {
  try {
    const session = await axios.post(`${BASE}/${appId}/uploads`, null, {
      params: { file_length: buffer.length, file_type: mimeType, access_token: accessToken },
    });
    const uploaded = await axios.post(`${BASE}/${session.data.id}`, buffer, {
      headers: {
        Authorization: `OAuth ${accessToken}`,
        file_offset: 0,
        'Content-Type': 'application/octet-stream',
      },
    });
    if (!uploaded.data?.h) throw new Error('Upload did not return a file handle');
    return uploaded.data.h;
  } catch (err) {
    throw wrapGraphError(err);
  }
};

module.exports = {
  sendTextMessage, sendTemplateMessage, sendMediaMessage, markMessageRead,
  fetchTemplates, isLanguageMismatch, getBusinessProfile, updateBusinessProfile,
  getAppId, uploadResumable,
  createTemplate, editTemplate, deleteTemplate, verifyCredentials,
};
