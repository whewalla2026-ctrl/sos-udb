'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ME } from '../../../lib/queries';

export default function CalendarPage() {
  var { data: userData } = useQuery(GET_ME);
  var [weekOffset, setWeekOffset] = useState(0);
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  var weekDays = days.map(function(day, i) {
    var d = new Date();
    d.setDate(d.getDate() + (i - d.getDay()) + weekOffset * 7);
    return { name: day, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), iso: d.toISOString().split('T')[0] };
  });

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <p className="page-subtitle">View and manage your weekly schedule.</p>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-outline" onClick={function() { setWeekOffset(weekOffset - 1); }}>← Previous</button>
        <button className="btn btn-primary" onClick={function() { setWeekOffset(0); }}>Today</button>
        <button className="btn btn-outline" onClick={function() { setWeekOffset(weekOffset + 1); }}>Next →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
        {weekDays.map(function(day) {
          return (
            <div key={day.iso} className="glass-card" style={{ padding: 16, minHeight: 150 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>{day.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: 12 }}>{day.date}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>
                Activities load from API
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
