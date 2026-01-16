/**
 * Application Configuration
 * Contains all configurable constants and settings
 */

export const CONFIG = {
    // Material color palette for panels - monochrome shades
    materialColors: [
        0xF5F5F5, 0xE8E8E8, 0xDCDCDC, 0xD0D0D0, 0xC4C4C4,
        0xB8B8B8, 0xACACAC, 0xA0A0A0, 0x949494, 0x888888
    ],

    // Lighting settings - enhanced for dramatic shadows
    ambientLightIntensity: 0.35,
    directionalLightIntensity: 1.2,

    // View controls
    explodeFactor: 1.5,

    // Camera settings
    defaultFov: 60,
    minDistance: 100,
    maxDistance: 10000,
    frustumSize: 2000,

    // Grid settings - subtle white room floor
    gridSize: 3000,
    gridDivisions: 30,
    gridColorCenter: 0xE8E8E8,
    gridColorGrid: 0xF0F0F0,

    // Selection colors - bright blue for visibility
    selectionEmissive: 0x00BFFF,

    // Panel edge outline color - dark for sharp edges
    panelEdgeColor: 0x2A2A2A,

    // Edge banding - dark charcoal
    edgeBandingColor: 0x1A1A1A,


    // Groove/Cut settings
    enableCutsCSG: false,  // Set to true to enable CSG processing

    // Labels visibility - set to false to hide circular markers
    showLabels: false,

    // Scene background - pure white room
    backgroundColor: 0xF5F5F5
};

export default CONFIG;
