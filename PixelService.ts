
import { Order, PixelSettings } from './types';

/**
 * PixelService - Universal Event Tracking Pipeline
 * Supports Facebook Browser Pixel & Conversions API (CAPI)
 */

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

interface EventStats {
  sent: number;
  failed: number;
  lastStatus: 'Success' | 'Failed' | null;
}

let eventStats: EventStats = { sent: 0, failed: 0, lastStatus: null };

export const PixelService = {
  /**
   * Initializes the Browser Pixel script dynamically
   */
  initializeBrowserPixel(pixelId: string) {
    if (!pixelId || typeof window === 'undefined') return;
    
    // Check if already initialized
    if (window.fbq) return;

    (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return; n = f.fbq = function() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', pixelId);
    window.fbq('track', 'PageView');
    console.log(`[PixelService] Browser Pixel Initialized: ${pixelId}`);
  },

  /**
   * Universal Track Event Pipeline
   * Sends events to both Browser Pixel and Conversions API
   */
  async trackEvent(eventName: string, data: any, settings: PixelSettings) {
    if (settings.status !== 'Active' || !settings.pixelId) return;

    // 1. Browser Pixel Tracking (Async)
    if (window.fbq) {
      try {
        window.fbq('track', eventName, data);
      } catch (e) {
        console.warn('[PixelService] Browser track failed:', e);
      }
    }

    // 2. Conversions API Tracking (Background with retry)
    if (settings.accessToken) {
      this.sendToCAPI(eventName, data, settings);
    }
  },

  /**
   * Sends event to Facebook Conversions API with retry logic and timeout protection
   */
  async sendToCAPI(eventName: string, data: any, settings: PixelSettings, attempt = 1) {
    const MAX_ATTEMPTS = 3;
    const TIMEOUT = 8000;

    const payload = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        user_data: data.user_data || {},
        custom_data: {
          currency: settings.currency || 'BDT',
          value: data.value || 0,
          content_ids: data.content_ids || [],
          content_type: data.content_type || 'product'
        },
        test_event_code: settings.testEventCode || undefined
      }]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${settings.pixelId}/events?access_token=${settings.accessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CAPI Error ${response.status}`);
      }

      eventStats.sent++;
      eventStats.lastStatus = 'Success';
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn(`[PixelService] CAPI attempt ${attempt} failed:`, e);
      
      if (attempt < MAX_ATTEMPTS) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        setTimeout(() => this.sendToCAPI(eventName, data, settings, attempt + 1), delay);
      } else {
        eventStats.failed++;
        eventStats.lastStatus = 'Failed';
      }
    }
  },

  /**
   * Specific track for Purchase
   */
  async trackPurchase(order: Order, settings: PixelSettings) {
    const data = {
      value: order.totalPrice,
      content_ids: order.items.map(it => it.product.id),
      content_type: 'product',
      user_data: {
        em: [this.hashData(order.customerEmail)],
        ph: [this.hashData(order.customerPhone)],
        fn: [this.hashData(order.customerName.split(' ')[0])],
        ln: [this.hashData(order.customerName.split(' ').slice(1).join(' '))]
      }
    };
    await this.trackEvent('Purchase', data, settings);
  },

  /**
   * Simple SHA-256 placeholder (In production, use a proper library like crypto-js or window.crypto)
   * Facebook requires user data to be SHA-256 hashed.
   */
  hashData(data: string) {
    if (!data) return '';
    // This is a placeholder. For actual hashing in a browser environment, 
    // you would use await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    return data.trim().toLowerCase(); 
  },

  getStats() {
    return { ...eventStats };
  }
};
