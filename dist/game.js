import { circlesOverlap, clamp, deliveryScore, distance, formatScore, formatTime, generatePartyCode, normalize, streakMultiplier, } from "./core.js";
const WORLD = { width: 1000, height: 620 };
const COLORS = {
    violet: "#9b8cff",
    cyan: "#6ce5d7",
    coral: "#ff6f91",
    amber: "#ffc66d",
    ink: "#f7f5ff",
    grid: "rgba(158, 151, 190, .07)",
};
const element = (id) => {
    const node = document.getElementById(id);
    if (!node)
        throw new Error(`Missing required element: ${id}`);
    return node;
};
const canvas = element("gameCanvas");
const context = canvas.getContext("2d");
if (!context)
    throw new Error("Canvas 2D is not available in this browser.");
const ui = {
    time: element("timeValue"),
    score: element("scoreValue"),
    streak: element("streakValue"),
    shield: element("shieldValue"),
    shieldMeter: element("shieldMeter"),
    playerCargo: element("playerCargo"),
    botCargo: element("botCargo"),
    partyCode: element("partyCode"),
    feed: element("activityFeed"),
    startOverlay: element("startOverlay"),
    endOverlay: element("endOverlay"),
    endTitle: element("endTitle"),
    endCopy: element("endCopy"),
    bestScore: element("bestScore"),
    soundButton: element("soundButton"),
    pauseButton: element("pauseButton"),
};
let phase = "ready";
let score = 0;
let timeLeft = 75;
let shield = 100;
let deliveryStreak = 0;
let elapsed = 0;
let hazardSpawnTimer = 2.4;
let pulseCooldown = 0;
let damageCooldown = 0;
let soundEnabled = true;
let lastFrame = performance.now();
let signals = [];
let hazards = [];
let particles = [];
let pulses = [];
const keys = new Set();
const partyCode = generatePartyCode();
const player = {
    x: 380,
    y: 350,
    radius: 16,
    vx: 0,
    vy: 0,
    speed: 245,
    cargo: 0,
    color: COLORS.violet,
};
const nova = {
    x: 620,
    y: 350,
    radius: 15,
    vx: 0,
    vy: 0,
    speed: 185,
    cargo: 0,
    color: COLORS.cyan,
};
const beacon = { x: WORLD.width / 2, y: WORLD.height / 2, radius: 48 };
const randomPoint = (margin = 48) => ({
    x: margin + Math.random() * (WORLD.width - margin * 2),
    y: margin + Math.random() * (WORLD.height - margin * 2),
});
const safeRandomPoint = () => {
    let point = randomPoint(58);
    for (let attempt = 0; attempt < 8 && distance(point, beacon) < 125; attempt += 1)
        point = randomPoint(58);
    return point;
};
const addFeed = (tag, message, accent = "violet") => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const copy = document.createElement("p");
    label.textContent = tag;
    label.style.color = COLORS[accent];
    copy.textContent = message;
    item.append(label, copy);
    ui.feed.prepend(item);
    while (ui.feed.children.length > 5)
        ui.feed.lastElementChild?.remove();
};
const playTone = (frequency, duration = 0.08, volume = 0.025) => {
    if (!soundEnabled)
        return;
    try {
        const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
        if (!AudioContextClass)
            return;
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
        gain.gain.setValueAtTime(volume, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
        oscillator.addEventListener("ended", () => void audio.close());
    }
    catch {
        // Audio is enhancement-only; gameplay remains functional when it is blocked.
    }
};
const burst = (position, color, count = 12) => {
    for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 120;
        particles.push({
            x: position.x,
            y: position.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: .35 + Math.random() * .45,
            size: 1.5 + Math.random() * 3,
            color,
        });
    }
};
const spawnSignal = () => {
    const point = safeRandomPoint();
    signals.push({ ...point, radius: 10, phase: Math.random() * Math.PI * 2 });
};
const spawnHazard = () => {
    const edge = Math.floor(Math.random() * 4);
    const point = randomPoint(35);
    if (edge === 0)
        point.y = 24;
    if (edge === 1)
        point.x = WORLD.width - 24;
    if (edge === 2)
        point.y = WORLD.height - 24;
    if (edge === 3)
        point.x = 24;
    hazards.push({
        ...point,
        radius: 18 + Math.random() * 5,
        vx: 0,
        vy: 0,
        speed: 55 + elapsed * .38,
        spin: Math.random() * Math.PI,
    });
};
const resetActors = () => {
    Object.assign(player, { x: 380, y: 350, vx: 0, vy: 0, cargo: 0 });
    Object.assign(nova, { x: 620, y: 350, vx: 0, vy: 0, cargo: 0 });
};
const startGame = () => {
    phase = "playing";
    score = 0;
    timeLeft = 75;
    shield = 100;
    deliveryStreak = 0;
    elapsed = 0;
    hazardSpawnTimer = 2.4;
    pulseCooldown = 0;
    damageCooldown = 0;
    signals = [];
    hazards = [];
    particles = [];
    pulses = [];
    resetActors();
    for (let index = 0; index < 8; index += 1)
        spawnSignal();
    ui.startOverlay.classList.add("hidden");
    ui.endOverlay.classList.add("hidden");
    ui.pauseButton.textContent = "Pause";
    addFeed("SYS", "Mission live. Stay linked and move together.", "cyan");
    addFeed("NOVA", "I’ll sweep the east side. Meet you at the beacon!", "cyan");
    playTone(480, .13, .03);
    updateUi();
};
const finishGame = (connectionLost) => {
    phase = "ended";
    keys.clear();
    const best = Math.max(score, Number(localStorage.getItem("signal-squad-best") ?? 0));
    localStorage.setItem("signal-squad-best", String(best));
    ui.bestScore.textContent = String(best);
    ui.endTitle.textContent = connectionLost ? "Connection dropped." : score >= 2500 ? "Signal secured." : "Run complete.";
    ui.endCopy.textContent = connectionLost
        ? `The glitches broke the squad link at ${formatScore(score)} points. Regroup and pulse earlier.`
        : `Your squad banked ${formatScore(score)} points with a peak x${streakMultiplier(deliveryStreak)} streak.`;
    ui.endOverlay.classList.remove("hidden");
    addFeed("SYS", connectionLost ? "Squad link offline." : "Mission timer complete.", connectionLost ? "coral" : "amber");
    playTone(connectionLost ? 180 : 620, .35, .035);
};
const togglePause = () => {
    if (phase === "ready" || phase === "ended")
        return;
    phase = phase === "paused" ? "playing" : "paused";
    ui.pauseButton.textContent = phase === "paused" ? "Resume" : "Pause";
    addFeed("SYS", phase === "paused" ? "Mission paused." : "Mission resumed.", "amber");
};
const collectSignal = (actor, name) => {
    actor.cargo += 1;
    score += 20;
    burst(actor, actor.color, 9);
    addFeed(name === "You" ? "YOU" : "NOVA", `${name} recovered a signal shard (${actor.cargo}/3).`, name === "You" ? "violet" : "cyan");
    playTone(name === "You" ? 690 : 580, .06, .018);
};
const deliverCargo = (actor, name) => {
    if (actor.cargo === 0 || distance(actor, beacon) > beacon.radius + 22)
        return;
    const delivered = actor.cargo;
    score += deliveryScore(delivered, deliveryStreak);
    shield = clamp(shield + delivered * 3, 0, 100);
    deliveryStreak += 1;
    actor.cargo = 0;
    burst(beacon, actor.color, 18);
    addFeed(name === "You" ? "YOU" : "NOVA", `${name} banked ${delivered} shard${delivered === 1 ? "" : "s"}. Team link boosted.`, name === "You" ? "violet" : "cyan");
    playTone(820, .11, .03);
};
const usePulse = () => {
    if (phase !== "playing" || pulseCooldown > 0)
        return;
    pulseCooldown = 1.6;
    pulses.push({ x: player.x, y: player.y, radius: 10, life: .48 });
    burst(player, COLORS.violet, 8);
    addFeed("YOU", "Protective pulse deployed.", "violet");
    playTone(260, .18, .025);
};
const updatePlayer = (delta) => {
    const horizontal = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
    const vertical = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
    const direction = normalize({ x: horizontal, y: vertical });
    player.vx += (direction.x * player.speed - player.vx) * Math.min(1, delta * 13);
    player.vy += (direction.y * player.speed - player.vy) * Math.min(1, delta * 13);
    player.x = clamp(player.x + player.vx * delta, player.radius + 10, WORLD.width - player.radius - 10);
    player.y = clamp(player.y + player.vy * delta, player.radius + 10, WORLD.height - player.radius - 10);
};
const nearestSignalTo = (actor) => {
    let nearest;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const signal of signals) {
        const currentDistance = distance(actor, signal);
        if (currentDistance < nearestDistance) {
            nearest = signal;
            nearestDistance = currentDistance;
        }
    }
    return nearest;
};
const updateNova = (delta) => {
    const target = nova.cargo >= 3 ? beacon : nearestSignalTo(nova) ?? beacon;
    const separation = distance(nova, player);
    const directionToTarget = normalize({ x: target.x - nova.x, y: target.y - nova.y });
    const avoidPlayer = separation < 52 ? normalize({ x: nova.x - player.x, y: nova.y - player.y }) : { x: 0, y: 0 };
    const direction = normalize({ x: directionToTarget.x + avoidPlayer.x * .8, y: directionToTarget.y + avoidPlayer.y * .8 });
    nova.vx += (direction.x * nova.speed - nova.vx) * Math.min(1, delta * 5);
    nova.vy += (direction.y * nova.speed - nova.vy) * Math.min(1, delta * 5);
    nova.x = clamp(nova.x + nova.vx * delta, nova.radius + 10, WORLD.width - nova.radius - 10);
    nova.y = clamp(nova.y + nova.vy * delta, nova.radius + 10, WORLD.height - nova.radius - 10);
};
const updateSignals = () => {
    signals = signals.filter((signal) => {
        if (player.cargo < 3 && circlesOverlap(player, signal)) {
            collectSignal(player, "You");
            return false;
        }
        if (nova.cargo < 3 && circlesOverlap(nova, signal)) {
            collectSignal(nova, "Nova");
            return false;
        }
        return true;
    });
    while (signals.length < 8)
        spawnSignal();
    deliverCargo(player, "You");
    deliverCargo(nova, "Nova");
};
const updateHazards = (delta) => {
    hazardSpawnTimer -= delta;
    if (hazardSpawnTimer <= 0) {
        spawnHazard();
        hazardSpawnTimer = clamp(2.6 - elapsed * .018, .8, 2.6);
    }
    hazards = hazards.filter((hazard) => {
        const target = distance(hazard, player) < distance(hazard, nova) ? player : nova;
        const direction = normalize({ x: target.x - hazard.x, y: target.y - hazard.y });
        hazard.vx += (direction.x * hazard.speed - hazard.vx) * Math.min(1, delta * 2.3);
        hazard.vy += (direction.y * hazard.speed - hazard.vy) * Math.min(1, delta * 2.3);
        hazard.x += hazard.vx * delta;
        hazard.y += hazard.vy * delta;
        hazard.spin += delta * 2.2;
        const pulsed = pulses.some((pulse) => distance(pulse, hazard) < pulse.radius + hazard.radius);
        if (pulsed) {
            score += 35;
            burst(hazard, COLORS.coral, 12);
            return false;
        }
        const hitPlayer = circlesOverlap(hazard, player);
        const hitNova = circlesOverlap(hazard, nova);
        if ((hitPlayer || hitNova) && damageCooldown <= 0) {
            shield = clamp(shield - 14, 0, 100);
            deliveryStreak = 0;
            damageCooldown = .6;
            const hitActor = hitPlayer ? "You" : "Nova";
            burst(hazard, COLORS.coral, 18);
            addFeed("ALERT", `${hitActor} hit a glitch. Squad link weakened.`, "coral");
            playTone(130, .15, .035);
            return false;
        }
        return hazard.x > -80 && hazard.x < WORLD.width + 80 && hazard.y > -80 && hazard.y < WORLD.height + 80;
    });
};
const updateEffects = (delta) => {
    pulses = pulses
        .map((pulse) => ({ ...pulse, radius: pulse.radius + delta * 370, life: pulse.life - delta }))
        .filter((pulse) => pulse.life > 0);
    particles = particles
        .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx * delta,
        y: particle.y + particle.vy * delta,
        vx: particle.vx * .97,
        vy: particle.vy * .97,
        life: particle.life - delta,
    }))
        .filter((particle) => particle.life > 0);
};
const updateUi = () => {
    ui.time.textContent = formatTime(timeLeft);
    ui.score.textContent = formatScore(score);
    ui.streak.textContent = `x${streakMultiplier(deliveryStreak)}`;
    ui.shield.textContent = `${Math.round(shield)}%`;
    ui.shieldMeter.style.width = `${shield}%`;
    ui.shieldMeter.style.background = shield < 35 ? COLORS.coral : "linear-gradient(90deg, #6ce5d7, #9df4ea)";
    ui.playerCargo.textContent = `${player.cargo}/3`;
    ui.botCargo.textContent = `${nova.cargo}/3`;
};
const update = (delta) => {
    updateEffects(delta);
    if (phase !== "playing")
        return;
    elapsed += delta;
    timeLeft -= delta;
    pulseCooldown = Math.max(0, pulseCooldown - delta);
    damageCooldown = Math.max(0, damageCooldown - delta);
    updatePlayer(delta);
    updateNova(delta);
    updateSignals();
    updateHazards(delta);
    updateUi();
    if (shield <= 0)
        finishGame(true);
    else if (timeLeft <= 0)
        finishGame(false);
};
const drawGrid = () => {
    context.save();
    context.strokeStyle = COLORS.grid;
    context.lineWidth = 1;
    for (let x = 20; x < WORLD.width; x += 40) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, WORLD.height);
        context.stroke();
    }
    for (let y = 20; y < WORLD.height; y += 40) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(WORLD.width, y);
        context.stroke();
    }
    context.restore();
};
const drawBeacon = () => {
    const glow = 10 + Math.sin(elapsed * 3) * 3;
    context.save();
    context.translate(beacon.x, beacon.y);
    context.strokeStyle = "rgba(155, 140, 255, .18)";
    context.lineWidth = 1;
    for (const radius of [74 + glow, 96 + glow * 1.4]) {
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();
    }
    context.shadowColor = COLORS.violet;
    context.shadowBlur = 24;
    context.fillStyle = "rgba(139, 124, 255, .13)";
    context.beginPath();
    context.arc(0, 0, beacon.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = COLORS.violet;
    context.lineWidth = 2;
    context.setLineDash([7, 9]);
    context.rotate(elapsed * .35);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = COLORS.violet;
    context.beginPath();
    context.arc(0, 0, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
};
const drawSignal = (signal) => {
    const glow = 1 + Math.sin(elapsed * 4 + signal.phase) * .18;
    context.save();
    context.translate(signal.x, signal.y);
    context.rotate(elapsed + signal.phase);
    context.scale(glow, glow);
    context.shadowColor = COLORS.amber;
    context.shadowBlur = 16;
    context.fillStyle = COLORS.amber;
    context.beginPath();
    context.moveTo(0, -signal.radius);
    context.lineTo(signal.radius * .75, 0);
    context.lineTo(0, signal.radius);
    context.lineTo(-signal.radius * .75, 0);
    context.closePath();
    context.fill();
    context.restore();
};
const drawActor = (actor, label) => {
    const moving = Math.hypot(actor.vx, actor.vy) > 10;
    context.save();
    context.translate(actor.x, actor.y);
    context.shadowColor = actor.color;
    context.shadowBlur = 16;
    context.fillStyle = actor.color;
    context.beginPath();
    context.arc(0, 0, actor.radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#11101d";
    context.beginPath();
    context.arc(-5, -2, 2.2, 0, Math.PI * 2);
    context.arc(5, -2, 2.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#11101d";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 2, 5, .2, Math.PI - .2);
    context.stroke();
    if (moving) {
        context.globalAlpha = .35;
        context.fillStyle = actor.color;
        context.beginPath();
        context.arc(-actor.vx * .06, -actor.vy * .06, actor.radius * .65, 0, Math.PI * 2);
        context.fill();
    }
    context.globalAlpha = 1;
    context.fillStyle = "rgba(10, 9, 17, .72)";
    context.fillRect(-26, -36, 52, 14);
    context.fillStyle = actor.color;
    context.font = "500 9px 'DM Mono', monospace";
    context.textAlign = "center";
    context.fillText(label, 0, -26);
    for (let index = 0; index < actor.cargo; index += 1) {
        context.fillStyle = COLORS.amber;
        context.beginPath();
        context.arc((index - (actor.cargo - 1) / 2) * 9, actor.radius + 9, 2.5, 0, Math.PI * 2);
        context.fill();
    }
    context.restore();
};
const drawHazard = (hazard) => {
    context.save();
    context.translate(hazard.x, hazard.y);
    context.rotate(hazard.spin);
    context.shadowColor = COLORS.coral;
    context.shadowBlur = 17;
    context.fillStyle = "rgba(255, 91, 127, .16)";
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 2;
    context.beginPath();
    const points = 9;
    for (let index = 0; index < points * 2; index += 1) {
        const radius = index % 2 === 0 ? hazard.radius : hazard.radius * .58;
        const angle = index / (points * 2) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0)
            context.moveTo(x, y);
        else
            context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = COLORS.coral;
    context.fillRect(-6, -2, 4, 4);
    context.fillRect(3, -2, 4, 4);
    context.restore();
};
const drawEffects = () => {
    for (const pulse of pulses) {
        context.save();
        context.globalAlpha = clamp(pulse.life * 2, 0, 1);
        context.strokeStyle = COLORS.violet;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
    }
    for (const particle of particles) {
        context.save();
        context.globalAlpha = clamp(particle.life * 2, 0, 1);
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
    }
};
const draw = () => {
    const gradient = context.createRadialGradient(500, 310, 20, 500, 310, 600);
    gradient.addColorStop(0, "#171529");
    gradient.addColorStop(.6, "#10101d");
    gradient.addColorStop(1, "#0b0b14");
    context.fillStyle = gradient;
    context.fillRect(0, 0, WORLD.width, WORLD.height);
    drawGrid();
    drawBeacon();
    for (const signal of signals)
        drawSignal(signal);
    for (const hazard of hazards)
        drawHazard(hazard);
    drawActor(player, "YOU");
    drawActor(nova, "NOVA");
    drawEffects();
    if (phase === "paused") {
        context.fillStyle = "rgba(8, 8, 15, .74)";
        context.fillRect(0, 0, WORLD.width, WORLD.height);
        context.fillStyle = COLORS.ink;
        context.font = "700 38px Manrope, sans-serif";
        context.textAlign = "center";
        context.fillText("Mission paused", WORLD.width / 2, WORLD.height / 2 - 8);
        context.fillStyle = "#8a8798";
        context.font = "400 14px Manrope, sans-serif";
        context.fillText("Press P or Resume when your squad is ready.", WORLD.width / 2, WORLD.height / 2 + 24);
    }
};
const frame = (now) => {
    const delta = Math.min((now - lastFrame) / 1000, .034);
    lastFrame = now;
    update(delta);
    draw();
    requestAnimationFrame(frame);
};
window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code))
        event.preventDefault();
    if (event.code === "Space" && !event.repeat)
        usePulse();
    if ((event.code === "KeyP" || event.code === "Escape") && !event.repeat)
        togglePause();
    keys.add(event.code);
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => {
    keys.clear();
    if (phase === "playing")
        togglePause();
});
document.querySelectorAll("[data-key]").forEach((button) => {
    const code = button.dataset.key;
    if (!code)
        return;
    const press = (event) => {
        event.preventDefault();
        if (code === "Space")
            usePulse();
        else
            keys.add(code);
    };
    const release = (event) => {
        event.preventDefault();
        keys.delete(code);
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerleave", release);
});
element("startButton").addEventListener("click", startGame);
element("restartButton").addEventListener("click", startGame);
ui.pauseButton.addEventListener("click", togglePause);
ui.soundButton.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    ui.soundButton.textContent = soundEnabled ? "Sound on" : "Sound off";
    ui.soundButton.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled)
        playTone(520);
});
element("copyButton").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    try {
        await navigator.clipboard.writeText(partyCode);
        button.textContent = "Copied";
        addFeed("SYS", `Party code ${partyCode} copied.`, "amber");
        window.setTimeout(() => { button.textContent = "Copy"; }, 1400);
    }
    catch {
        button.textContent = partyCode;
    }
});
ui.partyCode.textContent = partyCode;
ui.bestScore.textContent = localStorage.getItem("signal-squad-best") ?? "0";
for (let index = 0; index < 8; index += 1)
    spawnSignal();
updateUi();
requestAnimationFrame(frame);
