/**
 * Centralized API configuration for the mobile app.
 *
 * In development mode (__DEV__ === true), the app points to the deployed
 * Render backend by default. This avoids the common pitfall where
 * `localhost` on a physical device refers to the device itself, not the
 * developer's PC.
 *
 * If you need to test against a truly local backend running on your PC
 * while using a physical device, replace the dev URL below with your
 * PC's local IP address on the Wi-Fi network (e.g. http://192.168.1.42:3000).
 * Do NOT use "localhost" — it won't reach your PC from the phone.
 */

// Using the deployed Render URL for both dev and prod avoids network issues
// on physical devices. Switch the dev URL to your local IP if needed.
export const API_BASE_URL = __DEV__
  ? 'https://rag-backend-tdi2.onrender.com' // or 'http://<YOUR_LOCAL_IP>:3000' for local testing
  : 'https://rag-backend-tdi2.onrender.com';
