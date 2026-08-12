import CourierMapWidget from '../components/CourierMapWidget';

export default function TrackingPage() {
  return (
    <div className="p-6">
      <div className="bg-card border border-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <CourierMapWidget />
      </div>
    </div>
  );
}