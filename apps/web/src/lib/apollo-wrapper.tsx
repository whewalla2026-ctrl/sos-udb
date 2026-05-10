'use client';

import dynamic from 'next/dynamic';

var ApolloProviderClient = dynamic(function() {
  return import('./apollo-provider').then(function(m) { return m.ApolloProvider; });
}, { ssr: false });

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProviderClient>{children}</ApolloProviderClient>;
}
