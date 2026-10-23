import type { CallRecord } from './database.ts';

export function isBillableRealCall(
  call: Pick<CallRecord, 'is_demo' | 'telephony_call_sid' | 'caller_number'>
): boolean {
  return !call.is_demo &&
    Boolean(call.telephony_call_sid.trim()) &&
    !/^test[-_]/i.test(call.telephony_call_sid) &&
    !/\(interactive test\)/i.test(call.caller_number);
}
