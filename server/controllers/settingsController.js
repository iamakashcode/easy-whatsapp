const fs = require('fs');
const path = require('path');
const prisma = require('../prisma/client');
const {
  getBusinessProfile,
  updateBusinessProfile,
  getAppId,
  uploadResumable,
  verifyCredentials,
} = require('../services/whatsappService');

const requireSetting = async (userId) => {
  const setting = await prisma.setting.findUnique({ where: { userId } });
  if (!setting?.phoneNumberId || !setting?.accessToken) {
    throw Object.assign(new Error('Configure your WhatsApp credentials first'), { status: 400 });
  }
  return setting;
};

exports.get = async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!setting) return res.json(null);
    const { accessToken: _, ...safe } = setting;
    res.json({
      ...safe,
      // Decimal serialises as a string otherwise — hand the client a clean number.
      monthlyBudget: setting.monthlyBudget != null ? Number(setting.monthlyBudget) : null,
      accessToken: setting.accessToken ? '••••••••' : '',
    });
  } catch (err) {
    next(err);
  }
};

// WhatsApp Business profile (what customers see) — read
exports.getProfile = async (req, res, next) => {
  try {
    const setting = await requireSetting(req.userId);
    const profile = await getBusinessProfile(setting.phoneNumberId, setting.accessToken);
    res.json({ ...profile, profilePictureUrl: setting.profilePictureUrl || null });
  } catch (err) {
    next(err);
  }
};

// WhatsApp Business profile — update editable text fields
exports.updateProfile = async (req, res, next) => {
  try {
    const { phoneNumberId, accessToken } = await requireSetting(req.userId);
    const { about, address, description, email, vertical, websites } = req.body;

    const fields = {};
    if (about       !== undefined) fields.about = about;
    if (address     !== undefined) fields.address = address;
    if (description  !== undefined) fields.description = description;
    if (email       !== undefined) fields.email = email;
    if (vertical    !== undefined) fields.vertical = vertical;
    if (websites    !== undefined) {
      // Meta accepts up to 2 websites; drop empties
      fields.websites = (Array.isArray(websites) ? websites : [])
        .map((w) => (w || '').trim())
        .filter(Boolean)
        .slice(0, 2);
    }

    await updateBusinessProfile(phoneNumberId, accessToken, fields);
    const profile = await getBusinessProfile(phoneNumberId, accessToken);
    res.json(profile);
  } catch (err) {
    next(err);
  }
};

// Upload a new WhatsApp Business profile photo. The image is also kept on disk under
// server/uploads/profile (swap this for CDN storage later) for our own record.
exports.uploadProfilePicture = async (req, res, next) => {
  try {
    console.log('[profile-photo] upload start — file:', req.file
      ? `${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`
      : 'NONE');
    if (!req.file) return res.status(400).json({ error: 'Image file required' });
    const { phoneNumberId, accessToken } = await requireSetting(req.userId);

    // Persist a local copy
    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const dir = path.join(__dirname, '..', 'uploads', 'profile');
    fs.mkdirSync(dir, { recursive: true });
    const filename = `${req.userId}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), req.file.buffer);
    console.log('[profile-photo] saved locally:', filename);

    // Upload to Meta (resumable upload → handle) and set it as the profile photo
    const appId = await getAppId(accessToken);
    const handle = await uploadResumable(appId, accessToken, req.file.buffer, req.file.mimetype);
    console.log('[profile-photo] got Meta handle, setting profile picture…');
    await updateBusinessProfile(phoneNumberId, accessToken, { profile_picture_handle: handle });
    console.log('[profile-photo] profile picture updated ✓');

    // Persist the local path on the setting so the app keeps its own reference
    const localUrl = `/uploads/profile/${filename}`;
    await prisma.setting.update({ where: { userId: req.userId }, data: { profilePictureUrl: localUrl } });

    const profile = await getBusinessProfile(phoneNumberId, accessToken);
    res.json({ ...profile, profilePictureUrl: localUrl });
  } catch (err) {
    next(err);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const { phoneNumberId, accessToken, businessAccountId } = req.body;

    if (!phoneNumberId || !businessAccountId) {
      return res.status(400).json({ error: 'Phone Number ID and Business Account ID are required' });
    }

    const existing = await prisma.setting.findUnique({ where: { userId: req.userId } });

    // Access token required only on first-time setup
    if (!existing && !accessToken) {
      return res.status(400).json({ error: 'Access Token is required for initial setup' });
    }

    // Health check: verify the credentials actually work against Meta before saving
    const tokenToVerify = accessToken || existing?.accessToken;
    let verified;
    try {
      verified = await verifyCredentials(phoneNumberId, businessAccountId, tokenToVerify);
    } catch (e) {
      return res.status(400).json({ error: `Credentials check failed — ${e.message}` });
    }

    // Explicit branch: update keeps the existing token unless a new one is given;
    // create needs a token (already required above for first-time setup).
    let setting;
    if (existing) {
      const updateData = { phoneNumberId, businessAccountId };
      if (accessToken) updateData.accessToken = accessToken;
      setting = await prisma.setting.update({ where: { userId: req.userId }, data: updateData });
    } else {
      setting = await prisma.setting.create({
        data: { userId: req.userId, phoneNumberId, accessToken, businessAccountId },
      });
    }

    const { accessToken: __, ...safe } = setting;
    res.json({ ...safe, accessToken: '••••••••', verified });
  } catch (err) {
    next(err);
  }
};

// Update the customer's own monthly spend budget (used for the cost alert). Rates are platform-wide
// and admin-controlled — see platformController. Kept separate from `upsert` so the budget can be
// changed without re-verifying Meta credentials.
exports.updateBudget = async (req, res, next) => {
  try {
    const { monthlyBudget } = req.body;

    let value = null;
    if (monthlyBudget !== undefined && monthlyBudget !== null && monthlyBudget !== '') {
      value = Number(monthlyBudget);
      if (!Number.isFinite(value) || value < 0) {
        return res.status(400).json({ error: 'Invalid monthly budget' });
      }
    }

    const existing = await prisma.setting.findUnique({ where: { userId: req.userId } });
    if (!existing) {
      return res.status(400).json({ error: 'Configure your WhatsApp credentials before setting a budget' });
    }

    const setting = await prisma.setting.update({
      where: { userId: req.userId },
      data: { monthlyBudget: value },
    });
    const { accessToken: _, ...safe } = setting;
    res.json({
      ...safe,
      monthlyBudget: setting.monthlyBudget != null ? Number(setting.monthlyBudget) : null,
      accessToken: '••••••••',
    });
  } catch (err) {
    next(err);
  }
};
