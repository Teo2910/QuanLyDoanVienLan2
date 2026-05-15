using Microsoft.EntityFrameworkCore;
using QLDV.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;

namespace QLDV.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Unit> Units { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<StatusChange> StatusChanges { get; set; }
        public DbSet<Activity> Activities { get; set; }
        public DbSet<Movement> Movements { get; set; }
        public DbSet<MovementReport> MovementReports { get; set; }
        public DbSet<KnowledgeItem> KnowledgeItems { get; set; }
        public DbSet<SystemLog> SystemLogs { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // ChatMessage configuration
            modelBuilder.Entity<ChatMessage>()
                .HasKey(c => c.Id);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(c => c.ThreadId);

            modelBuilder.Entity<ChatMessage>()
                .HasIndex(c => c.CreatedAt);

            // Unit configuration
            modelBuilder.Entity<Unit>()
                .HasKey(u => u.Id);

            modelBuilder.Entity<Unit>()
                .HasMany(u => u.Members)
                .WithOne(m => m.Unit)
                .HasForeignKey(m => m.UnitId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Unit>()
                .HasMany(u => u.Children)
                .WithOne(u => u.Parent)
                .HasForeignKey(u => u.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            // Member configuration
            modelBuilder.Entity<Member>()
                .HasKey(m => m.Id);

            modelBuilder.Entity<Member>()
                .HasMany(m => m.StatusHistory)
                .WithOne(s => s.Member)
                .HasForeignKey(s => s.MemberId)
                .OnDelete(DeleteBehavior.Cascade);

            // StatusChange configuration
            modelBuilder.Entity<StatusChange>()
                .HasKey(s => s.Id);

            // Activity configuration
            modelBuilder.Entity<Activity>()
                .HasKey(a => a.Id);

            // Movement configuration
            modelBuilder.Entity<Movement>()
                .HasKey(m => m.Id);

            modelBuilder.Entity<Movement>()
                .HasMany(m => m.Reports)
                .WithOne(r => r.Movement)
                .HasForeignKey(r => r.MovementId)
                .OnDelete(DeleteBehavior.Cascade);

            // MovementReport configuration
            modelBuilder.Entity<MovementReport>()
                .HasKey(r => r.Id);

            modelBuilder.Entity<MovementReport>()
                .HasOne(r => r.Unit)
                .WithMany()
                .HasForeignKey(r => r.UnitId)
                .OnDelete(DeleteBehavior.Restrict);

            // KnowledgeItem configuration
            modelBuilder.Entity<KnowledgeItem>()
                .HasKey(k => k.Id);

            // SystemLog configuration
            modelBuilder.Entity<SystemLog>()
                .HasKey(l => l.Id);

            // Add indexes for common queries
            modelBuilder.Entity<Member>()
                .HasIndex(m => m.UnitId);

            modelBuilder.Entity<Member>()
                .HasIndex(m => m.Status);

            modelBuilder.Entity<Movement>()
                .HasIndex(m => m.CreatorId);

            modelBuilder.Entity<MovementReport>()
                .HasIndex(r => r.MovementId);

            modelBuilder.Entity<MovementReport>()
                .HasIndex(r => r.UnitId);

            modelBuilder.Entity<SystemLog>()
                .HasIndex(l => l.Timestamp);

            modelBuilder.Entity<SystemLog>()
                .HasIndex(l => l.UserId);
        }
    }
}
