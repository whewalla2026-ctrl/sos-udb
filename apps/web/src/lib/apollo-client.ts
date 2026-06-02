import { ApolloClient, InMemoryCache, createHttpLink, from, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { api, setTokens } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

const httpLink = createHttpLink({
  uri: API_URL,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED' || (err.message && err.message.indexOf('Unauthorized') !== -1)) {
        return new Observable((observer) => {
          api.refresh()
          .then((data) => {
            setTokens(data.token, data.refreshToken);
            const oldHeaders = operation.getContext().headers || {};
            operation.setContext({ headers: { ...oldHeaders } });
            const subscriber = forward(operation).subscribe({
              next: (result) => { observer.next(result); },
              error: (e) => { observer.error(e); },
              complete: () => { observer.complete(); },
            });
            return () => { subscriber.unsubscribe(); };
          })
          .catch(() => {
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

const link = from([errorLink, httpLink]);

const client = new ApolloClient({
  link: link,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: { fetchPolicy: 'cache-and-network' },
  },
});

export default client;
