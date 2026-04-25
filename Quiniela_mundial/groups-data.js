// Archivo: groups-data.js
// ============================================================================
// === GRUPOS - FIXTURE INTERACTIVO MUNDIALISTA 2026 (12 grupos x 4 selecciones = 48 equipos) ===
// ============================================================================
//
// Cada objeto de grupo DEBE contener:
//  - id: letra del grupo (A-L)
//  - teams: nombre completo de cada selección (4)
//  - codes: abreviatura corta (4) -> se usa en el bracket y para guardar datos
//  - flags: emoji de bandera (4)
//  - color1 / color2: degradado del header
//
// Grupos actualizados con los clasificados de repechaje.
//

const groupsData = [
  {
    id: "A",
    teams: ["México", "Sudáfrica", "Corea del Sur", "Chequia"],
    codes: ["MEX", "RSA", "KOR", "CZE"],
    flags: ["🇲🇽", "🇿🇦", "🇰🇷", "🇨🇿"],
    color1: "#007bff",
    color2: "#0056b3",
  },
  {
    id: "B",
    teams: ["Canadá", "Bosnia y Herzegovina", "Qatar", "Suiza"],
    codes: ["CAN", "BIH", "QAT", "SUI"],
    flags: ["🇨🇦", "🇧🇦", "🇶🇦", "🇨🇭"],
    color1: "#28a745",
    color2: "#1e7e34",
  },
  {
    id: "C",
    teams: ["Brasil", "Marruecos", "Haití", "Escocia"],
    codes: ["BRA", "MAR", "HAI", "SCO"],
    flags: ["🇧🇷", "🇲🇦", "🇭🇹", "🏴"],
    color1: "#fd7e14",
    color2: "#c35c0f",
  },
  {
    id: "D",
    teams: ["Estados Unidos", "Paraguay", "Australia", "Türkiye"],
    codes: ["USA", "PAR", "AUS", "TUR"],
    flags: ["🇺🇸", "🇵🇾", "🇦🇺", "🇹🇷"],
    color1: "#6f42c1",
    color2: "#4e2a8b",
  },
  {
    id: "E",
    teams: ["Alemania", "Curaçao", "Costa de Marfil", "Ecuador"],
    codes: ["GER", "CUW", "CIV", "ECU"],
    flags: ["🇩🇪", "🇨🇼", "🇨🇮", "🇪🇨"],
    color1: "#dc3545",
    color2: "#a71d2a",
  },
  {
    id: "F",
    teams: ["Países Bajos", "Japón", "Suecia", "Túnez"],
    codes: ["NED", "JPN", "SWE", "TUN"],
    flags: ["🇳🇱", "🇯🇵", "🇸🇪", "🇹🇳"],
    color1: "#20c997",
    color2: "#128765",
  },
  {
    id: "G",
    teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
    codes: ["BEL", "EGY", "IRN", "NZL"],
    flags: ["🇧🇪", "🇪🇬", "🇮🇷", "🇳🇿"],
    color1: "#6c757d",
    color2: "#343a40",
  },
  {
    id: "H",
    teams: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
    codes: ["ESP", "CPV", "KSA", "URU"],
    flags: ["🇪🇸", "🇨🇻", "🇸🇦", "🇺🇾"],
    color1: "#ffc107",
    color2: "#d39e00",
  },
  {
    id: "I",
    teams: ["Francia", "Senegal", "Iraq", "Noruega"],
    codes: ["FRA", "SEN", "IRQ", "NOR"],
    flags: ["🇫🇷", "🇸🇳", "🇮🇶", "🇳🇴"],
    color1: "#e83e8c",
    color2: "#a61e5c",
  },
  {
    id: "J",
    teams: ["Argentina", "Argelia", "Austria", "Jordania"],
    codes: ["ARG", "ALG", "AUT", "JOR"],
    flags: ["🇦🇷", "🇩🇿", "🇦🇹", "🇯🇴"],
    color1: "#8b4513",
    color2: "#5c2d0d",
  },
  {
    id: "K",
    teams: ["Portugal", "Congo DR", "Uzbekistán", "Colombia"],
    codes: ["POR", "COD", "UZB", "COL"],
    flags: ["🇵🇹", "🇨🇩", "🇺🇿", "🇨🇴"],
    color1: "#0d6efd",
    color2: "#0a53be",
  },
  {
    id: "L",
    teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
    codes: ["ENG", "CRO", "GHA", "PAN"],
    flags: ["🏴", "🇭🇷", "🇬🇭", "🇵🇦"],
    color1: "#212529",
    color2: "#000000",
  },
];
