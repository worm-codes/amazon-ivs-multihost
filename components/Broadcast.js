import React, { useRef, useEffect, useState } from "react";
import IVSBroadcastClient, {
  LocalStageStream,
  Stage,
  StageEvents,
  StreamType,
  SubscribeType,
} from "amazon-ivs-web-broadcast";
import { usePermissions } from "@/hooks/usePermission";

function Broadcast({ ingestEndpoint, stageToken, streamKey }) {
  const canvasRef = useRef(null);
  const videosRef = useRef([]);
  const [participants, setParticipants] = useState([]);
  const stageRef = useRef(null);

  const client = IVSBroadcastClient.create({
    streamConfig: IVSBroadcastClient.BASIC_LANDSCAPE,
    ingestEndpoint: ingestEndpoint,
  });
  const streamConfig = IVSBroadcastClient.BASIC_LANDSCAPE;

  const refreshVideoPositions = () => {
    participants.forEach((participant, index) => {
      client.updateVideoDeviceComposition(`video-${participant.id}`, {
        index: 0,
        width: streamConfig.maxResolution.width / participants.length,
        x: index * (streamConfig.maxResolution.width / participants.length),
      });
    });
  };

  const handleParticipantStreamsAdded = async (participant, streams) => {
    console.log("STAGE_PARTICIPANT_STREAMS_ADDED", participant);

    setParticipants((prevParticipants) => [
      ...new Set([...prevParticipants, participant]),
    ]);

    await new Promise((resolve) => requestAnimationFrame(resolve)); // Simulating nextTick behavior
    console.log(videosRef.current, "videoref");
    const video = videosRef.current.find(
      (v) => v.dataset.participantId === participant.id
    );
    console.log(video, "video");
    if (!video) return;

    const streamsToDisplay = participant.isLocal
      ? streams.filter((stream) => stream.streamType === StreamType.VIDEO)
      : streams;
    console.log(streamsToDisplay, "stream");
    video.srcObject = new MediaStream(
      streamsToDisplay.map((stream) => stream.mediaStreamTrack)
    );

    await video.play();

    await Promise.all([
      ...streams
        .filter((stream) => stream.streamType === StreamType.VIDEO)
        .map((stream) =>
          client.addVideoInputDevice(
            new MediaStream([stream.mediaStreamTrack]),
            `video-${participant.id}`,
            {
              index: 0,
              width: streamConfig.maxResolution.width / participants.length,
              x:
                (participants.length - 1) *
                (streamConfig.maxResolution.width / participants.length),
            }
          )
        ),
      ...streams
        .filter((stream) => stream.streamType === StreamType.AUDIO)
        .map((stream) =>
          client.addAudioInputDevice(
            new MediaStream([stream.mediaStreamTrack]),
            `audio-${participant.id}`
          )
        ),
    ]);

    refreshVideoPositions();
  };

  const handleParticipantStreamsRemoved = async (participant) => {
    console.log("STAGE_PARTICIPANT_STREAMS_REMOVED", participant);

    setParticipants((prevParticipants) =>
      prevParticipants.filter((exist) => exist.id !== participant.id)
    );

    client.removeVideoInputDevice(`video-${participant.id}`);
    client.removeAudioInputDevice(`audio-${participant.id}`);

    refreshVideoPositions();
  };

  const handleParticipantJoined = (participant) => {
    console.log("STAGE_PARTICIPANT_JOINED", participant);
  };

  const handleParticipantLeft = () => {
    console.log("STAGE_PARTICIPANT_LEFT", participants);
  };
  const initialize = async () => {
    await usePermissions();

    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");
    const audioDevices = devices.filter((d) => d.kind === "audioinput");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: audioDevices[0].deviceId },
      video: { deviceId: videoDevices[0].deviceId },
    });
    const audioTrack = new LocalStageStream(stream.getAudioTracks()[0]);
    const videoTrack = new LocalStageStream(stream.getVideoTracks()[0]);

    const stage = new Stage(stageToken, {
      stageStreamsToPublish() {
        return [audioTrack, videoTrack];
      },
      shouldPublishParticipant(participant) {
        return true;
      },
      shouldSubscribeToParticipant(participant) {
        return SubscribeType.AUDIO_VIDEO;
      },
    });
    stageRef.current = stage;

    client?.enableVideo();
    client?.enableAudio();
    console.log(canvasRef.current);
    client?.attachPreview(canvasRef?.current);
    if (streamKey) {
      client?.startBroadcast(streamKey);
    }

    stage.on(
      StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED,
      handleParticipantStreamsAdded
    );
    stage.on(
      StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED,
      handleParticipantStreamsRemoved
    );
    stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, handleParticipantJoined);
    stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, handleParticipantLeft);

    await stage.join();
  };
  if (stageRef.current === null) initialize();

  console.log(participants);

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%" }}
      ></canvas>
      {participants?.map((participant) => (
        <video
          key={participant.id}
          data-participant-id={participant.id}
          ref={(el) => {
            if (el) {
              videosRef.current.push(el);
            }
          }}
          playsInline
          autoPlay
          hidden
          muted
          controls
        ></video>
      ))}
    </div>
  );
}

export default Broadcast;
