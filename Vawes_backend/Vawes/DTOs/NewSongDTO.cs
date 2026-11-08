namespace Vawes.Models.DTOs
{
    public class NewSongDTO
    {
        public string? Title { get; set; }

        public int? ArtistId { get; set; }

        public int? AlbumId { get; set; }

        public int? DurationSec { get; set; }

        public string? Genre { get; set; }

        public string? FilePath { get; set; }
    }
}
