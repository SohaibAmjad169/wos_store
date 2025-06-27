const BACKEND_URL = 'http://localhost:9000';
const email = 'sohaibamjad2524@gmail.com';
const password = 'Sohaib@2522';
const PUBLISHABLE_API_KEY = 'pk_d12d3f5a7af4f089defb7878777fb8699b32d1d4379b1b2746e79bd09796cf25';

async function main() {
  try {
    // 1. Login to get JWT
    const loginRes = await fetch(`${BACKEND_URL}/auth/customer/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(loginData.message || 'Login failed');
    const jwtToken = loginData.token;

    // 2. Exchange JWT for session cookie
    const sessionRes = await fetch(`${BACKEND_URL}/auth/session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwtToken}` },
    });

    const rawSetCookie = sessionRes.headers.get('set-cookie');
    if (!rawSetCookie) throw new Error('No session cookie received');
    const sidMatch = rawSetCookie.match(/connect\.sid=([^;]+)/);
    if (!sidMatch) throw new Error('Session ID not found');
    const sessionId = sidMatch[1];

    // Order simulation
    const orderId = '12345';
    const order = {
      id: orderId,
      shipping_address: {
        first_name: 'John',
        last_name: 'Doe',
        address_1: '123 Main St',
        postal_code: '12345',
        city: 'Sample City',
        country_code: 'US',
        phone: '+1234567890',
        company: 'ACME Corp',
      },
      customer: {
        email: 'sohaibamjad2524@gmail.com',
      },
    };

    // SendCloud Label Generation
    const labelRes = await fetch(`${BACKEND_URL}/store/sendscloud/label/${orderId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
        Cookie: `connect.sid=${sessionId}`,
      },
      body: JSON.stringify({ order }),
    });

    const labelData = await labelRes.json();
    console.log('Label Data:', labelData);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();