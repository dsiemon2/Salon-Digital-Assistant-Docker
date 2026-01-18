import 'cross-fetch/polyfill';
import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';

type BookingParams = {
  subject: string;
  body?: string;
  startISO: string;
  endISO: string;
  attendeeEmail?: string;
};

function getClient() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  const cca = new ConfidentialClientApplication({
    auth: { clientId, authority: `https://login.microsoftonline.com/${tenantId}`, clientSecret }
  });

  async function getToken() {
    const res = await cca.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default']
    });
    if (!res?.accessToken) throw new Error('Failed to acquire Graph token');
    return res.accessToken;
  }

  const client = Client.init({
    authProvider: async (done) => {
      try {
        const token = await getToken();
        done(null, token);
      } catch (e: any) {
        done(e, null);
      }
    }
  });

  return client;
}

/**
 * Creates an event in the specified user's calendar using Microsoft Graph.
 * Requires AZURE_* env vars and M365_CALENDAR_USER (UPN).
 */
export async function createMsGraphEvent(params: BookingParams) {
  const client = getClient();
  if (!client) return { ok: false, error: 'GRAPH_AUTH_MISSING' };
  const user = process.env.M365_CALENDAR_USER;
  if (!user) return { ok: false, error: 'M365_CALENDAR_USER_MISSING' };

  const attendees = params.attendeeEmail
    ? [{ emailAddress: { address: params.attendeeEmail, name: params.attendeeEmail }, type: 'required' }]
    : [];

  const body = {
    subject: params.subject,
    body: { contentType: 'HTML', content: params.body || '' },
    start: { dateTime: params.startISO, timeZone: 'UTC' },
    end: { dateTime: params.endISO, timeZone: 'UTC' },
    attendees
  };

  const ev = await client.api(`/users/${encodeURIComponent(user)}/calendar/events`).post(body);
  return { ok: true, id: ev.id, webLink: ev.webLink };
}
