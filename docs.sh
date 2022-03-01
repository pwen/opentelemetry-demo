# https://zipkin.io/pages/quickstart.html
docker run --rm -r -p 9411:9411 --name zipkin openzipkin/zipkin

npm init
npm i --save @opentelemetry/core @opentelemetry/sdk-trace-node @opentelemetry/instrumentation-http @opentelemetry/exporter-zipkin @opentelemetry/sdk-trace-base @opentelemetry/instrumentation-express