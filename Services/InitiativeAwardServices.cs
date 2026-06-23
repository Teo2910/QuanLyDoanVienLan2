using QLDV.Models;
using QLDV.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace QLDV.Services
{
    public interface IInitiativeService
    {
        Task<List<Initiative>> GetAllInitiativesAsync();
        Task<List<Initiative>> GetInitiativesByUnitAsync(string unitId);
        Task<Initiative?> GetInitiativeByIdAsync(string id);
        Task<Initiative> CreateInitiativeAsync(Initiative initiative);
        Task UpdateInitiativeAsync(Initiative initiative);
        Task DeleteInitiativeAsync(string id);
        Task<Dictionary<string, int>> GetInitiativeCountByFieldAsync(string? unitId = null);
        Task<Dictionary<string, int>> GetInitiativeCountByUnitAsync();
    }

    public interface IAwardService
    {
        Task<List<Award>> GetAllAwardsAsync();
        Task<List<Award>> GetAwardsByUnitAsync(string unitId);
        Task<Award?> GetAwardByIdAsync(string id);
        Task<Award> CreateAwardAsync(Award award);
        Task UpdateAwardAsync(Award award);
        Task DeleteAwardAsync(string id);
        Task<Dictionary<string, int>> GetAwardCountByUnitAsync();
    }

    public class InitiativeService : IInitiativeService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;

        public InitiativeService(ApplicationDbContext context, ILogService logService)
        {
            _context = context;
            _logService = logService;
        }

        public async Task<List<Initiative>> GetAllInitiativesAsync()
        {
            return await _context.Initiatives
                .Include(i => i.Author)
                .Include(i => i.Unit)
                .OrderByDescending(i => i.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<Initiative>> GetInitiativesByUnitAsync(string unitId)
        {
            return await _context.Initiatives
                .Where(i => i.UnitId == unitId)
                .Include(i => i.Author)
                .Include(i => i.Unit)
                .OrderByDescending(i => i.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Initiative?> GetInitiativeByIdAsync(string id)
        {
            return await _context.Initiatives
                .Include(i => i.Author)
                .Include(i => i.Unit)
                .FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task<Initiative> CreateInitiativeAsync(Initiative initiative)
        {
            initiative.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Initiatives.Add(initiative);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "CREATE", "Initiative", initiative.Id,
                $"Tạo sáng kiến mới: {initiative.Name}");

            return initiative;
        }

        public async Task UpdateInitiativeAsync(Initiative initiative)
        {
            _context.Initiatives.Update(initiative);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "UPDATE", "Initiative", initiative.Id,
                $"Cập nhật sáng kiến: {initiative.Name}");
        }

        public async Task DeleteInitiativeAsync(string id)
        {
            var initiative = await GetInitiativeByIdAsync(id);
            if (initiative == null) throw new Exception("Không tìm thấy sáng kiến");

            _context.Initiatives.Remove(initiative);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "DELETE", "Initiative", id,
                $"Xóa sáng kiến: {initiative.Name}");
        }

        public async Task<Dictionary<string, int>> GetInitiativeCountByFieldAsync(string? unitId = null)
        {
            var query = _context.Initiatives.AsQueryable();
            if (!string.IsNullOrEmpty(unitId))
            {
                query = query.Where(i => i.UnitId == unitId);
            }

            return await query
                .GroupBy(i => i.Field)
                .Select(g => new { Field = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Field, x => x.Count);
        }

        public async Task<Dictionary<string, int>> GetInitiativeCountByUnitAsync()
        {
            return await _context.Initiatives
                .Include(i => i.Unit)
                .GroupBy(i => i.Unit!.Name)
                .Select(g => new { UnitName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UnitName, x => x.Count);
        }
    }

    public class AwardService : IAwardService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogService _logService;

        public AwardService(ApplicationDbContext context, ILogService logService)
        {
            _context = context;
            _logService = logService;
        }

        public async Task<List<Award>> GetAllAwardsAsync()
        {
            return await _context.Awards
                .Include(a => a.Member)
                .Include(a => a.Unit)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<List<Award>> GetAwardsByUnitAsync(string unitId)
        {
            return await _context.Awards
                .Where(a => a.UnitId == unitId)
                .Include(a => a.Member)
                .Include(a => a.Unit)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<Award?> GetAwardByIdAsync(string id)
        {
            return await _context.Awards
                .Include(a => a.Member)
                .Include(a => a.Unit)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<Award> CreateAwardAsync(Award award)
        {
            award.CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _context.Awards.Add(award);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "CREATE", "Award", award.Id,
                $"Tạo khen thưởng mới: {award.Content}");

            return award;
        }

        public async Task UpdateAwardAsync(Award award)
        {
            _context.Awards.Update(award);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "UPDATE", "Award", award.Id,
                $"Cập nhật khen thưởng: {award.Content}");
        }

        public async Task DeleteAwardAsync(string id)
        {
            var award = await GetAwardByIdAsync(id);
            if (award == null) throw new Exception("Không tìm thấy khen thưởng");

            _context.Awards.Remove(award);
            await _context.SaveChangesAsync();

            await _logService.LogActivityAsync(
                "", "", "DELETE", "Award", id,
                $"Xóa khen thưởng: {award.Content}");
        }

        public async Task<Dictionary<string, int>> GetAwardCountByUnitAsync()
        {
            return await _context.Awards
                .Include(a => a.Unit)
                .GroupBy(a => a.Unit!.Name)
                .Select(g => new { UnitName = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.UnitName, x => x.Count);
        }
    }
}
