import { ApolloClient, InMemoryCache, createHttpLink, from, Observable } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

var API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

var httpLink = createHttpLink({ uri: API_URL });

var authLink = setContext(function(_, context) {
  var token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('accessToken');
  }
  return {
    headers: {
      ...context.headers,
      Authorization: token ? 'Bearer ' + token : '',
    },
  };
});

var errorLink = onError(function({ graphQLErrors, networkError, operation, forward }) {
  if (graphQLErrors) {
    for (var err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED' || (err.message && err.message.indexOf('Unauthorized') !== -1)) {
        var rt = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
        if (!rt) {
          if (typeof window !== 'undefined') { window.location.href = '/auth/login'; }
          return;
        }
        return new Observable(function(observer) {
          fetch('http://localhost:3000/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.token) {
              localStorage.setItem('accessToken', data.token);
              localStorage.setItem('refreshToken', data.refreshToken);
              var oldHeaders = operation.getContext().headers || {};
              operation.setContext({ headers: { ...oldHeaders, Authorization: 'Bearer ' + data.token } });
              var subscriber = forward(operation).subscribe({
                next: function(result) { observer.next(result); },
                error: function(e) { observer.error(e); },
                complete: function() { observer.complete(); },
              });
              return function() { subscriber.unsubscribe(); };
            } else {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              if (typeof window !== 'undefined') { window.location.href = '/auth/login'; }
              observer.complete();
            }
          })
          .catch(function() {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
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

var link = from([errorLink, authLink, httpLink]);

var client = new ApolloClient({
  link: link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});

export default client;
