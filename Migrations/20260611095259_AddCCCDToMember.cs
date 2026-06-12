using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QLDV.Migrations
{
    /// <inheritdoc />
    public partial class AddCCCDToMember : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TargetUnit",
                table: "Movements",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "CCCD",
                table: "Members",
                type: "nvarchar(450)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Members_CCCD",
                table: "Members",
                column: "CCCD",
                unique: true,
                filter: "[CCCD] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Members_CCCD",
                table: "Members");

            migrationBuilder.DropColumn(
                name: "CCCD",
                table: "Members");

            migrationBuilder.AlterColumn<string>(
                name: "TargetUnit",
                table: "Movements",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);
        }
    }
}
