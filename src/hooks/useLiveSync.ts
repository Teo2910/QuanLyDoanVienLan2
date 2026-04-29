import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io();

export const useLiveSync = (event: string, callback: () => void) => {
  useEffect(() => {
    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
};
