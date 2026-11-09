using Vawes.Models;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

namespace Vawes
{
    public partial class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var connectionString = builder.Configuration.GetConnectionString("Mysql")
                ?? throw new InvalidOperationException(
                    "Connection string 'Mysql' is not configured. Set ConnectionStrings__Mysql before starting the API.");

            builder.Services.AddDbContext<VaweContext>(options =>
                options.UseMySQL(connectionString));
            builder.Services.AddSingleton<Vawes.Services.MusicStorage>();
            builder.Services.AddScoped<Vawes.Security.AdminApiKeyFilter>();

            // Add services to the container.

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                {
                    var configuredOrigins = builder.Configuration["FrontendOrigins"]?
                        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        ?? [];
                    policy.WithOrigins(new[]
                        {
                            "http://localhost:5173",
                            "http://127.0.0.1:5173",
                            "https://hegedusmarcell15.github.io",
                            "https://vawes.app",
                        }
                            .Concat(configuredOrigins)
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .ToArray())
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });

            builder.Services.AddControllers();
            // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
            builder.Services.AddOpenApi();

            var app = builder.Build();

            if (args.Contains("--seed-catalog", StringComparer.Ordinal))
            {
                await using var scope = app.Services.CreateAsyncScope();
                await Vawes.Services.CatalogSeeder.SeedAsync(scope.ServiceProvider);
                return;
            }

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.MapOpenApi();
                app.MapScalarApiReference();
            }

            app.UseHttpsRedirection();

            app.UseCors("Frontend");
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
