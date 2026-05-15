using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace QLDV.Hubs
{
    public class PresenceHub : Hub
    {
        private static readonly ConcurrentDictionary<string, UserInfo> OnlineUsers = new();

        public class UserInfo
        {
            public string UserId { get; set; } = string.Empty;
            public string UserName { get; set; } = string.Empty;
            public DateTime LastSeen { get; set; }
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.GetHttpContext()?.Request.Query["userId"].ToString() ?? "anonymous";
            var userName = Context.GetHttpContext()?.Request.Query["userName"].ToString() ?? "Unknown";

            if (!string.IsNullOrEmpty(userId))
            {
                var userInfo = new UserInfo
                {
                    UserId = userId,
                    UserName = userName,
                    LastSeen = DateTime.UtcNow
                };

                OnlineUsers.AddOrUpdate(Context.ConnectionId, userInfo, (key, old) => userInfo);

                // Notify others that user is online
                await Clients.AllExcept(Context.ConnectionId).SendAsync("UserOnline", userInfo);
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (OnlineUsers.TryRemove(Context.ConnectionId, out var userInfo))
            {
                // Notify others that user is offline
                await Clients.All.SendAsync("UserOffline", userInfo.UserId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        public async Task GetOnlineUsers()
        {
            await Clients.Caller.SendAsync("OnlineUsersList", OnlineUsers.Values);
        }

        public async Task SendNotification(string userId, string message)
        {
            await Clients.All.SendAsync("ReceiveNotification", new { userId, message });
        }

        public async Task SendDataUpdate(string entityType, string entityId, string action)
        {
            await Clients.All.SendAsync("DataUpdated", new { entityType, entityId, action });
        }

        public async Task BroadcastMessage(string userName, string message)
        {
            await Clients.All.SendAsync("ReceiveMessage", new { userName, message, timestamp = DateTime.UtcNow });
        }
    }
}
