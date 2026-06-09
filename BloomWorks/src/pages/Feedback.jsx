import React from 'react';
import FeedbackAnnotator from '../components/FeedbackAnnotator';

export default function Feedback() {
  // Example image; in real flow pass task render url or uploaded file
  const demo = 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop';

  const handleSubmit = (items) => {
    // TODO: integrate with API (server/routes) to persist feedback
    console.log('Corrections envoyées:', items);
  };
  const handleApprove = () => {
    console.log('Modèle approuvé');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Feedback Client</h1>
      <FeedbackAnnotator imageUrl={demo} onSubmit={handleSubmit} onApprove={handleApprove} />
    </div>
  );
}
