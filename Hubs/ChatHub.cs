using Microsoft.AspNetCore.SignalR;
using QLDV.Models;

namespace QLDV.Hubs
{
    public class ChatHub : Hub
    {
        public async Task SendMessage(ChatMessage message)
        {
            await Clients.All.SendAsync("ReceiveMessage", message);
        }

        public async Task MarkAsRead(string threadId, string role)
        {
            await Clients.All.SendAsync("MessagesRead", new { threadId, role });
        }
    }
}
