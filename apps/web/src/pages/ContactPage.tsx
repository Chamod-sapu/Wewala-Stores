import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  MapPin,
  Phone,
  Mail,
  Send,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Navigation,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STORE_CONFIG } from '@wewala/shared';
import { SEO } from '@/components/common/SEO';

// Validation Schema
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  // Honeypot field - must stay empty
  hp_website_confirm: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const mountTimestampRef = useRef<number>(Date.now());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
      hp_website_confirm: '',
    },
  });

  // Track initial mount time for bot speed detection
  useEffect(() => {
    mountTimestampRef.current = Date.now();
  }, []);

  const onSubmit = async (data: ContactFormData) => {
    // 1. Spam Protection - Honeypot Check
    // If the invisible honeypot field is filled, silently ignore bot without throwing errors
    if (data.hp_website_confirm && data.hp_website_confirm.trim() !== '') {
      console.warn('Bot detected via honeypot field submission.');
      setSubmittedSuccess(true);
      reset();
      return;
    }

    // 2. Spam Protection - Submission Speed Check (Too fast for human interaction)
    const timeToSubmitMs = Date.now() - mountTimestampRef.current;
    if (timeToSubmitMs < 2500) {
      toast.error('Submission too fast. Please take your time to review your message.');
      return;
    }

    // 3. Spam Protection - Rate Limiting (1 message every 60 seconds per client)
    const lastSubmitTime = localStorage.getItem('wewala_contact_last_ts');
    if (lastSubmitTime) {
      const elapsedSeconds = (Date.now() - parseInt(lastSubmitTime, 10)) / 1000;
      if (elapsedSeconds < 60) {
        const remaining = Math.ceil(60 - elapsedSeconds);
        toast.error(`Please wait ${remaining} seconds before submitting another inquiry.`);
        return;
      }
    }

    try {
      // 4. Insert into Supabase contact_messages table
      const { error } = await supabase.from('contact_messages').insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        is_read: false,
      });

      if (error) throw error;

      // Update rate limit timestamp
      localStorage.setItem('wewala_contact_last_ts', Date.now().toString());

      setSubmittedSuccess(true);
      toast.success('Your message has been received! Our support team will respond shortly.');
      reset();
    } catch (err: any) {
      console.error('Contact submission error:', err);
      toast.error(err.message || 'Failed to deliver message. Please contact us via phone or WhatsApp.');
    }
  };

  return (
    <div className="section-container py-12 lg:py-16">
      <SEO
        title="Contact Us & Store Support"
        description="Get in touch with Wewala Stores for delivery inquiries, order support, and wholesale Ceylon tea queries."
      />

      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-12 text-center max-w-2xl mx-auto">
          <span className="badge-brand mb-2">Help & Direct Support</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            We'd Love to Hear from You
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Have questions about your order, delivery zones, bulk corporate orders, or product sourcing?
            Get in touch with the Wewala Stores customer desk.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Left Column: Store Details & Embedded Map */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 space-y-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-3 dark:border-slate-800">
                Store Information
              </h2>

              {/* Physical Address */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <MapPin size={20} />
                </div>
                <div className="text-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white">Main Shop & Distribution</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    No. 142, Temple Road, Wewala, Piliyandala 10300, Western Province, Sri Lanka
                  </p>
                </div>
              </div>

              {/* Phone Numbers */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Phone size={20} />
                </div>
                <div className="text-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white">Customer Hotlines</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Landline: <a href="tel:+94112854321" className="hover:underline">{STORE_CONFIG.contactPhone}</a>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Mobile / WhatsApp: <a href="tel:+94771234567" className="hover:underline">+94 77 123 4567</a>
                  </p>
                </div>
              </div>

              {/* Email Addresses */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Mail size={20} />
                </div>
                <div className="text-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white">Email Addresses</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Support: <a href={`mailto:${STORE_CONFIG.contactEmail}`} className="hover:underline">{STORE_CONFIG.contactEmail}</a>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Inquiries: <a href="mailto:info@wewalastores.lk" className="hover:underline">info@wewalastores.lk</a>
                  </p>
                </div>
              </div>

              {/* Opening Hours */}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <Clock size={20} />
                </div>
                <div className="text-sm">
                  <h3 className="font-bold text-slate-900 dark:text-white">Operating Hours</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Monday - Saturday: 7:30 AM – 9:00 PM
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Sunday & Holidays: 8:00 AM – 8:00 PM
                  </p>
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-1">
                    Online Order System: 24 Hours / 7 Days
                  </p>
                </div>
              </div>
            </div>

            {/* Embedded Map Placeholder */}
            <div className="card overflow-hidden shadow-sm">
              <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-slate-800">
                {/* Visual Map Representation */}
                <iframe
                  title="Wewala Stores Location Map"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15844.757827827672!2d79.9140417!3d6.801642!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae25a17a7e0fcd7%3A0x6b19a0a03d043f44!2sPiliyandala!5e0!3m2!1sen!2slk!4v1700000000000!5m2!1sen!2slk"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={false}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-full w-full grayscale-[20%] contrast-[1.05]"
                />

                {/* Map Overlay Pill */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/95 p-2.5 backdrop-blur-md shadow-md text-xs dark:bg-slate-900/95">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin size={16} className="text-brand-600 shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      Wewala, Piliyandala 10300
                    </span>
                  </div>
                  <a
                    href="https://maps.google.com/?q=6.801642,79.914041"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-brand-600 hover:text-brand-700 font-bold inline-flex items-center gap-1 dark:text-brand-400"
                  >
                    Get Directions <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="card p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Send us a Message
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Fill in the details below and our customer representatives will respond to you within 2-4 business hours.
              </p>

              {submittedSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center space-y-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Thank You for Contacting Us!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your inquiry has been stored securely in our database. One of our support staff will reach out to your provided email or phone number.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmittedSuccess(false)}
                    className="btn-secondary text-xs"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Honeypot field (hidden from real users, filled only by bots) */}
                  <div
                    style={{ display: 'none', opacity: 0, position: 'absolute', zIndex: -10 }}
                    aria-hidden="true"
                  >
                    <label htmlFor="hp_website_confirm">Leave this field blank</label>
                    <input
                      id="hp_website_confirm"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      {...register('hp_website_confirm')}
                    />
                  </div>

                  <div>
                    <label className="label mb-1">Your Full Name *</label>
                    <input
                      {...register('name')}
                      type="text"
                      placeholder="Kasun Perera"
                      className="input"
                    />
                    {errors.name && <p className="error-text mt-1">{errors.name.message}</p>}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label mb-1">Email Address *</label>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="you@example.com"
                        className="input"
                      />
                      {errors.email && <p className="error-text mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="label mb-1">Contact Phone Number</label>
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="077 123 4567"
                        className="input"
                      />
                      {errors.phone && <p className="error-text mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="label mb-1">Subject *</label>
                    <input
                      {...register('subject')}
                      type="text"
                      placeholder="e.g. Order Delivery Status or Wholesale Inquiry"
                      className="input"
                    />
                    {errors.subject && <p className="error-text mt-1">{errors.subject.message}</p>}
                  </div>

                  <div>
                    <label className="label mb-1">Message *</label>
                    <textarea
                      {...register('message')}
                      rows={5}
                      placeholder="Please describe how we can assist you..."
                      className="input resize-none"
                    />
                    {errors.message && <p className="error-text mt-1">{errors.message.message}</p>}
                  </div>

                  {/* Submission note with spam protection indicator */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                    <ShieldCheck size={14} className="text-brand-600 shrink-0" />
                    <span>Protected with automated spam filtering and rate limits.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-brand-500/10"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Sending Message...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
