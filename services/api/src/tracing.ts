import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK, tracing as tracingExports } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';

let sdk: NodeSDK | null = null;

export function initNestTracing(): NodeSDK | null {
  if (sdk) return sdk;
  if (process.env.OTEL_SERVICE_NAME === 'none') return null;

  if (process.env.OTEL_DEBUG) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }

  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    concurrencyLimit: 10,
  });

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nestjs-api',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  const spanProcessors: tracingExports.BatchSpanProcessor[] = [];
  spanProcessors.push(new tracingExports.BatchSpanProcessor(exporter, {
    maxExportBatchSize: 512,
    scheduledDelayMillis: process.env.OTEL_BSP_SCHEDULE_DELAY ? parseInt(process.env.OTEL_BSP_SCHEDULE_DELAY) : 5000,
    exportTimeoutMillis: 30000,
  }));
  if (process.env.OTEL_TRACE_EXPORT_TO_CONSOLE) {
    spanProcessors.push(new tracingExports.BatchSpanProcessor(new tracingExports.ConsoleSpanExporter(), {
      maxExportBatchSize: 10,
      scheduledDelayMillis: 1000,
    }));
  }

  sdk = new NodeSDK({
    resource,
    spanProcessors,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': {
          headersToSpanAttributes: {
            server: { requestHeaders: ['x-correlation-id'], responseHeaders: ['x-correlation-id'] },
            client: { requestHeaders: ['x-correlation-id'], responseHeaders: ['x-correlation-id'] },
          },
        },
        '@opentelemetry/instrumentation-express': { enabled: true },
      }),
      new NestInstrumentation({ enabled: true }),
    ],
  });

  sdk.start();
  return sdk;
}

export async function shutdownNestTracing(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch (err) {
      console.error('OpenTelemetry shutdown error:', err);
    }
  }
}
