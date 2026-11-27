using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Vawes.DTOs;
using Vawes.Models;

namespace Vawes.Tests;

public sealed class MusicUploadTests
{
    [Fact]
    public async Task Upload_RequiresAdminLogin()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent([1, 2, 3]), "file", "track.mp3");

        var response = await client.PostAsync("/api/songs", content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Upload_RejectsFilesThatAreNotMp3()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        await SignInAsAdmin(factory, client);
        using var request = CreateUploadRequest([1, 2, 3], "not-music.txt");

        var response = await client.PostAsync("/api/songs", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadRejectsCorruptMp3()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        await SignInAsAdmin(factory, client);
        using var request = CreateUploadRequest([1, 2, 3], "corrupt.mp3");

        var response = await client.PostAsync("/api/songs", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Upload_StreamRangeAndDelete_PersistAndCleanUpAudio()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        await SignInAsAdmin(factory, client);
        using var request = CreateUploadRequest(CreateMp3Frames(), "sample.mp3");

        var uploadResponse = await client.PostAsync("/api/songs", request);

        Assert.Equal(HttpStatusCode.Created, uploadResponse.StatusCode);
        var uploaded = await uploadResponse.Content.ReadFromJsonAsync<MusicUploadResponse>();
        Assert.NotNull(uploaded);
        Assert.Equal("Integration test track", uploaded.Song.Title);
        Assert.Equal("Integration test artist", uploaded.Song.Artist);
        Assert.StartsWith("uploads/", uploaded.Song.FilePath, StringComparison.Ordinal);

        var storagePath = Path.Combine(
            factory.StorageDirectory,
            uploaded.Song.FilePath.Replace('/', Path.DirectorySeparatorChar));
        Assert.True(File.Exists(storagePath));

        using var rangeRequest = new HttpRequestMessage(HttpMethod.Get, $"/api/songs/{uploaded.Song.Id}/stream");
        rangeRequest.Headers.Range = new RangeHeaderValue(0, 31);
        using var rangeResponse = await client.SendAsync(rangeRequest);
        Assert.Equal(HttpStatusCode.PartialContent, rangeResponse.StatusCode);
        Assert.Equal(32, (await rangeResponse.Content.ReadAsByteArrayAsync()).Length);
        Assert.Equal(0L, rangeResponse.Content.Headers.ContentRange?.From);
        Assert.Equal(31L, rangeResponse.Content.Headers.ContentRange?.To);

        var deleteResponse = await client.DeleteAsync($"/api/songs/{uploaded.Song.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        Assert.False(File.Exists(storagePath));
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/songs/{uploaded.Song.Id}")).StatusCode);
    }

    [Fact]
    public async Task Upload_RejectsDuplicateMetadata()
    {
        using var factory = new VawesApplicationFactory();
        using var client = factory.CreateClient();
        await SignInAsAdmin(factory, client);

        using var first = CreateUploadRequest(CreateMp3Frames(), "first.mp3");
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsync("/api/songs", first)).StatusCode);

        using var duplicate = CreateUploadRequest(CreateMp3Frames(), "duplicate.mp3");
        var response = await client.PostAsync("/api/songs", duplicate);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private static MultipartFormDataContent CreateUploadRequest(byte[] audioBytes, string fileName)
    {
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(audioBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
        content.Add(fileContent, "file", fileName);
        content.Add(new StringContent("Integration test track"), "title");
        content.Add(new StringContent("Integration test artist"), "artist");
        return content;
    }

    private static async Task SignInAsAdmin(VawesApplicationFactory factory, HttpClient client)
    {
        using (var scope = factory.Services.CreateScope())
        {
            var services = scope.ServiceProvider;
            var user = new User
            {
                Username = "uploadadmin",
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
            identifier = "uploadadmin",
            password = "StrongPass123",
            rememberMe = false,
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var cookie = Assert.Single(login.Headers.GetValues("Set-Cookie")).Split(';')[0];
        client.DefaultRequestHeaders.Add("Cookie", cookie);
    }

    private static byte[] CreateMp3Frames()
    {
        const int frameLength = 417;
        const int frameCount = 30;
        var bytes = new byte[frameLength * frameCount];
        for (var frame = 0; frame < frameCount; frame++)
        {
            var offset = frame * frameLength;
            bytes[offset] = 0xff;
            bytes[offset + 1] = 0xfb;
            bytes[offset + 2] = 0x90;
            bytes[offset + 3] = 0x64;
        }
        return bytes;
    }
}
