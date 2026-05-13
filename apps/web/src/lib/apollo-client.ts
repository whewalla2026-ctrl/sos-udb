import { ApolloClient, InMemoryCache, createHttpLink, from, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';

var API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';
var GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

var httpLink = createHttpLink({
  uri: API_URL,
  credentials: 'include',
});

var errorLink = onError(function({ graphQLErrors, networkError, operation, forward }) {
  if (graphQLErrors) {
    for (var err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED' || (err.message && err.message.indexOf('Unauthorized') !== -1)) {
        return new Observable(function(observer) {
          fetch(GATEWAY_URL + '/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
          .then(function(r) {
            if (r.ok) {
              var oldHeaders = operation.getContext().headers || {};
              operation.setContext({ headers: { ...oldHeaders } });
              var subscriber = forward(operation).subscribe({
                next: function(result) { observer.next(result); },
                error: function(e) { observer.error(e); },
                complete: function() { observer.complete(); },
              });
              return function() { subscriber.unsubscribe(); };
            } else {
              if (typeof window !== 'undefined') { window.location.href = '/auth/login'; }
              observer.complete();
            }
          })
          .catch(function() {
            if (typeof window !== 'undefined') { window.location.href = '/auth/login'; }
            observer.complete();
          });
        });
      }
    }
  }
  if (networkError) {
    console.warn('Network error:', networkError.message);
  }
});

var link = from([errorLink, httpLink]);

var client = new ApolloClient({
  link: link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});

export default client;
