using Microsoft.EntityFrameworkCore;
using QLDV.Data;
using QLDV.Models;
using Microsoft.AspNetCore.SignalR;
using QLDV.Hubs;

namespace QLDV.Services
{
    public class MemberService : IMemberService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;
        private readonly IHubContext<ChatHub> _hubContext;

        public MemberService(ApplicationDbContext context, ILogService logService, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _logService = logService;
            _hubContext = hubContext;
        }

        public async Task<List<Member>> GetAllMembersAsync()
        {
            return await _context.Members
                .Include(m => m.Unit)
                .Include(m => m.StatusHistory)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<Member>> GetMembersByUnitAsync(string unitId)
        {
            return await _context.Members
                .Where(m => m.UnitId == unitId)
                .Include(m => m.Unit)
                .Include(m => m.StatusHistory)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Member?> GetMemberByIdAsync(string id)
        {
            return await _context.Members
                .Include(m => m.Unit)
                .Include(m => m.StatusHistory)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<Member> CreateMemberAsync(Member member)
        {
            member.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Members.Add(member);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "CREATE", "Member", member.Id,
                $"Tạo thành viên mới: {member.FullName}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Member");

            return member;
        }

        public async Task UpdateMemberAsync(Member member)
        {
            _context.Members.Update(member);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "UPDATE", "Member", member.Id,
                $"Cập nhật thành viên: {member.FullName}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Member");
        }

        public async Task DeleteMemberAsync(string id)
        {
            var member = await GetMemberByIdAsync(id);
            if (member == null) throw new Exception("Member not found");

            _context.Members.Remove(member);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "DELETE", "Member", id,
                $"Xóa thành viên: {member.FullName}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Member");
        }

        public async Task<List<Member>> SearchMembersAsync(string searchTerm, string? unitId = null, string? status = null)
        {
            var query = _context.Members.AsQueryable();

            if (!string.IsNullOrEmpty(searchTerm))
            {
                query = query.Where(m => 
                    m.FullName.Contains(searchTerm) ||
                    m.Email!.Contains(searchTerm) ||
                    m.Phone!.Contains(searchTerm) ||
                    m.MemberId.Contains(searchTerm));
            }

            if (!string.IsNullOrEmpty(unitId))
            {
                query = query.Where(m => m.UnitId == unitId);
            }

            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(m => m.Status == status);
            }

            return await query
                .Include(m => m.Unit)
                .Include(m => m.StatusHistory)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task ChangeMemberStatusAsync(string memberId, string newStatus, string? reason = null)
        {
            var member = await GetMemberByIdAsync(memberId);
            if (member == null) throw new Exception("Member not found");

            var oldStatus = member.Status;
            member.Status = newStatus;

            var statusChange = new StatusChange
            {
                MemberId = memberId,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                Date = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Reason = reason
            };

            _context.StatusChanges.Add(statusChange);
            _context.Members.Update(member);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "STATUS_CHANGE", "Member", memberId,
                $"Thay đổi trạng thái từ '{oldStatus}' sang '{newStatus}'. Lý do: {reason}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Member");
        }

        public async Task<bool> IsCCCDExistsAsync(string cccd, string? excludeMemberId = null)
        {
            if (string.IsNullOrEmpty(cccd)) return false;
            
            if (string.IsNullOrEmpty(excludeMemberId))
            {
                return await _context.Members.AnyAsync(m => m.CCCD == cccd);
            }
            
            return await _context.Members.AnyAsync(m => m.CCCD == cccd && m.Id != excludeMemberId);
        }
    }

    public class UnitService : IUnitService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;
        private readonly IHubContext<ChatHub> _hubContext;

        public UnitService(ApplicationDbContext context, ILogService logService, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _logService = logService;
            _hubContext = hubContext;
        }

        public async Task<List<Unit>> GetAllUnitsAsync()
        {
            return await _context.Units
                .Include(u => u.Children)
                .Include(u => u.Members)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Unit?> GetUnitByIdAsync(string id)
        {
            return await _context.Units
                .Include(u => u.Children)
                .Include(u => u.Parent)
                .Include(u => u.Members)
                .FirstOrDefaultAsync(u => u.Id == id);
        }

        public async Task<List<Unit>> GetRootUnitsAsync()
        {
            return await _context.Units
                .Where(u => u.ParentId == null)
                .Include(u => u.Children)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<Unit>> GetChildrenAsync(string parentId)
        {
            return await _context.Units
                .Where(u => u.ParentId == parentId)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Unit> CreateUnitAsync(Unit unit)
        {
            unit.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Units.Add(unit);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "CREATE", "Unit", unit.Id, $"Thiết lập đơn vị mới: {unit.Name} ({unit.Code})");
            
            await _hubContext.Clients.All.SendAsync("DataUpdated", "Unit");
            return unit;
        }

        public async Task UpdateUnitAsync(Unit unit)
        {
            _context.Units.Update(unit);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "UPDATE", "Unit", unit.Id, $"Cập nhật thông tin đơn vị: {unit.Name}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Unit");
        }

        public async Task DeleteUnitAsync(string id)
        {
            var unit = await GetUnitByIdAsync(id);
            if (unit == null) throw new Exception("Không tìm thấy đơn vị.");

            if (unit.Children.Any())
            {
                throw new Exception($"Không thể xóa đơn vị '{unit.Name}' vì vẫn còn {unit.Children.Count} đơn vị trực thuộc. Vui lòng xóa hoặc chuyển các đơn vị con trước.");
            }

            // Handle reports - if any reports exist, delete them first to avoid FK constraint
            var reports = await _context.MovementReports.Where(r => r.UnitId == id).ToListAsync();
            if (reports.Any())
            {
                _context.MovementReports.RemoveRange(reports);
            }

            var unitName = unit.Name;
            _context.Units.Remove(unit);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "DELETE", "Unit", id, $"Xóa đơn vị: {unitName}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Unit");
        }
    }

    public class ActivityService : IActivityService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;
        private readonly IHubContext<ChatHub> _hubContext;

        public ActivityService(ApplicationDbContext context, ILogService logService, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _logService = logService;
            _hubContext = hubContext;
        }

        public async Task<List<Activity>> GetAllActivitiesAsync()
        {
            return await _context.Activities
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Activity?> GetActivityByIdAsync(string id)
        {
            return await _context.Activities
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<Activity> CreateActivityAsync(Activity activity)
        {
            activity.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Activities.Add(activity);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "CREATE", "Activity", activity.Id, $"Tạo hoạt động mới: {activity.Title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Activity");
            return activity;
        }

        public async Task UpdateActivityAsync(Activity activity)
        {
            var local = _context.Activities
                .Local
                .FirstOrDefault(entry => entry.Id.Equals(activity.Id));

            if (local != null)
            {
                _context.Entry(local).State = EntityState.Detached;
            }

            _context.Activities.Update(activity);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "UPDATE", "Activity", activity.Id, $"Cập nhật hoạt động: {activity.Title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Activity");
        }

        public async Task DeleteActivityAsync(string id)
        {
            var activity = await GetActivityByIdAsync(id);
            if (activity == null) throw new Exception("Activity not found");

            var title = activity.Title;
            _context.Activities.Remove(activity);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "DELETE", "Activity", id, $"Xóa hoạt động: {title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Activity");
        }
    }

    public class KnowledgeBaseService : IKnowledgeBaseService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;
        private readonly IHubContext<ChatHub> _hubContext;

        public KnowledgeBaseService(ApplicationDbContext context, ILogService logService, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _logService = logService;
            _hubContext = hubContext;
        }

        public async Task<List<KnowledgeItem>> GetAllItemsAsync()
        {
            return await _context.KnowledgeItems
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<KnowledgeItem?> GetItemByIdAsync(string id)
        {
            return await _context.KnowledgeItems
                .FirstOrDefaultAsync(k => k.Id == id);
        }

        public async Task<List<KnowledgeItem>> SearchItemsAsync(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm)) return new List<KnowledgeItem>();

            var keywords = searchTerm.Split(new[] { ' ', ',', '.', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length > 1 || char.IsDigit(w[0]) || "ivxlm".Contains(w.ToLower()))
                .Select(w => w.ToLower().Trim())
                .Distinct()
                .ToList();

            if (!keywords.Any()) keywords.Add(searchTerm.ToLower().Trim());

            // For small to medium knowledge bases, fetching and filtering in memory is more reliable for keyword ranking
            var allItems = await _context.KnowledgeItems.AsNoTracking().ToListAsync();
            
            return allItems
                .Select(item => new
                {
                    Item = item,
                    Score = keywords.Count(kw => 
                        (item.Title != null && item.Title.ToLower().Contains(kw)) || 
                        (item.Content != null && item.Content.ToLower().Contains(kw)) ||
                        (item.AttachmentName != null && item.AttachmentName.ToLower().Contains(kw)))
                })
                .Where(x => x.Score > 0)
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Item.UpdatedAt)
                .Select(x => x.Item)
                .Take(10)
                .ToList();
        }

        public async Task<KnowledgeItem> CreateItemAsync(KnowledgeItem item)
        {
            item.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.KnowledgeItems.Add(item);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "CREATE", "Knowledge", item.Id, $"Tạo tài liệu mới: {item.Title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Knowledge");
            return item;
        }

        public async Task UpdateItemAsync(KnowledgeItem item)
        {
            item.UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.KnowledgeItems.Update(item);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "UPDATE", "Knowledge", item.Id, $"Cập nhật tài liệu: {item.Title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Knowledge");
        }

        public async Task DeleteItemAsync(string id)
        {
            var item = await GetItemByIdAsync(id);
            if (item == null) throw new Exception("Knowledge item not found");

            var title = item.Title;
            _context.KnowledgeItems.Remove(item);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync("", "", "DELETE", "Knowledge", id, $"Xóa tài liệu: {title}");

            await _hubContext.Clients.All.SendAsync("DataUpdated", "Knowledge");
        }
    }

    public class DocumentService : IDocumentService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;
        private readonly IHubContext<ChatHub> _hubContext;

        public DocumentService(ApplicationDbContext context, ILogService logService, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _logService = logService;
            _hubContext = hubContext;
        }

        public async Task<List<DocumentCategory>> GetCategoriesAsync()
        {
            return await _context.DocumentCategories.OrderByDescending(c => c.CreatedAt).ToListAsync();
        }

        public async Task<DocumentCategory> CreateCategoryAsync(DocumentCategory category)
        {
            category.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.DocumentCategories.Add(category);
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task DeleteCategoryAsync(string id)
        {
            var category = await _context.DocumentCategories.FindAsync(id);
            if (category != null)
            {
                _context.DocumentCategories.Remove(category);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<List<Document>> GetAllDocumentsAsync()
        {
            return await _context.Documents
                .Include(d => d.Category)
                .Include(d => d.Sender)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Document>> GetDocumentsForUnitAsync(string unitId)
        {
            return await _context.DocumentDistributions
                .Where(dd => dd.UnitId == unitId)
                .Include(dd => dd.Document)
                    .ThenInclude(d => d!.Category)
                .Include(dd => dd.Document)
                    .ThenInclude(d => d!.Sender)
                .OrderByDescending(dd => dd.Document!.CreatedAt)
                .Select(dd => dd.Document!)
                .ToListAsync();
        }

        public async Task<Document?> GetDocumentByIdAsync(string id)
        {
            return await _context.Documents
                .Include(d => d.Category)
                .Include(d => d.Sender)
                .Include(d => d.Distributions)
                    .ThenInclude(dd => dd.Unit)
                .FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task<Document> CreateDocumentAsync(Document document, List<string> targetUnitIds)
        {
            document.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Documents.Add(document);

            foreach (var unitId in targetUnitIds)
            {
                _context.DocumentDistributions.Add(new DocumentDistribution
                {
                    DocumentId = document.Id,
                    UnitId = unitId,
                    Status = "Sent"
                });
            }

            await _context.SaveChangesAsync();
            await _logService.LogActivityAsync(document.SenderId, "", "CREATE", "Document", document.Id, $"Phát hành văn bản: {document.Title}");
            await _hubContext.Clients.All.SendAsync("DataUpdated", "Document");
            return document;
        }

        public async Task<Document> UpdateDocumentAsync(Document document, List<string> targetUnitIds)
        {
            var existingDoc = await _context.Documents
                .Include(d => d.Distributions)
                .FirstOrDefaultAsync(d => d.Id == document.Id);

            if (existingDoc == null) throw new Exception("Document not found");

            existingDoc.Title = document.Title;
            existingDoc.Content = document.Content;
            existingDoc.CategoryId = document.CategoryId;
            existingDoc.Deadline = document.Deadline;

            if (document.FileUrl != null)
            {
                existingDoc.FileUrl = document.FileUrl;
                existingDoc.FileName = document.FileName;
            }

            // Update distributions without resetting existing progress
            var existingDistributions = existingDoc.Distributions.ToList();
            var newUnitIds = targetUnitIds ?? new List<string>();

            // Remove distributions for units that are no longer targeted
            var toRemove = existingDistributions.Where(d => !newUnitIds.Contains(d.UnitId)).ToList();
            _context.DocumentDistributions.RemoveRange(toRemove);

            // Add distributions for newly targeted units
            var existingUnitIds = existingDistributions.Select(d => d.UnitId).ToList();
            foreach (var unitId in newUnitIds)
            {
                if (!existingUnitIds.Contains(unitId))
                {
                    _context.DocumentDistributions.Add(new DocumentDistribution
                    {
                        DocumentId = document.Id,
                        UnitId = unitId,
                        Status = "Sent"
                    });
                }
            }

            await _context.SaveChangesAsync();
            await _logService.LogActivityAsync("", "", "UPDATE", "Document", document.Id, $"Cập nhật văn bản: {document.Title}");
            await _hubContext.Clients.All.SendAsync("DataUpdated", "Document");
            
            return existingDoc;
        }

        public async Task UpdateDocumentStatusAsync(string documentId, string unitId, string status, string? feedback = null)
        {
            var distribution = await _context.DocumentDistributions
                .FirstOrDefaultAsync(dd => dd.DocumentId == documentId && dd.UnitId == unitId);

            if (distribution != null)
            {
                distribution.Status = status;
                if (status == "Received" && distribution.ReceivedAt == null)
                    distribution.ReceivedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                else if (status == "Seen" && distribution.SeenAt == null)
                {
                    distribution.SeenAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    if (distribution.ReceivedAt == null) distribution.ReceivedAt = distribution.SeenAt;
                }
                else if (status == "Processed" && distribution.ProcessedAt == null)
                    distribution.ProcessedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

                if (feedback != null) distribution.Feedback = feedback;

                await _context.SaveChangesAsync();
                await _hubContext.Clients.All.SendAsync("DataUpdated", "DocumentStatus");
            }
        }

        public async Task DeleteDocumentAsync(string id)
        {
            var document = await _context.Documents.FindAsync(id);
            if (document != null)
            {
                _context.Documents.Remove(document);
                await _context.SaveChangesAsync();
                await _logService.LogActivityAsync("", "", "DELETE", "Document", id, $"Xóa văn bản: {document.Title}");
            }
        }

        public async Task<Dictionary<string, int>> GetDocumentStatsAsync(string documentId)
        {
            var distributions = await _context.DocumentDistributions
                .Where(dd => dd.DocumentId == documentId)
                .ToListAsync();

            return new Dictionary<string, int>
            {
                { "Sent", distributions.Count(dd => dd.Status == "Sent") },
                { "Received", distributions.Count(dd => dd.Status == "Received") },
                { "Seen", distributions.Count(dd => dd.Status == "Seen") },
                { "Processed", distributions.Count(dd => dd.Status == "Processed") },
                { "Total", distributions.Count }
            };
        }
    }
}