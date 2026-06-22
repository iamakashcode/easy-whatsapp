# Client Onboarding Guide — WhatsApp Manager

This is the step-by-step process the team follows to onboard a **new client** onto our WhatsApp platform.
It covers **everything in Meta** and **everything in our dashboard**. Do the steps in order and tick each box.

## Our billing model (read first)

- We charge each client a **fixed monthly fee** (set per client in the dashboard).
- **Meta charges the client directly** — we add the **client's own card** in Meta, so message costs land on
  their card, not ours. We carry **no message-cost risk**.
- "Usage billing" in the dashboard is **OFF**, so clients never see per-message rupee charges.
- A client who doesn't pay their monthly invoice gets **paused** (or we suspend them) until they pay.

---

# PART A — One-time agency setup (do ONCE, not per client)

> Skip this section if our Meta App, server, and admin account are already set up. It's here so the
> whole team understands the foundation. **Verify these exist before onboarding your first client.**

### A1. Meta App (one app for all clients)
- [ ] Go to **https://developers.facebook.com** → **My Apps** → confirm our Business app exists
      (type "Business", with the **WhatsApp** product added). If not, create it: *Create App → Business →
      add **WhatsApp** product*.
- [ ] **App Dashboard → Settings → Basic** → copy the **App Secret**. It must match `META_APP_SECRET`
      in `server/.env`.

### A2. Webhook (one webhook for all clients)
- [ ] **App Dashboard → WhatsApp → Configuration → Webhook**:
  - **Callback URL:** `https://<our-domain>/api/webhook`
  - **Verify token:** the value of `WEBHOOK_VERIFY_TOKEN` in `server/.env`
  - Click **Verify and Save**.
- [ ] Under **Webhook fields**, subscribe to **`messages`** (this delivers incoming messages + delivery/read
      status + pricing).

### A3. Server `.env` (one-time)
Confirm these are set in `server/.env`:
- [ ] `DATABASE_URL` (Neon)
- [ ] `JWT_SECRET`
- [ ] `WEBHOOK_VERIFY_TOKEN` (same value used in A2)
- [ ] `META_APP_SECRET` (same value from A1)
- [ ] `CLIENT_URL` (the dashboard URL)
- [ ] `ADMIN_EMAIL` (the email that becomes the platform admin)
- [ ] `WHATSAPP_API_VERSION` (e.g. `v18.0`)

### A4. System User (for permanent access tokens)
- [ ] **business.facebook.com → Business Settings → Users → System Users** → create a System User
      (role: **Admin**). We use it to generate **permanent** access tokens for clients (temporary tokens
      expire in 24 hours and must never be used for clients).

### A5. Admin account + platform settings (one-time, in our dashboard)
- [ ] Register the admin: open the dashboard → **Sign up** with the **`ADMIN_EMAIL`** address + a strong
      password. This account is auto-promoted to **ADMIN**.
- [ ] Log in as admin → **Admin Console → Platform Pricing** → turn **OFF** "Charge clients per message"
      → **Save**. (Clients now pay only the monthly fee.)

✅ **Foundation ready.** Everything below is repeated **per new client**.

---

# PART B — Meta setup for the NEW client

> Goal: get the client a working WhatsApp Business number, on **their** card, and collect 3 credentials:
> **Phone Number ID**, **WhatsApp Business Account ID (WABA ID)**, and a **permanent Access Token**.

### B1. Prerequisites from the client
- [ ] A **phone number** for WhatsApp that is **NOT currently active on the WhatsApp app** (personal or
      Business app). If it is, the client must **delete that WhatsApp account first**, or use a fresh number.
- [ ] The number must be able to **receive an SMS or phone call** for the verification code.
- [ ] Business details: **business name**, **website**, **category**, **logo**, **address**.
- [ ] The client's **credit/debit card** (for Meta billing) — or access for them to add it themselves.

### B2. Create / locate the client's WhatsApp Business Account (WABA)
- [ ] In **business.facebook.com → Business Settings → Accounts → WhatsApp Accounts**, create a new WABA
      for this client (or add the client's existing WABA to our business).
- [ ] Make sure the WABA is connected to **our Meta App** (from A1) so it uses our one webhook.

### B3. Add and verify the client's phone number
- [ ] Open **WhatsApp Manager** (business.facebook.com/wa/manage) → select the client's WABA →
      **Phone numbers → Add phone number**.
- [ ] Enter the **display name** (the business name customers will see), **category**, and **description**.
- [ ] Enter the phone number → choose **SMS** or **Voice call** → enter the **OTP code** to verify.

### B4. Add the CLIENT's payment method  ← critical for our model
- [ ] In **WhatsApp Manager → Billing / Payment settings** for this WABA, add the **client's card**.
- [ ] Confirm the card is **active** for this WABA. (This is what makes Meta bill the client directly.)

### B5. Generate a PERMANENT access token
- [ ] **Business Settings → Users → System Users** → select our System User (from A4) → **Add Assets** →
      assign **this client's WABA** with **full control**.
- [ ] Click **Generate New Token** → select our **App** → tick these permissions:
  - `whatsapp_business_messaging`
  - `whatsapp_business_management`
- [ ] **Copy the token now and save it** (you can't see it again). This is the **Access Token** for the
      dashboard. It does **not** expire.

### B6. Copy the IDs
- [ ] In **WhatsApp Manager → API Setup** (or the number's settings) copy:
  - **Phone Number ID**
  - **WhatsApp Business Account ID (WABA ID)**

### B7. Make sure webhooks reach us for this client
- [ ] Confirm the WABA is **subscribed to our App** (Cloud API does this when the number is under our app;
      if needed, our dev runs `POST /{WABA-ID}/subscribed_apps`). Webhook config from **A2** is shared —
      no per-client webhook setup is required, only that the WABA belongs to our app.

### B8. (Recommended) Business verification + display name
- [ ] Submit **Business Verification** in Business Settings (raises messaging limits from 250 → 1K/10K/∞
      and is required for higher volume).
- [ ] Confirm the **display name** is **Approved** in WhatsApp Manager (Meta reviews it).

📋 **You should now have for the client:** Phone Number ID · WABA ID · permanent Access Token · card added.

---

# PART C — Dashboard setup for the NEW client (in our project)

### C1. Create the client's account
- [ ] Open the dashboard → **Sign up** and register **on the client's behalf** with **their email** + a
      password you set. (Any email other than `ADMIN_EMAIL` becomes a normal **CUSTOMER**.)
  - *Alternative:* let the client register themselves, then continue below.

### C2. Set the client's billing (as admin)
- [ ] Log in as **admin** → **Admin Console → Clients** → click the new client → **Manage**.
- [ ] Set **Monthly fee** = the price you charge them per month.
- [ ] Leave **Credit limit** **blank** (we don't cap usage in the fixed-fee model).
- [ ] **Save**.

### C3. Enter the WhatsApp credentials (as admin, via impersonation)
- [ ] Still in the client's **Manage** panel → click **Login as client** (impersonation banner appears).
- [ ] Go to **Settings → WhatsApp Cloud API** and enter:
  - **Phone Number ID** (from B6)
  - **Access Token** (from B5)
  - **Business Account ID** (WABA ID, from B6)
- [ ] **Save** — the dashboard verifies the credentials against Meta and shows the verified name/number.
      If it errors, re-check the token permissions (B5) and IDs (B6).

### C4. Set up the business profile (optional but recommended)
- [ ] Still impersonating → **Settings → Business Profile** → upload **profile photo**, set **about**,
      **address**, **email**, **website**, **category** → **Save**.

### C5. Create and submit message templates
- [ ] Go to **Templates → New Template**. Create the templates the client needs (welcome, order update,
      reminder, etc.). Pick the right **category** (Marketing / Utility / Authentication).
- [ ] **Submit to Meta** for approval. Status updates automatically (synced every ~5 min):
      `PENDING → APPROVED` (or `REJECTED` with a reason). Approval can take minutes to 24 hours.
- [ ] Only **APPROVED** templates can be used in **Broadcasts**.

### C6. Test end-to-end (still impersonating)
- [ ] **Send Message** → pick a contact (add your own number as a test contact) → send a **template** →
      confirm it arrives on WhatsApp and shows **sent → delivered → read**.
- [ ] Reply from your phone → confirm the message appears in **Inbox** (this proves the **webhook** works).
- [ ] Exit impersonation (**Exit** in the banner).

### C7. Hand over to the client
- [ ] Give the client their **login email + password** and the dashboard URL.
- [ ] Tell them: they're on a **fixed monthly plan** (state the amount), invoices appear under **Billing**,
      and **WhatsApp/Meta bills their card directly** for messages.
- [ ] Recommend they change their password after first login (if a self-serve reset isn't available, the
      team manages password changes).

---

# PART D — Final verification checklist

- [ ] Meta: phone number **Connected**, display name **Approved**, **client's card** active.
- [ ] Dashboard: client shows **Active** in Admin → Clients, with the correct **Monthly fee**.
- [ ] Settings credentials **verified** (no error on save).
- [ ] At least one template **APPROVED**.
- [ ] Test **outbound** message delivered.
- [ ] Test **inbound** reply received in Inbox (webhook OK).
- [ ] Client has working login.

---

# PART E — Ongoing / monthly

- **Invoices** are generated automatically at the **start of each calendar month** for the prior month
  (the client's fixed monthly fee).
- When the client pays, mark it: **Admin Console → Billing → Mark paid** (or in the client's panel).
- **Non-payment:** an unpaid invoice past its due date **auto-pauses** sending. You can also manually
  **Suspend** a client in Admin → Clients.
- **Reactivate** any time with **Activate** once they've paid.

---

# PART F — Troubleshooting

| Problem | Likely cause / fix |
|---|---|
| "Credentials check failed" on Settings save | Wrong Phone Number ID / WABA ID, or token missing `whatsapp_business_messaging` / `whatsapp_business_management`. Re-do B5/B6. |
| Outbound message fails | Number not verified, display name not approved, or the client's **card not added** (B4). Also check the template is **APPROVED**. |
| Inbound replies / status not showing | WABA not subscribed to **our app**, or webhook not configured (A2/B7). Confirm the `messages` field is subscribed. |
| Template stuck PENDING | Meta review; wait (up to 24h). Status syncs automatically. |
| Low send limits | Complete **Business Verification** (B8) to raise the messaging limit. |
| Client says they were "logged out" / can't log in | Tokens last 7 days; just log in again. (Login rate limit only triggers after many *failed* attempts.) |

---

### Quick reference — what to collect from Meta per client
1. **Phone Number ID**
2. **WhatsApp Business Account ID (WABA ID)**
3. **Permanent Access Token** (System User, with messaging + management permissions)
4. **Client's card added** to the WABA in WhatsApp Manager → Billing

### Quick reference — where it goes in the dashboard
- Items 1–3 → **Settings → WhatsApp Cloud API** (done by admin via "Login as client")
- **Monthly fee** → **Admin → Clients → Manage**
