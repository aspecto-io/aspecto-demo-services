// import { context, trace } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
// import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ZoneContextManager } from '@opentelemetry/context-zone';
// import { B3Propagator } from '@opentelemetry/propagator-b3';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
// import { BaseOpenTelemetryComponent } from '@opentelemetry/plugin-react-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { W3CTraceContextPropagator } from '@opentelemetry/core';



// Set once for the entire plugin
// BaseOpenTelemetryComponent.setLogger(logger);
// BaseOpenTelemetryComponent.setTracer('name', 'version');

const provider = new WebTracerProvider({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'frontend',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'production',
    })});
    provider.register({
        propagator: new W3CTraceContextPropagator()
      });
      
    // Note: For production consider using the "BatchSpanProcessor" to reduce the number of requests
    // to your exporter. Using the SimpleSpanProcessor here as it sends the spans immediately to the
    // exporter without delay
    provider.addSpanProcessor(new BatchSpanProcessor(new OTLPTraceExporter({
        url: 'https://otelcol.aspecto.io/v1/traces',
        headers: {
            // Aspecto API-Key is required
            Authorization: 'b5a177fe-14bd-4d18-96e0-6f16a742f42d'
        }
    })));
    provider.register({
        contextManager: new ZoneContextManager(),
    });

    registerInstrumentations({
        instrumentations: [
    // new FetchInstrumentation({
    //         propagateTraceHeaderCorsUrls: [
    //             'http://localhost:8000/user/login',
    //             /^http:\/\/localhost:8080/,
    //             /^http:\/\/localhost:8081/,
    //             /^http:\/\/localhost:8082/,
    //         ],
    //         clearTimingResources: true,
    //     }),
    new UserInteractionInstrumentation(),
    new DocumentLoadInstrumentation(),
    new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: [
            'http://localhost:8000/user/login',
            /^http:\/\/localhost:8080/,
            /^http:\/\/localhost:8081/,
            /^http:\/\/localhost:8082/,
        ],
        clearTimingResources: true
    })

  ],
});

const webTracerWithZone = provider.getTracer('example-tracer-web');
export default webTracerWithZone;

// const getData = (url) => fetch(url, {
//   method: 'GET',
//   headers: {
//     Accept: 'application/json',
//     'Content-Type': 'application/json',
//   },
// });

// // example of keeping track of context between async operations
// const prepareClickEvent = () => {
//   const url = 'https://httpbin.org/get';

//   const element = document.getElementById('button1');

//   const onClick = () => {
//     const singleSpan = webTracerWithZone.startSpan('files-series-info');
//     context.with(trace.setSpan(context.active(), singleSpan), () => {
//       getData(url).then((_data) => {
//         trace.getSpan(context.active()).addEvent('fetching-single-span-completed');
//         singleSpan.end();
//       });
//     });
//     for (let i = 0, j = 5; i < j; i += 1) {
//       const span = webTracerWithZone.startSpan(`files-series-info-${i}`);
//       context.with(trace.setSpan(context.active(), span), () => {
//         getData(url).then((_data) => {
//           trace.getSpan(context.active()).addEvent(`fetching-span-${i}-completed`);
//           span.end();
//         });
//       });
//     }
//   };
//   element.addEventListener('click', onClick);
// };

// window.addEventListener('load', prepareClickEvent);