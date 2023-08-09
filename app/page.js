"use client";
import Broadcast from "@/components/Broadcast";
import { useEffect, useState } from "react";

export default function Home() {
  const [ingestEndpoint, setIngestEndpoint] = useState("");
  const [stageToken, setStageToken] = useState("");
  const [streamKey, setStreamKey] = useState("");
  const [nowPlaying, setNowPlaying] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setNowPlaying(true);
  };

  return (
    <main>
      {nowPlaying && (
        <div>
          <Broadcast
            ingestEndpoint={ingestEndpoint}
            streamKey={streamKey}
            stageToken={stageToken}
          />
        </div>
      )}
      <div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="ingestEndpoint">Ingest Endpoint</label>
          <input
            type="text"
            id="ingestEndpoint"
            name="ingestEndpoint"
            value={ingestEndpoint}
            onChange={(e) => setIngestEndpoint(e.target.value)}
          />
          <label htmlFor="stageToken">Stage Token</label>
          <input
            type="text"
            id="stageToken"
            name="stageToken"
            value={stageToken}
            onChange={(e) => setStageToken(e.target.value)}
          />
          <label htmlFor="streamKey">Stream Key</label>
          <input
            type="text"
            id="streamKey"
            name="streamKey"
            value={streamKey}
            onChange={(e) => setStreamKey(e.target.value)}
          />
          <button type="submit">Go Live</button>
        </form>
      </div>
    </main>
  );
}
