import { trace , context} from '@opentelemetry/api';

export default function logError(message: string, extra: any) {
    const activeSpan = trace.getSpanContext(context.active());
    const traceId = activeSpan?.traceId;
    (window as any).Rollbar?.error(message, { ...extra, traceId });
}