import { ApolloClient, InMemoryCache, createHttpLink, from, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { api, setTokens } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

let isRefreshing = false;
let retryCount = 0;
const MAX_RETRIES = 2;

const httpLink = createHttpLink({
  uri: API_URL,
  credentials: 'include',
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (err.extensions?.code === 'UNAUTHENTICATED' || (err.message && err.message.indexOf('Unauthorized') !== -1)) {
        if (retryCount >= MAX_RETRIES) {
          console.warn('Max Apollo retries reached, redirecting');
          if (typeof window !== 'undefined') { window.location.href = '/auth/login'; }
          return;
        }
        if (isRefreshing) return;
        isRefreshing = true;
        retryCount++;
        return new Observable((observer) => {
          api.refresh()
          .then((data) => {
            setTokens(data.token, data.refreshToken);
            isRefreshing = false;
            const oldHeaders = operation.getContext().headers || {};
            operation.setContext({ headers: { ...oldHeaders } });
            const subscriber = forward(operation).subscribe({
              next: (result) => { retryCount = 0; observer.next(result); },
              error: (e) => { retryCount = 0; isRefreshing = false; observer.error(e); },
              complete: () => { retryCount = 0; isRefreshing = false; observer.complete(); },
            });
            return () => { subscriber.unsubscribe(); };
          })
          .catch(() => {
            isRefreshing = false;
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
