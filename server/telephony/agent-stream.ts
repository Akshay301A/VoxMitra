import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import type { Agent, AgentConfig, CallRecord } from '../db/database.ts';
import type { DatabaseContract } from '../db/database.contract.ts';
import { buildAgentSystemPrompt } from '../services/conversationalEngine.ts';

const EXOTEL_PATH = '/api/telephony/exotel/media';
const EXOTEL_SAMPLE_RATE = 16000;
const GEMINI_SAMPLE_RATE = 24000;
const EXOTEL_FRAME_BYTES = 3200;
const MAX_MEDIA_BYTES = 100_000;
const MAX_QUEUED_AUDIO_BYTES = EXOTEL_SAMPLE_RATE * 2 * 10;
const MAX_SOCKET_BUFFERED_BYTES = 1_000_000;

export interface AgentStreamCallbacks {
  onAudio(pcm: Buffer): void;
  onAudioEnd(): void;
  onTranscript(speaker: 'caller' | 'agent', text: string): void;
  onInterrupted(): void;
  onError(): void;
}

export interface LiveConversation {
  sendAudio(pcm: Buffer): void;
  sendText(text: string): void;
  close(): void;
}

export type LiveConversationFactory = (
  agent: Agent,
  config: AgentConfig,
  callbacks: AgentStreamCallbacks
) => Promise<LiveConversation>;

export interface AgentStreamDependencies {
  db: DatabaseContract;
  accountSid: string;
  username: string;
  password: string;
  createConversation: LiveConversationFactory;
  maxDurationSeconds?: number;
}

export interface ExotelStreamConfiguration {
  accountSid: string;
  username: string;
  password: string;
}

interface StartEvent {
  event: 'start';
  stream_sid: string;
  start: {
    stream_sid?: string;
    call_sid: string;
    account_sid: string;
    from: string;
    to: string;
    media_format?: {
      encoding?: string;
      sample_rate?: string;
      bit_rate?: string;
    };
  };
}

interface ProviderEvent {
  event: string;
  stream_sid?: string;
  start?: StartEvent['start'];
  stop?: { call_sid?: string; reason?: string };
  media?: { payload?: string };
  dtmf?: { digit?: string };
}

export function normalizePhoneNumber(value: string): string | undefined {
  const normalized = value.replace(/\D/g, '');
  return /^\d{8,15}$/.test(normalized) ? normalized : undefined;
}

export function getExotelStreamConfiguration(
  env: Readonly<Record<string, string | undefined>> = process.env
): ExotelStreamConfiguration | undefined {
  const accountSid = env.EXOTEL_ACCOUNT_SID?.trim();
  const username = env.EXOTEL_STREAM_USERNAME?.trim();
  const password = env.EXOTEL_STREAM_PASSWORD;
  if (!accountSid || !username || !password) return undefined;
  return { accountSid, username, password };
}

export function hasValidInboundAgentConfiguration(config: AgentConfig): boolean {
  return (
    typeof config.greeting === 'string' &&
    config.greeting.trim().length > 0 &&
    typeof config.instructions === 'string' &&
    config.instructions.trim().length > 0 &&
    Number.isInteger(config.max_duration_seconds) &&
    config.max_duration_seconds >= 30 &&
    config.max_duration_seconds <= 3600
  );
}

export function isValidExotelStartEvent(value: unknown): value is StartEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<StartEvent>;
  const start = event.start;
  if (
    event.event !== 'start' ||
    typeof event.stream_sid !== 'string' ||
    event.stream_sid.length === 0 ||
    event.stream_sid.length > 256 ||
    !start ||
    typeof start.call_sid !== 'string' ||
    start.call_sid.length === 0 ||
    start.call_sid.length > 256 ||
    typeof start.account_sid !== 'string' ||
    start.account_sid.length === 0 ||
    start.account_sid.length > 256 ||
    typeof start.from !== 'string' ||
    typeof start.to !== 'string' ||
    !normalizePhoneNumber(start.from) ||
    !normalizePhoneNumber(start.to)
  ) {
    return false;
  }

  const mediaFormat = start.media_format;
  return Boolean(
    mediaFormat &&
      ['audio/L16', 'audio/x-raw', 'audio/pcm', 'raw'].includes(
        mediaFormat.encoding || ''
      ) &&
      Number(mediaFormat.sample_rate) === EXOTEL_SAMPLE_RATE &&
      Number(mediaFormat.bit_rate) === 16
  );
}

function equalSecret(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifyExotelStreamAuthorization(
  authorization: string | undefined,
  username: string,
  password: string
): boolean {
  if (!authorization || !username || !password) return false;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(authorization);
  if (!match) return false;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator < 0) return false;
  return (
    equalSecret(decoded.slice(0, separator), username) &&
    equalSecret(decoded.slice(separator + 1), password)
  );
}

export function resamplePcm16(
  input: Buffer,
  sourceRate = GEMINI_SAMPLE_RATE,
  targetRate = EXOTEL_SAMPLE_RATE
): Buffer {
  const sourceSamples = Math.floor(input.length / 2);
  if (sourceSamples === 0) return Buffer.alloc(0);
  if (sourceRate === targetRate) return input.subarray(0, sourceSamples * 2);

  const targetSamples = Math.floor((sourceSamples * targetRate) / sourceRate);
  const output = Buffer.alloc(targetSamples * 2);
  for (let index = 0; index < targetSamples; index += 1) {
    const position = (index * sourceRate) / targetRate;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(leftIndex + 1, sourceSamples - 1);
    const fraction = position - leftIndex;
    const left = input.readInt16LE(leftIndex * 2);
    const right = input.readInt16LE(rightIndex * 2);
    const sample = Math.max(-32768, Math.min(32767, left + (right - left) * fraction));
    output.writeInt16LE(Math.round(sample), index * 2);
  }
  return output;
}

class Pcm16StreamResampler {
  private readonly samples: number[] = [];
  private bufferStartIndex = 0;
  private totalInputSamples = 0;
  private nextOutputIndex = 0;

  constructor(
    private readonly sourceRate = GEMINI_SAMPLE_RATE,
    private readonly targetRate = EXOTEL_SAMPLE_RATE
  ) {}

  process(input: Buffer): Buffer {
    this.append(input);
    return this.emit(false);
  }

  flush(): Buffer {
    return this.emit(true);
  }

  private append(input: Buffer): void {
    const sampleCount = Math.floor(input.length / 2);
    for (let index = 0; index < sampleCount; index += 1) {
      this.samples.push(input.readInt16LE(index * 2));
    }
    this.totalInputSamples += sampleCount;
  }

  private emit(flush: boolean): Buffer {
    const targetSampleCount = Math.floor(
      (this.totalInputSamples * this.targetRate) / this.sourceRate
    );
    const output: number[] = [];
    while (this.nextOutputIndex < targetSampleCount) {
      const position = (this.nextOutputIndex * this.sourceRate) / this.targetRate;
      const leftIndex = Math.floor(position);
      const rightIndex = Math.min(leftIndex + 1, this.totalInputSamples - 1);
      if (!flush && rightIndex >= this.totalInputSamples) break;
      if (leftIndex < this.bufferStartIndex || leftIndex >= this.totalInputSamples) break;
      const left = this.samples[leftIndex - this.bufferStartIndex];
      const right = this.samples[rightIndex - this.bufferStartIndex];
      const fraction = position - leftIndex;
      output.push(
        Math.round(Math.max(-32768, Math.min(32767, left + (right - left) * fraction)))
      );
      this.nextOutputIndex += 1;
    }

    const buffer = Buffer.alloc(output.length * 2);
    output.forEach((sample, index) => buffer.writeInt16LE(sample, index * 2));
    const nextPosition = (this.nextOutputIndex * this.sourceRate) / this.targetRate;
    const keepFrom = Math.min(Math.floor(nextPosition), this.totalInputSamples - 1);
    const dropCount = Math.max(0, keepFrom - this.bufferStartIndex);
    if (dropCount > 0) {
      this.samples.splice(0, dropCount);
      this.bufferStartIndex += dropCount;
    }
    return buffer;
  }
}

export function createGeminiLiveConversation(
  agent: Agent,
  config: AgentConfig,
  callbacks: AgentStreamCallbacks,
  env: Readonly<Record<string, string | undefined>> = process.env
): Promise<LiveConversation> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('Gemini API is not configured for live calls.');

  const ai = new GoogleGenAI({ apiKey });
  let inputTranscript = '';
  let outputTranscript = '';

  const mergeTranscript = (current: string, next: string): string => {
    const value = next.trim();
    if (!value) return current;
    if (value.startsWith(current)) return value;
    if (current.startsWith(value)) return current;
    return `${current} ${value}`.trim();
  };

  const flushTranscript = () => {
    if (inputTranscript) callbacks.onTranscript('caller', inputTranscript);
    if (outputTranscript) callbacks.onTranscript('agent', outputTranscript);
    inputTranscript = '';
    outputTranscript = '';
  };

  const sessionPromise = ai.live.connect({
    model: env.GEMINI_LIVE_MODEL?.trim() || 'gemini-2.5-flash-native-audio-preview-12-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: env.GEMINI_LIVE_VOICE?.trim() || 'Aoede',
          },
        },
      },
      systemInstruction: buildAgentSystemPrompt(agent, config, false),
    },
    callbacks: {
      onmessage(message: LiveServerMessage) {
        const content = message.serverContent;
        const inputChunk = content?.inputTranscription?.text?.trim();
        const outputChunk = content?.outputTranscription?.text?.trim();
        if (inputChunk) {
          inputTranscript = mergeTranscript(inputTranscript, inputChunk);
        }
        if (outputChunk) {
          outputTranscript = mergeTranscript(outputTranscript, outputChunk);
        }
        if (content?.turnComplete) {
          callbacks.onAudioEnd();
          flushTranscript();
        }
        if (content?.interrupted) {
          flushTranscript();
          callbacks.onInterrupted();
        }

        for (const part of content?.modelTurn?.parts || []) {
          const inlineData = part.inlineData;
          if (
            inlineData?.data &&
            inlineData.mimeType?.startsWith('audio/pcm')
          ) {
            const pcm = Buffer.from(inlineData.data, 'base64');
            if (pcm.length % 2 !== 0) {
              callbacks.onError();
              return;
            }
            callbacks.onAudio(pcm);
          }
        }
        if (message.goAway || message.toolCall || message.toolCallCancellation) callbacks.onError();
      },
      onerror() {
        callbacks.onError();
      },
      onclose(event) {
        flushTranscript();
        if (event.code !== 1000) callbacks.onError();
      },
    },
  });

  return sessionPromise.then((session: Session) => ({
    sendAudio(pcm: Buffer) {
      session.sendRealtimeInput({
        audio: { data: pcm.toString('base64'), mimeType: 'audio/pcm;rate=16000' },
      });
    },
    sendText(text: string) {
      session.sendRealtimeInput({ text });
    },
    close() {
      session.close();
    },
  }));
}

function rejectUpgrade(socket: import('node:net').Socket, status: number): void {
  socket.write(
    `HTTP/1.1 ${status} ${status === 401 ? 'Unauthorized' : 'Not Found'}\r\n` +
      'Connection: close\r\n\r\n'
  );
  socket.destroy();
}

function toRawMessage(data: RawData): string {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}

export function attachExotelAgentStream(
  server: Server,
  dependencies: AgentStreamDependencies
): () => Promise<void> {
  const socketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_MEDIA_BYTES * 2,
  });
  const activeCalls = new Set<string>();
  const connectionAlive = new WeakMap<WebSocket, boolean>();

  const handleUpgrade = (request: IncomingMessage, socket: import('node:net').Socket, head: Buffer) => {
    let pathname: string;
    try {
      pathname = new URL(request.url || '/', 'http://localhost').pathname;
    } catch {
      rejectUpgrade(socket, 404);
      return;
    }
    if (pathname !== EXOTEL_PATH) {
      rejectUpgrade(socket, 404);
      return;
    }
    if (
      !verifyExotelStreamAuthorization(
        request.headers.authorization,
        dependencies.username,
        dependencies.password
      )
    ) {
      rejectUpgrade(socket, 401);
      return;
    }
    socketServer.handleUpgrade(request, socket, head, (websocket) => {
      socketServer.emit('connection', websocket, request);
    });
  };

  server.on('upgrade', handleUpgrade);
  socketServer.on('connection', (websocket: WebSocket) => {
    connectionAlive.set(websocket, true);
    websocket.on('pong', () => connectionAlive.set(websocket, true));
    let started = false;
    let starting = false;
    let finalized = false;
    let callRecordCreated = false;
    let stopReceived = false;
    let disconnectReceived = false;
    let finalStatus: CallRecord['status'] | undefined;
    let finalReason = '';
    let streamSid = '';
    let callSid = '';
    let conversation: LiveConversation | undefined;
    let transcript: CallRecord['transcript'] = [];
    let startTime = 0;
    let maxDurationTimer: NodeJS.Timeout | undefined;
    let outgoingBuffer = Buffer.alloc(0);
    const outputResampler = new Pcm16StreamResampler();
    let queuedAudio: Buffer[] = [];
    let queuedAudioBytes = 0;
    let queuedTexts: string[] = [];

    const sendProviderEvent = (event: Record<string, unknown>) => {
      if (websocket.readyState !== WebSocket.OPEN) return;
      if (websocket.bufferedAmount > MAX_SOCKET_BUFFERED_BYTES) {
        failCall();
        return;
      }
      try {
        websocket.send(JSON.stringify(event));
      } catch {
        failCall();
      }
    };

    const finalize = async (status: CallRecord['status'], reason: string) => {
      if (finalized || !callSid) return;
      finalized = true;
      finalStatus = status;
      finalReason = reason;
      if (maxDurationTimer) clearTimeout(maxDurationTimer);
      try {
        conversation?.close();
      } catch {
        console.error('Failed to close the live conversation session.');
      }
      activeCalls.delete(callSid);
      if (!callRecordCreated) return;
      const durationSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const updated = await dependencies.db.updateCallRecordByTelephonySid(callSid, {
        duration_seconds: durationSeconds,
        status,
        transcript,
        summary: `${reason}; ${transcript.length} transcript entries.`,
      });
      if (!updated) throw new Error('Inbound call record was not found during finalization.');
    };

    const failCall = () => {
      if (finalized) return;
      console.error('Inbound AI call failed during provider or media processing.');
      void finalize('failed', 'Inbound AI call ended after a provider or media error').catch(() => {
        console.error('Failed to persist the inbound call failure status.');
      });
      if (websocket.readyState === WebSocket.OPEN) websocket.close(1011, 'Call processing failed');
    };

    const queueExotelAudio = (message: Buffer) => {
      if (finalized || websocket.readyState !== WebSocket.OPEN || !streamSid) return;
      outgoingBuffer = Buffer.concat([outgoingBuffer, message]);
      while (outgoingBuffer.length >= EXOTEL_FRAME_BYTES) {
        const frame = outgoingBuffer.subarray(0, EXOTEL_FRAME_BYTES);
        outgoingBuffer = outgoingBuffer.subarray(EXOTEL_FRAME_BYTES);
        sendProviderEvent({
          event: 'media',
          stream_sid: streamSid,
          media: { payload: frame.toString('base64') },
        });
      }
    };

    const onProviderMessage = (message: Buffer) => {
      if (message.length % 2 !== 0) {
        failCall();
        return;
      }
      queueExotelAudio(outputResampler.process(message));
    };

    const flushOutgoingAudio = () => {
      if (finalized || websocket.readyState !== WebSocket.OPEN || !streamSid) return;
      queueExotelAudio(outputResampler.flush());
      if (outgoingBuffer.length === 0) return;
      sendProviderEvent({
        event: 'media',
        stream_sid: streamSid,
        media: { payload: outgoingBuffer.toString('base64') },
      });
      outgoingBuffer = Buffer.alloc(0);
    };

    const appendTranscript = (
      speaker: 'caller' | 'agent',
      text: string
    ) => {
      const normalized = text.trim();
      if (!normalized) return;
      transcript.push({
        speaker,
        text: normalized,
        timestamp: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
      });
      void Promise.resolve(dependencies.db.updateCallRecordByTelephonySid(callSid, { transcript }))
        .then((updated) => {
          if (!updated) throw new Error('Inbound call record was not found during transcript update.');
        })
        .catch(() => {
          console.error('Failed to persist an inbound call transcript update.');
          failCall();
        });
    };

    const handleStart = async (event: ProviderEvent) => {
      if (!isValidExotelStartEvent(event)) {
        websocket.close(1008, 'Invalid Exotel start event');
        return;
      }
      if (event.start.account_sid !== dependencies.accountSid) {
        websocket.close(1008, 'Unexpected Exotel account');
        return;
      }
      const fromNumber = normalizePhoneNumber(event.start.from);
      const toNumber = normalizePhoneNumber(event.start.to);
      if (!fromNumber || !toNumber) {
        websocket.close(1008, 'Invalid call numbers');
        return;
      }
      if (activeCalls.has(event.start.call_sid)) {
        websocket.close(1013, 'Call stream already active');
        return;
      }
      callSid = event.start.call_sid;
      streamSid = event.start.stream_sid || event.stream_sid;
      startTime = Date.now();
      started = true;
      starting = false;
      activeCalls.add(callSid);
      const deployment = await dependencies.db.getActiveInboundAgentByPhoneNumber(toNumber);
      if (!deployment || !hasValidInboundAgentConfiguration(deployment.config)) {
        activeCalls.delete(callSid);
        websocket.close(1008, 'No configured active agent for this number');
        return;
      }
      const priorCall = await dependencies.db.getCallRecordByTelephonySid(callSid);
      if (priorCall) {
        activeCalls.delete(callSid);
        websocket.close(1013, 'Call has already been processed');
        return;
      }

      try {
        const { call, created } = await dependencies.db.createCallRecordIfNew({
          business_id: deployment.agent.business_id,
          agent_id: deployment.agent.id,
          agent_name: deployment.agent.name,
          direction: 'inbound',
          caller_number: fromNumber,
          recipient_number: toNumber,
          duration_seconds: 0,
          status: 'in_progress',
          transcript: [],
          summary: '',
          extracted_data: {},
          sentiment: 'neutral',
          cost_usd: 0,
          telephony_call_sid: callSid,
          is_demo: false,
        });
        if (!created) {
          activeCalls.delete(callSid);
          websocket.close(1013, 'Call has already been processed');
          return;
        }
        if (call.telephony_call_sid !== callSid || call.status !== 'in_progress') {
          throw new Error('Call identifier conflict.');
        }
        callRecordCreated = true;
        if (finalized) {
          const updated = await dependencies.db.updateCallRecordByTelephonySid(callSid, {
            duration_seconds: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
            status: finalStatus || 'failed',
            transcript,
            summary: `${finalReason || 'Inbound AI call ended during setup'}; ${transcript.length} transcript entries.`,
          });
          if (!updated) throw new Error('Inbound call record was not found after setup ended.');
          return;
        }
        if (stopReceived) {
          await finalize('completed', 'Inbound AI call ended during setup');
          return;
        }
        if (disconnectReceived) {
          await finalize('failed', 'Inbound AI media stream disconnected during setup');
          return;
        }
        conversation = await dependencies.createConversation(deployment.agent, deployment.config, {
          onAudio: onProviderMessage,
          onAudioEnd: flushOutgoingAudio,
          onTranscript: appendTranscript,
          onInterrupted() {
            sendProviderEvent({ event: 'clear', stream_sid: streamSid });
            outgoingBuffer = Buffer.alloc(0);
          },
          onError: failCall,
        });
        if (finalized || websocket.readyState !== WebSocket.OPEN) {
          conversation.close();
          return;
        }
        for (const pcm of queuedAudio) conversation.sendAudio(pcm);
        queuedAudio = [];
        queuedAudioBytes = 0;
        for (const text of queuedTexts) conversation.sendText(text);
        queuedTexts = [];

        const maxDuration = Math.max(
          30,
          Math.min(
            deployment.config.max_duration_seconds || dependencies.maxDurationSeconds || 300,
            dependencies.maxDurationSeconds || 3600
          )
        );
        maxDurationTimer = setTimeout(() => {
          void finalize('completed', 'Maximum call duration reached').then(() => {
            if (websocket.readyState === WebSocket.OPEN) websocket.close(1000, 'Call duration limit reached');
          }).catch(() => failCall());
        }, maxDuration * 1000);
        conversation.sendText(
          `Begin the call now. Greet the caller using this greeting, then listen: ${deployment.config.greeting}`
        );
      } catch {
        failCall();
      }
    };

    websocket.on('message', (data: RawData) => {
      let event: ProviderEvent;
      try {
        const parsed: unknown = JSON.parse(toRawMessage(data));
        if (!parsed || typeof parsed !== 'object' || typeof (parsed as ProviderEvent).event !== 'string') {
          websocket.close(1002, 'Invalid Exotel event');
          return;
        }
        event = parsed as ProviderEvent;
      } catch {
        websocket.close(1002, 'Invalid Exotel message');
        return;
      }

      if (event.event === 'start') {
        if (started || starting) {
          websocket.close(1008, 'Duplicate start event');
          return;
        }
        starting = true;
        void handleStart(event).catch(() => {
          if (callSid) activeCalls.delete(callSid);
          if (started) failCall();
          else websocket.close(1011, 'Unable to initialize call');
          console.error('Failed to initialize an inbound call.');
        });
        return;
      }
      if (event.event === 'connected') return;
      if (!started || finalized || event.stream_sid !== streamSid) {
        websocket.close(1008, 'Unexpected Exotel event');
        return;
      }
      if (event.event === 'media') {
        if (
          typeof event.media?.payload !== 'string' ||
          !event.media.payload ||
          event.media.payload.length > MAX_MEDIA_BYTES * 2 ||
          !/^[A-Za-z0-9+/]*={0,2}$/.test(event.media.payload)
        ) {
          failCall();
          return;
        }
        const pcm = Buffer.from(event.media.payload, 'base64');
        if (
          pcm.length > MAX_MEDIA_BYTES ||
          pcm.length % 2 !== 0 ||
          pcm.toString('base64').replace(/=+$/, '') !== event.media.payload.replace(/=+$/, '')
        ) {
          failCall();
          return;
        }
        try {
          if (conversation) {
            conversation.sendAudio(pcm);
          } else if (queuedAudioBytes + pcm.length <= MAX_QUEUED_AUDIO_BYTES) {
            queuedAudio.push(pcm);
            queuedAudioBytes += pcm.length;
          } else {
            failCall();
          }
        } catch {
          failCall();
        }
        return;
      }
      if (event.event === 'dtmf' && event.dtmf && /^[0-9*#]$/.test(event.dtmf.digit || '')) {
        const text = `The caller pressed ${event.dtmf.digit} on the telephone keypad.`;
        if (conversation) conversation.sendText(text);
        else if (queuedTexts.length < 64) queuedTexts.push(text);
        else failCall();
        return;
      }
      if (event.event === 'stop') {
        if (event.stop?.call_sid && event.stop.call_sid !== callSid) {
          websocket.close(1008, 'Unexpected call identifier');
          return;
        }
        stopReceived = true;
        if (!callRecordCreated) return;
        void finalize('completed', 'Inbound AI call ended')
          .then(() => websocket.close(1000))
          .catch(() => {
            console.error('Failed to persist the inbound call completion status.');
            websocket.close(1011, 'Unable to save call status');
          });
        return;
      }
      if (event.event === 'mark' || event.event === 'silence') return;
      websocket.close(1002, 'Unsupported Exotel event');
    });

    websocket.on('close', () => {
      if (callSid) activeCalls.delete(callSid);
      if (!callRecordCreated) {
        disconnectReceived = true;
        return;
      }
      if (finalized) return;
      void finalize('failed', 'Inbound AI media stream disconnected unexpectedly').catch(() => {
        console.error('Failed to persist an interrupted inbound call status.');
      });
    });
    websocket.on('error', () => {
      if (started && !finalized) failCall();
    });
  });

  const heartbeat = setInterval(() => {
    for (const websocket of socketServer.clients) {
      if (connectionAlive.get(websocket) === false) {
        websocket.terminate();
        continue;
      }
      connectionAlive.set(websocket, false);
      websocket.ping();
    }
  }, 30_000);
  heartbeat.unref();

  return async () => {
    server.off('upgrade', handleUpgrade);
    clearInterval(heartbeat);
    for (const websocket of socketServer.clients) {
      websocket.close(1001, 'Server shutting down');
    }
    await new Promise<void>((resolve) => socketServer.close(() => resolve()));
  };
}

export function createDefaultLiveConversation(
  agent: Agent,
  config: AgentConfig,
  callbacks: AgentStreamCallbacks
): Promise<LiveConversation> {
  return createGeminiLiveConversation(agent, config, callbacks);
}
