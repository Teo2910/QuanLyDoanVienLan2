using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QLDV.Data;
using QLDV.Models;
using Microsoft.AspNetCore.SignalR;
using QLDV.Hubs;

namespace QLDV.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatController(ApplicationDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpGet("threads")]
        public async Task<IActionResult> GetThreads()
        {
            var threads = await _context.ChatMessages
                .GroupBy(m => m.ThreadId)
                .Select(g => new ChatThread
                {
                    ThreadId = g.Key,
                    LastMessageAt = g.Max(m => m.CreatedAt),
                    UnreadCount = g.Count(m => !m.IsRead && m.SenderRole != "Admin")
                })
                .OrderByDescending(t => t.LastMessageAt)
                .ToListAsync();

            return Ok(threads);
        }

        [HttpGet("messages/{threadId}")]
        public async Task<IActionResult> GetMessages(string threadId)
        {
            var messages = await _context.ChatMessages
                .Where(m => m.ThreadId == threadId)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            return Ok(messages);
        }

        [HttpPost("messages")]
        public async Task<IActionResult> SendMessage([FromBody] ChatMessage message)
        {
            message.Id = Guid.NewGuid().ToString();
            message.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            message.IsRead = false;

            _context.ChatMessages.Add(message);
            await _context.SaveChangesAsync();

            await _hubContext.Clients.All.SendAsync("ReceiveMessage", message);

            return Ok(message);
        }

        [HttpPost("read/{threadId}")]
        public async Task<IActionResult> MarkAsRead(string threadId, [FromBody] ReadRequest request)
        {
            var messages = await _context.ChatMessages
                .Where(m => m.ThreadId == threadId && !m.IsRead)
                .ToListAsync();

            foreach (var m in messages)
            {
                if (request.Role == "User" && m.SenderRole == "Admin") m.IsRead = true;
                if (request.Role == "Admin" && m.SenderRole != "Admin") m.IsRead = true;
            }

            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("MessagesRead", new { threadId, role = request.Role });

            return Ok(new { success = true });
        }
    }

    public class ReadRequest
    {
        public required string Role { get; set; }
    }
}
