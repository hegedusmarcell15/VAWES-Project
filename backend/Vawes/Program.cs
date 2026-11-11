using Vawes.Models;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
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
            builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
            builder.Services.AddSingleton<Vawes.Security.AdminEmailAllowlist>();
            builder.Services.AddScoped<IAuthorizationHandler, Vawes.Security.AdminAccessAuthorizationHandler>();
            builder.Services.AddSingleton<Vawes.Services.MusicStorage>();
            builder.Services.AddMemoryCache();
            builder.Services.AddHttpClient<Vawes.Services.DeezerArtworkLookup>(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(3);
                client.DefaultRequestHeaders.UserAgent.ParseAdd("VAWES/1.0");
            });
            builder.Services.AddScoped<Vawes.Security.AdminApiKeyFilter>();

            builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.Cookie.Name = "__Host-vawes-session";
                    options.Cookie.HttpOnly = true;
                    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                    options.Cookie.SameSite = SameSiteMode.None;
                    options.Cookie.Path = "/";
                    options.SlidingExpiration = true;
                    options.ExpireTimeSpan = TimeSpan.FromHours(12);
                    options.Events.OnRedirectToLogin = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        return Task.CompletedTask;
                    };
                    options.Events.OnRedirectToAccessDenied = context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status403Forbidden;
                        return Task.CompletedTask;
                    };
                });
            builder.Services.AddAuthorization(options =>
            {
                options.AddPolicy(Vawes.Security.AdminEmailAllowlist.PolicyName, policy =>
                {
                    policy.RequireAuthenticatedUser();
                    policy.AddRequirements(new Vawes.Security.AdminAccessRequirement());
                });
            });
            var dataProtectionPath = builder.Configuration["DataProtection:KeysPath"];
            if (!string.IsNullOrWhiteSpace(dataProtectionPath))
            {
                Directory.CreateDirectory(dataProtectionPath);
                builder.Services.AddDataProtection()
                    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionPath))
                    .SetApplicationName("VAWES");
            }
            builder.Services.AddRateLimiter(options =>
            {
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
                options.AddPolicy("auth", context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                            AutoReplenishment = true,
                        }));
            });

            // Add services to the container.

            builder.Services.AddCors(options =>
            {
                options.AddPolicy("Frontend", policy =>
                {
                    policy.WithOrigins(Vawes.Security.FrontendOriginValidator.GetAllowedOrigins(builder.Configuration))
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials();
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
            app.UseRateLimiter();
            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
