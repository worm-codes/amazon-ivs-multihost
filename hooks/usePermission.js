"use client";
export const usePermissions = async () => {
  let permissions = {
    audio: false,
    video: false,
  };
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    console.log(stream.getTracks());
    for (const track of stream.getTracks()) {
      track.stop();
    }
    permissions = { video: true, audio: true };
  } catch (err) {
    permissions = { video: false, audio: false };
    console.error(err);
  }
  // If we still don't have permissions after requesting them display the error message
  if (!permissions.video) {
    alert("Failed to get video permissions.");
  } else if (!permissions.audio) {
    alert("Failed to get audio permissions.");
  }
};
