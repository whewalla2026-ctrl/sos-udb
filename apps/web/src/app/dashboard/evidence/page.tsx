'use client';
import { useState } from 'react';

const MOCK_GALLERY = [
  { id: '1', title: 'Science Project Board', type: 'PHOTO', url: 'https://images.unsplash.com/photo-1564473373801-443b71db3a47?w=500&q=80', date: '2 days ago', quest: 'Science Fair Prep' },
  { id: '2', title: 'Math Worksheet Completed', type: 'DOCUMENT', url: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=500&q=80', date: '4 days ago', quest: 'Fractions Week' },
  { id: '3', title: 'Lawn Mowing Job', type: 'PHOTO', url: 'https://images.unsplash.com/photo-1592424005688-57351658428d?w=500&q=80', date: '1 week ago', quest: 'Venture Earnings' },
];

export default function EvidenceGalleryPage() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">📸 Evidence Gallery</h1>
          <p className="page-subtitle">Your portfolio of growth. Capture proof of your quests to earn XP.</p>
        </div>
        <button id="upload-evidence-btn" className="btn btn-primary" onClick={() => setShowUpload(true)}>+ Upload Proof</button>
      </div>

      <div className="grid-cards">
        {MOCK_GALLERY.map(item => (
          <div key={item.id} className="glass-card" style={{ overflow: 'hidden' }}>
            {/* Image Thumbnail */}
            <div style={{ height: 200, width: '100%', background: `url(${item.url}) center/cover no-repeat`, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 10, right: 10 }} className="badge badge-primary">{item.type}</div>
            </div>
            {/* Details */}
            <div style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 4 }}>{item.title}</h3>
              <div style={{ color: 'var(--color-primary-light)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: 12 }}>Quest: {item.quest}</div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bg-glass-border)', paddingTop: 12, marginTop: 12 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{item.date}</span>
                <span style={{ color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600 }}>✓ Parent Approved</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card scale-in" style={{ padding: 32, width: 400, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 20 }}>Upload Evidence</h2>
            
            <div style={{ border: '2px dashed var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: 40, marginBottom: 20, cursor: 'pointer' }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📷</div>
              <div style={{ color: 'var(--text-secondary)' }}>Click to browse or drag file</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
              <div><label className="text-sm text-muted">Title</label><input className="input mt-2" placeholder="What did you do?" /></div>
              <div>
                <label className="text-sm text-muted">Link to Quest</label>
                <select className="input mt-2">
                  <option>Select a Quest...</option>
                  <option>Complete 10 Fraction Worksheets</option>
                  <option>Make Your Bed</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary w-full" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary w-full" onClick={() => setShowUpload(false)}>Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
