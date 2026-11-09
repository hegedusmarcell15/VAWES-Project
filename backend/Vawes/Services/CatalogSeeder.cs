using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Vawes.Models;

namespace Vawes.Services;

public static class CatalogSeeder
{
    private const string CatalogUsername = "vawes-catalog";
    private const string CatalogEmail = "catalog@vawes.invalid";

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        await using var context = services.GetRequiredService<VaweContext>();
        var catalogPath = Path.Combine(AppContext.BaseDirectory, "catalog.snapshot.json");
        if (!File.Exists(catalogPath))
            throw new FileNotFoundException("The bundled catalog snapshot was not copied to the backend output.", catalogPath);

        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        var seed = JsonSerializer.Deserialize<CatalogSeed>(
            await File.ReadAllTextAsync(catalogPath, cancellationToken),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidDataException("The catalog snapshot is empty or invalid.");

        if (seed.Artists.Count == 0 || seed.Albums.Count == 0 || seed.Songs.Count == 0 || seed.Playlists.Count == 0)
            throw new InvalidDataException("The catalog snapshot is missing one or more catalog collections.");

        var systemUser = await context.Users.FirstOrDefaultAsync(
            user => user.Username == CatalogUsername && user.Email == CatalogEmail,
            cancellationToken);
        if (systemUser is null)
        {
            if (await context.Users.AnyAsync(
                    user => user.Username == CatalogUsername || user.Email == CatalogEmail,
                    cancellationToken))
                throw new InvalidOperationException("The reserved VAWES catalog user name or email is already in use.");

            systemUser = new User
            {
                Username = CatalogUsername,
                Email = CatalogEmail,
                CreatedAt = DateTime.UtcNow,
            };
            var oneTimePassword = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            systemUser.PasswordHash = new PasswordHasher<User>().HashPassword(systemUser, oneTimePassword);
            context.Users.Add(systemUser);
            await context.SaveChangesAsync(cancellationToken);
        }

        var existingArtists = await context.Artists.ToListAsync(cancellationToken);
        var artists = existingArtists.Where(artist => artist.Slug != null).ToDictionary(
            artist => artist.Slug!,
            StringComparer.Ordinal);
        foreach (var item in seed.Artists)
        {
            if (!artists.TryGetValue(item.Id, out var artist))
            {
                artist = FindUnique(
                    existingArtists,
                    existing => string.Equals(existing.Name, item.Name, StringComparison.OrdinalIgnoreCase),
                    $"artist '{item.Name}'");
                if (artist is null)
                {
                    artist = new Artist { CreatedAt = DateTime.UtcNow };
                    context.Artists.Add(artist);
                    existingArtists.Add(artist);
                }
                EnsureSlugAvailable(artists, item.Id, artist, $"artist '{item.Name}'");
                artists.Add(item.Id, artist);
            }
            artist.Slug = item.Id;
            artist.Name = item.Name;
            artist.Bio = item.Bio;
            artist.CoverUrl = item.CoverUrl;
        }
        await context.SaveChangesAsync(cancellationToken);

        var existingAlbums = await context.Albums.ToListAsync(cancellationToken);
        var albums = existingAlbums.Where(album => album.Slug != null).ToDictionary(
            album => album.Slug!,
            StringComparer.Ordinal);
        foreach (var item in seed.Albums)
        {
            if (!artists.TryGetValue(item.ArtistId, out var artist))
                throw new InvalidDataException($"Album '{item.Id}' refers to missing artist '{item.ArtistId}'.");

            if (!albums.TryGetValue(item.Id, out var album))
            {
                album = FindUnique(
                    existingAlbums,
                    existing => existing.ArtistId == artist.Id &&
                                string.Equals(existing.Title, item.Title, StringComparison.OrdinalIgnoreCase),
                    $"album '{item.Title}' by '{artist.Name}'");
                if (album is null)
                {
                    album = new Album { CreatedAt = DateTime.UtcNow };
                    context.Albums.Add(album);
                    existingAlbums.Add(album);
                }
                EnsureSlugAvailable(albums, item.Id, album, $"album '{item.Title}'");
                albums.Add(item.Id, album);
            }
            album.Slug = item.Id;
            album.Title = item.Title;
            album.Artist = artist;
            album.CoverUrl = item.CoverUrl;
        }
        await context.SaveChangesAsync(cancellationToken);

        var existingSongs = await context.Songs.ToListAsync(cancellationToken);
        var songs = existingSongs.Where(song => song.Slug != null).ToDictionary(
            song => song.Slug!,
            StringComparer.Ordinal);
        foreach (var item in seed.Songs)
        {
            if (!artists.TryGetValue(item.ArtistId, out var artist))
                throw new InvalidDataException($"Song '{item.Id}' refers to missing artist '{item.ArtistId}'.");

            if (!albums.TryGetValue(item.AlbumId, out var album))
                throw new InvalidDataException($"Song '{item.Id}' refers to missing album '{item.AlbumId}'.");

            if (!songs.TryGetValue(item.Id, out var song))
            {
                song = FindUnique(
                    existingSongs,
                    existing => existing.ArtistId == artist.Id &&
                                existing.AlbumId == album.Id &&
                                string.Equals(existing.Title, item.Title, StringComparison.OrdinalIgnoreCase),
                    $"song '{item.Title}' by '{artist.Name}' on '{album.Title}'");
                if (song is null)
                {
                    song = new Song
                    {
                        FilePath = item.FilePath ?? string.Empty,
                        UploadedAt = DateTime.UtcNow,
                    };
                    context.Songs.Add(song);
                    existingSongs.Add(song);
                }
                EnsureSlugAvailable(songs, item.Id, song, $"song '{item.Title}'");
                songs.Add(item.Id, song);
            }
            song.Slug = item.Id;
            song.Title = item.Title;
            song.Artist = artist;
            song.Album = album;
            if (item.DurationSec > 0)
                song.DurationSec = item.DurationSec;
            if (!string.IsNullOrWhiteSpace(item.FilePath))
                song.FilePath = item.FilePath;
        }
        await context.SaveChangesAsync(cancellationToken);

        var existingPlaylists = await context.Playlists.Include(playlist => playlist.Songs)
            .ToListAsync(cancellationToken);
        var playlists = existingPlaylists.Where(playlist => playlist.Slug != null).ToDictionary(
            playlist => playlist.Slug!,
            StringComparer.Ordinal);
        foreach (var item in seed.Playlists)
        {
            if (!playlists.TryGetValue(item.Id, out var playlist))
            {
                var expectedSongIds = item.SongIds.ToHashSet(StringComparer.Ordinal);
                playlist = FindUnique(
                    existingPlaylists,
                    existing => string.Equals(existing.Name, item.Name, StringComparison.OrdinalIgnoreCase) &&
                                existing.Songs.Select(song => song.Slug)
                                    .Where(slug => slug is not null)
                                    .ToHashSet(StringComparer.Ordinal)
                                    .SetEquals(expectedSongIds),
                    $"playlist '{item.Name}' with the same tracks");
                if (playlist is null)
                {
                    playlist = new Playlist { User = systemUser };
                    context.Playlists.Add(playlist);
                    existingPlaylists.Add(playlist);
                }
                EnsureSlugAvailable(playlists, item.Id, playlist, $"playlist '{item.Name}'");
                playlists.Add(item.Id, playlist);
            }
            playlist.Slug = item.Id;
            playlist.Name = item.Name;
            playlist.Color = item.Color;
            playlist.Type = item.Type;
            playlist.Recent = item.Recent;
            playlist.Tracks = item.Tracks;
            playlist.Minutes = item.Minutes;
            playlist.CoverUrl = item.CoverUrl;
        }

        await context.SaveChangesAsync(cancellationToken);

        foreach (var item in seed.Playlists)
        {
            var playlist = playlists[item.Id];
            foreach (var songId in item.SongIds)
            {
                if (!songs.TryGetValue(songId, out var song))
                    throw new InvalidDataException($"Playlist '{item.Id}' refers to missing song '{songId}'.");
                if (!playlist.Songs.Any(existingSong => existingSong.Slug == songId))
                    playlist.Songs.Add(song);
            }
        }

        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        Console.WriteLine($"Seeded catalog: {seed.Artists.Count} artists, {seed.Albums.Count} albums, {seed.Songs.Count} songs, {seed.Playlists.Count} playlists.");
    }

    private static T? FindUnique<T>(IEnumerable<T> items, Func<T, bool> predicate, string identity)
        where T : class
    {
        T? match = null;
        foreach (var item in items.Where(predicate))
        {
            if (match is not null)
                throw new InvalidDataException(
                    $"More than one existing {identity} matches the catalog. Resolve the duplicate records before seeding.");
            match = item;
        }
        return match;
    }

    private static void EnsureSlugAvailable<T>(
        IReadOnlyDictionary<string, T> recordsBySlug,
        string slug,
        T record,
        string identity)
        where T : class
    {
        if (recordsBySlug.TryGetValue(slug, out var existing) && !ReferenceEquals(existing, record))
            throw new InvalidDataException(
                $"The slug '{slug}' for {identity} is already assigned to a different record.");
    }

    public sealed class CatalogSeed
    {
        public List<ArtistSeed> Artists { get; set; } = [];
        public List<AlbumSeed> Albums { get; set; } = [];
        public List<SongSeed> Songs { get; set; } = [];
        public List<PlaylistSeed> Playlists { get; set; } = [];
    }

    public sealed class ArtistSeed
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Bio { get; set; }
        [JsonPropertyName("cover_url")]
        public string? CoverUrl { get; set; }
    }

    public sealed class AlbumSeed
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        [JsonPropertyName("artist_id")]
        public string ArtistId { get; set; } = string.Empty;
        [JsonPropertyName("cover_url")]
        public string? CoverUrl { get; set; }
    }

    public sealed class SongSeed
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        [JsonPropertyName("artist_id")]
        public string ArtistId { get; set; } = string.Empty;
        [JsonPropertyName("album_id")]
        public string AlbumId { get; set; } = string.Empty;
        [JsonPropertyName("duration_sec")]
        public int DurationSec { get; set; }
        [JsonPropertyName("file_path")]
        public string? FilePath { get; set; }
    }

    public sealed class PlaylistSeed
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "violet";
        public int Tracks { get; set; }
        public int Minutes { get; set; }
        public string Type { get; set; } = "vawes";
        public int Recent { get; set; }
        [JsonPropertyName("cover_url")]
        public string? CoverUrl { get; set; }
        [JsonPropertyName("song_ids")]
        public List<string> SongIds { get; set; } = [];
    }
}
