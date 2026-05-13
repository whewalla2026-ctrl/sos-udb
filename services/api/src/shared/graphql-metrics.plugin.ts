import { ApolloServerPlugin } from '@apollo/server';
import { MetricsService } from './metrics.controller';

export function createGraphQLMetricsPlugin(metrics: MetricsService): ApolloServerPlugin {
  return {
    async requestDidStart() {
      const startTime = Date.now();

      return {
        async willSendResponse(requestContext: any) {
          const duration = (Date.now() - startTime) / 1000;
          const operationType = requestContext.operation?.operation?.toLowerCase() || 'unknown';
          const operationName = requestContext.operationName || 'anonymous';

          metrics.graphqlOperationDuration.observe(
            { operation_type: operationType, operation_name: operationName },
            duration,
          );
        },
      };
    },
  };
}
