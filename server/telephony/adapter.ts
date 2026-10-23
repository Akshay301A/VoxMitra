/**
 * Telephony Integration Layer
 * Modular adapter architecture supporting Exotel and Interactive Testing Sandbox
 */

export interface OutboundCallParams {
  agentId: string;
  businessId: string;
  fromNumber: string;
  toNumber: string;
  customData?: Record<string, any>;
}

export interface CallInitiateResult {
  success: boolean;
  callSid: string;
  status: 'queued' | 'initiated' | 'ringing' | 'in_progress' | 'failed';
  provider: string;
  message?: string;
}

export interface CallStatusResult {
  callSid: string;
  status: 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'busy' | 'no_answer';
  durationSeconds: number;
  recordingUrl?: string;
}

export interface NormalizedWebhookEvent {
  callSid: string;
  eventType: 'call.initiated' | 'call.answered' | 'call.completed' | 'call.failed' | 'recording.ready';
  durationSeconds?: number;
  fromNumber: string;
  toNumber: string;
  status: string;
  recordingUrl?: string;
  rawPayload: any;
}

export interface TelephonyAdapter {
  providerName: string;
  isConfigured(): boolean;
  getConfigurationStatus(): {
    configured: boolean;
    provider: string;
    missingKeys: string[];
    details: Record<string, any>;
  };
  initiateCall(params: OutboundCallParams): Promise<CallInitiateResult>;
  getCallStatus(callSid: string): Promise<CallStatusResult>;
  terminateCall(callSid: string): Promise<boolean>;
  verifyWebhook(headers: Record<string, string>, body: any): boolean;
  parseWebhook(body: any): NormalizedWebhookEvent;
}

/**
 * Exotel Telephony Adapter
 * Connects to Exotel API v1 for real PSTN outbound & inbound call orchestration
 */
export class ExotelAdapter implements TelephonyAdapter {
  providerName = 'exotel';

  private accountSid: string;
  private apiKey: string;
  private apiToken: string;
  private subdomain: string;
  private callerId: string;

  constructor() {
    this.accountSid = process.env.EXOTEL_ACCOUNT_SID || '';
    this.apiKey = process.env.EXOTEL_API_KEY || '';
    this.apiToken = process.env.EXOTEL_API_TOKEN || '';
    this.subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
    this.callerId = process.env.EXOTEL_CALLER_ID || '';
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.apiKey && this.apiToken && this.callerId);
  }

  getConfigurationStatus() {
    const missing: string[] = [];
    if (!this.accountSid) missing.push('EXOTEL_ACCOUNT_SID');
    if (!this.apiKey) missing.push('EXOTEL_API_KEY');
    if (!this.apiToken) missing.push('EXOTEL_API_TOKEN');
    if (!this.callerId) missing.push('EXOTEL_CALLER_ID');

    return {
      configured: missing.length === 0,
      provider: 'exotel',
      missingKeys: missing,
      details: {
        subdomain: this.subdomain,
        callerIdConfigured: !!this.callerId,
        accountSidConfigured: !!this.accountSid,
      },
    };
  }

  async initiateCall(params: OutboundCallParams): Promise<CallInitiateResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        callSid: '',
        status: 'failed',
        provider: 'exotel',
        message:
          'Exotel telephony credentials are not configured. To make live PSTN calls, provide EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID in server environment. You can test voice workflows anytime in the built-in Interactive Test Sandbox.',
      };
    }

    try {
      const endpoint = `https://${this.subdomain}/v1/Accounts/${this.accountSid}/Calls/connect.json`;
      const authHeader = 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');

      const formData = new URLSearchParams();
      formData.append('From', this.callerId);
      formData.append('To', params.toNumber);
      formData.append('CallerId', this.callerId);
      formData.append('CustomField', JSON.stringify({ agentId: params.agentId, businessId: params.businessId }));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseData: any = await response.json();

      if (!response.ok) {
        return {
          success: false,
          callSid: '',
          status: 'failed',
          provider: 'exotel',
          message: 'Exotel rejected the call initiation request.',
        };
      }

      const call = responseData?.Call;
      if (typeof call?.Sid !== 'string' || !call.Sid) {
        return {
          success: false,
          callSid: '',
          status: 'failed',
          provider: 'exotel',
          message: 'Exotel response did not include a verified call identifier.',
        };
      }
      return {
        success: true,
        callSid: call.Sid,
        status: 'initiated',
        provider: 'exotel',
        message: 'Call successfully dispatched to Exotel telecom trunk.',
      };
    } catch {
      return {
        success: false,
        callSid: '',
        status: 'failed',
        provider: 'exotel',
        message: 'Exotel connection failed.',
      };
    }
  }

  async getCallStatus(callSid: string): Promise<CallStatusResult> {
    if (!this.isConfigured()) {
      return {
        callSid,
        status: 'failed',
        durationSeconds: 0,
      };
    }

    try {
      const endpoint = `https://${this.subdomain}/v1/Accounts/${this.accountSid}/Calls/${callSid}.json`;
      const authHeader = 'Basic ' + Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');

      const response = await fetch(endpoint, {
        headers: { Authorization: authHeader },
      });

      if (!response.ok) {
        return { callSid, status: 'failed', durationSeconds: 0 };
      }

      const data: any = await response.json();
      const call = data?.Call;
      const statusMap: Record<string, CallStatusResult['status']> = {
        queued: 'queued',
        ringing: 'ringing',
        'in-progress': 'in_progress',
        completed: 'completed',
        failed: 'failed',
        busy: 'busy',
        'no-answer': 'no_answer',
      };

      return {
        callSid,
        status: statusMap[call?.Status] || 'failed',
        durationSeconds: parseInt(call?.Duration || '0', 10),
        recordingUrl: call?.RecordingUrl,
      };
    } catch (err) {
      return { callSid, status: 'failed', durationSeconds: 0 };
    }
  }

  async terminateCall(callSid: string): Promise<boolean> {
    void callSid;
    return false;
  }

  verifyWebhook(headers: Record<string, string>, body: any): boolean {
    void headers;
    void body;
    return false;
  }

  parseWebhook(body: any): NormalizedWebhookEvent {
    const callSid = body.CallSid || body.Sid || '';
    const status = body.Status || body.CallStatus || 'unknown';
    const duration = parseInt(body.DialCallDuration || body.Duration || '0', 10);

    let eventType: NormalizedWebhookEvent['eventType'] = 'call.failed';
    if (status === 'ringing') eventType = 'call.initiated';
    else if (status === 'in-progress') eventType = 'call.answered';
    else if (status === 'failed' || status === 'busy' || status === 'no-answer') eventType = 'call.failed';

    return {
      callSid,
      eventType,
      durationSeconds: duration,
      fromNumber: body.From || '',
      toNumber: body.To || '',
      status,
      recordingUrl: body.RecordingUrl,
      rawPayload: body,
    };
  }
}

export const exotelAdapter = new ExotelAdapter();
