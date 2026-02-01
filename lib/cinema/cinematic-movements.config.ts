export const CAMERA_MOVEMENTS = [
    "static", "handheld", "zoom_in", "zoom_out", "camera_follows",
    "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit_around",
    "dolly_in", "dolly_out", "jib_up", "jib_down", "drone_shot", "360_roll"
] as const;

// UI Labels (short, for node display)
export const MOVEMENT_LABELS: Record<typeof CAMERA_MOVEMENTS[number], string> = {
    static: "Static",
    handheld: "Handheld",
    zoom_in: "Zoom In",
    zoom_out: "Zoom Out",
    camera_follows: "Camera Follows",
    pan_left: "Pan Left",
    pan_right: "Pan Right",
    tilt_up: "Tilt Up",
    tilt_down: "Tilt Down",
    orbit_around: "Orbit Around",
    dolly_in: "Dolly In",
    dolly_out: "Dolly Out",
    jib_up: "Jib Up",
    jib_down: "Jib Down",
    drone_shot: "Drone Shot",
    "360_roll": "360 Roll"
};

// Generation Prompts (detailed, for MiniMax API)
export const MOVEMENT_PROMPTS: Record<typeof CAMERA_MOVEMENTS[number], string> = {
    static: "Static shot, no camera movement, locked frame, stable composition",
    handheld: "Handheld camera movement, subtle organic micro-movements with natural human instability, irregular motion pattern, controlled cinematic shake, no mechanical stabilization",
    zoom_in: "Optical zoom-in movement, lens-based focal length change without camera translation, smooth constant zoom speed, background compression toward subject, no parallax, no physical camera movement",
    zoom_out: "Optical zoom-out movement, lens-based focal length expansion without camera translation, steady zoom speed, background expansion away from subject, no parallax, no physical camera movement",
    camera_follows: "Tracking shot following subject movement, smooth camera motion maintaining consistent framing distance, dynamic parallax",
    pan_left: "Horizontal pan left, camera rotation on vertical axis from a fixed position, constant angular speed, stable horizon, no camera translation, no tilt",
    pan_right: "Horizontal pan right, camera rotation on vertical axis from a fixed position, constant angular speed, stable horizon, no camera translation, no tilt",
    tilt_up: "Vertical tilt up, camera rotation on horizontal axis, controlled upward angular motion revealing vertical scale, no pan, no camera translation",
    tilt_down: "Vertical tilt down, camera rotation on horizontal axis, controlled downward angular motion, stable framing, no pan, no camera translation",
    orbit_around: "Orbiting camera movement, circular camera path around the subject at constant radius, continuous parallax shift, stabilized motion, subject maintained near center frame",
    dolly_in: "Forward dolly movement, physical camera translation toward the subject on a straight axis, visible parallax between foreground and background, smooth cinematic motion, no optical zoom",
    dolly_out: "Backward dolly movement, physical camera translation away from the subject, increasing spatial separation and parallax, smooth controlled retreat, no optical zoom",
    jib_up: "Vertical crane up movement, physical camera elevation upward on a vertical axis, smooth mechanical lift, changing perspective and scale, no tilt, no zoom",
    jib_down: "Vertical crane down movement, physical camera descent on a vertical axis, smooth controlled lowering, perspective compression, no tilt, no zoom",
    drone_shot: "Aerial drone shot, elevated camera perspective with smooth mechanical flight movement, revealing spatial context and scale",
    "360_roll": "360-degree roll movement, complete camera rotation on longitudinal axis, continuous circular motion, disorienting cinematic effect"
};

export const MOVEMENT_DEFAULTS = {
    movement: "static" as const
};
