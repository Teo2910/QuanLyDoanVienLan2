using Microsoft.AspNetCore.SignalR;
using QLDV.Models;
using QLDV.Services;

namespace QLDV.Hubs
{
    public class ChatHub : Hub
    {
        private readonly IGoogleAIService _aiService;

        public ChatHub(IGoogleAIService aiService)
        {
            _aiService = aiService;
        }

        public async Task SendMessage(ChatMessage message)
        {
            await Clients.All.SendAsync("ReceiveMessage", message);
        }

        public async Task AskAI(string userId, string message)
        {
            try
            {
                var response = await _aiService.ProcessSmartCommandAsync(userId, message);
                await Clients.Caller.SendAsync("ReceiveAIResponse", new { content = response });
            }
            catch (Exception ex)
            {
                await Clients.Caller.SendAsync("ReceiveAIResponse", new { content = $"Lỗi AI: {ex.Message}" });
            }
        }

        public async Task MarkAsRead(string threadId, string role)
        {
            await Clients.All.SendAsync("MessagesRead", new { threadId, role });
        }
    }
}
