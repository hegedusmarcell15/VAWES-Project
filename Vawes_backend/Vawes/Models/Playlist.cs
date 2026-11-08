using System;
using System.Collections.Generic;

namespace Vawes.Models;

public partial class Playlist
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Name { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual ICollection<Song> Songs { get; set; } = new List<Song>();
}
