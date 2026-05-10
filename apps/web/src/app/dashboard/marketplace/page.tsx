'use client';
import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { MARKETPLACE_ITEMS } from '../../../lib/queries';

export default function MarketplacePage() {
  var { data: itemsData, loading } = useQuery(MARKETPLACE_ITEMS);
  var [search, setSearch] = useState('');
  var [category, setCategory] = useState('All Categories');

  var items = itemsData?.marketplaceItems || [];
  var categories = ['All Categories'];
  var seen: any = {};
  items.forEach(function(i: any) { if (i.category && !seen[i.category]) { seen[i.category] = true; categories.push(i.category); } });

  var filtered = items.filter(function(i: any) {
    var matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    var matchCat = category === 'All Categories' || i.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Marketplace</h1>
        <p className="page-subtitle">Spend your coins on upgrades and items.</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input type="text" placeholder="Search marketplace..." className="input-field" style={{ flex: 1, padding: '10px 16px' }} value={search} onChange={function(e) { setSearch(e.target.value); }} />
        <select className="input-field" style={{ padding: '10px 16px' }} value={category} onChange={function(e) { setCategory(e.target.value); }}>
          {categories.map(function(c: string) { return <option key={c}>{c}</option>; })}
        </select>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading marketplace...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {filtered.map(function(item: any) {
            return (
              <div key={item.id} className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{item.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', marginBottom: 12 }}>{item.category}</div>
                <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-gold)', marginBottom: 16 }}>{item.cost} 🪙</div>
                <button className="btn btn-primary" style={{ width: '100%' }}>Purchase</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
