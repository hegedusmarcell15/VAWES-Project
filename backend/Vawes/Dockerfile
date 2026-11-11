FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY backend/Vawes/Vawes.csproj backend/Vawes/
COPY public/catalog.snapshot.json public/catalog.snapshot.json
RUN dotnet restore backend/Vawes/Vawes.csproj

COPY backend/Vawes/ backend/Vawes/
WORKDIR /src/backend/Vawes
RUN dotnet publish Vawes.csproj --configuration Release --output /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
RUN mkdir -p /var/lib/vawes/songs && chown -R 1654:1654 /var/lib/vawes
ENV ASPNETCORE_URLS=http://+:8080 \
    MusicStorage__Directory=/var/lib/vawes/songs
EXPOSE 8080
USER 1654
ENTRYPOINT ["dotnet", "Vawes.dll"]
