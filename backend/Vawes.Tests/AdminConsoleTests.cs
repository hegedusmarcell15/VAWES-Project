using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Vawes.Models;

namespace Vawes.Tests;

public sealed class AdminConsoleTests
{
    [Fact]
    public async Task AdminEndpointsRequireAnAllowlistedSession()
    {
        using var factory = new VawesApplicationFactory();
        using var anonymous = factory.CreateClient();

        var unauthorized = await anonymous.GetAsync("/api/admin/summary");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);

        var registered = await anonymous.PostAsJsonAsync("/api/auth/register", new
        {
            username = "listener",
            email = "listener@example.com",
            password = "StrongPass123",
        });
        Assert.Equal(HttpStatusCode.Created, registered.StatusCode);

        var login = await anonymous.PostAsJsonAsync("/api/auth/login", new
        {
            identifier = "listener",
            password = "StrongPass123",
            rememberMe = false,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = login.Headers.GetValues("Set-Cookie").First().Split(';')[0];
        anonymous.DefaultRequestHeaders.Add("Cookie", cookie);

        var forbidden = await anonymous.GetAsync("/api/admin/summary");
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
    }

    [Fact]
    public async Task SummaryCountsOnlySongsWithAudioFiles()
    {
        using var factory = new VawesApplicationFactory();
        using var client = await CreateAdminClient(factory);
        await SeedSong(factory, "No audio", string.Empty);
        await SeedSong(factory, "With audio", "uploads/track.mp3", createFile: true);

        var summary = await client.GetFromJsonAsync<JsonElement>("/api/admin/summary");

        Assert.Equal(2, summary.GetProperty("tracks").GetInt32());
        Assert.Equal(1, summary.GetProperty("playableTracks").GetInt32());
        Assert.Equal(1, summary.GetProperty("missingAudio").GetInt32());
    }

    [Fact]
    public async Task AdminCanUpdateAndDeleteSongAndWriteAuditEntries()
    {
        using var factory = new VawesApplicationFactory();
        using var client = await CreateAdminClient(factory);
        var songId = await SeedSong(factory, "Original", "uploads/track.mp3", createFile: true);
        var audioPath = Path.Combine(factory.StorageDirectory, "uploads", "track.mp3");

        var update = await client.PutAsJsonAsync($"/api/admin/songs/{songId}", new
        {
            title = "Updated",
            artist = "New artist",
            album = "New album",
            genre = "Pop",
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var delete = await client.DeleteAsync($"/api/admin/songs/{songId}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);
        Assert.False(File.Exists(audioPath));

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
        Assert.False(await context.Songs.AnyAsync(song => song.Id == songId));
        Assert.True(await context.AdminAuditLog.CountAsync() >= 2);
    }

    [Fact]
    public async Task AdminCanPromoteUserAndIssuePasswordReset()
    {
        using var factory = new VawesApplicationFactory();
        using var client = await CreateAdminClient(factory);
        int listenerId;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
            context.Users.Add(new User
            {
                Username = "listener",
                Email = "listener@example.com",
                PasswordHash = "unused",
                CreatedAt = DateTime.UtcNow,
            });
            await context.SaveChangesAsync();
            listenerId = context.Users.Single(user => user.Email == "listener@example.com").Id;
        }

        var promote = await client.PutAsJsonAsync(
            $"/api/admin/users/{listenerId}",
            new { isAdmin = true });
        Assert.Equal(HttpStatusCode.OK, promote.StatusCode);

        var reset = await client.PostAsync($"/api/admin/users/{listenerId}/reset-password", null);
        Assert.Equal(HttpStatusCode.OK, reset.StatusCode);
        var result = await reset.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrWhiteSpace(result.GetProperty("token").GetString()));

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<VaweContext>();
        Assert.True((await verifyContext.Users.FindAsync(listenerId))!.IsAdmin);
        Assert.Single(verifyContext.PasswordResetTokens.Where(token => token.UserId == listenerId));
    }

    private static async Task<HttpClient> CreateAdminClient(VawesApplicationFactory factory)
    {
        var client = factory.CreateClient();
        using (var scope = factory.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var user = new User
            {
                Username = "admin",
                Email = "fxadamg@vawes.app",
                IsAdmin = true,
                CreatedAt = DateTime.UtcNow,
            };
            user.PasswordHash = services.GetRequiredService<IPasswordHasher<User>>()
                .HashPassword(user, "StrongPass123");
            var context = services.GetRequiredService<VaweContext>();
            context.Users.Add(user);
            await context.SaveChangesAsync();
        }

        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            identifier = "admin",
            password = "StrongPass123",
            rememberMe = false,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = login.Headers.GetValues("Set-Cookie").First().Split(';')[0];
        client.DefaultRequestHeaders.Add("Cookie", cookie);
        return client;
    }

    private static async Task<int> SeedSong(
        VawesApplicationFactory factory,
        string title,
        string filePath,
        bool createFile = false)
    {
        if (createFile)
        {
            var directory = Path.Combine(factory.StorageDirectory, "uploads");
            Directory.CreateDirectory(directory);
            await File.WriteAllBytesAsync(Path.Combine(directory, "track.mp3"), [1, 2, 3]);
        }

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
        var artist = new Artist { Name = $"Artist {Guid.NewGuid():N}", CreatedAt = DateTime.UtcNow };
        context.Artists.Add(artist);
        var song = new Song
        {
            Title = title,
            Artist = artist,
            DurationSec = 42,
            FilePath = filePath,
            UploadedAt = DateTime.UtcNow,
        };
        context.Songs.Add(song);
        await context.SaveChangesAsync();
        return song.Id;
    }
}
