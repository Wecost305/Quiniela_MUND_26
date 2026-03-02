// Archivo: groups-data.js
// ============================================================================
// === GRUPOS - QUINIELA MUNDIAL 2026 (12 grupos x 4 selecciones = 48 equipos) ===
// ============================================================================
//
// Cada objeto de grupo DEBE contener:
//  - id: letra del grupo (A-L)
//  - teams: nombre completo de cada selección (4)
//  - codes: abreviatura corta (4) -> se usa en el bracket y para guardar datos
//  - flags: emoji de bandera (4)
//  - color1 / color2: degradado del header
//
// Nota: Algunos lugares aún son "winner" de Playoffs (UEFA / IC)
//       porque en el sorteo quedaron asignados así.
//

const groupsData = [
  // GROUP A
  {
    id: "A",
    teams: ["México", "Sudáfrica", "Corea del Sur", "Ganador UEFA Path D"],
    codes: ["MEX", "RSA", "KOR", "UEFA_D"],
    flags: ["🇲🇽", "🇿🇦", "🇰🇷", "🏳️"],
    color1: "#007bff",
    color2: "#0056b3",
  },

  // GROUP B
  {
    id: "B",
    teams: ["Canadá", "Ganador UEFA Path A", "Qatar", "Suiza"],
    codes: ["CAN", "UEFA_A", "QAT", "SUI"],
    flags: ["🇨🇦", "🏳️", "🇶🇦", "🇨🇭"],
    color1: "#28a745",
    color2: "#1e7e34",
  },

  // GROUP C
  {
    id: "C",
    teams: ["Brasil", "Marruecos", "Haití", "Escocia"],
    codes: ["BRA", "MAR", "HAI", "SCO"],
    flags: ["🇧🇷", "🇲🇦", "🇭🇹", "🏴"],
    color1: "#fd7e14",
    color2: "#c35c0f",
  },

  // GROUP D
  {
    id: "D",
    teams: ["Estados Unidos", "Paraguay", "Australia", "Ganador UEFA Path C"],
    codes: ["USA", "PAR", "AUS", "UEFA_C"],
    flags: ["🇺🇸", "🇵🇾", "🇦🇺", "🏳️"],
    color1: "#6f42c1",
    color2: "#4e2a8b",
  },

  // GROUP E
  {
    id: "E",
    teams: ["Alemania", "Curaçao", "Costa de Marfil", "Ecuador"],
    codes: ["GER", "CUW", "CIV", "ECU"],
    flags: ["🇩🇪", "🇨🇼", "🇨🇮", "🇪🇨"],
    color1: "#dc3545",
    color2: "#a71d2a",
  },

  // GROUP F
  {
    id: "F",
    teams: ["Países Bajos", "Japón", "Ganador UEFA Path B", "Túnez"],
    codes: ["NED", "JPN", "UEFA_B", "TUN"],
    flags: ["🇳🇱", "🇯🇵", "🏳️", "🇹🇳"],
    color1: "#20c997",
    color2: "#128765",
  },

  // GROUP G
  {
    id: "G",
    teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
    codes: ["BEL", "EGY", "IRN", "NZL"],
    flags: ["🇧🇪", "🇪🇬", "🇮🇷", "🇳🇿"],
    color1: "#6c757d",
    color2: "#343a40",
  },

  // GROUP H
  {
    id: "H",
    teams: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
    codes: ["ESP", "CPV", "KSA", "URU"],
    flags: ["🇪🇸", "🇨🇻", "🇸🇦", "🇺🇾"],
    color1: "#ffc107",
    color2: "#d39e00",
  },

  // GROUP I
  {
    id: "I",
    teams: ["Francia", "Senegal", "Ganador IC Path 2", "Noruega"],
    codes: ["FRA", "SEN", "IC2", "NOR"],
    flags: ["🇫🇷", "🇸🇳", "🏳️", "🇳🇴"],
    color1: "#e83e8c",
    color2: "#a61e5c",
  },

  // GROUP J
  {
    id: "J",
    teams: ["Argentina", "Argelia", "Austria", "Jordania"],
    codes: ["ARG", "ALG", "AUT", "JOR"],
    flags: ["🇦🇷", "🇩🇿", "🇦🇹", "🇯🇴"],
    color1: "#8b4513",
    color2: "#5c2d0d",
  },

  // GROUP K
  {
    id: "K",
    teams: ["Portugal", "Ganador IC Path 1", "Uzbekistán", "Colombia"],
    codes: ["POR", "IC1", "UZB", "COL"],
    flags: ["🇵🇹", "🏳️", "🇺🇿", "🇨🇴"],
    color1: "#0d6efd",
    color2: "#0a53be",
  },

  // GROUP L
  {
    id: "L",
    teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"],
    codes: ["ENG", "CRO", "GHA", "PAN"],
    flags: ["🏴", "🇭🇷", "🇬🇭", "🇵🇦"],
    color1: "#212529",
    color2: "#000000",
  },
];
