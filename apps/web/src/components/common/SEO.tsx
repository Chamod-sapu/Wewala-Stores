import { useEffect } from 'react';
import { STORE_CONFIG } from '@wewala/shared';

interface SEOProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  canonicalUrl?: string;
}

export function SEO({
  title,
  description = 'Shop fresh organic groceries, heirloom spices, pure Ceylon tea, and daily pantry staples delivered fast across Sri Lanka.',
  ogImage = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=1200',
  ogType = 'website',
  canonicalUrl,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    const fullTitle = title
      ? `${title} | ${STORE_CONFIG.name}`
      : `${STORE_CONFIG.name} | Fresh Produce, Spices & Ceylon Tea`;
    document.title = fullTitle;

    // Helper to set or update meta tag
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'author', STORE_CONFIG.name);

    // 3. Open Graph Tags
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', STORE_CONFIG.name);
    if (canonicalUrl) {
      setMetaTag('property', 'og:url', canonicalUrl);
    }

    // 4. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);
  }, [title, description, ogImage, ogType, canonicalUrl]);

  return null;
}

