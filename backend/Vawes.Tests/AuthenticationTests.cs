using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Vawes.Models;

namespace Vawes.Tests;

public sealed class AuthenticationTests
{
    [Fact]
    public async Task RegistrationRejectsDuplicatesAndNeverReturnsPasswordHash()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        var request = new { username = "listener", email = "listener@example.com", password = "StrongPass123" };

        var created = await client.PostAsJsonAsync("/api/auth/register", request);
        var responseBody = await created.Content.ReadAsStringAsync();
        var duplicate = await client.PostAsJsonAsync("/api/auth/register", request);
        var duplicateEmail = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username = "anotherlistener",
            email = "LISTENER@example.com",
            password = "StrongPass123",
        });

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.DoesNotContain("PasswordHash", responseBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("password_hash", responseBody, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, duplicateEmail.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
        var user = Assert.Single(context.Users);
        Assert.NotEqual(request.password, user.PasswordHash);
        Assert.False(user.IsAdmin);
    }

    [Fact]
    public async Task LoginSetsHttpOnlyCookieAndRejectsIncorrectCredentials()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        await Register(client, "listener", "listener@example.com");

        var invalid = await client.PostAsJsonAsync("/api/auth/login", new
        {
            identifier = "listener",
            password = "WrongPassword123",
            rememberMe = false,
        });
        Assert.Equal(HttpStatusCode.Unauthorized, invalid.StatusCode);

        var cookie = await SignIn(client, "listener", "StrongPass123");
        Assert.StartsWith("__Host-vawes-session=", cookie, StringComparison.Ordinal);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);

        client.DefaultRequestHeaders.Add("Cookie", cookie.Split(';')[0]);
        var current = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal("listener", current.GetProperty("user").GetProperty("username").GetString());
        using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        logoutRequest.Headers.Add("Origin", "http://localhost:5173");
        var logout = await client.SendAsync(logoutRequest);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
    }

    [Fact]
    public async Task LogoutAllowsTrustedOriginAndClearsSession()
    {
        using var factory = new VawesApplicationFactory();
        using var client = await CreateAuthenticatedClient(factory, "trustedlogout");

        var logout = await SendLogout(client, origin: "https://vawes.app");

        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
    }

    [Fact]
    public async Task LogoutRejectsUntrustedOriginEvenWithTrustedReferer()
    {
        using var factory = new VawesApplicationFactory();
        using var client = await CreateAuthenticatedClient(factory, "untrustedlogout");

        var logout = await SendLogout(
            client,
            origin: "https://attacker.example",
            referer: "https://vawes.app/account");

        Assert.Equal(HttpStatusCode.Forbidden, logout.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task LogoutRejectsNullOriginEvenWithTrustedReferer()
    {
        using var factory = new VawesApplicationFactory();
        using var client = await CreateAuthenticatedClient(factory, "nulloriginlogout");

        var logout = await SendLogout(client, origin: "null", referer: "https://vawes.app/account");

        Assert.Equal(HttpStatusCode.Forbidden, logout.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task LogoutWithoutOriginUsesTrustedRefererAndRejectsMissingReferer()
    {
        using var factory = new VawesApplicationFactory();
        using var trustedRefererClient = await CreateAuthenticatedClient(factory, "refererlogout");
        using var noProvenanceClient = await CreateAuthenticatedClient(factory, "noprovenancelogout");

        var trustedRefererLogout = await SendLogout(
            trustedRefererClient,
            referer: "https://vawes.app/account");
        var noProvenanceLogout = await SendLogout(noProvenanceClient);

        Assert.Equal(HttpStatusCode.NoContent, trustedRefererLogout.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, noProvenanceLogout.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await noProvenanceClient.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task AdminStatusAndEndpointsRequireDatabaseFlagAndAllowlistedEmail()
    {
        using var factory = new VawesApplicationFactory();
        using var allowedAdmin = factory.CreateClient();
        using var unlistedAdmin = factory.CreateClient();
        using var listedNonAdmin = factory.CreateClient();

        await SeedUser(factory, "allowedadmin", "FXADAMG@VAWES.APP", isAdmin: true);
        await SeedUser(factory, "unlistedadmin", "other-admin@example.com", isAdmin: true);
        await SeedUser(factory, "listeduser", "fxmarcellg@vawes.app", isAdmin: false);

        var allowedLogin = await SignInAndGetUser(allowedAdmin, "allowedadmin", "StrongPass123");
        Assert.True(allowedLogin.GetProperty("user").GetProperty("isAdmin").GetBoolean());
        var currentUser = await allowedAdmin.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.True(currentUser.GetProperty("user").GetProperty("isAdmin").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, (await allowedAdmin.GetAsync("/users/AllUser")).StatusCode);

        var unlistedLogin = await SignInAndGetUser(unlistedAdmin, "unlistedadmin", "StrongPass123");
        Assert.False(unlistedLogin.GetProperty("user").GetProperty("isAdmin").GetBoolean());
        var unlistedCurrentUser = await unlistedAdmin.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.False(unlistedCurrentUser.GetProperty("user").GetProperty("isAdmin").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await unlistedAdmin.GetAsync("/users/AllUser")).StatusCode);

        var listedLogin = await SignInAndGetUser(listedNonAdmin, "listeduser", "StrongPass123");
        Assert.False(listedLogin.GetProperty("user").GetProperty("isAdmin").GetBoolean());
        Assert.Equal(HttpStatusCode.Forbidden, (await listedNonAdmin.GetAsync("/users/AllUser")).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
            var user = await context.Users.SingleAsync(item => item.Username == "allowedadmin");
            user.IsAdmin = false;
            await context.SaveChangesAsync();
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await allowedAdmin.GetAsync("/users/AllUser")).StatusCode);
    }

    [Fact]
    public async Task FavoritesArePrivateAndRequireAuthentication()
    {
        using var factory = new VawesApplicationFactory();
        using var firstClient = factory.CreateClient();
        using var secondClient = factory.CreateClient();
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
            var artist = new Artist { Name = "Test artist", Slug = "test-artist", CreatedAt = DateTime.UtcNow };
            var song = new Song
            {
                Title = "Test song",
                Slug = "test-song",
                Artist = artist,
                DurationSec = 60,
                FilePath = "uploads/test.mp3",
                UploadedAt = DateTime.UtcNow,
            };
            context.Songs.Add(song);
            await context.SaveChangesAsync();
        }

        await Register(firstClient, "first", "first@example.com");
        await Register(secondClient, "second", "second@example.com");
        firstClient.DefaultRequestHeaders.Add("Cookie", await SignIn(firstClient, "first", "StrongPass123"));
        secondClient.DefaultRequestHeaders.Add("Cookie", await SignIn(secondClient, "second", "StrongPass123"));

        var unauthorized = await factory.CreateClient().GetAsync("/api/favorites");
        var add = await firstClient.PutAsync("/api/favorites/test-song", null);
        var firstFavorites = await firstClient.GetFromJsonAsync<JsonElement>("/api/favorites");
        var secondFavorites = await secondClient.GetFromJsonAsync<JsonElement>("/api/favorites");

        Assert.Equal(HttpStatusCode.Unauthorized, unauthorized.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, add.StatusCode);
        Assert.Equal(1, firstFavorites.GetProperty("total").GetInt32());
        Assert.Equal(0, secondFavorites.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task PersonalPlaylistsCannotBeReadOrChangedByAnotherUser()
    {
        using var factory = new VawesApplicationFactory();
        using var owner = factory.CreateClient();
        using var other = factory.CreateClient();
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<VaweContext>();
            var artist = new Artist { Name = "Playlist artist", Slug = "playlist-artist", CreatedAt = DateTime.UtcNow };
            context.Songs.Add(new Song
            {
                Title = "Playlist song",
                Slug = "playlist-song",
                Artist = artist,
                DurationSec = 120,
                FilePath = "uploads/playlist.mp3",
                UploadedAt = DateTime.UtcNow,
            });
            context.Songs.Add(new Song
            {
                Title = "Second playlist song",
                Slug = "playlist-song-2",
                Artist = artist,
                DurationSec = 180,
                FilePath = "uploads/playlist-2.mp3",
                UploadedAt = DateTime.UtcNow,
            });
            await context.SaveChangesAsync();
        }
        await Register(owner, "owner", "owner@example.com");
        await Register(other, "other", "other@example.com");
        owner.DefaultRequestHeaders.Add("Cookie", await SignIn(owner, "owner", "StrongPass123"));
        other.DefaultRequestHeaders.Add("Cookie", await SignIn(other, "other", "StrongPass123"));

        var create = await owner.PostAsJsonAsync("/api/playlists", new { name = "My tracks" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var createdPlaylist = await create.Content.ReadFromJsonAsync<JsonElement>();
        var playlistId = createdPlaylist.GetProperty("id").GetString();
        var otherRead = await other.GetAsync($"/api/playlists/{playlistId}");
        var otherUpdate = await other.PutAsJsonAsync($"/api/playlists/{playlistId}", new
        {
            name = "Changed",
            songIds = Array.Empty<string>(),
        });
        var ownerUpdate = await owner.PutAsJsonAsync($"/api/playlists/{playlistId}", new
        {
            name = "My tracks",
            songIds = new[] { "playlist-song-2", "playlist-song" },
        });
        var savedPlaylist = await owner.GetFromJsonAsync<JsonElement>($"/api/playlists/{playlistId}");

        Assert.Equal(HttpStatusCode.NotFound, otherRead.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, otherUpdate.StatusCode);
        Assert.Equal(HttpStatusCode.OK, ownerUpdate.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/playlists/{playlistId}")).StatusCode);
        Assert.Equal(
            new[] { "playlist-song-2", "playlist-song" },
            savedPlaylist.GetProperty("song_ids").EnumerateArray().Select(song => song.GetString()).ToArray());
    }

    private static async Task Register(HttpClient client, string username, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            username,
            email,
            password = "StrongPass123",
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static async Task<HttpClient> CreateAuthenticatedClient(
        VawesApplicationFactory factory,
        string username)
    {
        var client = factory.CreateClient();
        var email = $"{username}@example.com";
        await Register(client, username, email);
        var cookie = await SignIn(client, username, "StrongPass123");
        client.DefaultRequestHeaders.Add("Cookie", cookie.Split(';')[0]);
        return client;
    }

    private static async Task<HttpResponseMessage> SendLogout(
        HttpClient client,
        string? origin = null,
        string? referer = null)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        if (origin is not null)
            request.Headers.TryAddWithoutValidation("Origin", origin);
        if (referer is not null)
            request.Headers.Referrer = new Uri(referer);
        return await client.SendAsync(request);
    }

    private static async Task<string> SignIn(HttpClient client, string username, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            identifier = username,
            password,
            rememberMe = true,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return Assert.Single(response.Headers.GetValues("Set-Cookie"));
    }

    private static async Task SeedUser(
        VawesApplicationFactory factory,
        string username,
        string email,
        bool isAdmin)
    {
        using var scope = factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var user = new User
        {
            Username = username,
            Email = email,
            IsAdmin = isAdmin,
            CreatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = services.GetRequiredService<IPasswordHasher<User>>()
            .HashPassword(user, "StrongPass123");
        var context = services.GetRequiredService<VaweContext>();
        context.Users.Add(user);
        await context.SaveChangesAsync();
    }

    private static async Task<JsonElement> SignInAndGetUser(HttpClient client, string identifier, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            identifier,
            password,
            rememberMe = false,
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie")).Split(';')[0];
        client.DefaultRequestHeaders.Add("Cookie", cookie);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).Clone();
    }
}
