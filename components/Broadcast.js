import React, { useEffect, useRef, useState } from "react";
import { usePermissions } from "@/hooks/usePermission";
import IVSBroadcastClient, {
  LocalStageStream,
  Stage,
  StageEvents,
  StreamType,
  SubscribeType,
} from "amazon-ivs-web-broadcast";

const VideoBroadcast = ({ ingestEndpoint, stageToken, streamKey }) => {
  const canvasRef = useRef();
  const videoRefs = useRef([]);
  const [participants, setParticipants] = useState([]);
  const client = IVSBroadcastClient.create({
    // Enter the desired stream configuration
    streamConfig: IVSBroadcastClient.BASIC_LANDSCAPE,
    // Enter the ingest endpoint from the AWS console or CreateChannel API
    ingestEndpoint: ingestEndpoint,
  });
  const streamConfig = IVSBroadcastClient.BASIC_LANDSCAPE;
  useEffect(() => {
    const initializeStream = async () => {
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
      client.enableVideo();
      client.enableAudio();
      console.log(canvasRef.current);
      // Attach the canvas preview
      client.attachPreview(canvasRef.current);

      if (streamKey) {
        client.startBroadcast(streamKey);
      }

      const refreshVideoPositions = () => {
        participants.forEach((participant, index) =>
          client.updateVideoDeviceComposition(`video-${participant.id}`, {
            index: 0,
            width: streamConfig.maxResolution.width / participants.length,
            x: index * (streamConfig.maxResolution.width / participants.length),
          })
        );
      };

      stage.on(
        StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED,
        async (participant, streams) => {
          console.log("STAGE_PARTICIPANT_STREAMS_ADDED", participant);

          // Check if the participant already exists
          console.log(participants, participants.includes(participant));
          if (
            !participants.some(
              (existingParticipant) => existingParticipant.id === participant.id
            )
          ) {
            setParticipants([...participants, participant]);
          }

          // Wait for video elements to render (using a state update)
          // await new Promise((resolve) => setTimeout(resolve));
          console.log(videoRefs.current);
          const video = videoRefs.current.find((v) => {
            console.log(v.dataset);
            return v.dataset.participantId === participant.id;
          });
          if (!video) return;

          // Attach the participant's streams
          const streamsToDisplay = participant.isLocal
            ? streams.filter((stream) => stream.streamType === StreamType.VIDEO)
            : streams;
          video.srcObject = new MediaStream(
            streamsToDisplay.map((stream) => stream.mediaStreamTrack)
          );

          // Require to call before addVideoInputDevice
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
                    width:
                      streamConfig.maxResolution.width / participants.length,
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
        }
      );

      stage.on(
        StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED,
        async (participant) => {
          console.log("STAGE_PARTICIPANT_STREAMS_REMOVED", participant);

          // Remove participant from broadcast
          setParticipants((prevParticipants) =>
            prevParticipants.filter((exist) => exist.id !== participant.id)
          );
          client.removeVideoInputDevice(`video-${participant.id}`);
          client.removeAudioInputDevice(`audio-${participant.id}`);
          refreshVideoPositions();
        }
      );

      stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, async (participant) => {
        console.log("STAGE_PARTICIPANT_JOINED", participant);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, async (_participant) => {
        console.log("STAGE_PARTICIPANT_LEFT", participants);
      });

      await stage.join();
    };

    initializeStream();

    return (stage, localStream) => {
      if (stage) {
        stage.leave();
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }

      if (client) {
        client.stopBroadcast();
        client.detachPreview();
      }
    };
  }, [ingestEndpoint, stageToken, streamKey, participants]);

  const addToVideoRefs = (el) => {
    if (el && !videoRefs.current.includes(el)) {
      videoRefs.current.push(el);
    }
  };
  console.log(participants);

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%" }}
      ></canvas>
      {participants.map((participant) => (
        <video
          style={{ display: "none" }}
          key={participant.id}
          data-participant-id={participant.id}
          ref={addToVideoRefs}
          hidden
          playsInline
          autoPlay
          muted
          controls
        ></video>
      ))}
    </div>
  );
};

export default VideoBroadcast;
