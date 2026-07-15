// ----------------------------------------------------
// PRAYER IMAGES ENGINE (REPLACES 3D ENGINE)
// ----------------------------------------------------

const poseImages = {
  'Berdiri': 'sajada/takbit.png',
  "Takbir/I'tidal": 'sajada/takbit.png',
  "Ruku'": 'sajada/rukuk.png',
  'Sujud': 'sajada/sujud.png',
  'Duduk/Tasyahud': 'sajada/duduk_antara.png',
  'Transisi': 'sajada/takbit.png'
};

let currentPoseImgSrc = 'sajada/takbit.png';

function update3DPose(poseName) {
  const imgElement = document.getElementById('prayerPoseImg');
  if (!imgElement) return;

  const targetSrc = poseImages[poseName] || 'sajada/takbit.png';
  if (currentPoseImgSrc === targetSrc) return;

  currentPoseImgSrc = targetSrc;

  // Smooth fade transition
  imgElement.style.opacity = 0.2;
  setTimeout(() => {
    imgElement.src = targetSrc;
    imgElement.style.opacity = 1;
  }, 100);
}

function init3D() {
  console.log("Image-based prayer display engine initialized.");
}
