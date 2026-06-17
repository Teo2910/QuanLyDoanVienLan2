using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLDV.Migrations
{
    /// <inheritdoc />
    public partial class AddImagesJsonToActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImagesJson",
                table: "Activities",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImagesJson",
                table: "Activities");
        }
    }
}
