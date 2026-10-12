/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — paste the values from your NEW Firebase project
   (Firebase Console → Project Settings → Your apps → Web app)
   ═══════════════════════════════════════════════════════════════ */
  const firebaseConfig = {

    apiKey: "AIzaSyCizPdkeuUd91d9OTFSfWOtxC8a22V_Ssw",

    authDomain: "portal-fitness-d6f60.firebaseapp.com",

    projectId: "portal-fitness-d6f60",

    storageBucket: "portal-fitness-d6f60.firebasestorage.app",

    messagingSenderId: "247954930421",

    appId: "1:247954930421:web:32194024b765734290a3bc"

  };

/* ═══════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect,
  getRedirectResult, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, collection, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fbApp = initializeApp(FIREBASE_CONFIG);
const auth  = getAuth(fbApp);
const db = initializeFirestore(fbApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);
const escapeHTML = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" });

const state = {
  user: null,
  profile: { units: "kg" },
  routines: [],
  workouts: [],
  body: [],
  activeWorkout: null,
  currentRoutineId: null,
  unsubs: []
};

/* ═══════════════════ EXERCISE LIBRARY ═══════════════════ */
const LIBRARY_RAW = [
  ["Barbell Bench Press","Chest","Barbell","Chest","Lie on a flat bench, feet planted. Grip the bar slightly wider than shoulder-width. Lower under control to mid-chest, then press back up in a slight arc."],
  ["Incline Barbell Bench Press","Upper Chest","Barbell","Chest","Set bench to 30–45°. Press the bar from upper chest. Keep elbows at roughly 45° to the torso."],
  ["Decline Barbell Bench Press","Lower Chest","Barbell","Chest","Set bench to a slight decline. Press the bar from lower chest in a straight line."],
  ["Dumbbell Bench Press","Chest","Dumbbell","Chest","Flat bench, dumbbells at chest level. Press up and slightly inward without clanging them together at the top."],
  ["Low Incline Dumbbell Press","Upper Chest","Dumbbell","Chest","Set bench to 15–30°. Press dumbbells from chest level. Ideal for upper chest without shoulder strain."],
  ["Incline Dumbbell Press","Upper Chest","Dumbbell","Chest","Set bench to 30–45°. Press the dumbbells from upper chest, keeping wrists stacked over elbows."],
  ["Decline Dumbbell Press","Lower Chest","Dumbbell","Chest","Decline bench. Press dumbbells from lower chest in a straight line."],
  ["Push-Up","Chest","Bodyweight","Chest","Hands under shoulders, body in a straight line. Lower until chest is near the floor, then press up."],
  ["Diamond Push-Up","Triceps","Bodyweight","Chest","Hands close together forming a diamond under chest. Lower and press while keeping elbows tucked."],
  ["Archer Push-Up","Chest","Bodyweight","Chest","Wide hand placement. Shift weight to one side, keeping the opposite arm straight. Alternate sides."],
  ["Chest Dip","Chest","Bodyweight","Chest","Lean forward slightly on parallel bars. Lower until shoulders are just below elbows, then press back up."],
  ["Cable Fly","Chest","Cable","Chest","Stand between two pulleys, arms out wide. Bring hands together in a hugging arc. Squeeze at the peak."],
  ["Dumbbell Fly","Chest","Dumbbell","Chest","Lie flat with dumbbells above chest. Open arms wide with a slight elbow bend until chest stretches."],
  ["Incline Dumbbell Fly","Upper Chest","Dumbbell","Chest","Incline bench, dumbbells above chest. Open wide and control the stretch at the bottom."],
  ["Pec Deck","Chest","Machine","Chest","Sit with back against pad. Bring arms together in front of chest. Control the negative."],
  ["Machine Chest Press","Chest","Machine","Chest","Adjust seat so handles align with mid-chest. Press forward without locking elbows."],
  ["Landmine Press","Upper Chest","Barbell","Chest","Anchor one end of a barbell. Hold the other end at shoulder height and press up and forward."],
  ["Pull-Up","Lats","Bodyweight","Back","Overhand grip slightly wider than shoulders. Pull until chin clears the bar, then lower under control."],
  ["Chin-Up","Lats","Bodyweight","Back","Underhand grip, shoulder-width. Pull chin over bar, control the descent."],
  ["Neutral Grip Pull-Up","Lats","Bodyweight","Back","Parallel grips. Pull until chin reaches hand height. Easier on shoulders and elbows than regular pull-ups."],
  ["Lat Pulldown","Lats","Cable","Back","Seated, wide overhand grip. Pull bar to upper chest, keeping torso slightly leaned back."],
  ["Barbell Row","Mid Back","Barbell","Back","Hinge at hips until torso is ~45°. Pull bar to lower chest. Keep back neutral throughout."],
  ["Pendlay Row","Mid Back","Barbell","Back","Torso parallel to floor. Pull bar explosively from the floor to lower chest each rep."],
  ["Dumbbell Row","Lats","Dumbbell","Back","One hand on bench. Pull dumbbell to hip, keeping torso stable. Squeeze at top."],
  ["Cable Row","Mid Back","Cable","Back","Seated with slight knee bend. Pull handle to lower chest, driving elbows back."],
  ["T-Bar Row","Mid Back","Barbell","Back","Straddle the bar. Row the handle to your chest with elbows flared slightly."],
  ["Inverted Row","Mid Back","Bodyweight","Back","Lie under a fixed bar. Pull chest to bar with straight body. Add difficulty by elevating feet."],
  ["Straight-Arm Pulldown","Lats","Cable","Back","Stand facing a high pulley, arms straight. Pull the bar down to your thighs in an arc."],
  ["Deadlift","Posterior Chain","Barbell","Back","Feet hip-width, bar over midfoot. Hinge and grab. Drive through legs, keeping back neutral. Lock out hips at top."],
  ["Rack Pull","Posterior Chain","Barbell","Back","Same as deadlift but starting from a rack at knee height. Emphasises upper back."],
  ["Barbell Shrug","Traps","Barbell","Back","Hold bar at hips. Shrug shoulders straight up. Hold for a beat, then lower."],
  ["Dumbbell Shrug","Traps","Dumbbell","Back","Dumbbells at sides. Shrug up toward ears. Avoid rolling shoulders."],
  ["Back Extension","Lower Back","Bodyweight","Back","Use a hyperextension bench. Lower torso under control, then raise back up."],
  ["Good Morning","Hamstrings","Barbell","Back","Bar on upper back. Hinge at hips with a slight knee bend. Feel the stretch in hamstrings."],
  ["Overhead Press","Front Delts","Barbell","Shoulders","Standing, bar at shoulders. Press overhead until arms lock out. Keep core braced."],
  ["Dumbbell Shoulder Press","Front Delts","Dumbbell","Shoulders","Seated or standing. Press dumbbells from shoulder height to overhead."],
  ["Arnold Press","Front Delts","Dumbbell","Shoulders","Start with palms facing you at shoulder height. Rotate palms outward as you press up."],
  ["Lateral Raise","Side Delts","Dumbbell","Shoulders","Arms slightly bent. Raise dumbbells to shoulder height, leading with elbows."],
  ["Cable Lateral Raise","Side Delts","Cable","Shoulders","Stand side-on to a low pulley. Raise the handle out to the side, keeping elbow slightly bent."],
  ["Front Raise","Front Delts","Dumbbell","Shoulders","Raise dumbbells straight in front to shoulder height. Control the descent."],
  ["Rear Delt Fly","Rear Delts","Dumbbell","Shoulders","Hinge forward with back flat. Raise dumbbells out to the sides, squeezing rear delts."],
  ["Reverse Pec Deck","Rear Delts","Machine","Shoulders","Face the pad on a pec deck. Pull handles apart with straight arms."],
  ["Upright Row","Traps","Barbell","Shoulders","Hold bar with a narrow grip. Pull it up to chin, elbows leading."],
  ["Face Pull","Rear Delts","Cable","Shoulders","Set a rope attachment at eye height. Pull toward your face, spreading the ends apart."],
  ["Machine Shoulder Press","Front Delts","Machine","Shoulders","Seated with back against pad. Press handles overhead without locking elbows."],
  ["Pike Push-Up","Front Delts","Bodyweight","Shoulders","Downward dog position, hips high. Lower the top of your head toward the ground, then press up."],
  ["Handstand Push-Up","Front Delts","Bodyweight","Shoulders","Kick up into a handstand against a wall. Lower head to floor, then press up."],
  ["Barbell Back Squat","Quads","Barbell","Legs","Bar on upper traps. Sit back and down, keeping chest up. Descend until thighs are at least parallel."],
  ["Barbell Front Squat","Quads","Barbell","Legs","Bar on front delts, elbows high. Squat down keeping torso upright."],
  ["Goblet Squat","Quads","Dumbbell","Legs","Hold a dumbbell at chest. Squat down between your heels, keeping chest up."],
  ["Bulgarian Split Squat","Quads","Dumbbell","Legs","Rear foot elevated on a bench. Lower the back knee toward the floor, then drive up through the front leg."],
  ["Walking Lunge","Quads","Dumbbell","Legs","Step forward into a lunge. Push off and step through with the opposite leg."],
  ["Reverse Lunge","Quads","Dumbbell","Legs","Step backward into a lunge. Return to standing. Easier on knees than forward lunges."],
  ["Step-Up","Quads","Dumbbell","Legs","Step onto a box with one leg, driving through the heel. Lower under control."],
  ["Leg Press","Quads","Machine","Legs","Feet shoulder-width on platform. Press until legs are nearly straight, then lower under control."],
  ["Hack Squat","Quads","Machine","Legs","Shoulders under pads, feet on platform. Squat down and press back up."],
  ["Leg Extension","Quads","Machine","Legs","Seated, pad over shins. Extend knees fully, squeeze quads at top."],
  ["Lying Leg Curl","Hamstrings","Machine","Legs","Lie face down, pad over heels. Curl heels toward glutes."],
  ["Seated Leg Curl","Hamstrings","Machine","Legs","Seated, pad behind calves. Curl heels under the seat."],
  ["Romanian Deadlift","Hamstrings","Barbell","Legs","Bar at hips. Hinge at the hips, sliding bar down legs until you feel a hamstring stretch."],
  ["Stiff-Leg Deadlift","Hamstrings","Barbell","Legs","Similar to RDL but with more knee extension. Focus on hamstring stretch."],
  ["Sumo Deadlift","Glutes","Barbell","Legs","Wide stance, toes out. Grip the bar between legs. Drive through heels and lock out."],
  ["Barbell Hip Thrust","Glutes","Barbell","Legs","Upper back on bench, bar over hips. Drive hips up until body is straight. Squeeze glutes."],
  ["Glute Bridge","Glutes","Bodyweight","Legs","Lie on back, feet flat. Drive hips up, squeezing glutes at the top."],
  ["Standing Calf Raise","Calves","Machine","Legs","Stand with pads on shoulders. Raise heels, squeeze calves, lower under control."],
  ["Seated Calf Raise","Calves","Machine","Legs","Seated with pads on knees. Press through the balls of your feet, hold, then lower."],
  ["Nordic Curl","Hamstrings","Bodyweight","Legs","Kneel with ankles anchored. Lower your torso forward under control."],
  ["Barbell Curl","Biceps","Barbell","Arms","Standing, underhand grip. Curl bar up without swinging. Squeeze at top."],
  ["EZ Bar Curl","Biceps","Barbell","Arms","Same as barbell curl but with an EZ bar. Easier on the wrists."],
  ["Dumbbell Curl","Biceps","Dumbbell","Arms","Alternate or simultaneous. Curl with palms facing up, control the descent."],
  ["Hammer Curl","Biceps","Dumbbell","Arms","Neutral grip. Curl up while keeping wrists facing each other throughout."],
  ["Preacher Curl","Biceps","Barbell","Arms","Arms on a preacher bench. Curl up, then lower until arms are almost straight."],
  ["Incline Dumbbell Curl","Biceps","Dumbbell","Arms","Lie back on an incline bench. Curl dumbbells with strict form."],
  ["Concentration Curl","Biceps","Dumbbell","Arms","Seated, elbow against inner thigh. Curl up with strict focus."],
  ["Cable Curl","Biceps","Cable","Arms","Standing with a low pulley. Curl the handle up, keeping elbows pinned."],
  ["Spider Curl","Biceps","Dumbbell","Arms","Lie face down on an incline bench. Curl dumbbells from a dead hang."],
  ["Triceps Pushdown","Triceps","Cable","Arms","High pulley with a straight or rope handle. Extend elbows down."],
  ["Overhead Triceps Extension","Triceps","Dumbbell","Arms","Hold one dumbbell overhead with both hands. Lower behind head, then press back up."],
  ["Skull Crusher","Triceps","Barbell","Arms","Lie on a bench, bar above forehead. Lower to forehead by bending elbows, then extend."],
  ["Close-Grip Bench Press","Triceps","Barbell","Arms","Bench press with hands shoulder-width. Elbows tucked, focus on triceps."],
  ["Triceps Kickback","Triceps","Dumbbell","Arms","Hinge forward, upper arm parallel to floor. Extend the elbow straight back."],
  ["Bench Dip","Triceps","Bodyweight","Arms","Hands on a bench behind you, feet forward. Lower until elbows are at 90°, then press up."],
  ["Plank","Core","Bodyweight","Core","Forearms and toes on the floor. Body in a straight line. Brace abs and hold."],
  ["Side Plank","Obliques","Bodyweight","Core","Lie on your side, forearm on the floor. Lift hips into a straight line. Hold."],
  ["Dead Bug","Core","Bodyweight","Core","Lie on back, arms up, knees bent 90°. Extend opposite arm and leg while keeping lower back flat."],
  ["Bird Dog","Core","Bodyweight","Core","On all fours. Extend opposite arm and leg, keeping hips level. Alternate."],
  ["Mountain Climber","Core","Bodyweight","Core","High plank position. Drive knees toward chest alternately at pace."],
  ["Crunch","Abs","Bodyweight","Core","Lie on back, knees bent. Curl shoulders off the floor, squeezing abs."],
  ["Sit-Up","Abs","Bodyweight","Core","Full sit-up from flat. Keep feet anchored. Control both directions."],
  ["Lying Leg Raise","Lower Abs","Bodyweight","Core","Lie flat, hands under hips. Raise straight legs to 90°, then lower slowly."],
  ["Hanging Leg Raise","Lower Abs","Bodyweight","Core","Hang from a bar. Raise straight legs to parallel or higher. Control the descent."],
  ["Russian Twist","Obliques","Bodyweight","Core","Seated, feet off the floor if possible. Rotate torso side to side with hands together."],
  ["Bicycle Crunch","Obliques","Bodyweight","Core","Alternate elbow to opposite knee in a pedalling motion."],
  ["Ab Wheel Rollout","Core","Other","Core","Kneel with wheel under shoulders. Roll forward as far as you can control, then pull back."],
  ["Cable Crunch","Abs","Cable","Core","Kneel facing a high pulley with rope behind head. Crunch down, bringing elbows toward knees."],
  ["Pallof Press","Core","Cable","Core","Stand side-on to a cable at chest height. Press the handle straight out, resisting rotation."],
  ["Hollow Body Hold","Core","Bodyweight","Core","Lie on back, arms overhead. Lift shoulders and legs slightly off the floor."],
  ["V-Up","Abs","Bodyweight","Core","Lie flat, then simultaneously lift legs and torso to touch toes. Return under control."],
  ["Flutter Kick","Lower Abs","Bodyweight","Core","Lie flat, hands under hips. Alternate raising each leg a few inches off the floor."],
  ["Burpee","Full Body","Bodyweight","Conditioning","Squat down, kick back to plank, do a push-up, jump feet forward, jump up. Repeat."],
  ["Jumping Jack","Full Body","Bodyweight","Conditioning","Jump feet out while raising arms overhead, then back. Keep a steady rhythm."],
  ["Jump Rope","Full Body","Other","Conditioning","Swing rope under feet with small hops. Land softly on the balls of your feet."],
  ["Box Jump","Legs","Other","Conditioning","Stand facing a box. Jump up, landing softly with knees bent. Step down."],
  ["Kettlebell Swing","Posterior Chain","Other","Conditioning","Hinge at hips, swing a kettlebell between your legs, then drive hips forward."],
  ["Rowing Machine","Full Body","Machine","Conditioning","Drive with legs, then pull with arms. Reverse on the return. Keep a steady tempo."],
  ["Treadmill Run","Full Body","Machine","Conditioning","Run at a steady or interval pace. Maintain upright posture."],
  ["Stationary Bike","Legs","Machine","Conditioning","Cycle at a steady resistance or intervals. Keep cadence smooth."],
  ["Stair Climber","Legs","Machine","Conditioning","Climb at a steady pace without leaning heavily on the rails."],
  ["Sprint Interval","Full Body","Bodyweight","Conditioning","Sprint at max effort for 20–30s, then walk for 60–90s. Repeat 6–10 times."]
];
const EXERCISES = LIBRARY_RAW.map((e, i) => ({
  id: "ex_" + i, name: e[0], muscle: e[1], equipment: e[2], category: e[3], instructions: e[4]
}));
const MUSCLE_GROUPS = ["All", "Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Conditioning"];

/* ═══════════════════ DEFAULT ROUTINE ═══════════════════ */
function buildDefaultRoutine() {
  const mk = (name, sets, rmin, rmax, perSide) => ({
    id: "rex_" + uid(), name, targetSets: sets, repsMin: rmin, repsMax: rmax, perSide: !!perSide,
    sets: Array.from({length: sets}, () => ({ weight: "", reps: "", rpe: "", done: false }))
  });
  return {
    name: "Beginner Full Body",
    notes: "Jeremy Ethier — 3× per week",
    exercises: [
      mk("Low Incline Dumbbell Press", 3, 10, 15),
      mk("Goblet Squat", 3, 10, 15),
      mk("Neutral Grip Pull-Ups", 3, 5, 8),
      mk("DB Romanian Deadlift", 3, 10, 15),
      mk("Cable Row", 3, 10, 15),
      mk("Lateral Raise Superset", 3, 10, 20),
      mk("Dead Bug", 3, 5, 5, true),
      mk("Arm Superset", 3, 8, 12)
    ],
    createdAt: serverTimestamp()
  };
}

/* ═══════════════════ TOAST + SHEET ═══════════════════ */
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}
function openSheet(html) {
  $("#sheetContent").innerHTML = html;
  $("#sheetBg").classList.add("open");
  $("#sheet").classList.add("open");
}
function closeSheet() {
  $("#sheetBg").classList.remove("open");
  $("#sheet").classList.remove("open");
}
$("#sheetBg").onclick = closeSheet;
window.closeSheet = closeSheet;

/* ═══════════════════ AUTH ═══════════════════ */
const authError = (m) => {
  const e = $("#authError");
  if (!m) { e.hidden = true; return; }
  e.textContent = m; e.hidden = false;
};

$("#btnSignIn").onclick = async () => {
  authError("");
  const email = $("#authEmail").value.trim();
  const pass  = $("#authPassword").value;
  if (!email || !pass) return authError("Enter an email and password.");
  try { await signInWithEmailAndPassword(auth, email, pass); }
  catch (e) { authError(e.message.replace("Firebase: ", "")); }
};
$("#btnSignUp").onclick = async () => {
  authError("");
  const email = $("#authEmail").value.trim();
  const pass  = $("#authPassword").value;
  if (!email || pass.length < 6) return authError("Password must be at least 6 characters.");
  try { await createUserWithEmailAndPassword(auth, email, pass); }
  catch (e) { authError(e.message.replace("Firebase: ", "")); }
};
$("#btnGoogle").onclick = async () => {
  authError("");
  const provider = new GoogleAuthProvider();
  try { await signInWithPopup(auth, provider); }
  catch (e) {
    if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/operation-not-supported-in-this-environment"].includes(e.code)) {
      try { await signInWithRedirect(auth, provider); }
      catch (e2) { authError(e2.message.replace("Firebase: ", "")); }
    } else authError(e.message.replace("Firebase: ", ""));
  }
};
getRedirectResult(auth).catch(() => {});
$("#btnSignOut").onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  state.unsubs.forEach(u => u());
  state.unsubs = [];

  if (!user) {
    state.user = null;
    $("#app").hidden = true;
    $("#authScreen").style.display = "";
    return;
  }

  state.user = user;
  $("#authScreen").style.display = "none";
  $("#app").hidden = false;
  $("#accountEmail").textContent = user.email || "";

  const profileRef = doc(db, "fitness_users", user.uid);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) {
    await setDoc(profileRef, { units: "kg", seeded: false, createdAt: serverTimestamp() });
  }

  state.unsubs.push(onSnapshot(profileRef, async (s) => {
    const data = s.data() || {};
    state.profile = data;
    if ($("#setUnits")) $("#setUnits").value = data.units || "kg";
    renderBody();

    // Seed default routine once per account
    if (data.seeded !== true) {
      await setDoc(profileRef, { seeded: true }, { merge: true });
      await addDoc(collection(db, "fitness_users", user.uid, "routines"), buildDefaultRoutine());
    }
  }));

  state.unsubs.push(onSnapshot(collection(db, "fitness_users", user.uid, "routines"), (s) => {
    state.routines = s.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHome();
    renderRoutineList();
  }));

  state.unsubs.push(onSnapshot(collection(db, "fitness_users", user.uid, "workouts"), (s) => {
    state.workouts = s.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHome();
  }));

  state.unsubs.push(onSnapshot(collection(db, "fitness_users", user.uid, "body"), (s) => {
    state.body = s.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    renderBody();
  }));
});

/* ═══════════════════ NAV ═══════════════════ */
function switchView(v) {
  $$(".view").forEach(el => el.classList.toggle("active", el.id === "view-" + v));
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$(".nav-btn").forEach(b => b.onclick = () => {
  switchView(b.dataset.view);
  if (b.dataset.view === "library") renderLibrary();
  if (b.dataset.view === "body") renderBody();
});

/* ═══════════════════ HOME ═══════════════════ */
function renderHome() {
  const now = new Date();
  const h = now.getHours();
  $("#homeGreeting").textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  $("#homeDate").textContent = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0,0,0,0);
  const weekCount = state.workouts.filter(w => new Date(w.date || 0) >= weekStart).length;

  let streak = 0;
  const dates = new Set(state.workouts.map(w => w.date));
  const check = new Date(); check.setHours(0,0,0,0);
  for (let i = 0; i < 365; i++) {
    const iso = `${check.getFullYear()}-${String(check.getMonth()+1).padStart(2,"0")}-${String(check.getDate()).padStart(2,"0")}`;
    if (dates.has(iso)) streak++;
    else if (i === 0) { /* allow today missing */ }
    else break;
    check.setDate(check.getDate() - 1);
  }

  $("#homeStats").innerHTML = `
    <div class="stat"><div class="v">${weekCount}</div><div class="l">This week</div></div>
    <div class="stat"><div class="v">${streak}</div><div class="l">Streak</div></div>
    <div class="stat"><div class="v">${state.workouts.length}</div><div class="l">Total</div></div>
  `;

  const ab = $("#activeBanner");
  if (state.activeWorkout) {
    ab.innerHTML = `
      <div class="active-banner">
        <div>
          <div class="ab-text">Workout in progress</div>
          <div class="muted small">${escapeHTML(state.activeWorkout.routineName)}</div>
        </div>
        <button class="btn primary" id="resumeBtn">Resume</button>
      </div>`;
    $("#resumeBtn").onclick = () => startActiveWorkout();
  } else ab.innerHTML = "";

  $("#homeRoutines").innerHTML = state.routines.length
    ? state.routines.slice(0, 4).map(routineCardHTML).join("")
    : `<div class="bucket-empty">No routines yet.</div>`;
  $$("#homeRoutines .routine-card").forEach(c => c.onclick = () => openRoutine(c.dataset.id));

  const recent = [...state.workouts].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4);
  $("#homeRecent").innerHTML = recent.length
    ? recent.map(w => `
        <div class="log-item">
          <div>
            <div style="font-weight:600;font-size:14.5px">${escapeHTML(w.routineName || "Workout")}</div>
            <div class="log-date">${fmtDate(w.date)} · ${w.exerciseCount || 0} exercises</div>
          </div>
          <div class="log-value">${w.durationMin || 0}m</div>
        </div>`).join("")
    : `<div class="bucket-empty">No workouts logged yet.</div>`;
}

function routineCardHTML(r) {
  return `
    <div class="routine-card" data-id="${r.id}">
      <div class="rc-icon"><svg viewBox="0 0 24 24"><path d="M6.5 6.5h2v11h-2zM15.5 6.5h2v11h-2zM8.5 10.5h7v3h-7z"/></svg></div>
      <div class="rc-body">
        <div class="rc-name">${escapeHTML(r.name)}</div>
        <div class="rc-meta">${(r.exercises || []).length} exercise${(r.exercises || []).length === 1 ? "" : "s"}</div>
      </div>
      <div class="rc-chev"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></div>
    </div>`;
}

/* ═══════════════════ ROUTINES LIST ═══════════════════ */
function renderRoutineList() {
  const list = $("#routineList");
  if (!state.routines.length) {
    list.innerHTML = `<div class="card"><div class="bucket-empty">No routines yet. Create one to get started.</div></div>`;
    return;
  }
  list.innerHTML = state.routines.map(routineCardHTML).join("");
  $$("#routineList .routine-card").forEach(c => c.onclick = () => openRoutine(c.dataset.id));
}

$("#btnNewRoutine").onclick = () => {
  openSheet(`
    <h3>New routine</h3>
    <p class="muted small" style="margin-bottom:16px">Give it a name. You'll add exercises next.</p>
    <label class="field">Routine name
      <input type="text" id="newRoutineName" placeholder="e.g. Push day" />
    </label>
    <div class="row end">
      <button class="btn" onclick="closeSheet()">Cancel</button>
      <button class="btn primary" id="createRoutineBtn">Create</button>
    </div>
  `);
  setTimeout(() => $("#newRoutineName")?.focus(), 150);
  $("#createRoutineBtn").onclick = async () => {
    const name = $("#newRoutineName").value.trim() || "Untitled routine";
    const ref = await addDoc(collection(db, "fitness_users", state.user.uid, "routines"), {
      name, notes: "", exercises: [], createdAt: serverTimestamp()
    });
    closeSheet();
    setTimeout(() => openRoutineEditor(ref.id), 250);
  };
};

/* ═══════════════════ ROUTINE DETAIL ═══════════════════ */
function openRoutine(id) {
  const r = state.routines.find(x => x.id === id);
  if (!r) return;
  state.currentRoutineId = id;
  $("#routineTitle").textContent = r.name;
  const totalSets = (r.exercises || []).reduce((a, e) => a + (e.targetSets || 0), 0);
  $("#routineSub").textContent = `${(r.exercises || []).length} exercises · ${totalSets} sets${r.notes ? " · " + r.notes : ""}`;

  $("#routineExercises").innerHTML = (r.exercises || []).map((e, i) => `
    <div class="card" style="padding:14px 18px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:32px;height:32px;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:600;font-size:13px">${i+1}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:15px;margin-bottom:2px">${escapeHTML(e.name)}</div>
          <div class="muted small">${e.targetSets} × ${e.repsMin}${e.repsMax !== e.repsMin ? "–" + e.repsMax : ""}${e.perSide ? " /side" : ""}</div>
        </div>
      </div>
    </div>`).join("") || `<div class="card"><div class="bucket-empty">No exercises yet.</div></div>`;

  switchView("routine");
}

$("#routineBack").onclick = () => { switchView("routines"); renderRoutineList(); };

$("#routineRename").onclick = () => {
  const r = state.routines.find(x => x.id === state.currentRoutineId);
  if (!r) return;
  openSheet(`
    <h3>Rename routine</h3>
    <label class="field">Name<input type="text" id="renameInput" value="${escapeHTML(r.name)}" /></label>
    <label class="field">Notes<input type="text" id="notesInput" value="${escapeHTML(r.notes || "")}" /></label>
    <div class="row end">
      <button class="btn" onclick="closeSheet()">Cancel</button>
      <button class="btn primary" id="renameSave">Save</button>
    </div>
  `);
  $("#renameSave").onclick = async () => {
    await updateDoc(doc(db, "fitness_users", state.user.uid, "routines", r.id), {
      name: $("#renameInput").value.trim() || r.name,
      notes: $("#notesInput").value.trim()
    });
    closeSheet();
    toast("Saved");
  };
};

$("#routineDelete").onclick = async () => {
  if (!confirm("Delete this routine?")) return;
  await deleteDoc(doc(db, "fitness_users", state.user.uid, "routines", state.currentRoutineId));
  switchView("routines");
  toast("Routine deleted");
};

function openRoutineEditor(routineId) {
  const r = state.routines.find(x => x.id === routineId);
  if (!r) return;
  const render = () => {
    openSheet(`
      <h3>${escapeHTML(r.name)}</h3>
      <p class="muted small" style="margin-bottom:14px">${(r.exercises || []).length} exercise${(r.exercises || []).length === 1 ? "" : "s"}</p>
      <div style="max-height:44dvh;overflow-y:auto;margin-bottom:14px">
        ${(r.exercises || []).length ? r.exercises.map((e, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1;min-width:0">
              <div style="font-weight:550;font-size:14.5px">${escapeHTML(e.name)}</div>
              <div class="muted small">${e.targetSets} × ${e.repsMin}${e.repsMax !== e.repsMin ? "–" + e.repsMax : ""}</div>
            </div>
            <button class="btn" data-rm="${i}" style="padding:4px 10px">✕</button>
          </div>`).join("") : `<p class="muted small" style="padding:14px 0">No exercises yet.</p>`}
      </div>
      <div class="row end">
        <button class="btn" id="addExBtn">+ Add exercise</button>
        <button class="btn primary" id="doneEdit">Done</button>
      </div>
    `);
    $$("#sheetContent [data-rm]").forEach(b => b.onclick = async () => {
      r.exercises.splice(Number(b.dataset.rm), 1);
      await updateDoc(doc(db, "fitness_users", state.user.uid, "routines", r.id), { exercises: r.exercises });
      render();
    });
    $("#addExBtn").onclick = () => showExercisePicker(r, render);
    $("#doneEdit").onclick = () => { closeSheet(); openRoutine(r.id); };
  };
  render();
}

function showExercisePicker(routine, onDone) {
  openSheet(`
    <h3>Add exercise</h3>
    <div class="search-wrap" style="margin-top:12px">
      <svg viewBox="0 0 24 24" class="search-icon"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
      <input type="search" id="pickerSearch" placeholder="Search library…" />
    </div>
    <div style="max-height:44dvh;overflow-y:auto" id="pickerList"></div>
    <div class="row end">
      <button class="btn" onclick="closeSheet()">Close</button>
    </div>
  `);
  const render = (q) => {
    const ql = (q || "").toLowerCase();
    const list = EXERCISES.filter(e => !ql || e.name.toLowerCase().includes(ql) || e.muscle.toLowerCase().includes(ql));
    $("#pickerList").innerHTML = list.slice(0, 80).map(e => `
      <div class="lib-item" data-name="${escapeHTML(e.name)}">
        <div class="lib-info">
          <div class="lib-name">${escapeHTML(e.name)}</div>
          <div class="lib-tags"><span class="lib-tag muscle">${escapeHTML(e.muscle)}</span><span class="lib-tag">${escapeHTML(e.equipment)}</span></div>
        </div>
      </div>`).join("") || `<div class="bucket-empty">No matches.</div>`;
    $$("#pickerList .lib-item").forEach(item => item.onclick = () => showSetConfig(routine, item.dataset.name, onDone));
  };
  render("");
  $("#pickerSearch").oninput = e => render(e.target.value);
}

function showSetConfig(routine, exerciseName, onDone) {
  openSheet(`
    <h3>${escapeHTML(exerciseName)}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:16px">
      <label class="field" style="margin:0">Sets<input type="number" id="scSets" value="3" min="1" max="10"></label>
      <label class="field" style="margin:0">Reps min<input type="number" id="scRMin" value="8" min="1"></label>
      <label class="field" style="margin:0">Reps max<input type="number" id="scRMax" value="12" min="1"></label>
    </div>
    <div class="row end">
      <button class="btn" onclick="closeSheet()">Cancel</button>
      <button class="btn primary" id="scAdd">Add</button>
    </div>
  `);
  $("#scAdd").onclick = async () => {
    const sets = Math.max(1, Number($("#scSets").value) || 3);
    const rmin = Math.max(1, Number($("#scRMin").value) || 8);
    const rmax = Math.max(rmin, Number($("#scRMax").value) || rmin);
    routine.exercises.push({
      id: "rex_" + uid(),
      name: exerciseName,
      targetSets: sets,
      repsMin: rmin,
      repsMax: rmax,
      perSide: false,
      sets: Array.from({ length: sets }, () => ({ weight: "", reps: "", rpe: "", done: false }))
    });
    await updateDoc(doc(db, "fitness_users", state.user.uid, "routines", routine.id), { exercises: routine.exercises });
    toast("Added");
    onDone();
  };
}

/* ═══════════════════ ACTIVE WORKOUT ═══════════════════ */
let workoutTimer = null;

$("#btnStartWorkout").onclick = () => {
  const r = state.routines.find(x => x.id === state.currentRoutineId);
  if (!r) return;
  if (!(r.exercises || []).length) return toast("Add exercises first");
  state.activeWorkout = {
    routineId: r.id,
    routineName: r.name,
    startedAt: Date.now(),
    exercises: JSON.parse(JSON.stringify(r.exercises))
  };
  startActiveWorkout();
};

function startActiveWorkout() {
  const w = state.activeWorkout;
  if (!w) return;
  $("#activeName").textContent = w.routineName;
  renderActiveExercises();
  updateActiveProgress();
  switchView("active");
  clearInterval(workoutTimer);
  const tick = () => {
    if (!state.activeWorkout) return clearInterval(workoutTimer);
    const s = Math.floor((Date.now() - state.activeWorkout.startedAt) / 1000);
    $("#activeTimer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  tick();
  workoutTimer = setInterval(tick, 1000);
}

function renderActiveExercises() {
  const w = state.activeWorkout;
  if (!w) return;
  $("#activeExercises").innerHTML = w.exercises.map((ex, ei) => {
    const done = ex.sets.every(s => s.done);
    return `
      <div class="ex-block ${done ? "done" : ""} ${ei === 0 ? "open" : ""}" data-ei="${ei}">
        <div class="ex-head">
          <div class="ex-dot"></div>
          <div class="ex-info">
            <div class="ex-name">${escapeHTML(ex.name)}</div>
            <div class="ex-meta">${ex.targetSets} × ${ex.repsMin}${ex.repsMax !== ex.repsMin ? "–" + ex.repsMax : ""}${ex.perSide ? " /side" : ""}</div>
          </div>
          <div class="ex-chev"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div class="ex-body">
          <div class="set-row header"><div></div><div>Weight</div><div>Reps</div><div>RPE</div><div></div></div>
          ${ex.sets.map((s, si) => `
            <div class="set-row ${s.done ? "complete" : ""}" data-ei="${ei}" data-si="${si}">
              <div class="set-num">${si + 1}</div>
              <input type="number" step="0.5" inputmode="decimal" value="${s.weight}" placeholder="—" data-field="weight">
              <input type="number" step="1" inputmode="numeric" value="${s.reps}" placeholder="—" data-field="reps">
              <input type="number" step="0.5" inputmode="decimal" value="${s.rpe}" placeholder="—" data-field="rpe">
              <button class="chk" data-ei="${ei}" data-si="${si}"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></button>
            </div>`).join("")}
          <div class="set-actions">
            <button class="btn" data-addset="${ei}" style="padding:6px 12px;font-size:13px">+ Add set</button>
            <button class="btn" data-rmset="${ei}" style="padding:6px 12px;font-size:13px">Remove set</button>
          </div>
        </div>
      </div>`;
  }).join("");

  $$("#activeExercises .ex-head").forEach(h => h.onclick = () => h.closest(".ex-block").classList.toggle("open"));
  $$("#activeExercises .set-row input").forEach(inp => inp.onchange = () => {
    const row = inp.closest(".set-row");
    state.activeWorkout.exercises[Number(row.dataset.ei)].sets[Number(row.dataset.si)][inp.dataset.field] = inp.value;
  });
  $$("#activeExercises .chk").forEach(btn => btn.onclick = (ev) => {
    ev.stopPropagation();
    const ei = Number(btn.dataset.ei), si = Number(btn.dataset.si);
    const s = state.activeWorkout.exercises[ei].sets[si];
    s.done = !s.done;
    if (s.done && !s.reps && si > 0) {
      const prev = state.activeWorkout.exercises[ei].sets[si - 1];
      if (prev.reps) s.reps = prev.reps;
      if (prev.weight && !s.weight) s.weight = prev.weight;
    }
    renderActiveExercises();
    updateActiveProgress();
  });
  $$("#activeExercises [data-addset]").forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    const ei = Number(b.dataset.addset);
    state.activeWorkout.exercises[ei].sets.push({ weight: "", reps: "", rpe: "", done: false });
    state.activeWorkout.exercises[ei].targetSets++;
    renderActiveExercises();
    updateActiveProgress();
  });
  $$("#activeExercises [data-rmset]").forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    const ei = Number(b.dataset.rmset);
    const ex = state.activeWorkout.exercises[ei];
    if (ex.sets.length <= 1) return;
    ex.sets.pop();
    ex.targetSets = ex.sets.length;
    renderActiveExercises();
    updateActiveProgress();
  });
}

function updateActiveProgress() {
  const w = state.activeWorkout;
  if (!w) return;
  const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const pct = total ? Math.round(done / total * 100) : 0;
  $("#activeProgBar").style.width = pct + "%";
  $("#activeProgText").textContent = `${done} of ${total} sets complete`;
  $("#activeProgPct").textContent = pct + "%";
}

$("#activeBack").onclick = () => {
  if (!confirm("Discard this workout?")) return;
  state.activeWorkout = null;
  clearInterval(workoutTimer);
  renderHome();
  switchView("home");
};

$("#btnFinishWorkout").onclick = async () => {
  const w = state.activeWorkout;
  if (!w) return;
  const done = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  if (done === 0) return toast("Log at least one set first");
  const durationMin = Math.max(1, Math.round((Date.now() - w.startedAt) / 60000));
  await addDoc(collection(db, "fitness_users", state.user.uid, "workouts"), {
    date: todayISO(),
    routineName: w.routineName,
    routineId: w.routineId,
    durationMin,
    exerciseCount: w.exercises.length,
    setsCompleted: done,
    exercises: w.exercises,
    createdAt: serverTimestamp()
  });
  state.activeWorkout = null;
  clearInterval(workoutTimer);
  toast("Workout saved");
  renderHome();
  switchView("home");
};

/* ═══════════════════ LIBRARY ═══════════════════ */
let libFilter = "All";
let libSearchQ = "";

function renderLibrary() {
  $("#libFilters").innerHTML = MUSCLE_GROUPS.map(g =>
    `<button class="chip ${g === libFilter ? "active" : ""}" data-f="${g}">${g}</button>`
  ).join("");
  $$("#libFilters .chip").forEach(c => c.onclick = () => { libFilter = c.dataset.f; renderLibrary(); });

  const q = libSearchQ.toLowerCase();
  const list = EXERCISES.filter(e => {
    if (libFilter !== "All" && e.category !== libFilter) return false;
    if (q && !e.name.toLowerCase().includes(q) && !e.muscle.toLowerCase().includes(q) && !e.equipment.toLowerCase().includes(q)) return false;
    return true;
  });
  $("#libList").innerHTML = list.length ? list.map(e => `
    <div class="lib-item" data-id="${e.id}">
      <div class="lib-info">
        <div class="lib-name">${escapeHTML(e.name)}</div>
        <div class="lib-tags">
          <span class="lib-tag muscle">${escapeHTML(e.muscle)}</span>
          <span class="lib-tag">${escapeHTML(e.equipment)}</span>
        </div>
      </div>
    </div>`).join("") : `<div class="card"><div class="bucket-empty">No exercises found.</div></div>`;

  $$("#libList .lib-item").forEach(item => item.onclick = () => {
    const ex = EXERCISES.find(e => e.id === item.dataset.id);
    if (!ex) return;
    openSheet(`
      <h3>${escapeHTML(ex.name)}</h3>
      <div class="sheet-meta">
        <span class="lib-tag muscle">${escapeHTML(ex.muscle)}</span>
        <span class="lib-tag">${escapeHTML(ex.equipment)}</span>
        <span class="lib-tag">${escapeHTML(ex.category)}</span>
      </div>
      <p class="body">${escapeHTML(ex.instructions)}</p>
      <button class="btn primary block" onclick="closeSheet()">Close</button>
    `);
  });
}
$("#libSearch").oninput = e => { libSearchQ = e.target.value; renderLibrary(); };

/* ═══════════════════ BODY ═══════════════════ */
function renderBody() {
  const latest = state.body[0];
  const w = latest?.weight, h = latest?.height;

  if (w && h) {
    const bmi = w / Math.pow(h / 100, 2);
    $("#bmiValue").textContent = bmi.toFixed(1);
    let cat = "Normal";
    if (bmi < 18.5) cat = "Underweight";
    else if (bmi < 25) cat = "Normal weight";
    else if (bmi < 30) cat = "Overweight";
    else cat = "Obese";
    $("#bmiLabel").textContent = cat;
    const pct = Math.max(0, Math.min(100, (bmi - 16) / (40 - 16) * 100));
    $("#bmiMarker").style.left = pct + "%";
    $("#bodyWeightDisplay").textContent = formatWeight(w) + " " + (state.profile.units || "kg");
    $("#bodyHeightDisplay").textContent = h + " cm";
    $("#inpWeight").value = w;
    $("#inpHeight").value = h;
  } else {
    $("#bmiValue").textContent = "—";
    $("#bmiLabel").textContent = "Enter your stats below";
    $("#bmiMarker").style.left = "0%";
    $("#bodyWeightDisplay").textContent = "— " + (state.profile.units || "kg");
    $("#bodyHeightDisplay").textContent = "— cm";
  }

  $("#bodyLog").innerHTML = state.body.length
    ? state.body.slice(0, 20).map(b => `
        <div class="log-item">
          <div>
            <div style="font-weight:600;font-size:14.5px">${fmtDate(b.date)}</div>
            ${b.height ? `<div class="log-date">${b.height} cm</div>` : ""}
          </div>
          <div class="log-value">${b.weight ? formatWeight(b.weight) : "—"} ${state.profile.units || "kg"}</div>
        </div>`).join("")
    : `<div class="bucket-empty">No entries yet.</div>`;
}

function formatWeight(kg) {
  if (state.profile.units === "lb") return (kg * 2.20462).toFixed(1);
  return Number(kg).toFixed(1);
}

$("#btnSaveBody").onclick = async () => {
  const w = parseFloat($("#inpWeight").value);
  const h = parseFloat($("#inpHeight").value);
  if (!w && !h) return toast("Enter a weight or height");
  const last = state.body[0];
  await addDoc(collection(db, "fitness_users", state.user.uid, "body"), {
    date: todayISO(),
    weight: w || last?.weight || 0,
    height: h || last?.height || 0,
    createdAt: serverTimestamp()
  });
  toast("Saved");
};

/* ═══════════════════ SETTINGS ═══════════════════ */
$("#btnSaveSettings").onclick = async () => {
  await setDoc(doc(db, "fitness_users", state.user.uid), {
    units: $("#setUnits").value
  }, { merge: true });
  toast("Saved");
  renderBody();
};

/* ═══════════════════ SERVICE WORKER + MANIFEST ═══════════════════ */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

(function injectManifest() {
  const manifest = {
    name: "Portal · Fitness",
    short_name: "Fitness",
    description: "Workout tracker — routines, sets, body log.",
    start_url: "./",
    scope: "./",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='112' fill='%235C9EAD'/%3E%3Cpath d='M144 192h48v128h-48zM320 192h48v128h-48zM192 240h128v32H192z' fill='%23ffffff'/%3E%3C/svg%3E",
      sizes: "192x192 512x512",
      type: "image/svg+xml",
      purpose: "any maskable"
    }]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const link = document.createElement("link");
  link.rel = "manifest";
  link.href = URL.createObjectURL(blob);
  document.head.appendChild(link);
})();

/* ═══════════════════ BOOT ═══════════════════ */
switchView("home");
renderLibrary();
