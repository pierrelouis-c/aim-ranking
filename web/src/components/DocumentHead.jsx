import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  ROUTE_SEO,
} from '../seo.js';

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export default function DocumentHead() {
  const { pathname } = useLocation();
  const seo = ROUTE_SEO[pathname] || ROUTE_SEO['/'];
  const url = `${SITE_URL}${seo.path}`;
  const title = seo.title;
  const description = seo.description || DEFAULT_DESCRIPTION;
  const image = `${SITE_URL}/og-image.png`;
  const robots = seo.noindex ? 'noindex, nofollow' : 'index, follow';

  useEffect(() => {
    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', robots);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertLink('canonical', url);
  }, [title, description, url, image, robots]);

  return null;
}
