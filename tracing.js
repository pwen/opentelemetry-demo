
const opentelemetry = require('@opentelemetry/api');

// Not functionally required but gives some insight what happens behind the scenes
const { diag, DiagConsoleLogger, DiagLogLevel } = opentelemetry;
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const { AlwaysOnSampler } = require('@opentelemetry/core');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { SimpleSpanProcessor, ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { ZipkinExporter } = require('@opentelemetry/exporter-zipkin');
const { Resource } = require('@opentelemetry/resources');
const { SemanticAttributes, SemanticResourceAttributes: ResourceAttributesSC } = require('@opentelemetry/semantic-conventions');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

module.exports = (serviceName) => {
    const provider = new NodeTracerProvider({
        resource: new Resource({
            [ResourceAttributesSC.SERVICE_NAME]: serviceName,
        }),
        sampler: filterSampler(ignoreHealthCheck, new AlwaysOnSampler())
    });
    registerInstrumentations({
        tracerProvider: provider,
        instrumentations: [
            // Express instrumentation expects HTTP layer to be instrumented
            HttpInstrumentation,
            ExpressInstrumentation,
        ],
    });

    const exporter = new ZipkinExporter({
        serviceName,
    });

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));

    provider.register();

    return opentelemetry.trace.getTracer('express-demo')
}

const filterSampler = (filterFn, parent) => {
    return {
        shouldSample(ctx, tid, spanName, spanKind, attr, links) {
            if (!filterFn(spanName, spanKind, attr)) {
                return { decision: opentelemetry.SamplingDecision.NOT_RECORD };
            }
            return parent.shouldSample(ctx, tid, spanName, spanKind, attr, links);
        },
        toString() {
            return `FilterSampler(${parent.toString()})`;
        }
    }
}

const ignoreHealthCheck = (spanName, spanKind, attributes) => {
    return spanKind !== opentelemetry.SpanKind.SERVER || attributes[SemanticAttributes.HTTP_ROUTE] !== "/health";
}