using System.Text.Json;
using System.Collections.Concurrent;
using System.Text;
using Microsoft.Extensions.Caching.Memory;

namespace Vawes.Services;

public sealed class DeezerArtworkLookup(
    HttpClient httpClient,
    IMemoryCache cache,
    ILogger<DeezerArtworkLookup> logger)
{
    private readonly ConcurrentDictionary<string, SemaphoreSlim> lookupLocks = new(StringComparer.Ordinal);

    public async Task<string?> FindAlbumCoverAsync(
        string album,
        string artist,
        CancellationToken cancellationToken)
    {
        var cacheKey = $"deezer:{Normalize(artist)}:{Normalize(album)}";
        if (cache.TryGetValue(cacheKey, out string? cached)) return cached;
        var lookupLock = lookupLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        await lookupLock.WaitAsync(cancellationToken);
        try
        {
            if (cache.TryGetValue(cacheKey, out cached)) return cached;
            var cover = await FindAlbumCoverUncached(album, artist, cancellationToken);
            cache.Set(cacheKey, cover, TimeSpan.FromHours(6));
            return cover;
        }
        finally
        {
            lookupLock.Release();
        }
    }

    private async Task<string?> FindAlbumCoverUncached(
        string album,
        string artist,
        CancellationToken cancellationToken)
    {
        var query = Uri.EscapeDataString($"album:\"{album}\" artist:\"{artist}\"");
        try
        {
            using var response = await httpClient.GetAsync(
                $"https://api.deezer.com/search/album?q={query}&limit=10",
                cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Deezer album search returned HTTP {StatusCode}.", response.StatusCode);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            if (!document.RootElement.TryGetProperty("data", out var results) ||
                results.ValueKind != JsonValueKind.Array)
                return null;

            foreach (var result in results.EnumerateArray())
            {
                if (result.ValueKind != JsonValueKind.Object ||
                    !result.TryGetProperty("title", out var titleElement) ||
                    titleElement.ValueKind != JsonValueKind.String ||
                    !result.TryGetProperty("artist", out var artistElement) ||
                    artistElement.ValueKind != JsonValueKind.Object ||
                    !artistElement.TryGetProperty("name", out var artistNameElement) ||
                    artistNameElement.ValueKind != JsonValueKind.String ||
                    !result.TryGetProperty("cover_xl", out var coverElement) ||
                    coverElement.ValueKind != JsonValueKind.String)
                    continue;

                var resultTitle = titleElement.GetString();
                var resultArtist = artistNameElement.GetString();
                var cover = coverElement.GetString();
                if (string.IsNullOrWhiteSpace(cover) ||
                    !string.Equals(Normalize(resultTitle), Normalize(album), StringComparison.Ordinal) ||
                    !string.Equals(Normalize(resultArtist), Normalize(artist), StringComparison.Ordinal))
                    continue;
                return cover;
            }
            return null;
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Deezer album artwork lookup failed.");
            return null;
        }
        catch (TaskCanceledException exception) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(exception, "Deezer album artwork lookup timed out.");
            return null;
        }
        catch (JsonException exception)
        {
            logger.LogWarning(exception, "Deezer returned an invalid album search response.");
            return null;
        }
    }

    private static string Normalize(string? value)
    {
        var normalized = (value ?? string.Empty).Normalize(NormalizationForm.FormKC).ToLowerInvariant();
        var withoutPunctuation = new string(normalized.Where(character => !char.IsPunctuation(character)).ToArray());
        return string.Join(" ", withoutPunctuation.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }
}
