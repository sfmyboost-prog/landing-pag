
import { Order, CourierSettings } from './types';

/**
 * Service to handle Courier and Integration API diagnostics.
 * Supports Pathao, SteadFast Courier, and Facebook Pixel CAPI.
 */

const STEADFAST_DEFAULT_URL = 'https://portal.steadfast.com.bd/api/v1';
const PATHAO_DEFAULT_URL = 'https://api-hermes.pathao.com/aladdin/api/v1';

// URL Verification Diagnostic
console.log(`[DIAGNOSTIC] Courier Services Initialized`);

/**
 * Normalizes phone numbers to the local 11-digit format (01XXXXXXXXX).
 */
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, ''); 
  if (cleaned.startsWith('880')) cleaned = cleaned.substring(3);
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  const final = '0' + cleaned.substring(0, 10);
  return final;
};

/**
 * Sanitizes address strings for API compatibility.
 */
const sanitizeString = (str: string, maxLength?: number): string => {
  if (!str) return '';
  const sanitized = str.replace(/[\r\n]+/g, ' ').trim();
  return maxLength ? sanitized.substring(0, maxLength) : sanitized;
};

/**
 * Improved error handling strategy:
 * 1. Logs technical details to console (including full HTML on 500s).
 * 2. Throws a human-readable error for the UI.
 */
const handleApiError = async (response: Response, context: string) => {
  const text = await response.text();
  let serverMessage = '';
  
  // Try to parse JSON message first
  try {
    const json = JSON.parse(text);
    serverMessage = json.message || json.error?.message || json.errors?.[0]?.message || '';
  } catch (e) {
    // If response is HTML (common for 500 errors), try to extract meaningful text
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const h1 = doc.querySelector('h1')?.textContent;
    const body = doc.body?.textContent?.substring(0, 500).trim();
    
    if (h1 && h1.length < 100) {
      serverMessage = h1;
    } else if (body) {
      if (body.toLowerCase().includes('duplicate') && body.toLowerCase().includes('invoice')) {
        serverMessage = 'Duplicate Invoice ID: This order ID has already been submitted to SteadFast.';
      } else {
        const match = body.match(/(SQLSTATE|Exception|Error|Duplicate|Undefined).*/i);
        serverMessage = match ? match[0].substring(0, 150) : body.substring(0, 150) + '...';
      }
    } else {
      serverMessage = 'The courier server encountered an unexpected error.';
    }
  }

  const logDetails: any = {
    context,
    status: response.status,
    statusText: response.statusText,
    url: response.url,
    serverMessage,
    timestamp: new Date().toISOString()
  };

  // If it's a 500 error, log the FULL response text for debugging as requested
  if (response.status === 500) {
    console.group(`[CRITICAL API 500] ${context}`);
    console.error(`Failed Request Diagnostic:`, logDetails);
    console.log("--- FULL HTML RESPONSE START ---");
    console.log(text);
    console.log("--- FULL HTML RESPONSE END ---");
    console.groupEnd();
  } else {
    logDetails.rawResponseSnippet = text.substring(0, 500);
    console.error(`[API ERROR] ${context}:`, logDetails);
  }

  // Categorize for user-friendly UI feedback
  switch (response.status) {
    case 401:
      throw new Error(`Authentication Failed: Please check your API credentials for ${context}.`);
    case 403:
      throw new Error(`Access Denied: Your account doesn't have permission to perform this ${context} action.`);
    case 422:
      throw new Error(`Validation Error: One or more fields are invalid. ${serverMessage}`);
    case 429:
      throw new Error(`Too Many Requests: We are being rate-limited by ${context}. Please wait a moment.`);
    case 500:
      // User-friendly error message as requested
      throw new Error(`Courier System Error: We encountered an internal server issue while processing this shipment (Code 500). Please verify if Order ID 231115-9165 has already been dispatched in your courier panel before retrying.`);
    case 503:
      throw new Error(`Service Unavailable: ${context} is currently down for maintenance.`);
    default:
      throw new Error(`${context} Error (${response.status}): ${serverMessage || 'An unexpected error occurred.'}`);
  }
};

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e: any) {
    clearTimeout(id);
    if (e.name === 'AbortError') throw new Error('Network Timeout: The server is unreachable or the connection is too slow.');
    throw new Error(`Network Error: ${e.message}`);
  }
}

export const CourierService = {
  /**
   * Health Check: Verify Pixel Connectivity
   */
  async verifyPixelConnection(pixelId: string, accessToken: string) {
    if (!pixelId || !accessToken) throw new Error('Missing Facebook Pixel ID or Access Token.');
    const response = await fetchWithTimeout(`https://graph.facebook.com/v18.0/${pixelId}?access_token=${accessToken}&fields=id`);
    if (!response.ok) await handleApiError(response, 'Meta Pixel CAPI');
    return true;
  },

  /**
   * Health Check: Verify Pathao Connectivity
   */
  async verifyPathaoConnection(settings: CourierSettings['pathao']) {
    const baseUrl = settings.baseUrl || PATHAO_DEFAULT_URL;
    const response = await fetchWithTimeout(`${baseUrl}/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: settings.clientId.trim(),
        client_secret: settings.clientSecret.trim(),
        username: settings.username.trim(),
        password: settings.password.trim(),
        grant_type: 'password'
      })
    });
    if (!response.ok) await handleApiError(response, 'Pathao Courier');
    return true;
  },

  /**
   * Health Check: Verify SteadFast Connectivity
   */
  async verifySteadfastConnection(settings: CourierSettings['steadfast']) {
    if (!settings.apiKey || !settings.secretKey) throw new Error('Missing SteadFast API Key or Secret Key.');
    
    const baseUrl = settings.baseUrl || STEADFAST_DEFAULT_URL;
    const response = await fetchWithTimeout(`${baseUrl}/get_balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': settings.apiKey.trim(),
        'Secret-Key': settings.secretKey.trim()
      }
    });

    if (!response.ok) {
      await handleApiError(response, 'SteadFast Diagnostic');
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('SteadFast returned an invalid response format (Non-JSON).');
    }

    if (data.status !== 200) {
      console.error('[API LOG] SteadFast Diagnostic Rejection:', data);
      throw new Error(data.message || 'SteadFast rejected the credentials.');
    }

    return data; 
  },

  /**
   * Send Order to SteadFast Courier
   */
  async sendToSteadfast(order: Order, settings: CourierSettings['steadfast']) {
    const fullAddress = sanitizeString(`${order.customerAddress}, ${order.customerLocation}, Zip: ${order.customerZipCode}`, 250);
    // Allow dynamic overrides if passed in via a modified order object
    const dynamicOrder = order as any;
    
    const payload = {
      invoice: sanitizeString(order.id, 50),
      recipient_name: sanitizeString(order.customerName, 100),
      recipient_phone: normalizePhone(order.customerPhone),
      recipient_address: fullAddress,
      cod_amount: Math.round(Number(order.totalPrice) || 0), 
      note: dynamicOrder.courierNote || order.customerNotes || 'Order via EliteCommerce'
    };

    const baseUrl = settings.baseUrl || STEADFAST_DEFAULT_URL;
    console.log('[API LOG] Dispatching Request to SteadFast:', {
      url: `${baseUrl}/create_order`,
      payload
    });

    const response = await fetchWithTimeout(`${baseUrl}/create_order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': settings.apiKey.trim(),
        'Secret-Key': settings.secretKey.trim()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      await handleApiError(response, 'SteadFast Dispatch');
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('SteadFast returned a non-JSON success response.');
    }

    if (data.status !== 200) {
      console.error('[API LOG] SteadFast Dispatch Logic Rejection:', data);
      throw new Error(`SteadFast Error: ${data.message || 'The request was rejected by the courier server.'}`);
    }

    return data;
  },

  /**
   * Send Order to Pathao Courier
   */
  async sendToPathao(order: Order, settings: CourierSettings['pathao']) {
    const fullAddress = sanitizeString(`${order.customerAddress}, ${order.customerLocation}, Zip: ${order.customerZipCode}`, 200);
    const baseUrl = settings.baseUrl || PATHAO_DEFAULT_URL;
    const dynamicOrder = order as any;

    // 1. Get Token
    const tokenResponse = await fetchWithTimeout(`${baseUrl}/issue-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: settings.clientId.trim(),
        client_secret: settings.clientSecret.trim(),
        username: settings.username.trim(),
        password: settings.password.trim(),
        grant_type: 'password'
      })
    });

    if (!tokenResponse.ok) await handleApiError(tokenResponse, 'Pathao Authentication');
    const tokenData = await tokenResponse.json();
    
    // 2. Create Order
    const orderPayload = {
      store_id: settings.storeId.trim(),
      merchant_order_id: sanitizeString(order.id, 50),
      recipient_name: sanitizeString(order.customerName, 100),
      recipient_phone: normalizePhone(order.customerPhone),
      recipient_address: fullAddress,
      recipient_city: 1, 
      recipient_zone: 1, 
      amount_to_collect: Math.round(Number(order.totalPrice) || 0),
      item_type: 2, 
      delivery_type: 48, 
      item_quantity: 1,
      item_weight: dynamicOrder.weight ? Number(dynamicOrder.weight) : 0.5,
    };

    const orderResponse = await fetchWithTimeout(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    if (!orderResponse.ok) await handleApiError(orderResponse, 'Pathao Order Creation');
    return await orderResponse.json();
  }
};
