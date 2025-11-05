const defaultSetupHtml = `
  <ul>
    <li>Make sure your full body is visible in the camera frame.</li>
    <li>Stand ~2 meters from your device.</li>
    <li>Good lighting and background contrast help.</li>
    <li>Select an exercise for specific setup instructions.</li>
  </ul>
`;
document.getElementById('setup-steps').innerHTML = defaultSetupHtml;



window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const ex = params.get("exercise");
  if (ex) {
    // Wait for the DOM/buttons to be loaded, then select it
    setTimeout(() => {
      let btn = Array.from(
        document.querySelectorAll(".exercise-options button")
      ).find((b) => b.textContent.toLowerCase().includes(ex.toLowerCase()));
      if (btn) btn.click();
    }, 50);
  }
});
const beepAudio = document.getElementById('beep-audio');
let beepActive = false; // track if beep is currently playing

function playBeepLoop() {
    if (!beepActive) {
        beepActive = true;
        beepAudio.currentTime = 0;
        beepAudio.loop = true;
        beepAudio.play();
    }
}

function stopBeep() {
    if (beepActive) {
        beepActive = false;
        beepAudio.pause();
        beepAudio.currentTime = 0;
        beepAudio.loop = false;
    }
}

// Insert THIS function next:
function handleFeedback(keypoints) {
    const anyRed = keypoints.some(kp => kp.color === 'red');  // Replace with your color detection logic!
    if (anyRed) {
        playBeepLoop();
    } else {
        stopBeep();
    }
}

let detector,
  cameraRunning = false,
  selectedExercise = null,
  poseLoop = null,
  stopRequested = false;
const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const comingSoon = document.getElementById("comingSoon");
const preInstructions = document.getElementById("pre-instructions");
const setupStepsBox = document.getElementById("setup-steps");
const clickSound = new Audio("click.mp3");
const errorSound = new Audio(
  "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9e0be5.mp3"
);
errorSound.volume = 0.5;

let lastCorrect = false;

const EXERCISE_SETUP_STEPS = {
  Squat: [
    "Step 1: Face camera sideways.",
    "Step 2: Stand with feet shoulder-width apart, arms forward.",
    "Step 3: Step back about 2 meters so full body is visible.",
  ],
  "Shoulder Press": [
    "Step 1: Face camera straight on.",
    "Step 2: Hold (imaginary) dumbbells by your shoulders, elbows bent.",
    "Step 3: Stand tall and centered in the frame, 2 meters from camera.",
  ],
  "Bicep Curl": [
    "Step 1: Face camera straight.",
    "Step 2: Arms at your sides, shoulders relaxed,bring your elbows 90° to shoulders.",
    "Step 3: Stand tall 2 meters from camera, make sure both arms are visible.",
  ],
  Plank: [
    "Step 1: Face camera sideways.",
    "Step 2: Align body head-to-heel in a straight line.",
    "Step 3: Keep body centered and visible in view.",
  ],
};

function selectExercise(button, name) {
  selectedExercise = name;
  document
    .querySelectorAll(".exercise-options button")
    .forEach((btn) => btn.classList.remove("active"));
  button.classList.add("active");
  setupStepsBox.innerHTML = EXERCISE_SETUP_STEPS[name]
    .map((step) => `<div class="step">${step}</div>`)
    .join("");
  preInstructions.innerHTML = `<button id="start-btn" class="start-btn" onclick="beginExercise()" style="margin-top:16px;">Start</button>`;
  preInstructions.style.display = "block";
  document.getElementById("camera-container").style.display = "none";
  comingSoon.style.display = "none";
}

window.beginExercise = function () {
  stopRequested = false;
  preInstructions.innerHTML = `<button id="stop-btn" class="stop-btn" onclick="stopExercise()" style="margin-top:16px;background:#ff3232;color:white;">Stop</button>`;
  document.getElementById("camera-container").style.display = "block";
  startWebcam();
};

window.stopExercise = function () {
  stopRequested = true;
  preInstructions.innerHTML = `<button id="start-btn" class="start-btn" onclick="beginExercise()" style="margin-top:16px;">Start</button>`;
  document.getElementById("camera-container").style.display = "none";
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
  if (poseLoop) cancelAnimationFrame(poseLoop);
  cameraRunning = false;
  lastCorrect = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

async function startWebcam() {
  if (cameraRunning) return;
  cameraRunning = true;
  stopRequested = false;
  canvas.width = 450;
  canvas.height = 320;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 450, height: 320 },
    });
    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {}
    );
    poseLoop = requestAnimationFrame(detectPose);
  } catch (err) {
    alert("Webcam access denied or not available.");
    cameraRunning = false;
    document.getElementById("camera-container").style.display = "none";
    comingSoon.style.display = "block";
  }
}

async function detectPose() {
  if (stopRequested || !detector || video.paused || video.ended) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  let feedback = "Move into frame",
    correct = false;
  try {
    const poses = await detector.estimatePoses(video);
    if (poses && poses[0] && Array.isArray(poses[0].keypoints)) {
      [feedback, correct] = drawKeypointsWithFeedback(
        poses[0].keypoints,
        ctx,
        selectedExercise
      );
      drawSkeleton(poses[0].keypoints, ctx);
      showVisualInstruction(feedback, correct);
        handleFeedback(poses[0].keypoints);

    } else {
      showVisualInstruction(feedback, false);
    }
  } catch (err) {
    showVisualInstruction("Pose detection failed", false);
    console.error("Pose estimation failed:", err);
  }
  poseLoop = requestAnimationFrame(detectPose);
}

function showVisualInstruction(feedback, correct) {
  let box = document.getElementById("live-feedback");
  if (!box) {
    box = document.createElement("div");
    box.id = "live-feedback";
    box.style.position = "absolute";
    box.style.left = "40px";
    box.style.top = "30px";
    box.style.zIndex = 20;
    box.style.background = "rgba(16,34,43,0.84)";
    box.style.borderRadius = "12px";
    box.style.padding = "15px 38px";
    box.style.color = correct ? "#49ff6a" : "#ff3232";
    box.style.fontWeight = "bold";
    box.style.fontSize = "1.25rem";
    box.style.boxShadow = "0 0 18px #24e6ea55";
    document.getElementById("camera-container").appendChild(box);
  }
  box.innerText = feedback;
  box.style.color = correct ? "#49ff6a" : "#ff3232";
  if (correct && !lastCorrect) clickSound.play();
  if (!correct && lastCorrect) errorSound.play();
  lastCorrect = correct;
}

function drawKeypointsWithFeedback(keypoints, ctx, exercise) {
  if (exercise === "Squat") {
    // Extract keypoints
    const hipL = keypoints[11],
      kneeL = keypoints[13],
      ankleL = keypoints[15];
    const hipR = keypoints[12],
      kneeR = keypoints[14],
      ankleR = keypoints[16];

    if (
      [hipL, kneeL, ankleL, hipR, kneeR, ankleR].every((k) => k.score > 0.45)
    ) {
      // Calculate angle: hip-knee-ankle for both legs
      const thighAngleL = angle(hipL, kneeL, ankleL); // Degrees
      const thighAngleR = angle(hipR, kneeR, ankleR);

      // Correct squat: angle between 60 and 120 degrees
      const leftSquat = thighAngleL >= 60 && thighAngleL <= 120;
      const rightSquat = thighAngleR >= 60 && thighAngleR <= 120;

      // Knee tracking (valgus/varus check)
      const kneeOverAnkleL = Math.abs(kneeL.x - ankleL.x) < 40;
      const kneeOverAnkleR = Math.abs(kneeR.x - ankleR.x) < 40;

      const correct =
        leftSquat && rightSquat && kneeOverAnkleL && kneeOverAnkleR;

      // Feedback
      let feedback = "Squat form correct!";
      if (!leftSquat || !rightSquat)
        feedback = "Bend knees more (don't stand straight)!";
      if (!kneeOverAnkleL || !kneeOverAnkleR)
        feedback = "Keep knees over ankles!";

      // Draw keypoints (green if correct, red if wrong)
      const color = correct ? "#49ff6a" : "#ff3232";
      [hipL, kneeL, ankleL, hipR, kneeR, ankleR].forEach((k) => {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      // Left leg
      ctx.beginPath();
      ctx.moveTo(hipL.x, hipL.y);
      ctx.lineTo(kneeL.x, kneeL.y);
      ctx.lineTo(ankleL.x, ankleL.y);
      ctx.stroke();
      // Right leg
      ctx.beginPath();
      ctx.moveTo(hipR.x, hipR.y);
      ctx.lineTo(kneeR.x, kneeR.y);
      ctx.lineTo(ankleR.x, ankleR.y);
      ctx.stroke();
      ctx.lineWidth = 2;

      return [feedback, correct];
    }
  } else if (exercise === "Shoulder Press") {
    const shoulderL = keypoints[5],
      elbowL = keypoints[7],
      wristL = keypoints[9];
    const shoulderR = keypoints[6],
      elbowR = keypoints[8],
      wristR = keypoints[10];
    if (
      [shoulderL, elbowL, wristL, shoulderR, elbowR, wristR].every(
        (k) => k.score > 0.45
      )
    ) {
      // Arm verticality: difference between x (horizontal) values should be small
      const leftArmVertical =
        Math.abs(wristL.x - elbowL.x) < 40 &&
        Math.abs(elbowL.x - shoulderL.x) < 40;
      const rightArmVertical =
        Math.abs(wristR.x - elbowR.x) < 40 &&
        Math.abs(elbowR.x - shoulderR.x) < 40;

      // Elbow angles
      const elbowAngleL = angle(shoulderL, elbowL, wristL);
      const elbowAngleR = angle(shoulderR, elbowR, wristR);
      // Good form: arm nearly vertical AND elbow angle between ~80 and 170 deg
      const leftArmCorrect =
        leftArmVertical && elbowAngleL > 80 && elbowAngleL < 170;
      const rightArmCorrect =
        rightArmVertical && elbowAngleR > 80 && elbowAngleR < 170;

      const correct = leftArmCorrect && rightArmCorrect;

      // Detailed feedback
      let feedback = "Shoulder press form correct!";
      if (!leftArmVertical || !rightArmVertical) {
        feedback = "Keep arms vertical!";
      } else if (
        !(elbowAngleL > 80 && elbowAngleL < 170) ||
        !(elbowAngleR > 80 && elbowAngleR < 170)
      ) {
        feedback = "Elbow angle incorrect, press up/down!";
      }

      const color = correct ? "#49ff6a" : "#ff3232";
      [shoulderL, elbowL, wristL, shoulderR, elbowR, wristR].forEach((k) => {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      // Left arm
      ctx.beginPath();
      ctx.moveTo(shoulderL.x, shoulderL.y);
      ctx.lineTo(elbowL.x, elbowL.y);
      ctx.lineTo(wristL.x, wristL.y);
      ctx.stroke();
      // Right arm
      ctx.beginPath();
      ctx.moveTo(shoulderR.x, shoulderR.y);
      ctx.lineTo(elbowR.x, elbowR.y);
      ctx.lineTo(wristR.x, wristR.y);
      ctx.stroke();
      ctx.lineWidth = 2;

      return [feedback, correct];
    }
  } else if (exercise === "Bicep Curl") {
    const shoulderL = keypoints[5],
      elbowL = keypoints[7],
      wristL = keypoints[9];
    const shoulderR = keypoints[6],
      elbowR = keypoints[8],
      wristR = keypoints[10];

    if (
      [shoulderL, elbowL, wristL, shoulderR, elbowR, wristR].every(
        (k) => k.score > 0.45
      )
    ) {
      // Calculate angle at elbow (shoulder-elbow-wrist) for both arms
      const angleElbowL = angle(shoulderL, elbowL, wristL);
      const angleElbowR = angle(shoulderR, elbowR, wristR);

      // Tolerance for 90°
      const tolerance = 15; // degrees

      // Mark form correct only when BOTH elbows are around 90°
      const correctL = Math.abs(angleElbowL - 90) < tolerance;
      const correctR = Math.abs(angleElbowR - 90) < tolerance;
      const correct = correctL && correctR;

      // Feedback
      let feedback = "Bicep curl form correct!";
      if (!correct) {
        feedback =
          " Turn sideways, elbows must bend to 90° for a correct curl!";
      }

      const color = correct ? "#49ff6a" : "#ff3232";
      // Draw left arm keypoints
      [shoulderL, elbowL, wristL].forEach((k) => {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      });
      // Draw right arm keypoints
      [shoulderR, elbowR, wristR].forEach((k) => {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      // Draw left arm
      ctx.beginPath();
      ctx.moveTo(shoulderL.x, shoulderL.y);
      ctx.lineTo(elbowL.x, elbowL.y);
      ctx.lineTo(wristL.x, wristL.y);
      ctx.stroke();
      // Draw right arm
      ctx.beginPath();
      ctx.moveTo(shoulderR.x, shoulderR.y);
      ctx.lineTo(elbowR.x, elbowR.y);
      ctx.lineTo(wristR.x, wristR.y);
      ctx.stroke();
      ctx.lineWidth = 2;

      return [feedback, correct];
    }
  } else if (exercise === "Plank") {
    // Keypoints (use right side for illustration, left is analogous)
    const shoulder = keypoints[6],
      hip = keypoints[12],
      knee = keypoints[14],
      ankle = keypoints[16];

    if ([shoulder, hip, knee, ankle].every((k) => k && k.score > 0.45)) {
      // Calculate angles:
      const hipAngle = angle(shoulder, hip, ankle); // Should be close to 180 if body straight
      const kneeAngle = angle(hip, knee, ankle); // Should be close to 180 for straight leg

      // Check if person is nearly standing (vertical body axis)
      const bodyVertical =
        Math.abs(shoulder.y - hip.y) > Math.abs(shoulder.x - hip.x) * 2;

      let feedback;
      let correct;

      if (bodyVertical) {
        feedback = "Bend down to plank position!";
        correct = false;
      } else if (
        hipAngle >= 160 &&
        hipAngle <= 175 &&
        kneeAngle >= 170 &&
        kneeAngle <= 180
      ) {
        feedback = "Perfect plank! Body and legs are straight.";
        correct = true;
      } else if (hipAngle < 160) {
        feedback = "Don't let your hips sag—keep body straight!";
        correct = false;
      } else if (hipAngle > 175) {
        feedback = "Don't raise your hips too high!";
        correct = false;
      } else if (kneeAngle < 170) {
        feedback = "Keep your legs straight in plank!";
        correct = false;
      } else {
        feedback = "Adjust position for a better plank!";
        correct = false;
      }

      const color = correct ? "#49ff6a" : "#ff3232";
      [shoulder, hip, knee, ankle].forEach((k) => {
        ctx.beginPath();
        ctx.arc(k.x, k.y, 7, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(shoulder.x, shoulder.y);
      ctx.lineTo(hip.x, hip.y);
      ctx.lineTo(knee.x, knee.y);
      ctx.lineTo(ankle.x, ankle.y);
      ctx.stroke();
      ctx.lineWidth = 2;

      return [feedback, correct];
    }
  }

  // Always show present keypoints in fallback color
  keypoints.forEach((k) => {
    if (k && k.score > 0.4) {
      ctx.beginPath();
      ctx.arc(k.x, k.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = "#24e6ea";
      ctx.fill();
    }
  });
  return ["Move into frame", false];
}

function drawSkeleton(keypoints, ctx) {
  const adjacentKeyPoints = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [0, 5],
    [0, 6],
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [5, 6],
    [5, 11],
    [6, 12],
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
  ];
  adjacentKeyPoints.forEach((pair) => {
    const kp1 = keypoints[pair[0]],
      kp2 = keypoints[pair[1]];
    if (kp1 && kp1.score > 0.4 && kp2 && kp2.score > 0.4) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.strokeStyle = "#24e6ea";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

function angle(a, b, c) {
  let ab = { x: a.x - b.x, y: a.y - b.y };
  let cb = { x: c.x - b.x, y: c.y - b.y };
  let dot = ab.x * cb.x + ab.y * cb.y;
  let magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  let magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  let cosine = dot / (magAB * magCB);
  return Math.acos(cosine) * (180 / Math.PI);
}

// Set up default state
document.getElementById("camera-container").style.display = "none";
comingSoon.style.display = "block";
setupStepsBox.innerHTML = "";
preInstructions.innerHTML = "Select an exercise to begin.";