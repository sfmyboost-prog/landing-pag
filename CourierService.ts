
import { Order, CourierSettings } from './types';

/**
 * Service to handle Courier API integrations.
 * Supports Pathao and SteadFast (State Past) Courier APIs.
 */

// SteadFast API Base URL
const STEADFAST_BASE_URL = 'https://portal.steadfast.com.bd/api/v1';
// Pathao API Base URL (Production)
const PATHAO_BASE_URL = 'https://api-hermes.pathao.com/aladdin/api/v1';

export const CourierService = {
  /**
   * Send Order to SteadFast Courier
   */
  async sendToSteadfast(order: Order, settings: CourierSettings['steadfast']) {
    const fullAddress = `${order.customerAddress}, ${order.customerLocation}, Zip: ${order.customerZipCode}`;

    // SIMULATION MODE: If credentials are missing, perform a mock dispatch for demo purposes
    if (!settings.apiKey || !settings.secretKey) {
        console.log("Simulating SteadFast Dispatch for order:", order.id, "Address:", fullAddress);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay
        return {
            consignment_id: `STF-${Math.floor(Math.random() * 100000)}`,
            status: 'success',
            message: "Order placed successfully (Simulation)"
        };
    }

    const payload = {
      invoice: order.id,
      recipient_name: order.customerName,
      recipient_phone: order.customerPhone,
      recipient_address: fullAddress,
      cod_amount: order.totalPrice,
      note: 'Order from EliteCommerce'
    };

    try {
      const response = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': settings.apiKey,
          'Secret-Key': settings.secretKey
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create order in SteadFast');
      }

      return data;
    } catch (error) {
      console.error('SteadFast API Error:', error);
      throw error;
    }
  },

  /**
   * Send Order to Pathao Courier
   */
  async sendToPathao(order: Order, settings: CourierSettings['pathao']) {
    const fullAddress = `${order.customerAddress}, ${order.customerLocation}, Zip: ${order.customerZipCode}`;

    // SIMULATION MODE: If credentials are missing, perform a mock dispatch for demo purposes
    if (!settings.clientId || !settings.clientSecret) {
        console.log("Simulating Pathao Dispatch for order:", order.id, "Address:", fullAddress);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Fake network delay
        return {
            consignment_id: `PTH-${Math.floor(Math.random() * 100000)}`,
            message: "Order placed successfully (Simulation)"
        };
    }

    try {
      // Step 1: Get Access Token
      const tokenResponse = await fetch(`${PATHAO_BASE_URL}/issue-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          username: settings.username,
          password: settings.password,
          grant_type: 'password'
        })
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        throw new Error(tokenData.message || 'Failed to authenticate with Pathao');
      }

      const accessToken = tokenData.access_token;

      // Step 2: Create Order
      const orderPayload = {
        store_id: settings.storeId,
        merchant_order_id: order.id,
        recipient_name: order.customerName,
        recipient_phone: order.customerPhone,
        recipient_address: fullAddress,
        recipient_city: 1, // Defaulting to Dhaka (1) or City ID needs to be mapped in real app
        recipient_zone: 1, // Defaulting to Zone ID or needs mapping
        amount_to_collect: order.totalPrice,
        item_type: 2, // 2 for Parcel
        delivery_type: 48, // 48 for Standard Delivery
        item_quantity: 1,
        item_weight: 0.5,
      };

      const orderResponse = await fetch(`${PATHAO_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(orderData.message || 'Failed to create order in Pathao');
      }

      return orderData;
    } catch (error) {
      console.error('Pathao API Error:', error);
      throw error;
    }
  }
};
