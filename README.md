# VAWES - React (Sprint 4)

    npm install
    npm run dev

Oldalak: `/` (lejátszó + lista), `/lista/:id`, `/kereses`, `/konyvtar`.
Az adatbázis backend a `backend/Vawes` mappában található.
A liquid glass "receptje" a `src/glass.css` tetején lévő változókban hangolható.

## Adatbázis és backend

1. Telepítsd a .NET 10 SDK-t és a MariaDB/MySQL-t.
2. Importáld a `backend/vawes.sql` fájlt a `vawe` adatbázisba.
3. Készíts adatbázis-mentést minden meglévő adatbázis módosítása előtt:

       mysqldump -u root -p vawe > vawe-backup.sql

4. Az alkalmazáshoz hozz létre külön, jelszóval védett adatbázis-felhasználót; ne használd a root felhasználót:

       mysql -u root -p
       CREATE USER 'vawes_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD';
       GRANT SELECT, INSERT, UPDATE, DELETE ON vawe.* TO 'vawes_app'@'localhost';
       EXIT;

   A sémabetöltéshez adminisztrátori adatbázis-fiók szükséges, az alkalmazás futtatásához pedig a külön `vawes_app` fiók.
5. Egyszer futtasd le a katalógushoz szükséges, kizárólag új oszlopokat és indexeket hozzáadó sémát:

       Get-Content backend\catalog-schema.sql | mysql -u root -p vawe

   Ez a lépés nem töröl meglévő adatot.
6. Állítsd be a kapcsolatot környezeti változóval; ne commitolj jelszót. Fejlesztéshez a .NET user-secrets is használható:

       ConnectionStrings__Mysql="server=localhost;database=vawe;user=...;password=..."

   Windows PowerShellben például: `$env:ConnectionStrings__Mysql = "..."`.
   A fejlesztői titok beállítása: `dotnet user-secrets init --project backend\Vawes\Vawes.csproj`, majd `dotnet user-secrets set "ConnectionStrings:Mysql" "<dedicated-user-connection-string>" --project backend\Vawes\Vawes.csproj`. Az alkalmazás szándékosan nem tartalmaz alapértelmezett kapcsolatot; használj dedikált, jelszóval védett `vawes_app` felhasználót.
7. A frontend beépített katalógusának adatbázisba töltése:

       & "C:\Program Files\dotnet\dotnet.exe" run --project backend\Vawes\Vawes.csproj -- --seed-catalog

   Készíts és ellenőrizz biztonsági mentést, mielőtt meglévő adatbázison futtatod. A seed először a slugot, majd slug nélküli előadóknál a nevet, albumoknál az előadót és címet, számoknál az előadót, albumot és címet keresi. A lejátszási listákat csak azonos név és pontosan egyező számlista mellett párosítja; nem egyértelmű egyezéseknél leáll. Nem töröl adatot vagy kapcsolatot, és a már létező, nem üres hangfájl-útvonalat megtartja. A sémában minden listához kötelező `user_id` miatt új katalógusfelhasználót hoz létre véletlen jelszó hashével.
8. Indítsd el az API-t:

       & "C:\Program Files\dotnet\dotnet.exe" run --project backend\Vawes\Vawes.csproj

Az API a `/api/songs`, `/api/artists`, `/api/albums`, `/api/playlists` és `/api/favorites` útvonalakat, valamint az oldalazott listákat és azonosító szerinti lekérést biztosítja. A katalógusadatok keresése a `search` query paraméterrel történik. A Kedvencek olvasásához egyelőre `userId` query paraméter szükséges; hitelesítés a 4. fázis része.

## Frontend és API

       npm install
       npm run dev

Az API alap-URL-je a `VITE_API_BASE_URL` környezeti változó, az `/api` útvonalrésszel együtt, például `http://localhost:5121/api` (az aktuális HTTP launch profil címe). Fejlesztéshez beállíthatod a projekt gyökerében lévő, git által figyelmen kívül hagyott `.env.local` fájlban:

       VITE_API_BASE_URL=http://localhost:5121/api

Ha az API nincs beállítva vagy nem érhető el, a frontend a `public/catalog.snapshot.json` katalógus-pillanatképet használja. Ez biztosítja a GitHub Pages build működését is. A `FrontendOrigins` backend környezeti változóval vesszővel elválasztott további frontend-origin engedélyezhető CORS-hoz (például az éles GitHub Pages domain).

Fejlesztés közben a backend CORS-ja engedélyezi a Vite alapértelmezett `localhost:5173` és `127.0.0.1:5173` címeit.

## MP3-feltöltés és streamelés

Az admin feltöltőoldal fejlesztés közben a `http://localhost:5173/upload.html` címen érhető el. Az API `POST /api/songs` végpontja MP3-at fogad, TagLibSharp segítségével kiolvassa a címkéket és az időtartamot, majd új katalógusbejegyzést hoz létre. A fájlok alapértelmezett helye `backend/storage/songs/uploads`; a `MusicStorage__Directory` változóval másik, tartósan csatolt könyvtár adható meg. A legnagyobb fájlméret 50 MB. A `GET /api/songs/{id}/stream` végpont támogatja a HTTP Range kéréseket, ezért a lejátszó tekerése is működik. A `PUT /api/songs/{id}` a cím, előadó, album és műfaj szerkesztésére, a `DELETE /api/songs/{id}` a katalógusbejegyzés és a feltöltött fájl eltávolítására szolgál.

A feltöltéshez, szerkesztéshez és törléshez az API-n be kell állítani az `Upload__ApiKey` szerveroldali környezeti változót. A kulcsot az adminoldal jelszómezőjébe kell beírni; a böngésző nem menti el, és nem kerül a frontend buildbe. Példa PowerShellben:

    $env:ConnectionStrings__Mysql = "server=localhost;database=vawe;user=...;password=..."
    $env:Upload__ApiKey = Read-Host "Adj meg egy hosszú, véletlen admin kulcsot"
    & "C:\Program Files\dotnet\dotnet.exe" run --project backend\Vawes\Vawes.csproj

Ne használd ugyanazt a jelszót az adatbázishoz és az API-kulcshoz. Éles környezetben csak HTTPS-en keresztül használd az adminoldalt.

## Backend tesztek

A feltöltési, API-kulcs, MP3-validálási, Range-stream, fájltörlési és slug nélküli seed-egyeztetési tesztek külön EF Core memóriadatbázist használnak; nem csatlakoznak és nem írnak a fejlesztői adatbázisba. Futtatás:

    & "C:\Program Files\dotnet\dotnet.exe" test backend\Vawes.Tests\Vawes.Tests.csproj

Teszt vagy build előtt állítsd le a futó API-t a termináljában `Ctrl+C`-vel, különben a Windows zárolhatja a `Vawes.exe` buildkimenetet.

## Docker Compose

A Compose konfiguráció egy külön MySQL-adatbázist és egy API-t indít; az adatbázis és az MP3-ak külön, névvel ellátott kötetekben maradnak meg újraindításkor. Először hozz létre saját, git által figyelmen kívül hagyott konfigurációt, és cseréld le a minta jelszavakat:

    Copy-Item backend\.env.example backend\.env
    # Szerkeszd a backend\.env fájlt, és használj külön, erős jelszavakat.
    docker compose --env-file backend\.env -f backend\docker-compose.yml up --build -d

Az API a `http://localhost:5121` címen érhető el. A Compose szándékosan nem importál sémát automatikusan: csak új, üres Compose-adatbázis esetén importáld a kezdeti sémát és az additív katalógussémát:

    Get-Content backend\vawes.sql -Raw | docker compose --env-file backend\.env -f backend\docker-compose.yml exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
    Get-Content backend\catalog-schema.sql -Raw | docker compose --env-file backend\.env -f backend\docker-compose.yml exec -T mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'

Ez a kezdeti import csak a Compose saját, új adatbázis-kötetére vonatkozik. Ne futtasd meglévő adatbázison; a helyi WAMP-adatbázis és az új Compose-adatbázis egymástól független. A `docker compose down` leállítja a szolgáltatásokat, de megőrzi a köteteket. Ne használd a `down -v` kapcsolót, ha meg akarod tartani az adatbázist vagy a feltöltött zenéket.
Az importszkriptek `vawe` adatbázist használnak, ezért ezekkel a parancsokkal hagyd a `MYSQL_DATABASE=vawe` értéket.

A webes feltöltő GitHub Pages buildje továbbra is statikus. A workflow a Pages `base_path` értékéből állítja be a Vite útvonal-alapját, és `404.html` SPA fallbacket is közzétesz, így az alkalmazás útvonalai közvetlen megnyitáskor/frissítéskor is betöltődnek a repository alatti útvonalon. Távoli használathoz állítsd be a GitHub repository `VITE_API_BASE_URL` nevű Actions variable értékét az éles API `/api` címére; az API-n a `FrontendOrigins` értékével add meg az engedélyezett webhely-origin(eke)t. A `UPLOAD_API_KEY` kizárólag a szerver konfigurációja, soha ne állítsd be `VITE_` változóként.
