import { useEffect, useState } from 'react';
import { api, mediaUrl } from '../api/client.js';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    api.get('/notifications').then(({ data }) => setNotifications(data.notifications));
  }, []);

  return (
    <main className="min-h-screen overflow-y-auto px-5 pb-28 pt-8 md:ml-20 md:px-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-black">Notifications</h1>
        <div className="mt-6 space-y-3">
          {notifications.map((item) => (
            <div key={item._id} className="glass flex items-center gap-3 rounded-3xl p-4">
              <img src={mediaUrl(item.actor?.avatar)} className="h-11 w-11 rounded-full object-cover" />
              <p><b>@{item.actor?.username}</b> {item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

