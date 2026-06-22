// Public brand/contact info — edit these values to update the marketing site (Home / About / Contact)
// and the footer. This product is a sub-brand of Desire Div.
export const BRAND = {
  name: 'Easy Whatsapp',                 // ← your sub-brand name (change as you like)
  parent: 'Desire Div',                   // parent / mother brand
  tagline: 'WhatsApp messaging for your business — fully managed.',
  description:
    'Send WhatsApp broadcasts, templates and campaigns to your customers, with delivery tracking and simple monthly billing. We set everything up and run it for you.',

  // Contact details shown on the Contact page + footer — UPDATE THESE.
  email: 'hello@desirediv.com',
  phone: '+91 9871228880',               // ← put your real phone here
  whatsapp: '+91 9871228880',            // ← WhatsApp number (can be the same)
  address: '',                            // optional, e.g. 'New Delhi, India'
  hours: 'Mon–Sat, 10:00 AM – 7:00 PM IST',
};

// Helpers for links
export const telHref = (n) => `tel:${(n || '').replace(/[^\d+]/g, '')}`;
export const waHref = (n) => `https://wa.me/${(n || '').replace(/[^\d]/g, '')}`;
export const mailHref = (e) => `mailto:${e}`;
