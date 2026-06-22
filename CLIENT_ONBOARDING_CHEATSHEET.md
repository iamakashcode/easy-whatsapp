# New Client — Onboarding Cheat Sheet

One page, per client. Full details: see `CLIENT_ONBOARDING.md`.

**Client:** ______________________  **Date:** __________  **Onboarded by:** __________

---

## 1. Meta (collect 3 IDs + add card)
- [ ] Number ready (not active on WhatsApp app) + can receive OTP
- [ ] WABA created under **our** Meta App
- [ ] Add phone number → set display name → verify OTP
- [ ] **Add the CLIENT's card** (WhatsApp Manager → Billing)
- [ ] System User → assign this WABA → generate **permanent token**
      (perms: `whatsapp_business_messaging` + `whatsapp_business_management`)
- [ ] Copy **Phone Number ID** + **WABA ID**
- [ ] WABA subscribed to our app (webhook flows)
- [ ] (Recommended) Business Verification + display name **Approved**

**Collected:**
Phone Number ID: ______________________
WABA ID: ______________________
Access Token: ______________________ (saved securely)

---

## 2. Dashboard (admin)
- [ ] Register client account (their email + password) → CUSTOMER
- [ ] Admin → Clients → Manage → set **Monthly fee** = ₹______ ; **Credit limit blank**
- [ ] **Login as client** (impersonate)
- [ ] Settings → WhatsApp Cloud API → paste **Phone Number ID / Access Token / WABA ID** → Save (verifies)
- [ ] Settings → Business Profile → photo, about, address (optional)
- [ ] Templates → create → **Submit to Meta** (wait for APPROVED)

---

## 3. Test (still impersonating)
- [ ] Send a template to your own number → **delivered/read** ✓
- [ ] Reply from phone → shows in **Inbox** ✓ (webhook OK)
- [ ] Exit impersonation

---

## 4. Handover
- [ ] Give client login (email + password) + dashboard URL
- [ ] Explain: fixed monthly plan ₹______ ; Meta bills their card for messages; invoices under **Billing**

---

### ✅ Done when:
Number Connected · display name Approved · card active · credentials verified · 1 template APPROVED ·
outbound delivered · inbound received · client has login.
