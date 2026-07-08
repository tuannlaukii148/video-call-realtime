import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/socket/socket';

export function useSocket() {
  const socket = getSocket();

  useEffect(() => {
    connectSocket();
    
    return () => {
      // Usually socket will persist between lobby and real meeting.
      // Disconnect will be manually called when actually leaving completely.
    };
  }, []);

  return socket;
}
