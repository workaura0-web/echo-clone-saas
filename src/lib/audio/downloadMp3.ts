export async function downloadAudioAsMp3(
  audioUrl: string,
  baseFileName: string
): Promise<void> {
  const safeBase = baseFileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "echo_voice";

  let blob: Blob;

  if (audioUrl.startsWith("data:")) {
    const commaIdx = audioUrl.indexOf(",");
    const header = commaIdx >= 0 ? audioUrl.slice(0, commaIdx) : "";
    const base64Data = commaIdx >= 0 ? audioUrl.slice(commaIdx + 1) : audioUrl;
    const isWav = header.includes("audio/wav");
    const mimeType = isWav ? "audio/wav" : "audio/mpeg";

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    blob = new Blob([bytes], { type: mimeType });
  } else {
    const response = await fetch(audioUrl);
    blob = await response.blob();
  }

  const ext = blob.type.includes("wav") ? "wav" : "mp3";
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${safeBase}.${ext}`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 4000);
}
