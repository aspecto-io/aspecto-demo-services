
export default function logError(message: string, extra: any) {
    // const activeSpan = trace.getSpanContext(context.active());
    // const traceId = activeSpan?.traceId;
    console.error(message, { ...extra });
}