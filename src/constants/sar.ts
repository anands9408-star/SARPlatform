export const WEATHER_CONDITIONS = [
  "Clear",
  "Cloudy",
  "Rainy",
  "Storm",
  "Fog",
];

export const WIND_DIRECTIONS = [
  "North",
  "South",
  "East",
  "West",
  "North-East",
  "North-West",
  "South-East",
  "South-West",
];

export const CRASH_ZONES = [
  "Mountain",
  "Sea",
  "Forest",
  "Desert",
  "Urban Area",
];

export const ELT_OPTIONS = ["Yes", "No"];

export const SEARCH_ZONES = [
  { name: "Alpha", radius: 2000, color: "#ef4444", fillColor: "#ef444433", probability: 70, resource: "Drone Squad A" },
  { name: "Beta",  radius: 5000, color: "#f97316", fillColor: "#f9731633", probability: 20, resource: "Helicopter 01" },
  { name: "Gamma", radius: 8000, color: "#eab308", fillColor: "#eab30833", probability: 10, resource: "Ground Team" },
];

export const GLIDE_RATIO = 15; // Standard for many aircraft

export const SAMPLE_AIRCRAFT: import("@/types").AircraftStatus[] = [
  { id: "A1", callsign: "SAR-01", type: "Helicopter", status: "Active", fuel: 78, sector: "Alpha" },
  { id: "A2", callsign: "SAR-02", type: "Fixed Wing", status: "Standby", fuel: 95, sector: "Beta" },
  { id: "A3", callsign: "GND-01", type: "Ground Unit", status: "Active", fuel: 60, sector: "Alpha" },
  { id: "A4", callsign: "DRN-01", type: "Drone", status: "Active", fuel: 45, sector: "Gamma" },
];

export const MISSION_LOGS: import("@/types").MissionLog[] = [
  { id: "1", time: "08:42", event: "Mission initiated — Aircraft S31 reported missing", severity: "critical" },
  { id: "2", time: "08:55", event: "ELT signal detected at primary coordinates", severity: "warning" },
  { id: "3", time: "09:10", event: "Drone Squad A deployed to Alpha Zone", severity: "info" },
  { id: "4", time: "09:25", event: "Weather updated: Wind 28 km/h NE, Cloudy", severity: "info" },
  { id: "5", time: "09:40", event: "Helicopter 01 airborne — heading to Beta Zone", severity: "info" },
  { id: "6", time: "10:05", event: "Visual contact reported in Alpha Zone grid 4-C", severity: "warning" },
];
